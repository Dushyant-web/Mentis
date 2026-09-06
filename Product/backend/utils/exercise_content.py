# exercise_content.py
# 🧠 Content Engine — Serves actual exercise content for all 23 training types
# Each exercise returns structured content the frontend can render

import random
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================================
# 📂 LOAD DATASETS
# =========================================
def safe_load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return []

def safe_load_csv(path, has_header=True):
    try:
        with open(path) as f:
            lines = [line.strip() for line in f.read().splitlines() if line.strip()]
            if has_header and lines:
                return lines[1:]  # skip header
            return lines
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return []

# Load all datasets
WORD_BANK_RAW = safe_load_csv(BASE_DIR / "dataset" / "WORD_BANK.csv")
SENTENCES_RAW = safe_load_csv(BASE_DIR / "dataset" / "SENTENCES.csv")
MIRROR_PAIRS_RAW = safe_load_csv(BASE_DIR / "dataset" / "MIRROR_PAIRS.csv")
AUDIO_RAW = safe_load_csv(BASE_DIR / "dataset" / "AUDIO.csv")
MATCHING_DATA = safe_load_json(BASE_DIR / "dataset" / "MATCHING_MIXED.json")
POEMS = safe_load_json(BASE_DIR / "dataset" / "POEMS.json")

# Parse CSV into structured data
def parse_words():
    words = {"easy": [], "medium": [], "hard": []}
    for line in WORD_BANK_RAW:
        parts = line.split(",")
        if len(parts) >= 2:
            word, level = parts[0].strip(), parts[1].strip().lower()
            words.get(level, words["easy"]).append(word)
    # flatten for quick access
    all_words = words["easy"] + words.get("medium", []) + words.get("hard", [])
    return words, all_words

def parse_sentences():
    sentences = {"easy": [], "medium": [], "hard": []}
    for line in SENTENCES_RAW:
        parts = line.rsplit(",", 1)
        if len(parts) >= 2:
            sent, level = parts[0].strip(), parts[1].strip().lower()
            sentences.get(level, sentences["easy"]).append(sent)
    all_sentences = sentences["easy"] + sentences.get("medium", []) + sentences.get("hard", [])
    return sentences, all_sentences

def parse_mirror_pairs():
    pairs = []
    for line in MIRROR_PAIRS_RAW:
        parts = line.split(",")
        if len(parts) >= 2:
            pairs.append(parts[1].strip())
    return pairs

WORDS_BY_LEVEL, ALL_WORDS = parse_words()
SENTENCES_BY_LEVEL, ALL_SENTENCES = parse_sentences()
MIRROR_PAIRS = parse_mirror_pairs()
AUDIO_WORDS = [line.strip() for line in AUDIO_RAW if line.strip()]

# Clean matching dataset
MATCHING_DATA = [q for q in MATCHING_DATA if isinstance(q, dict) and "answer" in q and "options" in q and q["answer"] in q["options"]]


# =========================================
# 📖 READING EXERCISE CONTENT (8 types)
# =========================================

def content_reading_flow():
    """Reading Flow Exercise — follow highlighted words"""
    sentences = random.sample(ALL_SENTENCES, min(5, len(ALL_SENTENCES)))
    return {
        "exercise_type": "follow_highlight",
        "title": "Reading Flow Exercise",
        "instruction": "Read each sentence as the words are highlighted one by one. Try to keep pace with the highlight without going back.",
        "items": [
            {
                "sentence": s,
                "words": s.split(),
                "highlight_speed_ms": 400
            } for s in sentences
        ],
        "tips": [
            "Focus on moving your eyes forward only",
            "Don't re-read words — trust your first read",
            "Match the highlight speed"
        ]
    }


def content_word_recognition():
    """Word Recognition Speed — flashcard style"""
    words = random.sample(ALL_WORDS, min(15, len(ALL_WORDS)))
    return {
        "exercise_type": "flashcards",
        "title": "Word Recognition Speed",
        "instruction": "A word will flash on screen for 1 second. Type what you saw as fast as you can.",
        "items": [
            {
                "word": w,
                "display_time_ms": random.choice([800, 1000, 1200]),
                "difficulty": "easy" if len(w) <= 4 else "medium" if len(w) <= 6 else "hard"
            } for w in words
        ],
        "tips": [
            "Don't worry about spelling — focus on recognition",
            "Speed matters more than perfection here"
        ]
    }


