def extract_confusions(errors):
    """
    Convert raw errors into confusion pairs
    Example:
    [{"expected": "b", "got": "d"}] → ["b/d"]
    """
    confusions = []

    for err in errors:
        expected = err.get("expected")
        got = err.get("got")

        if expected and got and expected != got:
            pair = f"{expected}/{got}"
            reverse_pair = f"{got}/{expected}"

            # avoid duplicates like b/d and d/b
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

    return {
        "name": "Multi-Type Adaptive Training",
        "exercises": exercises
    }