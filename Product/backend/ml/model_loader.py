"""Loads the trained classifier and its scaler.

The .pkl files are far too large for git, so a deployment either bakes them into the
image or points MODEL_URL / SCALER_URL at a download location. Nothing is hardcoded:
both URLs come from the environment.
"""

import os

import joblib
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")

MODEL_PATH = os.path.join(MODEL_DIR, "dyslexia_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

# Published alongside the source as release assets. These are public build
# artifacts of this repo, not secrets, so they make a safe default — set
# MODEL_URL / SCALER_URL to override for a different deployment.
_RELEASE = "https://github.com/Dushyant-web/Mentis/releases/download/MENTIS"

MODEL_URL = os.getenv("MODEL_URL") or f"{_RELEASE}/dyslexia_model.pkl"
SCALER_URL = os.getenv("SCALER_URL") or f"{_RELEASE}/scaler.pkl"

# joblib writes protocol-4 pickles, which always begin with this byte.
_PICKLE_MAGIC = b"\x80"


def _download(url: str, path: str, label: str) -> None:
    """Fetch a large file, following Google Drive's virus-scan interstitial if it appears."""
    session = requests.Session()
    response = session.get(url, stream=True, timeout=60)
    response.raise_for_status()

    # Drive serves an HTML confirmation page instead of the file when it is big enough
    # to skip virus scanning. Re-request with the token it sets as a cookie.
    if "text/html" in response.headers.get("Content-Type", ""):
        token = next(
            (v for k, v in response.cookies.items() if k.startswith("download_warning")),
            None,
        )
        if token is None:
            hint = (
                " Google Drive cannot serve a file this large without a virus-scan "
                "interstitial — use a GitHub release asset instead, or unset the "
                "variable to fall back to this project's own release."
                if "drive.google.com" in url
                else " Point the variable straight at the .pkl and make sure it is public."
            )
            raise RuntimeError(
                f"{label}: {url} returned a web page instead of a file.{hint}"
            )
        response = session.get(url, params={"confirm": token}, stream=True, timeout=60)
        response.raise_for_status()

    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Download to a temp name so a half-finished file never gets loaded as the real one.
    partial = path + ".part"
    with open(partial, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)

    with open(partial, "rb") as f:
        if f.read(1) != _PICKLE_MAGIC:
            os.remove(partial)
            raise RuntimeError(
                f"{label}: the downloaded file is not a pickle. Check that {url} "
                "points straight at the .pkl and is publicly readable."
            )

    os.replace(partial, path)
    print(f"✅ {label} ready ({os.path.getsize(path) / 1e6:.1f} MB)")


def _ensure(path: str, url: str | None, label: str, env_var: str) -> None:
    if os.path.exists(path):
        return
    if not url:
        raise RuntimeError(
            f"{label} is missing at {path} and {env_var} is not set. "
            f"Ship the file with the deployment or set {env_var} in the environment."
        )
    print(f"⬇️  {label} missing — downloading from {env_var}")
    _download(url, path, label)


_ensure(MODEL_PATH, MODEL_URL, "Model", "MODEL_URL")
_ensure(SCALER_PATH, SCALER_URL, "Scaler", "SCALER_URL")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)


def get_model():
    return model


def get_scaler():
    return scaler
