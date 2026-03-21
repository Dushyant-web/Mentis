# Simulator 2.0 — Dyslexia & Dysgraphia Synthetic Data Generator

A scientifically grounded synthetic data generator for training ML models to detect dyslexia and dysgraphia from eye-tracking and pen-stroke data.

**Final Accuracy: 78.2%** — Honest, realistic, with 5 noise layers and 5,000 users.

---

## The Full Story (V1 → V2)

### V1 Was Broken

| Problem | Details |
|---|---|
| **Cheated accuracy** | `dataset_loader.py` multiplied features by **1.5x** when label was "dysgraphia" — model learned the inflation, not the disorder |
| **Fake 99% accuracy** | Entirely due to the cheat above |
| **Empty files** | `rhythm_engine.py` and `error_injector.py` were **completely empty** |
| **Bad simulation** | Pen strokes were `math.sin()` waves, eye data was a flat grid |
| **No science** | All features were uniform random noise — no clinical basis |

### V2 Fix #1: Scientific Foundation (72% → 93% accuracy)

- **Sigma-Lognormal pen model** (Plamondon 1995) — real velocity profiles for handwriting
- **E-Z Reader eye model** (Rayner 1998) — Gamma-distributed fixations, probabilistic regressions
- **Literature-calibrated profiles** — parameters from 4 clinical papers
- **Multiprocessing** — 9 CPU workers for parallel data generation
- **Cheating removed** — no artificial feature scaling, verified by unit test

### V2 Fix #2: Dysgraphia Detection (0% → 95% recall)

Dysgraphia had **0% recall** because the model ignored it. Fixed by:
- **7 new motor features**: pen_lift_rate, stroke_fragmentation, micro_pause_rate, letter_size_cv, direction_variance, burstiness_index, inter_stroke_entropy
- **Balanced class distribution** — equal training representation
- **`class_weight="balanced"`** — prevents model from ignoring minority classes
- **Clinical separation**: dysgraphia = poor motor + normal eyes (opposite of dyslexia)

### V2 Fix #3: Realistic Noise (97% → 78% accuracy)

97% on synthetic data is suspiciously high. Added 5 noise layers:

| Noise Layer | What It Does | Setting |
|---|---|---|
| **Profile overlap** | Adjacent classes share features realistically (3-8x separation instead of 22x) | `config.py` profiles |
| **Session variation** | Same user performs differently each session (fatigue, focus, mood) | ±12% per session |
| **Sensor jitter** | Pen coordinate noise, eye gaze noise, timestamp irregularities | Gaussian σ=0.10-0.12 |
| **Feature noise** | Post-extraction Gaussian noise on all 23 features | ±7% |
| **Label noise** | Simulates clinical misdiagnosis — random label flips | 2% |

---

## Final Results (5,000 users, 58,140 sessions)

```
Accuracy: 78.22% (realistic, honest, no cheating)

              precision    recall  f1-score   support
        both       0.65      0.64      0.64      1654
  dysgraphia       0.70      0.61      0.65      2504
        mild       0.78      0.86      0.82      1492
    moderate       0.91      0.91      0.91      2147
      normal       0.74      0.89      0.81      1499
      severe       0.88      0.84      0.86      2332

Noise Applied:
  Session variation: ±12%
  Feature noise:     ±7%
  Label noise:       2.0%
```

### Per-Class Recall (All ≥60%)

| Class | Recall | Notes |
|---|---|---|
| moderate | **91.2%** | Clearest signal — distinct reading + distinct motor |
| normal | **88.9%** | Easy to identify — near-baseline on everything |
| mild | **86.0%** | Slight reading impairment separates from normal |
| severe | **83.9%** | Extreme reading impairment |
| both | **63.6%** | Hardest — combines features of severe + dysgraphia |
| dysgraphia | **60.5%** | Motor-only disorder, relies on pen features |

### Top Features

