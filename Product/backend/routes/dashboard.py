from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from datetime import date
from utils.rate_limiter import rate_limit
import numpy as np


try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

router = APIRouter()

# -------------------------
# 🧠 LOAD MODEL FOR SHAP
# -------------------------


# ⚠️ SHAP explainer is NOT used here (we rely on stored DB attributions)
explainer = None


# -------------------------
# 🧠 HELPERS
# -------------------------

def generate_insights(result, db=None):
    """
    Production-grade explanation using stored SHAP (no recompute)
    """

    insights = []

    probs = {
        "dyslexia": result.prob_dyslexia or 0.0,
        "dysgraphia": result.prob_dysgraphia or 0.0,
        "both": result.prob_both or 0.0,
        "normal": result.prob_normal or 0.0
    }

    sorted_probs = sorted(probs.items(), key=lambda x: x[1] if x[1] is not None else 0, reverse=True)
    top_label, top_prob = sorted_probs[0]

    insights.append(f"Primary pattern: {top_label} ({int(top_prob*100)}%)")

    # 🔥 USE STORED SHAP FROM DB
    if db and result.session_id:
        attributions = db.query(models.FeatureAttribution)\
            .filter(models.FeatureAttribution.session_id == result.session_id)\
            .order_by(models.FeatureAttribution.impact.desc())\
            .limit(5)\
            .all()

        if attributions:
            for attr in attributions:
                direction = "increased" if getattr(attr, "direction", None) == "positive" else "reduced"
                insights.append(
                    f"{attr.feature_name} {direction} risk ({round(abs(attr.impact), 3)})"
                )
        else:
            insights.append("No feature attribution available")
    else:
        insights.append("SHAP explanation not available")
    return insights

def generate_recommendations(result):
    """
    ML + uncertainty driven recommendations
    """

    rec = []

    probs = {
        "dyslexia": result.prob_dyslexia or 0.0,
        "dysgraphia": result.prob_dysgraphia or 0.0,
        "both": result.prob_both or 0.0
    }

    sorted_probs = sorted(probs.items(), key=lambda x: x[1] if x[1] is not None else 0, reverse=True)
    top_label, top_prob = sorted_probs[0]
    second_prob = sorted_probs[1][1]

    margin = top_prob - second_prob

    # -------------------------
    # 🔥 UNCERTAINTY → ACTION
    # -------------------------
    if getattr(result, "uncertainty", 0) == 1:
        return ["Low confidence → repeat assessment with more data"]
    
    elif margin < 0.15:
        return ["Uncertain classification → collect multiple sessions before training"]
    
    elif margin < 0.25:
        return ["Moderate uncertainty → continue monitoring before adapting training"]
    # -------------------------
    # 🔥 NORMAL RECOMMENDATIONS
    # -------------------------
    if top_label == "dyslexia":
        rec.append("Focus on eye-tracking and guided reading exercises")

    elif top_label == "dysgraphia":
        rec.append("Focus on motor control and handwriting stability")

    elif top_label == "both":
        rec.append("Use multisensory (read + write) training")

    return rec


