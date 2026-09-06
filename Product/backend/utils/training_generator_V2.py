# training_generator_V2.py
# 🧠 ADAPTIVE TRAINING ENGINE V2 — Error-Driven, Expanded Exercise Bank

from datetime import datetime, timedelta
import random


# =========================================
# 🎯 ADAPTIVE LEVEL ENGINE
# Computes 0-100 skill score from all user signals,
# then maps to one of 5 levels that drives exercise difficulty.
# =========================================

LEVEL_THRESHOLDS = [
    # (max_score, label, slug, description, badge_color)
    (20,  "Beginner",       "beginner",    "Just getting started — gentle, confidence-building exercises", "#22c55e"),
    (40,  "Developing",     "developing",  "Building core skills — structured drills and repetition",      "#3b82f6"),
    (60,  "Intermediate",   "intermediate","Solid foundation — balanced reading and writing challenges",    "#8b5cf6"),
    (80,  "Advanced",       "advanced",    "Strong skills — speed, accuracy, and complex patterns",        "#f59e0b"),
    (101, "Expert",         "expert",      "Near-mastery — high-intensity fluency and comprehension",      "#ef4444"),
]


def compute_user_level(db, user_id: int) -> dict:
    """
    Compute adaptive training level from all available user signals.

    Signals used (with weights):
      1. Assessment stage    (40 pts) — primary clinical indicator
      2. Risk scores         (20 pts) — dyslexia + dysgraphia probability
      3. Total XP earned     (15 pts) — effort/progress proxy
      4. Assessment count    (10 pts) — longitudinal engagement
      5. Improvement trend   (10 pts) — improving = lower level needed
      6. Days active (streak)(5 pts)  — consistency bonus

    Returns a dict with:
      - skill_score:  0-100
      - level_label:  "Beginner" … "Expert"
      - level_slug:   "beginner" … "expert"
      - description:  human-readable context
      - badge_color:  hex color
      - difficulty:   "easy" | "medium" | "hard"  (for task generation)
      - xp_multiplier: float (XP bonus for harder levels)
      - breakdown:    per-signal score for UI display
    """
    from db import models

    breakdown = {
        "stage_score": 0,
        "risk_score": 0,
        "xp_score": 0,
        "assessment_count_score": 0,
        "trend_score": 0,
        "streak_score": 0,
    }

    # ─────────────────────────────────────────
    # Signal 1: Assessment Stage (40 pts)
    # Severity of the latest result drives the floor.
    # Higher severity → user needs more intensive training (higher level).
    # ─────────────────────────────────────────
    latest_result = (
        db.query(models.Result)
        .join(models.Assessment)
        .filter(models.Assessment.user_id == user_id)
        .order_by(models.Result.created_at.desc())
        .first()
    )

    stage_map = {
        ("stage_1", "stage_1"): 10,
        ("stage_1", "stage_2"): 18,
        ("stage_1", "stage_3"): 28,
        ("stage_2", "stage_1"): 20,
        ("stage_2", "stage_2"): 30,
        ("stage_2", "stage_3"): 38,
        ("stage_3", "stage_1"): 28,
        ("stage_3", "stage_2"): 35,
        ("stage_3", "stage_3"): 40,
    }

    dyslexia_stage = "stage_1"
    dysgraphia_stage = "stage_1"

    if latest_result:
        dyslexia_stage = latest_result.dyslexia_stage or "stage_1"
        dysgraphia_stage = latest_result.dysgraphia_stage or "stage_1"
        stage_key = (dyslexia_stage, dysgraphia_stage)
        breakdown["stage_score"] = stage_map.get(stage_key, 15)

    # ─────────────────────────────────────────
    # Signal 2: Risk Scores (20 pts)
    # Higher risk scores → needs harder training.
    # ─────────────────────────────────────────
    if latest_result:
        dyslexia_risk = (latest_result.dyslexia_score or 0.0)
        dysgraphia_risk = (latest_result.dysgraphia_score or 0.0)
        combined_risk = (dyslexia_risk + dysgraphia_risk) / 2.0
        breakdown["risk_score"] = round(combined_risk * 20, 1)

    # ─────────────────────────────────────────
    # Signal 3: Total XP Earned (15 pts)
    # More XP = more training completed = should face harder drills.
    # Scale: 0 XP → 0 pts,  2000+ XP → 15 pts
    # ─────────────────────────────────────────
    from sqlalchemy import func as sqfunc
    total_xp_row = (
        db.query(sqfunc.coalesce(sqfunc.sum(models.Progress.xp), 0))
        .filter(models.Progress.user_id == user_id)
        .scalar()
    )
    total_xp = int(total_xp_row or 0)
    xp_score = min(15, (total_xp / 2000) * 15)
    breakdown["xp_score"] = round(xp_score, 1)

    # ─────────────────────────────────────────
    # Signal 4: Assessment Count (10 pts)
    # More assessments done → more longitudinal data → handle harder content.
    # 1 assessment → 2 pts, 5+ → 10 pts
    # ─────────────────────────────────────────
    assessment_count = (
        db.query(sqfunc.count(models.Assessment.id))
        .filter(models.Assessment.user_id == user_id)
        .scalar()
        or 0
    )
    count_score = min(10, assessment_count * 2)
    breakdown["assessment_count_score"] = count_score

    # ─────────────────────────────────────────
    # Signal 5: Improvement Trend (10 pts)
    # If scores are IMPROVING across last 3 assessments → user is recovering.
    # Improving trend = REDUCE level slightly (they're making progress).
    # Worsening trend = INCREASE level (needs harder exercises).
    # ─────────────────────────────────────────
    trend_score = 5  # neutral baseline
    history = (
        db.query(models.IssueHistory)
        .filter(models.IssueHistory.user_id == user_id)
        .order_by(models.IssueHistory.created_at.desc())
        .limit(3)
        .all()
    )
    if len(history) >= 2:
        oldest = history[-1]
        newest = history[0]
        reading_delta = (newest.reading_score or 0) - (oldest.reading_score or 0)
        writing_delta = (newest.writing_score or 0) - (oldest.writing_score or 0)
        avg_delta = (reading_delta + writing_delta) / 2
        if avg_delta < -0.05:      # improving (scores falling = risk falling = good)
            trend_score = 2        # give them easier, confidence-building work
        elif avg_delta > 0.05:     # worsening
            trend_score = 10       # push harder exercises
        else:
            trend_score = 5        # stable → keep same level
    breakdown["trend_score"] = trend_score

    # ─────────────────────────────────────────
    # Signal 6: Days Active / Streak (5 pts)
    # More consistent users should tackle harder material.
    # ─────────────────────────────────────────
    last_7_days = datetime.utcnow() - timedelta(days=7)
    active_days = (
        db.query(sqfunc.count(sqfunc.distinct(
            sqfunc.date(models.Progress.created_at)
        )))
        .filter(
            models.Progress.user_id == user_id,
            models.Progress.created_at >= last_7_days
        )
        .scalar()
        or 0
    )
    streak_score = min(5, active_days * 0.7)
    breakdown["streak_score"] = round(streak_score, 1)

    # ─────────────────────────────────────────
    # Final score: weighted sum (max 100)
    # ─────────────────────────────────────────
    skill_score = round(
        breakdown["stage_score"] +
        breakdown["risk_score"] +
        breakdown["xp_score"] +
        breakdown["assessment_count_score"] +
        breakdown["trend_score"] +
        breakdown["streak_score"]
    )
    skill_score = max(0, min(100, skill_score))

    # Map score → level
    label, slug, description, badge_color = "Beginner", "beginner", "", "#22c55e"
    for threshold, lbl, slg, desc, color in LEVEL_THRESHOLDS:
        if skill_score < threshold:
            label, slug, description, badge_color = lbl, slg, desc, color
            break

    # Difficulty and XP multiplier for task generation
    difficulty_map = {
        "beginner":    ("easy",   0.8),
        "developing":  ("easy",   1.0),
        "intermediate":("medium", 1.0),
        "advanced":    ("hard",   1.2),
        "expert":      ("hard",   1.5),
    }
    difficulty, xp_multiplier = difficulty_map[slug]

    # Per-axis difficulty (reading vs writing can differ)
    reading_difficulty = difficulty
    writing_difficulty = difficulty

    if latest_result:
        d_score = latest_result.dyslexia_score or 0
        g_score = latest_result.dysgraphia_score or 0
        # If one axis is significantly better, keep it easier
        if d_score < 0.3 and g_score > 0.5:
            reading_difficulty = "easy"
        elif g_score < 0.3 and d_score > 0.5:
            writing_difficulty = "easy"

    return {
        "skill_score": skill_score,
        "level_label": label,
        "level_slug": slug,
        "description": description,
        "badge_color": badge_color,
        "difficulty": difficulty,
        "reading_difficulty": reading_difficulty,
        "writing_difficulty": writing_difficulty,
        "xp_multiplier": xp_multiplier,
        "dyslexia_stage": dyslexia_stage,
        "dysgraphia_stage": dysgraphia_stage,
        "breakdown": breakdown,
        "meta": {
            "total_xp": total_xp,
            "assessment_count": assessment_count,
            "active_days_last_7": int(active_days),
        }
    }