def content_regression_reduction():
    """Regression Reduction Drill — no backtracking allowed"""
    passages = random.sample(POEMS, min(2, len(POEMS))) if POEMS else []
    sentences = random.sample(ALL_SENTENCES, min(5, len(ALL_SENTENCES)))
    
    return {
        "exercise_type": "no_backtrack",
        "title": "Regression Reduction Drill",
        "instruction": "Read the text below. Words will disappear after you read them — you cannot go back! This trains your forward reading.",
        "items": [
            {
                "type": "passage",
                "title": p.get("title", "Passage"),
                "text": p.get("text", ""),
                "words": p.get("text", "").split(),
                "fade_delay_ms": 500
            } for p in passages
        ] + [
            {
                "type": "sentence",
                "text": s,
                "words": s.split(),
                "fade_delay_ms": 400
            } for s in sentences
        ],
        "tips": [
            "Each word fades after you pass it",
            "Train your brain to capture meaning on first pass",
            "This reduces regression habit over time"
        ]
    }


def content_speed_reading():
    """Speed Reading Challenge — timed passages"""
    passages = random.sample(POEMS, min(3, len(POEMS))) if POEMS else []
    return {
        "exercise_type": "timed_read",
        "title": "Speed Reading Challenge",
        "instruction": "Read each passage as fast as you can while understanding the content. Answer the question that follows.",
        "items": [
            {
                "title": p.get("title", "Passage"),
                "text": p.get("text", ""),
                "word_count": len(p.get("text", "").split()),
                "time_limit_seconds": max(30, len(p.get("text", "").split()) * 2),
                "question": f"What was this passage about?",
                "options": [
                    p.get("title", "The topic"),
                    "Something unrelated",
                    "A math problem",
                    "A recipe"
                ],
                "answer": p.get("title", "The topic")
            } for p in passages
        ],
        "tips": [
            "Don't read every word — scan for key meaning",
            "Use your peripheral vision to preview upcoming words"
        ]
    }


def content_word_pair_matching():
    """Word Pair Matching — visual discrimination"""
    similar_pairs = [
        ("bad", "dad"), ("big", "dig"), ("cap", "cup"), ("bat", "pat"),
        ("pot", "dot"), ("pen", "hen"), ("pin", "bin"), ("cat", "car"),
        ("hen", "ten"), ("map", "nap"), ("sit", "set"), ("run", "ruin"),
        ("form", "from"), ("clam", "calm"), ("saw", "was"), ("on", "no"),
        ("pat", "tap"), ("tip", "pit"), ("dog", "god"), ("top", "pot"),
    ]
    selected = random.sample(similar_pairs, min(10, len(similar_pairs)))
    
    return {
        "exercise_type": "pair_match",
        "title": "Word Pair Matching",
        "instruction": "Look at each pair of words. Are they the SAME word or DIFFERENT words? Tap your answer quickly.",
        "items": [
            {
                "word_a": a,
                "word_b": b if random.random() > 0.3 else a,
                "are_same": a == (b if random.random() > 0.3 else a)
            } for a, b in selected
        ] + [
            {
                "word_a": w,
                "word_b": w,
                "are_same": True
            } for w in random.sample(ALL_WORDS, min(5, len(ALL_WORDS)))
        ],
        "tips": [
            "Look at the whole word shape, not just individual letters",
            "Similar-looking words train your visual discrimination"
        ]
    }


def content_sentence_completion():
    """Sentence Completion — fill-in-the-blank"""
    templates = [
        ("The ___ is on the table.", ["book", "lamp", "cup"], "book"),
        ("She can ___ very fast.", ["run", "read", "swim"], "run"),
        ("I like to eat ___.", ["cake", "rice", "fish"], "cake"),
        ("The sun is ___ today.", ["bright", "big", "hot"], "bright"),
        ("He went to the ___ to play.", ["park", "school", "store"], "park"),
        ("My ___ name is Buddy.", ["dog's", "cat's", "bird's"], "dog's"),
        ("The ___ swims in the pond.", ["fish", "bird", "dog"], "fish"),
        ("It is very ___ outside.", ["cold", "long", "fast"], "cold"),
        ("She drew a ___ picture.", ["beautiful", "small", "red"], "beautiful"),
        ("We read a ___ before bed.", ["story", "song", "joke"], "story"),
        ("The ___ flies high in the sky.", ["bird", "fish", "dog"], "bird"),
        ("He drank a glass of ___.", ["milk", "stone", "road"], "milk"),
    ]
    selected = random.sample(templates, min(8, len(templates)))
    
    return {
        "exercise_type": "fill_blank",
        "title": "Sentence Completion",
        "instruction": "Read each sentence and choose the word that best fills the blank.",
        "items": [
            {
                "sentence": sent,
                "options": opts,
                "answer": ans
            } for sent, opts, ans in selected
        ],
        "tips": [
            "Read the whole sentence before choosing",
            "Think about what makes sense in context"
        ]
    }


