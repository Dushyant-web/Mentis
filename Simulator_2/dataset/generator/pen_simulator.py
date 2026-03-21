"""
Pen Simulator 2.0 — REALISTIC NOISE

Per-session variation: each session gets a slightly different profile
  (simulates fatigue, focus, mood).
Measurement jitter: small Gaussian noise on coordinates and timestamps.

Output: dataset/raw/pen_data/{session_id}.csv
Schema: session_id, x, y, timestamp, pressure
"""

import csv
import os
import sys
import math
import random
import numpy as np
from multiprocessing import Pool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config import (
    get_profile, NUM_WORKERS, apply_session_noise,
    PEN_JITTER_XY, PEN_TIMESTAMP_JITTER,
)


def load_users(raw_dir):
    users = {}
    with open(os.path.join(raw_dir, "users.csv"), "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["user_id"]] = row
    return users


def load_writing_sessions(raw_dir):
    sessions = []
    with open(os.path.join(raw_dir, "sessions.csv"), "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["type"] == "writing":
                sessions.append(row)
    return sessions


def lognormal_velocity(t, mu=0.5, sigma=0.3, amplitude=1.0):
    """Sigma-Lognormal velocity profile (Plamondon 1995)."""
    if t <= 0:
        return 0.0
    log_t = math.log(t)
    exponent = -((log_t - mu) ** 2) / (2 * sigma ** 2)
    return (amplitude / (t * sigma * math.sqrt(2 * math.pi))) * math.exp(exponent)


def generate_letter_stroke(profile, letter_idx, base_x, base_y, letter_scale):
    """Generate a single letter stroke with motor disorder features baked in."""
    noise = profile["pen_noise"]
    tremor = profile["pen_tremor"]
    pressure_stability = profile["pen_pressure_stability"]
    pressure_mean = profile["pen_pressure_mean"]
    frag_prob = profile["stroke_fragmentation"]
    micro_pause_dens = profile["micro_pause_density"]

    n_points = random.randint(25, 55)
    points = []

    letter_width = random.uniform(0.8, 1.5) * letter_scale
    letter_height = random.uniform(1.0, 2.5) * letter_scale
    mu = random.uniform(0.3, 0.7)
    sigma = random.uniform(0.2, 0.45)

    for i in range(n_points):
        t_norm = (i + 1) / n_points

        velocity = lognormal_velocity(t_norm, mu, sigma, amplitude=1.0)

        angle = t_norm * math.pi * random.uniform(0.8, 1.2)
        x = base_x + t_norm * letter_width * 10
        y = base_y + math.sin(angle) * letter_height

        # Tremor
        if tremor > 0:
            freq_x = random.uniform(5.0, 9.0)
            freq_y = random.uniform(4.0, 7.0)
            x += tremor * math.sin(i * freq_x) * random.uniform(0.5, 1.5)
            y += tremor * math.cos(i * freq_y) * random.uniform(0.5, 1.5)

        # Spatial noise
        x += random.gauss(0, noise)
        y += random.gauss(0, noise)

        # MEASUREMENT JITTER — sensor imperfection
        x += random.gauss(0, PEN_JITTER_XY)
        y += random.gauss(0, PEN_JITTER_XY)

        # Pressure instability
        pressure_noise = (1 - pressure_stability) * random.gauss(0, 0.18)
        pressure = max(0.05, min(1.0, pressure_mean + pressure_noise))

        # Velocity-based timing
        speed = max(velocity * 10, 0.5)
        dt = max(1, int(20 / speed * random.uniform(0.8, 1.2)))

        # TIMESTAMP JITTER — sensor timing noise
        dt += random.randint(-PEN_TIMESTAMP_JITTER, PEN_TIMESTAMP_JITTER)
        dt = max(1, dt)

        # MICRO-PAUSE
        if random.random() < micro_pause_dens:
            dt += random.randint(50, 150)

        # STROKE FRAGMENTATION
        if random.random() < frag_prob:
            points.append((x, y, random.randint(30, 100), 0.0))

        points.append((x, y, dt, pressure))

    return points


def simulate_pen(session, user_disorder, profile):
    """Generate full pen data with session variation and measurement noise."""
    strokes = []
    time = 0
    num_letters = random.randint(5, 12)

    size_var = profile["letter_size_variance"]
    lift_freq = profile["pen_lift_frequency"]
    burst_idx = profile["burstiness_index"]

    prev_x = 0

    for letter_idx in range(num_letters):
        letter_scale = max(0.3, random.gauss(1.0, size_var))

        spacing_cv = profile["pen_letter_spacing_cv"]
        base_spacing = random.uniform(8, 14)
        actual_spacing = base_spacing * max(0.3, random.gauss(1.0, spacing_cv))
        base_x = prev_x + actual_spacing
        prev_x = base_x

        base_y = random.uniform(-1, 1)

        if random.random() < profile["pen_pause_prob"]:
            time += random.randint(80, 500)

        if user_disorder in ("dysgraphia", "both") and random.random() < 0.15:
            time += random.randint(200, 700)

        if random.random() < lift_freq:
            strokes.append([
                session["session_id"],
                round(base_x + random.gauss(0, PEN_JITTER_XY), 4),
                round(base_y + random.gauss(0, PEN_JITTER_XY), 4),
                time,
                0.0,
            ])
            time += random.randint(60, 200)

        if random.random() < burst_idx:
            if random.random() < 0.5:
                time += random.randint(5, 15)
            else:
                time += random.randint(200, 600)

        letter_points = generate_letter_stroke(profile, letter_idx, base_x, base_y, letter_scale)

        for x, y, dt, pressure in letter_points:
            time += dt
            strokes.append([
                session["session_id"],
                round(x, 4),
                round(y, 4),
                time,
                round(pressure, 4)
            ])

        time += random.randint(30, 150)

    return strokes


def _process_session(args):
    """Worker: apply per-session noise, then generate."""
    session, user_disorder, base_profile, output_dir = args

    # Per-session variation — each session is slightly different
    session_seed = hash(session["session_id"]) % (2**31)
    noised_profile = apply_session_noise(base_profile, session_seed)

    data = simulate_pen(session, user_disorder, noised_profile)
    path = os.path.join(output_dir, f"{session['session_id']}.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "x", "y", "timestamp", "pressure"])
        writer.writerows(data)
    return session["session_id"]


def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    output_dir = os.path.join(raw_dir, "pen_data")
    os.makedirs(output_dir, exist_ok=True)

    users = load_users(raw_dir)
    sessions = load_writing_sessions(raw_dir)

    print(f"Generating pen data for {len(sessions)} writing sessions ({NUM_WORKERS} workers)...")

    args_list = []
    for session in sessions:
        user = users[session["user_id"]]
        disorder = user["disorder"]
        profile = get_profile(disorder)
        args_list.append((session, disorder, profile, output_dir))

    with Pool(NUM_WORKERS) as pool:
        results = pool.map(_process_session, args_list, chunksize=50)

    print(f"Pen data generation complete. ({len(results)} files)")


if __name__ == "__main__":
    main()
