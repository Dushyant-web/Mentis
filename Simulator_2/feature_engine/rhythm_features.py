"""
Rhythm Feature Extractor 2.0
Wrapper around rhythm_engine.py's feature extraction.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dataset", "generator"))
from rhythm_engine import main as extract_rhythm


if __name__ == "__main__":
    extract_rhythm()