def content_phoneme_awareness():
    """Phoneme Awareness — break words into sounds"""
    phoneme_data = [
        ("cat", ["c", "a", "t"], 3),
        ("ship", ["sh", "i", "p"], 3),
        ("tree", ["t", "r", "ee"], 3),
        ("stop", ["s", "t", "o", "p"], 4),
        ("black", ["b", "l", "a", "ck"], 4),
        ("string", ["s", "t", "r", "i", "ng"], 5),
        ("splash", ["s", "p", "l", "a", "sh"], 5),
        ("bridge", ["b", "r", "i", "dge"], 4),
        ("plant", ["p", "l", "a", "n", "t"], 5),
        ("drink", ["d", "r", "i", "n", "k"], 5),
        ("phone", ["ph", "o", "ne"], 3),
        ("knight", ["kn", "igh", "t"], 3),
    ]
    selected = random.sample(phoneme_data, min(8, len(phoneme_data)))
    
    return {
        "exercise_type": "phoneme_split",
        "title": "Phoneme Awareness Training",
        "instruction": "Break each word into its individual sounds (phonemes). Tap how many sounds you hear.",
        "items": [
            {
                "word": word,
                "phonemes": phonemes,
                "phoneme_count": count,
                "options": [count - 1, count, count + 1]
            } for word, phonemes, count in selected
        ],
        "tips": [
            "Say the word slowly out loud",
            "Focus on SOUNDS, not letters — 'sh' is one sound!"
        ]
    }


def content_reading_comprehension():
    """Contextual Reading Comprehension — read and answer"""
    passages = random.sample(POEMS, min(3, len(POEMS))) if POEMS else []
    
    return {
        "exercise_type": "comprehension",
        "title": "Reading Comprehension",
        "instruction": "Read each passage carefully, then answer the question about it.",
        "items": [
            {
                "title": p.get("title", "Passage"),
                "text": p.get("text", ""),
                "question": f"What is the main topic of '{p.get('title', 'this passage')}'?",
                "options": [
                    p.get("title", "The main theme"),
                    "How to cook food",
                    "A math equation",
                    "Building a house"
                ],
                "answer": p.get("title", "The main theme")
            } for p in passages
        ],
        "tips": [
            "Read the passage once completely before looking at the question",
            "Focus on understanding the main idea, not every detail"
        ]
    }


# =========================================
# ✍️ WRITING EXERCISE CONTENT (8 types)
# =========================================

def content_letter_pattern():
    """Letter Pattern Writing — practice individual letter forms"""
    pairs = random.sample(MIRROR_PAIRS, min(6, len(MIRROR_PAIRS))) if MIRROR_PAIRS else ["bd", "pq"]
    letters = list("abcdefghijklmnopqrstuvwxyz")
    focus_letters = random.sample(letters, 5)
    
    return {
        "exercise_type": "letter_pattern",
        "title": "Letter Pattern Writing",
        "instruction": "Write each letter carefully on the canvas. Focus on forming each letter correctly.",
        "items": [
            {
                "type": "single_letter",
                "letter": l,
                "repeat": 5,
                "guide": f"Start from the top, curve {'left' if l in 'bdgpq' else 'right'}"
            } for l in focus_letters
        ] + [
            {
                "type": "mirror_pair",
                "pair": p,
                "repeat": 10,
                "guide": f"Pay attention to the direction difference between {p[0]} and {p[1]}"
            } for p in pairs[:3]
        ],
        "tips": [
            "Focus on direction: b opens right, d opens left",
            "Take your time — accuracy over speed",
            "Notice the difference between each letter shape"
        ]
    }


