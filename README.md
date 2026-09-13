# MENTIS

**Dyslexia and dysgraphia screening from a webcam and a writing pad.**

A child reads a passage while an ordinary webcam tracks their eyes, then writes on a tablet while
a stylus records every stroke. MENTIS turns those two signals into 23 objective features, scores
them against a trained classifier, and returns an explainable risk profile plus a daily practice
plan for the teacher and the parent.

> MENTIS is a **screening aid, not a clinical diagnosis.** A registered professional confirms every result.

| | |
|---|---|
| **Live demo** | _add deployed URL_ |
| **Stack** | Next.js 16 · FastAPI · PostgreSQL · Redis · scikit-learn |
| **Status** | Working prototype — 38 API endpoints, 17 tables, 16 screens |

---

## Full documentation

Deeper writeups live in [`docs/`](docs/) — problem, solution, features, architecture,
tech stack, frontend, backend, the ML model, the dataset generator, workflow, deployment
and limitations. Start at [docs/README.md](docs/README.md).

---

## Why

India already requires this. The instrument is what is missing.

| | |
|---|---|
| **24.7 crore** children in school, across 14.7 lakh schools | UDISE+ 2024–25, Ministry of Education |
| **8%** pooled prevalence of specific learning disability | Scaria, Bhaskaran & George, *Indian J Psychol Med*, 2023 |
| **3,890** RCI-registered clinical psychologists — the professionals who may certify SLD | Rehabilitation Council of India |
| **74%** of poor readers in Grade 3 are still poor readers in Grade 9 | Francis, Shaywitz, Stuebing, Shaywitz & Fletcher, 1996 |

That is roughly **2 crore children who may need assessing and 3,890 people qualified to do it** —
about 5,000 children each. The **RPwD Act, 2016** mandates SLD screening for every school student
at age 8, and the national instrument for it, **NCERT PRASHAST**, is a teacher's observational
checklist filled in by hand.

MENTIS is the objective measurement layer between that checklist and the clinic. It does not replace
the psychologist — it tells them which children to see first.

---

## How it works

Dyslexia and dysgraphia look similar in a classroom and completely different in the signal.

| Channel | Captured by | Dyslexia | Dysgraphia |
|---|---|---|---|
| **Eye** — reading | webcam, MediaPipe FaceMesh | eyes jump backwards; long, frequent fixations | near-normal |
| **Pen** — motor | stylus / touchscreen | near-normal | broken, trembling strokes; constant pen lifts |
| **Rhythm** — timing | derived from pen stream | irregular | erratic, bursty |

Measuring both at once is what separates the two disorders. It is also why every diagram in this
project uses the same two colours: blue for the reading channel, orange for the motor channel.

### The 23 features

**Pen (12)** — isochrony_score · homothety_score · timing_variance · avg_jerk · pressure_variance ·
letter_spacing_cv · stroke_speed_mean · pen_lift_rate · micro_pause_rate · stroke_fragmentation ·
letter_size_cv · direction_variance

**Eye (5)** — fixation_count · regression_count · avg_fixation_duration · saccade_velocity_mean ·
fixation_duration_cv

**Rhythm (6)** — timing_stability · rhythm_consistency · pause_density · motor_rhythm_index ·
burstiness_index · inter_stroke_entropy

---

## Accuracy, honestly

**78.22% overall** across 58,140 sessions from 5,000 synthetic users.
RandomForest, 300 trees, depth 15, `class_weight="balanced"`, six classes.

| Class | Recall | |
|---|---|---|
| moderate | 91% | clearest signal — distinct reading *and* distinct motor |
| normal | 89% | near-baseline on everything |
| mild | 86% | slight reading impairment separates from normal |
| severe | 84% | extreme reading impairment |
| both | 64% | hardest — combines severe and dysgraphia |
| dysgraphia | 61% | motor-only, relies entirely on pen features |

### Why the number went *down*

The first version of this model reported **99%**. It was wrong. The dataset loader was multiplying
features by 1.5× whenever the label was "dysgraphia" — the model had learned the inflation, not the
disorder. We found it, removed it, and wrote a unit test that inspects the loader's own source at
runtime to make sure it never comes back.

After the fix the model hit 97.3% on clean synthetic data, which is still not a real number. Five
layers of noise were added to make the data behave like real children:

| Layer | Setting |
|---|---|
| Profile overlap between adjacent classes | 3–8× separation, not 22× |
| Session variation (fatigue, focus, mood) | ±12% |
| Sensor jitter on pen coordinates and gaze | Gaussian σ = 0.10–0.12 |
| Post-extraction feature noise | ±7% |
| Label noise, simulating clinical misdiagnosis | 2% |

**99% → 97.3% → 78.2%.** The last number is the only one we trust.

---

## Architecture

```
Browser                         Backend                      Storage
────────────────────────────────────────────────────────────────────────
webcam ──► MediaPipe FaceMesh ──┐
                                ├──► feature_builder (23) ──► RandomForest ──┐
stylus ──► pointer events ──────┘                                            │
                                                                             ▼
OCR ensemble (EasyOCR + 4 fallbacks) ──► handwriting text        PostgreSQL (17 tables)
                                                                 Redis (dashboard cache)
```

