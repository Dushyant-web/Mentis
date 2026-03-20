from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user

router = APIRouter()


# -------------------------
# 🧠 HELPERS
# -------------------------

def get_risk_level(dyslexia_stage, dysgraphia_stage):
    if "stage_3" in [dyslexia_stage, dysgraphia_stage]:
        return "high"
    elif "stage_2" in [dyslexia_stage, dysgraphia_stage]:
        return "medium"
    elif "stage_1" in [dyslexia_stage, dysgraphia_stage]:
        return "low"
    return "normal"


def get_main_issue(dyslexia_score, dysgraphia_score):
    if dyslexia_score > dysgraphia_score:
        return "reading"
    elif dysgraphia_score > dyslexia_score:
        return "writing"
    return "both"


def generate_insights(result):
    insights = []

    if result.dyslexia_stage == "stage_3":
        insights.append("Severe reading difficulty detected")
    elif result.dyslexia_stage == "stage_2":
        insights.append("Moderate reading issues observed")

    if result.dysgraphia_stage == "stage_3":
        insights.append("Severe writing instability detected")
    elif result.dysgraphia_stage == "stage_2":
        insights.append("Moderate handwriting issues observed")

    if result.dyslexia_score > 2:
        insights.append("High eye movement regression detected")

    if result.dysgraphia_score > 1:
        insights.append("Irregular writing rhythm observed")

    return insights


def generate_recommendations(main_issue, risk_level):
    rec = []

    if main_issue == "reading":
        rec.append("Focus on eye tracking exercises")
        rec.append("Practice slow reading daily")

    elif main_issue == "writing":
        rec.append("Practice handwriting drills")
        rec.append("Improve stroke consistency")

    else:
        rec.append("Balance reading and writing exercises")

    if risk_level == "high":
        rec.append("Daily guided training recommended")
    elif risk_level == "medium":
        rec.append("Practice consistently for improvement")

    return rec


def calculate_trend(results):
    if len(results) < 2:
        return {
            "status": "no_data",
            "message": "Not enough data to determine trend"
        }

    first = results[-1]
    last = results[0]

    delta = last.dyslexia_score - first.dyslexia_score

    if delta < -0.5:
        status = "improving"
    elif delta > 0.5:
        status = "worsening"
    else:
        status = "stable"

    return {
        "status": status,
        "change": round(delta, 2)
    }


# -------------------------
# 📊 DASHBOARD SUMMARY
# -------------------------