def content_confusing_letters():
    """Confusing Letters Training — commonly confused pairs"""
    exercises = []
    
    # Core confusion pairs
    core_pairs = [
        ("b", "d", "b faces right →, d faces left ←"),
        ("p", "q", "p faces right →, q faces left ←"),
        ("m", "n", "m has 2 humps, n has 1"),
        ("u", "n", "u opens up ∪, n opens down ∩"),
        ("f", "t", "f has a top hook, t has a crossing"),
        ("c", "e", "e has a middle line, c doesn't"),
    ]
    
    for a, b, hint in core_pairs:
        exercises.append({
            "pair": f"{a}{b}",
            "letter_a": a,
            "letter_b": b,
            "hint": hint,
            "practice_words_a": [w for w in ALL_WORDS if a in w][:3],
            "practice_words_b": [w for w in ALL_WORDS if b in w][:3],
            "repeat": 15,
        })
    
    return {
        "exercise_type": "confusion_drill",
        "title": "Confusing Letters Training",
        "instruction": "Practice distinguishing these commonly confused letter pairs. Write each one carefully.",
        "items": exercises,
        "tips": [
            "Say the letter name out loud as you write it",
            "Use the visual hint to remember the difference",
            "Practice the pair side-by-side for comparison"
        ]
    }


def content_word_copy():
    """Word Copy Accuracy — copy words exactly"""
    words = random.sample(ALL_WORDS, min(12, len(ALL_WORDS)))
    
    return {
        "exercise_type": "copy_exact",
        "title": "Word Copy Accuracy",
        "instruction": "Copy each word exactly as shown. Focus on matching every letter precisely.",
        "items": [
            {
                "target_word": w,
                "display_time_ms": None,  # stays visible
                "scoring": "letter_match"
            } for w in words
        ],
        "tips": [
            "Look at the word shape as a whole before writing",
            "Check each letter after you finish",
            "Take your time — perfection over speed"
        ]
    }


def content_sentence_writing():
    """Sentence Writing Practice — write complete sentences"""
    sentences = random.sample(ALL_SENTENCES, min(6, len(ALL_SENTENCES)))
    
    return {
        "exercise_type": "sentence_write",
        "title": "Sentence Writing Practice",
        "instruction": "Write each sentence on the canvas. Focus on spacing, size, and accuracy.",
        "items": [
            {
                "sentence": s,
                "word_count": len(s.split()),
                "scoring": "word_accuracy"
            } for s in sentences
        ],
        "tips": [
            "Keep consistent letter sizes throughout",
            "Leave clear spaces between words",
            "Focus on baseline alignment"
        ]
    }


def content_dictation():
    """Dictation Challenge — write from audio"""
    words = random.sample(AUDIO_WORDS or ALL_WORDS, min(10, len(AUDIO_WORDS or ALL_WORDS)))
    sentences = random.sample(ALL_SENTENCES[:10], min(3, len(ALL_SENTENCES)))
    
    return {
        "exercise_type": "dictation",
        "title": "Dictation Challenge",
        "instruction": "Listen to each word/sentence, then write it on the canvas. You can replay the audio once.",
        "items": [
            {
                "type": "word",
                "text": w,
                "audio_text": w,  # frontend uses Web Speech API
                "max_replays": 1
            } for w in words
        ] + [
            {
                "type": "sentence",
                "text": s,
                "audio_text": s,
                "max_replays": 2
            } for s in sentences
        ],
        "tips": [
            "Listen carefully before starting to write",
            "Sound out unknown words phonetically",
            "Use your replay wisely"
        ]
    }


def content_letter_size():
    """Letter Size Consistency — uniform sizing"""
    words = random.sample(ALL_WORDS, min(8, len(ALL_WORDS)))
    
    return {
        "exercise_type": "size_control",
        "title": "Letter Size Consistency",
        "instruction": "Write each word within the guide lines shown. All letters should be the same height.",
        "items": [
            {
                "word": w,
                "guide_height_px": 60,
                "guide_baseline": True,
                "tolerance_percent": 15
            } for w in words
        ],
        "tips": [
            "Use the guide lines to keep letters uniform",
            "Tall letters (b, d, f, h, k, l, t) should touch the top line",
            "Short letters (a, c, e, m, n, o) sit between the lines"
        ]
    }


