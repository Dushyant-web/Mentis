from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from utils.rate_limiter import rate_limit
from datetime import datetime
import json

router = APIRouter()


# -------------------------
# 📄 PDF REPORT DATA — structured report for frontend rendering
# -------------------------

@router.get("/diagnostic/{session_id}")
def get_diagnostic_report(session_id: str, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Generate structured diagnostic report data for a given assessment session"""
    rate_limit(f"report:{user_id}", limit=10, window=60)

    # Get user info
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    # Get assessment result — Result model connects through Assessment
    result = db.query(models.Result)\
        .filter(models.Result.session_id == int(session_id))\
        .first()

    if not result:
        # Try by assessment_id
        result = db.query(models.Result)\
            .join(models.Assessment, models.Result.assessment_id == models.Assessment.id)\
            .filter(models.Assessment.user_id == user_id)\
            .order_by(models.Result.created_at.desc())\
            .first()

    if not result:
        return {"error": "Assessment not found"}

    # Get SHAP attributions
    attributions = db.query(models.FeatureAttribution)\
        .filter(models.FeatureAttribution.session_id == result.session_id)\
        .order_by(models.FeatureAttribution.impact.desc())\
        .limit(10)\
        .all()

    # Get error patterns
    errors = db.query(models.AssessmentError)\
        .filter(models.AssessmentError.user_id == user_id)\
        .order_by(models.AssessmentError.created_at.desc())\
        .limit(50)\
        .all()

    # Compile error analysis
    reversals = set()
    omissions = set()
    problem_words = []
    for err in errors:
        err_type = getattr(err, "confusion_type", None) or getattr(err, "error_type", None)
        if err_type == "reversal":
            pairs = getattr(err, "confused_pairs", None) or []
            if isinstance(pairs, list):
                for p in pairs:
                    reversals.add(p if isinstance(p, str) else str(p))
        if err_type == "omission":
            omissions.add(err.target_word or "")
        if err.target_word and err.actual_word and err.target_word != err.actual_word:
            problem_words.append(err.target_word)

    # Probabilities
    probs = {
        "dyslexia": result.prob_dyslexia or 0.0,
        "dysgraphia": result.prob_dysgraphia or 0.0,
        "both": result.prob_both or 0.0,
        "normal": result.prob_normal or 0.0,
    }

    # Level mapping
    level_map = {"stage_1": "Mild", "stage_2": "Moderate", "stage_3": "Severe"}
    stage = level_map.get(result.level or "", "Normal")

    # Build recommendations
    recommendations = []
    if (result.prob_dyslexia or 0) > 0.4:
        recommendations.extend([
            "Reading flow training with guided highlighting to reduce regression",
            "Phoneme awareness drills focusing on vowel sounds",
            "Speed reading exercises with comprehension checks"
        ])
    if (result.prob_dysgraphia or 0) > 0.4:
        recommendations.extend([
            "Letter pattern writing practice with guide lines",
            "Fine motor coordination exercises",
            "Pressure control training for consistent handwriting"
        ])
    if reversals:
        recommendations.append(f"Mirror letter discrimination for: {', '.join(list(reversals)[:5])}")
    if problem_words:
        recommendations.append(f"Problem word mastery training for: {', '.join(problem_words[:5])}")
    if not recommendations:
        recommendations.append("Continue regular monitoring assessments every 2-4 weeks")

    return {
        "report": {
            "generated_at": datetime.utcnow().isoformat(),
            "child_name": user.name or user.email,
            "child_age": getattr(user, "age", None),
            "assessment_date": result.created_at.isoformat() if result.created_at else None,
            "session_id": session_id,
            
            "diagnosis": {
                "prediction": result.level,  # Result uses 'level' not 'prediction'
                "stage": stage,
                "level": result.level,
                "confidence": round(result.confidence * 100, 1) if result.confidence else 0,
            },
            
            "probabilities": probs,
            "risk_scores": {
                "dyslexia_risk": round((result.prob_dyslexia or 0) * 100, 1),
                "dysgraphia_risk": round((result.prob_dysgraphia or 0) * 100, 1),
            },
            
            "feature_analysis": [
                {
                    "feature": attr.feature_name,
                    "impact": round(abs(attr.impact), 4),
                    "direction": getattr(attr, "direction", "positive"),
                    "description": _feature_description(attr.feature_name)
                } for attr in attributions
            ],
            
            "error_patterns": {
                "reversals": list(reversals)[:10],
                "omissions": list(omissions)[:10],
                "problem_words": problem_words[:10],
                "total_errors": len(errors),
            },
            
            "recommendations": recommendations,
        }
    }


def _feature_description(name: str) -> str:
    """Human-readable descriptions for ML features — written for parents/teachers, not doctors"""
    descriptions = {
        # Eye tracking features
        "saccade_mean_velocity": "Eye movement speed while reading",
        "saccade_velocity_std": "Steadiness of eye movement speed",
        "regression_rate": "How often eyes jump backwards to re-read",
        "avg_fixation_duration": "How long eyes pause on each word",
        "fixation_count": "Number of times eyes stopped while reading",
        "fixation_duration_cv": "How steady the reading pace is",
        "direction_variance": "How much eyes wander while reading",
        "heatmap_spread": "How spread out the reading gaze pattern is",
        "saccade_count": "Number of quick eye jumps between words",
        "pupil_dilation_mean": "Average pupil size during reading",
        "blink_rate": "How often the user blinks while reading",

        # Writing/pen features
        "letter_reversal_rate": "How often letters like b/d or p/q get confused",
        "writing_speed_wpm": "Writing speed (words per minute)",
        "avg_pressure": "How hard the pen is pressed while writing",
        "pressure_variance": "How much pen pressure changes",
        "stroke_smoothness": "How smooth the pen strokes are",
        "stroke_fragmentation": "How often pen lifts mid-letter",
        "letter_size_variance": "How consistent letter sizes are",
        "baseline_deviation": "How straight the writing line stays",
        "pause_rate": "How often writing pauses happen",
        "pause_density": "Length and frequency of writing pauses",
        "word_spacing_variance": "Consistency of spaces between words",
        "rhythm_consistency": "How regular the writing rhythm is",
    }
    # Fallback: clean up the feature name
    if name in descriptions:
        return descriptions[name]
    clean = name.replace("_", " ").replace("cv", "consistency").replace("std", "variation")
    return clean.capitalize()


# -------------------------
# 📊 PROGRESS HISTORY — longitudinal tracking
# -------------------------

@router.get("/progress-history")
def get_progress_history(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Returns assessment scores over time for progress visualization"""
    rate_limit(f"progress:{user_id}", limit=10, window=60)

    # Result → Assessment → user_id (Result doesn't have user_id directly)
    results = db.query(models.Result)\
        .join(models.Assessment, models.Result.assessment_id == models.Assessment.id)\
        .filter(models.Assessment.user_id == user_id)\
        .order_by(models.Result.created_at.asc())\
        .all()

    history = []
    for i, r in enumerate(results):
        history.append({
            "session_number": i + 1,
            "date": r.created_at.isoformat() if r.created_at else None,
            "session_id": r.session_id,
            "prediction": r.level,  # Result uses 'level' field
            "confidence": round(r.confidence * 100, 1) if r.confidence else 0,
            "dyslexia_score": round((r.prob_dyslexia or 0) * 100, 1),
            "dysgraphia_score": round((r.prob_dysgraphia or 0) * 100, 1),
            "normal_score": round((r.prob_normal or 0) * 100, 1),
            "level": r.level,
            "stage": {"stage_1": "Mild", "stage_2": "Moderate", "stage_3": "Severe"}.get(r.level or "", "Normal"),
        })

    # Calculate improvement
    improvement = None
    if len(history) >= 2:
        first = history[0]
        latest = history[-1]
        improvement = {
            "dyslexia_change": round(latest["dyslexia_score"] - first["dyslexia_score"], 1),
            "dysgraphia_change": round(latest["dysgraphia_score"] - first["dysgraphia_score"], 1),
            "sessions_completed": len(history),
            "trending": "improving" if latest["dyslexia_score"] < first["dyslexia_score"] else "stable" if latest["dyslexia_score"] == first["dyslexia_score"] else "needs_attention"
        }

    # Training stats
    training_tasks_done = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingPlan.user_id == user_id,
            models.TrainingTask.status == "done"
        ).count()

    total_xp = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(
            models.TrainingPlan.user_id == user_id,
            models.TrainingTask.status == "done"
        ).with_entities(models.TrainingTask.xp).all()

    return {
        "history": history,
        "total_assessments": len(history),
        "improvement": improvement,
        "training_stats": {
            "exercises_completed": training_tasks_done,
            "total_xp_earned": sum(x[0] for x in total_xp if x[0]) if total_xp else 0,
        }
    }


