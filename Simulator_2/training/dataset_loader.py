"""
Dataset Loader 2.0 — REALISTIC NOISE

Merges 23 features, then applies feature-level Gaussian noise (±10%).
NO cheating. NO artificial inflation. NO label leakage.
"""

import csv
import os
import numpy as np

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import add_feature_noise, FEATURE_NOISE_PERCENT


def load_csv_as_dict(path, key_col="session_id"):
    data = {}
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data[row[key_col]] = row
    return data


def load_labels(raw_dir):
    users = {}
    with open(os.path.join(raw_dir, "users.csv"), "r") as f:
        for row in csv.DictReader(f):
            users[row["user_id"]] = row["disorder"]

    sessions = {}
    with open(os.path.join(raw_dir, "sessions.csv"), "r") as f:
        for row in csv.DictReader(f):
            sessions[row["session_id"]] = users.get(row["user_id"], "normal")

    return sessions


# Feature registries — must match CSV headers exactly
PEN_FEATURES = [
    "isochrony_score", "homothety_score", "timing_variance", "avg_jerk",
    "pressure_variance", "letter_spacing_cv", "stroke_speed_mean",
    "pen_lift_rate", "micro_pause_rate", "stroke_fragmentation",
    "letter_size_cv", "direction_variance",
]

EYE_FEATURES = [
    "fixation_count", "regression_count", "avg_fixation_duration",
    "saccade_velocity_mean", "fixation_duration_cv",
]

RHYTHM_FEATURES = [
    "timing_stability", "rhythm_consistency",
    "pause_density", "motor_rhythm_index",
    "burstiness_index", "inter_stroke_entropy",
]

ALL_FEATURES = PEN_FEATURES + EYE_FEATURES + RHYTHM_FEATURES


def load_dataset(base_dir):
    """
    Load and merge all features. Apply feature-level noise.
    NO artificial inflation. NO label-based manipulation.
    """
    raw_dir = os.path.join(base_dir, "dataset", "raw")
    processed_dir = os.path.join(base_dir, "dataset", "processed")

    pen_features = load_csv_as_dict(os.path.join(processed_dir, "pen_features.csv"))
    eye_features = load_csv_as_dict(os.path.join(processed_dir, "eye_features.csv"))
    rhythm_features = load_csv_as_dict(os.path.join(processed_dir, "rhythm_features.csv"))

    labels = load_labels(raw_dir)

    all_sessions = set(pen_features.keys()) | set(eye_features.keys()) | set(rhythm_features.keys())

    X = []
    y = []

    for sid in all_sessions:
        if sid not in labels:
            continue

        pen = pen_features.get(sid, {})
        eye = eye_features.get(sid, {})
        rhythm = rhythm_features.get(sid, {})

        row = []
        for feat in PEN_FEATURES:
            row.append(float(pen.get(feat, 0)))
        for feat in EYE_FEATURES:
            row.append(float(eye.get(feat, 0)))
        for feat in RHYTHM_FEATURES:
            row.append(float(rhythm.get(feat, 0)))

        X.append(row)
        y.append(labels[sid])

    X = np.array(X)
    y = np.array(y)

    # Apply feature-level noise (±10% Gaussian)
    if FEATURE_NOISE_PERCENT > 0:
        X = add_feature_noise(X)

    return X, y, ALL_FEATURES
