"""
Simulator 2.0 — Centralized Configuration (REALISTIC NOISE)

MODE = "balanced" → Equal class distribution (for training)
MODE = "realistic" → Real-world prevalence (for evaluation)

NOISE SYSTEMS:
  1. Profile overlap — adjacent classes overlap realistically (3-8x, not 22x)
  2. Session variation — fatigue, focus drift (±10-20%)
  3. Measurement noise — sensor jitter baked into raw data
  4. Feature noise — ±5-15% Gaussian noise post-extraction
  5. Label noise — optional 2-3% random label flip

References:
  - Rayner (1998): Eye movements in reading
  - Rosenblum et al. (2003): Handwriting diagnosis
  - Lam et al. (2011): Handwriting in DCD
  - Nicolson & Fawcett (1990): Dyslexia motor deficits
  - Plamondon (1995): Sigma-Lognormal stroke model
"""

import numpy as np
from multiprocessing import cpu_count

# ──────────────────────────────────────────────
# PIPELINE SETTINGS
# ──────────────────────────────────────────────

NUM_USERS = 5000
SESSIONS_PER_USER_RANGE = (5, 20)
NUM_WORKERS = max(1, cpu_count() - 1)

# ──────────────────────────────────────────────
# MODE
# ──────────────────────────────────────────────

MODE = "balanced"

DISTRIBUTION_BALANCED = {
    "normal": 0.167,
    "mild": 0.167,
    "moderate": 0.167,
    "severe": 0.167,
    "dysgraphia": 0.167,
    "both": 0.167,
}

DISTRIBUTION_REALISTIC = {
    "normal": 0.35,
    "mild": 0.22,
    "moderate": 0.18,
    "severe": 0.08,
    "dysgraphia": 0.07,
    "both": 0.10,
}

DISTRIBUTION = DISTRIBUTION_BALANCED if MODE == "balanced" else DISTRIBUTION_REALISTIC

# ──────────────────────────────────────────────
# NOISE SETTINGS
# ──────────────────────────────────────────────

# Session-level variation (simulates fatigue, focus, mood)
SESSION_NOISE_RANGE = 0.12  # ±12% drift per session

# Measurement noise (sensor imperfection)
PEN_JITTER_XY = 0.10       # Gaussian std for x/y coordinate noise
PEN_TIMESTAMP_JITTER = 3   # ±3ms timestamp noise
EYE_GAZE_JITTER = 0.12     # Gaussian std for gaze coordinate noise

# Feature-level noise (post-extraction)
FEATURE_NOISE_PERCENT = 0.07  # ±7% Gaussian noise on extracted features

# Label noise (optional — simulates misdiagnosis)
LABEL_NOISE_RATE = 0.02    # 2% of labels randomly flipped

# ──────────────────────────────────────────────
# DISORDER PROFILES (REALISTIC OVERLAP)
#
# KEY CHANGE: Reduced separation to 3-8x range
# Adjacent classes now overlap significantly.
# Normal ↔ Mild: slight overlap
# Mild ↔ Moderate: moderate overlap
# Moderate ↔ Severe: moderate overlap
# Dysgraphia: distinct motor BUT overlaps with moderate on some features
# ──────────────────────────────────────────────

