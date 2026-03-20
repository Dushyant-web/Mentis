import csv
import os
import math

INPUT_DIR = "../dataset/raw/eye_data"
OUTPUT_FILE = "../dataset/processed/eye_features.csv"

def compute_features(file_path):
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    fixation_count = 0
    regression_count = 0
    total_fixation_time = 0

    prev_x = None
    prev_y = None

    for i in range(1, len(data)):
        x = float(data[i]["gaze_x"])
        y = float(data[i]["gaze_y"])
        t1 = int(data[i]["timestamp"])
        t0 = int(data[i-1]["timestamp"])

        dt = t1 - t0

        # ---- FIXATION DETECTION (spatial, not time) ----
        dx = abs(x - float(data[i-1]["gaze_x"]))
        dy = abs(y - float(data[i-1]["gaze_y"]))

        # if gaze stays in same small region → fixation
        if dx < 0.3 and dy < 0.3:
            fixation_count += 1
            total_fixation_time += dt

        # ---- REGRESSION DETECTION (strong threshold) ----
        if prev_x is not None and (x < prev_x - 0.5):
            regression_count += 1

        prev_x = x
        prev_y = y

    avg_fixation = total_fixation_time / fixation_count if fixation_count > 0 else 0

    return fixation_count, regression_count, avg_fixation

def main():
    results = []

    for file in os.listdir(INPUT_DIR):
        path = os.path.join(INPUT_DIR, file)

        fixation, regression, avg_fix = compute_features(path)

        session_id = file.replace(".csv", "")

        results.append([
            session_id,
            fixation,
            regression,
            avg_fix
        ])

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "fixation_count",
            "regression_count",
            "avg_fixation_duration"
        ])
        writer.writerows(results)

    print("Eye features extracted.")

if __name__ == "__main__":
    main()