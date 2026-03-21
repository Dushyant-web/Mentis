"""
Feature Separation Validator

Verifies that dysgraphia features are ACTUALLY separable from other classes.
Prints statistical comparisons and flags overlapping features.

Run: python validate_separation.py
"""

import os
import sys
import csv
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from training.dataset_loader import load_dataset, ALL_FEATURES


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


def analyze_separation(X, y, feature_names):
    """Analyze feature separation between dysgraphia and other classes."""
    classes = sorted(np.unique(y))

    # Key motor features to check
    motor_features = [
        "pressure_variance", "timing_variance",
        "pen_lift_rate", "micro_pause_rate", "stroke_fragmentation",
        "letter_size_cv", "direction_variance",
        "burstiness_index", "inter_stroke_entropy",
    ]

    eye_features = [
        "fixation_count", "regression_count", "avg_fixation_duration",
    ]

    print("=" * 70)
    print("  FEATURE SEPARATION ANALYSIS")
    print("=" * 70)

    print("\n── MOTOR FEATURES (should be HIGH for dysgraphia) ──\n")
    print(f"{'Feature':<25s}", end="")
    for cls in classes:
        print(f"{'  ' + cls:>12s}", end="")
    print(f"  {'DYS vs NRM':>10s}  {'DYS vs SVR':>10s}")
    print("-" * (25 + 12 * len(classes) + 24))

    for feat in motor_features:
        if feat not in feature_names:
            continue
        idx = feature_names.index(feat)

        means = {}
        for cls in classes:
            mask = y == cls
            means[cls] = np.mean(X[mask, idx])

        print(f"{feat:<25s}", end="")
        for cls in classes:
            print(f"{means[cls]:12.4f}", end="")

        # Separation ratio: dysgraphia vs normal, dysgraphia vs severe
        if "dysgraphia" in means and "normal" in means:
            ratio_nrm = means["dysgraphia"] / (means["normal"] + 1e-8)
            ratio_svr = means["dysgraphia"] / (means.get("severe", 1) + 1e-8)
            sep_ok = "✅" if ratio_nrm > 2.0 else "⚠️"
            svr_ok = "✅" if ratio_svr > 1.5 else "⚠️"
            print(f"  {sep_ok} {ratio_nrm:>7.1f}x  {svr_ok} {ratio_svr:>7.1f}x")
        else:
            print()

    print("\n── EYE FEATURES (should be SIMILAR for dysgraphia & normal) ──\n")
    print(f"{'Feature':<25s}", end="")
    for cls in classes:
        print(f"{'  ' + cls:>12s}", end="")
    print(f"  {'DYS≈NRM?':>10s}")
    print("-" * (25 + 12 * len(classes) + 12))

    for feat in eye_features:
        if feat not in feature_names:
            continue
        idx = feature_names.index(feat)

        means = {}
        for cls in classes:
            mask = y == cls
            means[cls] = np.mean(X[mask, idx])

        print(f"{feat:<25s}", end="")
        for cls in classes:
            print(f"{means[cls]:12.4f}", end="")

        if "dysgraphia" in means and "normal" in means:
            ratio = means["dysgraphia"] / (means["normal"] + 1e-8)
            ok = "✅" if 0.7 < ratio < 1.5 else "⚠️"
            print(f"  {ok} {ratio:>7.2f}x")
        else:
            print()

    print("\n── SEPARATION SUMMARY ──\n")

    # Cohen's d for dysgraphia vs each other class on key features
    key_feat = "pen_lift_rate"
    if key_feat in feature_names:
        idx = feature_names.index(key_feat)
        dys_mask = y == "dysgraphia"
        dys_vals = X[dys_mask, idx]

        for cls in classes:
            if cls == "dysgraphia":
                continue
            cls_mask = y == cls
            cls_vals = X[cls_mask, idx]

            pooled_std = np.sqrt((np.var(dys_vals) + np.var(cls_vals)) / 2)
            cohens_d = abs(np.mean(dys_vals) - np.mean(cls_vals)) / (pooled_std + 1e-8)

            tag = "✅ GOOD" if cohens_d > 0.8 else ("⚠️ WEAK" if cohens_d > 0.3 else "❌ OVERLAP")
            print(f"  dysgraphia vs {cls:<12s}: Cohen's d = {cohens_d:.2f} ({tag})")


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    X, y, feature_names = load_dataset(base_dir)
    analyze_separation(X, y, feature_names)


if __name__ == "__main__":
    main()
