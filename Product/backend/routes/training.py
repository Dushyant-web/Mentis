from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, String
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from datetime import datetime, timedelta
from utils.training_generator_V2 import generate_today_plan, compute_user_level
from ml.exercise_engine import complete_exercise_db
import numpy as np
from utils.rate_limiter import rate_limit
from ml.model_loader import get_model, get_scaler
from utils.profile_manager import get_or_create_weakness_profile

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

    # 🔥 FETCH LATEST PLAN
    plan = db.query(models.TrainingPlan)\
        .filter(models.TrainingPlan.user_id == user_id)\
        .order_by(models.TrainingPlan.created_at.desc())\
        .first()

    if not plan:
        return {"message": "No training plan found"}

    # 🔥 FETCH LATEST EXERCISE BATCH
    today = datetime.utcnow().date()
    
    latest_task_date = db.query(func.max(func.date(models.TrainingTask.created_at)))\
        .filter(models.TrainingTask.plan_id == plan.id)\
        .scalar()
        
    tasks = []
    generate_new = False
    is_completed_waiting = False
    
    if not latest_task_date:
        generate_new = True
    else:
        tasks = db.query(models.TrainingTask)\
            .filter(
                models.TrainingTask.plan_id == plan.id,
                func.date(models.TrainingTask.created_at) == latest_task_date
            )\
            .all()
            
        all_done = all(t.status == "done" for t in tasks) if tasks else False
        
        if all_done:
            if today > latest_task_date:
                generate_new = True
                tasks = [] # Will be regenerated below
            else:
                is_completed_waiting = True

    # -------------------------
    # 🧠 COMPUTE USER LEVEL (NEW)
    # -------------------------
    user_level = compute_user_level(db, user_id)

    # -------------------------
    # 🗓️ DAILY REGENERATION (If requested by cycle logic)
    # -------------------------
    if generate_new:
        # 🔥 THROTTLE: Check if any tasks were JUST created for this plan in the last 15 seconds
        # This prevents race conditions if the user refreshes quickly.
        recent_check = db.query(models.TrainingTask)\
            .filter(
                models.TrainingTask.plan_id == plan.id,
                models.TrainingTask.created_at >= datetime.utcnow() - timedelta(seconds=15)
            ).first()
        
        if recent_check:
            # Tasks already exists or being created by parallel request
            # Return existing tasks instead of regenerating
            tasks = db.query(models.TrainingTask)\
                .filter(
                    models.TrainingTask.plan_id == plan.id,
                    func.date(models.TrainingTask.created_at) == today
                ).all()
            generate_new = False
        else:
            # Latest writing errors (for adaptive confusion training)
            latest_writing = db.query(models.WritingTest)\
                .filter(models.WritingTest.user_id == user_id)\
                .order_by(models.WritingTest.created_at.desc())\
                .first()
            
            errors = latest_writing.errors if latest_writing else []
            
            # 🔥 FIX: Pass db and user_id for error-driven adaptive training
            new_plans = generate_today_plan(user_level, errors, db=db, user_id=user_id)
            
            for tp in new_plans:
                new_task = models.TrainingTask(
                    plan_id=plan.id,
                    task_name=tp["name"],
                    task_type=tp["type"],
                    difficulty=tp.get("difficulty", "medium"),
                    duration=tp["duration"],
                    xp=tp["xp"],
                    status="pending",
                    created_at=datetime.utcnow()
                )
                db.add(new_task)
            
            db.commit()
        
        # Refetch
        tasks = db.query(models.TrainingTask)\
            .filter(
                models.TrainingTask.plan_id == plan.id,
                func.date(models.TrainingTask.created_at) == today
            )\
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

            # 🔥 FIX: handle SHAP output safely (list vs array)
            if isinstance(shap_values, list):
                if class_index < len(shap_values):
                    values = shap_values[class_index]
                else:
                    values = shap_values[0]
            else:
                values = shap_values

            # ensure correct shape (1, n_features)
            if len(values.shape) == 2:
                values = values[0]

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

    # 🔥 Use persistent memory instead of only latest result (Atomic Get/Create)
    profile = get_or_create_weakness_profile(db, user_id)

    weakness_profile["reading"] = profile.reading_score or 0
    weakness_profile["writing"] = profile.writing_score or 0
    weakness_profile["rhythm"] = profile.rhythm_score or 0

    # check if profile is empty (0/0/0)
    is_empty = (not profile.reading_score and not profile.writing_score and not profile.rhythm_score)
    
    if is_empty:
        # fallback if no profile data yet
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
    # 🔒 Lock system based on real progress
    completed_tasks_count = sum(1 for ex in exercises if ex.get("status") == "done")

    for i, ex in enumerate(exercises):
        if ex.get("adaptive"):
            ex["locked"] = False
        else:
            ex["locked"] = True

    unlock_limit = min(completed_tasks_count + 1, len(exercises))
    for i in range(unlock_limit):
        exercises[i]["locked"] = False

    earned_xp = sum(ex["xp"] for ex in exercises if ex.get("status") == "done")

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

    # -------------------------
    # 🗓️ PROGRAM WEEK CALCULATION
    # -------------------------
    days_since_start = (datetime.utcnow() - plan.created_at).days
    total_weeks = 8
    # clamp to the program length so we never report "Week 14 of 8"
    current_week = min((days_since_start // 7) + 1, total_weeks)

    return {
        "today": {
            "progress": adjusted_progress,
            "xp_earned": earned_xp,
            "weakness_profile": weakness_profile,
            "exercises": exercises,
            "current_week": current_week,
            "total_weeks": total_weeks,
            "all_completed_waiting": is_completed_waiting
        },
        "xp_today_total": total_xp,
        "adaptive_level": user_level
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

    # -------------------------
    # 🔥 ADAPTIVE DIFFICULTY PROGRESSION
    # -------------------------
    # Calculate total XP earned by user
    total_xp_rows = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingPlan.user_id == user_id,
            models.TrainingTask.status == "done"
        ).with_entities(models.TrainingTask.xp).all()
    
    total_xp = sum(x[0] for x in total_xp_rows if x[0]) if total_xp_rows else 0
    
    # Count completed exercises
    done_count = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingPlan.user_id == user_id,
            models.TrainingTask.status == "done"
        ).count()
    
    # Determine user's current difficulty level
    # Level 1 (Beginner): 0-199 XP or 0-4 exercises → easy
    # Level 2 (Intermediate): 200-499 XP or 5-14 exercises → medium
    # Level 3 (Advanced): 500+ XP or 15+ exercises → hard
    difficulty_upgraded = False
    user_level = "beginner"
    
    if total_xp >= 500 or done_count >= 15:
        target_difficulty = "hard"
        user_level = "advanced"
    elif total_xp >= 200 or done_count >= 5:
        target_difficulty = "medium"
        user_level = "intermediate"
    else:
        target_difficulty = "easy"
        user_level = "beginner"
    
    # Upgrade pending tasks if user has leveled up
    difficulty_order = {"easy": 0, "medium": 1, "hard": 2, "adaptive": 1}
    pending_tasks = db.query(models.TrainingTask)\
        .filter(
            models.TrainingTask.plan_id == task.plan_id,
            models.TrainingTask.status == "pending"
        ).all()
    
    for pt in pending_tasks:
        current_diff = (pt.difficulty or "medium").lower()
        if difficulty_order.get(current_diff, 0) < difficulty_order.get(target_difficulty, 0):
            pt.difficulty = target_difficulty
            # Also bump XP for harder exercises
            if target_difficulty == "hard":
                pt.xp = max(pt.xp or 0, 70)
            elif target_difficulty == "medium":
                pt.xp = max(pt.xp or 0, 50)
            difficulty_upgraded = True
    
    if difficulty_upgraded:
        db.commit()

    # determine next unlocked task
    next_task = db.query(models.TrainingTask)\
        .filter(models.TrainingTask.plan_id == task.plan_id, models.TrainingTask.status == "pending")\
        .order_by(models.TrainingTask.id.asc())\
        .first()

    return {
        "message": "Task completed",
        "task_id": task_id,
        "xp_earned": task.xp if hasattr(task, "xp") else 50,
        "total_xp": total_xp,
        "exercises_done": done_count,
        "user_level": user_level,
        "difficulty_upgraded": difficulty_upgraded,
        "next_unlocked": next_task.id if next_task else None,
        "next_difficulty": next_task.difficulty if next_task else None,
    }


# -------------------------
# 🧠 EXERCISE CONTENT API (NEW)
# Returns structured content for a specific exercise
# -------------------------

@router.get("/exercise-content/{task_id}")
def get_exercise_content_api(task_id: int, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"exercise_content:{user_id}", limit=30, window=60)
    
    from utils.exercise_content import get_exercise_content
    from utils.training_generator_V2 import extract_confusions_from_db

    # Fetch the task
    task = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingTask.id == task_id,
            models.TrainingPlan.user_id == user_id
        ).first()

    if not task:
        return {"error": "Task not found"}

    # Determine exercise mode from task content or type
    mode = None
    
    # Check if task has stored content with a mode
    if task.content and isinstance(task.content, dict):
        mode = task.content.get("mode")
    
    # Fallback: map task_type + task_name → mode
    if not mode:
        name_lower = (task.task_name or "").lower()
        type_lower = (task.task_type or "").lower()
        
        # Reading exercises
        if "reading flow" in name_lower or "follow" in name_lower:
            mode = "follow_highlight"
        elif "word recognition" in name_lower or "flashcard" in name_lower:
            mode = "flashcards"
        elif "regression" in name_lower or "no backtrack" in name_lower:
            mode = "no_backtrack"
        elif "speed reading" in name_lower:
            mode = "timed_read"
        elif "word pair" in name_lower or "pair match" in name_lower:
            mode = "pair_match"
        elif "sentence completion" in name_lower or "fill" in name_lower:
            mode = "fill_blank"
        elif "phoneme" in name_lower:
            mode = "phoneme_split"
        elif "comprehension" in name_lower:
            mode = "comprehension"
        
        # Writing exercises
        elif "letter pattern" in name_lower:
            mode = "letter_pattern"
        elif "confus" in name_lower and "letter" in name_lower:
            mode = "confusion_drill"
        elif "word copy" in name_lower or "copy accuracy" in name_lower:
            mode = "copy_exact"
        elif "sentence writing" in name_lower:
            mode = "sentence_write"
        elif "dictation" in name_lower:
            mode = "dictation"
        elif "letter size" in name_lower or "size consistency" in name_lower:
            mode = "size_control"
        elif "speed writing" in name_lower:
            mode = "speed_write"
        elif "memory recall" in name_lower or "memory write" in name_lower:
            mode = "memory_write"
        
        # Motor exercises
        elif "rhythm" in name_lower or "tap" in name_lower:
            mode = "tap_sync"
        elif "smooth" in name_lower or "stroke" in name_lower:
            mode = "smooth_trace"
        elif "pressure" in name_lower:
            mode = "pressure_control"
        elif "fine motor" in name_lower or "precision" in name_lower or "coordination" in name_lower:
            mode = "precision_draw"
        
        # Cognitive exercises
        elif "visual memory" in name_lower:
            mode = "visual_memory"
        elif "multisensory" in name_lower:
            mode = "multisensory"
        elif "pattern" in name_lower and "recognition" in name_lower:
            mode = "pattern_spot"
        
        # Adaptive exercises
        elif "mirror" in name_lower or "discrimination" in name_lower:
            mode = "reversal_drill"
        elif "completion" in name_lower:
            mode = "completion_drill"
        elif "problem word" in name_lower:
            mode = "word_drill"
        elif "confusion pair" in name_lower or "adaptive confusion" in name_lower:
            mode = "confusion_drill"
        
        # Final fallback by type
        elif type_lower == "eye":
            mode = "follow_highlight"
        elif type_lower == "pen":
            mode = "copy_exact"
        elif type_lower == "rhythm":
            mode = "tap_sync"
        else:
            mode = "copy_exact"

    # Build kwargs for adaptive exercises (pass user error data)
    kwargs = {}
    if mode in ("reversal_drill", "confusion_pair_drill", "word_drill"):
        try:
            confusion_pairs, error_stats = extract_confusions_from_db(db, user_id)
            if mode in ("reversal_drill", "confusion_pair_drill"):
                kwargs["confusion_pairs"] = confusion_pairs if confusion_pairs else None
                if mode == "confusion_pair_drill":
                    kwargs["pairs"] = confusion_pairs if confusion_pairs else None
            elif mode == "word_drill":
                kwargs["problem_words"] = error_stats.get("problem_words") if error_stats else None
        except:
            pass

    # Generate content
    content = get_exercise_content(mode, **kwargs)
    
    return {
        "task_id": task_id,
        "task_name": task.task_name,
        "task_type": task.task_type,
        "difficulty": task.difficulty,
        "duration": task.duration,
        "xp": task.xp,
        "mode": mode,
        "content": content
    }


