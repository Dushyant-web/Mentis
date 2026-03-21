from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, String
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from datetime import datetime
from utils.training_generator_V2 import generate_program
from ml.exercise_engine import complete_exercise_db
import numpy as np
from utils.rate_limiter import rate_limit
from ml.model_loader import get_model, get_scaler

# Load model and scaler globally
model = get_model()
scaler = get_scaler()

try:
    from utils.confusion_engine import extract_confusions, build_multi_type_exercises
except ImportError:
    extract_confusions = None
    build_multi_type_exercises = None

# -------------------------
# 🔥 Load ML + SHAP (GLOBAL)
# -------------------------



try:
    import shap
    explainer = shap.TreeExplainer(model)
except:
    explainer = None

router = APIRouter()

def save_adaptive_task(db, plan_id, name, type_, content, source):
    # 🔥 FIX: boolean instead of 1
    content_str = str(content or "")

    existing = db.query(models.TrainingTask).filter(
        models.TrainingTask.plan_id == plan_id,
        models.TrainingTask.is_adaptive.is_(True),  # ✅ FIX
        models.TrainingTask.source == source,
        func.cast(models.TrainingTask.content, String) == content_str
    ).first()

    if existing:
        return existing

    new_task = models.TrainingTask(
        plan_id=plan_id,
        task_name=name,
        task_type=type_,
        difficulty="adaptive",
        duration="15min",
        xp=60,
        status="pending",
        is_adaptive=True,  # ✅ FIX
        source=source,
        content=content
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task

def generate_plan(level, dyslexia_stage=None, dysgraphia_stage=None, trend=None):

    tasks = []

    def add_task(name, type_, difficulty, duration, xp=50, status="pending"):
        tasks.append({
            "name": name,
            "type": type_,
            "difficulty": difficulty,
            "duration": duration,
            "xp": xp,
            "status": status
        })

    # -------------------------
    # 📖 DYSLEXIA TRAINING
    # -------------------------

    if dyslexia_stage == "stage_3":
        add_task("Eye Fixation Control", "eye", "hard", "20min", 60)
        add_task("Regression Reduction Exercise", "eye", "hard", "20min", 60)

        # 🔥 if worsening → increase intensity
        if trend == "worsening":
            add_task("Guided Slow Reading (AI paced)", "eye", "hard", "25min", 70)

    elif dyslexia_stage == "stage_2":
        add_task("Word Recognition Drill", "eye", "medium", "15min", 50)
        add_task("Sentence Reading Practice", "eye", "medium", "15min", 50)

    elif dyslexia_stage == "stage_1":
        add_task("Basic Alphabet Reading", "eye", "easy", "10min", 30)

    # -------------------------
    # ✍️ DYSGRAPHIA TRAINING
    # -------------------------

    if dysgraphia_stage == "stage_3":
        add_task("Motor Control Exercise", "pen", "hard", "20min", 60)
        add_task("Rhythm Writing Practice", "pen", "hard", "20min", 60)

    elif dysgraphia_stage == "stage_2":
        add_task("Word Writing Practice", "pen", "medium", "15min", 50)
        add_task("Confusing Letters (b/d/p/q)", "pen", "medium", "15min", 50)

        if trend == "worsening":
            add_task("Slow Stroke Writing (guided)", "pen", "medium", "20min", 55)

    elif dysgraphia_stage == "stage_1":
        add_task("Letter Tracing", "pen", "easy", "10min", 30)

    # -------------------------
    # 🧠 BOTH CONDITION BOOST
    # -------------------------

    if level == "both":
        add_task("Multisensory Training (read + write)", "combined", "medium", "20min", 60)

    # assign ids
    for i, t in enumerate(tasks):
        t["id"] = i + 1

    return tasks

@router.get("/plan")
def get_plan(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"plan:{user_id}", limit=10, window=60)

    # 🔥 Fetch latest result to decide training
    result = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Result.created_at.desc())\
        .first()

    if not result:
        return {"message": "No assessment found"}

    # 🔥 FETCH TASKS FROM DB (REAL IDs)
    plan = db.query(models.TrainingPlan)\
        .filter(models.TrainingPlan.user_id == user_id)\
        .order_by(models.TrainingPlan.created_at.desc())\
        .first()

    if not plan:
        return {"message": "No training plan found"}

    tasks = db.query(models.TrainingTask)\
        .filter(models.TrainingTask.plan_id == plan.id)\
        .all()

    # -------------------------
    # 🔥 SHAP → FEATURE ANALYSIS (NEW)
    # -------------------------
    from utils.feature_builder import build_features, FEATURE_NAMES

    shap_insights = []

    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == result.assessment_id
    ).first()

    if assessment and explainer:
        try:
            features = build_features({
                "eye_data": assessment.eye_data,
                "pen_data": assessment.pen_data
            })

            features_scaled = scaler.transform([features])
            shap_values = explainer.shap_values(features_scaled)

            class_names = list(model.classes_)
            top_class = result.level if result.level in class_names else class_names[0]
            class_index = class_names.index(top_class)

            values = shap_values[class_index][0]

            feature_names = FEATURE_NAMES

            top_indices = np.argsort(np.abs(values))[-3:]

            for idx in top_indices:
                shap_insights.append(feature_names[idx])

        except:
            shap_insights = []

    # -------------------------
    # 🧠 WEAKNESS PROFILE ENGINE (MEMORY-DRIVEN)
    # -------------------------
    weakness_profile = {
        "reading": 0,
        "writing": 0,
        "rhythm": 0
    }

    # 🔥 Use persistent memory instead of only latest result
    profile = db.query(models.UserWeaknessProfile).filter(
        models.UserWeaknessProfile.user_id == user_id
    ).first()

    if profile:
        weakness_profile["reading"] = profile.reading_score or 0
        weakness_profile["writing"] = profile.writing_score or 0
        weakness_profile["rhythm"] = profile.rhythm_score or 0

    # fallback if no profile
    if not profile:
        latest_result = db.query(models.Result)\
            .join(models.Assessment)\
            .filter(models.Assessment.user_id == user_id)\
            .order_by(models.Result.created_at.desc())\
            .first()

        if latest_result:
            weakness_profile["reading"] = latest_result.dyslexia_score or 0
            weakness_profile["writing"] = latest_result.dysgraphia_score or 0

    # 🔥 Eye influence (normalized)
    latest_eye = db.query(models.EyeTracking)\
        .filter(models.EyeTracking.user_id == user_id)\
        .order_by(models.EyeTracking.created_at.desc())\
        .first()

    if latest_eye:
        # regressions already stored
        weakness_profile["reading"] += (latest_eye.regressions or 0) * 0.3

        # fixation is duration → normalize safely (avoid negative logic)
        if latest_eye.fixation:
            normalized_fix = min(latest_eye.fixation / 200.0, 1.0)
            weakness_profile["reading"] += (1 - normalized_fix) * 2

    # normalize
    values = list(weakness_profile.values())
    max_score = max(values) if values else 1
    if max_score > 0:
        for k in weakness_profile:
            weakness_profile[k] = round((weakness_profile[k] / max_score) * 100, 2)

    # -------------------------
    # 📊 ISSUE HISTORY PRIORITY BOOST
    # -------------------------
    recent_history = db.query(models.IssueHistory)\
        .filter(models.IssueHistory.user_id == user_id)\
        .order_by(models.IssueHistory.created_at.desc())\
        .limit(5)\
        .all()

    reading_trend = sum([h.reading_score for h in recent_history]) / len(recent_history) if recent_history else 0
    writing_trend = sum([h.writing_score for h in recent_history]) / len(recent_history) if recent_history else 0

    # -------------------------
    # 🚀 TRAINING EVOLUTION LEVEL 2
    # -------------------------
    # Increase difficulty dynamically based on progress + weakness

    difficulty_boost = "normal"

    if weakness_profile["reading"] > 75 or weakness_profile["writing"] > 75:
        difficulty_boost = "intensive"
    elif weakness_profile["reading"] > 50 or weakness_profile["writing"] > 50:
        difficulty_boost = "hard"
    elif weakness_profile["reading"] < 25 and weakness_profile["writing"] < 25:
        difficulty_boost = "easy"

    exercises = []
    for t in tasks:
        adjusted_difficulty = t.difficulty

        if difficulty_boost == "intensive":
            adjusted_difficulty = "hard"
            t.xp = int(t.xp * 1.3)
        elif difficulty_boost == "hard":
            adjusted_difficulty = "hard"
        elif difficulty_boost == "easy":
            adjusted_difficulty = "easy"
            t.xp = int(t.xp * 0.8)

        if t.task_type == "eye":
            category = "reading"
        elif t.task_type == "pen":
            category = "writing"
        elif t.task_type == "rhythm":
            category = "rhythm"
        else:
            category = "cognitive"

        # 🔥 PRIORITY BOOST
        priority = 1
        if category == "reading" and reading_trend > writing_trend:
            priority = 2
        elif category == "writing" and writing_trend > reading_trend:
            priority = 2

        exercises.append({
            "priority": priority,
            "id": t.id,
            "name": t.task_name,
            "type": t.task_type,
            "category": category,
            "difficulty": adjusted_difficulty,
            "duration": t.duration,
            "xp": t.xp,
            "status": t.status
        })

    # -------------------------
    # 🔥 SHAP-DRIVEN TRAINING (NEW)
    # -------------------------
    shap_task_map = {
        "regression_count": "Regression Control Drill",
        "avg_fixation_duration": "Focus Stability Training",
        "fixation_count": "Eye Tracking Practice",
        "timing_variance": "Rhythm Writing Practice",
        "avg_jerk": "Smooth Stroke Writing",
        "pause_density": "Motor Rhythm Training",
        "motor_rhythm_index": "Timing Coordination Exercise"
    }

    for f in shap_insights:
        if f in shap_task_map:
            saved_task = save_adaptive_task(
                db,
                plan.id,
                shap_task_map[f],
                "pen" if "timing" in f or "jerk" in f else "eye",
                None,
                "shap"
            )

            exercises.insert(0, {
                "id": saved_task.id,
                "name": saved_task.task_name,
                "type": saved_task.task_type,
                "category": "adaptive",
                "difficulty": "adaptive",
                "duration": saved_task.duration,
                "xp": saved_task.xp,
                "status": saved_task.status,
                "adaptive": True
            })

    # 🔥 sort by priority (higher first)
    exercises = sorted(exercises, key=lambda x: x.get("priority", 1), reverse=True)
    # remove priority key from response (frontend clean)
    for ex in exercises:
        if "priority" in ex:
            del ex["priority"]

    # -------------------------
    # 🧠 ADAPTIVE CONFUSION ENGINE (NEW)
    # -------------------------
    latest_writing = db.query(models.WritingTest)\
        .filter(models.WritingTest.user_id == user_id)\
        .order_by(models.WritingTest.created_at.desc())\
        .first()

    if extract_confusions and latest_writing and hasattr(latest_writing, "errors") and latest_writing.errors:
        confusions = extract_confusions(latest_writing.errors)

        if confusions:
            adaptive_ex = build_multi_type_exercises(confusions)

            saved_task = save_adaptive_task(
                db,
                plan.id,
                adaptive_ex["name"],
                "pen",
                adaptive_ex["exercises"],
                "writing"
            )

            insert_index = 0

            exercises.insert(insert_index, {
                "id": saved_task.id,
                "name": saved_task.task_name,
                "type": saved_task.task_type,
                "category": "writing",
                "difficulty": saved_task.difficulty,
                "duration": saved_task.duration,
                "xp": saved_task.xp,
                "status": saved_task.status,
                "adaptive": True,
                "content": saved_task.content
            })

    # -------------------------
    # 👁️ EYE ADAPTIVE ENGINE (NEW)
    # -------------------------

    if latest_eye:
        eye_exercises = []

        if latest_eye.regressions and latest_eye.regressions > 5:
            eye_exercises.append({
                "type": "eye",
                "name": "Regression Control Drill",
                "difficulty": "adaptive",
                "duration": "15min",
                "xp": 60
            })

        if latest_eye.fixation and latest_eye.fixation < 120:
            eye_exercises.append({
                "type": "eye",
                "name": "Fixation Stability Training",
                "difficulty": "adaptive",
                "duration": "15min",
                "xp": 60
            })

        if latest_eye.reading_speed and latest_eye.reading_speed < 100:
            eye_exercises.append({
                "type": "eye",
                "name": "Speed Reading Drill",
                "difficulty": "adaptive",
                "duration": "15min",
                "xp": 60
            })

        for ex in reversed(eye_exercises):
            saved_task = save_adaptive_task(
                db,
                plan.id,
                ex["name"],
                ex["type"],
                None,
                "eye"
            )

            insert_index = 0

            exercises.insert(insert_index, {
                "id": saved_task.id,
                "name": saved_task.task_name,
                "type": saved_task.task_type,
                "category": "reading",
                "difficulty": saved_task.difficulty,
                "duration": saved_task.duration,
                "xp": saved_task.xp,
                "status": saved_task.status,
                "adaptive": True
            })

    # 📊 Progress calculation FIRST
    today = datetime.utcnow().date()

    completed_tasks = db.query(models.Progress)\
        .filter(
            models.Progress.user_id == user_id,
            models.Progress.created_at >= today
        )\
        .count()

    # 🔒 Lock system based on real progress
    for i, ex in enumerate(exercises):
        if ex.get("adaptive"):
            ex["locked"] = False
        else:
            ex["locked"] = True

    unlock_limit = min(completed_tasks + 1, len(exercises))
    for i in range(unlock_limit):
        exercises[i]["locked"] = False

    earned_xp = db.query(func.sum(models.Progress.xp))\
        .filter(
            models.Progress.user_id == user_id,
            models.Progress.created_at >= today
        )\
        .scalar() or 0

    # -------------------------
    # 🧠 SMART PROGRESS (WEIGHTED)
    # -------------------------
    total_weight = 0
    earned_weight = 0

    for ex in exercises:
        weight = 1

        if ex["difficulty"] == "hard":
            weight = 1.5
        elif ex["difficulty"] == "adaptive":
            weight = 2

        total_weight += weight

        if ex["status"] == "done":
            earned_weight += weight

    progress_percent = int((earned_weight / total_weight) * 100) if total_weight else 0

    # -------------------------
    # ⏳ DECAY SYSTEM (NEW)
    # -------------------------
    last_activity = db.query(models.Progress)\
        .filter(models.Progress.user_id == user_id)\
        .order_by(models.Progress.created_at.desc())\
        .first()

    decay_penalty = 0

    if last_activity:
        days_inactive = (datetime.utcnow() - last_activity.created_at).days

        if days_inactive >= 2:
            decay_penalty = min(days_inactive * 2, 20)  # max 20% decay

    adjusted_progress = max(progress_percent - decay_penalty, 0)

    # 🎯 XP calculation
    total_xp = sum(e["xp"] for e in exercises)

    return {
        "today": {
            "progress": adjusted_progress,
            "xp_earned": earned_xp,
            "weakness_profile": weakness_profile,
            "exercises": exercises
        },
        "xp_today_total": total_xp
    }


