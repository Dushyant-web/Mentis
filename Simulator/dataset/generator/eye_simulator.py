import csv
import random
import os

OUTPUT_DIR = "../raw/eye_data"
WORDS_PER_LINE = 10
LINES = 5

def load_users():
    users = {}
    with open("../raw/users.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["user_id"]] = row
    return users

def load_sessions():
    sessions = []
    with open("../raw/sessions.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["type"] == "reading":
                sessions.append(row)
    return sessions

def get_params(disorder):
    if disorder == "normal":
        return {
            "fixation_range": (150, 250),
            "regression_prob": 0.05
        }
    elif disorder == "mild":
        return {
            "fixation_range": (200, 300),
            "regression_prob": 0.10
        }
    elif disorder == "moderate":
        return {
            "fixation_range": (250, 400),
            "regression_prob": 0.20
        }
    elif disorder == "severe":
        return {
            "fixation_range": (300, 600),
            "regression_prob": 0.35
        }
    else:
        return {
            "fixation_range": (180, 280),
            "regression_prob": 0.08
        }

def generate_reading_path():
    words = [(x, y) for y in range(LINES) for x in range(WORDS_PER_LINE)]
    return words

def simulate_eye(session, user):
    disorder = user["disorder"]
    params = get_params(disorder)

    fixation_min, fixation_max = params["fixation_range"]
    regression_prob = params["regression_prob"]

    path = generate_reading_path()

    gaze_data = []
    time = 0
    i = 0

    while i < len(path):
        x, y = path[i]

        fixation_time = random.randint(fixation_min, fixation_max)

        for t in range(fixation_time // 20):  # sample every ~20ms
            gaze_data.append([
                session["session_id"],
                x + random.uniform(-0.2, 0.2),
                y + random.uniform(-0.2, 0.2),
                time
            ])
            time += 20

        # regression (go back)
        if random.random() < regression_prob and i > 2:
            i -= random.randint(1, 3)
        else:
            i += 1

    return gaze_data

def save_eye_data(session_id, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    file_path = os.path.join(OUTPUT_DIR, f"{session_id}.csv")

    with open(file_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "gaze_x", "gaze_y", "timestamp"])
        writer.writerows(data)

def main():
    users = load_users()
    sessions = load_sessions()

    print("Generating eye tracking data...")

    for i, session in enumerate(sessions):
        user = users[session["user_id"]]

        gaze_data = simulate_eye(session, user)
        save_eye_data(session["session_id"], gaze_data)

        if i % 100 == 0:
            print(f"Processed {i} sessions")

    print("Eye tracking data generation complete.")

if __name__ == "__main__":
    main()