# 03 · Features

Everything MENTIS does, grouped by who uses it. **16 screens** in total.

## For the child

### Reading test — `/reading-test`
The child reads a passage while the webcam tracks their eyes. A live HUD shows
"Tracking Active" so the child (and the teacher) can see it is working.

Captured: iris position, gaze coordinates, blinks, fixations, saccades, regressions.

### Writing test — `/writing-test`
The child writes on a canvas with a stylus. Every pointer event is recorded: position,
pressure, tilt, timestamp, and whether the pen was down or lifted.

The finished canvas is also exported as a PNG and sent for OCR, so the system knows *what*
was written, not just *how*.

### Assessment — `/assessment`
The combined flow that runs both tests as one session and submits them together.

### Training — `/training` and `/training/exercise/[id]`
The daily practice plan. **27 exercise generators** produce content across three families:

**Reading** — reading_flow · word_recognition · regression_reduction · speed_reading ·
word_pair_matching · sentence_completion · phoneme_awareness · reading_comprehension

**Writing / motor** — letter_pattern · confusing_letters · word_copy · sentence_writing ·
dictation · letter_size · speed_writing · stroke_smoothness · pressure_control · fine_motor

**Cognitive / mixed** — memory_recall · rhythm_timing · visual_memory · multisensory ·
pattern_recognition · mirror_discrimination · letter_completion · problem_word_mastery ·
confusion_pair_mastery

Content is drawn from a bundled dataset: 323 graded words, 90 graded sentences, 50 mirror
pairs, 64 dictation words, 191 matching items and 90 poems.

## For the teacher and the school

### Dashboard — `/dashboard`
Per-child risk bands with confidence. Scores are smoothed with an exponential moving
average (**α = 0.4**) across sessions, so a single bad day never swings a child's profile.

### Diagnosis — `/diagnosis`
The result of a session: the predicted class, the confidence, and the reasoning.

### Analysis — `/analysis`
The feature-level view — which of the 23 signals were unusual, and by how much.

### Progress — `/progress` and `/progress/weekly`
Trend over time: fixation counts, pen-lift rates, exercise completion, streaks.

### Reports — `/reports/full`
A printable PDF report generated with PyMuPDF, suitable for a child's school file.

### Portal — `/portal`
The multi-student view. One login manages many students — designed for a school or an NGO
running screening at scale.

## For the parent

The same web app, same login system. A parent sees plain-language results for their own
child and the same daily exercises to run at home.

## For the clinician

Not a separate app — a different depth of the same data:

- the **23 raw features**, not just a label
- the **SHAP attribution** for every session, stored in `feature_attributions`
- full session history, so any result can be audited after the fact

This is the part that matters most for credibility: a clinician can ask *"why did it say
that?"* and get an actual answer.

## Cross-cutting capabilities

| Capability | Detail |
|---|---|
| **Adaptive difficulty** | A 5-level system (Beginner → Expert) computed from assessment stage (40 pts), risk scores (20), XP (15), assessment count (10), improvement trend (10) and streak (5). Improving children get *easier* levels, not harder — the system backs off when it is working. |
| **Confusion tracking** | A dedicated engine extracts confusion pairs from errors (b↔d, p↔q and so on) and feeds targeted exercises back to that specific child. |
| **Handwriting OCR** | Reads what was actually written, so a reversal is detected as a reversal rather than a wrong answer. |
| **Explainability** | SHAP TreeExplainer runs on every prediction. |
| **Low-confidence guard** | When the model is unsure it asks for a **re-test** instead of guessing. |
| **Text to speech** | `useSpeech` reads prompts aloud for dictation exercises. |
| **Auth** | Email/password and Google sign-in, JWT sessions. |
| **Analytics** | Engagement events tracked per session for longitudinal study. |

## Related reading

- [06 · Frontend](06-frontend.md) — how the capture screens work
- [07 · Backend](07-backend.md) — the APIs behind each screen
