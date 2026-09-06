
import numpy as np

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

# -----------------------------
# 🔧 HELPERS
# -----------------------------
def smooth(arr, k=11):
    if len(arr) < k:
        return arr
    return np.convolve(arr, np.ones(k)/k, mode='same')


def compute_velocity(x, y, t):
    dt = np.diff(t) + 1e-5
    dx = np.diff(x)
    dy = np.diff(y)
    return np.sqrt(dx**2 + dy**2) / dt


def detect_fixations(velocities):
    if len(velocities) < 3:
        return np.zeros_like(velocities, dtype=bool)
    # Adaptive threshold using 40th percentile of speed
    adaptive_threshold = np.percentile(velocities, 40)
    return velocities < adaptive_threshold


# -----------------------------
# 🧠 MAIN BUILDER
# -----------------------------
def build_features(data):
    eye = data["eye_data"]
    pen = data["pen_data"]

    # =====================
    # 👁️ EYE FEATURES (FIXED)
    # =====================

    if len(eye) < 5:
        eye = [{"x":0,"y":0,"time":i} for i in range(5)]

    x = np.array([p["x"] for p in eye])
    y = np.array([p["y"] for p in eye])
    t = np.array([p["time"] for p in eye])
    # 🔥 FIX: Normalize timestamps to seconds (frontend sends ms)
    if len(t) > 0:
        t = t - t[0]          # start from 0
        t = t / 1000.0        # convert ms → seconds

    # 🔥 SORT by time (IMPORTANT)
    order = np.argsort(t)
    x, y, t = x[order], y[order], t[order]

    # 🔥 SMOOTH
    x = smooth(x)
    y = smooth(y)

    # 🔥 VELOCITY (recomputed)
    velocities = compute_velocity(x, y, t)

    # 🔥 FIX: Clip unrealistic velocities (noise from webcam jitter)
    velocities = np.clip(velocities, 0, np.percentile(velocities, 95) if len(velocities) > 0 else 1)

    if len(velocities) == 0:
        velocities = np.array([0])

    # 🔥 FIXATION DETECTION (Adaptive)
    fixation_mask = detect_fixations(velocities)

    # 🔥 FIX 2: REAL FIXATION COUNT (Contiguous Blocks)
    if len(fixation_mask) > 0:
        changes = np.diff(fixation_mask.astype(int))
        real_fixation_count = int(np.sum(changes == 1))
        if fixation_mask[0]:
            real_fixation_count += 1
    else:
        real_fixation_count = 0

    fixation_count = real_fixation_count

    # fixation durations (in TIME, not frames)
    fixation_durations = []
    current_time: float = 0.0

    # Cast to python list to prevent IDE linter (Pyre2) "Unknown | Error" false positive
    mask_list = [bool(val) for val in fixation_mask]
    t_list = [float(val) for val in t]

    for i, is_fixation in enumerate(mask_list):
        if is_fixation:
            current_time += float(t_list[i+1] - t_list[i]) if i < len(t_list)-1 else 0.0  # type: ignore
        else:
            if current_time > 0:  # type: ignore
                fixation_durations.append(current_time)
                current_time = 0.0

    if current_time > 0:  # type: ignore
        fixation_durations.append(current_time)

    fixation_durations = np.array(fixation_durations) if fixation_durations else np.array([0])

    avg_fixation_duration = float(np.mean(fixation_durations))
    fixation_duration_cv = float(np.std(fixation_durations) / (np.mean(fixation_durations)+1e-5))

    # 🔥 FIX 3: AGGRESSRESSIVE REGRESSION FILTERING (HYSTERESIS)
    dx = np.diff(x)
    dy = np.diff(y)
    
    # 1. Require larger backward movement (webcam jitter is often < 20px)
    # 2. Require horizontal-dominant movement (regressions are mainly X-axis)
    is_backward = dx < -25 
    is_horizontal = np.abs(dx) > np.abs(dy) * 1.5
    
    true_regressions = is_backward & is_horizontal & (dx > -150)
    
    # Normalize per 100 points
    raw_regression_count = np.sum(true_regressions)
    regression_count = float((raw_regression_count / max(1, len(dx))) * 100)

    saccade_velocity_mean = float(np.mean(velocities))


    # =====================
    # ✍️ PEN FEATURES (FIXED)
    # =====================

    if len(pen) < 5:
        pen = [{"x":0,"y":0,"time":i,"pressure":0.5,"type":"move"} for i in range(5)]

    x = np.array([p["x"] for p in pen])
    y = np.array([p["y"] for p in pen])
    t = np.array([p["time"] for p in pen])
    # 🔥 FIX: Normalize pen timestamps (ms → seconds)
    if len(t) > 0:
        t = t - t[0]
        t = t / 1000.0
    pressure = np.array([p.get("pressure", 0.5) for p in pen])

    dt = np.diff(t) + 1e-5
    dx = np.diff(x)
    dy = np.diff(y)

    segment_lengths = np.sqrt(dx**2 + dy**2)
    speed = segment_lengths / dt

    # 🔥 FIX: Clip extreme speeds (noise / sudden jumps)
    if len(speed) > 0:
        speed = np.clip(speed, 0, np.percentile(speed, 95))

    # 🔥 CLAMP SENSITIVE SCORES (Prevent spikes to 100,000+)
    isochrony_score = float(min(100.0, 1 / (np.std(dt) + 1e-4)))
    homothety_score = float(min(100.0, 1 / (np.std(segment_lengths) + 1e-4)))

    timing_variance = float(np.var(dt))

    acceleration = np.diff(speed)
    jerk = np.diff(acceleration)
    avg_jerk = float(np.mean(np.abs(jerk))) if len(jerk) > 0 else 0

    pressure_variance = float(np.var(pressure))

    letter_spacing_cv = float(np.std(segment_lengths) / (np.mean(segment_lengths)+1e-5))

    stroke_speed_mean = float(np.mean(speed)) if len(speed) > 0 else 0

    types = [p.get("type") for p in pen]
    pen_lift_rate = float(types.count("end") / len(types))

    micro_pause_rate = float(np.sum(dt > np.percentile(dt, 80)) / len(dt))

    stroke_fragmentation = float(types.count("start") / len(types))

    # 🔥 FIXED (was WRONG before)
    letter_size_cv = float(np.std(segment_lengths) / (np.mean(segment_lengths)+1e-5))

    angles = np.arctan2(dy, dx)
    direction_variance = float(np.var(angles))


    # =====================
    # 🧠 RHYTHM FEATURES
    # =====================

    timing_stability = float(1 / (np.std(dt)+1e-5))
    rhythm_consistency = float(1 / (np.var(speed)+1e-5))

    pause_density = float(np.sum(dt > np.percentile(dt, 75)) / len(dt))

    motor_rhythm_index = float(np.mean(speed) / (np.std(speed)+1e-5))

    burstiness_index = float((np.std(dt) - np.mean(dt)) / (np.std(dt)+np.mean(dt)+1e-5))

    hist, _ = np.histogram(dt, bins=10)
    prob = hist / (np.sum(hist)+1e-5)
    inter_stroke_entropy = float(-np.sum(prob * np.log(prob+1e-9)))


    # =====================
    # 📦 FINAL VECTOR
    # =====================

    raw_features = [
        fixation_count,
        regression_count,
        avg_fixation_duration,
        saccade_velocity_mean,
        fixation_duration_cv,

        isochrony_score,
        homothety_score,
        timing_variance,
        avg_jerk,
        pressure_variance,
        letter_spacing_cv,
        stroke_speed_mean,
        pen_lift_rate,
        micro_pause_rate,
        stroke_fragmentation,
        letter_size_cv,
        direction_variance,

        timing_stability,
        rhythm_consistency,
        pause_density,
        motor_rhythm_index,
        burstiness_index,
        inter_stroke_entropy
    ]

    # 🔥 FIX 4: SAFETY (VERY IMPORTANT)
    # Ensure all elements are clean floats and replace NaNs/Infs
    safe_features = []
    for val in raw_features:
        try:
            val = float(val)
            if np.isnan(val) or np.isinf(val):
                safe_features.append(0.0)
            else:
                safe_features.append(val)
        except:
             safe_features.append(0.0)

    return safe_features