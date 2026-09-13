# 02 · The solution

## The core idea, in one paragraph

Dyslexia is a **reading** disorder. Dysgraphia is a **writing/motor** disorder. In a
classroom they look almost identical — a child who is behind. In the *signal* they look
nothing alike. So MENTIS measures both channels at the same time, on hardware a school
already owns, and lets the difference between them do the separating.

## The two channels

| | Captured by | What dyslexia looks like | What dysgraphia looks like |
|---|---|---|---|
| **Eye** — reading | an ordinary webcam | eyes jump backwards a lot; more fixations, longer fixations | close to normal |
| **Pen** — motor | a stylus on a tablet | close to normal | broken strokes, constant pen lifts, erratic pressure |
| **Rhythm** — timing | derived from the pen stream | irregular | erratic, bursty |

That third channel matters more than it looks. Rhythm is what catches the children who have
**both** — the hardest class, and the one a single-channel tool cannot see at all.

## Why this is different from what exists

Real products already screen for dyslexia. We looked at them before building:

| Tool | What it does | Where it stops |
|---|---|---|
| **Lexplore** (Sweden, Karolinska Institutet) | AI + eye tracking on reading passages; ~40,000 children screened, ~10% flagged | needs a **dedicated eye tracker** |
| **Amira Learning** (USA) | listens to a child read aloud, flags risk, serves micro-lessons | **voice only** — no motor channel |
| **EarlyBird Education** (USA) | game-based literacy screener, ages 4–8 | **no eye or pen measurement** |

Every one of them reads **one** channel. None measure the pen and the eye together — which
is exactly what separates the two disorders. And none are built for the cost and scale
constraints of an Indian government school.

## What a session actually looks like

1. A child sits at a laptop with a tablet and stylus next to it.
2. They **read a passage** on screen for a few minutes. The webcam watches their eyes.
3. They **write a few lines** on the tablet. The stylus records every point.
4. The browser sends the two streams to the API.
5. The API turns them into **23 features**, scales them, and runs a **RandomForest**.
6. The result comes back: one of **6 outcomes**, a confidence, and a SHAP explanation of
   which features moved the score.
7. The child gets a **daily practice plan** targeted at what they actually struggled with.

**8–12 minutes.** No specialist required to run it.

## Screening, then practice — and why both

A screening tool that only screens is a one-off event. Nobody comes back.

MENTIS pairs the screening with a **daily practice plan** generated from the same profile
that produced the risk score. That is what turns it from a test into something a school
uses every week — and it is also what generates the longitudinal data that makes the next
screening better.

## What MENTIS is not

- **Not a diagnosis.** It is a screening aid. A registered professional confirms every result.
- **Not a replacement for a clinical psychologist.** It is triage *for* them — it tells them
  which children to see first, and hands them 23 measured features instead of a checklist.
- **Not trained on real children yet.** See [09 · Dataset generator](09-dataset-generator.md)
  and [12 · Limitations](12-limitations.md). A school pilot is the next milestone.

## Related reading

- [03 · Features](03-features.md) — everything it does
- [08 · ML model](08-ml-model.md) — how the decision is made
- [12 · Limitations](12-limitations.md) — the honest boundaries
