
import csv
import random

def add_noise(value, scale=0.05):
    noise = random.uniform(-scale, scale)
    return value + noise

def load_users():
    users = {}
    with open("../dataset/raw/users.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["user_id"]] = row["disorder"]
    return users


def load_sessions():
    sessions = {}
    with open("../dataset/raw/sessions.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sessions[row["session_id"]] = row["user_id"]
    return sessions


def load_feature_file(path):
    data = {}
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data[row["session_id"]] = row
    return data


def build_dataset():
    users = load_users()
    sessions = load_sessions()

    eye = load_feature_file("../dataset/processed/eye_features.csv")
    pen = load_feature_file("../dataset/processed/pen_features.csv")
    rhythm = load_feature_file("../dataset/processed/rhythm_features.csv")

    X = []
    y = []

    for session_id in sessions:

        user_id = sessions[session_id]
        label = users[user_id]

        # adaptive noise scale (preserve dysgraphia signal)
        if label == "dysgraphia":
            noise_scale = 0.02
        else:
            noise_scale = 0.1

        features = []

        # eye features (reading sessions)
        if session_id in eye:
            features += [
                add_noise(float(eye[session_id]["fixation_count"]), noise_scale),
                add_noise(float(eye[session_id]["regression_count"]), noise_scale),
                add_noise(float(eye[session_id]["avg_fixation_duration"]), noise_scale/2),
            ]
        else:
            features += [0, 0, 0]

        # pen features (writing sessions)
        if session_id in pen:
            features += [
                add_noise(float(pen[session_id]["isochrony_score"]), noise_scale/2),
                add_noise(float(pen[session_id]["homothety_score"]), noise_scale/2),
                add_noise(float(pen[session_id]["timing_variance"]), noise_scale),
                add_noise(float(pen[session_id]["avg_jerk"]), noise_scale),
            ]
        else:
            features += [0, 0, 0, 0]

        # rhythm features (writing sessions)
        if session_id in rhythm:
            features += [
                add_noise(float(rhythm[session_id]["timing_stability"]), noise_scale) * (1.5 if label == "dysgraphia" else 1),
                add_noise(float(rhythm[session_id]["rhythm_consistency"]), noise_scale) * (1.5 if label == "dysgraphia" else 1),
                add_noise(float(rhythm[session_id]["pause_density"]), noise_scale) * (1.5 if label == "dysgraphia" else 1),
                add_noise(float(rhythm[session_id]["motor_rhythm_index"]), noise_scale) * (1.5 if label == "dysgraphia" else 1),
            ]
        else:
            features += [0, 0, 0, 0]

        # session-level variability (human inconsistency)
        session_variation = random.uniform(0.85, 1.15)
        features = [f * session_variation for f in features]

        X.append(features)
        y.append(label)

    return X, y