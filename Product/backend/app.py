import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

sys.path.append(BASE_DIR)
sys.path.append(ROOT_DIR)

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from utils.feature_builder import build_features
from db.database import engine
from db import models
from routes import assessment, auth, training, dashboard, reports, analytics, portal
from ml.model_loader import get_model, get_scaler


model = get_model()
scaler = get_scaler()

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load EasyOCR in a background thread so the first real OCR request
    doesn't pay the multi-second model-load cost. Daemon thread → never blocks boot."""
    import threading

    def _warm():
        try:
            from utils.ocr_service import warmup
            warmup()
        except Exception as e:
            print(f"⚠️ Startup warmup error: {e}")

    threading.Thread(target=_warm, daemon=True).start()
    yield


app = FastAPI(title="Dyslexia Detection API", lifespan=lifespan)

# 🔐 CORS — credentials require explicit origins (wildcard + credentials is rejected by browsers).
# Configure via ALLOWED_ORIGINS env (comma-separated); falls back to local dev.
_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🗜️ Compress large JSON responses (dashboard/diagnosis payloads) to cut transfer latency.
app.add_middleware(GZipMiddleware, minimum_size=1024)


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
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(portal.router, prefix="/portal", tags=["Portal"])


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