# =========================================
# 🧠 EXPANDED EXERCISE BANK (25+ exercises)
# =========================================
def get_exercise_bank():
    return {
        # -------------------------
        # 📖 READING EXERCISES (8 types)
        # -------------------------
        "reading": [
            {
                "name": "Reading Flow Exercise",
                "type": "eye",
                "difficulty": "easy",
                "duration": "10min",
                "xp": 50,
                "mode": "follow_highlight",
                "description": "Follow highlighted words as they appear on screen"
            },
            {
                "name": "Word Recognition Speed",
                "type": "eye",
                "difficulty": "medium",
                "duration": "7min",
                "xp": 45,
                "mode": "flashcards",
                "description": "Identify flashed words quickly"
            },
            {
                "name": "Regression Reduction Drill",
                "type": "eye",
                "difficulty": "hard",
                "duration": "12min",
                "xp": 65,
                "mode": "no_backtrack",
                "description": "Read text without going back — trains forward eye movement"
            },
            {
                "name": "Speed Reading Challenge",
                "type": "eye",
                "difficulty": "hard",
                "duration": "15min",
                "xp": 70,
                "mode": "timed_read",
                "description": "Read passages against a timer to build fluency"
            },
            {
                "name": "Word Pair Matching",
                "type": "eye",
                "difficulty": "easy",
                "duration": "5min",
                "xp": 35,
                "mode": "pair_match",
                "description": "Match similar-looking words to build discrimination"
            },
            {
                "name": "Sentence Completion",
                "type": "eye",
                "difficulty": "medium",
                "duration": "8min",
                "xp": 50,
                "mode": "fill_blank",
                "description": "Fill in missing words using context clues"
            },
            {
                "name": "Phoneme Awareness Training",
                "type": "eye",
                "difficulty": "medium",
                "duration": "10min",
                "xp": 55,
                "mode": "phoneme_split",
                "description": "Break words into sound groups"
            },
            {
                "name": "Contextual Reading Comprehension",
                "type": "eye",
                "difficulty": "hard",
                "duration": "15min",
                "xp": 75,
                "mode": "comprehension",
                "description": "Read a passage and answer questions"
            },
        ],

        # -------------------------
        # ✍️ WRITING EXERCISES (8 types)
        # -------------------------
        "writing": [
            {
                "name": "Letter Pattern Writing",
                "type": "pen",
                "difficulty": "easy",
                "duration": "8min",
                "xp": 40,
                "patterns": ["b", "d", "p", "q"],
                "description": "Practice individual letter forms"
            },
            {
                "name": "Confusing Letters Training",
                "type": "pen",
                "difficulty": "medium",
                "duration": "15min",
                "xp": 60,
                "exercises": [
                    {"content": "qp", "repeat": 20},
                    {"content": "bd", "repeat": 20}
                ],
                "description": "Focus on commonly confused letter pairs"
            },
            {
                "name": "Word Copy Accuracy",
                "type": "pen",
                "difficulty": "easy",
                "duration": "10min",
                "xp": 45,
                "mode": "copy_exact",
                "description": "Copy words exactly as shown — builds visual memory"
            },
            {
                "name": "Sentence Writing Practice",
                "type": "pen",
                "difficulty": "medium",
                "duration": "12min",
                "xp": 55,
                "mode": "sentence_write",
                "description": "Write complete sentences from prompts"
            },
            {
                "name": "Dictation Challenge",
                "type": "pen",
                "difficulty": "hard",
                "duration": "15min",
                "xp": 70,
                "mode": "dictation",
                "description": "Write words/sentences from audio prompts"
            },
            {
                "name": "Letter Size Consistency",
                "type": "pen",
                "difficulty": "easy",
                "duration": "8min",
                "xp": 40,
                "mode": "size_control",
                "description": "Practice keeping letters uniform in size"
            },
            {
                "name": "Speed Writing Drill",
                "type": "pen",
                "difficulty": "hard",
                "duration": "10min",
                "xp": 65,
                "mode": "speed_write",
                "description": "Write as fast as possible while maintaining accuracy"
            },
            {
                "name": "Memory Recall Writing",
                "type": "pen",
                "difficulty": "medium",
                "duration": "12min",
                "xp": 60,
                "mode": "memory_write",
                "description": "See a word, then write it from memory"
            },
        ],

        # -------------------------
        # 🎵 MOTOR/RHYTHM EXERCISES (4 types)
        # -------------------------
        "motor": [
            {
                "name": "Rhythm & Timing",
                "type": "rhythm",
                "difficulty": "easy",
                "duration": "5min",
                "xp": 30,
                "mode": "tap_sync",
                "description": "Tap in rhythm with visual/audio cues"
            },
            {
                "name": "Stroke Smoothness Training",
                "type": "rhythm",
                "difficulty": "medium",
                "duration": "8min",
                "xp": 45,
                "mode": "smooth_trace",
                "description": "Trace curves smoothly without jerking"
            },
            {
                "name": "Pressure Control Exercise",
                "type": "rhythm",
                "difficulty": "medium",
                "duration": "7min",
                "xp": 40,
                "mode": "pressure_control",
                "description": "Maintain consistent pen pressure"
            },
            {
                "name": "Fine Motor Coordination",
                "type": "rhythm",
                "difficulty": "hard",
                "duration": "10min",
                "xp": 55,
                "mode": "precision_draw",
                "description": "Draw precise shapes and patterns"
            },
        ],

        # -------------------------
        # 🧠 COGNITIVE EXERCISES (3 types)
        # -------------------------
        "cognitive": [
            {
                "name": "Visual Memory Challenge",
                "type": "combined",
                "difficulty": "medium",
                "duration": "8min",
                "xp": 50,
                "mode": "visual_memory",
                "description": "Remember and reproduce letter sequences"
            },
            {
                "name": "Multisensory Training",
                "type": "combined",
                "difficulty": "medium",
                "duration": "15min",
                "xp": 60,
                "mode": "multisensory",
                "description": "See, hear, and write words together"
            },
            {
                "name": "Pattern Recognition",
                "type": "combined",
                "difficulty": "easy",
                "duration": "6min",
                "xp": 35,
                "mode": "pattern_spot",
                "description": "Spot patterns in letter and word sequences"
            },
        ],
    }


