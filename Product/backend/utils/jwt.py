from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise Exception("JWT_SECRET not set in environment variables")

ALGORITHM = "HS256"

# 🔐 Configurable expiry (default: 2 hours)
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", 2))


def create_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # extra safety: check exp manually (optional but robust)
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            raise Exception("Token expired")

        return payload

    except JWTError:
        raise Exception("Invalid token")