"""
Rhythm Engine 2.0 — DYSGRAPHIA FIX

Extracts 6 features (up from 4):
  Original:
    1. timing_stability
    2. rhythm_consistency
    3. pause_density
    4. motor_rhythm_index
  New:
    5. burstiness_index — measures clustered irregular timing
    6. inter_stroke_entropy — Shannon entropy of timing intervals

Output: dataset/processed/rhythm_features.csv
"""

import csv
import os
import sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config import get_profile


def extract_rhythm_from_pen_data(pen_data_path):
    """Extract inter-stroke timing intervals from pen raw data."""
    with open(pen_data_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    if len(data) < 3:
        return []

    timings = []
    for i in range(1, len(data)):
        t1 = int(data[i - 1]["timestamp"])
        t2 = int(data[i]["timestamp"])
        dt = t2 - t1
        if dt > 0:
            timings.append(dt)

    return timings


def compute_rhythm_features(timings):
    """
    Compute 6 rhythm features from timing intervals.
    """
    if len(timings) < 3:
        return 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

    timings_arr = np.array(timings, dtype=float)

    # 1. Timing Stability
    variance = np.var(timings_arr)
    timing_stability = 1.0 / (1.0 + variance)

    # 2. Rhythm Consistency (CV-based)
    std = np.std(timings_arr)
    rhythm_consistency = 1.0 / (1.0 + std)

    # 3. Pause Density
    pause_threshold = 80
    pauses = np.sum(timings_arr > pause_threshold)
    pause_density = pauses / len(timings_arr)

    # 4. Motor Rhythm Index
    motor_rhythm_index = (
        0.4 * timing_stability +
        0.3 * rhythm_consistency +
        0.3 * (1 - pause_density)
    )

    # 5. Burstiness Index (NEW)
    # Measures how "bursty" vs "regular" the timing is
    # B = (σ - μ) / (σ + μ), range [-1, 1]
    # B > 0 = bursty (irregular), B < 0 = regular
    mean_t = np.mean(timings_arr)
    std_t = np.std(timings_arr)
    burstiness = float((std_t - mean_t) / (std_t + mean_t + 1e-6))
    burstiness = max(-1.0, min(1.0, burstiness))

    # 6. Inter-Stroke Entropy (NEW)
    # Shannon entropy of binned timing intervals
    # Higher entropy = more chaotic timing = disorder marker
    bins = np.linspace(0, max(500, np.max(timings_arr)), 20)
    hist, _ = np.histogram(timings_arr, bins=bins, density=True)
    hist = hist + 1e-10  # avoid log(0)
    hist = hist / np.sum(hist)  # normalize
    entropy = float(-np.sum(hist * np.log2(hist)))

    return (
        round(float(timing_stability), 6),
        round(float(rhythm_consistency), 6),
        round(float(pause_density), 6),
        round(float(motor_rhythm_index), 6),
        round(burstiness, 6),
        round(entropy, 6),
    )


def main():
    raw_pen_dir = os.path.join(os.path.dirname(__file__), "..", "raw", "pen_data")
    output_file = os.path.join(os.path.dirname(__file__), "..", "processed", "rhythm_features.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    files = [f for f in os.listdir(raw_pen_dir) if f.endswith(".csv")]
    print(f"Extracting rhythm features from {len(files)} pen data files...")

    results = []
    for i, file in enumerate(files):
        path = os.path.join(raw_pen_dir, file)
        timings = extract_rhythm_from_pen_data(path)
        features = compute_rhythm_features(timings)

        session_id = file.replace(".csv", "")
        results.append([session_id] + list(features))

        if i % 500 == 0:
            print(f"  Processed {i}/{len(files)} files")

    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "timing_stability", "rhythm_consistency",
            "pause_density", "motor_rhythm_index",
            "burstiness_index", "inter_stroke_entropy",
        ])
        writer.writerows(results)

    print(f"Rhythm features ({len(results)} sessions, 6 features) → {output_file}")


if __name__ == "__main__":
    main()
