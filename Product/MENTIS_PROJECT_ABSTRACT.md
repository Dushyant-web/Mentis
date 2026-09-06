# MENTIS — Early Dyslexia & Dysgraphia Screening Platform
### A Complete Project Abstract: From Idea to Implementation

---

## 1. Executive Summary

**MENTIS** is an AI-powered, browser-based platform for the **early screening of dyslexia and dysgraphia in children**. It replaces expensive, slow, specialist-dependent clinical assessment with a **non-invasive, ~5–8 minute digital test** that any parent, teacher, or clinician can run on an ordinary laptop — no special hardware required.

The system captures two streams of natural behavioural biometrics:

1. **Eye movement** during reading (via the webcam), and
2. **Handwriting dynamics** during writing (via a digital canvas + OCR).

It fuses these signals through a **machine-learning model** that classifies a child into one of four cognitive profiles — *Normal*, *Dyslexia*, *Dysgraphia*, or *Both* — together with a **confidence score, an uncertainty estimate, and SHAP-based explanations** of *why* the model decided what it did. From that diagnosis, MENTIS auto-generates a **personalized, adaptive 8-week training program** that targets the child's specific weaknesses (reading, writing, rhythm/motor control) and keeps them engaged through gamification (XP, streaks, daily plans).

A multi-role **portal** lets parents, teachers, and doctors securely follow a child's progress through a shareable key.

---

## 2. The Problem

- **1 in 10 children** are estimated to have dyslexia; many more have undiagnosed dysgraphia (a writing/motor-coordination disorder).
- Traditional diagnosis is **expensive, slow, and gated behind specialists** (educational psychologists, occupational therapists). Waiting lists run for months.
- **Early intervention is the single biggest predictor of outcome.** A child screened at age 6 has a dramatically better trajectory than one identified at age 11.
- Existing digital tools are either clinical-only, hardware-heavy (dedicated eye-trackers), or non-adaptive (one static test).

**The gap:** there is no accessible, low-cost, *continuous* tool that can (a) screen early, (b) explain its reasoning to non-experts, and (c) turn the result into an actual intervention.

---

## 3. The Idea / Solution

MENTIS treats screening not as a one-off test but as a **closed feedback loop**:

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         │
   ASSESS  ──►  DIAGNOSE  ──►  TRAIN  ──►  RE-ASSESS  ──►  ADAPT ─┘
 (eye + pen)   (ML + SHAP)   (adaptive)   (track delta)   (update
                                                          weakness
                                                          profile)
```

- **Assess:** Reading test (eye tracking) + Writing test (handwriting capture & OCR).
- **Diagnose:** ML model → probability distribution over 4 classes + uncertainty + human-readable insights.
- **Train:** Adaptive exercise engine builds a daily plan from the child's *weakness profile* and observed *letter confusions* (b/d, p/q, m/n, w/v).
- **Re-assess & Adapt:** Each completed exercise and each new assessment updates a persistent **learning-memory** (an online-learning weakness profile), so the plan continuously re-targets the child's current weak spots.

The whole thing runs in a browser — the only "sensor" is the user's webcam and trackpad/stylus.

---

## 4. System Architecture (High Level)

```
┌────────────────────────────┐         HTTPS / REST + JWT        ┌──────────────────────────────┐
│        FRONTEND            │ ───────────────────────────────► │           BACKEND             │
│   Next.js 16 / React 19    │ ◄─────────────────────────────── │      FastAPI (Python 3.11)    │
│                            │           JSON responses          │                              │
│  • Landing (scroll-story)  │                                   │  Routes:                     │
│  • Auth (login/signup/     │                                   │   /auth /assessment          │
│      Google OAuth)         │                                   │   /training /dashboard       │
│  • Assessment flow         │                                   │   /reports /analytics        │
│    - reading-test (webgazer│                                   │   /portal                    │
│      + mediapipe facemesh) │                                   │                              │
│    - writing-test (canvas) │        ┌──────────────┐           │  Utils: feature_builder,     │
│  • Analysis / Diagnosis    │        │    Redis     │◄──────────│   confusion_engine,          │
│  • Dashboard (recharts)    │        │ cache + rate │           │   training_generator_V2,     │
│  • Training + Exercises    │        │   limiting   │           │   ocr_service (EasyOCR),     │
│  • Progress / Portal /     │        └──────────────┘           │   jwt, cache, rate_limiter,  │
│      Profile               │                                   │   profile_manager            │
└────────────────────────────┘        ┌──────────────┐           │                              │
                                       │  PostgreSQL  │◄──────────│  ML: model_loader,           │
                                       │  (SQLAlchemy │           │   exercise_engine            │
                                       │   + Alembic) │           │   (scikit-learn + SHAP)      │
                                       └──────────────┘           └──────────────────────────────┘
