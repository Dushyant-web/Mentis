# 05 · Tech stack

Every dependency, what it does here, and why it is there rather than an alternative.

## Frontend

| Package | Version | Why |
|---|---|---|
| **Next.js** | 16.1.6 | App Router, server rendering, file-based routing. One dynamic route (`/training/exercise/[id]`) needs SSR, which rules out a static export. |
| **React** | 19.2.4 | |
| **TypeScript** | — | The capture hooks pass structured point data around; types catch shape errors that would otherwise surface as bad features. |
| **Tailwind CSS** | v4 | Utility styling; v4 keeps its config in CSS, so there is no `tailwind.config.js`. |
| **Radix UI** | — | Accessible primitives (dialog, select, etc.) — 57 components are built on these. |
| **Recharts** | 2.15 | Dashboard and progress charts. |
| **Framer Motion** | 12.x | Screen transitions and the landing scroll-story. |
| **lucide-react** | — | Icon set. |
| **@mediapipe/face_mesh** | 0.4.x | **The eye channel.** 468 face landmarks plus iris refinement, running entirely in the browser. |
| **Web Speech API** | browser built-in | Reads prompts aloud for dictation exercises. |
| **PointerEvent API** | browser built-in | **The pen channel.** Pressure, tilt, coordinates, timing. |
| **Canvas 2D API** | browser built-in | The writing surface, and the PNG export for OCR. |

Two of the four capture technologies are browser built-ins. That is deliberate — it is why
this runs on a school laptop with nothing installed.

## Backend

| Package | Why |
|---|---|
| **FastAPI** | Async, typed, and generates the interactive `/docs` page — which doubles as a demo surface for judges. |
| **uvicorn** | ASGI server. |
| **Python 3.11.9** | Pinned in `runtime.txt`. |
| **SQLAlchemy** | ORM over the 17 tables. |
| **Alembic** | Schema migrations. |
| **Pydantic v2** | Request/response validation on every endpoint. |
| **psycopg2-binary** | PostgreSQL driver. |
| **redis** | Cache and rate limiting — both optional at runtime. |
| **python-jose** | JWT signing/verification, HS256. |
| **passlib · argon2-cffi · bcrypt** | Password hashing. |
| **google-auth** | Verifies Google ID tokens server-side. |
| **python-multipart** | File upload handling. |
| **python-dotenv** | Loads env vars in local development. |

## ML and vision

| Package | Why |
|---|---|
| **scikit-learn** | RandomForest classifier and StandardScaler. A forest is the right call here: 23 tabular features, a small dataset, and — critically — it is **explainable**. |
| **SHAP** | `TreeExplainer` gives exact per-feature contributions for tree models. This is what makes a result auditable. |
| **joblib** | Model serialisation. |
| **NumPy · pandas · SciPy** | Numeric work in feature building. |
| **EasyOCR** | Handwriting recognition. |
| **PyTorch (CPU build)** | EasyOCR's backend. Installed from the PyTorch CPU index so it does not drag in ~2 GB of CUDA packages. |
| **OpenCV (headless)** | Image preprocessing before OCR — crop to ink, downscale, thresholding. |
| **PyMuPDF** | PDF report generation. |
| **python-Levenshtein / rapidfuzz** | String similarity for OCR scoring. |
| **numba · llvmlite** | Numeric acceleration pulled in by the scientific stack. |

### Why RandomForest and not a neural network

1. **23 tabular features, not raw signal.** Deep learning's advantage is learning features
   from raw data. Our features already come from clinical literature — a net would mostly
   be relearning them, worse.
2. **Explainability is a requirement, not a bonus.** SHAP on a tree gives exact
   contributions. On a net you get approximations that a clinician cannot defend.
3. **It has to run on CPU in 2 GB.** A forest inference is milliseconds.
4. **The dataset is 58,140 rows.** That is small for deep learning and comfortable for a forest.

## Data and infrastructure

| Component | Choice |
|---|---|
| Database | **PostgreSQL 18** (Render managed) |
| Cache / rate limit | **Redis** (Render Key Value) |
| Frontend hosting | **Netlify** — Next.js runtime with SSR |
| Backend hosting | **Render** — uvicorn web service |
| Model artifact hosting | **GitHub Releases** — 123 MB `.pkl`, pulled and verified on boot |
| MediaPipe assets | **jsDelivr CDN** — loaded by the browser at runtime |

## Security

| Layer | Implementation |
|---|---|
| Transport | HTTPS everywhere (Netlify and Render both terminate TLS) |
| Sessions | JWT, HS256, `JWT_SECRET` from env, configurable expiry |
| Passwords | argon2 + bcrypt via passlib |
| Third-party identity | Google OAuth 2.0, ID token verified server-side against `GOOGLE_CLIENT_ID` |
| Route protection | Bearer guard dependency on every protected route |
| CORS | Explicit origin allow-list — wildcards are rejected when credentials are in play |
| Rate limiting | Redis token bucket on auth endpoints |
| Secrets | Every URL, key and client ID comes from environment variables. Nothing is hardcoded, nothing is committed. |

## What is deliberately *not* in the stack

Worth knowing, because architecture diagrams generated by tools often add these:

- **No Kafka, no queue, no background workers.** There is nothing asynchronous to process.
- **No S3 or object storage.** PDFs are generated on demand; the model comes from a GitHub release.
- **No Grafana, Prometheus or Sentry.** Monitoring is whatever the hosts provide.
- **No Docker in the deployment path.** Render builds from source.
- **No GPU.** Anywhere.
- **No Cloudflare configuration of our own.** Netlify uses its own edge.

## Related reading

- [08 · ML model](08-ml-model.md) — the model in detail
- [11 · Deployment](11-deployment.md) — how it is hosted
