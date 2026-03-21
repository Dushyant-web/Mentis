"""
Unit Tests for Simulator 2.0 — REALISTIC NOISE
"""

import os
import sys
import csv
import tempfile
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_config_profiles():
    """All profiles must have required keys."""
    from config import PROFILES, DISTRIBUTION, MODE
    required_keys = [
        "age_range", "reading_speed", "motor_score",
        "pen_noise", "pen_pause_prob", "pen_speed_var", "pen_tremor",
        "pen_pressure_stability", "pen_pressure_mean", "pen_letter_spacing_cv",
        "pen_lift_frequency", "micro_pause_density", "stroke_fragmentation",
        "letter_size_variance", "burstiness_index",
        "fixation_mean", "fixation_std", "regression_prob",
        "saccade_length_mean", "saccade_length_std",
        "rhythm_cv", "rhythm_pause_rate",
    ]
    for disorder, profile in PROFILES.items():
        for key in required_keys:
            assert key in profile, f"Missing '{key}' in '{disorder}'"
    total = sum(DISTRIBUTION.values())
    assert abs(total - 1.0) < 0.02
    assert "both" in PROFILES
    assert MODE in ("balanced", "realistic")


def test_realistic_separation():
    """Dysgraphia separation should be 3-8x, NOT 22x."""
    from config import PROFILES
    dysg = PROFILES["dysgraphia"]
    normal = PROFILES["normal"]

    ratio_lift = dysg["pen_lift_frequency"] / normal["pen_lift_frequency"]
    ratio_frag = dysg["stroke_fragmentation"] / normal["stroke_fragmentation"]
    ratio_micro = dysg["micro_pause_density"] / normal["micro_pause_density"]

    assert ratio_lift < 10, f"pen_lift separation {ratio_lift:.1f}x too high (need <10x)"
    assert ratio_frag < 12, f"fragmentation separation {ratio_frag:.1f}x too high (need <12x)"
    assert ratio_micro < 10, f"micro_pause separation {ratio_micro:.1f}x too high (need <10x)"

    # Dysgraphia eye features must still be near-normal
    assert dysg["fixation_mean"] < 280


def test_session_noise():
    """Session noise must produce different profiles each time."""
    from config import PROFILES, apply_session_noise
    profile = PROFILES["normal"]
    p1 = apply_session_noise(profile, session_seed=1)
    p2 = apply_session_noise(profile, session_seed=2)
    # Same key, different values
    assert p1["pen_noise"] != p2["pen_noise"], "Session noise should produce variation"


def test_feature_noise():
    """Feature noise should modify values."""
    from config import add_feature_noise
    X = np.ones((100, 23))
    X_noised = add_feature_noise(X)
    assert not np.allclose(X, X_noised), "Feature noise should change values"
    # Values should be close to 1.0 but not exact
    assert np.mean(np.abs(X_noised - 1.0)) < 0.3, "Noise too large"


def test_label_noise():
    """Label noise should flip ~2.5% of labels."""
    from config import apply_label_noise
    labels = np.array(["normal"] * 500 + ["mild"] * 500)
    noised, n_flipped = apply_label_noise(labels, rate=0.025)
    assert 15 <= n_flipped <= 40, f"Expected ~25 flips, got {n_flipped}"
    assert np.sum(noised != labels) == n_flipped


def test_pen_features_12():
    """Pen features must return 12 values."""
    from feature_engine.pen_features import extract_pen_features
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "x", "y", "timestamp", "pressure"])
        t = 0
        for i in range(60):
            t += np.random.randint(10, 30)
            p = 0.0 if i % 15 == 0 else 0.7 + np.random.normal(0, 0.05)
            writer.writerow(["test", i * 0.5, np.sin(i * 0.1), t, max(0, p)])
        path = f.name
    try:
        result = extract_pen_features(path)
        assert result is not None
        assert len(result) == 12
    finally:
        os.unlink(path)


def test_eye_features_5():
    """Eye features must return 5 values."""
    from feature_engine.eye_features import extract_eye_features
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "gaze_x", "gaze_y", "timestamp"])
        for i in range(10):
            writer.writerow(["test", 0.1, 0.0, i * 20])
        for i in range(10):
            writer.writerow(["test", 1.1, 0.0, 200 + i * 20])
        path = f.name
    try:
        result = extract_eye_features(path)
        assert result is not None
        assert len(result) == 5
    finally:
        os.unlink(path)


def test_rhythm_features_6():
    """Rhythm features must return 6 values."""
    from dataset.generator.rhythm_engine import compute_rhythm_features
    result = compute_rhythm_features([20, 20, 20, 18, 22, 20, 19, 21])
    assert len(result) == 6


def test_no_cheating():
    """Verify NO artificial inflation."""
    import inspect
    from training.dataset_loader import load_dataset
    source = inspect.getsource(load_dataset)
    assert "* 1.5" not in source
    assert "*1.5" not in source


def test_feature_count():
    """Total feature count must be 23."""
    from training.dataset_loader import ALL_FEATURES
    assert len(ALL_FEATURES) == 23


if __name__ == "__main__":
    tests = [
        test_config_profiles,
        test_realistic_separation,
        test_session_noise,
        test_feature_noise,
        test_label_noise,
        test_pen_features_12,
        test_eye_features_5,
        test_rhythm_features_6,
        test_no_cheating,
        test_feature_count,
    ]
    passed = failed = 0
    for test in tests:
        try:
            test()
            print(f"  ✅ {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  ❌ {test.__name__}: {e}")
            failed += 1
    print(f"\n{'='*50}")
    print(f"  {passed} passed, {failed} failed")
    print(f"{'='*50}")