```

**Communication:** stateless REST. The frontend holds a JWT (issued on login/signup/Google) and attaches it as a Bearer token. A silent-refresh interceptor renews expiring tokens without interrupting a test.

---

## 5. Technology Stack (Detailed)

### Frontend
| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | File-based routing, RSC, fast dev/build |
| UI runtime | **React 19** + **TypeScript 5.7** | Type-safe components |
| Styling | **Tailwind CSS v4** (`@theme`, OKLCH tokens) | Design-token-driven, dark-mode ready |
| Components | **Radix UI** primitives (shadcn-style) | Accessible dialogs, tabs, switches, etc. |
| Animation | **Framer Motion** | Dashboard motion, micro-interactions |
| Charts | **Recharts** | Reading/writing trend graphs |
| Icons | **lucide-react** | Consistent line-icon system (emoji-free UI) |
| Eye tracking | **WebGazer.js** + **@mediapipe/face_mesh** | Webcam gaze estimation in-browser |
| Forms | **react-hook-form** + **Zod** | Validated auth/profile forms |
| Fonts | **Nunito** (body) + **Fredoka** (display) | Child-friendly, readable |
| Misc | next-themes, sonner (toasts), Vercel Analytics | Theme, notifications, telemetry |

### Backend
| Layer | Technology | Why |
|---|---|---|
| API framework | **FastAPI 0.135** + **Uvicorn** | Async, typed, auto OpenAPI docs |
| ORM | **SQLAlchemy 2.0** | Models + queries |
| Migrations | **Alembic** | Versioned schema changes (perf indexes) |
| Database | **PostgreSQL** (psycopg2) | Relational store for users, results, plans |
| Validation | **Pydantic 2.12** | Request schemas (signup/login/profile/etc.) |
| Auth | **python-jose** (JWT HS256), **bcrypt/argon2/passlib**, **Google OAuth** | Token auth + hashing + social login |
| Cache / limits | **Redis** | Dashboard response cache + rate limiting |
| OCR | **EasyOCR** + **OpenCV** + **PyTorch** | Reads the child's handwriting from canvas |
| ML | **scikit-learn**, **SHAP**, **NumPy/Pandas/SciPy**, **joblib** | Classifier, explainability, feature math |

---

## 6. Data Model (Core Tables)

The schema is centred on the **User** and fans out into assessment data, results, training, and a learning-memory layer.

- **User** — identity, demographics (age, gender, role), `parent_id` (portal linking), `share_key` (`MNT-XXXXXX`), Google ID.
- **AssessmentSession / Assessment** — a screening run; stores raw `eye_data`, `pen_data`, `errors` (JSON).
- **Result** — the ML verdict: `level`, `confidence`, per-class probabilities (`prob_normal/dyslexia/dysgraphia/both`), `dyslexia_score`, `dysgraphia_score`, stages, `uncertainty`, entropy-based `uncertainty_score`.
- **EyeTracking** — fixation, regressions, reading speed, `eye_score`, severity, normalized regression-rate & fixation-stability.
- **WritingTest** — expected vs. typed/written text, accuracy, `speed_wpm`, `confusion_count`, `writing_score`, stage.
- **AdvancedEyeMetrics** — avg fixation duration, fixation variance, saccade length, regression count.
- **AssessmentError** — per-word: `target_word` vs `actual_word` (OCR), similarity, `confused_letters`, `error_type` (reversal / omission / substitution / addition), `confused_pairs`.
- **FeatureAttribution** — stored SHAP values: `feature_name`, `impact`, `direction` — powers "why" explanations without recomputing SHAP at request time.
- **TrainingPlan / TrainingTask** — generated plan + adaptive tasks (`task_type`: eye/pen/rhythm, difficulty, XP, status, `is_adaptive`, `content` JSON).
- **Progress** — XP log per task per day (drives streaks & trends).
- **UserWeaknessProfile** — the *learning memory*: `reading_score`, `writing_score`, `rhythm_score` (online-updated).
- **IssueHistory** — longitudinal snapshots for trend analysis.
- **UserSetting** — notifications/reminders/reports prefs.
- **AnalyticsEvent** — product telemetry (exercise_started, assessment_completed, page_viewed).

---

## 7. Backend Deep-Dive

### 7.1 Route Modules
- **`/auth`** — signup, login, Google OAuth, JWT refresh (with a 7-day grace window), profile read/update, full data reset.
- **`/assessment`** — session lifecycle, canvas analysis (OCR), feature submission, ML prediction.
- **`/dashboard`** — summary (fused scores + insights), progress-graph, training-progress, improvement, diagnosis, plus eye-data and writing-test scoring endpoints.
- **`/training`** — adaptive plan generation, today's exercises, exercise content, completion + XP.
- **`/reports`**, **`/analytics`**, **`/portal`** — PDF/report data, event logging, multi-role linking via share key.

### 7.2 The Scoring & Intelligence Logic
- **Eye scoring:** thresholds on fixation, regressions, and reading speed → `eye_score` → severity (low/medium/high), plus an insights engine ("High regression detected", "Long fixation indicates decoding difficulty").
- **Writing scoring:** `difflib.SequenceMatcher` accuracy + words-per-minute speed + **dyslexia-specific confusion detection** over pairs (b/d, p/q, m/n, w/v) → `writing_score` → stage (stage_1/2/3).
- **Dashboard fusion (the "intelligence layer"):**
  - **EMA smoothing** (α=0.4) over historical class probabilities → stable longitudinal signal instead of noisy single-shot readings.
  - **Normalized Shannon entropy** over the probability distribution → an honest *uncertainty score* (and a "needs more data" state when the model isn't sure).
  - **Margin analysis** (top prob − second prob) → risk level (low/medium/high/uncertain) and recommended action (train / collect-more-data / repeat).
  - **Online weakness learning:** after every exercise, `profile.score = (1−lr)·old + lr·performance` (lr=0.1) — an exponential-moving learner that tracks the child's *current* state.

### 7.3 Explainability (SHAP)
Rather than a black box, MENTIS stores **per-feature SHAP attributions** at prediction time in `FeatureAttribution`. The dashboard then renders the top drivers ("regression_rate increased risk (0.18)") *without* paying the cost of recomputing SHAP on every page load.

### 7.4 Security & Privacy
- **JWT** (HS256) auth via a single `get_current_user` dependency; consistent integer user IDs.
- **Pydantic request models** on auth/profile/eye/writing endpoints → input validation, 422s instead of 500s, no arbitrary field writes.
- **Rate limiting** (Redis sliding-window) on auth and data endpoints.
- **CORS** locked to explicit origins (env-driven) rather than wildcard-with-credentials.
- **Error hygiene** — internal exceptions are logged server-side, never echoed to clients.
- **Privacy posture** — biometric data is processed for scoring, not exposed; passwords hashed (bcrypt/argon2); Google-only accounts handled without a password path.

### 7.5 Performance Engineering
- **Connection pooling** (`pool_pre_ping`, pool size/overflow, recycle) → no per-request handshake, no stale-connection 500s.
- **GZip compression** on large JSON (dashboard/diagnosis payloads).
- **Redis response cache** on expensive recompute-heavy reads (summary/diagnosis).
- **Query batching** — the dashboard summary's 6 separate COUNT/SUM round-trips collapsed into 2 via conditional aggregation; an O(records × tasks) N+1 in training-progress reduced to O(1) dict lookups.
- **Alembic performance indexes** on every hot join/filter column (`assessments.user_id`, `results.assessment_id`, `progress.user_id`, `training_plans.user_id`, `training_tasks.plan_id`, composite `(user_id, created_at)` on time-series tables).
- **EasyOCR warm-up** in a background thread at startup (via lifespan) so the first OCR request doesn't pay the multi-second model-load cost.

---

## 8. Frontend Deep-Dive

### 8.1 Route Map
- **Landing (`/`)** — a scroll-driven story: a 500vh pinned (`position: sticky`) hero that cross-fades through 5 scenes (Intro → Desk → Laptop → Pen → Assessment), an animated "jumble letters" dyslexia-themed background, and conventional sections (How It Works, Features, Research, Testimonials, CTA, Footer).
- **Auth (`/login`, `/signup`)** — email/password + Google sign-in.
- **Assessment (`/assessment`)** — gated two-step flow (reading must complete before writing); demo mode for instant pre-computed results.
- **`/reading-test`** — live webcam **eye tracking** (WebGazer + MediaPipe FaceMesh) over reading passages, with a "Tracking Active" HUD.
- **`/writing-test`** — a notebook-style **handwriting canvas** (smooth, Apple-Notes-style ink via quadratic-curve smoothing + coalesced pointer events + pointer capture); strokes are OCR'd server-side.
- **`/analysis`** — animated "Analyzing your data…" pipeline (eye → writing → AI model → insights) while the backend runs the model.
- **`/diagnosis`** — the verdict: confidence, per-issue breakdown, detailed findings, and CTAs into training / report / progress.
- **`/dashboard`** — the home: fused scores, AI accuracy, learning score, streak, reading-improvement & writing-consistency charts (Recharts), and the **Daily AI Plan** (ranked by weakness-impact, with XP and a progress ring), all animated with Framer Motion.
- **`/training` + `/training/exercise/[id]`** — the adaptive plan and the actual interactive exercises (letter discrimination, dictation, precision drawing, rhythm tapping, speech matching, same/different).
- **`/progress` + `/progress/weekly`** — long-term trend reports.
- **`/portal`** — parent/teacher/doctor view; link to a child via their `MNT-XXXXXX` share key.
- **`/profile`** — account, settings, data reset.

### 8.2 Data Layer
A single typed `api` client wraps `fetch` with:
- automatic Bearer-token injection,
- a **401 interceptor** that performs a **single, de-duplicated silent token refresh** (a "thundering-herd" guard queues concurrent requests behind one refresh), and
- centralized error handling + redirect-to-login on hard auth failure.

### 8.3 Design System
- OKLCH-based **design tokens** (warm orange/cream "kids" theme) in `globals.css`, exposed to Tailwind via `@theme`.
- A consistent **line-icon language** (lucide) across the entire app — no emoji in UI.
- A single MENTIS SVG logo system (horizontal lockup + standalone mark for collapsed states).

---

## 9. The End-to-End User Journey

1. **Discover** → animated landing page explains the concept.
2. **Sign up** → create account (role: student/parent/teacher/doctor), get a share key.
3. **Assess** → Step 1 reading test (eyes), Step 2 writing test (hand). Raw biometric streams are down-sampled and submitted.
4. **Analyze** → backend extracts ~42 neuro-motor features → ML model → probabilities + SHAP + uncertainty, persisted to `Result` + `FeatureAttribution`.
5. **Diagnose** → child sees a clear, explained verdict with severity and focus areas.
6. **Train** → an adaptive daily plan is generated from the weakness profile + observed confusions; exercises award XP and build streaks.
7. **Track** → dashboard shows smoothed longitudinal trends; weakness profile updates online after every exercise.
8. **Share** → parents/teachers/doctors monitor via the portal.

---

## 10. The AI / ML Engine

- **Inputs:** ~42 engineered neuro-motor features built from eye-tracking (fixations, saccades, regressions, reading speed, fixation variance) and pen dynamics (stroke speed, pressure, rhythm consistency, letter-confusion counts).
- **Model:** a scikit-learn classifier producing a 4-class probability distribution (`normal / dyslexia / dysgraphia / both`) via `predict_proba`.
- **Explainability:** SHAP attributions stored per session → top contributing features with direction (increased/reduced risk).
- **Calibration & honesty:** entropy-based uncertainty + margin checks gate the system from over-claiming; when confidence is low it explicitly asks for another session rather than guessing.
- **Memory:** the `UserWeaknessProfile` is an online exponential-moving learner, so the model's *recommendations* adapt even between full re-assessments.

---

## 11. Adaptive Training System

- **Generator (`training_generator_V2`)** builds a plan from the weakness profile, ranking exercises by *impact* (how much they target the child's weakest dimension).
- **Exercise types:** eye-tracking/reading drills, pen/handwriting drills, rhythm/motor tasks, letter-discrimination (b/d, p/q), dictation, precision drawing, speech matching, same/different.
- **Confusion engine** turns observed errors (e.g., frequent b↔d reversals) into targeted practice.
- **Gamification:** XP per task, daily XP goals, day-streaks, progress rings, "start here" next-best-action.

---

## 12. Recent Engineering Hardening (Latency, Architecture, UX)

- DB connection pooling, GZip, Redis caching, query batching, N+1 elimination, Alembic performance indexes.
- Rate-limiter correctness fix (a swallowed 429 that meant auth was effectively un-throttled).
- Pydantic validation + CORS lockdown + error-leak cleanup.
- Frontend: smooth handwriting canvas, motion-driven dashboard, full emoji→icon pass, single-logo system, and a `position: sticky` / `overflow: clip` fix so the scroll-story hero pins correctly instead of leaving blank scroll gaps.

---

## 13. Future Roadmap

- Real refresh-token rotation + revocation list.
- On-device (WASM) inference to keep biometrics fully local.
- Larger, clinically-validated training set + model versioning through Alembic-tracked metadata.
- Multi-language reading passages and dysgraphia sub-typing.
- Clinician dashboard with cohort analytics and exportable, standards-aligned reports.
- Offline/PWA mode for low-connectivity schools.

---

## 14. One-Paragraph Abstract (for a paper / pitch)

> **MENTIS** is a browser-based platform for early, explainable screening of dyslexia and dysgraphia in children. Using only a standard webcam and a digital writing canvas, it captures reading eye-movement and handwriting-dynamics biometrics, extracts ~42 neuro-motor features, and classifies the child across four cognitive profiles with a scikit-learn model that reports calibrated confidence, entropy-based uncertainty, and SHAP feature attributions for full interpretability. A longitudinal intelligence layer (EMA-smoothed probabilities + an online-learning weakness profile) converts each screening into a personalized, gamified, adaptive training program that continuously re-targets the child's weakest skills. Built on a FastAPI + PostgreSQL + Redis backend and a Next.js/React/Tailwind frontend, MENTIS turns a months-long, specialist-gated diagnosis into an accessible ~5-minute loop of assess → diagnose → train → re-assess — putting early, evidence-based intervention within reach of any parent, teacher, or clinic.
