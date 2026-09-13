# MENTIS — Documentation

Everything about this project, from "what is it" to "how does the classifier decide".

Each file stands on its own, but they are ordered so that reading top to bottom takes you
from zero context to being able to modify the code.

## Reading order

| # | File | What it answers | Read this if you are… |
|---|---|---|---|
| 01 | [The problem](01-problem.md) | Why does this need to exist at all? | anyone — start here |
| 02 | [The solution](02-solution.md) | What is MENTIS and what is the core idea? | anyone |
| 03 | [Features](03-features.md) | What can it actually do, screen by screen? | a judge, a teacher, a PM |
| 04 | [Architecture](04-architecture.md) | How do the pieces fit together? | a developer |
| 05 | [Tech stack](05-tech-stack.md) | What is every dependency and why is it there? | a developer |
| 06 | [Frontend](06-frontend.md) | How does the browser capture eye and pen data? | a frontend developer |
| 07 | [Backend](07-backend.md) | What does the API do with it? | a backend developer |
| 08 | [ML model](08-ml-model.md) | How does it decide, and how good is it? | an ML reviewer |
| 09 | [Dataset generator](09-dataset-generator.md) | Where did the training data come from? | an ML reviewer, a sceptic |
| 10 | [Workflow](10-workflow.md) | What happens end to end, in order? | anyone |
| 11 | [Deployment](11-deployment.md) | How is it hosted and how do I run it? | whoever deploys it |
| 12 | [Limitations](12-limitations.md) | What is it *not*, and what is next? | everyone, honestly |

## The 30-second version

A child reads a passage while an ordinary **webcam** tracks their eyes, then writes a few
lines while a **stylus** records every stroke. Those two streams become **23 numbers**, a
**RandomForest** scores them into **6 outcomes**, and **SHAP** explains which signal moved
the score. The result is a risk profile plus a daily practice plan.

Dyslexia shows up in the eyes. Dysgraphia shows up in the pen. Measuring both at once is
what separates them — and that is the whole idea.

> MENTIS is a **screening aid, not a clinical diagnosis.** A registered professional
> confirms every result.

## The numbers, in one place

| | |
|---|---|
| Features per session | **23** (5 eye · 12 pen · 6 rhythm) |
| Outcome classes | **6** (normal, mild, moderate, severe, dysgraphia, both) |
| Model accuracy | **78.22%** across 58,140 test sessions |
| Training data | 5,000 synthetic users · 58,140 sessions |
| API endpoints | **38** across 7 routers |
| Database tables | **17** |
| Frontend screens | **16** |
| Exercise generators | **27** |
| Memory footprint | ~1.05 GB — runs on a single 2 GB instance, CPU only |

Every number above is read from the code. If you change the code, update this table.
