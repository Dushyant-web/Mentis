"""
Eye Simulator 2.0 — REALISTIC NOISE

Per-session variation and gaze measurement jitter.

Output: dataset/raw/eye_data/{session_id}.csv
Schema: session_id, gaze_x, gaze_y, timestamp
"""

import csv
import os
import sys
import random
import numpy as np
from multiprocessing import Pool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config import (
    get_profile, NUM_WORKERS, apply_session_noise,
    EYE_GAZE_JITTER,
)

WORDS_PER_LINE = 10
LINES = 5
SAMPLE_INTERVAL = 20  # ms


def load_users(raw_dir):
    users = {}
    with open(os.path.join(raw_dir, "users.csv"), "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["user_id"]] = row
    return users


def load_reading_sessions(raw_dir):
    sessions = []
    with open(os.path.join(raw_dir, "sessions.csv"), "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["type"] == "reading":
                sessions.append(row)
    return sessions


def gamma_fixation(mean_ms, std_ms):
    """Sample fixation duration from Gamma distribution (Rayner 1998)."""
    if std_ms <= 0:
        return max(50, int(mean_ms))
    shape = (mean_ms / std_ms) ** 2
    scale = (std_ms ** 2) / mean_ms
    return max(50, int(np.random.gamma(shape, scale)))


def simulate_eye(session, disorder, profile):
    """Generate eye tracking data with measurement noise."""
    fix_mean = profile["fixation_mean"]
    fix_std = profile["fixation_std"]
    regression_prob = profile["regression_prob"]
    saccade_mean = profile["saccade_length_mean"]
    saccade_std = profile["saccade_length_std"]

    path = [(x, y) for y in range(LINES) for x in range(WORDS_PER_LINE)]
    gaze_data = []
    time = 0
    i = 0

    while i < len(path):
        word_x, word_y = path[i]
        fixation_ms = gamma_fixation(fix_mean, fix_std)
        n_samples = max(1, fixation_ms // SAMPLE_INTERVAL)

        for s in range(n_samples):
            # Base jitter + MEASUREMENT NOISE (sensor imperfection)
            jitter_x = np.random.normal(0, 0.12) + np.random.normal(0, EYE_GAZE_JITTER)
            jitter_y = np.random.normal(0, 0.08) + np.random.normal(0, EYE_GAZE_JITTER)
            gaze_data.append([
                session["session_id"],
                round(word_x + jitter_x, 4),
                round(word_y + jitter_y, 4),
                time
            ])
            time += SAMPLE_INTERVAL

        # Next movement
        if random.random() < regression_prob and i > 2:
            regression_distance = random.randint(1, min(3, i))
            i -= regression_distance
        else:
            saccade_len = max(1, int(np.random.normal(saccade_mean, saccade_std)))
            if disorder in ("severe", "moderate", "both") and random.random() < 0.1:
                saccade_len = 0  # re-fixation
            i += max(1, saccade_len // 3)

    return gaze_data


def _process_session(args):
    """Worker: apply per-session noise, then generate."""
    session, disorder, base_profile, output_dir = args

    # Per-session variation
    session_seed = hash(session["session_id"]) % (2**31)
    noised_profile = apply_session_noise(base_profile, session_seed)

    data = simulate_eye(session, disorder, noised_profile)

    path = os.path.join(output_dir, f"{session['session_id']}.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "gaze_x", "gaze_y", "timestamp"])
        writer.writerows(data)
    return session["session_id"]


def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    output_dir = os.path.join(raw_dir, "eye_data")
    os.makedirs(output_dir, exist_ok=True)

    users = load_users(raw_dir)
    sessions = load_reading_sessions(raw_dir)

    print(f"Generating eye data for {len(sessions)} reading sessions ({NUM_WORKERS} workers)...")

    args_list = []
    for session in sessions:
        user = users[session["user_id"]]
        disorder = user["disorder"]
        profile = get_profile(disorder)
        args_list.append((session, disorder, profile, output_dir))

    with Pool(NUM_WORKERS) as pool:
        results = pool.map(_process_session, args_list, chunksize=50)

    print(f"Eye data generation complete. ({len(results)} files)")


if __name__ == "__main__":
    main()
