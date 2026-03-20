def generate_plan(prediction, dyslexia_stage, dysgraphia_stage):

    tasks = []

    # -------------------------
    # 📘 DYSLEXIA (READING)
    # -------------------------
    if prediction in ["dyslexia", "both"]:
        if dyslexia_stage == "stage_1":
            tasks.append({"name": "Basic Alphabet Reading", "type": "eye", "difficulty": "easy", "duration": "5min"})
            tasks.append({"name": "Simple Word Tracking", "type": "eye", "difficulty": "easy", "duration": "5min"})

        elif dyslexia_stage == "stage_2":
            tasks.append({"name": "Sentence Tracking", "type": "eye", "difficulty": "medium", "duration": "10min"})
            tasks.append({"name": "Paragraph Reading", "type": "eye", "difficulty": "medium", "duration": "10min"})

        elif dyslexia_stage == "stage_3":
            tasks.append({"name": "Eye Fixation Control", "type": "eye", "difficulty": "hard", "duration": "15min"})
            tasks.append({"name": "Regression Reduction Exercise", "type": "eye", "difficulty": "hard", "duration": "15min"})

    # -------------------------
    # ✍️ DYSGRAPHIA (WRITING)
    # -------------------------
    if prediction in ["dysgraphia", "both"]:
        if dysgraphia_stage == "stage_1":
            tasks.append({"name": "Letter Tracing", "type": "pen", "difficulty": "easy", "duration": "10min"})
            tasks.append({"name": "Basic Stroke Practice", "type": "pen", "difficulty": "easy", "duration": "10min"})

        elif dysgraphia_stage == "stage_2":
            tasks.append({"name": "Confusing Letters (qp, bd)", "type": "pen", "difficulty": "medium", "duration": "15min"})
            tasks.append({"name": "Word Writing Practice", "type": "pen", "difficulty": "medium", "duration": "15min"})

        elif dysgraphia_stage == "stage_3":
            tasks.append({"name": "Slow Stroke Writing", "type": "pen", "difficulty": "hard", "duration": "20min"})
            tasks.append({"name": "Motor Control Exercise", "type": "rhythm", "difficulty": "hard", "duration": "20min"})

    # -------------------------
    # 🧠 NORMAL (MAINTENANCE)
    # -------------------------
    if prediction == "normal":
        tasks = [
            {"name": "Reading Practice", "type": "eye", "difficulty": "easy", "duration": "5min"},
            {"name": "Writing Practice", "type": "pen", "difficulty": "easy", "duration": "5min"}
        ]

    return tasks