# -------------------------
# 🏥 FULL LONGITUDINAL REPORT (Medical Export)
# -------------------------

from typing import Optional
from fastapi import HTTPException

@router.get("/full")
def get_full_user_report(student_id: Optional[int] = None, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Returns a chronological timeline of assessments and training periods for a full medical export"""
    
    # 1. Get requestor profile
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
        
    target_user_id = user_id
    target_user = user
    
    # If looking up a student, verify authorization
    if student_id:
        if getattr(user, "role", "student") == "student":
            raise HTTPException(status_code=403, detail="Students cannot access other reports")
        
        target = db.query(models.User).filter(models.User.id == student_id, models.User.parent_id == user_id).first()
        if not target:
            raise HTTPException(status_code=403, detail="Not authorized to view this student")
            
        target_user_id = student_id
        target_user = target
        
    user_info = {
        "name": target_user.name or "User",
        "email": target_user.email,
        "age": getattr(target_user, "age", "N/A"),
        "role": target_user.role or "patient",
        "joined_at": target_user.created_at.isoformat() if target_user.created_at else None
    }

    # 2. Get All Assessments
    results = db.query(models.Result)\
        .join(models.Assessment, models.Result.assessment_id == models.Assessment.id)\
        .filter(models.Assessment.user_id == target_user_id)\
        .order_by(models.Result.created_at.asc())\
        .all()
        
    # 3. Get All Completed Training (Progress log)
    progress_logs = db.query(models.Progress)\
        .filter(models.Progress.user_id == target_user_id)\
        .order_by(models.Progress.created_at.asc())\
        .all()

    # Interleave them chronologically
    timeline = []
    
    for i, res in enumerate(results):
        # Assessment Node
        timeline.append({
            "type": "assessment",
            "date": res.created_at.isoformat() if res.created_at else None,
            "session_id": res.session_id,
            "level": res.level,
            "confidence": round(res.confidence * 100, 1) if res.confidence else 0,
            "scores": {
                "reading": round((res.prob_dyslexia or 0) * 100, 1),
                "writing": round((res.prob_dysgraphia or 0) * 100, 1),
                "normal": round((res.prob_normal or 0) * 100, 1)
            }
        })
        
        # Training Period Node (training after this assessment, before the next)
        start_date = res.created_at
        end_date = results[i+1].created_at if i + 1 < len(results) else datetime.utcnow()
        
        period_progress = [p for p in progress_logs if start_date <= p.created_at < end_date]
        
        if period_progress:
            total_xp = sum(p.xp or 0 for p in period_progress)
            timeline.append({
                "type": "training_period",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "exercises_completed": len(period_progress),
                "xp_earned": total_xp
            })

    return {
        "user_info": user_info,
        "timeline": timeline,
        "total_assessments": len(results),
        "total_training_sessions": len(progress_logs),
        "generated_at": datetime.utcnow().isoformat()
    }
