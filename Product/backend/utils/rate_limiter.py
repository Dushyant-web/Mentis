import os
import time
import redis
from fastapi import HTTPException

try:
    r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
    r.ping()  # test connection
    REDIS_AVAILABLE = True
except:
    print("⚠️ Redis not available, running without rate limit")
    REDIS_AVAILABLE = False


def rate_limit(key: str, limit: int = 5, window: int = 60):
    if not REDIS_AVAILABLE:
        return

    try:
        current = int(time.time())
        redis_key = f"rate:{key}"

        pipe = r.pipeline()
        pipe.zremrangebyscore(redis_key, 0, current - window)
        pipe.zadd(redis_key, {current: current})
        pipe.zcard(redis_key)
        pipe.expire(redis_key, window)

        results = pipe.execute()
        count = results[2]

        if count > limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Slow down."
            )

    except Exception as e:
        print("⚠️ Rate limiter fallback:", e)
        return