def content_speed_writing():
    """Speed Writing Drill — fast and accurate"""
    words = random.sample(ALL_WORDS, min(15, len(ALL_WORDS)))
    
    return {
        "exercise_type": "speed_write",
        "title": "Speed Writing Drill",
        "instruction": "Write each word as fast as you can! You have limited time per word. Balance speed with readability.",
        "items": [
            {
                "word": w,
                "time_limit_seconds": max(3, len(w)),
                "scoring": "speed_accuracy_combo"
            } for w in words
        ],
        "tips": [
            "Don't sacrifice too much accuracy for speed",
            "Practice makes automatic — your speed will improve",
            "The timer is there to push you, not stress you"
        ]
    }


def content_memory_recall():
    """Memory Recall Writing — see then write from memory"""
    words = random.sample(ALL_WORDS, min(10, len(ALL_WORDS)))
    
    return {
        "exercise_type": "memory_write",
        "title": "Memory Recall Writing",
        "instruction": "A word will display briefly. After it disappears, write it from memory.",
        "items": [
            {
                "word": w,
                "display_time_ms": max(1500, len(w) * 400),
                "delay_before_write_ms": 500,
                "scoring": "memory_accuracy"
            } for w in words
        ],
        "tips": [
            "Photograph the word in your mind",
            "Say the word silently while viewing it",
            "Visualize the letter shapes before writing"
        ]
    }


# =========================================
# 🎵 MOTOR / RHYTHM CONTENT (4 types)
# =========================================

def content_rhythm_timing():
    """Rhythm & Timing — tap sync"""
    return {
        "exercise_type": "tap_sync",
        "title": "Rhythm & Timing",
        "instruction": "Tap the circle in rhythm with the pulse. Keep a steady beat!",
        "items": [
            {
                "bpm": 60,
                "duration_seconds": 20,
                "beats": 20,
                "label": "Slow and Steady (60 BPM)"
            },
            {
                "bpm": 90,
                "duration_seconds": 20,
                "beats": 30,
                "label": "Medium Pace (90 BPM)"
            },
            {
                "bpm": 120,
                "duration_seconds": 15,
                "beats": 30,
                "label": "Fast Rhythm (120 BPM)"
            },
        ],
        "tips": [
            "Start by feeling the rhythm before tapping",
            "Keep your taps consistent — same force each time",
            "This trains the timing circuits in your brain"
        ]
    }


def content_stroke_smoothness():
    """Stroke Smoothness — trace curves without jerks"""
    patterns = [
        {"name": "Wave", "path": "M0,50 Q25,0 50,50 Q75,100 100,50", "difficulty": "easy"},
        {"name": "Spiral", "path": "M50,50 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0", "difficulty": "medium"},
        {"name": "Figure-8", "path": "M50,25 C75,0 75,50 50,50 C25,50 25,100 50,75", "difficulty": "medium"},
        {"name": "Loop", "path": "M10,50 C10,10 90,10 90,50 C90,90 10,90 10,50", "difficulty": "hard"},
        {"name": "Zigzag", "path": "M0,80 L20,20 L40,80 L60,20 L80,80 L100,20", "difficulty": "easy"},
    ]
    
    return {
        "exercise_type": "smooth_trace",
        "title": "Stroke Smoothness Training",
        "instruction": "Trace each pattern as smoothly as possible. Minimize jerky movements.",
        "items": patterns,
        "tips": [
            "Move your whole arm, not just your fingers",
            "Breathe steadily while tracing",
            "Smoothness is more important than speed"
        ]
    }


def content_pressure_control():
    """Pressure Control — consistent pen pressure"""
    return {
        "exercise_type": "pressure_control",
        "title": "Pressure Control Exercise",
        "instruction": "Draw lines with consistent pressure. The pressure meter shows your current force — keep it in the green zone.",
        "items": [
            {
                "label": "Light Pressure",
                "target_pressure": 0.3,
                "tolerance": 0.1,
                "duration_seconds": 15,
                "zone_color": "#22c55e"
            },
            {
                "label": "Medium Pressure",
                "target_pressure": 0.5,
                "tolerance": 0.1,
                "duration_seconds": 15,
                "zone_color": "#3b82f6"
            },
            {
                "label": "Heavy Pressure",
                "target_pressure": 0.7,
                "tolerance": 0.1,
                "duration_seconds": 15,
                "zone_color": "#f59e0b"
            },
            {
                "label": "Alternating (Light → Heavy)",
                "pattern": [0.3, 0.7, 0.3, 0.7],
                "switch_interval_seconds": 5,
                "tolerance": 0.15,
                "duration_seconds": 20,
                "zone_color": "#8b5cf6"
            },
        ],
        "tips": [
            "Relax your grip — don't squeeze the pen/stylus",
            "Consistent pressure = smoother writing",
            "This trains the motor neurons in your hand"
        ]
    }


