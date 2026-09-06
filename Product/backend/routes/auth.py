from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from utils.auth import hash_password
from utils.auth import verify_password
from google.oauth2 import id_token
from google.auth.transport import requests
from utils.jwt import create_token, decode_token
from utils.rate_limiter import rate_limit
from dependencies.auth import get_current_user
from schemas import SignupRequest, LoginRequest, UpdateProfileRequest
import os
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter()

@router.get("/profile")
def get_profile(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    settings = db.query(models.UserSetting).filter(models.UserSetting.user_id == user_id).first()
    
    if not settings:
        settings = models.UserSetting(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return {
        "success": True,
        "data": {
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "gender": user.gender,
            "role": user.role,
            "share_key": user.share_key,
            "mobile_number": user.mobile_number,
            "country_code": user.country_code,
            "joined_at": user.created_at.isoformat(),
            "settings": {
                "push_notifications": settings.push_notifications,
                "daily_reminders": settings.daily_reminders,
                "weekly_reports": settings.weekly_reports
            }
        }
    }

@router.post("/profile")
def update_profile(data: UpdateProfileRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    settings = db.query(models.UserSetting).filter(models.UserSetting.user_id == user_id).first()
    if not settings:
        settings = models.UserSetting(user_id=user_id)
        db.add(settings)

    # Only touch fields the client actually sent (preserves partial-update semantics).
    fields = data.model_dump(exclude_unset=True)

    for attr in ("name", "age", "gender", "role", "mobile_number", "country_code"):
        if attr in fields:
            setattr(user, attr, fields[attr])

    if fields.get("password"):
        from utils.auth import hash_password
        user.password = hash_password(fields["password"])

    if data.settings is not None:
        s = data.settings.model_dump(exclude_unset=True)
        for attr in ("push_notifications", "daily_reminders", "weekly_reports"):
            if attr in s:
                setattr(settings, attr, s[attr])

    db.commit()
    return {"success": True, "message": "Profile updated"}

@router.post("/reset-progress")
def reset_progress(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # 1. 🔍 Fetch Assessment IDs for this user
        assessment_ids = [a.id for a in db.query(models.Assessment).filter(models.Assessment.user_id == user_id).all()]
        
        # 2. 🔍 Fetch Training Plan IDs for this user
        plan_ids = [p.id for p in db.query(models.TrainingPlan).filter(models.TrainingPlan.user_id == user_id).all()]
        
        # 3. 🧨 Wipe Dependent Records First (Foreign Key Constraints)
        if assessment_ids:
            db.query(models.Result).filter(models.Result.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
            db.query(models.FeatureAttribution).filter(models.FeatureAttribution.user_id == user_id).delete(synchronize_session=False)

        if plan_ids:
            db.query(models.TrainingTask).filter(models.TrainingTask.plan_id.in_(plan_ids)).delete(synchronize_session=False)

        # 4. 🧨 Wipe Parent Records
        db.query(models.Assessment).filter(models.Assessment.user_id == user_id).delete(synchronize_session=False)
        db.query(models.TrainingPlan).filter(models.TrainingPlan.user_id == user_id).delete(synchronize_session=False)
        db.query(models.Progress).filter(models.Progress.user_id == user_id).delete(synchronize_session=False)
        
        # 5. 🧨 Wipe Other Metrics & History
        db.query(models.AssessmentSession).filter(models.AssessmentSession.user_id == user_id).delete(synchronize_session=False)
        db.query(models.EyeTracking).filter(models.EyeTracking.user_id == user_id).delete(synchronize_session=False)
        db.query(models.WritingTest).filter(models.WritingTest.user_id == user_id).delete(synchronize_session=False)
        db.query(models.UserWeaknessProfile).filter(models.UserWeaknessProfile.user_id == user_id).delete(synchronize_session=False)
        db.query(models.IssueHistory).filter(models.IssueHistory.user_id == user_id).delete(synchronize_session=False)
        db.query(models.AdvancedEyeMetrics).filter(models.AdvancedEyeMetrics.user_id == user_id).delete(synchronize_session=False)
        db.query(models.Course).filter(models.Course.user_id == user_id).delete(synchronize_session=False)
        
        db.commit()
        return {"success": True, "message": "All student data cleared successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"🔥 Reset Error: {str(e)}")  # logged server-side, not exposed to client
        raise HTTPException(status_code=500, detail="Failed to reset data")

@router.post("/signup")
def signup(data: SignupRequest, request: Request, db: Session = Depends(get_db)):
    import secrets, string
    email = data.email
    password = data.password
    name = data.name
    age = data.age
    gender = data.gender
    role = data.role

    client_ip = request.client.host
    rate_limit(f"signup:{client_ip}", limit=5, window=60)

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Generate unique share key
    share_key = None
    for _ in range(10):
        candidate = "MNT-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if not db.query(models.User).filter(models.User.share_key == candidate).first():
            share_key = candidate
            break

    user = models.User(
        email=email,
        password=hash_password(password),
        name=name,
        age=age,
        gender=gender,
        role=role,
        share_key=share_key
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User created",
        "user_id": user.id,
        "access_token": create_token({"user_id": user.id}),
        "name": user.name,
        "role": user.role,
        "share_key": user.share_key
    }

@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = data.email
    password = data.password

    client_ip = request.client.host
    rate_limit(f"login:{client_ip}:{email}", limit=5, window=60)

    user = db.query(models.User).filter(models.User.email == email).first()

    # `user.password` is null for Google-only accounts → guard before verifying.
    if not user or not user.password or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"user_id": user.id})

    return {
        "access_token": token,
        "user_id": user.id,
        "name": user.name,
        "role": user.role
    }


@router.post("/refresh")
def refresh_token(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header.split(" ")[1]

    try:
        # We decode ignoring 'exp' but still verifying 'SECRET_KEY' and 'ALGORITHM'
        payload = decode_token(token, ignore_expired=True)
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        # 🛡️ SECURITY GRACE PERIOD: Only allow refresh if 'iat' is within last 7 days
        iat = payload.get("iat")
        from datetime import datetime, timedelta
        if iat and datetime.utcnow().timestamp() > iat + (7 * 24 * 3600):
             raise HTTPException(status_code=401, detail="Token too old to refresh. Please log in again.")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Generate a fresh 24h token
        new_token = create_token({"user_id": user.id})

        return {
            "access_token": new_token,
            "user_id": user.id,
            "name": user.name,
            "role": user.role
        }

    except HTTPException:
        # Already a clean, intentional error (bad payload / too old / not found) — pass through.
        raise
    except Exception as e:
        print(f"❌ Refresh Error: {str(e)}")  # logged server-side, not exposed to client
        raise HTTPException(status_code=401, detail="Refresh failed")


@router.post("/google")
def google_auth(data: dict, db: Session = Depends(get_db)):
    token = data.get("token")

    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)

        email = idinfo["email"]
        name = idinfo.get("name")

        user = db.query(models.User).filter(models.User.email == email).first()

        if not user:
            user = models.User(
                email=email,
                name=name,
                google_id=idinfo["sub"],
                age=data.get("age"),
                gender=data.get("gender"),
                role=data.get("role")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_token({"user_id": user.id})

        return {
            "access_token": token,
            "user_id": user.id,
            "name": user.name,
            "role": user.role
        }

    except Exception as e:
        print(f"❌ Google Auth Error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")