from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
import joblib
import os
from utils.feature_builder import build_features 
from dependencies.auth import get_current_user
from pydantic import BaseModel
from utils.training_generator import generate_plan
from db.models import TrainingPlan, TrainingTask
from db.models import AssessmentSession

class AssessmentRequest(BaseModel):
    session_id: int
    eye_data: list
    pen_data: list


router = APIRouter()

# Start assessment route
@router.get("/start")
def start_assessment(
    db: Session = Depends(get_db),
    user_id=Depends(get_current_user)
):
    # create session
    session = AssessmentSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "message": "Assessment started",
        "tasks": [
            {"type": "eye", "task": "read_alphabet"},
            {"type": "eye", "task": "read_words"},
            {"type": "eye", "task": "read_sentence"},
            {"type": "pen", "task": "write_small_letters"},
            {"type": "pen", "task": "write_capital_letters"},
            {"type": "pen", "task": "write_confusing_pairs", "examples": ["qp", "bd"]},
            {"type": "pen", "task": "write_words_easy"},
            {"type": "pen", "task": "write_words_hard"}
        ]
    }

# Load model once
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "dyslexia_model.pkl")
model = joblib.load(MODEL_PATH)


@router.post("/submit")
def submit_assessment(data: AssessmentRequest, db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    # Validate session
    session = db.query(AssessmentSession).filter(
        AssessmentSession.id == data.session_id,
        AssessmentSession.user_id == user_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # -------------------------
    # 🚫 VALIDATION (PREVENT BAD DATA)
    # -------------------------
    if not data.eye_data or len(data.eye_data) < 2:
        raise HTTPException(status_code=400, detail="Invalid eye_data")

    if not data.pen_data or len(data.pen_data) < 2:
        raise HTTPException(status_code=400, detail="Invalid pen_data")

    # Save raw data to session
    session.eye_data = data.eye_data
    session.pen_data = data.pen_data
    session.status = "completed"
    db.commit()

    # -------------------------
    # 📊 SESSION NUMBER (LONGITUDINAL)
    # -------------------------
    previous_count = db.query(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .count()

    session_number = previous_count + 1

    # 1. Save raw data in Assessment as well (for legacy/compatibility)
    assessment = models.Assessment(
        user_id=user_id,
        session_number=session_number,
        eye_data=data.eye_data,
        pen_data=data.pen_data
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    # 2. Convert raw → features
    features = build_features({
        "eye_data": data.eye_data,
        "pen_data": data.pen_data
    })

    # 3. Predict
    try:
        probs = model.predict_proba([features])[0]
        confidence = float(max(probs))
    except Exception as e:
        print("Model error:", e)
        confidence = 0.5  # fallback

    # -------------------------
    # 🧠 HYBRID LOGIC (RULE + ML)
    # -------------------------
    dyslexia_score = float(features[1]) + float(features[2])
    dysgraphia_score = float(features[3]) + float(features[6])

    # prevent zero collapse (important)
    if dyslexia_score == 0:
        dyslexia_score = 0.01
    if dysgraphia_score == 0:
        dysgraphia_score = 0.01

    final_label = "normal"

    # tuned thresholds (reduce false positives)
    if dyslexia_score > 1.0 and dysgraphia_score > 0.8:
        final_label = "both"
    elif dyslexia_score > 1.0:
        final_label = "dyslexia"
    elif dysgraphia_score > 0.8:
        final_label = "dysgraphia"

    prediction = final_label

    # -------------------------
    # 🎯 STAGE + SMART CONFIDENCE
    # -------------------------
    def get_stage(score):
        if score < 0.4:
            return "normal"
        elif score < 1.0:
            return "stage_1"
        elif score < 2.0:
            return "stage_2"
        else:
            return "stage_3"

    dyslexia_stage = get_stage(dyslexia_score)
    dysgraphia_stage = get_stage(dysgraphia_score)

    # -------------------------
    # 🔧 NORMALIZED CONFIDENCE
    # -------------------------
    def normalize(score, max_val=3):
        return min(score / max_val, 1.0)

    norm_dyslexia = normalize(dyslexia_score)
    norm_dysgraphia = normalize(dysgraphia_score)

    if prediction == "both":
        confidence = (norm_dyslexia + norm_dysgraphia) / 2
    elif prediction == "dyslexia":
        confidence = norm_dyslexia
    elif prediction == "dysgraphia":
        confidence = norm_dysgraphia
    else:
        confidence = 1 - max(norm_dyslexia, norm_dysgraphia)

    # 4. Save result
    result = models.Result(
        assessment_id=assessment.id,
        level=prediction,
        confidence=confidence,
        dyslexia_score=dyslexia_score,
        dysgraphia_score=dysgraphia_score,
        dyslexia_stage=dyslexia_stage,
        dysgraphia_stage=dysgraphia_stage
    )
    db.add(result)
    db.commit()

    # -------------------------
    # 📈 SAVE PROGRESS (LONGITUDINAL DATA)
    # -------------------------
    progress = models.Progress(
        user_id=user_id,
        reading_score=dyslexia_score,
        writing_score=dysgraphia_score,
        rhythm_score=float(features[10]) if len(features) > 10 and features[10] else 0.01  # motor rhythm index
    )
    db.add(progress)
    db.commit()

    # 5. Create training plan automatically
    # -------------------------
    # 📚 PLAN CONTINUITY (NO DUPLICATION)
    # -------------------------
    plan = db.query(TrainingPlan)\
        .filter(TrainingPlan.user_id == user_id)\
        .order_by(TrainingPlan.created_at.desc())\
        .first()

    if not plan:
        plan = TrainingPlan(user_id=user_id, level=prediction)
        db.add(plan)
        db.commit()
        db.refresh(plan)

    # -------------------------
    # 📊 FETCH TREND FOR ADAPTIVE TRAINING
    # -------------------------
    previous_results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.asc())\
        .all()

    # Include current result in trend calculation
    previous_results.append(result)

    trend_status = None
    if len(previous_results) >= 2:
        first = previous_results[0]
        last = previous_results[-1]

        if first.dyslexia_score is None or last.dyslexia_score is None:
            reading_change = 0
        else:
            reading_change = last.dyslexia_score - first.dyslexia_score

        if first.dysgraphia_score is None or last.dysgraphia_score is None:
            writing_change = 0
        else:
            writing_change = last.dysgraphia_score - first.dysgraphia_score

        if reading_change < 0 and writing_change < 0:
            trend_status = "improving"
        elif reading_change > 0 and writing_change > 0:
            trend_status = "worsening"
        else:
            trend_status = "mixed"

    # TEMP FIX: match current generator signature
    tasks = generate_plan(
        prediction,
        dyslexia_stage,
        dysgraphia_stage
    )

    # clear old tasks (optional reset strategy)
    db.query(TrainingTask).filter(TrainingTask.plan_id == plan.id).delete()
    for t in tasks:
        task = TrainingTask(
            plan_id=plan.id,
            task_name=t["name"],
            task_type=t["type"],
            difficulty=t["difficulty"],
            duration=t["duration"]
        )
        db.add(task)

    db.commit()

    # 5. Return response
    return {
        "assessment_id": assessment.id,
        "prediction": prediction,
        "confidence": confidence,
        "details": {
            "dyslexia_score": dyslexia_score,
            "dysgraphia_score": dysgraphia_score,
            "dyslexia_stage": dyslexia_stage,
            "dysgraphia_stage": dysgraphia_stage
        }
    }


# History route
@router.get("/history")
def get_history(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    assessments = db.query(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .all()

    # fetch all results in one query (optimization)
    assessment_ids = [a.id for a in assessments]
    results = db.query(models.Result).filter(models.Result.assessment_id.in_(assessment_ids)).all()
    result_map = {r.assessment_id: r for r in results}

    result = []
    for a in assessments:
        res = result_map.get(a.id)
        result.append({
            "assessment_id": a.id,
            "prediction": res.level if res else None,
            "confidence": res.confidence if res else None,
            "dyslexia_stage": res.dyslexia_stage if res else None,
            "dysgraphia_stage": res.dysgraphia_stage if res else None,
            "dyslexia_score": res.dyslexia_score if res else None,
            "dysgraphia_score": res.dysgraphia_score if res else None,
            "created_at": a.created_at
        })

    return result


# Analytics route
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    assessments = db.query(models.Assessment).filter(models.Assessment.user_id == user_id).all()

    total = len(assessments)
    if total == 0:
        return {"message": "No data"}

    results = db.query(models.Result).join(models.Assessment).filter(models.Assessment.user_id == user_id).all()

    avg_confidence = sum([r.confidence for r in results]) / len(results) if results else 0

    avg_dyslexia = sum([r.dyslexia_score for r in results]) / len(results) if results else 0
    avg_dysgraphia = sum([r.dysgraphia_score for r in results]) / len(results) if results else 0

    level_counts = {}
    for r in results:
        level_counts[r.level] = level_counts.get(r.level, 0) + 1

    return {
        "total_assessments": total,
        "average_confidence": avg_confidence,
        "average_dyslexia_score": avg_dyslexia,
        "average_dysgraphia_score": avg_dysgraphia,
        "level_distribution": level_counts
    }   