PROFILES = {
    "normal": {
        "age_range": (7, 18),
        "reading_speed": {"mean": 215, "std": 30},    # wider std = more overlap
        "motor_score": {"mean": 0.88, "std": 0.10},

        # Pen (Plamondon 1995 / Rosenblum 2003)
        "pen_noise": 0.10,
        "pen_pause_prob": 0.05,
        "pen_speed_var": 0.10,
        "pen_tremor": 0.01,
        "pen_pressure_stability": 0.90,
        "pen_pressure_mean": 0.68,
        "pen_letter_spacing_cv": 0.12,
        "pen_lift_frequency": 0.04,
        "micro_pause_density": 0.05,
        "stroke_fragmentation": 0.03,
        "letter_size_variance": 0.10,
        "burstiness_index": 0.06,

        # Eye (Rayner 1998)
        "fixation_mean": 230,
        "fixation_std": 40,           # wider std
        "regression_prob": 0.07,
        "saccade_length_mean": 7.2,
        "saccade_length_std": 2.0,

        # Rhythm
        "rhythm_cv": 0.10,
        "rhythm_pause_rate": 0.04,
    },

    "mild": {
        "age_range": (7, 18),
        "reading_speed": {"mean": 170, "std": 28},
        "motor_score": {"mean": 0.72, "std": 0.12},   # overlaps with normal

        "pen_noise": 0.18,
        "pen_pause_prob": 0.10,
        "pen_speed_var": 0.18,
        "pen_tremor": 0.03,
        "pen_pressure_stability": 0.80,
        "pen_pressure_mean": 0.63,
        "pen_letter_spacing_cv": 0.18,
        "pen_lift_frequency": 0.08,
        "micro_pause_density": 0.10,
        "stroke_fragmentation": 0.07,
        "letter_size_variance": 0.16,
        "burstiness_index": 0.12,

        "fixation_mean": 275,
        "fixation_std": 50,
        "regression_prob": 0.13,
        "saccade_length_mean": 6.0,
        "saccade_length_std": 2.2,

        "rhythm_cv": 0.16,
        "rhythm_pause_rate": 0.10,
    },

    "moderate": {
        "age_range": (7, 18),
        "reading_speed": {"mean": 130, "std": 25},
        "motor_score": {"mean": 0.55, "std": 0.14},   # overlaps with mild AND severe

        "pen_noise": 0.28,
        "pen_pause_prob": 0.18,
        "pen_speed_var": 0.28,
        "pen_tremor": 0.07,
        "pen_pressure_stability": 0.65,
        "pen_pressure_mean": 0.56,
        "pen_letter_spacing_cv": 0.26,
        "pen_lift_frequency": 0.14,
        "micro_pause_density": 0.16,
        "stroke_fragmentation": 0.12,
        "letter_size_variance": 0.24,
        "burstiness_index": 0.20,

        "fixation_mean": 340,
        "fixation_std": 65,
        "regression_prob": 0.22,
        "saccade_length_mean": 4.8,
        "saccade_length_std": 2.5,

        "rhythm_cv": 0.24,
        "rhythm_pause_rate": 0.18,
    },

    "severe": {
        "age_range": (7, 18),
        "reading_speed": {"mean": 85, "std": 22},
        "motor_score": {"mean": 0.38, "std": 0.12},

        "pen_noise": 0.42,
        "pen_pause_prob": 0.30,
        "pen_speed_var": 0.42,
        "pen_tremor": 0.12,
        "pen_pressure_stability": 0.48,
        "pen_pressure_mean": 0.50,
        "pen_letter_spacing_cv": 0.38,
        "pen_lift_frequency": 0.20,
        "micro_pause_density": 0.22,
        "stroke_fragmentation": 0.18,
        "letter_size_variance": 0.30,
        "burstiness_index": 0.28,

        "fixation_mean": 470,
        "fixation_std": 90,
        "regression_prob": 0.36,
        "saccade_length_mean": 3.2,
        "saccade_length_std": 2.8,

        "rhythm_cv": 0.38,
        "rhythm_pause_rate": 0.32,
    },

    "dysgraphia": {
        # KEY: near-normal reading BUT impaired motor
        # Separation reduced from 22x to 4-8x range
        "age_range": (7, 18),
        "reading_speed": {"mean": 195, "std": 30},
        "motor_score": {"mean": 0.35, "std": 0.12},

        "pen_noise": 0.50,
        "pen_pause_prob": 0.32,
        "pen_speed_var": 0.48,
        "pen_tremor": 0.18,                # was 0.28, now 0.18 (still 18x normal)
        "pen_pressure_stability": 0.35,     # was 0.22, now 0.35
        "pen_pressure_mean": 0.45,
        "pen_letter_spacing_cv": 0.42,
        "pen_lift_frequency": 0.28,         # was 0.55, now 0.28 (7x normal)
        "micro_pause_density": 0.30,        # was 0.52, now 0.30 (6x normal)
        "stroke_fragmentation": 0.25,       # was 0.58, now 0.25 (8x normal)
        "letter_size_variance": 0.38,       # was 0.62, now 0.38 (3.8x normal)
        "burstiness_index": 0.35,           # was 0.65, now 0.35 (5.8x normal)

        # NEAR-NORMAL EYE (this is the clinical truth)
        "fixation_mean": 245,
        "fixation_std": 45,
        "regression_prob": 0.10,
        "saccade_length_mean": 6.8,
        "saccade_length_std": 2.0,

        "rhythm_cv": 0.38,
        "rhythm_pause_rate": 0.35,
    },

    "both": {
        # Co-occurring: poor reading AND poor motor
        # Distinguished from severe by STRONGER motor disruption
        "age_range": (7, 18),
        "reading_speed": {"mean": 95, "std": 22},
        "motor_score": {"mean": 0.28, "std": 0.10},

        "pen_noise": 0.52,
        "pen_pause_prob": 0.35,
        "pen_speed_var": 0.50,
        "pen_tremor": 0.20,                 # higher than severe (0.12)
        "pen_pressure_stability": 0.32,     # lower than severe (0.48)
        "pen_pressure_mean": 0.44,
        "pen_letter_spacing_cv": 0.45,
        "pen_lift_frequency": 0.30,         # higher than severe (0.20)
        "micro_pause_density": 0.32,        # higher than severe (0.22)
        "stroke_fragmentation": 0.28,       # higher than severe (0.18)
        "letter_size_variance": 0.40,       # higher than severe (0.30)
        "burstiness_index": 0.38,           # higher than severe (0.28)

        # IMPAIRED EYE (similar to severe but slightly different)
        "fixation_mean": 420,               # slightly lower than severe (470)
        "fixation_std": 80,
        "regression_prob": 0.30,
        "saccade_length_mean": 3.8,
        "saccade_length_std": 2.2,

        "rhythm_cv": 0.45,
        "rhythm_pause_rate": 0.40,
    },
}