# =========================================
# 🧠 ERROR-DRIVEN CONFUSION EXTRACTION (UPGRADED)
# =========================================
def extract_confusions(errors):
    """
    Works with BOTH formats:
    - Old: [{"expected": "b", "got": "d"}]
    - New: [{"target": "qp", "actual": "dp", "step": 1}]
    """
    if not errors:
        return []

    confusion_map = {}

    for e in errors:
        # Support new format (from writing test)
        target = e.get("target") or e.get("expected", "")
        actual = e.get("actual") or e.get("got", "")

        if not target or not actual or target == actual:
            continue

        # Character-level comparison
        for i in range(min(len(target), len(actual))):
            if target[i] != actual[i]:
                key = tuple(sorted([target[i], actual[i]]))
                confusion_map[key] = confusion_map.get(key, 0) + 1

    # Sort by frequency
    sorted_confusions = sorted(
        confusion_map.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return [f"{a}/{b}" for (a, b), _ in sorted_confusions]


# =========================================
# 🧠 DB-DRIVEN ERROR EXTRACTION (NEW)
# Uses stored AssessmentError records for persistent learning
# =========================================
def extract_confusions_from_db(db, user_id, limit=50):
    """
    Pull the most frequent confusion patterns from AssessmentError table
    Returns: [{"pair": "b/d", "count": 12, "type": "reversal"}, ...]
    """
    try:
        from db import models
        errors = db.query(models.AssessmentError)\
            .filter(
                models.AssessmentError.user_id == user_id,
                models.AssessmentError.is_correct == False
            )\
            .order_by(models.AssessmentError.created_at.desc())\
            .limit(limit)\
            .all()

        if not errors:
            return [], {}

        # Aggregate confused letters
        confusion_map = {}
        error_type_map = {}
        word_errors = {}  # Track which words the user struggles with

        for err in errors:
            # Track word-level errors
            if err.target_word and err.actual_word:
                word_errors[err.target_word] = word_errors.get(err.target_word, 0) + 1

            # Track letter-level confusions
            if err.confused_letters:
                for c in err.confused_letters:
                    key = tuple(sorted([c.get("expected", ""), c.get("actual", "")]))
                    confusion_map[key] = confusion_map.get(key, 0) + 1

            # Track error type distribution
            if err.error_type:
                error_type_map[err.error_type] = error_type_map.get(err.error_type, 0) + 1

        # Sort by frequency
        sorted_confusions = sorted(
            confusion_map.items(),
            key=lambda x: x[1],
            reverse=True
        )

        confusion_pairs = [f"{a}/{b}" for (a, b), _ in sorted_confusions[:10]]
        
        # Sort word errors by frequency
        sorted_words = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)
        
        return confusion_pairs, {
            "error_types": error_type_map,
            "problem_words": [w for w, _ in sorted_words[:15]],
            "total_errors": len(errors)
        }
    except Exception as e:
        print(f"DB confusion extraction error: {e}")
        return [], {}


