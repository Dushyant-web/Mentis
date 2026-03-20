import csv
import os
import math

INPUT_DIR = "../dataset/raw/pen_data"
OUTPUT_FILE = "../dataset/processed/rhythm_features.csv"

def compute_features(file_path):
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        data = list(reader)

    if len(data) < 3:
        return 0, 0, 0, 0

    timings = []
    pauses = []

    for i in range(1, len(data)):
        t1 = int(data[i-1]["timestamp"])
        t2 = int(data[i]["timestamp"])

        dt = t2 - t1

        if dt <= 0:
            continue

        timings.append(dt)

        # pause detection (long gap)
        if dt > 80:
            pauses.append(dt)

    if len(timings) == 0:
        return 0, 0, 0, 0

    # 🔹 1. Timing Stability
    avg_time = sum(timings) / len(timings)
    variance = sum((t - avg_time) ** 2 for t in timings) / len(timings)

    timing_stability = 1 / (1 + variance)

    # 🔹 2. Rhythm Consistency (normalized variance)
    std_dev = math.sqrt(variance)
    rhythm_consistency = 1 / (1 + std_dev)

    # 🔹 3. Pause Density
    pause_density = len(pauses) / len(timings)

    # 🔹 4. Motor Rhythm Index (combined score)
    motor_rhythm_index = (
        0.4 * timing_stability +
        0.3 * rhythm_consistency +
        0.3 * (1 - pause_density)
    )

    return timing_stability, rhythm_consistency, pause_density, motor_rhythm_index


def main():
    results = []

    for file in os.listdir(INPUT_DIR):
        path = os.path.join(INPUT_DIR, file)

        ts, rc, pd, mri = compute_features(path)

        session_id = file.replace(".csv", "")

        results.append([
            session_id,
            ts,
            rc,
            pd,
            mri
        ])

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "session_id",
            "timing_stability",
            "rhythm_consistency",
            "pause_density",
            "motor_rhythm_index"
        ])
        writer.writerows(results)

    print("Rhythm features extracted.")

if __name__ == "__main__":
    main()