from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from datetime import datetime
from utils.training_generator_V2 import generate_program

router = APIRouter()


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

    # 🔥 Fetch latest result to decide training
    result = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Result.created_at.desc())\
        .first()

    if not result:
        return {"message": "No assessment found"}

    # generate dynamic program
    program = generate_program(
        result.dyslexia_stage,
        result.dysgraphia_stage
    )

    exercises = program["program"]["today"]["exercises"]

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
        ex["locked"] = True

    for i in range(min(completed_tasks + 1, len(exercises))):
        exercises[i]["locked"] = False

    earned_xp = db.query(models.Progress)\
        .filter(
            models.Progress.user_id == user_id,
            models.Progress.created_at >= today
        )\
        .count() * 50  # basic xp per task

    total_tasks = len(exercises)

    progress_percent = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    # 🎯 XP calculation
    total_xp = sum(e["xp"] for e in exercises)

    program["program"]["today"]["progress"] = progress_percent
    program["program"]["today"]["xp_earned"] = earned_xp
    program["program"]["xp_today_total"] = total_xp

    return program


@router.post("/complete/{task_id}")
def complete_task(task_id: int, db: Session = Depends(get_db), user_id=Depends(get_current_user)):

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
    db.commit()

    # -------------------------
    # 🧠 UPDATE PROGRESS (NEW)
    # -------------------------
    # 🚫 Prevent duplicate completion (same task same day)
    today = datetime.utcnow().date()

    existing = db.query(models.Progress).filter(
        models.Progress.user_id == user_id,
        models.Progress.created_at >= today,
        models.Progress.task_id == task_id
    ).first()

    if existing:
        return {
            "message": "Already completed tasks for today",
            "task_id": task_id
        }

    progress = models.Progress(
        user_id=user_id,
        task_id=task_id,
        reading_score=1 if task.task_type == "eye" else 0,
        writing_score=1 if task.task_type == "pen" else 0,
        rhythm_score=1 if task.task_type == "rhythm" else 0,
        created_at=datetime.utcnow()
    )

    db.add(progress)
    db.commit()

    return {
        "message": "Task completed",
        "task_id": task_id,
        "next_unlocked": task_id + 1
    }