@router.get("/summary")
def get_dashboard(db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    # latest result
    latest = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .first()

    if not latest:
        return {"message": "No data available"}

    # history (for trend)
    results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .all()

    # derived logic
    risk_level = get_risk_level(latest.dyslexia_stage, latest.dysgraphia_stage)
    main_issue = get_main_issue(latest.dyslexia_score, latest.dysgraphia_score)

    insights = generate_insights(latest)
    recommendations = generate_recommendations(main_issue, risk_level)
    trend = calculate_trend(results)

    return {
        "summary": {
            "prediction": latest.level,
            "risk_level": risk_level,
            "main_issue": main_issue,
            "confidence": latest.confidence
        },

        "severity": {
            "dyslexia": latest.dyslexia_stage,
            "dysgraphia": latest.dysgraphia_stage
        },

        "scores": {
            "dyslexia_score": latest.dyslexia_score,
            "dysgraphia_score": latest.dysgraphia_score
        },

        "insights": insights,

        "trend": trend,

        "recommendations": recommendations
    }


# -------------------------
# 📜 DIAGNOSIS HISTORY
# -------------------------

@router.get("/history")
def diagnosis_history(db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .all()

    history = []

    for r in results:
        history.append({
            "prediction": r.level,
            "confidence": r.confidence,
            "dyslexia_stage": r.dyslexia_stage,
            "dysgraphia_stage": r.dysgraphia_stage,
            "date": r.created_at
        })

    return history

# -------------------------
# 📈 PROGRESS GRAPH API
# -------------------------

@router.get("/progress")
def get_progress(db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.asc())\
        .all()

    if not results:
        return {"message": "No data"}

    reading_trend = []
    writing_trend = []
    confidence_trend = []
    dates = []

    for r in results:
        reading_trend.append(r.dyslexia_score)
        writing_trend.append(r.dysgraphia_score)
        confidence_trend.append(r.confidence)
        dates.append(r.created_at)

    return {
        "reading_trend": reading_trend,
        "writing_trend": writing_trend,
        "confidence_trend": confidence_trend,
        "dates": dates
    }

# -------------------------
# 📊 IMPROVEMENT ANALYSIS
# -------------------------

@router.get("/improvement")
def get_improvement(db: Session = Depends(get_db), user_id=Depends(get_current_user)):

    results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.asc())\
        .all()

    if len(results) < 2:
        return {"message": "Not enough data"}

    first = results[0]
    last = results[-1]

    reading_change = last.dyslexia_score - first.dyslexia_score
    writing_change = last.dysgraphia_score - first.dysgraphia_score

    # 🔥 SMART LOGIC
    if reading_change < 0 and writing_change < 0:
        status = "improving"
    elif reading_change > 0 and writing_change > 0:
        status = "worsening"
    else:
        status = "mixed"

    return {
        "reading_change": round(reading_change, 2),
        "writing_change": round(writing_change, 2),
        "status": status
    }

@router.get("/progress-graph")
def get_progress_graph(db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):

    # get all progress entries (ordered)
    records = db.query(models.Progress)\
        .filter(models.Progress.user_id == user_id)\
        .order_by(models.Progress.created_at.asc())\
        .all()

    # 🔥 fetch task difficulties
    task_ids = [r.task_id for r in records if r.task_id is not None]

    task_map = {}
    if task_ids:
        tasks = db.query(models.TrainingTask).filter(models.TrainingTask.id.in_(task_ids)).all()
        for t in tasks:
            task_map[t.id] = t.difficulty

    reading_trend = []
    writing_trend = []
    rhythm_trend = []
    dates = []
    overall_trend = []

    from collections import defaultdict

    daily = defaultdict(lambda: {"reading": 0, "writing": 0, "rhythm": 0})
    daily_counts = defaultdict(int)

    for r in records:
        day = r.created_at.date().isoformat()
        daily_counts[day] += 1

        difficulty = task_map.get(r.task_id, "medium")

        # 🎯 difficulty weights
        if difficulty == "easy":
            weight = 1.0
        elif difficulty == "medium":
            weight = 1.2
        else:
            weight = 1.5

        daily[day]["reading"] += (r.reading_score or 0) * weight
        daily[day]["writing"] += (r.writing_score or 0) * weight
        daily[day]["rhythm"] += (r.rhythm_score or 0) * weight

    # sort by date
    sorted_days = sorted(daily.keys())

    reading_total = 0
    writing_total = 0
    rhythm_total = 0
    overall_total = 0

    # dynamic max score based on actual data
    total_possible = 0

    for day in sorted_days:
        day_reading = daily[day]["reading"]
        day_writing = daily[day]["writing"]
        day_rhythm = daily[day]["rhythm"]

        # already weighted via task difficulty
        weighted_day_score = day_reading + day_writing + day_rhythm

        # dynamic tasks count per day
        total_possible += daily_counts[day]

        # accumulate raw components
        reading_total += day_reading
        writing_total += day_writing
        rhythm_total += day_rhythm 

        # accumulate weighted overall
        overall_total += weighted_day_score

        # adaptive normalization
        norm_factor = total_possible if total_possible > 0 else 1

        reading_trend.append(round((reading_total / norm_factor) * 100, 2))
        writing_trend.append(round((writing_total / norm_factor) * 100, 2))
        rhythm_trend.append(round((rhythm_total / norm_factor) * 100, 2))

        # normalize overall with same factor but include weights scaling
        overall_trend.append(round((overall_total / (norm_factor * 1.1)) * 100, 2))

        dates.append(day)

    return {
        "reading_trend": reading_trend,
        "writing_trend": writing_trend,
        "rhythm_trend": rhythm_trend, 
        "overall_trend": overall_trend,
        "dates": dates
    }