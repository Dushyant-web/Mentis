# 09 · The synthetic dataset generator

Lives in `Simulator_2/`. This is the part most reviewers should interrogate hardest, so it
is documented in the most detail.

## Why synthetic data at all

Collecting eye-tracking and pen-stroke data from children with diagnosed learning
disabilities requires ethics approval, clinical partners, parental consent, and time none
of which a hackathon has. The honest alternative is not to fake results — it is to
**generate data from published clinical models and say so loudly.**

## What it produces

| | |
|---|---|
| Users | **5,000** |
| Sessions | **58,140** (5–20 per user) |
| Raw session files | 27,250 eye + 30,890 pen |
| Features per session | 23 |
| Classes | 6, balanced |

## The science underneath

The generators are not random noise dressed up. Each is an implementation of a published
model:

| Model | Paper | What it drives |
|---|---|---|
| **Sigma-Lognormal** | Plamondon, R. (1995) — *A kinematic theory of rapid human movements* | pen stroke velocity profiles |
| **E-Z Reader** | Rayner, K. (1998) — *Eye movements in reading* | Gamma-distributed fixations, probabilistic regressions |
| Handwriting diagnostics | Rosenblum, S. et al. (2003) | pressure CV, tremor, stroke fragmentation |
| Handwriting in DCD | Lam, S. et al. (2011) | pressure variability, jerk, pause frequency |
| Automaticity deficits | Nicolson, R. & Fawcett, A. (1990) | motor rhythm, dual-task interference |

## The six profiles

From `config.py`. These parameters are calibrated to the literature above.

| Parameter | Normal | Mild | Moderate | Severe | **Dysgraphia** | Both |
|---|---|---|---|---|---|---|
| Reading speed (wpm) | 215±30 | 170±28 | 130±25 | 85±22 | **195±30** | 95±22 |
| Motor score | 0.88±0.10 | 0.72±0.12 | 0.55±0.14 | 0.38±0.12 | **0.35±0.12** | 0.28±0.10 |
| Fixation (ms) | 230±40 | 275±50 | 340±65 | 470±90 | **245±45** | 420±80 |
| Regression % | 7% | 13% | 22% | 36% | **10%** | 30% |
| Pen lift frequency | 0.04 | 0.08 | 0.14 | 0.20 | **0.28** | 0.30 |
| Fragmentation | 0.03 | 0.07 | 0.12 | 0.18 | **0.25** | 0.28 |

**Read the dysgraphia column.** Reading speed 195 wpm and fixation 245 ms — essentially
normal. Motor score 0.35 and pen lifts 0.28 — worse than severe dyslexia. That contrast is
clinically accurate, and it is the entire reason two channels are needed.

## The five noise layers

Clean synthetic data produces a model that works beautifully on synthetic data and falls
apart on children. These layers exist to stop that.

| Layer | What it simulates | Setting |
|---|---|---|
| **Profile overlap** | real categories are not cleanly separated | 3–8× separation, not 22× |
| **Session variation** | the same child performs differently on different days — fatigue, focus, mood | ±12% per session |
| **Sensor jitter** | pen coordinate noise, gaze noise, timestamp irregularity | Gaussian σ = 0.10–0.12 |
| **Feature noise** | post-extraction measurement error on all 23 features | ±7% |
| **Label noise** | clinical misdiagnosis in the ground truth itself | 2% flip rate |

The last one is the most important and the least obvious: **real clinical labels are not
perfect either.** A model trained on flawless labels learns to expect a world that does not
exist.

Cost of these layers: **97.3% → 78.2%.** That drop is the point.

## The anti-cheat test

`tests/test_all.py` contains 10 unit tests. One of them, `test_no_cheating`, reads the
**source code of `dataset_loader.py` at runtime** and asserts:

- no `* 1.5` or `*1.5`
- no `multiply` keyword
- labels are never used to manipulate features

This exists because V1 had exactly that bug and reported a fake 99%
(see [08 · ML model](08-ml-model.md)). The test is the scar tissue.

## Pipeline

```
config.py                      profiles, noise settings, distribution mode
      ↓
user_generator.py              5,000 users, balanced across 6 classes
      ↓
session_generator.py           5–20 sessions each
      ↓
pen_simulator.py               Sigma-Lognormal + session noise + jitter
eye_simulator.py               E-Z Reader + session noise + gaze jitter
rhythm_engine.py               timing derived from the pen stream
      ↓
dataset/raw/                   ~58k CSV files
      ↓
feature_engine/                pen (12) + eye (5) + rhythm (6) = 23
      ↓
dataset/processed/             3 feature CSVs
      ↓
training/dataset_loader.py     merge + feature noise
training/train_model.py        RandomForest + label noise + report
      ↓
model/dyslexia_model.pkl + scaler.pkl
```

## Running it

```bash
cd Simulator_2
source venv/bin/activate

python run_all.py             # full pipeline, 5,000 users, ~8 minutes
python tests/test_all.py      # 10 unit tests — all must pass
python validate_separation.py # statistical class separation check
```

### Configuration

| Setting | Default | Meaning |
|---|---|---|
| `NUM_USERS` | 5000 | synthetic users |
| `MODE` | `"balanced"` | `balanced` (equal classes) or `realistic` (epidemiological) |
| `SESSION_NOISE_RANGE` | 0.12 | per-session variation |
| `FEATURE_NOISE_PERCENT` | 0.07 | post-extraction noise |
| `LABEL_NOISE_RATE` | 0.02 | label flip rate |

`MODE` is worth knowing about: training uses `balanced` so the model sees every class
equally, but `realistic` reproduces true epidemiological proportions for evaluation.

## The honest limitation

This is synthetic data. It is **literature-calibrated, not invented** — but it is not
children. The model has learned the patterns that clinical research says distinguish these
conditions; it has not yet been shown that real children match those patterns as cleanly.

That is why the roadmap's next step is a **school pilot**, and why nothing in this project
claims clinical-grade accuracy.

## Related reading

- [08 · ML model](08-ml-model.md) — what gets trained on this
- [12 · Limitations](12-limitations.md) — the full list of caveats
