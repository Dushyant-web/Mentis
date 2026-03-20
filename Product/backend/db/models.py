from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_number = Column(Integer)

    eye_data = Column(JSON)
    pen_data = Column(JSON)

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

    # 🔥 NEW: track exact task completion
    task_id = Column(Integer)

    # scores (can still be used for analytics)
    reading_score = Column(Float)
    writing_score = Column(Float)
    rhythm_score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(String)  # mild / moderate / severe
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingTask(Base):
    __tablename__ = "training_tasks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("training_plans.id"))
    task_name = Column(String)
    task_type = Column(String)  # eye / pen / rhythm
    difficulty = Column(String)
    duration = Column(String)
    status = Column(String, default="pending")  # pending / done


# New AssessmentSession model
class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="started")  # started / completed

    eye_data = Column(JSON, nullable=True)
    pen_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)