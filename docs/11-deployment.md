# 11 · Deployment

## Topology

| Layer | Where | Notes |
|---|---|---|
| Frontend | **Netlify** | Next.js runtime, SSR |
| Backend | **Render** | uvicorn web service, Python 3.11.9 |
| Database | **Render PostgreSQL** | managed, 17 tables |
| Cache | **Render Key Value** | Redis-compatible, optional |
| Model artifacts | **GitHub Releases** | 123 MB `.pkl`, pulled on boot |
| MediaPipe assets | **jsDelivr** | loaded by the browser |

## Running locally

**Prerequisites:** Python 3.11, Node 18+, PostgreSQL, Redis.

```bash
# 1 · services
brew services start postgresql@18 redis
createdb neuro_app

# 2 · backend
cd Product/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill it in
uvicorn app:app --reload --port 8000

# 3 · frontend (second terminal)
cd Product/frontend
npm install
cp .env.example .env.local    # then fill it in
npm run dev
```

App on **http://localhost:3000**, interactive API docs on **http://localhost:8000/docs**.

The first OCR request takes 20–30 seconds while EasyOCR warms up. After that it is fast.

## Environment variables

### Backend

**Required — the app will not start without these**

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` |

**Required in production**

| Variable | Notes |
|---|---|
| `ALLOWED_ORIGINS` | comma-separated. Must contain the exact frontend origin. Trailing slashes are stripped automatically, but do not rely on it. |
| `GOOGLE_CLIENT_ID` | must match the frontend's value exactly |
| `MODEL_URL` / `SCALER_URL` | only needed if the `.pkl` files are not already on disk — which is the case on any fresh deploy. Defaults to this repo's own release assets. |

**Optional — sensible defaults**

| Variable | Default | If unset |
|---|---|---|
| `REDIS_URL` | — | caching and rate limiting are disabled; the app still runs |
| `JWT_EXPIRE_HOURS` | 24 | |
| `DB_POOL_SIZE` | 10 | on a 1-CPU instance, 5 is a better fit |
| `DB_MAX_OVERFLOW` | 20 | |

### Frontend

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend base URL, no trailing slash |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | same value as the backend's `GOOGLE_CLIENT_ID` |

Both are **inlined at build time**. Adding them after a deploy does nothing until you
rebuild with the cache cleared.

## Deploying the backend to Render

| Setting | Value |
|---|---|
| Root directory | `Product/backend` |
| Build command | `pip install --upgrade pip && pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt` |
| Start command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Instance | **2 GB minimum** |

### Why the build command looks like that

A plain `pip install -r requirements.txt` pulls the **CUDA build of PyTorch** on Linux —
a 531 MB wheel plus `nvidia-cudnn`, `nvidia-nccl`, `nvidia-cusparselt`, `nvidia-nvshmem`
and `triton`, roughly 2 GB of packages for a machine with no GPU. Installing the CPU wheel
first (190 MB, no nvidia dependencies) makes the later `-r requirements.txt` a no-op for
torch.

### Why 2 GB

Measured:

```
baseline              14 MB
+ joblib/sklearn      39 MB
+ RandomForest       422 MB
+ torch              577 MB
+ EasyOCR Reader    1057 MB
```

Plus uvicorn, FastAPI, SQLAlchemy and per-request buffers — about **1.2–1.5 GB** steady
state. A 512 MB instance is killed on boot.

## Deploying the frontend to Netlify

Configuration lives in `netlify.toml` at the repo root, so it does not depend on dashboard
fields:

```toml
[build]
  base    = "Product/frontend"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "22"
```

The plugin declaration matters. Without the Next.js runtime, Netlify serves `.next` as a
static folder — every route 404s and the build manifests become publicly readable.

## The three-way origin match

The single most common deployment failure. These must all agree:

1. **Netlify** — `NEXT_PUBLIC_API_URL` = the Render backend URL
2. **Render** — `ALLOWED_ORIGINS` = the exact Netlify origin, no trailing slash
3. **Google Cloud Console** — the Netlify domain listed as an **Authorized JavaScript origin**

Symptoms when they do not:

| Symptom | Cause |
|---|---|
| `Error 400: origin_mismatch` on Google sign-in | domain missing from Google Cloud Console |
| `No 'Access-Control-Allow-Origin' header` | `ALLOWED_ORIGINS` mismatch — check for a trailing slash |
| Frontend loads, dashboard empty | backend down, or `NEXT_PUBLIC_API_URL` wrong |

Also: **the webcam requires a secure context.** Anything other than `localhost` must be
served over HTTPS or eye tracking never starts.

## Deploy order

1. Provision Postgres and Redis, note their internal URLs
2. Deploy the backend, note its public URL
3. Set the frontend env vars to that URL, deploy the frontend, note its domain
4. Set `ALLOWED_ORIGINS` on the backend to that domain and restart
5. Add the domain to Google Cloud Console as an Authorized JavaScript origin

Doing it in the other order bakes a wrong or empty API URL into the frontend bundle.

## Migrating data between environments

```bash
pg_dump -d neuro_app --clean --if-exists --no-owner --no-privileges -f dump.sql
psql "$TARGET_URL" --single-transaction -v ON_ERROR_STOP=1 -f dump.sql
```

`--single-transaction` makes it all-or-nothing. `pg_dump` emits foreign keys after all
data, so table ordering is not a problem. Sequences are restored with `setval`, so the next
insert will not collide with an existing id.

## Related reading

- [04 · Architecture](04-architecture.md) — what is being deployed
- [12 · Limitations](12-limitations.md) — what is not production-hardened yet
