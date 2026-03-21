from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from utils.auth import hash_password
from utils.auth import verify_password
from google.oauth2 import id_token
from google.auth.transport import requests
from utils.jwt import create_token
from utils.rate_limiter import rate_limit
import os
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter()

@router.post("/signup")
def signup(data: dict, request: Request, db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    client_ip = request.client.host
    rate_limit(f"signup:{client_ip}", limit=5, window=60)

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = models.User(
        email=email,
        password=hash_password(password),
        name=name
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User created", "user_id": user.id}

@router.post("/login")
def login(data: dict, request: Request, db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    client_ip = request.client.host
    rate_limit(f"login:{client_ip}:{email}", limit=5, window=60)

    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"user_id": user.id})

    return {
        "access_token": token,
        "user_id": user.id
    }


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
                google_id=idinfo["sub"]
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_token({"user_id": user.id})

        return {
            "access_token": token,
            "user_id": user.id
        }

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")