**7 routers, 38 endpoints** — `assessment` · `auth` · `training` · `dashboard` · `reports` ·
`analytics` · `portal`

**16 screens, 57 UI primitives, 7 capture hooks**, and **27 exercise content generators** driving
the practice plan (200 matching items, 90 poems).

Scores are smoothed with an exponential moving average — α = 0.4 on the dashboard, α = 0.3 on
weakness tracking, learning rate 0.1 for online updates — so a single bad session never swings a
child's profile.

---

## Running it locally

**Prerequisites:** Python 3.11, Node 18+, PostgreSQL, Redis.

```bash
# 1. Services
brew services start postgresql@18 redis
createdb neuro_app

# 2. Backend
cd Product/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill it in — see the table below
uvicorn app:app --reload --port 8000

# 3. Frontend (second terminal)
cd Product/frontend
npm install
cp .env.example .env.local    # then fill it in
npm run dev
```

App on **http://localhost:3000**, interactive API docs on **http://localhost:8000/docs**.

On first boot the backend loads `model/dyslexia_model.pkl` (123 MB). It is not in git — either place
it in `Product/backend/model/` yourself or set `MODEL_URL` and `SCALER_URL` and it will download and
verify them on startup. EasyOCR warms up in a background thread, so give the first OCR request
20–30 seconds.

---

## Configuration

Nothing is hardcoded. Every URL, secret and client ID comes from the environment.

### `Product/backend/.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Session signing key — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID, verified server-side on sign-in |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins; must contain the exact frontend origin |
| `MODEL_URL` / `SCALER_URL` | Direct download links to the `.pkl` files, used only when they are absent from disk |

### `Product/frontend/.env.local`

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL, no trailing slash |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same client ID as the backend; the deployed domain must be an Authorized JavaScript origin in Google Cloud Console |

---

## Deploying

1. **Database and cache** — provision managed PostgreSQL and Redis, put their URLs in the backend env.
2. **Backend** — any container host. `uvicorn app:app --host 0.0.0.0 --port $PORT`, Python 3.11
   (`runtime.txt`). Ship the two `.pkl` files in the image, or set `MODEL_URL` / `SCALER_URL`.
3. **Frontend** — `npm run build && npm start`, or deploy straight to Vercel.
4. **Wire them together** — set `NEXT_PUBLIC_API_URL` to the backend's public URL, and
   `ALLOWED_ORIGINS` to the frontend's. A mismatch here is the usual cause of a blank dashboard:
   CORS with credentials rejects wildcards, so the origin must match exactly.
5. **Google sign-in** — add the deployed frontend domain as an Authorized JavaScript origin.

The webcam requires a secure context. Anything other than `localhost` must be served over HTTPS or
eye tracking will never start.

---

## Repository

```
Product/
├── backend/            FastAPI — routes, db, ml, utils, alembic
│   ├── app.py          entry point, CORS, gzip, global error handler
│   ├── ml/             model loading and inference
│   ├── utils/          feature_builder (23 features), OCR ensemble, exercise content
│   └── model/          dyslexia_model.pkl + scaler.pkl  (not in git — 123 MB)
└── frontend/           Next.js 16 App Router
    ├── app/            16 screens
    ├── hooks/          7 capture hooks (eye tracking, pen capture, analytics…)
    └── components/     57 UI primitives

Simulator_2/            synthetic dataset generator + training pipeline
├── config.py           six disorder profiles, five noise layers
├── dataset/generator/  Sigma-Lognormal pen model, E-Z Reader eye model
├── feature_engine/     the 23 feature extractors
├── training/           dataset loader + RandomForest training
└── tests/test_all.py   10 unit tests, including the anti-cheat check
```

Regenerate the dataset and retrain with `cd Simulator_2 && python run_all.py` (5,000 users, ~8 min).

---

## Limitations

- Trained on **synthetic, literature-calibrated data**, not on children. A school pilot is the next milestone.
- **Not a medical device** and not a diagnosis. It flags risk; a qualified professional decides.
- Webcam quality varies. Shake is filtered, and low-confidence sessions ask for a re-test rather than guessing.
- Requires a laptop, a tablet and a stylus — **one shared kit per school**, not a device per child.

---

## References

The model is built on published clinical work, not on intuition.

1. **Rayner, K. (1998)** — *Eye movements in reading and information processing.* → fixation durations, saccade lengths, regression probabilities
2. **Plamondon, R. (1995)** — *A kinematic theory of rapid human movements.* → Sigma-Lognormal stroke velocity profiles
3. **Rosenblum, S. et al. (2003)** — *Handwriting as an objective tool for diagnosis.* → pressure CV, stroke fragmentation
4. **Lam, S. et al. (2011)** — *Handwriting in DCD.* → pressure variability, jerk, pause frequency
5. **Nicolson, R. & Fawcett, A. (1990)** — *Automaticity deficits in dyslexia.* → motor rhythm, dual-task interference
