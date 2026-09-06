from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from db import models
from datetime import datetime

def get_or_create_weakness_profile(db: Session, user_id: int):
    """
    Atomically get or create a UserWeaknessProfile to prevent race conditions.
    """
    profile = db.query(models.UserWeaknessProfile).filter(
        models.UserWeaknessProfile.user_id == user_id
    ).first()
    
    if not profile:
        profile = models.UserWeaknessProfile(user_id=user_id)
        db.add(profile)
        try:
            db.commit()
            db.refresh(profile)
        except IntegrityError:
            db.rollback()
            # If someone else created it in the meantime, fetch it
            profile = db.query(models.UserWeaknessProfile).filter(
                models.UserWeaknessProfile.user_id == user_id
            ).first()
            
    return profile