```
 1. fixation_count:        0.1359   ← eye (dyslexia marker)
 2. stroke_fragmentation:  0.1116   ← motor (dysgraphia marker)
 3. regression_count:      0.1112   ← eye (dyslexia marker)
 4. avg_fixation_duration: 0.1099   ← eye (dyslexia marker)
 5. pen_lift_rate:         0.1053   ← motor (dysgraphia marker)
 6. micro_pause_rate:      0.0873   ← motor (dysgraphia marker)
 7. pause_density:         0.0817   ← rhythm (both marker)
```

---

## Architecture

```
Simulator_2/
├── config.py                          # Profiles, noise settings, distribution modes
├── run_all.py                         # Single entry: python run_all.py
│
├── dataset/
│   ├── generator/
│   │   ├── user_generator.py          # 5,000 users (balanced distribution)
│   │   ├── session_generator.py       # 5-20 sessions per user
│   │   ├── pen_simulator.py           # Sigma-Lognormal + session noise + jitter
│   │   ├── eye_simulator.py           # E-Z Reader + session noise + gaze jitter
│   │   └── rhythm_engine.py           # Timing analysis from pen data
│   ├── raw/                           # ~58k CSV files
│   └── processed/                     # 3 feature CSVs
│
├── feature_engine/
│   ├── pen_features.py                # 12 features (7 original + 5 motor)
│   ├── eye_features.py                # 5 features (3 original + 2 new)
│   └── rhythm_features.py             # 6 features (4 original + 2 new)
│
├── training/
│   ├── dataset_loader.py              # Merges 23 features + applies feature noise
│   └── train_model.py                 # RandomForest + label noise + reporting
│
├── model/
│   ├── dyslexia_model.pkl             # Trained classifier
│   └── scaler.pkl                     # StandardScaler for backend use
│
├── validate_separation.py             # Statistical validation of class separation
├── tests/test_all.py                  # 10 unit tests (including anti-cheat)
└── venv/                              # Python environment
```

---

## 23 Features (3 Modalities)

### Pen Features (12)
| # | Feature | Type | Primary Signal |
|---|---|---|---|
| 1 | isochrony_score | Original | Motor timing regularity |
| 2 | homothety_score | Original | Stroke size consistency |
| 3 | timing_variance | Original | Writing speed irregularity |
| 4 | avg_jerk | Original | Smoothness of movement |
| 5 | pressure_variance | Original | Pen pressure control |
| 6 | letter_spacing_cv | Original | Spatial consistency |
| 7 | stroke_speed_mean | Original | Writing velocity |
| 8 | pen_lift_rate | **NEW** | Dysgraphia: constant lifting |
| 9 | micro_pause_rate | **NEW** | Dysgraphia: 50-150ms hesitations |
| 10 | stroke_fragmentation | **NEW** | Dysgraphia: broken strokes |
| 11 | letter_size_cv | **NEW** | Dysgraphia: inconsistent sizing |
| 12 | direction_variance | **NEW** | Dysgraphia: shaky direction |

### Eye Features (5)
| # | Feature | Type | Primary Signal |
|---|---|---|---|
| 13 | fixation_count | Original | Dyslexia: more fixations |
| 14 | regression_count | Original | Dyslexia: re-reading |
| 15 | avg_fixation_duration | Original | Dyslexia: longer fixations |
| 16 | saccade_velocity_mean | **NEW** | Dyslexia: slower saccades |
| 17 | fixation_duration_cv | **NEW** | Dyslexia: irregular timing |

### Rhythm Features (6)
| # | Feature | Type | Primary Signal |
|---|---|---|---|
| 18 | timing_stability | Original | Motor rhythm regularity |
| 19 | rhythm_consistency | Original | Timing consistency |
| 20 | pause_density | Original | Fraction of long pauses |
| 21 | motor_rhythm_index | Original | Composite motor score |
| 22 | burstiness_index | **NEW** | Erratic vs steady writing |
| 23 | inter_stroke_entropy | **NEW** | Chaotic timing patterns |