@router.post("/complete/{task_id}")
def complete_training_task(task_id: int, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"training:{user_id}", limit=20, window=60)

    task = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingTask.id == task_id,
            models.TrainingPlan.user_id == user_id
        ).first()

    if not task:
        return {"error": "Task not found"}

    # mark done
    task.status = "done"
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"error": "Database commit failed", "details": str(e)}

    # -------------------------
    # 🧠 UPDATE PROGRESS (NEW)
    # -------------------------
    # 🚫 Prevent duplicate completion (same task same day)
    today = datetime.utcnow().date()

    existing = db.query(models.Progress).filter(
        models.Progress.user_id == user_id,
        models.Progress.created_at >= today,
        models.Progress.task_id == int(task_id)
    ).first()

    if existing:
        return {
            "message": "Already completed tasks for today",
            "task_id": task_id
        }

    progress = models.Progress(
        user_id=user_id,
        task_id=int(task_id),
        xp=task.xp if hasattr(task, "xp") else 50,
        created_at=datetime.utcnow()
    )

    db.add(progress)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"error": "Database commit failed", "details": str(e)}

    # -------------------------
    # 🧠 LEARNING MEMORY UPDATE (CRITICAL)
    # -------------------------
    # update weakness profile based on completed task type
    profile = db.query(models.UserWeaknessProfile).filter(
        models.UserWeaknessProfile.user_id == user_id
    ).first()

    if not profile:
        profile = models.UserWeaknessProfile(
            user_id=user_id,
            reading_score=0,
            writing_score=0,
            rhythm_score=0
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # -------------------------
    # 🧠 REAL PERFORMANCE-BASED LEARNING
    # -------------------------
    lr = 0.1

    # default performance (fallback)
    performance = 0.5

    # 🔥 fetch latest writing performance
    latest_writing = db.query(models.WritingTest)\
        .filter(models.WritingTest.user_id == user_id)\
        .order_by(models.WritingTest.created_at.desc())\
        .first()

    # 🔥 fetch latest eye performance
    latest_eye = db.query(models.EyeTracking)\
        .filter(models.EyeTracking.user_id == user_id)\
        .order_by(models.EyeTracking.created_at.desc())\
        .first()

    # normalize signals
    if task.task_type == "pen" and latest_writing:
        performance = min(max(latest_writing.writing_score / 5.0, 0), 1)

    elif task.task_type == "eye" and latest_eye:
        performance = min(max(latest_eye.eye_score / 6.0, 0), 1)

    elif task.task_type == "rhythm":
        performance = 0.6  # placeholder (upgrade later)

    # 🔥 EMA UPDATE WITH REAL PERFORMANCE
    if task.task_type == "eye":
        profile.reading_score = (1 - lr) * (profile.reading_score or 0) + lr * performance

    elif task.task_type == "pen":
        profile.writing_score = (1 - lr) * (profile.writing_score or 0) + lr * performance

    elif task.task_type == "rhythm":
        profile.rhythm_score = (1 - lr) * (profile.rhythm_score or 0) + lr * performance

    db.commit()

    # determine next unlocked task
    next_task = db.query(models.TrainingTask)\
        .filter(models.TrainingTask.plan_id == task.plan_id, models.TrainingTask.status == "pending")\
        .order_by(models.TrainingTask.id.asc())\
        .first()

    return {
        "message": "Task completed",
        "task_id": task_id,
        "next_unlocked": next_task.id if next_task else None
    }