def content_fine_motor():
    """Fine Motor Coordination — precision drawing"""
    shapes = [
        {"name": "Circle", "instruction": "Draw a perfect circle inside the guide", "guide": "circle", "size": 80},
        {"name": "Square", "instruction": "Draw a square with even sides", "guide": "square", "size": 80},
        {"name": "Triangle", "instruction": "Draw an equilateral triangle", "guide": "triangle", "size": 80},
        {"name": "Star", "instruction": "Draw a 5-pointed star", "guide": "star", "size": 100},
        {"name": "Diamond", "instruction": "Draw a diamond shape", "guide": "diamond", "size": 80},
        {"name": "Spiral", "instruction": "Draw a spiral from center outward", "guide": "spiral", "size": 100},
    ]
    
    return {
        "exercise_type": "precision_draw",
        "title": "Fine Motor Coordination",
        "instruction": "Draw each shape as precisely as possible within the guide outlines.",
        "items": shapes,
        "tips": [
            "Start slow and increase speed as you get comfortable",
            "Keep your wrist steady — use arm movement for large shapes",
            "Precision improves handwriting control"
        ]
    }


# =========================================
# 🧠 COGNITIVE CONTENT (3 types)
# =========================================

def content_visual_memory():
    """Visual Memory Challenge — remember and reproduce"""
    words = random.sample(ALL_WORDS, min(10, len(ALL_WORDS)))
    letter_sequences = [
        "".join(random.sample("abcdefghijklmnopqrstuvwxyz", k)) 
        for k in [3, 3, 4, 4, 5, 5, 6, 6]
    ]
    
    return {
        "exercise_type": "visual_memory",
        "title": "Visual Memory Challenge",
        "instruction": "A sequence will flash on screen. After it disappears, type or write it from memory.",
        "items": [
            {
                "type": "letters",
                "sequence": seq,
                "display_time_ms": len(seq) * 500,
                "difficulty": "easy" if len(seq) <= 3 else "medium" if len(seq) <= 5 else "hard"
            } for seq in letter_sequences
        ] + [
            {
                "type": "words",
                "sequence": w,
                "display_time_ms": len(w) * 400,
                "difficulty": "easy" if len(w) <= 4 else "medium"
            } for w in words[:5]
        ],
        "tips": [
            "Try to 'photograph' the sequence in your mind",
            "Group letters into chunks (like phone numbers)",
            "Start with short sequences and work up"
        ]
    }


def content_multisensory():
    """Multisensory Training — see, hear, write"""
    words = random.sample(ALL_WORDS, min(10, len(ALL_WORDS)))
    
    return {
        "exercise_type": "multisensory",
        "title": "Multisensory Training",
        "instruction": "For each word: SEE it → HEAR it (audio plays) → SAY it out loud → WRITE it. This builds multiple brain pathways.",
        "items": [
            {
                "word": w,
                "step_1_see_ms": 2000,
                "step_2_audio": True,
                "step_3_say": True,
                "step_4_write": True,
            } for w in words
        ],
        "tips": [
            "Use ALL your senses — this builds stronger memory",
            "Say the word clearly before writing",
            "This is the most effective technique for learning difficulties"
        ]
    }


