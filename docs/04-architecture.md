# 04 · Architecture

## The layers

```
┌──────────────────────────────────────────────────────────────────┐
│ 01  CAPTURE — hardware the child touches                         │
│     laptop webcam  ·  tablet + stylus  ·  speaker                │
└───────────────────────────┬──────────────────────────────────────┘
                            │ raw streams, in the browser
┌───────────────────────────▼──────────────────────────────────────┐
│ 02  BROWSER — Next.js 16 · React 19 · App Router                 │
│     7 capture hooks  ·  16 screens  ·  57 UI primitives          │
│     MediaPipe FaceMesh (eye)  ·  PointerEvent (pen)              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS · Bearer JWT · CORS allow-list · gzip
┌───────────────────────────▼──────────────────────────────────────┐
│ 03  API — FastAPI on uvicorn · Python 3.11.9                     │
│     7 routers  ·  38 endpoints  ·  service layer in utils/       │
└──────────────┬───────────────────────────────┬───────────────────┘
               │ 23 features                   │ canvas PNG
┌──────────────▼──────────────┐   ┌────────────▼───────────────────┐
│ 04a  CLASSIFICATION         │   │ 04b  HANDWRITING OCR           │
│  StandardScaler             │   │  crop to ink + downscale       │
│  → RandomForest 300/15      │   │  → 3 pipelines, early exit     │
│  → 6 classes + confidence   │   │  → EasyOCR + confusion fix     │
│  → SHAP TreeExplainer       │   │                                │
└──────────────┬──────────────┘   └────────────┬───────────────────┘
               └───────────────┬───────────────┘
┌──────────────────────────────▼───────────────────────────────────┐
│ 05  STATE                                                        │
│     PostgreSQL 18 — 17 tables (SQLAlchemy + Alembic)             │
│     Redis — cache + rate limit, optional by design               │
│     Model artifacts — pulled from a GitHub release on boot       │
└──────────────────────────────────────────────────────────────────┘
```

## An important honesty note about this diagram

The four "services" in layer 03/04 are **not separate deployables**. They are modules
inside one uvicorn process. MENTIS is a **monolith**, deliberately:

- it fits in 2 GB of RAM, which is what a cheap instance gives you
- there is no network hop between feature extraction and inference
- there is nothing to orchestrate, so nothing to go wrong at 2am

If someone draws you a microservices diagram of this project, it is wrong.

## Repository layout

```
Product/
├── backend/                     FastAPI application
│   ├── app.py                   entry point · CORS · gzip · global error handler
│   ├── routes/                  7 routers = the HTTP surface
│   │   ├── auth.py              signup, login, refresh, Google, profile
│   │   ├── assessment.py        run a session, analyze canvas, predict
│   │   ├── training.py          plans and tasks
│   │   ├── dashboard.py         aggregated views, EMA smoothing
│   │   ├── reports.py           PDF generation
│   │   ├── analytics.py         engagement events
│   │   └── portal.py            multi-student management
│   ├── utils/                   service layer — the actual logic
│   │   ├── feature_builder.py   the 23 features  ← the heart of it
│   │   ├── ocr_service.py       handwriting recognition
│   │   ├── exercise_content.py  27 content generators
│   │   ├── training_generator_V2.py  adaptive 5-level plan builder
│   │   ├── profile_manager.py   weakness profile maintenance
│   │   ├── confusion_engine.py  b/d, p/q pair extraction
│   │   ├── cache.py             Redis cache, degrades cleanly
│   │   ├── rate_limiter.py      Redis token bucket, degrades cleanly
│   │   ├── jwt.py / auth.py     tokens and password hashing
│   │   └── pdf_reader.py        PyMuPDF report output
│   ├── ml/
│   │   ├── model_loader.py      loads/downloads + verifies the .pkl
│   │   └── exercise_engine.py   exercise selection logic
│   ├── db/
│   │   ├── models.py            17 SQLAlchemy tables
│   │   └── database.py          engine, session, pooling
│   ├── dependencies/auth.py     Bearer guard used by every protected route
│   └── model/                   dyslexia_model.pkl + scaler.pkl (not in git)
│
└── frontend/                    Next.js 16 App Router
    ├── app/                     16 screens
    ├── hooks/                   7 hooks — eye, pen, speech, analytics, ui
    ├── components/              57 UI primitives + scroll-story + tracking
    └── lib/                     api client, auth helpers

Simulator_2/                     synthetic dataset generator + training
├── config.py                    6 disorder profiles, 5 noise layers
├── dataset/generator/           Sigma-Lognormal pen, E-Z Reader eye
├── feature_engine/              the 23 extractors
├── training/                    loader + RandomForest training
└── tests/test_all.py            10 unit tests, including the anti-cheat check
```

## The 17 tables

| Group | Tables |
|---|---|
| Identity | `users`, `user_settings` |
| Sessions | `assessment_sessions`, `assessments`, `results`, `eye_tracking`, `writing_tests` |
| Analysis | `feature_attributions`, `advanced_eye_metrics`, `user_weakness_profile`, `assessment_errors`, `issue_history` |
| Training | `training_plans`, `training_tasks`, `progress`, `courses` |
| Telemetry | `analytics_events` |

`feature_attributions` is the one to notice — that is where SHAP output is persisted, and
it is what makes a past result auditable.

## Design decisions worth defending

| Decision | Why |
|---|---|
| Monolith, not microservices | fits 2 GB; no orchestration; one deploy |
| CPU-only everywhere | no GPU budget in a school deployment |
| Capture in the browser, score on the server | the model never leaves the server; the browser only ships numbers |
| Redis optional | a cache outage must not take down a screening session |
| Model in a GitHub release, not git | 123 MB is too large for a repo, and a release URL is stable and public |
| SHAP on every prediction | a screening tool that cannot explain itself is not auditable |

## Related reading

- [05 · Tech stack](05-tech-stack.md) — every dependency and why
- [10 · Workflow](10-workflow.md) — the same picture as a sequence
