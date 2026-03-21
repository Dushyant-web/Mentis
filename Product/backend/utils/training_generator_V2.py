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
# 🧠 EXTRACT CONFUSION PATTERNS (NEW)
# -----------------------------
def extract_confusions(errors):
    """
    errors: list of dicts like
    [{"expected": "b", "got": "d"}]
    """
    if not errors:
        return []

    confusion_map = {}

    for e in errors:
        a = e.get("expected")
        b = e.get("got")

        if not a or not b:
            continue

        key = tuple(sorted([a, b]))  # ('b','d')

        if key not in confusion_map:
            confusion_map[key] = 0

        confusion_map[key] += 1

    # sort by frequency (highest first)
    sorted_confusions = sorted(
        confusion_map.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # return list like ["b/d", "p/q"]
    return [f"{a}/{b}" for (a, b), _ in sorted_confusions]

# -----------------------------
# 🛠️ BUILD CONFUSION EXERCISES (NEW)
# -----------------------------
def build_confusion_exercises(confusions, repeat=20):
    """
    confusions: ["b/d", "p/q"]
    returns an exercise dict compatible with bank format
    """
    if not confusions:
        return None

    exercises = []
    for pair in confusions:
        parts = pair.split("/")
        if len(parts) != 2:
            continue
        a, b = parts
        exercises.append({
            "content": f"{a}{b}",
            "repeat": repeat
        })

    return {
        "name": "Adaptive Confusion Training",
        "type": "pen",
        "duration": "15min",
        "xp": 60,
        "exercises": exercises
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
def generate_today_plan(dyslexia_stage, dysgraphia_stage, errors=None):
    exercises = select_exercises(dyslexia_stage, dysgraphia_stage)

    # 🔥 ADAPTIVE: extract confusions from errors and build exercise
    confusions = extract_confusions(errors or [])
    adaptive_ex = build_confusion_exercises(confusions)

    # If adaptive exists, prioritize it
    if adaptive_ex:
        exercises.insert(0, adaptive_ex)

    formatted = []
    for ex in exercises:
        formatted.append({
            # IMPORTANT: ID must come from DB (TrainingTask.id)
            # This is a placeholder until DB-driven plan is used
            "id": None,
            "name": ex["name"],
            "type": ex["type"],
            "duration": ex["duration"],
            "xp": ex["xp"],
            "status": "pending",
            "data": ex
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
