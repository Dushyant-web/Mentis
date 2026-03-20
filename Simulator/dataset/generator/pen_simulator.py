import csv
import random
import os
import math

OUTPUT_DIR = "../raw/pen_data"

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
            if row["type"] == "writing":
                sessions.append(row)
    return sessions

def get_params(disorder):
    if disorder == "normal":
        return {
            "noise": 0.1,
            "pause_prob": 0.05,
            "speed_variation": 0.1
        }
    elif disorder == "mild":
        return {
            "noise": 0.2,
            "pause_prob": 0.1,
            "speed_variation": 0.2
        }
    elif disorder == "moderate":
        return {
            "noise": 0.3,
            "pause_prob": 0.2,
            "speed_variation": 0.3
        }
    elif disorder == "severe":
        return {
            "noise": 0.5,
            "pause_prob": 0.35,
            "speed_variation": 0.5
        }
    else:  # dysgraphia
        return {
            "noise": 1.0,
            "pause_prob": 0.5,
            "speed_variation": 0.9
        }

def generate_stroke(length=50):
    points = []
    for i in range(length):
        t = i / length
        x = t * 10
        y = math.sin(t * math.pi) * 2
        points.append((x, y))
    return points

def simulate_pen(session, user):
    disorder = user["disorder"]
    params = get_params(disorder)

    noise = params["noise"]
    pause_prob = params["pause_prob"]
    speed_var = params["speed_variation"]

    strokes = []
    time = 0

    num_letters = random.randint(5, 10)

    for letter in range(num_letters):
        # dysgraphia: random hesitation / motor breaks
        if disorder == "dysgraphia" and random.random() < 0.1:
            time += random.randint(200, 600)
        stroke = generate_stroke(random.randint(30, 60))

        base_speed = random.uniform(5, 15)

        for i, (x, y) in enumerate(stroke):

            # velocity profile (slow-fast-slow)
            velocity_factor = math.sin((i / len(stroke)) * math.pi)

            speed = base_speed * velocity_factor
            speed *= random.uniform(1 - speed_var, 1 + speed_var)

            # avoid zero speed
            speed = max(speed, 1)

            time_increment = int(20 / speed)
            time += time_increment

            strokes.append([
                session["session_id"],
                x + random.uniform(-noise, noise),
                y + random.uniform(-noise, noise),
                time,
                random.uniform(0.5, 1.0)  # pressure
            ])

        # pause between letters
        if random.random() < pause_prob:
            time += random.randint(100, 400)

    return strokes

def save_pen_data(session_id, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    file_path = os.path.join(OUTPUT_DIR, f"{session_id}.csv")

    with open(file_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["session_id", "x", "y", "timestamp", "pressure"])
        writer.writerows(data)

def main():
    users = load_users()
    sessions = load_sessions()

    print("Generating pen data...")

    for i, session in enumerate(sessions):
        user = users[session["user_id"]]

        pen_data = simulate_pen(session, user)
        save_pen_data(session["session_id"], pen_data)

        if i % 100 == 0:
            print(f"Processed {i} writing sessions")

    print("Pen data generation complete.")

if __name__ == "__main__":
    main()