"""
Simulator 2.0 — Master Pipeline Runner

Single command to generate everything:
  Users → Sessions → Raw Data (Pen + Eye) → Features → Model

Usage:
    python run_all.py
"""

import os
import sys
import time

# Set base directory
BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)


def run_step(step_name, func):
    """Run a pipeline step with timing."""
    print(f"\n{'='*60}")
    print(f"  Step: {step_name}")
    print(f"{'='*60}")
    start = time.time()
    func()
    elapsed = time.time() - start
    print(f"  Completed in {elapsed:.1f}s")


def main():
    print("=" * 60)
    print("  SIMULATOR 2.0 — Full Pipeline")
    print("=" * 60)

    total_start = time.time()

    # Step 1: Generate Users
    from dataset.generator.user_generator import generate_users, save_users
    def step_users():
        users = generate_users()
        save_users(users, os.path.join(BASE, "dataset", "raw"))
    run_step("Generate Users", step_users)

    # Step 2: Generate Sessions
    from dataset.generator.session_generator import load_users, generate_sessions, save_sessions
    def step_sessions():
        raw_dir = os.path.join(BASE, "dataset", "raw")
        users = load_users(raw_dir)
        sessions = generate_sessions(users)
        save_sessions(sessions, raw_dir)
    run_step("Generate Sessions", step_sessions)

    # Step 3: Simulate Pen Data
    from dataset.generator.pen_simulator import main as pen_main
    run_step("Simulate Pen Data", pen_main)

    # Step 4: Simulate Eye Data
    from dataset.generator.eye_simulator import main as eye_main
    run_step("Simulate Eye Data", eye_main)

    # Step 5: Extract Pen Features
    from feature_engine.pen_features import main as pen_feat_main
    run_step("Extract Pen Features", pen_feat_main)

    # Step 6: Extract Eye Features
    from feature_engine.eye_features import main as eye_feat_main
    run_step("Extract Eye Features", eye_feat_main)

    # Step 7: Extract Rhythm Features
    from dataset.generator.rhythm_engine import main as rhythm_main
    run_step("Extract Rhythm Features", rhythm_main)

    # Step 8: Train Model
    from training.train_model import train
    run_step("Train Model", train)

    total_elapsed = time.time() - total_start

    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE — Total time: {total_elapsed:.1f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
