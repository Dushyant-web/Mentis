from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from utils.feature_builder import build_features, FEATURE_NAMES
from dependencies.auth import get_current_user
from pydantic import BaseModel, Field, validator
from utils.training_generator_V2 import generate_program
from db.models import TrainingPlan, TrainingTask
from db.models import AssessmentSession
from datetime import datetime
from ml.model_loader import get_model, get_scaler
from utils.rate_limiter import rate_limit
import numpy as np

model = get_model()
scaler = get_scaler()

# -------------------------
# 🧠 GLOBAL SHAP EXPLAINER (LOAD ONCE)
# -------------------------
try:
    import shap
    explainer = shap.TreeExplainer(model)
except Exception:
    explainer = None

class AssessmentRequest(BaseModel):
    session_id: int = Field(..., gt=0)
    eye_data: list[float] = Field(..., min_items=2)
    pen_data: list[float] = Field(..., min_items=2)

    @validator("eye_data", "pen_data")
    def validate_numeric_list(cls, v):
        if not all(isinstance(x, (int, float)) for x in v):
            raise ValueError("All values must be numeric")
        if any(x < 0 or x > 5000 for x in v):
            raise ValueError("Values out of allowed range (0–5000)")
        return v


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


@router.post("/submit")
def submit_assessment(data: AssessmentRequest, db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    # -------------------------
    # 🚫 RATE LIMIT (BEFORE DB WORK)
    # -------------------------
    rate_limit(f"assessment:{user_id}", limit=5, window=60)

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

    try:

        # -------------------------
        # 📊 SESSION NUMBER (LONGITUDINAL)
        # -------------------------
        previous_count = db.query(models.Assessment)\
            .filter(models.Assessment.user_id == user_id)\
            .count()

        session_number = previous_count + 1


        # 2. Convert raw → features
        features = build_features({
            "eye_data": data.eye_data,
            "pen_data": data.pen_data
        })

        # -------------------------
        # 🤖 MODEL PREDICTION + SCALING
        # -------------------------
        try:
            features_array = np.array(features).reshape(1, -1)
            features_scaled = scaler.transform(features_array)

            probs = model.predict_proba(features_scaled)[0]
            classes = list(model.classes_)

            prob_map = dict(zip(classes, probs))

            prediction_model = str(classes[int(np.argmax(probs))])
            confidence = float(np.max(probs))

        except Exception as e:
            print("Model error:", e)
            raise HTTPException(status_code=500, detail="Model prediction failed")

        # -------------------------
        # 🧠 SHAP EXPLANATION (SAFE)
        # -------------------------
        try:
            if explainer is None:
                raise Exception("SHAP not available")

            shap_values = explainer.shap_values(features_scaled)

            class_index = classes.index(prediction_model)
            shap_vector = shap_values[class_index][0]
            feature_names = FEATURE_NAMES
            shap_dict = dict(zip(feature_names, shap_vector.tolist()))
            if shap_dict:
                for fname, impact in shap_dict.items():
                    try:
                        db.add(models.FeatureAttribution(
                            user_id=user_id,
                            session_id=session.id,
                            feature_name=fname,
                            impact=float(impact),
                            feature_type=(
                                "eye" if "fixation" in fname or "regression" in fname else
                                "pen" if "jerk" in fname or "timing" in fname else
                                "rhythm"
                            ),
                            direction="positive" if impact > 0 else "negative"
                        ))
                    except Exception as e:
                        print("FeatureAttribution insert error:", e)

        except Exception as e:
            print("SHAP error:", e)
            shap_dict = {}

        # -------------------------
        # 🧠 TRUE ML SCORES (NO INDEX HACKS)
        # -------------------------
        prediction = prediction_model

        dyslexia_score = (
            prob_map.get("mild", 0.0) +
            prob_map.get("moderate", 0.0) +
            prob_map.get("severe", 0.0)
        )

        dysgraphia_score = float(prob_map.get("dysgraphia", 0))
        both_score = float(prob_map.get("both", 0))
        normal_score = float(prob_map.get("normal", 0))

        # -------------------------
        # 🧠 UNCERTAINTY / EDGE CASE HANDLING
        # -------------------------
        sorted_probs = sorted(prob_map.items(), key=lambda x: x[1], reverse=True)

        is_uncertain = False

        # if top two classes are close → uncertain
        if len(sorted_probs) >= 2:
            if abs(sorted_probs[0][1] - sorted_probs[1][1]) < 0.1:
                prediction = "uncertain"
                is_uncertain = True

        # -------------------------
        # 🎯 STAGE + SMART CONFIDENCE
        # -------------------------
        def get_stage(prob):
            if prob < 0.3:
                return "stage_1"
            elif prob < 0.6:
                return "stage_2"
            else:
                return "stage_3"

        dyslexia_stage = get_stage(dyslexia_score)
        dysgraphia_stage = get_stage(dysgraphia_score)

        # -------------------------
        # 🧠 CONFIDENCE FUSION (MODEL + CONSISTENCY)
        # -------------------------

        dyslexia_conf = dyslexia_score
        dysgraphia_conf = dysgraphia_score

        recent_history = db.query(models.Result)\
            .join(models.Assessment)\
            .filter(models.Assessment.user_id == user_id)\
            .order_by(models.Assessment.created_at.desc())\
            .limit(3)\
            .all()

        if len(recent_history) >= 2:
            scores = [r.confidence for r in recent_history if r.confidence is not None]
            variance = np.std(scores) if scores else 0
            consistency = 1 / (1 + variance)
        else:
            consistency = 0.5

        confidence = float(np.max(probs))  # pure model confidence

        # adjust slightly using consistency
        confidence = (confidence * 0.8) + (consistency * 0.2)

        if is_uncertain:
            confidence *= 0.75  # ✅ reduce trust if model unsure

        confidence = round(min(max(confidence, 0), 1), 2)

        # -------------------------
        # 🧠 STORE ISSUE CONFIDENCE (SAFE)
        # -------------------------
        issue_confidence = {
            "reading": dyslexia_conf,
            "writing": dysgraphia_conf
        }

        # 🔥 FETCH LATEST EYE + WRITING DATA
        try:
            latest_eye = db.query(models.EyeTracking)\
                .filter(
                    models.EyeTracking.user_id == user_id,
                    models.EyeTracking.created_at >= session.created_at
                )\
                .order_by(models.EyeTracking.created_at.desc())\
                .first()
        except Exception:
            latest_eye = None

        try:
            latest_writing = db.query(models.WritingTest)\
                .filter(
                    models.WritingTest.user_id == user_id,
                    models.WritingTest.created_at >= session.created_at
                )\
                .order_by(models.WritingTest.created_at.desc())\
                .first()
        except Exception:
            latest_writing = None

        eye_score = latest_eye.eye_score if latest_eye else 0
        writing_score = latest_writing.writing_score if latest_writing else 0

        # 🔥 FINAL SCORE (MODEL-DRIVEN, NOT HEURISTIC)

        # -------------------------
        # 🧠 UNCERTAINTY CALCULATION (ENTROPY BASED)
        # -------------------------
        entropy = -sum([p * np.log(p + 1e-9) for p in probs])

        # normalize entropy (max ≈ log(n_classes))
        max_entropy = np.log(len(probs))
        normalized_uncertainty = entropy / max_entropy if max_entropy > 0 else 0

        uncertainty_score = float(round(normalized_uncertainty, 3))

        # -------------------------
        # 🎯 CONFIDENCE (PURE MODEL ONLY)
        # -------------------------
        confidence = float(np.max(probs))

        # reduce confidence if uncertain
        if is_uncertain:
            confidence *= 0.7

        confidence = round(min(max(confidence, 0), 1), 2)

        # -------------------------
        # 🎯 FINAL SCORE (CONFIDENCE vs UNCERTAINTY BALANCED)
        # -------------------------
        final_score = round(
            confidence * (1 - uncertainty_score),
            2
        )

        # ✅ FIX: Convert numpy types to native Python types (prevents DB errors)
        prediction = str(prediction)
        confidence = float(confidence)

        dyslexia_score = float(dyslexia_score)
        dysgraphia_score = float(dysgraphia_score)

        dyslexia_conf = float(dyslexia_conf)
        dysgraphia_conf = float(dysgraphia_conf)

        normal_score = float(normal_score)
        both_score = float(both_score)

        uncertainty_score = float(uncertainty_score)
        final_score = float(final_score)

        # Save raw data to session ONLY after successful processing
        session.eye_data = data.eye_data
        session.pen_data = data.pen_data
        session.status = "completed"
        db.flush()

        # ✅ Create Assessment ONLY after successful prediction
        assessment = models.Assessment(
            user_id=user_id,
            session_number=session_number,
            eye_data=data.eye_data,
            pen_data=data.pen_data
        )
        db.add(assessment)
        db.flush()
        db.refresh(assessment)

        # 4. Save result
        result = models.Result(
            assessment_id=assessment.id,
            session_id=session.id,  # ✅ link session properly

            level=str(prediction),
            confidence=float(confidence),

            dyslexia_score=float(dyslexia_score),
            dysgraphia_score=float(dysgraphia_score),

            dyslexia_stage=dyslexia_stage,
            dysgraphia_stage=dysgraphia_stage,

            # ✅ store calibrated per-issue confidence
            dyslexia_confidence=float(dyslexia_conf),
            dysgraphia_confidence=float(dysgraphia_conf),

            # ✅ full probability distribution
            prob_normal=float(normal_score),
            prob_dyslexia=float(
                prob_map.get("mild", 0.0) +
                prob_map.get("moderate", 0.0) +
                prob_map.get("severe", 0.0)
            ),
            prob_dysgraphia=float(dysgraphia_score),
            prob_both=float(both_score),
            uncertainty=1 if is_uncertain else 0,
            uncertainty_score=float(uncertainty_score),

            final_score=float(final_score)
        )
        # -------------------------
        # 🧠 SHAP → WEAKNESS BOOST
        # -------------------------
        if shap_dict:
            writing_impact = abs(shap_dict.get("timing_variance", 0)) + abs(shap_dict.get("avg_jerk", 0))

            dysgraphia_score = min(1.0, dysgraphia_score + (writing_impact * 0.1))
        db.add(result)

        # -------------------------
        # 🧠 SAVE ISSUE HISTORY
        # -------------------------
        history = models.IssueHistory(
            user_id=user_id,
            reading_score=dyslexia_score,
            writing_score=dysgraphia_score,
            reading_stage=dyslexia_stage,
            writing_stage=dysgraphia_stage,
            confidence_reading=dyslexia_conf,
            confidence_writing=dysgraphia_conf
        )
        db.add(history)

        # -------------------------
        # 🧠 UPDATE WEAKNESS PROFILE (EMA)
        # -------------------------
        profile = db.query(models.UserWeaknessProfile).filter(
            models.UserWeaknessProfile.user_id == user_id
        ).first()

        alpha = 0.3  # smoothing factor

        if not profile:
            profile = models.UserWeaknessProfile(
                user_id=user_id,
                reading_score=dyslexia_score,
                writing_score=dysgraphia_score,
                rhythm_score=0
            )
            db.add(profile)
        else:
            profile.reading_score = (alpha * dyslexia_score) + ((1 - alpha) * profile.reading_score)
            profile.writing_score = (alpha * dysgraphia_score) + ((1 - alpha) * profile.writing_score)
            profile.last_updated = datetime.utcnow()

        # commit deferred for batch write

        # -------------------------
        # 📈 SAVE PROGRESS (XP SYSTEM)
        # -------------------------
        # give base xp for completing assessment
        base_xp = 50

        # Safe upsert logic to prevent duplicate key error
        existing_progress = db.query(models.Progress).filter(
            models.Progress.user_id == user_id,
            models.Progress.task_id == 0
        ).first()

        if existing_progress:
            existing_progress.xp += base_xp
        else:
            progress = models.Progress(
                user_id=user_id,
                task_id=0,  # assessment task
                xp=base_xp
            )
            db.add(progress)

        # commit deferred for batch write

        # 5. Create training plan automatically
        # -------------------------
        # 📚 PLAN CONTINUITY (NO DUPLICATION)
        # -------------------------
        plan = db.query(TrainingPlan)\
            .filter(TrainingPlan.user_id == user_id)\
            .order_by(TrainingPlan.created_at.desc())\
            .first()

        if not plan:
            # avoid "uncertain" breaking training system
            plan_level = prediction if prediction != "uncertain" else prediction_model
            plan = TrainingPlan(user_id=user_id, level=plan_level)
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
        program = generate_program(dyslexia_stage, dysgraphia_stage)
        tasks = program.get("program", {}).get("today", {}).get("exercises", [])

        # normalize tasks to expected schema
        normalized_tasks = []
        for t in tasks:
            normalized_tasks.append({
                "name": t.get("name"),
                "type": t.get("type"),
                "difficulty": t.get("difficulty", "medium"),
                "duration": t.get("duration", "10min")
            })
        tasks = normalized_tasks

        # ⚠️ fallback if generator fails
        if not tasks or len(tasks) == 0:
            tasks = [
                {
                    "name": "Basic Reading Practice",
                    "type": "eye",
                    "difficulty": "easy",
                    "duration": "10min"
                },
                {
                    "name": "Basic Writing Practice",
                    "type": "pen",
                    "difficulty": "easy",
                    "duration": "10min"
                }
            ]

        # clear old tasks (optional reset strategy)
        db.query(TrainingTask).filter(TrainingTask.plan_id == plan.id).delete()
        # ✅ ensure proper types before DB insert (prevents boolean/int mismatch)
        for t in tasks:
            if "is_adaptive" in t:
                t["is_adaptive"] = bool(t.get("is_adaptive"))
            else:
                t["is_adaptive"] = False

            # normalize None properly (avoid 'null' string issues)
            if t.get("content") == "null":
                t["content"] = None

        for t in tasks:
            task = TrainingTask(
                plan_id=plan.id,
                task_name=t["name"],
                task_type=t["type"],
                difficulty=t["difficulty"],
                duration=t["duration"],
                xp=50,
                status="pending",
                is_adaptive=t.get("is_adaptive", False),
                source=None,
                content=t.get("content")
            )
            db.add(task)

        # commit deferred for batch write

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
    except Exception as e:
        db.rollback()
    
        # ✅ mark session as failed (critical fix)
        try:
            session.status = "failed"
            db.commit()
        except:
            pass
        
        print("ASSESSMENT ERROR:", e)
        raise HTTPException(status_code=500, detail="Assessment processing failed")


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