def sample_from_profile(profile_key, field):
    """Sample a value from a Gaussian profile field."""
    p = PROFILES[profile_key][field]
    return np.random.normal(p["mean"], p["std"])


def get_profile(disorder):
    """Get the full profile dict for a disorder type."""
    return PROFILES[disorder]


def apply_session_noise(profile, session_seed=None):
    """
    Apply per-session variation to a profile.
    Simulates fatigue, focus, mood — each session is slightly different.
    Returns a COPY of the profile with noised values.
    """
    if session_seed is not None:
        rng = np.random.RandomState(session_seed)
    else:
        rng = np.random.RandomState()

    noised = {}
    noise_range = SESSION_NOISE_RANGE

    for key, val in profile.items():
        if key == "age_range":
            noised[key] = val
        elif isinstance(val, dict):
            # Gaussian fields (reading_speed, motor_score) — vary the mean
            noised[key] = {
                "mean": val["mean"] * (1 + rng.uniform(-noise_range, noise_range)),
                "std": val["std"],
            }
        elif isinstance(val, float):
            # Scalar params — drift by ±noise_range
            drift = 1 + rng.uniform(-noise_range, noise_range)
            noised[key] = max(0.0, val * drift)
        elif isinstance(val, int):
            drift = 1 + rng.uniform(-noise_range, noise_range)
            noised[key] = max(1, int(val * drift))
        else:
            noised[key] = val

    return noised


def add_feature_noise(features_array):
    """
    Add ±FEATURE_NOISE_PERCENT Gaussian noise to extracted features.
    Applied post-extraction, before training.
    """
    noise = np.random.normal(1.0, FEATURE_NOISE_PERCENT, features_array.shape)
    return features_array * noise


def apply_label_noise(labels, rate=None):
    """
    Randomly flip a small % of labels to simulate misdiagnosis.
    """
    if rate is None:
        rate = LABEL_NOISE_RATE

    all_classes = list(set(labels))
    noised = labels.copy()
    n_flip = int(len(labels) * rate)

    indices = np.random.choice(len(labels), size=n_flip, replace=False)
    for idx in indices:
        current = noised[idx]
        others = [c for c in all_classes if c != current]
        noised[idx] = np.random.choice(others)

    return noised, n_flip
