from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)
    google_id = Column(String, nullable=True)  # add after password

    # New demographic fields
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    role = Column(String, nullable=True) # teacher, doctor, parent, student, etc.
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # linked parent/teacher
    mobile_number = Column(String, nullable=True)
    country_code = Column(String, nullable=True, default="+1")
    share_key = Column(String, unique=True, nullable=True)  # unique key for portal linking
 
    created_at = Column(DateTime, default=datetime.utcnow)



class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_number = Column(Integer)

    eye_data = Column(JSON)
    pen_data = Column(JSON)
    errors = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    session_id = Column(Integer, ForeignKey("assessment_sessions.id"), nullable=True)

    # final classification
    level = Column(String)  # normal / dyslexia / dysgraphia / both

    # ML / hybrid confidence
    confidence = Column(Float)

    # 🔥 CORE INTELLIGENCE (NEW)
    dyslexia_score = Column(Float)
    dysgraphia_score = Column(Float)

    dyslexia_stage = Column(String)     # stage_1 / stage_2 / stage_3
    dysgraphia_stage = Column(String)

    # 🔥 per-issue confidence (NEW)
    dyslexia_confidence = Column(Float, default=0)
    dysgraphia_confidence = Column(Float, default=0)

    # 🔥 full model probabilities (NEW)
    prob_normal = Column(Float, default=0)
    prob_dyslexia = Column(Float, default=0)
    prob_dysgraphia = Column(Float, default=0)
    prob_both = Column(Float, default=0)

    # 🔥 uncertainty flag (NEW)
    uncertainty = Column(Integer, default=0)

    # 🔥 entropy-based uncertainty score (NEW)
    uncertainty_score = Column(Float, default=0)

    final_score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)

    level = Column(String)
    plan = Column(JSON)


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    task_id = Column(Integer)
    xp = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    level = Column(String)  # mild / moderate / severe
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingTask(Base):
    __tablename__ = "training_tasks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("training_plans.id", ondelete="CASCADE"))
    task_name = Column(String)
    task_type = Column(String)  # eye / pen / rhythm
    difficulty = Column(String)
    duration = Column(String)
    xp = Column(Integer, default=50)
    status = Column(String, default="pending")  # pending / done
    created_at = Column(DateTime, default=datetime.utcnow)

    # 🧠 Adaptive intelligence fields (NEW)
    is_adaptive = Column(Boolean, default=False)
    source = Column(String, nullable=True)   # writing / eye / system
    content = Column(JSON, nullable=True)    # actual exercise content (confusions, etc.)


# New AssessmentSession model
class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(String, default="started")  # started / completed

    eye_data = Column(JSON, nullable=True)
    pen_data = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class EyeTracking(Base):
    __tablename__ = "eye_tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)

    fixation = Column(Float)
    regressions = Column(Float)
    reading_speed = Column(Float)

    eye_score = Column(Float)
    severity = Column(String)

    # 🔥 normalized signals (NEW)
    regression_rate = Column(Float, default=0)
    fixation_stability = Column(Float, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

class WritingTest(Base):
    __tablename__ = "writing_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)

    content = Column(Text)
    user_input = Column(Text)
    errors = Column(JSON, nullable=True)
    confusion_count = Column(Integer, default=0)

    accuracy = Column(Float)
    speed_wpm = Column(Float)
    writing_score = Column(Float)
    stage = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)


# -------------------------
# 🧠 USER LEARNING MEMORY SYSTEM (NEW)
# -------------------------

class UserWeaknessProfile(Base):
    __tablename__ = "user_weakness_profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    reading_score = Column(Float, default=0)
    writing_score = Column(Float, default=0)
    rhythm_score = Column(Float, default=0)

    last_updated = Column(DateTime, default=datetime.utcnow)


class IssueHistory(Base):
    __tablename__ = "issue_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    reading_score = Column(Float)
    writing_score = Column(Float)

    reading_stage = Column(String)
    writing_stage = Column(String)

    confidence_reading = Column(Float)
    confidence_writing = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)

class FeatureAttribution(Base):
    __tablename__ = "feature_attributions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id = Column(Integer, ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True)

    feature_name = Column(String, index=True)
    impact = Column(Float)

    # 🔥 NEW: structured attribution grouping
    feature_type = Column(String, nullable=True)   # eye / pen / rhythm
    direction = Column(String, nullable=True)      # positive / negative

    created_at = Column(DateTime, default=datetime.utcnow)

class AdvancedEyeMetrics(Base):
    __tablename__ = "advanced_eye_metrics"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False)
    session_id = Column(Integer, nullable=False)

    avg_fixation_duration = Column(Float, default=0)
    fixation_variance = Column(Float, default=0)
    avg_saccade_length = Column(Float, default=0)
    regression_count = Column(Float, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    push_notifications = Column(Boolean, default=True)
    daily_reminders = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -------------------------
# 🧠 PER-WORD ASSESSMENT ERRORS (NEW)
# Stores what word was given vs what user wrote — drives adaptive training
# -------------------------
class AssessmentError(Base):
    __tablename__ = "assessment_errors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id = Column(Integer, ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True)

    step = Column(Integer)               # 1=mirror, 2=bank, 3=intro, 4=audio, 5=matching
    sub_step = Column(Integer, default=0)
    target_word = Column(String)          # what was given to the user
    actual_word = Column(String)          # what the user wrote (OCR result)
    similarity = Column(Float, default=0) # OCR similarity score
    is_correct = Column(Boolean, default=False)

    # Derived confusion analysis
    confused_letters = Column(JSON, nullable=True)  # e.g. [{"expected": "b", "actual": "d"}]
    error_type = Column(String, nullable=True)       # reversal / omission / substitution / addition
    confused_pairs = Column(JSON, nullable=True)     # e.g. ["b/d", "p/q"]
    confusion_type = Column(String, nullable=True)   # reversal / omission / substitution

    created_at = Column(DateTime, default=datetime.utcnow)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type = Column(String, index=True)       # exercise_started, assessment_completed, page_viewed
    event_data = Column(JSON, nullable=True)       # arbitrary event metadata
    page = Column(String, nullable=True)           # which page the event occurred on
    created_at = Column(DateTime, default=datetime.utcnow)