# =========================================
# 🛠️ BUILD CONFUSION EXERCISES (UPGRADED)
# =========================================
def build_confusion_exercises(confusions, repeat=20):
    if not confusions:
        return None

    exercises = []
    for pair in confusions[:5]:  # top 5 confused pairs
        parts = pair.split("/")
        if len(parts) != 2:
            continue
        a, b = parts
        exercises.append({
            "content": f"{a}{b}",
            "repeat": repeat
        })

    return {
        "name": "Adaptive Confusion Training",
        "type": "pen",
        "difficulty": "adaptive",
        "duration": "15min",
        "xp": 60,
        "exercises": exercises
    }


def build_error_driven_exercises(confusion_pairs, error_stats):
    """
    Build targeted exercises based on the user's specific error patterns
    """
    exercises = []
    
    # 1. Reversal-specific exercises
    error_types = error_stats.get("error_types", {})
    if error_types.get("reversal", 0) > 2:
        exercises.append({
            "name": "Mirror Letter Discrimination",
            "type": "pen",
            "difficulty": "adaptive",
            "duration": "12min",
            "xp": 65,
            "mode": "reversal_drill",
            "description": "Practice distinguishing mirror-image letters (b/d, p/q)"
        })
    
    # 2. Omission-specific exercises
    if error_types.get("omission", 0) > 2:
        exercises.append({
            "name": "Letter Completion Training",
            "type": "pen",
            "difficulty": "adaptive",
            "duration": "10min",
            "xp": 55,
            "mode": "completion_drill",
            "description": "Practice writing complete words — focus on missing letters"
        })
    
    # 3. Word-specific re-training
    problem_words = error_stats.get("problem_words", [])
    if problem_words:
        exercises.append({
            "name": "Problem Word Mastery",
            "type": "pen",
            "difficulty": "adaptive",
            "duration": "15min",
            "xp": 70,
            "mode": "word_drill",
            "words": problem_words[:10],
            "description": f"Practice your {len(problem_words[:10])} most-struggled words"
        })
    
    # 4. Confusion pair drills
    if confusion_pairs:
        exercises.append({
            "name": "Confusion Pair Mastery",
            "type": "pen",
            "difficulty": "adaptive",
            "duration": "12min",
            "xp": 60,
            "mode": "confusion_drill",
            "pairs": confusion_pairs[:5],
            "exercises": [{"content": p.replace("/", ""), "repeat": 15} for p in confusion_pairs[:5]],
            "description": f"Focus on your top confused letters: {', '.join(confusion_pairs[:3])}"
        })
    
    return exercises


