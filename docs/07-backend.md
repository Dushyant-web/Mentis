# 07 · Backend

FastAPI on uvicorn, Python 3.11.9. **7 routers, 38 endpoints**, one process.

## Application setup — `app.py`

In order, at import time:

1. `load_dotenv()` — environment first
2. `get_model()` / `get_scaler()` — the model loads before anything else, so a bad model
   fails the boot loudly instead of the first request quietly
3. `models.Base.metadata.create_all(bind=engine)` — schema is created if absent
4. Routers registered
5. **CORS middleware** — explicit origin allow-list, `allow_credentials=True`.
   Origins are normalised (trailing slashes stripped) because browsers never send one,
   and the parsed list is logged at boot.
6. **GZip middleware** — compresses responses over 1 KB. Dashboard and diagnosis payloads
   are large; this is a real latency win.
7. **Lifespan hook** — warms EasyOCR in a daemon thread so the first OCR request does not
   pay the model-load cost. It never blocks boot.
8. **Global exception handler** — logs the error, returns a uniform JSON envelope, never
   leaks a stack trace.

Every response follows the same shape:

```json
{ "success": true, "message": "Success", "data": { } }
```

## The routers

| Router | Responsibility |
|---|---|
| `auth` | signup · login · refresh · Google sign-in · profile · reset-progress |
| `assessment` | start a session · fetch task content · submit · analyze-canvas · predict |
| `training` | generate and serve the daily plan, mark tasks complete |
| `dashboard` | aggregated views, EMA smoothing, risk trend |
| `reports` | PDF generation |
| `analytics` | engagement event ingestion |
| `portal` | multi-student management for a school or NGO |

Interactive docs are live at `/docs` — useful in a demo, since a judge can call the API
themselves.

## The service layer — `utils/`

This is where the actual work lives. Routers stay thin.

### `feature_builder.py` — the heart

Turns raw eye and pen streams into the **23 features** in a fixed order defined by
`FEATURE_NAMES`. That order must match the order the scaler and model were trained on —
it is the contract between this repo and the model file.

### `ocr_service.py` — handwriting recognition

```
base64 PNG
  → decode, grayscale
  → _crop_and_scale()          crop to the ink bounding box, downscale
  → try pipelines in order:    adaptive threshold → Otsu → raw grayscale
      run EasyOCR
      score similarity against the target word
      if similarity ≥ 0.50 (single char) or 0.55 (word) → STOP
  → _fix_ocr_confusions()      corrects known OCR confusions
  → _char_level_similarity()   final scoring
```

An earlier build ran **5 preprocessing pipelines on every call**. This version crops first
and early-exits, bringing typical cost down to about **one OCR pass**. The `get_reader()`
singleton keeps EasyOCR loaded across requests.

### `exercise_content.py` — 27 generators

One `content_*()` function per exercise type, drawing on the bundled dataset:

| File | Contents |
|---|---|
| `WORD_BANK.csv` | 323 words graded easy / medium / hard |
| `SENTENCES.csv` | 90 sentences, same grading |
| `MIRROR_PAIRS.csv` | 50 reversal-confusable pairs |
| `AUDIO.csv` | 64 dictation words |
| `MATCHING_MIXED.json` | 191 matching items |
| `POEMS.json` | 90 poems |

All loaders are wrapped in `safe_load_*` helpers, so a missing file degrades to empty
content rather than crashing the app.

### `training_generator_V2.py` — adaptive difficulty

`compute_user_level()` produces a 0–100 skill score from six weighted signals:

| Signal | Weight | Logic |
|---|---|---|
| Assessment stage | 40 | the primary clinical indicator |
| Risk scores | 20 | dyslexia + dysgraphia probability |
| Total XP | 15 | effort proxy |
| Assessment count | 10 | longitudinal engagement |
| Improvement trend | 10 | **improving → lower level** |
| Active-day streak | 5 | consistency bonus |

That maps to five levels (Beginner → Expert), a difficulty band, and an XP multiplier.

The improvement-trend rule is the one to notice: a child who is getting better is given
*easier* work, not harder. The system backs off when it is working, which is the opposite
of a gamified app trying to maximise engagement.

### `profile_manager.py` and `confusion_engine.py`

`profile_manager` maintains a per-user weakness profile, smoothed over time so the plan
does not thrash. `confusion_engine.extract_confusions()` converts raw errors into
confusion pairs (b↔d, p↔q, and so on) and deduplicates reverses, so `bd` and `db` count as
one pair. Those pairs drive the `confusion_pair_mastery` and `mirror_discrimination`
exercises.

### `cache.py` and `rate_limiter.py` — optional by design

Both connect to Redis inside a `try`/`except` at import:

```python
try:
    _r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
    _r.ping()
    _CACHE_ON = True
except Exception:
    print("⚠️ Cache: Redis unavailable, response caching disabled")
    _r = None
    _CACHE_ON = False
```

If Redis is unreachable the app still runs — it recomputes instead of failing, and rate
limiting turns into a no-op. A cache outage must never take down a screening session.

### `jwt.py` / `auth.py` / `dependencies/auth.py`

HS256 tokens via python-jose, `JWT_SECRET` from env (the app refuses to start without it),
expiry configurable via `JWT_EXPIRE_HOURS` (default 24). Passwords hashed with argon2 and
bcrypt through passlib. `dependencies/auth.py` provides the Bearer guard used by every
protected route.

## Data layer — `db/`

`models.py` defines all 17 tables. `database.py` builds the engine with a connection pool
(`DB_POOL_SIZE` default 10, `DB_MAX_OVERFLOW` default 20) and raises immediately if
`DATABASE_URL` is missing. Alembic handles migrations.

### Smoothing

Longitudinal probabilities are smoothed with an exponential moving average in
`dashboard.py`:

```python
alpha = 0.4
smoothed["dyslexia"] = alpha * dyslexia_p + (1 - alpha) * smoothed["dyslexia"]
```

A single unusual session cannot swing a child's profile. That matters when the subject is
a distractible eight-year-old.

## Path handling

Dataset paths are anchored to the file, not the process working directory:

```python
DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"
```

CWD-relative paths break under any launcher that does not start inside `backend/`.

## Related reading

- [08 · ML model](08-ml-model.md) — what `feature_builder` feeds
- [11 · Deployment](11-deployment.md) — environment variables in full
