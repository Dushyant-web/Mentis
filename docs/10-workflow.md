# 10 · Workflow

The same system as [04 · Architecture](04-architecture.md), but as a sequence.

## A. The child's journey

```
1. SIGN IN              email/password or Google
2. READING TEST         reads a passage · webcam tracks eyes · ~4 min
3. WRITING TEST         writes on tablet · stylus records strokes · ~4 min
4. SUBMIT               browser posts both streams
5. RESULT               1 of 6 outcomes + confidence + explanation
6. PRACTICE PLAN        daily exercises targeted at what was weak
7. COME BACK TOMORROW   progress tracked, difficulty adapts
```

Steps 2–5 take **8–12 minutes**. Step 6 is what makes step 7 happen.

## B. What happens inside one session

```
BROWSER
  useEyeTracking    MediaPipe FaceMesh → iris 468/473 → gaze (EMA α=0.35)
                    → fixations (vel < 25) · saccades · regressions · blinks (EAR < 0.22)
                    → batched, posted every 50 ms

  usePenTracking    PointerEvent → x, y, pressure, tiltX, tiltY, timestamp, type
                    → speed · acceleration · tremor · straightness per stroke
                    → canvas also exported as base64 PNG

        │ HTTPS · Bearer JWT · CORS allow-list · gzip
        ▼
API  (FastAPI / uvicorn)
  dependencies/auth.py        verify Bearer token
  routes/assessment.py        receive the session
        │
        ├─→ utils/feature_builder.py     23 features in FEATURE_NAMES order
        │        ▼
        │   StandardScaler (the same one fitted during training)
        │        ▼
        │   RandomForest — 300 trees, depth 15
        │        ▼
        │   6 class probabilities + confidence
        │        ▼
        │   shap.TreeExplainer → per-feature contributions
        │
        └─→ utils/ocr_service.py         canvas PNG
                 crop to ink + downscale
                 adaptive → Otsu → raw, early exit at 0.50–0.55
                 EasyOCR → confusion fix → similarity score
        ▼
PERSIST
  assessment_sessions · results · feature_attributions
  advanced_eye_metrics · assessment_errors · user_weakness_profile
        ▼
RESPOND
  { success, message, data: { prediction, confidence, explanation } }
```

## C. How the practice plan is built

```
results + weakness profile + XP + streak
        ▼
training_generator_V2.compute_user_level()
   assessment stage    40 pts
   risk scores         20 pts
   total XP            15 pts
   assessment count    10 pts
   improvement trend   10 pts   ← improving lowers the level
   active streak        5 pts
        ▼
   skill_score 0–100 → 1 of 5 levels → difficulty band + XP multiplier
        ▼
confusion_engine.extract_confusions()     b↔d, p↔q from actual errors
        ▼
exercise_content.py — 27 generators pick content at that difficulty,
targeting that child's specific confusion pairs
        ▼
training_plans + training_tasks
```

## D. The request lifecycle, generically

```
Request
  → CORS check           origin must be in the normalised allow-list
  → Bearer guard         JWT verified, user resolved
  → rate limiter         Redis token bucket (skipped if Redis is down)
  → cache lookup         Redis (skipped if Redis is down → recompute)
  → route handler        thin — delegates to utils/
  → service layer        the actual work
  → DB read/write        SQLAlchemy session
  → cache write          best effort
  → GZip                 if the body is over 1 KB
  → uniform envelope     { success, message, data }

Anything thrown → global handler → logged → generic 500 JSON, no stack trace
```

## E. Longitudinal smoothing

A single session is never trusted on its own:

| Where | Smoothing |
|---|---|
| Dashboard risk probabilities | EMA, **α = 0.4** |
| Weakness profile | smoothed across sessions |
| Training level | uses improvement *trend*, not a single score |

An eight-year-old who slept badly should not be reclassified as severe.

## F. Boot sequence

```
uvicorn app:app
  → load_dotenv()
  → ml/model_loader.py
       model/*.pkl present?  yes → load
                             no  → download from MODEL_URL / SCALER_URL
                                   write to .part, verify pickle header 0x80,
                                   then publish
  → joblib.load() both artifacts
  → create_all() — ensure the 17 tables exist
  → register 7 routers
  → CORS (normalised origins, logged) · GZip
  → lifespan: warm EasyOCR in a daemon thread
  → serving
```

First boot on a fresh instance downloads 123 MB and takes about a minute. Subsequent boots
are fast because the file is already on disk.

## Related reading

- [07 · Backend](07-backend.md) — each service in detail
- [11 · Deployment](11-deployment.md) — how to run all this
