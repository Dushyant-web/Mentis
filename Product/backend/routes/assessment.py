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
from utils.ocr_service import analyze_handwriting
from utils.profile_manager import get_or_create_weakness_profile
from utils.cache import cache_invalidate

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

from typing import List, Optional

class EyePoint(BaseModel):
    x: float
    y: float
    time: float
    velocity: Optional[float] = 0
    type: Optional[str] = "fixation"


class PenPoint(BaseModel):
    x: float
    y: float
    time: float
    pressure: Optional[float] = 0.5
    type: Optional[str] = "move"


class AssessmentRequest(BaseModel):
    session_id: int = Field(..., gt=0)

    eye_data: List[EyePoint]
    pen_data: List[PenPoint]
    errors: Optional[List[dict]] = None

class CanvasAnalysisRequest(BaseModel):
    image: str # base64
    target_word: Optional[str] = None


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


@router.get("/tasks/content")
def get_assessment_content(db: Session = Depends(get_db)):
    """Fetch content for the 5-step writing assessment"""
    import json
    import random
    import csv
    import os

    # 1. Mirror Words (6 x 2-char, 4 x 3-char)
    m2 = ["qp", "bd", "nu", "mw", "pq", "db", "un", "wm", "mn", "nm"]
    m3 = ["dad", "mom", "pop", "pip", "did", "bib", "bob", "pup"]
    
    mirror_words = random.sample(m2, 6) + random.sample(m3, 4)
    random.shuffle(mirror_words)

    # 2. Word Bank (20 words from AUDIO.csv)
    words = []
    try:
        path = os.path.join("dataset", "AUDIO.csv")
        if os.path.exists(path):
            with open(path, "r") as f:
                reader = csv.DictReader(f)
                words = [row["word"] for row in reader if row.get("word")]
    except Exception:
        words = ["apple", "banana", "cherry", "dog", "elephant", "fish", "guitar", "house"]
    
    word_bank = random.sample(words, min(len(words), 20))

    # 3. Matching Questions (10 from MATCHING_MIXED.json)
    questions = []
    try:
        path = os.path.join("dataset", "MATCHING_MIXED.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                all_q = json.load(f)
                questions = random.sample(all_q, min(len(all_q), 10))
    except Exception:
        questions = []

    return {
        "mirror_words": mirror_words,
        "word_bank": word_bank,
        "matching_questions": questions
    }


@router.post("/analyze-canvas")
def analyze_canvas_route(data: CanvasAnalysisRequest, user_id=Depends(get_current_user)):
    """
    Analyzes base64 canvas image and returns recognized text.
    """
    if not data.image:
        raise HTTPException(status_code=400, detail="No image provided")
    
    result = analyze_handwriting(data.image, target_word=data.target_word)
    
    if not result.get("success"):
        return {
            "success": False,
            "message": result.get("error", "Analysis failed"),
            "text": ""
        }
    
    recognized_text = result.get("text", "").lower().strip()
    similarity = result.get("similarity", 0.0)
    
    # Fuzzy matching logic: 0.50 is even more lenient for multi-line handwriting
    is_correct = similarity >= 0.50
    
    return {
        "success": True,
        "text": recognized_text,
        "is_correct": bool(is_correct),
        "similarity": similarity,
        "confidence": result.get("confidence", 0)
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
            "eye_data": [p.model_dump() for p in data.eye_data],
            "pen_data": [p.model_dump() for p in data.pen_data]
        })

        # -------------------------
        # 🧠 ADVANCED EYE METRICS (NOT USED IN MODEL)
        # -------------------------
        try:
            eye_array = np.array([[p.x, p.y, p.time] for p in data.eye_data], dtype=float)

            # basic derived metrics
            eye_diffs = np.diff(eye_array[:, :2], axis=0) if len(eye_array) > 1 else np.array([[0.0, 0.0]])
            eye_velocity = np.linalg.norm(eye_diffs, axis=1)

            # fixation mask (low movement = fixation)
            if len(eye_velocity) == 0:
                fixation_mask = np.array([False])
            else:
                fixation_mask = eye_velocity < np.percentile(eye_velocity, 40)

            fixation_durations = []
            current_fix = 0

            for is_fix in fixation_mask:
                if is_fix:
                    current_fix += 1
                else:
                    if current_fix > 0:
                        fixation_durations.append(current_fix)
                        current_fix = 0

            if current_fix > 0:
                fixation_durations.append(current_fix)

            fixation_durations = np.array(fixation_durations) if len(fixation_durations) > 0 else np.array([0.0])

            avg_fixation = float(np.mean(fixation_durations))
            fixation_var = float(np.var(fixation_durations))

            # saccade metrics
            saccade_lengths = eye_velocity[eye_velocity > np.percentile(eye_velocity, 60)]
            avg_saccade = float(np.mean(saccade_lengths)) if len(saccade_lengths) > 0 else 0.0

            # regression detection (backward movement)
            regressions = float(np.sum(eye_diffs[:, 0] < 0)) if len(eye_diffs) > 0 else 0.0

            # store in DB (safe, optional)
            try:
                db.add(models.AdvancedEyeMetrics(
                    user_id=user_id,
                    session_id=session.id,
                    avg_fixation_duration=avg_fixation,
                    fixation_variance=fixation_var,
                    avg_saccade_length=avg_saccade,
                    regression_count=regressions
                ))
            except Exception as e:
                print("AdvancedEyeMetrics insert error:", e)

        except Exception as e:
            print("Advanced eye feature error:", e)

        # -------------------------
        # 🤖 MODEL PREDICTION + SCALING
        # -------------------------
        try:
            features_array = np.array(features).reshape(1, -1)

            # 🔥 STEP 4: DEBUG FEATURES (BEFORE SCALING)
            print("\\n=== 🧠 RAW ML FEATURES (BEFORE SCALING) ===")
            for name, val in zip(FEATURE_NAMES, features_array[0]):
                print(f"{name}: {val:.4f}")
            print("===========================================\\n")

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
        shap_dict = {}

        try:
            if explainer is None:
                raise Exception("SHAP not available")

            shap_values = explainer.shap_values(features_scaled)
            feature_names = FEATURE_NAMES

            # handle multi-class / binary formats safely
            if isinstance(shap_values, list):
                class_index = classes.index(prediction_model) if prediction_model in classes else 0
                shap_vector = shap_values[class_index]
            else:
                shap_vector = shap_values

            # ensure numpy array
            shap_vector = np.array(shap_vector)

            # FIX: always reduce to 1D vector
            if shap_vector.ndim == 2:
                shap_vector = shap_vector[0]

            if shap_vector.ndim > 1:
                shap_vector = shap_vector.mean(axis=0)

            shap_vector = shap_vector.flatten()

            # STRICT FIX: enforce exact feature length (no crash)
            if len(shap_vector) > len(feature_names):
                shap_vector = shap_vector[:len(feature_names)]
            elif len(shap_vector) < len(feature_names):
                shap_vector = np.pad(shap_vector, (0, len(feature_names) - len(shap_vector)))

            shap_dict = dict(zip(feature_names, shap_vector.tolist()))

            # save attributions safely
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
        # 🧠 UNCERTAINTY / EDGE CASE HANDLING (Hierarchical)
        # -------------------------
        meta_scores = {
            "dyslexia": dyslexia_score,
            "dysgraphia": dysgraphia_score,
            "both": both_score,
            "normal": normal_score
        }

        sorted_meta = sorted(meta_scores.items(), key=lambda x: x[1], reverse=True)
        top_meta, top_meta_prob = sorted_meta[0]
        second_meta, second_meta_prob = sorted_meta[1]

        # -------------------------
        # 🧠 NORMAL BIAS (FORGIVE NOISY DATA)
        # -------------------------
        # If normal is reasonably likely (>35%), and it's close to top, favor it
        is_uncertain = (top_meta_prob - second_meta_prob) < 0.15 # Define uncertainty based on probability margin
        
        if prob_map.get("normal", 0) > 0.35 and prediction != "normal":
            # Current top class probability
            top_prob = probs[int(np.argmax(probs))]
            if abs(prob_map.get("normal", 0) - top_prob) < 0.15:
                print("🧠 NORMAL BIAS APPLIED: Overriding risk prediction with 'normal'")
                prediction = "normal"
                is_uncertain = False # Favoring normal reduces uncertainty noise

        # -------------------------
        # 🎯 STAGE + SMART CONFIDENCE (REFACTORED)
        # -------------------------
        # Severity Weighting: normal=0, mild=1, moderate=2, severe=3
        severity_score = (
            (prob_map.get("mild", 0.0) * 1) + 
            (prob_map.get("moderate", 0.0) * 2) + 
            (prob_map.get("severe", 0.0) * 3)
        )
        
        # Normalize dyslexia_score by total risk probability
        if dyslexia_score > 0:
            weighted_stage_val = severity_score / dyslexia_score
        else:
            weighted_stage_val = 0.0

        def get_risk_stage(val, top_pred):
            if top_pred == "normal":
                return "stage_1" # Minimal/Baseline
            
            if val <= 1.5:
                return "stage_1"
            elif val <= 2.5:
                return "stage_2"
            else:
                return "stage_3"

        dyslexia_stage = get_risk_stage(weighted_stage_val, prediction)
        # For dysgraphia, we keep it simple since it's usually binary or single class risk
        dysgraphia_stage = "stage_3" if dysgraphia_score > 0.6 else "stage_2" if dysgraphia_score > 0.3 else "stage_1"

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

        # 🔥 FIX: Boost confidence using margin between top classes
        margin = top_meta_prob - second_meta_prob
        base_confidence = float(min(1.0, top_meta_prob + (margin * 0.5)))

        # adjust slightly using consistency
        confidence = (base_confidence * 0.8) + (consistency * 0.2)

        # 🔥 FIX: Less harsh penalty for uncertainty
        if is_uncertain:
            confidence *= 0.85

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

        # -------------------------
        # 🧠 UNCERTAINTY CALCULATION (ENTROPY BASED)
        # -------------------------
        entropy = -sum([p * np.log(p + 1e-9) for p in probs])

        # normalize entropy (max ≈ log(n_classes))
        max_entropy = np.log(len(probs))
        normalized_uncertainty = entropy / max_entropy if max_entropy > 0 else 0

        uncertainty_score = float(round(normalized_uncertainty, 3))

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
        session.eye_data = [p.model_dump() for p in data.eye_data]
        session.pen_data = [p.model_dump() for p in data.pen_data]
        session.errors = data.errors
        session.status = "completed"
        db.flush()

        # ✅ Create Assessment ONLY after successful prediction
        assessment = models.Assessment(
            user_id=user_id,
            session_number=session_number,
            eye_data=[p.model_dump() for p in data.eye_data],
            pen_data=[p.model_dump() for p in data.pen_data],
            errors=data.errors
        )
        db.add(assessment)
        db.flush()
        db.refresh(assessment)

        # -------------------------
        # 🧠 SAVE PER-WORD ERRORS TO DB (NEW — powers adaptive training)
        # -------------------------
        if data.errors:
            for err in data.errors:
                try:
                    target = str(err.get("target", "")).strip().lower()
                    actual = str(err.get("actual", "")).strip().lower()
                    
                    # Derive confused letters by comparing character-by-character
                    confused = []
                    error_type = "substitution"
                    
                    if len(target) > 0 and len(actual) > 0:
                        # Character-level comparison
                        max_len = max(len(target), len(actual))
                        for i in range(max_len):
                            t_char = target[i] if i < len(target) else ""
                            a_char = actual[i] if i < len(actual) else ""
                            if t_char != a_char and t_char and a_char:
                                confused.append({"expected": t_char, "actual": a_char})
                        
                        # Classify error type
                        if len(actual) < len(target):
                            error_type = "omission"
                        elif len(actual) > len(target):
                            error_type = "addition"
                        elif target[::-1] == actual or any(
                            t in "bdpq" and a in "bdpq" 
                            for t, a in zip(target, actual) if t != a
                        ):
                            error_type = "reversal"
                    
                    db.add(models.AssessmentError(
                        user_id=user_id,
                        session_id=session.id,
                        step=err.get("step", 0),
                        sub_step=err.get("subStep", 0),
                        target_word=target,
                        actual_word=actual,
                        similarity=err.get("confidence", 0),
                        is_correct=False,
                        confused_letters=confused if confused else None,
                        error_type=error_type
                    ))
                except Exception as e:
                    print(f"AssessmentError insert error: {e}")

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
            tv = np.array(shap_dict.get("timing_variance", 0)).flatten()
            aj = np.array(shap_dict.get("avg_jerk", 0)).flatten()

            tv = float(tv[0]) if len(tv) > 0 else 0.0
            aj = float(aj[0]) if len(aj) > 0 else 0.0

            writing_impact = abs(tv) + abs(aj)

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
        profile = get_or_create_weakness_profile(db, user_id)

        alpha = 0.3  # smoothing factor

        # Update using EMA (Exponential Moving Average)
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

        # 🔥 Generate and save training plan based on new user_level system
        program = generate_program(dyslexia_stage, dysgraphia_stage, db=db, user_id=user_id)
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

        # 🚀 Invalidate cached dashboard reads so the new result shows immediately
        cache_invalidate(f"summary:{user_id}", f"diagnosis:{user_id}")

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


