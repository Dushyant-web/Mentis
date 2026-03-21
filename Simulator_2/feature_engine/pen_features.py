"""
Pen Feature Extractor 2.0 — DYSGRAPHIA FIX

Extracts 12 features (up from 7):
  Original 7:
    1. isochrony_score
    2. homothety_score
    3. timing_variance
    4. avg_jerk
    5. pressure_variance
    6. letter_spacing_cv
    7. stroke_speed_mean
  New 5 (motor-specific for dysgraphia):
    8.  pen_lift_count          — number of zero-pressure points
    9.  micro_pause_count       — pauses 50-150ms within strokes
    10. stroke_fragmentation    — pressure drops to 0 mid-stroke
    11. letter_size_cv          — coefficient of variation of letter heights
    12. direction_variance      — stroke direction inconsistency

Output: dataset/processed/pen_features.csv
"""

import csv
import os
import numpy as np
from multiprocessing import Pool
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import NUM_WORKERS


def extract_pen_features(pen_data_path):
    """Extract 12 features from a pen session."""
    with open(pen_data_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    if len(data) < 5:
        return None

    timestamps = np.array([int(row["timestamp"]) for row in data], dtype=float)
    x_coords = np.array([float(row["x"]) for row in data], dtype=float)
    y_coords = np.array([float(row["y"]) for row in data], dtype=float)
    pressures = np.array([float(row["pressure"]) for row in data], dtype=float)

    durations = np.diff(timestamps)
    durations_pos = durations[durations > 0]
    if len(durations_pos) < 3:
        return None

    displacements = np.sqrt(np.diff(x_coords) ** 2 + np.diff(y_coords) ** 2)
    displacements_pos = displacements[displacements > 0]
    if len(displacements_pos) < 3:
        return None

    n_total = len(data)

    # ── ORIGINAL 7 FEATURES ──

    # 1. Isochrony Score
    isochrony = 1.0 / (1.0 + np.std(durations_pos))

    # 2. Homothety Score
    homothety = np.mean(displacements_pos) / (np.sum(displacements_pos) + 1e-6)

    # 3. Timing Variance
    timing_variance = np.var(durations_pos)

    # 4. Average Jerk
    min_len = min(len(displacements_pos), len(durations_pos))
    velocities = displacements_pos[:min_len] / durations_pos[:min_len]
    accel = np.diff(velocities)
    jerk = np.diff(accel)
    avg_jerk = float(np.mean(np.abs(jerk))) if len(jerk) > 0 else 0.0

    # 5. Pressure Variance
    pressure_variance = float(np.var(pressures))

    # 6. Letter Spacing CV
    x_diffs = np.abs(np.diff(x_coords))
    gap_threshold = np.percentile(x_diffs, 85)
    gaps = x_diffs[x_diffs > gap_threshold]
    letter_spacing_cv = float(np.std(gaps) / (np.mean(gaps) + 1e-6)) if len(gaps) > 1 else 0.0

    # 7. Stroke Speed Mean
    stroke_speed_mean = float(np.mean(velocities)) if len(velocities) > 0 else 0.0

    # ── NEW 5 MOTOR FEATURES ──

    # 8. Pen Lift Count (zero-pressure points / total points)
    pen_lifts = np.sum(pressures == 0.0)
    pen_lift_rate = float(pen_lifts / n_total)

    # 9. Micro-Pause Count (intervals 50-150ms / total intervals)
    micro_pauses = np.sum((durations >= 50) & (durations <= 150))
    micro_pause_rate = float(micro_pauses / max(1, len(durations)))

    # 10. Stroke Fragmentation (pressure drops to 0 between non-zero pressures)
    pressure_nonzero = pressures > 0
    if len(pressure_nonzero) > 2:
        transitions = np.diff(pressure_nonzero.astype(int))
        frag_count = np.sum(transitions == -1)  # going from writing to lifted
        stroke_fragmentation = float(frag_count / max(1, n_total // 10))
    else:
        stroke_fragmentation = 0.0

    # 11. Letter Size CV (variation in vertical extent per letter group)
    # Segment by large x-gaps (letter boundaries)
    x_diffs_all = np.diff(x_coords)
    if len(x_diffs_all) > 0:
        letter_boundaries = np.where(x_diffs_all > gap_threshold)[0]
        letter_heights = []
        prev = 0
        for b in letter_boundaries:
            segment_y = y_coords[prev:b+1]
            if len(segment_y) > 2:
                letter_heights.append(np.ptp(segment_y))
            prev = b + 1
        # Last segment
        if prev < len(y_coords) - 2:
            letter_heights.append(np.ptp(y_coords[prev:]))

        if len(letter_heights) > 1:
            lh = np.array(letter_heights)
            letter_size_cv = float(np.std(lh) / (np.mean(lh) + 1e-6))
        else:
            letter_size_cv = 0.0
    else:
        letter_size_cv = 0.0

    # 12. Direction Variance (stroke direction inconsistency)
    dx = np.diff(x_coords)
    dy = np.diff(y_coords)
    angles = np.arctan2(dy, dx)
    direction_variance = float(np.var(angles)) if len(angles) > 0 else 0.0

    return (
        float(isochrony),
        float(homothety),
        float(timing_variance),
        float(avg_jerk),
        float(pressure_variance),
        float(letter_spacing_cv),
        float(stroke_speed_mean),
        float(pen_lift_rate),
        float(micro_pause_rate),
        float(stroke_fragmentation),
        float(letter_size_cv),
        float(direction_variance),
    )


def _process_file(args):
    path, session_id = args
    features = extract_pen_features(path)
    if features is None:
        return None
    return [session_id] + [round(f, 6) for f in features]


def main():
    raw_pen_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "raw", "pen_data")
    output_file = os.path.join(os.path.dirname(__file__), "..", "dataset", "processed", "pen_features.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    files = [f for f in os.listdir(raw_pen_dir) if f.endswith(".csv")]
    print(f"Extracting pen features from {len(files)} files ({NUM_WORKERS} workers)...")

    args_list = [
        (os.path.join(raw_pen_dir, f), f.replace(".csv", ""))
        for f in files
    ]

    with Pool(NUM_WORKERS) as pool:
        results = pool.map(_process_file, args_list, chunksize=50)

    results = [r for r in results if r is not None]

    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "isochrony_score", "homothety_score", "timing_variance", "avg_jerk",
            "pressure_variance", "letter_spacing_cv", "stroke_speed_mean",
            "pen_lift_rate", "micro_pause_rate", "stroke_fragmentation",
            "letter_size_cv", "direction_variance",
        ])
        writer.writerows(results)

    print(f"Pen features ({len(results)} sessions, 12 features) → {output_file}")


if __name__ == "__main__":
    main()
