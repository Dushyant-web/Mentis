import os
import time
import uuid
import redis
from fastapi import HTTPException

try:
    r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
    r.ping()  # test connection
    REDIS_AVAILABLE = True
except Exception:
    print("⚠️ Redis not available, running without rate limit")
    r = None
    REDIS_AVAILABLE = False


def rate_limit(key: str, limit: int = 5, window: int = 60):
    if not REDIS_AVAILABLE:
        return

    try:
        now = time.time()
        redis_key = f"rate:{key}"

        pipe = r.pipeline()
        pipe.zremrangebyscore(redis_key, 0, now - window)
        # Unique member per request — identical scores in the same second
        # must not collapse into one entry (that under-counted before).
        pipe.zadd(redis_key, {f"{now}:{uuid.uuid4().hex}": now})
        pipe.zcard(redis_key)
        pipe.expire(redis_key, window)

        results = pipe.execute()
        count = results[2]
    except Exception as e:
        # Redis hiccup → fail open (never block a real request on the limiter).
        print("⚠️ Rate limiter fallback:", e)
        return

    # 🔑 Raise OUTSIDE the try, otherwise the generic except swallows the 429
    # and the limit is never actually enforced.
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Slow down.",
        )
