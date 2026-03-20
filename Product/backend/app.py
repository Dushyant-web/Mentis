from fastapi import FastAPI
import joblib
from utils.feature_builder import build_features

from db.database import engine
from db import models
from routes import assessment
from routes import auth
from routes import training
from routes import dashboard



models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dyslexia Detection API")

# Load model once
model = joblib.load("model/dyslexia_model.pkl")

app.include_router(assessment.router, prefix="/assessment", tags=["Assessment"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(training.router, prefix="/training", tags=["Training"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/")
def home():
    return {"message": "Dyslexia Detection API running"}


@app.post("/predict", tags=["Prediction"])
def predict(data: dict):
    try:
        features = build_features(data)

        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]

        return {
            "prediction": prediction,
            "confidence": max(probabilities)
        }

    except Exception as e:
        return {"error": str(e)}