# -------------------------
# 🎭 DEMO MODE — Pre-computed results for safe demos
# -------------------------
@router.get("/demo-results")
def get_demo_results():
    """Returns realistic pre-computed assessment results for demo/hackathon safety"""
    return {
        "demo": True,
        "prediction": "dyslexia",
        "level": "stage_1",
        "confidence": 0.82,
        "probabilities": {
            "dyslexia": 0.72,
            "dysgraphia": 0.35,
            "both": 0.18,
            "normal": 0.28
        },
        "risk_scores": {
            "dyslexia_risk": 72,
            "dysgraphia_risk": 35
        },
        "stage": "Mild",
        "diagnosis_type": "Dyslexia",
        "shap_explanations": [
            {"feature": "saccade_mean_velocity", "impact": 0.234, "direction": "positive", "explanation": "Elevated eye movement speed during reading indicates scanning difficulty"},
            {"feature": "regression_rate", "impact": 0.189, "direction": "positive", "explanation": "Frequent backward eye movements suggest re-reading behavior"},
            {"feature": "avg_fixation_duration", "impact": 0.156, "direction": "positive", "explanation": "Longer fixation times indicate slower word processing"},
            {"feature": "letter_reversal_rate", "impact": 0.134, "direction": "positive", "explanation": "Detected b/d confusion in 23% of attempts"},
            {"feature": "writing_speed_wpm", "impact": -0.098, "direction": "negative", "explanation": "Writing speed is within normal range"}
        ],
        "error_patterns": {
            "reversals": ["b/d", "p/q"],
            "omissions": ["e", "i"],
            "substitutions": {"teh": "the", "fro": "for"},
            "problem_words": ["because", "beautiful", "friend", "together", "different"]
        },
        "recommendations": [
            "Mirror letter discrimination exercises targeting b/d and p/q reversals",
            "Reading flow training with guided highlighting to reduce regression",
            "Phoneme awareness drills focusing on vowel sounds",
            "Multisensory writing practice: see → hear → say → write approach",
            "Daily 15-minute structured training sessions recommended"
        ],
        "insights": [
            "Primary pattern: dyslexia (72% probability)",
            "saccade_mean_velocity increased risk (0.234)",
            "regression_rate increased risk (0.189)",
            "avg_fixation_duration increased risk (0.156)",
            "letter_reversal_rate increased risk (0.134)"
        ],
        "metrics": {
            "reading": {"fixation_count": 47, "avg_fixation_ms": 380, "regression_rate": 0.31, "saccade_velocity": 245},
            "writing": {"avg_pressure": 0.62, "stroke_count": 134, "letter_reversal_rate": 0.23, "words_per_min": 8.5}
        }
    }