# =========================================
# 🎯 STAGE-BASED EXERCISE SELECTION (EXPANDED)
# =========================================
def select_exercises(user_level, db=None, user_id=None):
    bank = get_exercise_bank()
    day_of_year = datetime.utcnow().timetuple().tm_yday
    selected = []

    dyslexia_stage = user_level["dyslexia_stage"]
    dysgraphia_stage = user_level["dysgraphia_stage"]
    r_diff = user_level["reading_difficulty"]
    w_diff = user_level["writing_difficulty"]
    xp_mult = user_level["xp_multiplier"]

    # -------------------------
    # 📖 READING (stage-based selection)
    # -------------------------
    r_bank = bank["reading"]
    if dyslexia_stage == "stage_3":
        # Severe: 4 reading exercises including hard ones
        selected.append(r_bank[2])  # Regression Reduction
        selected.append(r_bank[3])  # Speed Reading
        selected.append(r_bank[day_of_year % len(r_bank)])  # Rotate
        selected.append(r_bank[7])  # Comprehension
    elif dyslexia_stage == "stage_2":
        # Moderate: 3 reading exercises
        selected.append(r_bank[0])  # Flow
        selected.append(r_bank[5])  # Sentence Completion
        selected.append(r_bank[(day_of_year + 1) % len(r_bank)])  # Rotate
    else:
        # Mild: 2 reading exercises
        selected.append(r_bank[0])  # Flow
        selected.append(r_bank[4])  # Word Pair Matching

    # Apply reading difficulty and XP
    for ex in selected[-4:]: # Only affect reading exercises we just added
        ex = ex.copy()
        ex["difficulty"] = r_diff
        ex["xp"] = int(ex["xp"] * xp_mult)

    # -------------------------
    # ✍️ WRITING (stage-based selection)
    # -------------------------
    w_bank = bank["writing"]
    w_start_idx = len(selected)

    if dysgraphia_stage == "stage_3":
        # Severe: 4 writing exercises
        selected.append(w_bank[1])  # Confusing Letters
        selected.append(w_bank[4])  # Dictation
        selected.append(w_bank[6])  # Speed Writing
        selected.append(w_bank[day_of_year % len(w_bank)])  # Rotate
    elif dysgraphia_stage == "stage_2":
        # Moderate: 3 writing exercises
        selected.append(w_bank[0])  # Letter Pattern
        selected.append(w_bank[2])  # Word Copy
        selected.append(w_bank[3])  # Sentence Writing
    else:
        # Mild: 2 writing exercises
        selected.append(w_bank[0])  # Letter Pattern
        selected.append(w_bank[(day_of_year + 2) % len(w_bank)])  # Rotate

    # Apply writing difficulty and XP
    for i in range(w_start_idx, len(selected)):
        selected[i] = selected[i].copy()
        selected[i]["difficulty"] = w_diff
        selected[i]["xp"] = int(selected[i]["xp"] * xp_mult)

    # -------------------------
    # 🎵 MOTOR (always at least 1)
    # -------------------------
    m_bank = bank["motor"]
    m_idx = len(selected)
    selected.append(m_bank[day_of_year % len(m_bank)])
    if dysgraphia_stage in ["stage_2", "stage_3"]:
        selected.append(m_bank[(day_of_year + 1) % len(m_bank)])
        
    for i in range(m_idx, len(selected)):
        selected[i] = selected[i].copy()
        selected[i]["xp"] = int(selected[i]["xp"] * xp_mult)

    # -------------------------
    # 🧠 COGNITIVE (always 1)
    # -------------------------
    c_bank = bank["cognitive"]
    c_ex = c_bank[day_of_year % len(c_bank)].copy()
    c_ex["xp"] = int(c_ex["xp"] * xp_mult)
    selected.append(c_ex)

    # -------------------------
    # 🔥 DB-DRIVEN ADAPTIVE EXERCISES (NEW)
    # -------------------------
    if db and user_id:
        try:
            confusion_pairs, error_stats = extract_confusions_from_db(db, user_id)
            adaptive = build_error_driven_exercises(confusion_pairs, error_stats)
            # Apply XP mult to adaptive
            for ax in adaptive:
                ax["xp"] = int(ax["xp"] * xp_mult)
            # Prepend adaptive exercises (highest priority)
            selected = adaptive + selected
        except Exception as e:
            print(f"Adaptive exercise error: {e}")

    # Remove duplicates by name
    seen = set()
    unique_selected = []
    for ex in selected:
        if ex["name"] not in seen:
            unique_selected.append(ex)
            seen.add(ex["name"])

    return unique_selected