@router.get("/exercise-modes")
def list_exercise_modes(user_id=Depends(get_current_user)):
    """List all available exercise types with descriptions"""
    from utils.exercise_content import get_all_exercise_modes
    
    modes = get_all_exercise_modes()
    
    mode_info = {
        "follow_highlight": {"category": "reading", "name": "Reading Flow", "icon": "👁️"},
        "flashcards": {"category": "reading", "name": "Word Recognition", "icon": "⚡"},
        "no_backtrack": {"category": "reading", "name": "Regression Reduction", "icon": "➡️"},
        "timed_read": {"category": "reading", "name": "Speed Reading", "icon": "🏃"},
        "pair_match": {"category": "reading", "name": "Word Pair Matching", "icon": "🔗"},
        "fill_blank": {"category": "reading", "name": "Sentence Completion", "icon": "📝"},
        "phoneme_split": {"category": "reading", "name": "Phoneme Awareness", "icon": "🔊"},
        "comprehension": {"category": "reading", "name": "Comprehension", "icon": "📖"},
        
        "letter_pattern": {"category": "writing", "name": "Letter Patterns", "icon": "✏️"},
        "confusion_drill": {"category": "writing", "name": "Confusing Letters", "icon": "🔄"},
        "copy_exact": {"category": "writing", "name": "Word Copy", "icon": "📋"},
        "sentence_write": {"category": "writing", "name": "Sentence Writing", "icon": "✍️"},
        "dictation": {"category": "writing", "name": "Dictation", "icon": "🎧"},
        "size_control": {"category": "writing", "name": "Letter Sizing", "icon": "📏"},
        "speed_write": {"category": "writing", "name": "Speed Writing", "icon": "💨"},
        "memory_write": {"category": "writing", "name": "Memory Recall", "icon": "🧠"},
        
        "tap_sync": {"category": "motor", "name": "Rhythm Timing", "icon": "🎵"},
        "smooth_trace": {"category": "motor", "name": "Stroke Smoothness", "icon": "〰️"},
        "pressure_control": {"category": "motor", "name": "Pressure Control", "icon": "🎯"},
        "precision_draw": {"category": "motor", "name": "Fine Motor", "icon": "✨"},
        
        "visual_memory": {"category": "cognitive", "name": "Visual Memory", "icon": "👀"},
        "multisensory": {"category": "cognitive", "name": "Multisensory", "icon": "🌈"},
        "pattern_spot": {"category": "cognitive", "name": "Pattern Recognition", "icon": "🧩"},
        
        "reversal_drill": {"category": "adaptive", "name": "Mirror Discrimination", "icon": "🪞"},
        "completion_drill": {"category": "adaptive", "name": "Letter Completion", "icon": "🔧"},
        "word_drill": {"category": "adaptive", "name": "Problem Words", "icon": "🎯"},
        "confusion_pair_drill": {"category": "adaptive", "name": "Confusion Pairs", "icon": "🔀"},
    }
    
    return {
        "total_modes": len(modes),
        "modes": [
            {
                "mode": m,
                **(mode_info.get(m, {"category": "other", "name": m, "icon": "📌"}))
            } for m in modes
        ]
    }
