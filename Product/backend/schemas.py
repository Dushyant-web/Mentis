"""Pydantic request models.

Replacing `data: dict` route params with these gives us automatic validation
(422 on bad input instead of a 500 deep in the handler), type coercion, and
self-documenting OpenAPI schemas. Optional fields default to None so partial
updates keep working via `model_dump(exclude_unset=True)`.
"""
from typing import Optional
from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: Optional[str] = Field(None, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = Field(None, max_length=32)
    role: Optional[str] = Field(None, max_length=32)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class SettingsUpdate(BaseModel):
    push_notifications: Optional[bool] = None
    daily_reminders: Optional[bool] = None
    weekly_reports: Optional[bool] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = Field(None, max_length=32)
    role: Optional[str] = Field(None, max_length=32)
    mobile_number: Optional[str] = Field(None, max_length=20)
    country_code: Optional[str] = Field(None, max_length=8)
    password: Optional[str] = Field(None, min_length=6, max_length=128)
    settings: Optional[SettingsUpdate] = None


class EyeDataRequest(BaseModel):
    fixation_time: float = 0
    saccades: float = 0
    regressions: float = 0
    reading_speed: float = 0


class WritingTestRequest(BaseModel):
    task_type: Optional[str] = Field(None, max_length=32)
    content: str = ""
    user_input: str = ""
    time_taken: float = Field(1, ge=0)
