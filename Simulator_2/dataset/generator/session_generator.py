"""
Session Generator 2.0
Creates variable numbers of reading/writing sessions per user.
Output: dataset/raw/sessions.csv
Schema: session_id, user_id, type, timestamp, difficulty
"""

import csv
import uuid
import random
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config import SESSIONS_PER_USER_RANGE


def load_users(raw_dir):
    users = []
    with open(os.path.join(raw_dir, "users.csv"), "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.append(row)
    return users


def generate_sessions(users):
    sessions = []
    base_date = datetime(2026, 2, 15, 14, 0, 0)

    for user in users:
        user_id = user["user_id"]
        disorder = user["disorder"]

        # More severe = more sessions (they need more practice)
        session_min, session_max = SESSIONS_PER_USER_RANGE
        if disorder in ("severe", "dysgraphia"):
            n_sessions = random.randint(session_max // 2, session_max)
        elif disorder == "moderate":
            n_sessions = random.randint(session_min + 2, session_max - 2)
        else:
            n_sessions = random.randint(session_min, session_max // 2 + 3)

        for i in range(n_sessions):
            session_id = str(uuid.uuid4())

            # Alternate reading/writing with slight bias
            if disorder == "dysgraphia":
                # Dysgraphia users do more writing sessions
                s_type = random.choices(
                    ["writing", "reading"], weights=[0.65, 0.35], k=1
                )[0]
            else:
                s_type = random.choice(["reading", "writing"])

            difficulty = random.choice(["easy", "medium", "hard"])
            timestamp = (base_date + timedelta(days=i)).isoformat()

            sessions.append([session_id, user_id, s_type, timestamp, difficulty])

    return sessions


def save_sessions(sessions, raw_dir):
    os.makedirs(raw_dir, exist_ok=True)
    path = os.path.join(raw_dir, "sessions.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "user_id", "type", "timestamp", "difficulty"])
        writer.writerows(sessions)
    print(f"Generated {len(sessions)} sessions → {path}")


if __name__ == "__main__":
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    users = load_users(raw_dir)
    sessions = generate_sessions(users)
    save_sessions(sessions, raw_dir)
