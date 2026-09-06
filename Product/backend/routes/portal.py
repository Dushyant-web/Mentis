from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from utils.rate_limiter import rate_limit
from datetime import datetime

router = APIRouter() 

 
def _get_user_results(db, target_user_id):
    """Helper: Get Results for a user via Assessment join"""
    return db.query(models.Result)\
        .join(models.Assessment, models.Result.assessment_id == models.Assessment.id)\
        .filter(models.Assessment.user_id == target_user_id)\
        .order_by(models.Result.created_at.desc())\
        .all()


def _result_to_dict(r):
    """Convert Result model to API dict"""
    return {
        "date": r.created_at.isoformat() if r.created_at else None,
        "prediction": r.level,
        "level": r.level,
        "confidence": round(r.confidence * 100, 1) if r.confidence else 0,
        "dyslexia_risk": round((r.prob_dyslexia or 0) * 100, 1),
        "dysgraphia_risk": round((r.prob_dysgraphia or 0) * 100, 1),
    }


# -------------------------
# 👨‍👩‍👧 PARENT/TEACHER PORTAL
# -------------------------

@router.get("/students")
def get_linked_students(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Get students linked to this parent/teacher account"""
    rate_limit(f"portal:{user_id}", limit=20, window=60)

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    role = getattr(user, "role", None) or "student"

    # If user is a student, return their own data
    if role == "student":
        results = _get_user_results(db, user_id)

        training_done = db.query(models.TrainingTask)\
            .join(models.TrainingPlan)\
            .filter(
                models.TrainingPlan.user_id == user_id,
                models.TrainingTask.status == "done"
            ).count()

        latest = results[0] if results else None

        return {
            "role": "student",
            "students": [{
                "id": user.id,
                "name": user.name or user.email,
                "email": user.email,
                "total_assessments": len(results),
                "training_completed": training_done,
                "latest_assessment": _result_to_dict(latest) if latest else None
            }]
        }

    # If parent/teacher, get linked students
    linked = db.query(models.User).filter(
        models.User.parent_id == user_id
    ).all()

    students = []
    for student in linked:
        results = _get_user_results(db, student.id)
        latest = results[0] if results else None

        training_done = db.query(models.TrainingTask)\
            .join(models.TrainingPlan)\
            .filter(
                models.TrainingPlan.user_id == student.id,
                models.TrainingTask.status == "done"
            ).count()

        students.append({
            "id": student.id,
            "name": student.name or student.email,
            "email": student.email,
            "total_assessments": len(results),
            "training_completed": training_done,
            "latest_assessment": _result_to_dict(latest) if latest else None
        })

    return {
        "role": role,
        "students": students
    }


@router.get("/student/{student_id}/summary")
def get_student_summary(student_id: int, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Get detailed summary for a specific student"""
    rate_limit(f"portal:{user_id}", limit=20, window=60)

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get student results via join (Ordered DESC)
    results = _get_user_results(db, student_id)
    
    # Get all training progress logs for mapping
    from datetime import datetime
    progress_logs = db.query(models.Progress)\
        .filter(models.Progress.user_id == student_id)\
        .order_by(models.Progress.created_at.asc())\
        .all()

    assessment_list = []
    # results is ordered by created_at DESC (index 0 is latest)
    for i, res in enumerate(results[:10]):
        start_date = res.created_at
        # The 'next' assessment chronologically is at index i-1. 
        # If i==0, this is the latest, so end_date is now.
        end_date = results[i-1].created_at if i > 0 else datetime.utcnow()
        
        # Count training completed in this time window
        period_progress = [p for p in progress_logs if start_date <= p.created_at < end_date]
        exercises = len(period_progress)
        xp = sum(p.xp or 0 for p in period_progress)

        ad = _result_to_dict(res)
        ad["training_after"] = {
            "exercises": exercises,
            "xp": xp
        }
        assessment_list.append(ad)

    # Get training tasks overall stats
    training_tasks = db.query(models.TrainingTask)\
        .join(models.TrainingPlan)\
        .filter(models.TrainingPlan.user_id == student_id)\
        .all()

    done_tasks = [t for t in training_tasks if t.status == "done"]
    total_xp = sum(t.xp or 0 for t in done_tasks)

    # Get errors
    errors = db.query(models.AssessmentError)\
        .filter(models.AssessmentError.user_id == student_id)\
        .order_by(models.AssessmentError.created_at.desc())\
        .limit(20).all()

    error_summary = {}
    for err in errors:
        ct = getattr(err, "confusion_type", None) or getattr(err, "error_type", None) or "unknown"
        error_summary[ct] = error_summary.get(ct, 0) + 1

    return {
        "student_id": student_id,
        "assessments": assessment_list,
        "training": {
            "total_exercises": len(training_tasks),
            "completed": len(done_tasks),
            "completion_rate": round(len(done_tasks) / max(len(training_tasks), 1) * 100, 1),
            "total_xp": total_xp,
        },
        "error_patterns": error_summary,
    }
from pydantic import BaseModel

class LinkStudentRequest(BaseModel):
    share_key: str

@router.post("/link-student")
def link_student(req: LinkStudentRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    """Link a student to the current parent/teacher by their unique share key"""
    # 1. Fetch current user and verify they are not a student
    parent = db.query(models.User).filter(models.User.id == user_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="User not found")
        
    if getattr(parent, "role", "student") == "student":
        raise HTTPException(status_code=403, detail="Students cannot link other students")

    # 2. Find target student by share key
    key = req.share_key.strip().upper()
    student = db.query(models.User).filter(models.User.share_key == key).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid share key. Please check the code and try again.")
        
    # 3. Prevent self-linking
    if student.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot link your own account.")
        
    # 4. Verify target is a student
    if getattr(student, "role", "student") not in ("student", None, ""):
        raise HTTPException(status_code=400, detail="This share key does not belong to a patient account.")

    # 5. Check if already linked
    if student.parent_id == user_id:
        raise HTTPException(status_code=400, detail="This patient is already linked to your portal.")

    # 6. Link
    student.parent_id = user_id
    db.commit()
    
    return {"message": f"{student.name} has been added to your portal!", "student_id": student.id, "student_name": student.name}
    

@router.post("/unlink-student/{student_id}")
def unlink_student(student_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    """Remove a student from the current user's portal"""
    student = db.query(models.User).filter(models.User.id == student_id, models.User.parent_id == user_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Patient not found or not linked to your account.")

    # Unlink
    student.parent_id = None
    db.commit()
    
    return {"success": True, "message": f"{student.name} has been removed from your portal."}
