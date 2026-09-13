# 12 · Limitations and what is next

The section to read before claiming anything about this project.

## What MENTIS is not

### Not a diagnosis
It is a **screening aid**. It produces a risk profile, not a clinical finding. A registered
professional confirms every result. This is not legal hedging — it is what the evidence
supports.

### Not validated on children
The model is trained on **synthetic, literature-calibrated data**
(see [09 · Dataset generator](09-dataset-generator.md)). The parameters come from published
clinical research, but no real child has been screened and independently confirmed. Until a
pilot happens, 78.2% is accuracy *on synthetic test data*, not clinical sensitivity.

### Not a medical device
No regulatory clearance has been sought or obtained.

### Not a replacement for a clinical psychologist
It is triage. The intended effect is that scarce expert time goes to the children most
likely to need it, with 23 measured features already in hand.

## Technical limitations

| Limitation | Detail | Mitigation in place |
|---|---|---|
| **Pressure and tilt need a real stylus** | a mouse reports a constant 0.5 pressure and no tilt | speed, tremor and straightness are derived and vary on any device |
| **Webcam quality varies** | lighting, angle and camera quality all affect gaze | EMA smoothing (α = 0.35), `refineLandmarks`, and a low-confidence re-test prompt |
| **Dysgraphia recall is 61%** | the weakest class — motor-only, so it leans entirely on pen features | a real pressure-sensitive stylus in a pilot is what improves this |
| **`both` recall is 64%** | combines severe dyslexia and dysgraphia; the hardest class | the 6 rhythm features exist specifically for this case |
| **Requires a secure context** | the webcam API refuses to run over plain HTTP outside localhost | HTTPS everywhere in deployment |
| **No offline mode** | scoring happens server-side | not attempted; would need an on-device model |
| **English only** | content datasets and OCR are English | a real limitation for Indian government schools |
| **Single instance** | no horizontal scaling configured | fine at pilot scale; would need work at district scale |

## Operational limitations

- **No monitoring stack.** No Sentry, no Grafana, no alerting beyond what the hosts provide.
- **No automated test suite on the backend.** `Simulator_2/tests/test_all.py` covers the data
  pipeline (including the anti-cheat check), but the API itself has only a manual
  `test_api.py` script.
- **No CI.** Nothing runs the tests on push.
- **Cold starts.** A fresh instance downloads a 123 MB model and warms EasyOCR — about a
  minute before the first request is fast.

## Ethical considerations

### Labelling children
A screening result attached to an eight-year-old can follow them. This is why the system
never says "dyslexic" — it produces a risk band and refers onward, and why the low-confidence
re-test guard exists.

### Data sensitivity
Sessions contain biometric-adjacent data: gaze patterns and handwriting kinematics. Current
protections are JWT-guarded routes, hashed passwords, an explicit CORS allow-list and rate
limiting. A real deployment in schools would additionally need a data retention policy, parental
consent flows, and a formal DPIA — **none of which exist yet.**

### Bias
The model is trained on synthetic data generated from largely Western clinical literature.
Reading behaviour varies with script, language and instruction method. There is **no
evidence yet** that the parameters transfer cleanly to a child reading Hindi or Tamil, or
to a child whose difficulty is caused by poor instruction rather than a learning
disability. This is a real risk and a real research gap.

## The roadmap

### Now — working prototype
Deployed, public, end-to-end functional. Anyone can run a session.

### Next — school pilot
The single most important milestone. Everything else is secondary until real children have
been screened and results compared against professional assessment.

What a pilot would produce:
- real accuracy, sensitivity and specificity numbers
- a real stylus in real hands, which is what fixes dysgraphia recall
- evidence about whether the synthetic parameters transfer
- the consent and retention infrastructure a deployment needs

### Then — district screening
One tool, many schools, shared kits. Requires everything above plus horizontal scaling,
multi-language content, and a regulatory conversation.

## What would change our minds

Stated up front, because a project that cannot say what would falsify it is not doing
science:

- if pilot sensitivity is **below ~70%** on real children, the feature set needs rework before
  any deployment
- if dysgraphia recall does not improve materially with a real stylus, the motor channel
  needs more than pressure and tilt
- if the model performs differently across languages or scripts, it needs per-language
  calibration and cannot ship as one model

## Related reading

- [08 · ML model](08-ml-model.md) — the accuracy numbers in context
- [09 · Dataset generator](09-dataset-generator.md) — why synthetic, and how
