"""
Eye Feature Extractor 2.0 — UPGRADED

Extracts 5 features (up from 3):
  1. fixation_count
  2. regression_count
  3. avg_fixation_duration
  4. saccade_velocity_mean (NEW)
  5. fixation_duration_cv (NEW — coefficient of variation)

Uses vectorized numpy for performance.
Output: dataset/processed/eye_features.csv
"""

import csv
import os
import numpy as np
from multiprocessing import Pool
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import NUM_WORKERS

SAMPLE_INTERVAL = 20  # ms between samples


def extract_eye_features(eye_data_path):
    """Extract features using vectorized numpy operations."""
    with open(eye_data_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    if len(data) < 5:
        return None

    gaze_x = np.array([float(row["gaze_x"]) for row in data])
    gaze_y = np.array([float(row["gaze_y"]) for row in data])
    timestamps = np.array([int(row["timestamp"]) for row in data])

    # Word positions (integer part of gaze_x)
    word_pos = np.round(gaze_x).astype(int)

    # Detect fixation boundaries (where word position changes)
    changes = np.where(np.diff(word_pos) != 0)[0] + 1
    boundaries = np.concatenate(([0], changes, [len(word_pos)]))

    # Fixation groups
    fixation_durations = []
    for i in range(len(boundaries) - 1):
        start_idx = boundaries[i]
        end_idx = boundaries[i + 1] - 1
        if end_idx > start_idx:
            dur = timestamps[end_idx] - timestamps[start_idx]
            fixation_durations.append(dur)
        else:
            fixation_durations.append(SAMPLE_INTERVAL)

    fix_durations = np.array(fixation_durations, dtype=float)

    # 1. Fixation Count
    fixation_count = len(fix_durations)

    # 2. Regression Count (backward saccades)
    saccade_positions = word_pos[boundaries[:-1]]
    if len(saccade_positions) > 1:
        saccade_diffs = np.diff(saccade_positions)
        regression_count = int(np.sum(saccade_diffs < 0))
    else:
        regression_count = 0

    # 3. Average Fixation Duration
    avg_fixation_duration = float(np.mean(fix_durations)) if len(fix_durations) > 0 else 0

    # 4. Saccade Velocity Mean (NEW)
    # velocity = distance / time between fixation centers
    if len(saccade_positions) > 1:
        saccade_distances = np.abs(np.diff(saccade_positions).astype(float))
        saccade_times = np.diff(timestamps[boundaries[:-1]]).astype(float)
        saccade_times = np.maximum(saccade_times, 1)  # avoid /0
        saccade_velocities = saccade_distances / saccade_times
        saccade_velocity_mean = float(np.mean(saccade_velocities))
    else:
        saccade_velocity_mean = 0.0

    # 5. Fixation Duration CV (NEW — coefficient of variation)
    if len(fix_durations) > 1 and np.mean(fix_durations) > 0:
        fixation_duration_cv = float(np.std(fix_durations) / np.mean(fix_durations))
    else:
        fixation_duration_cv = 0.0

    return (
        fixation_count,
        regression_count,
        avg_fixation_duration,
        saccade_velocity_mean,
        fixation_duration_cv,
    )


def _process_file(args):
    """Worker for multiprocessing."""
    path, session_id = args
    features = extract_eye_features(path)
    if features is None:
        return None
    fc, rc, afd, svm, fdcv = features
    return [session_id, fc, rc, round(afd, 4), round(svm, 6), round(fdcv, 6)]


def main():
    raw_eye_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "raw", "eye_data")
    output_file = os.path.join(os.path.dirname(__file__), "..", "dataset", "processed", "eye_features.csv")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    files = [f for f in os.listdir(raw_eye_dir) if f.endswith(".csv")]
    print(f"Extracting eye features from {len(files)} files ({NUM_WORKERS} workers)...")

    args_list = [
        (os.path.join(raw_eye_dir, f), f.replace(".csv", ""))
        for f in files
    ]

    with Pool(NUM_WORKERS) as pool:
        results = pool.map(_process_file, args_list, chunksize=50)

    results = [r for r in results if r is not None]

    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "fixation_count", "regression_count", "avg_fixation_duration",
            "saccade_velocity_mean", "fixation_duration_cv",
        ])
        writer.writerows(results)

    print(f"Eye features ({len(results)} sessions, 5 features) → {output_file}")


if __name__ == "__main__":
    main()