def calculate_trend(results):
    if len(results) < 2:
        return {
            "status": "no_data",
            "message": "Not enough data to determine trend"
        }

    # results are already DESC, so reverse for chronological
    ordered = list(reversed(results))

    first = ordered[0]
    last = ordered[-1]

    if first.dyslexia_score is None or last.dyslexia_score is None:
        return {
            "status": "no_data",
            "message": "Insufficient score data"
        }

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
    rate_limit(f"dashboard_summary:{user_id}", limit=10, window=60)

    # latest result
    latest = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .first()

    if not latest:
        return {"message": "No data available"}

    # 🔥 FETCH LATEST EYE + WRITING DATA
    latest_eye = db.query(models.EyeTracking)\
        .filter(models.EyeTracking.user_id == user_id)\
        .order_by(models.EyeTracking.created_at.desc())\
        .first()

    latest_writing = db.query(models.WritingTest)\
        .filter(models.WritingTest.user_id == user_id)\
        .order_by(models.WritingTest.created_at.desc())\
        .first()

    # 🔥 TRUE MODEL CONFIDENCE (no fake transformation)
    # 🔥 SAFE SCORE EXTRACTION
    dyslexia_score = latest.dyslexia_score if latest else None
    dysgraphia_score = latest.dysgraphia_score if latest else None
    writing_score = latest_writing.writing_score if latest_writing else None

    scores = [dyslexia_score, dysgraphia_score, writing_score]

    # remove None values
    valid_scores = [s for s in scores if s is not None]
    
    # safe calculation
    final_score = round(max(valid_scores), 2) if valid_scores else 0

    # history (for trend)
    results = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .all()

    # 🔥 LONGITUDINAL SMOOTHING (EMA over probabilities)
    alpha = 0.4

    smoothed = {
        "dyslexia": 0,
        "dysgraphia": 0,
        "both": 0,
        "normal": 0
    }

    for r in reversed(results):
        dyslexia_p = r.prob_dyslexia or 0.0
        dysgraphia_p = r.prob_dysgraphia or 0.0
        both_p = r.prob_both or 0.0
        normal_p = r.prob_normal or 0.0

        smoothed["dyslexia"] = alpha * dyslexia_p + (1 - alpha) * smoothed["dyslexia"]
        smoothed["dysgraphia"] = alpha * dysgraphia_p + (1 - alpha) * smoothed["dysgraphia"]
        smoothed["both"] = alpha * both_p + (1 - alpha) * smoothed["both"]
        smoothed["normal"] = alpha * normal_p + (1 - alpha) * smoothed["normal"]

    # derived logic
    # 🔥 DYNAMIC RISK (confidence + uncertainty)
    sorted_probs = sorted([
        latest.prob_dyslexia or 0.0,
        latest.prob_dysgraphia or 0.0,
        latest.prob_both or 0.0
    ], reverse=True)

    margin = sorted_probs[0] - sorted_probs[1]

    # 🔥 USE FULL DISTRIBUTION (not just max)
    probs = {
        "normal": latest.prob_normal or 0.0,
        "dyslexia": latest.prob_dyslexia or 0.0,
        "dysgraphia": latest.prob_dysgraphia or 0.0,
        "both": latest.prob_both or 0.0
    }
    # 🔥 NORMALIZED ENTROPY (0 → 1)
    num_classes = len(probs)
    entropy = -sum([
        p * np.log(p + 1e-9) for p in probs.values()
    ])

    max_entropy = np.log(num_classes)
    normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0

    uncertainty_score = round(normalized_entropy, 3)

    # confidence spread (inverse of uncertainty)
    confidence_spread = round(max(0, 1 - uncertainty_score), 2)

    # 🔥 PROBABILITY-DISTRIBUTION-BASED RISK
    if getattr(latest, "uncertainty", 0) == 1:
        risk_level = "uncertain"
    elif sorted_probs[0] > 0.75:
        risk_level = "high"
    elif sorted_probs[0] > 0.5:
        risk_level = "medium"
    else:
        risk_level = "low"

    # 🔥 ML-driven main issue
    # (probs dict already defined above)

    # 🔥 use smoothed probabilities instead of single snapshot
    filtered = {k: v for k, v in smoothed.items() if k != "normal"}
    main_issue = max(filtered, key=filtered.get)



    insights = generate_insights(latest, db)
    recommendations = generate_recommendations(latest)
    trend = calculate_trend(results)

    return {
        "summary": {
            "prediction": latest.level,
            "risk_level": risk_level,
            "main_issue": main_issue,
            "confidence": latest.confidence,
            "final_score": final_score,
            "confidence_spread": confidence_spread,
            "uncertainty_score": uncertainty_score,
            "probabilities": {
                "current": {
                    "normal": latest.prob_normal or 0.0,
                    "dyslexia": latest.prob_dyslexia or 0.0,
                    "dysgraphia": latest.prob_dysgraphia or 0.0,
                    "both": latest.prob_both or 0.0
                },
                "smoothed": smoothed
            },
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
    rate_limit(f"dashboard_history:{user_id}", limit=10, window=60)

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

@router.get("/progress-graph")
def get_progress(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"dashboard_progress:{user_id}", limit=10, window=60)

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
        dates.append(r.created_at.date().isoformat())

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
    rate_limit(f"dashboard_improvement:{user_id}", limit=10, window=60)

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

@router.get("/training-progress")
def get_training_progress(db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    rate_limit(f"dashboard_training:{user_id}", limit=10, window=60)

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

        # categorize tasks (future scalable)
        category = "reading"
        if r.task_id in task_map:
            task = next((t for t in tasks if t.id == r.task_id), None)
            if task:
                if task.task_type == "eye":
                    category = "reading"
                elif task.task_type == "pen":
                    category = "writing"
                else:
                    category = "rhythm"

        # 🎯 difficulty weights
        if difficulty == "easy":
            weight = 1.0
        elif difficulty == "medium":
            weight = 1.2
        else:
            weight = 1.5

        # XP-based scoring instead of old score system
        xp = r.xp or 0

        # distribute XP across categories (category tracking)
        if category == "reading":
            daily[day]["reading"] += xp * weight
        elif category == "writing":
            daily[day]["writing"] += xp * weight
        else:
            daily[day]["rhythm"] += xp * weight

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

        # better normalization (max possible weighted score)
        max_possible_per_task = 60  # closer to real XP
        max_total = norm_factor * max_possible_per_task

        if max_total > 0:
            overall_score = (overall_total / max_total) * 100
        else:
            overall_score = 0

        overall_trend.append(round(min(overall_score, 100), 2))

        dates.append(day)


    # 🔥 calculate streak correctly
    unique_days = sorted(set([r.created_at.date() for r in records]))
    streak = 0
    today = date.today()

    for i in range(len(unique_days)-1, -1, -1):
        if (today - unique_days[i]).days == streak:
            streak += 1
        else:
            break

    return {
        "reading_trend": reading_trend,
        "writing_trend": writing_trend,
        "rhythm_trend": rhythm_trend, 
        "overall_trend": overall_trend,
        "dates": dates,
        "streak": streak
    }


# -------------------------
# 🧠 DIAGNOSIS API
# -------------------------

@router.get("/diagnosis")
def get_diagnosis(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"dashboard_diagnosis:{user_id}", limit=10, window=60)

    latest = db.query(models.Result)\
        .join(models.Assessment)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Assessment.created_at.desc())\
        .first()

    if not latest:
        return {"message": "No diagnosis available"}

    # 🔥 Fetch latest eye + writing
    latest_eye = db.query(models.EyeTracking)\
        .filter(models.EyeTracking.user_id == user_id)\
        .order_by(models.EyeTracking.created_at.desc())\
        .first()

    latest_writing = db.query(models.WritingTest)\
        .filter(models.WritingTest.user_id == user_id)\
        .order_by(models.WritingTest.created_at.desc())\
        .first()

    probs = {
        "normal": latest.prob_normal,
        "dyslexia": latest.prob_dyslexia,
        "dysgraphia": latest.prob_dysgraphia,
        "both": latest.prob_both
    }

    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)

    top_label, top_prob = sorted_probs[0]
    second_label, second_prob = sorted_probs[1]

    # 🔥 calibrated uncertainty
    margin = top_prob - second_prob
    uncertainty = round(min(1, 1 - (margin ** 0.7)), 2)

    issues = []
    strengths = []
    focus = []

    # 🔥 calibrated confidence
    calibrated = round(min(1, top_prob ** 0.85), 2)

    if top_label == "dyslexia":
        issues.append(f"Reading-related difficulty detected ({int(calibrated*100)}%)")
        focus.append("Eye tracking + decoding training")

    elif top_label == "dysgraphia":
        issues.append(f"Motor/writing difficulty detected ({int(calibrated*100)}%)")
        focus.append("Handwriting + motor coordination")

    elif top_label == "both":
        issues.append(f"Combined difficulty detected ({int(calibrated*100)}%)")
        focus.append("Integrated multisensory training")

    else:
        strengths.append("Cognitive performance within normal range")

    # 🔥 uncertainty logic
    if margin < 0.1:
        issues.append("Very high uncertainty — collect more data")
    elif margin < 0.2:
        focus.append("Re-evaluate after multiple sessions")

    # 🔥 FEATURE BRIDGE
    if top_label == "dyslexia":
        focus.append("Prioritize reading system improvement")

    elif top_label == "dysgraphia":
        focus.append("Prioritize writing/motor system improvement")

    elif top_label == "both":
        focus.append("Train reading and writing together")

    if uncertainty > 0.6:
        action = "repeat_assessment"
    elif uncertainty > 0.4:
        action = "collect_more_data"
    else:
        action = "confident"

    return {
        "prediction": top_label,
        "confidence": round(top_prob, 2),
        "uncertainty": uncertainty,
        "action": action,

        "diagnosis": {
            "issues": list(set(issues)),
            "strengths": list(set(strengths)),
            "focus_areas": list(set(focus))
        },

        "issue_breakdown": {
            "reading": {
                "severity": latest.dyslexia_stage,
                "score": latest.dyslexia_score,
                "confidence": round(latest.prob_dyslexia, 2)
            },
            "writing": {
                "severity": latest.dysgraphia_stage,
                "score": latest.dysgraphia_score,
                "confidence": round(latest.prob_dysgraphia, 2)
            }
        },

        "scores": {
            "dyslexia_score": latest.dyslexia_score,
            "dysgraphia_score": latest.dysgraphia_score
        }
    }

# -------------------------
# 👁️ EYE TRACKING API
# -------------------------

@router.post("/eye-data")
def save_eye_data(data: dict, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"eye_data:{user_id}", limit=20, window=60)

    """
    Advanced Eye Tracking Intelligence API

    Expected input:
    {
        "fixation_time": 120,
        "saccades": 30,
        "regressions": 12,
        "reading_speed": 200
    }
    """

    fixation = data.get("fixation_time", 0)
    saccades = data.get("saccades", 0)
    regressions = data.get("regressions", 0)
    reading_speed = data.get("reading_speed", 0)

    # -------------------------
    # 🧠 FEATURE SCORING
    # -------------------------
    fixation_score = 2 if fixation > 100 else 1
    regression_score = 3 if regressions > 10 else 1
    speed_score = 1 if reading_speed < 150 else 2

    eye_score = fixation_score + regression_score + speed_score

    # -------------------------
    # 📊 CLASSIFICATION
    # -------------------------
    if eye_score >= 6:
        severity = "high"
    elif eye_score >= 4:
        severity = "medium"
    else:
        severity = "low"

    # -------------------------
    # 🔍 INSIGHTS ENGINE
    # -------------------------
    insights = []

    if regressions > 10:
        insights.append("High regression (re-reading) detected")

    if fixation > 120:
        insights.append("Long fixation indicates decoding difficulty")

    if reading_speed < 120:
        insights.append("Slow reading speed detected")

    if not insights:
        insights.append("Normal eye movement pattern")

    # -------------------------
    # 💾 SAVE TO DATABASE
    # -------------------------
    eye_record = models.EyeTracking(
        user_id=user_id,
        fixation=fixation,
        regressions=regressions,
        reading_speed=reading_speed,
        eye_score=eye_score,
        severity=severity
    )

    db.add(eye_record)
    db.commit()
    db.refresh(eye_record)

    # -------------------------
    # 🧠 UPDATE LEARNING MEMORY (READING)
    # -------------------------
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

    lr = 0.1
    performance = min(max(eye_score / 6.0, 0), 1)

    profile.reading_score = (1 - lr) * (profile.reading_score or 0) + lr * performance
    db.commit()

    return {
        "eye_score": eye_score,
        "severity": severity,
        "fixation": fixation,
        "regressions": regressions,
        "reading_speed": reading_speed,
        "insights": insights
    }


# -------------------------
# ✍️ WRITING TEST API
# -------------------------

@router.post("/writing-test")
def writing_test(data: dict, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    rate_limit(f"writing_test:{user_id}", limit=20, window=60)

    """
    Advanced Writing Intelligence API

    Expected input:
    {
        "task_type": "copy" | "dictation" | "memory",
        "content": "expected text",
        "user_input": "user written text",
        "time_taken": 30
    }
    """

    import difflib

    content = data.get("content", "").lower().strip()
    user_input = data.get("user_input", "").lower().strip()
    time_taken = data.get("time_taken", 1)

    # -------------------------
    # 🔤 CHARACTER ACCURACY
    # -------------------------
    matcher = difflib.SequenceMatcher(None, content, user_input)
    accuracy = matcher.ratio()

    # -------------------------
    # ⚡ SPEED ANALYSIS
    # -------------------------
    words = len(user_input.split())
    speed_wpm = (words / time_taken) * 60 if time_taken > 0 else 0

    # normalize speed (ideal ~20-40 wpm for training)
    if speed_wpm < 10:
        speed_score = 1
    elif speed_wpm < 25:
        speed_score = 2
    else:
        speed_score = 3

    # -------------------------
    # 🔁 ERROR ANALYSIS
    # -------------------------
    # -------------------------
    # 🧠 ADVANCED ERROR EXTRACTION (UPGRADED)
    # -------------------------
    errors = []
    confusion_pairs = [("b", "d"), ("p", "q"), ("m", "n"), ("w", "v")]

    max_len = max(len(content), len(user_input))

    for i in range(max_len):
        expected = content[i] if i < len(content) else None
        got = user_input[i] if i < len(user_input) else None

        if expected != got:
            errors.append({
                "position": i,
                "expected": expected,
                "got": got
            })

    confusion_errors = 0
    for e in errors:
        for a, b in confusion_pairs:
            if (e["expected"] == a and e["got"] == b) or (e["expected"] == b and e["got"] == a):
                confusion_errors += 1

    # -------------------------
    # 🧠 FINAL SCORING
    # -------------------------
    writing_score = (accuracy * 5) + speed_score - (confusion_errors * 0.2)

    # clamp
    writing_score = max(0, min(writing_score, 5))

    # -------------------------
    # 🧩 STAGE CLASSIFICATION
    # -------------------------
    if writing_score < 2:
        stage = "stage_3"
    elif writing_score < 3.5:
        stage = "stage_2"
    else:
        stage = "stage_1"

    # -------------------------
    # 📊 FEEDBACK ENGINE
    # -------------------------
    feedback = []

    if accuracy < 0.6:
        feedback.append("Low accuracy - focus on basic letter formation")
    if confusion_errors > 2:
        feedback.append("Letter confusion detected (b/d, p/q)")
    if speed_wpm < 10:
        feedback.append("Very slow writing speed")

    if not feedback:
        feedback.append("Good writing performance")

    # -------------------------
    # 💾 SAVE TO DATABASE
    # -------------------------
    writing_record = models.WritingTest(
        user_id=user_id,
        content=content,
        user_input=user_input,
        errors=errors,
        accuracy=accuracy,
        speed_wpm=speed_wpm,
        writing_score=writing_score,
        stage=stage
    )

    db.add(writing_record)
    db.commit()
    db.refresh(writing_record)

    # -------------------------
    # 🧠 UPDATE LEARNING MEMORY (WRITING)
    # -------------------------
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

    lr = 0.1
    performance = min(max(writing_score / 5.0, 0), 1)

    profile.writing_score = (1 - lr) * (profile.writing_score or 0) + lr * performance
    db.commit()

    return {
        "accuracy": round(accuracy, 2),
        "speed_wpm": round(speed_wpm, 2),
        "confusion_errors": confusion_errors,
        "writing_score": round(writing_score, 2),
        "stage": stage,
        "feedback": feedback,
        "errors": errors[:10]  # limit
    }