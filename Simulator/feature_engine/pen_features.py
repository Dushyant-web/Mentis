import csv
import os
import math

INPUT_DIR = "../dataset/raw/pen_data"
OUTPUT_FILE = "../dataset/processed/pen_features.csv"

def compute_velocity(p1, p2, dt):
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dist = math.sqrt(dx*dx + dy*dy)
    return dist / (dt + 1)

def compute_features(file_path):
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    velocities = []
    timings = []

    for i in range(1, len(data)):
        x1 = float(data[i-1]["x"])
        y1 = float(data[i-1]["y"])
        t1 = int(data[i-1]["timestamp"])

        x2 = float(data[i]["x"])
        y2 = float(data[i]["y"])
        t2 = int(data[i]["timestamp"])

        dt = t2 - t1

        if dt <= 0:
            continue

        v = compute_velocity((x1, y1), (x2, y2), dt)

        velocities.append(v)
        timings.append(dt)

    # Isochrony: timing consistency
    avg_time = sum(timings) / (len(timings) + 1)
    time_variance = sum((t - avg_time)**2 for t in timings) / (len(timings) + 1)

    isochrony_score = 1 / (1 + time_variance)

    # Homothety: relative timing stability
    ratios = []
    total_time = sum(timings) + 1

    for t in timings:
        ratios.append(t / total_time)

    avg_ratio = sum(ratios) / (len(ratios) + 1)
    ratio_variance = sum((r - avg_ratio)**2 for r in ratios) / (len(ratios) + 1)

    homothety_score = 1 / (1 + ratio_variance)

    # Jerk (change in velocity)
    jerk_values = []
    for i in range(1, len(velocities)):
        jerk = abs(velocities[i] - velocities[i-1])
        jerk_values.append(jerk)

    avg_jerk = sum(jerk_values) / (len(jerk_values) + 1)

    return isochrony_score, homothety_score, time_variance, avg_jerk

def main():
    results = []

    for file in os.listdir(INPUT_DIR):
        path = os.path.join(INPUT_DIR, file)

        iso, homo, var, jerk = compute_features(path)

        session_id = file.replace(".csv", "")

        results.append([
            session_id,
            iso,
            homo,
            var,
            jerk
        ])

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "isochrony_score",
            "homothety_score",
            "timing_variance",
            "avg_jerk"
        ])
        writer.writerows(results)

    print("Pen features extracted.")

if __name__ == "__main__":
    main()