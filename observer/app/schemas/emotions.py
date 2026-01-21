"""Emotion Schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EmotionBase(BaseModel):
    """Base schema for an emotion."""

    emotion_name: str
    category: str
    definition: str
    movement_pattern: Optional[str] = None
    vac_vector: List[float] = Field(..., min_length=3, max_length=3)
    haptic_pattern_id: Optional[str] = None
    color_hint: Optional[str] = None


class EmotionUpdate(BaseModel):
    """Schema for updating an emotion."""

    category: Optional[str] = None
    definition: Optional[str] = None
    movement_pattern: Optional[str] = None
    vac_vector: Optional[List[float]] = Field(None, min_length=3, max_length=3)
    haptic_pattern_id: Optional[str] = None
    color_hint: Optional[str] = None


class EmotionResponse(EmotionBase):
    """Schema for emotion response."""

    id: UUID
    q_constant: List[float]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
