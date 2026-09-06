"""
🚀 Best-effort Redis response cache.

Used to cache expensive read endpoints (dashboard summary / diagnosis) that
recompute from ALL of a user's results on every page load. Everything here is
wrapped so a missing/broken Redis NEVER breaks a request — it just falls back
to recomputing.
"""
import os
import json

from fastapi.encoders import jsonable_encoder

try:
    import redis
    _r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
    _r.ping()
    _CACHE_ON = True
except Exception:
    print("⚠️ Cache: Redis unavailable, response caching disabled")
    _r = None
    _CACHE_ON = False


def cache_get(key: str):
    """Return the cached value (parsed) or None."""
    if not _CACHE_ON:
        return None
    try:
        raw = _r.get(f"cache:{key}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def cache_set(key: str, value, ttl: int = 30):
    """Store a JSON-serializable value (numpy/datetime handled via jsonable_encoder)."""
    if not _CACHE_ON:
        return
    try:
        _r.setex(f"cache:{key}", ttl, json.dumps(jsonable_encoder(value)))
    except Exception:
        # Never let caching break the response
        pass


def cache_invalidate(*keys: str):
    """Drop specific cache keys (call after a write that changes the data)."""
    if not _CACHE_ON:
        return
    try:
        for k in keys:
            _r.delete(f"cache:{k}")
    except Exception:
        pass
