# training_generator_V2.py

from datetime import datetime


# -----------------------------
# 🧠 EXERCISE BANK
# -----------------------------
def get_exercise_bank():
    return {
        "reading": [
            {
                "name": "Reading Flow Exercise",
                "type": "eye",
                "duration": "10min",
                "xp": 50,
                "mode": "follow_highlight"
            },
            {
                "name": "Word Recognition Speed",
                "type": "eye",
                "duration": "7min",
                "xp": 45,
                "mode": "flashcards"
            }
        ],
        "writing": [
            {
                "name": "Letter Pattern Writing",
                "type": "pen",
                "duration": "8min",
                "xp": 40,
                "patterns": ["b", "d", "p", "q"]
            },
            {
                "name": "Confusing Letters Training",
                "type": "pen",
                "duration": "15min",
                "xp": 60,
                "exercises": [
                    {"content": "qp", "repeat": 20},
                    {"content": "bd", "repeat": 20}
                ]
            }
        ],
        "motor": [
            {
                "name": "Rhythm & Timing",
                "type": "rhythm",
                "duration": "5min",
                "xp": 30,
                "mode": "tap_sync"
            }
        ]
    }


# -----------------------------
# 🎯 SELECT EXERCISES BASED ON LEVEL
# -----------------------------
def select_exercises(dyslexia_stage, dysgraphia_stage):
    bank = get_exercise_bank()
    selected = []

    # reading heavy
    if dyslexia_stage == "stage_3":
        selected += bank["reading"]
    elif dyslexia_stage == "stage_2":
        selected.append(bank["reading"][0])

    # writing heavy
    if dysgraphia_stage in ["stage_2", "stage_3"]:
        selected += bank["writing"]
    else:
        selected.append(bank["writing"][0])

    # always include motor
    selected += bank["motor"]

    return selected


# -----------------------------
# 📅 GENERATE TODAY PLAN
# -----------------------------
def generate_today_plan(dyslexia_stage, dysgraphia_stage):
    exercises = select_exercises(dyslexia_stage, dysgraphia_stage)

    formatted = []
    for i, ex in enumerate(exercises):
        formatted.append({
            "id": i + 1,
            "name": ex["name"],
            "type": ex["type"],
            "duration": ex["duration"],
            "xp": ex["xp"],
            "status": "pending",
            "data": ex  # full exercise config for frontend
        })

    return formatted


# -----------------------------
# 📊 MAIN PROGRAM GENERATOR
# -----------------------------
def generate_program(dyslexia_stage, dysgraphia_stage):
    today_exercises = generate_today_plan(dyslexia_stage, dysgraphia_stage)

    total_xp = sum(e["xp"] for e in today_exercises)

    return {
        "program": {
            "total_weeks": 8,
            "current_week": 1,
            "generated_at": datetime.utcnow().isoformat(),
            "xp_today_total": total_xp,

            "today": {
                "progress": 0,
                "exercises": today_exercises
            }
        }
    }
