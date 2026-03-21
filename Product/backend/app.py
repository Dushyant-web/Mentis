from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from utils.feature_builder import build_features
from db.database import engine
from db import models
from routes import assessment, auth, training, dashboard
from ml.model_loader import get_model, get_scaler

import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

model = get_model()
scaler = get_scaler()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dyslexia Detection API")


# -------------------------
# ✅ STANDARD RESPONSE FORMAT
# -------------------------
def success_response(data=None, message="Success"):
    return {
        "success": True,
        "message": message,
        "data": data
    }

def error_response(message="Something went wrong", code=500):
    return JSONResponse(
        status_code=code,
        content={
            "success": False,
            "message": message,
            "data": None
        }
    )


# -------------------------
# ROUTES
# -------------------------
app.include_router(assessment.router, prefix="/assessment", tags=["Assessment"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(training.router, prefix="/training", tags=["Training"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/")
def home():
    return success_response({"status": "running"}, "API is live")


@app.post("/predict", tags=["Prediction"])
def predict(data: dict):
    try:
        features = build_features(data)

        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]

        return success_response({
            "prediction": prediction,
            "confidence": float(max(probabilities))
        })

    except Exception as e:
        return error_response(str(e), 500)


# -------------------------
# 🔥 GLOBAL ERROR HANDLER
# -------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("🔥 ERROR:", str(exc))  # log for debug

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "data": None
        }
    )