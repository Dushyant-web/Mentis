# 08 · The ML model

## What it is

A **RandomForest classifier**: 300 trees, max depth 15, `class_weight="balanced"`,
trained on 23 features to predict one of 6 classes.

```
23 features → StandardScaler → RandomForest(300, depth 15) → 6 classes + confidence
                                        ↓
                              SHAP TreeExplainer → per-feature contribution
```

## The 23 features

Order is fixed by `FEATURE_NAMES` in `utils/feature_builder.py`. This order is a contract —
the scaler and the model were fitted on it.

### Eye — 5 features

| # | Feature | Signal |
|---|---|---|
| 1 | `fixation_count` | dyslexia: more fixations per line |
| 2 | `regression_count` | dyslexia: eyes jump backwards to re-read |
| 3 | `avg_fixation_duration` | dyslexia: longer dwell on each word |
| 4 | `saccade_velocity_mean` | dyslexia: slower jumps |
| 5 | `fixation_duration_cv` | dyslexia: irregular timing |

### Pen — 12 features

| # | Feature | Signal |
|---|---|---|
| 6 | `isochrony_score` | motor timing regularity |
| 7 | `homothety_score` | stroke size consistency |
| 8 | `timing_variance` | writing speed irregularity |
| 9 | `avg_jerk` | smoothness of movement |
| 10 | `pressure_variance` | pen pressure control |
| 11 | `letter_spacing_cv` | spatial consistency |
| 12 | `stroke_speed_mean` | writing velocity |
| 13 | `pen_lift_rate` | dysgraphia: constant lifting |
| 14 | `micro_pause_rate` | dysgraphia: 50–150 ms hesitations |
| 15 | `stroke_fragmentation` | dysgraphia: broken strokes |
| 16 | `letter_size_cv` | dysgraphia: inconsistent sizing |
| 17 | `direction_variance` | dysgraphia: shaky direction |

### Rhythm — 6 features

| # | Feature | Signal |
|---|---|---|
| 18 | `timing_stability` | motor rhythm regularity |
| 19 | `rhythm_consistency` | timing consistency |
| 20 | `pause_density` | fraction of long pauses |
| 21 | `motor_rhythm_index` | composite motor score |
| 22 | `burstiness_index` | erratic vs steady writing |
| 23 | `inter_stroke_entropy` | chaotic timing patterns |

## The 6 classes

`normal` · `mild` · `moderate` · `severe` · `dysgraphia` · `both`

The first four are a dyslexia severity ladder. `dysgraphia` is motor-only — **near-normal
reading with poor motor control**, which is the clinically interesting case a
reading-only tool would score as healthy. `both` is exactly what it sounds like, and it is
the hardest class.

## Accuracy

**78.22% overall** across 58,140 test sessions.

| Class | Recall | Why |
|---|---|---|
| moderate | **91%** | clearest signal — distinct reading *and* distinct motor |
| normal | **89%** | near-baseline on everything |
| mild | **86%** | slight reading impairment separates it from normal |
| severe | **84%** | extreme reading impairment |
| both | **64%** | hardest — combines severe and dysgraphia |
| dysgraphia | **61%** | motor-only, so it leans entirely on the pen features |

### Top features by importance

```
1. fixation_count         0.1359   ← eye
2. stroke_fragmentation   0.1116   ← motor
3. regression_count       0.1112   ← eye
4. avg_fixation_duration  0.1099   ← eye
5. pen_lift_rate          0.1053   ← motor
6. micro_pause_rate       0.0873   ← motor
7. pause_density          0.0817   ← rhythm
```

Both channels appear near the top, and in alternation. That is the thesis of the project
showing up in the model's own importances — neither channel alone would get here.

## The honesty story

**This is the part to read if you only read one section.**

### V1 reported 99%. It was wrong.

`dataset_loader.py` was multiplying features by **1.5×** whenever the label was
`dysgraphia`. The model had learned the inflation, not the disorder. Ninety-nine percent
of nothing.

### The fix, and what it cost

1. **Removed the scaling**, and wrote a unit test that inspects the loader's *own source
   code* at runtime, checking for `* 1.5`, `*1.5` and `multiply`, so it cannot come back.
2. **Fixed dysgraphia recall**, which was 0% — the model was ignoring the class entirely.
   Added 7 motor features and `class_weight="balanced"`. Recall went 0% → 95%.
3. **Added realistic noise.** 97.3% on clean synthetic data is not a real number.
   Five noise layers took it to 78.2%.

```
99%  →  72%  →  93.8%  →  97.3%  →  78.2%
cheat   fixed   upgraded  dysgraphia  realistic noise
                          fixed
```

**We kept the fall.** The last number is the only one we trust, and it is the one on every
slide.

### Why report 61% dysgraphia recall at all

Because a reviewer who opens the repo will find it. A weakness you disclose is a weakness
you control; a weakness someone else finds is a credibility problem. It is also honest
about what would improve it: a real pressure-sensitive stylus in a real pilot.

## Explainability — SHAP

A `shap.TreeExplainer` runs on every prediction in `routes/assessment.py`. For tree
ensembles it computes **exact** Shapley values, not approximations.

Output is persisted to the `feature_attributions` table, which means:

- a clinician can ask *"why did it say moderate?"* and get a per-feature answer
- a result from six months ago is still auditable
- the `/analysis` screen can show which signals were unusual and by how much

A screening tool that cannot explain itself is not defensible in a clinical context. This
is the feature that makes MENTIS a screening *aid* rather than a black box.

## Confidence and the re-test guard

The model returns `max(probabilities)` as confidence. When that margin is low, the system
**asks for a re-test instead of guessing**. A wrong confident answer about a child is worse
than no answer.

## Loading the model

`ml/model_loader.py`:

- resolves `MODEL_URL` / `SCALER_URL` from env, falling back to this repo's own GitHub
  release assets
- if the `.pkl` is absent, downloads it, writing to a `.part` file first
- **verifies the pickle header** (`0x80`) before publishing the file, so an HTML error page
  can never masquerade as a model
- raises with an actionable message rather than failing later inside joblib

## Related reading

- [09 · Dataset generator](09-dataset-generator.md) — where the training data came from
- [12 · Limitations](12-limitations.md) — what these numbers do and do not mean
