import numpy as np

# Define feature names (must match training order EXACTLY)
FEATURE_NAMES = [
    "fixation_count",
    "regression_count",
    "avg_fixation_duration",
    "saccade_velocity_mean",
    "fixation_duration_cv",

    "isochrony_score",
    "homothety_score",
    "timing_variance",
    "avg_jerk",
    "pressure_variance",
    "letter_spacing_cv",
    "stroke_speed_mean",
    "pen_lift_rate",
    "micro_pause_rate",
    "stroke_fragmentation",
    "letter_size_cv",
    "direction_variance",

    "timing_stability",
    "rhythm_consistency",
    "pause_density",
    "motor_rhythm_index",
    "burstiness_index",
    "inter_stroke_entropy"
]


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

    if any(x < 0 or x > 5000 for x in eye_data):
        raise ValueError("eye_data out of range")

    if any(x < 0 or x > 5000 for x in pen_data):
        raise ValueError("pen_data out of range")

    return True


def build_features(data: dict):
    validate_input(data)

    eye_data = np.array(data.get("eye_data", []), dtype=float)
    pen_data = np.array(data.get("pen_data", []), dtype=float)

    # -------------------------
    # 👁 EYE FEATURES
    # -------------------------

    fixation_count = len(eye_data)

    regression_count = sum(
        1 for i in range(1, len(eye_data))
        if eye_data[i] < eye_data[i - 1]
    )

    avg_fixation_duration = float(np.mean(eye_data))

    saccade_velocity_mean = float(np.mean(np.abs(np.diff(eye_data)))) if len(eye_data) > 1 else 0
    fixation_duration_cv = float(np.std(eye_data) / (np.mean(eye_data) + 1e-6))

    # -------------------------
    # ✍️ PEN FEATURES
    # -------------------------

    durations = np.diff(pen_data)

    if len(durations) == 0:
        durations = np.array([0.0])

    isochrony_score = float(1 / (1 + np.std(durations)))
    homothety_score = float(np.mean(durations) / (np.sum(durations) + 1e-6))
    timing_variance = float(np.var(durations))

    accel = np.diff(durations)
    jerk = np.diff(accel)
    avg_jerk = float(np.mean(np.abs(jerk))) if len(jerk) > 0 else 0.0

    pressure_variance = float(np.var(pen_data))
    letter_spacing_cv = float(np.std(durations) / (np.mean(durations) + 1e-6))
    stroke_speed_mean = float(np.mean(np.abs(durations)))

    pen_lift_rate = float(np.sum(durations < np.mean(durations) * 0.5) / len(durations))
    micro_pause_rate = float(np.sum((durations > 0.05) & (durations < 0.15)) / len(durations))
    stroke_fragmentation = float(np.sum(durations > np.mean(durations) * 2))

    letter_size_cv = float(np.std(pen_data) / (np.mean(pen_data) + 1e-6))
    direction_variance = float(np.var(np.diff(pen_data)))

    # -------------------------
    # 🧠 RHYTHM FEATURES
    # -------------------------

    timing_stability = float(1 / (1 + np.std(durations)))
    rhythm_consistency = float(np.mean(durations))

    pause_density = float(
        np.sum(durations > np.mean(durations) * 1.5) / len(durations)
    )

    motor_rhythm_index = float(timing_stability * rhythm_consistency)

    burstiness_index = float(np.std(durations) / (np.mean(durations) + 1e-6))

    hist, _ = np.histogram(durations, bins=5)
    prob = hist / (np.sum(hist) + 1e-6)
    inter_stroke_entropy = float(-np.sum(prob * np.log(prob + 1e-6)))

    # -------------------------
    # 🧠 STRUCTURED FEATURE MAP
    # -------------------------

    feature_dict = {
        "fixation_count": fixation_count,
        "regression_count": regression_count,
        "avg_fixation_duration": avg_fixation_duration,
        "saccade_velocity_mean": saccade_velocity_mean,
        "fixation_duration_cv": fixation_duration_cv,

        "isochrony_score": isochrony_score,
        "homothety_score": homothety_score,
        "timing_variance": timing_variance,
        "avg_jerk": avg_jerk,
        "pressure_variance": pressure_variance,
        "letter_spacing_cv": letter_spacing_cv,
        "stroke_speed_mean": stroke_speed_mean,
        "pen_lift_rate": pen_lift_rate,
        "micro_pause_rate": micro_pause_rate,
        "stroke_fragmentation": stroke_fragmentation,
        "letter_size_cv": letter_size_cv,
        "direction_variance": direction_variance,

        "timing_stability": timing_stability,
        "rhythm_consistency": rhythm_consistency,
        "pause_density": pause_density,
        "motor_rhythm_index": motor_rhythm_index,
        "burstiness_index": burstiness_index,
        "inter_stroke_entropy": inter_stroke_entropy
    }

    # ORDER FIX (CRITICAL)
    for name in FEATURE_NAMES:
        if name not in feature_dict:
            raise Exception(f"Missing feature: {name}")

    feature_vector = [feature_dict[name] for name in FEATURE_NAMES]

    return feature_vector