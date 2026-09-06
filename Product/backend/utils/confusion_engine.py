def extract_confusions(errors):
    """
    Convert raw errors into confusion pairs.
    Supports BOTH formats:
    - Old: [{"expected": "b", "got": "d"}]
    - New: [{"target": "qp", "actual": "dp", "step": 1, "confidence": 0.5}]
    """
    confusions = []

    for err in errors:
        # Support both formats
        expected = err.get("expected") or err.get("target", "")
        got = err.get("got") or err.get("actual", "")

        if not expected or not got or expected == got:
            continue

        # If multi-character (target/actual format), compare char by char
        if len(expected) > 1 or len(got) > 1:
            for i in range(min(len(expected), len(got))):
                if expected[i] != got[i]:
                    pair = f"{expected[i]}/{got[i]}"
                    reverse_pair = f"{got[i]}/{expected[i]}"
                    if pair not in confusions and reverse_pair not in confusions:
                        confusions.append(pair)
        else:
            # Single character comparison
            pair = f"{expected}/{got}"
            reverse_pair = f"{got}/{expected}"
            if pair not in confusions and reverse_pair not in confusions:
                confusions.append(pair)

    return confusions


def build_confusion_exercises(confusions):
    """
    Convert confusions → training exercises
    """
    exercises = []

    for c in confusions:
        letters = c.replace("/", "")
        exercises.append({
            "content": letters,
            "repeat": 20
        })

    return {
        "name": "Adaptive Confusion Training",
        "exercises": exercises
    }

def build_multi_type_exercises(confusions):
    exercises = []

    for c in confusions:
        letters = c.replace("/", "")

        # ✍️ Writing Drill
        exercises.append({
            "type": "writing",
            "content": letters,
            "repeat": 20
        })

        # 👁️ Visual Recognition
        exercises.append({
            "type": "visual",
            "task": f"Identify correct letter: {c}",
            "options": list(letters),
            "answer": letters[0]
        })

        # 🔤 Matching Exercise
        exercises.append({
            "type": "matching",
            "pairs": [
                {"left": letters[0], "right": letters[1]},
                {"left": letters[1], "right": letters[0]}
            ]
        })

        # 🧠 Memory Drill
        exercises.append({
            "type": "memory",
            "task": f"Write from memory: {letters}",
            "repeat": 10
        })

        # 🖊️ Tracing Drill (NEW)
        exercises.append({
            "type": "tracing",
            "task": f"Trace the letter: {letters[0]}",
            "letter": letters[0],
            "repeat": 15
        })

        # 🔁 Reversal Awareness (NEW)
        exercises.append({
            "type": "reversal_check",
            "task": f"Which one is correct? {letters[0]} or {letters[1]}?",
            "correct": letters[0],
            "wrong": letters[1]
        })

    return {
        "name": "Multi-Type Adaptive Training",
        "exercises": exercises
    }