def content_pattern_recognition():
    """Pattern Recognition — spot patterns"""
    patterns = [
        {
            "sequence": ["a", "b", "a", "b", "?"],
            "options": ["a", "c", "d"],
            "answer": "a",
            "rule": "Alternating pattern"
        },
        {
            "sequence": ["a", "b", "c", "d", "?"],
            "options": ["e", "a", "f"],
            "answer": "e",
            "rule": "Alphabetical order"
        },
        {
            "sequence": ["b", "d", "f", "h", "?"],
            "options": ["i", "j", "k"],
            "answer": "j",
            "rule": "Skip one letter"
        },
        {
            "sequence": ["aa", "bb", "cc", "dd", "?"],
            "options": ["ee", "ef", "de"],
            "answer": "ee",
            "rule": "Double letter pattern"
        },
        {
            "sequence": ["cat", "bat", "hat", "mat", "?"],
            "options": ["rat", "dog", "run"],
            "answer": "rat",
            "rule": "Rhyming pattern"
        },
        {
            "sequence": ["dog", "cat", "dog", "cat", "?"],
            "options": ["dog", "bird", "cat"],
            "answer": "dog",
            "rule": "Alternating words"
        },
        {
            "sequence": ["a", "c", "e", "g", "?"],
            "options": ["h", "i", "j"],
            "answer": "i",
            "rule": "Every other letter"
        },
        {
            "sequence": ["ab", "cd", "ef", "gh", "?"],
            "options": ["ij", "hi", "jk"],
            "answer": "ij",
            "rule": "Consecutive pairs"
        },
    ]
    selected = random.sample(patterns, min(6, len(patterns)))
    
    return {
        "exercise_type": "pattern_spot",
        "title": "Pattern Recognition",
        "instruction": "Look at the sequence and figure out the pattern. Choose what comes next.",
        "items": selected,
        "tips": [
            "Look for repeating elements",
            "Check if letters are going in alphabetical order",
            "Patterns train your brain to predict — a key reading skill"
        ]
    }


# =========================================
# 🔥 ADAPTIVE EXERCISE CONTENT (4 types)
# =========================================

def content_mirror_discrimination(confusion_pairs=None):
    """Mirror Letter Discrimination — reversal-specific drill"""
    pairs = confusion_pairs or ["b/d", "p/q", "m/w"]
    items = []
    
    for pair in pairs[:5]:
        a, b = pair.split("/") if "/" in pair else (pair[0], pair[1])
        items.append({
            "letter_a": a,
            "letter_b": b,
            "drill_type": "identify",
            "instruction": f"Which letter is '{a}'? Tap the correct one.",
            "repeat": 10,
            "hint": f"'{a}' and '{b}' are mirror images. Pay attention to which direction they face."
        })
        items.append({
            "letter_a": a,
            "letter_b": b,
            "drill_type": "write_both",
            "instruction": f"Write '{a}' then '{b}' side by side to see the difference.",
            "repeat": 5,
        })
    
    return {
        "exercise_type": "reversal_drill",
        "title": "Mirror Letter Discrimination",
        "instruction": "These exercises target your specific letter reversals. Practice identifying and writing mirror-image letters correctly.",
        "items": items,
        "tips": [
            "Make a 'bed' with your hands: left hand = b, right hand = d",
            "p is just b upside down, q is d upside down",
            "Practice in pairs to see the visual contrast"
        ]
    }


def content_letter_completion():
    """Letter Completion Training — omission-specific"""
    incomplete_words = [
        ("h_llo", "hello", "e"), ("w_rld", "world", "o"),
        ("b__k", "book", "oo"), ("tr_e", "tree", "e"),
        ("f_sh", "fish", "i"), ("c_ke", "cake", "a"),
        ("m_lk", "milk", "i"), ("b_rd", "bird", "i"),
        ("p_rk", "park", "a"), ("st_r", "star", "a"),
        ("bl_e", "blue", "u"), ("r_ad", "read", "e"),
    ]
    selected = random.sample(incomplete_words, min(8, len(incomplete_words)))
    
    return {
        "exercise_type": "completion_drill",
        "title": "Letter Completion Training",
        "instruction": "Each word has missing letters. Write the complete word on the canvas.",
        "items": [
            {
                "incomplete": inc,
                "complete": comp,
                "missing": missing,
                "hint": f"The missing letter(s): '{missing}'"
            } for inc, comp, missing in selected
        ],
        "tips": [
            "Sound the word out to figure out missing letters",
            "This trains your brain to notice every letter",
            "Missing letters are a common writing challenge — you're building awareness"
        ]
    }


