"""
Model Trainer 2.0 — REALISTIC NOISE

- class_weight="balanced"
- Optional label noise (2.5% misdiagnosis simulation)
- Confusion matrix + per-class recall
- Feature importance
"""

import os
import sys
import joblib
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.dataset_loader import load_dataset
from config import apply_label_noise, LABEL_NOISE_RATE


def print_confusion_matrix(y_test, y_pred, labels):
    """Print a readable confusion matrix."""
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    print("\nConfusion Matrix:")
    print(f"{'':>14s}", end="")
    for label in labels:
        print(f"{label:>12s}", end="")
    print("  ← predicted")
    print("-" * (14 + 12 * len(labels)))

    for i, label in enumerate(labels):
        print(f"{label:>12s} |", end="")
        for j in range(len(labels)):
            val = cm[i][j]
            if i == j:
                print(f"  [{val:>5d}]  ", end="")
            else:
                print(f"   {val:>5d}   ", end="")
        print(f"  | n={np.sum(cm[i])}")

    print()
    return cm


def train():
    base_dir = os.path.join(os.path.dirname(__file__), "..")

    print("Loading dataset (with feature noise)...")
    X, y, feature_names = load_dataset(base_dir)

    print(f"  Total samples: {len(X)}")
    print(f"  Total features: {len(feature_names)}")
    print(f"  Label distribution:")
    unique, counts = np.unique(y, return_counts=True)
    for label, count in zip(unique, counts):
        pct = 100 * count / len(y)
        print(f"    {label}: {count} ({pct:.1f}%)")

    # Apply label noise (simulates misdiagnosis)
    if LABEL_NOISE_RATE > 0:
        y, n_flipped = apply_label_noise(y, LABEL_NOISE_RATE)
        print(f"\n  Label noise applied: {n_flipped} labels flipped ({LABEL_NOISE_RATE*100:.1f}%)")

    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # StandardScaler
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # Train
    print("\nTraining RandomForestClassifier (class_weight='balanced')...")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,          # reduced from 18 to prevent overfitting on noisy data
        min_samples_split=10,  # increased to generalize better
        min_samples_leaf=5,    # increased
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n{'='*60}")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"{'='*60}")

    # Classification Report
    labels = sorted(np.unique(np.concatenate([y_train, y_test])))
    print("\nClassification Report:")
    report = classification_report(y_test, y_pred, labels=labels, zero_division=0)
    print(report)

    # Confusion Matrix
    cm = print_confusion_matrix(y_test, y_pred, labels)

    # Per-class recall
    print("Per-Class Recall:")
    for i, label in enumerate(labels):
        total = np.sum(cm[i])
        correct = cm[i][i]
        recall = correct / total if total > 0 else 0
        marker = " ← TARGET" if label == "dysgraphia" else ""
        status = "✅" if recall >= 0.60 else "❌"
        print(f"  {status} {label}: {recall:.2%} ({correct}/{total}){marker}")

    # Feature importance
    print("\nFeature Importance (top 10):")
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    for rank, idx in enumerate(sorted_idx[:10]):
        print(f"  {rank+1:2d}. {feature_names[idx]}: {importances[idx]:.4f}")

    # Save
    model_dir = os.path.join(base_dir, "model")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "dyslexia_model.pkl")
    joblib.dump(model, model_path)
    print(f"\nModel saved → {model_path}")

    scaler_path = os.path.join(model_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"Scaler saved → {scaler_path}")

    # Final checks
    print(f"\n{'='*60}")
    print(f"  NOISE SETTINGS APPLIED:")
    from config import SESSION_NOISE_RANGE, FEATURE_NOISE_PERCENT, LABEL_NOISE_RATE as LNR
    print(f"    Session variation: ±{SESSION_NOISE_RANGE*100:.0f}%")
    print(f"    Feature noise:     ±{FEATURE_NOISE_PERCENT*100:.0f}%")
    print(f"    Label noise:       {LNR*100:.1f}%")

    if accuracy > 0.90:
        print(f"\n  ⚠️  ACCURACY {accuracy:.2%} > 90% — may still be too clean")
    elif accuracy >= 0.75:
        print(f"\n  ✅ ACCURACY {accuracy:.2%} — realistic range")
    else:
        print(f"\n  ⚠️  ACCURACY {accuracy:.2%} — may be too noisy")

    dys_idx = labels.index("dysgraphia") if "dysgraphia" in labels else -1
    if dys_idx >= 0:
        dys_total = np.sum(cm[dys_idx])
        dys_correct = cm[dys_idx][dys_idx]
        dys_recall = dys_correct / dys_total if dys_total > 0 else 0
        if dys_recall >= 0.60:
            print(f"  ✅ DYSGRAPHIA RECALL: {dys_recall:.2%} (≥60%)")
        else:
            print(f"  ❌ DYSGRAPHIA RECALL: {dys_recall:.2%} (need ≥60%)")

    print(f"{'='*60}")

    return accuracy


if __name__ == "__main__":
    train()
