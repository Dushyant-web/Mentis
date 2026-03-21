import os
import joblib
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "dyslexia_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "..", "model", "scaler.pkl")

MODEL_URL = "https://drive.google.com/uc?id=13N8-dz9xFC913WtAzIe4r2Ttx_iZNNm_"
SCALER_URL = "https://drive.google.com/uc?id=1TMgkEZRJRZhp2CCVLZGmZRUIUhG9e-sp"


def download_file(url, path):
    if not os.path.exists(path):
        print(f"⬇️ Downloading {path}")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)


# 🔥 auto-download if missing
download_file(MODEL_URL, MODEL_PATH)
download_file(SCALER_URL, SCALER_PATH)

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)


def get_model():
    return model

def get_scaler():
    return scaler