def content_problem_word_mastery(problem_words=None):
    """Problem Word Mastery — user-specific struggled words"""
    words = problem_words or random.sample(ALL_WORDS, min(8, len(ALL_WORDS)))
    
    return {
        "exercise_type": "word_drill",
        "title": "Problem Word Mastery",
        "instruction": "These are the words you've struggled with most. Practice each one multiple times until they're automatic.",
        "items": [
            {
                "word": w,
                "repeat": 5,
                "phases": [
                    {"type": "see", "instruction": f"Look at: {w}", "duration_ms": 2000},
                    {"type": "trace", "instruction": f"Trace: {w}", "mode": "guided"},
                    {"type": "copy", "instruction": f"Copy: {w}", "mode": "visible"},
                    {"type": "memory", "instruction": f"Write from memory: {w}", "mode": "hidden"},
                    {"type": "speed", "instruction": f"Write quickly: {w}", "time_limit_s": 3},
                ]
            } for w in words[:10]
        ],
        "tips": [
            "The 5-phase method (see → trace → copy → memory → speed) is proven to work",
            "Don't skip phases — each one strengthens a different pathway",
            "These words were chosen because YOU specifically struggle with them"
        ]
    }


def content_confusion_pair_mastery(pairs=None):
    """Confusion Pair Mastery — targeted pair drills"""
    pairs = pairs or ["b/d", "p/q"]
    items = []
    
    for pair in pairs[:5]:
        a, b = pair.split("/") if "/" in pair else (pair[0], pair[1])
        # Words containing each letter
        words_a = [w for w in ALL_WORDS if a in w][:5]
        words_b = [w for w in ALL_WORDS if b in w][:5]
        
        items.append({
            "pair": pair,
            "letter_a": a,
            "letter_b": b,
            "exercises": [
                {"type": "write_letter", "content": a, "repeat": 10},
                {"type": "write_letter", "content": b, "repeat": 10},
                {"type": "write_pair", "content": f"{a}{b}", "repeat": 15},
                {"type": "word_practice_a", "words": words_a, "focus_letter": a},
                {"type": "word_practice_b", "words": words_b, "focus_letter": b},
                {"type": "quick_identify", "instruction": f"Is this '{a}' or '{b}'?", "trials": 10},
            ]
        })
    
    return {
        "exercise_type": "confusion_drill",
        "title": "Confusion Pair Mastery",
        "instruction": "Intensive drill on your most-confused letter pairs. Each pair has 6 different sub-exercises.",
        "items": items,
        "tips": [
            "Your brain confuses these specific letters — this is targeted therapy",
            "The variety of exercises builds multiple neural pathways",
            "You'll see improvement within 3-5 sessions"
        ]
    }


# =========================================
# 🗺️ CONTENT ROUTER — maps exercise mode to content
# =========================================
CONTENT_MAP = {
    # Reading (8)
    "follow_highlight": content_reading_flow,
    "flashcards": content_word_recognition,
    "no_backtrack": content_regression_reduction,
    "timed_read": content_speed_reading,
    "pair_match": content_word_pair_matching,
    "fill_blank": content_sentence_completion,
    "phoneme_split": content_phoneme_awareness,
    "comprehension": content_reading_comprehension,
    
    # Writing (8)
    "letter_pattern": content_letter_pattern,
    "confusion_drill": content_confusing_letters,
    "copy_exact": content_word_copy,
    "sentence_write": content_sentence_writing,
    "dictation": content_dictation,
    "size_control": content_letter_size,
    "speed_write": content_speed_writing,
    "memory_write": content_memory_recall,
    
    # Motor (4)
    "tap_sync": content_rhythm_timing,
    "smooth_trace": content_stroke_smoothness,
    "pressure_control": content_pressure_control,
    "precision_draw": content_fine_motor,
    
    # Cognitive (3)
    "visual_memory": content_visual_memory,
    "multisensory": content_multisensory,
    "pattern_spot": content_pattern_recognition,
    
    # Adaptive (4)
    "reversal_drill": content_mirror_discrimination,
    "completion_drill": content_letter_completion,
    "word_drill": content_problem_word_mastery,
    "confusion_pair_drill": content_confusion_pair_mastery,
}


def get_exercise_content(mode, **kwargs):
    """
    Get content for a specific exercise mode.
    Returns structured content dict that the frontend can render.
    """
    builder = CONTENT_MAP.get(mode)
    if not builder:
        # Fallback: return generic word copy
        return content_word_copy()
    
    try:
        return builder(**kwargs) if kwargs else builder()
    except Exception as e:
        print(f"Content generation error for mode={mode}: {e}")
        return content_word_copy()


def get_all_exercise_modes():
    """Returns list of all supported exercise modes"""
    return list(CONTENT_MAP.keys())