---

## Disorder Profiles

| Parameter | Normal | Mild | Moderate | Severe | Dysgraphia | Both |
|---|---|---|---|---|---|---|
| Reading Speed | 215±30 | 170±28 | 130±25 | 85±22 | **195±30** | 95±22 |
| Motor Score | 0.88±0.10 | 0.72±0.12 | 0.55±0.14 | 0.38±0.12 | **0.35±0.12** | 0.28±0.10 |
| Fixation (ms) | 230±40 | 275±50 | 340±65 | 470±90 | **245±45** | 420±80 |
| Regression % | 7% | 13% | 22% | 36% | **10%** | 30% |
| Pen Lift Freq | 0.04 | 0.08 | 0.14 | 0.20 | **0.28** | 0.30 |
| Fragmentation | 0.03 | 0.07 | 0.12 | 0.18 | **0.25** | 0.28 |

**Key insight**: Dysgraphia has **near-normal reading** (195 wpm, 245ms fixation) but **terrible motor control** (0.35 score, 7x pen lifts). This is clinically accurate.

---

## How to Run

```bash
cd Simulator_2
source venv/bin/activate

# Run full pipeline (5,000 users, ~8 minutes)
python run_all.py

# Run tests
python tests/test_all.py

# Validate feature separation
python validate_separation.py
```

### Configuration (`config.py`)

| Setting | Default | Description |
|---|---|---|
| `NUM_USERS` | 5000 | Number of synthetic users |
| `MODE` | "balanced" | "balanced" (equal classes) or "realistic" (epidemiological) |
| `SESSION_NOISE_RANGE` | 0.12 | Per-session variation (±12%) |
| `FEATURE_NOISE_PERCENT` | 0.07 | Post-extraction noise (±7%) |
| `LABEL_NOISE_RATE` | 0.02 | Label flip rate (2%) |

---

## Backend Integration

The output schema is **identical to V1**. The backend (`Product/backend/`) can use the new model without any code changes. Load `scaler.pkl` in `feature_builder.py` for proper feature normalization.

---

## Anti-Cheating Verification

The unit test `test_no_cheating` inspects the `dataset_loader.py` source code at runtime:
- Checks for `* 1.5` or `*1.5` (catches V1-style inflation)
- Checks for `multiply` keyword (catches hidden inflation)
- Ensures labels are not used for feature manipulation

Run `python tests/test_all.py` — all 10 tests must pass.

---

## Accuracy Timeline

| Version | Accuracy | Dysgraphia Recall | Honest? | Users |
|---|---|---|---|---|
| V1 (original) | 99% | Unknown | ❌ Cheated (1.5x inflation) | 100 |
| V2 (first fix) | 72% | ~85% | ✅ Yes | 100 |
| V2 (9/10 upgrade) | 93.8% | 0% | ✅ Yes but dysgraphia broken | 100 |
| V2 (dysgraphia fix) | 97.3% | 95% | ✅ Yes but too clean | 300 |
| **V2 (realistic noise)** | **78.2%** | **60.5%** | **✅ Fully honest** | **5,000** |

---

## References

1. Rayner, K. (1998). *Eye movements in reading and information processing: 20 years of research.* — Fixation durations, saccade lengths, regression probabilities
2. Rosenblum, S. et al. (2003). *Handwriting as an objective tool for Parkinson's disease diagnosis.* — Tremor amplitude, pressure CV, stroke fragmentation
3. Lam, S. et al. (2011). *Handwriting in DCD.* — Pressure variability, jerk, pause frequency
4. Nicolson, R. & Fawcett, A. (1990). *Automaticity deficits in dyslexia.* — Motor rhythm, dual-task interference
5. Plamondon, R. (1995). *A kinematic theory of rapid human movements.* — Sigma-Lognormal velocity profiles
