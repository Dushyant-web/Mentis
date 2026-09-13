# 06 · Frontend

Next.js 16 App Router. The interesting part is not the UI — it is the **capture**.

## The eye channel — `hooks/useEyeTracking.ts`

### How it works

1. Request the webcam with `getUserMedia`, attach the stream to a hidden `<video>`.
2. Load **MediaPipe FaceMesh** with `refineLandmarks: true`, `maxNumFaces: 1`,
   `minDetectionConfidence: 0.5`. Refinement is what gives us the iris landmarks.
3. On every frame, read the landmark array.

### What we read from the landmarks

| Signal | Landmarks | Notes |
|---|---|---|
| **Iris centres** | `468` (left), `473` (right) | only present because `refineLandmarks` is on |
| **Gaze point** | midpoint of the two iris centres | smoothed with an EMA, **α = 0.35** |
| **Eye aspect ratio (left)** | `dist(159,145) / dist(130,243)` | vertical opening ÷ horizontal width |
| **Eye aspect ratio (right)** | `dist(386,374) / dist(362,263)` | |

### Derived on-device

| Event | Rule |
|---|---|
| **Blink** | EAR drops below **0.22** |
| **Fixation** | average gaze velocity below **25** |
| **Saccade** | the movement between two fixations |
| **Regression** | a saccade that travels backwards along the line — the key dyslexia marker |

### Sampling

Frames are processed continuously but only **sent every 50 ms** (`SEND_INTERVAL_MS = 50`),
giving a steady **20 Hz** stream. Sending every frame would flood the API for no gain —
fixations last far longer than 50 ms.

## The pen channel — `hooks/usePenTracking.ts`

### Raw, per point

Captured straight from `PointerEvent`:

| Field | Range | Notes |
|---|---|---|
| `x`, `y` | canvas coordinates | |
| `pressure` | 0.0 – 1.0 | **real only on a pressure-sensitive device.** A mouse reports a constant 0.5. |
| `tiltX`, `tiltY` | −90° to 90° | pen angle against the surface |
| `timestamp` | ms | |
| `type` | `start` / `move` / `end` | segment boundaries — this is how pen lifts are detected |

### Derived per stroke

Computed in `computeStrokeMetrics`:

| Metric | Definition |
|---|---|
| **speed / peak speed** | px per second |
| **acceleration** | peak speed ÷ duration |
| **tremor index** | direction reversals per ~50 px of path |
| **straightness** | net displacement ÷ total path length (1 = perfectly straight) |
| **pressure min / avg / max** | across the stroke |
| **tilt x / y average** | across the stroke |

### Why the derived metrics matter

Pressure and tilt only exist on a real stylus. On a mouse or a bare finger they flatten
out — but speed, tremor and straightness vary naturally on **any** device. So the motor
signal survives cheap hardware, which is the difference between a demo and something a
school can actually run.

There is also a live console readout (stroke number, position, speed bar, pressure, and a
`console.table` summary at stroke end) — useful during a demo to show the data is real.

## The canvas

The writing surface is a Canvas 2D element. Two things happen to it:

1. Every pointer event is recorded as structured data → becomes the pen features.
2. The finished drawing is exported as a **base64 PNG** → sent to `/assessment/analyze-canvas`
   for OCR.

So the system knows both *how* the child wrote and *what* they wrote.

## The other hooks

| Hook | Purpose |
|---|---|
| `useSpeech` | Web Speech API — reads prompts aloud for dictation |
| `useAnalytics` | posts engagement events to `/analytics/event` |
| `use-mobile` | responsive breakpoint detection |
| `use-toast` | notifications |
| `use-scroll-progress` | landing page scroll-story |

## Screens

16 pages under `app/`:

`(app)/` — dashboard · assessment · reading-test · writing-test · diagnosis · analysis ·
progress · progress/weekly · training · training/exercise/[id] · reports/full · portal · profile

`(auth)/` — login · signup

plus the landing page at `app/page.tsx`.

Only `/training/exercise/[id]` is dynamically rendered; everything else is static or
statically prerendered.

## Session handling

- Google Identity Services popup returns an **ID token**
- the token goes to `POST /auth/google`, which verifies it server-side
- the API returns a **JWT**, stored in `localStorage`
- `app/(app)/layout.tsx` acts as the route guard for everything behind auth
- `lib/api.ts` injects the `Authorization: Bearer` header on every call

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` are **inlined at build time** —
changing them requires a rebuild, not just a restart.

## Related reading

- [07 · Backend](07-backend.md) — what receives all this
- [08 · ML model](08-ml-model.md) — what the features become
