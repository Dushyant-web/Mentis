from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from dependencies.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class AnalyticsEvent(BaseModel):
    event_type: str
    event_data: Optional[dict] = {}
    page: Optional[str] = None


@router.post("/event")
def track_event(event: AnalyticsEvent, db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Track a user engagement event"""
    db_event = models.AnalyticsEvent(
        user_id=user_id,
        event_type=event.event_type,
        event_data=event.event_data or {},
        page=event.page,
        created_at=datetime.utcnow()
    )
    db.add(db_event)
    db.commit()
    return {"status": "tracked"}


@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db), user_id=Depends(get_current_user)):
    """Get engagement analytics for the current user"""
    from sqlalchemy import func

    total_events = db.query(func.count(models.AnalyticsEvent.id))\
        .filter(models.AnalyticsEvent.user_id == user_id).scalar() or 0

    event_counts = db.query(
        models.AnalyticsEvent.event_type,
        func.count(models.AnalyticsEvent.id)
    ).filter(
        models.AnalyticsEvent.user_id == user_id
    ).group_by(models.AnalyticsEvent.event_type).all()

    # Session count (unique days)
    unique_days = db.query(
        func.count(func.distinct(func.date(models.AnalyticsEvent.created_at)))
    ).filter(models.AnalyticsEvent.user_id == user_id).scalar() or 0

    return {
        "total_events": total_events,
        "unique_session_days": unique_days,
        "event_breakdown": {et: cnt for et, cnt in event_counts}
    }
