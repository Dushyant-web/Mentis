import random
import json
from pathlib import Path
from sqlalchemy import text

import hashlib

def generate_task_id(exercise):
    raw = json.dumps(exercise, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()

BASE_DIR = Path(__file__).resolve().parent.parent

# Safe loader

def safe_load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return []


def safe_load_csv(path):
    try:
        with open(path) as f:
            return [line.strip() for line in f.read().splitlines() if line.strip()]
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return []


MATCHING_DATA = safe_load_json(BASE_DIR / "dataset" / "MATCHING_MIXED.json")
POEMS = safe_load_json(BASE_DIR / "dataset" / "POEMS.json")

WORD_BANK = safe_load_csv(BASE_DIR / "dataset" / "WORD_BANK.csv")
SENTENCES = safe_load_csv(BASE_DIR / "dataset" / "SENTENCES.csv")
MIRROR_PAIRS = safe_load_csv(BASE_DIR / "dataset" / "MIRROR_PAIRS.csv")
AUDIO_DATA = safe_load_csv(BASE_DIR / "dataset" / "AUDIO.csv")

# Clean matching dataset
MATCHING_DATA = [q for q in MATCHING_DATA if isinstance(q, dict) and "answer" in q and "options" in q and q["answer"] in q["options"]]


# -------------------------
# EXERCISE BUILDER
# -------------------------

def build_exercise(ex_type, level="easy"):

    if not MATCHING_DATA:
        print("Warning: MATCHING_DATA empty")

    if ex_type == "confusion":
        pair = random.choice(MIRROR_PAIRS)
        return {
            "type": "pen",
            "mode": "mirror_training",
            "content": pair,
            "repeat": 20
        }

    elif ex_type == "reading_easy":
        return {
            "type": "eye",
            "mode": "word_read",
            "content": random.choice(WORD_BANK)
        }

    elif ex_type == "reading_medium":
        return {
            "type": "eye",
            "mode": "sentence_read",
            "content": random.choice(SENTENCES)
        }

    elif ex_type == "reading_hard":
        poem = random.choice(POEMS)
        return {
            "type": "eye",
            "mode": "paragraph_read",
            "title": poem.get("title"),
            "content": poem.get("text")
        }

    elif ex_type == "writing":
        words = random.sample(WORD_BANK, min(5, len(WORD_BANK)))
        return {
            "type": "pen",
            "mode": "copy_write",
            "words": words
        }

    elif ex_type == "matching":
        sample = random.sample(MATCHING_DATA, min(5, len(MATCHING_DATA)))
        return {
            "type": "mcq",
            "mode": "adaptive_matching",
            "questions": sample
        }

    elif ex_type == "motor":
        # This block may need to be adapted or removed if patterns are not defined.
        return None

    elif ex_type == "audio":
        source = AUDIO_DATA if AUDIO_DATA else WORD_BANK
        word = random.choice(source) if source else "test"

        return {
            "type": "audio",
            "mode": "speak_and_write",
            "content": word
        }

    return None


# -------------------------
# EVALUATION ENGINE (TEMP)
# -------------------------

def evaluate_exercise(exercise, user_input=None):
    """
    Realistic scoring (no random nonsense)
    """

    if not user_input:
        return {
            "accuracy": 0,
            "speed": 0,
            "consistency": 0,
            "score": 0
        }

    # BASIC LOGIC (can upgrade later)

    accuracy = 1.0
    speed = 1.0
    consistency = 1.0

    if exercise.get("type") == "mcq":
        correct = 0
        total = len(exercise.get("questions", []))

        for i, q in enumerate(exercise.get("questions", [])):
            if i < len(user_input) and user_input[i] == q["answer"]:
                correct += 1

        accuracy = correct / total if total > 0 else 0

    elif exercise.get("type") == "pen":
        # simple placeholder logic
        accuracy = (user_input or {}).get("accuracy", 0.7)
        speed = (user_input or {}).get("speed", 0.7)
        consistency = (user_input or {}).get("consistency", 0.7)

    elif exercise.get("type") == "eye":
        accuracy = (user_input or {}).get("focus_score", 0.7)
        speed = (user_input or {}).get("reading_speed", 0.7)
        consistency = (user_input or {}).get("stability", 0.7)

    elif exercise.get("type") == "audio":
        accuracy = (user_input or {}).get("speech_match", 0.7)
        speed = (user_input or {}).get("response_time", 0.7)
        consistency = (user_input or {}).get("clarity", 0.7)

    score = (accuracy * 0.5 + speed * 0.3 + consistency * 0.2)

    return {
        "accuracy": round(accuracy, 2),
        "speed": round(speed, 2),
        "consistency": round(consistency, 2),
        "score": round(score, 2)
    }

# -------------------------
# PROGRESS + XP SYSTEM (POSTGRESQL)
# -------------------------

# NOTE:
# This expects you to pass a DB cursor/connection from your route layer.
# Table schema (run in PostgreSQL):
#
# CREATE TABLE progress (
#   id SERIAL PRIMARY KEY,
#   user_id INT,
#   task_id TEXT,
#   xp INT,
#   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#   UNIQUE(user_id, task_id)
# );


def complete_exercise_db(db, user_id, exercise, user_input):
    """
    DB version:
    - prevents duplicate (UNIQUE constraint)
    - stores XP
    - tracks per day
    """

    task_id = generate_task_id(exercise)

    # Evaluate
    result = evaluate_exercise(exercise, user_input)

    base_xp = 10
    score = result.get("score", 0) or 0
    xp_earned = int(base_xp * score)

    try:
        insert_query = text("""
            INSERT INTO progress (user_id, task_id, xp)
            VALUES (:user_id, :task_id, :xp)
            ON CONFLICT (user_id, task_id) DO NOTHING
        """)

        db.execute(insert_query, {
            "user_id": user_id,
            "task_id": task_id,
            "xp": xp_earned
        })
        db.commit()

        check_query = text("""
            SELECT xp FROM progress WHERE user_id = :user_id AND task_id = :task_id
        """)

        result_row = db.execute(check_query, {
            "user_id": user_id,
            "task_id": task_id
        }).fetchone()

        if result_row is None:
            return {
                "message": "Task already completed",
                "xp": 0
            }

        return {
            "result": result,
            "xp_earned": xp_earned
        }

    except Exception as e:
        db.rollback()
        print("DB Error:", e)
        return {"error": "DB failure"}


def get_user_progress_db(db, user_id):
    """Total XP + completed count"""

    query = text("""
        SELECT COALESCE(SUM(xp), 0) AS total_xp, COUNT(*) AS completed
        FROM progress
        WHERE user_id = :user_id
    """)

    result_row = db.execute(query, {"user_id": user_id}).fetchone()

    total_xp = result_row.total_xp if result_row else 0
    completed = result_row.completed if result_row else 0

    return {
        "total_xp": total_xp,
        "completed_tasks": completed
    }


def get_daily_progress(db, user_id):
    """XP grouped by day (for graph)"""

    query = text("""
        SELECT DATE(created_at) AS day, SUM(xp) AS total_xp
        FROM progress
        WHERE user_id = :user_id
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """)

    rows = db.execute(query, {"user_id": user_id}).fetchall()

    return {
        "dates": [str(r.day) for r in rows],
        "xp": [r.total_xp for r in rows]
    }