# =========================================
# 📅 GENERATE TODAY PLAN
# =========================================
def generate_today_plan(user_level, errors=None, db=None, user_id=None):
    exercises = select_exercises(user_level, db=db, user_id=user_id)

    # 🔥 ADAPTIVE: extract confusions from session errors (fallback if no DB)
    if errors and not db:
        confusions = extract_confusions(errors)
        adaptive_ex = build_confusion_exercises(confusions)
        if adaptive_ex:
            adaptive_ex["xp"] = int(adaptive_ex["xp"] * user_level["xp_multiplier"])
            exercises.insert(0, adaptive_ex)

    formatted = []
    for ex in exercises:
        formatted.append({
            "id": None,
            "name": ex["name"],
            "type": ex["type"],
            "difficulty": ex.get("difficulty", "medium"),
            "duration": ex["duration"],
            "xp": ex["xp"],
            "status": "pending",
            "data": ex
        })

    return formatted


# =========================================
# 📊 MAIN PROGRAM GENERATOR
# =========================================
def generate_program(dyslexia_stage, dysgraphia_stage, db=None, user_id=None):
    # Compute level if DB is provided, otherwise fake a default one
    if db and user_id:
        from utils.training_generator_V2 import compute_user_level
        user_level = compute_user_level(db, user_id)
    else:
        user_level = {
            "dyslexia_stage": dyslexia_stage,
            "dysgraphia_stage": dysgraphia_stage,
            "reading_difficulty": "medium",
            "writing_difficulty": "medium",
            "xp_multiplier": 1.0,
            "skill_score": 50,
            "level_label": "Intermediate",
            "level_slug": "intermediate",
            "description": "Fallback level",
            "badge_color": "#8b5cf6"
        }

    today_exercises = generate_today_plan(
        user_level, 
        db=db, user_id=user_id
    )

    total_xp = sum(e["xp"] for e in today_exercises)

    return {
        "program": {
            "total_weeks": 8,
            "current_week": 1,
            "generated_at": datetime.utcnow().isoformat(),
            "xp_today_total": total_xp,
            "adaptive_level": user_level,

            "today": {
                "progress": 0,
                "exercises": today_exercises
            }
        }
    }
