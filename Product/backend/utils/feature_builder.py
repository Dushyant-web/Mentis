import numpy as np


def validate_input(data):
    if "eye_data" not in data or "pen_data" not in data:
        raise ValueError("Missing eye_data or pen_data")

    eye_data = data["eye_data"]
    pen_data = data["pen_data"]

    if not isinstance(eye_data, list) or not all(isinstance(x, (int, float)) for x in eye_data):
        raise ValueError("eye_data must be list of numbers")

    if not isinstance(pen_data, list) or not all(isinstance(x, (int, float)) for x in pen_data):
        raise ValueError("pen_data must be list of numbers")

    if len(eye_data) < 2 or len(pen_data) < 2:
        raise ValueError("Not enough data points")

    # Range checks (important for ML stability)
    if any(x < 0 or x > 5000 for x in eye_data):
        raise ValueError("eye_data out of range")

    if any(x < 0 or x > 5000 for x in pen_data):
        raise ValueError("pen_data out of range")

    return True


def build_features(data: dict):

    validate_input(data)

    eye_data = np.array(data.get("eye_data", []), dtype=float)
    pen_data = np.array(data.get("pen_data", []), dtype=float)

    # Normalize (important for ML)
    eye_data = eye_data / 1000
    pen_data = pen_data / 1000

    # -------------------------
    # 👁 EYE FEATURES
    # -------------------------

    fixation_count = len(eye_data)

    regression_count = sum(
        1 for i in range(1, len(eye_data))
        if eye_data[i] < eye_data[i - 1]
    )

    avg_fixation_duration = float(np.mean(eye_data))

    # -------------------------
    # ✍️ PEN FEATURES
    # -------------------------

    durations = np.diff(pen_data)

    isochrony_score = float(1 / (1 + np.std(durations)))
    homothety_score = float(np.mean(durations) / (np.sum(durations) + 1e-6))

    timing_variance = float(np.var(durations))

    accel = np.diff(durations)
    jerk = np.diff(accel)
    avg_jerk = float(np.mean(np.abs(jerk))) if len(jerk) > 0 else 0.0

    # -------------------------
    # 🧠 RHYTHM FEATURES
    # -------------------------

    timing_stability = float(1 / (1 + np.std(durations)))
    rhythm_consistency = float(np.mean(durations))

    pause_density = float(
        np.sum(durations > np.mean(durations) * 1.5) / len(durations)
    )

    motor_rhythm_index = float(timing_stability * rhythm_consistency)

    # -------------------------
    # FINAL FEATURE VECTOR
    # -------------------------

    features = [
        fixation_count,
        regression_count,
        avg_fixation_duration,

        isochrony_score,
        homothety_score,
        timing_variance,
        avg_jerk,

        timing_stability,
        rhythm_consistency,
        pause_density,
        motor_rhythm_index
    ]

    return features