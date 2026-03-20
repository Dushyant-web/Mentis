import random
import uuid
import csv

NUM_USERS = 10000

# Realistic distribution
DISTRIBUTION = {
    "normal": 0.40,
    "mild": 0.25,
    "moderate": 0.20,
    "severe": 0.10,
    "dysgraphia": 0.05
}

def assign_disorder():
    r = random.random()
    cumulative = 0
    for k, v in DISTRIBUTION.items():
        cumulative += v
        if r <= cumulative:
            return k
    return "normal"

def generate_baselines(disorder):
    if disorder == "normal":
        return (
            random.randint(180, 250),  # reading speed
            random.uniform(0.8, 1.0)   # motor score
        )
    elif disorder == "mild":
        return (
            random.randint(140, 180),
            random.uniform(0.6, 0.85)
        )
    elif disorder == "moderate":
        return (
            random.randint(100, 140),
            random.uniform(0.4, 0.7)
        )
    elif disorder == "severe":
        return (
            random.randint(60, 100),
            random.uniform(0.2, 0.5)
        )
    elif disorder == "dysgraphia":
        return (
            random.randint(150, 220),
            random.uniform(0.2, 0.6)
        )

def generate_users():
    users = []

    for i in range(NUM_USERS):
        user_id = str(uuid.uuid4())
        age = random.randint(7, 18)

        disorder = assign_disorder()
        reading_speed, motor_score = generate_baselines(disorder)

        severity_score = round(random.uniform(0.3, 1.0), 2)

        users.append([
            user_id,
            age,
            disorder,
            severity_score,
            reading_speed,
            motor_score
        ])

    return users

def save_users(users):
    with open("../raw/users.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "user_id",
            "age",
            "disorder",
            "severity_score",
            "baseline_reading_speed",
            "baseline_motor_score"
        ])
        writer.writerows(users)

if __name__ == "__main__":
    users = generate_users()
    save_users(users)
    print(f"Generated {len(users)} users")