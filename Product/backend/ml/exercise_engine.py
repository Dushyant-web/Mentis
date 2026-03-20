import random

# -------------------------
# WORD BANK
# -------------------------
WORD_BANK = {
    "easy": ["cat", "dog", "sun", "pen"],
    "medium": ["school", "water", "friend"],
    "hard": ["confusion", "development", "intelligence"]
}

# -------------------------
# EXERCISE BUILDER
# -------------------------
def build_exercise(ex_type, level):
    if ex_type == "confusion":
        return {
            "type": "pen",
            "mode": "write_repeat",
            "content": random.choice(["qp", "bd", "mn"]),
            "repeat": 20
        }

    elif ex_type == "word_write":
        word = random.choice(WORD_BANK[level])
        return {
            "type": "pen",
            "mode": "write_word",
            "content": word
        }

    elif ex_type == "reading":
        word = random.choice(WORD_BANK[level])
        return {
            "type": "eye",
            "mode": "flash_read",
            "content": word,
            "time_limit": 3
        }

    elif ex_type == "matching":
        word = random.choice(WORD_BANK[level])
        return {
            "type": "mcq",
            "mode": "match_word",
            "question": word,
            "options": [word, "wrong1", "wrong2"]
        }

    elif ex_type == "motor":
        return {
            "type": "pen",
            "mode": "trace",
            "pattern": random.choice(["line", "circle", "zigzag"])
        }

    return None


# -------------------------
# EVALUATION ENGINE
# -------------------------
def evaluate_exercise(exercise, user_input):
    """
    user_input = depends on frontend later
    For now simulate scoring
    """

    # simple simulation (upgrade later)
    accuracy = random.uniform(0.6, 1.0)
    speed = random.uniform(0.5, 1.0)
    consistency = random.uniform(0.5, 1.0)

    score = (accuracy * 0.5 + speed * 0.3 + consistency * 0.2)

    return {
        "accuracy": round(accuracy, 2),
        "speed": round(speed, 2),
        "consistency": round(consistency, 2),
        "score": round(score, 2)
    }