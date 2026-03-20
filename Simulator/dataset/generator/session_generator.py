import csv
import uuid
import random
from datetime import datetime, timedelta

MIN_SESSIONS = 5
MAX_SESSIONS = 20

def load_users():
    users = []
    with open("../raw/users.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.append(row)
    return users

def generate_sessions(users):
    sessions = []

    for user in users:
        num_sessions = random.randint(MIN_SESSIONS, MAX_SESSIONS)

        base_time = datetime.now() - timedelta(days=30)

        for i in range(num_sessions):
            session_id = str(uuid.uuid4())

            session_type = random.choice(["reading", "writing"])

            timestamp = base_time + timedelta(days=i)

            difficulty = random.choice(["easy", "medium", "hard"])

            sessions.append([
                session_id,
                user["user_id"],
                session_type,
                timestamp.isoformat(),
                difficulty
            ])

    return sessions

def save_sessions(sessions):
    with open("../raw/sessions.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "user_id",
            "type",
            "timestamp",
            "difficulty"
        ])
        writer.writerows(sessions)

if __name__ == "__main__":
    users = load_users()
    sessions = generate_sessions(users)
    save_sessions(sessions)
    print(f"Generated {len(sessions)} sessions")