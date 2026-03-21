"""
User Generator 2.0
Generates users with Gaussian-distributed baselines per disorder profile.
Output: dataset/raw/users.csv
Schema: user_id, age, disorder, severity_score, baseline_reading_speed, baseline_motor_score
"""

import csv
import uuid
import random
import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config import NUM_USERS, DISTRIBUTION, PROFILES, sample_from_profile


def assign_disorder():
    """Weighted random selection of disorder type."""
    labels = list(DISTRIBUTION.keys())
    weights = list(DISTRIBUTION.values())
    return random.choices(labels, weights=weights, k=1)[0]


def generate_users():
    users = []

    for _ in range(NUM_USERS):
        user_id = str(uuid.uuid4())
        disorder = assign_disorder()
        profile = PROFILES[disorder]

        age = random.randint(*profile["age_range"])

        # Gaussian baselines (clipped to realistic ranges)
        reading_speed = int(np.clip(
            sample_from_profile(disorder, "reading_speed"),
            40, 300
        ))
        motor_score = round(np.clip(
            sample_from_profile(disorder, "motor_score"),
            0.1, 1.0
        ), 4)

        # Severity is correlated with disorder type + individual variation
        base_severity = {
            "normal": 0.1, "mild": 0.35,
            "moderate": 0.55, "severe": 0.80,
            "dysgraphia": 0.65, "both": 0.85,
        }
        severity_score = round(np.clip(
            base_severity[disorder] + np.random.normal(0, 0.12),
            0.05, 1.0
        ), 2)

        users.append([
            user_id, age, disorder, severity_score,
            reading_speed, motor_score
        ])

    return users


def save_users(users, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "users.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "user_id", "age", "disorder", "severity_score",
            "baseline_reading_speed", "baseline_motor_score"
        ])
        writer.writerows(users)
    print(f"Generated {len(users)} users → {path}")


if __name__ == "__main__":
    users = generate_users()
    save_users(users, os.path.join(os.path.dirname(__file__), "..", "raw"))
