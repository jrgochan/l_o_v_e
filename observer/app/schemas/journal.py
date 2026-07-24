"""Life Journal Schemas — Pydantic models for API request/response validation.

Provides type-safe validation for all Life Journal endpoints.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Life Event Schemas
# ---------------------------------------------------------------------------


class LifeEventCreate(BaseModel):
    """Schema for creating a new life event."""

    timestamp: Optional[datetime] = None
    event_type: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-z]+\.[a-z_]+$")
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=0)
    event_data: Dict[str, Any] = Field(default_factory=dict)
    mood_before: Optional[List[float]] = Field(None, min_length=3, max_length=3)
    mood_after: Optional[List[float]] = Field(None, min_length=3, max_length=3)
    tags: Optional[List[str]] = Field(default_factory=list)
    source: str = Field(default="manual", max_length=50)
    impact: Optional[float] = Field(None, ge=0.0, le=1.0)
    predictability: Optional[float] = Field(None, ge=0.0, le=1.0)
    controllability: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = Field(None, max_length=50)

    @field_validator("mood_before", "mood_after")
    @classmethod
    def validate_vac(cls, v: Optional[List[float]]) -> Optional[List[float]]:
        """Validate VAC components are in [-1.0, 1.0] range."""
        if v is not None:
            for i, val in enumerate(v):
                if not -1.0 <= val <= 1.0:
                    axis = ["Valence", "Arousal", "Connection"][i]
                    raise ValueError(f"{axis} must be between -1.0 and 1.0")
        return v

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        """Validate event_type follows domain.type format."""
        parts = v.split(".")
        if len(parts) != 2:
            raise ValueError(
                "event_type must be in 'domain.type' format (e.g., 'wellness.exercise')"
            )
        return v


class LifeEventUpdate(BaseModel):
    """Schema for updating an existing life event (partial update)."""

    timestamp: Optional[datetime] = None
    event_type: Optional[str] = Field(None, min_length=3, max_length=100)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=0)
    event_data: Optional[Dict[str, Any]] = None
    mood_before: Optional[List[float]] = Field(None, min_length=3, max_length=3)
    mood_after: Optional[List[float]] = Field(None, min_length=3, max_length=3)
    tags: Optional[List[str]] = None
    impact: Optional[float] = Field(None, ge=0.0, le=1.0)
    predictability: Optional[float] = Field(None, ge=0.0, le=1.0)
    controllability: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = Field(None, max_length=50)


class LifeEventResponse(BaseModel):
    """Schema for life event API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    timestamp: datetime
    duration_minutes: Optional[int]
    event_type: str
    title: str
    description: Optional[str]
    event_data: Dict[str, Any]
    mood_before: Optional[List[float]]
    mood_after: Optional[List[float]]
    tags: Optional[List[str]]
    source: str
    impact: Optional[float]
    predictability: Optional[float]
    controllability: Optional[float]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class LifeEventListResponse(BaseModel):
    """Paginated list of life events."""

    events: List[LifeEventResponse]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Correlation Schemas
# ---------------------------------------------------------------------------


class CorrelationResponse(BaseModel):
    """Schema for correlation API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    emotion_name: str
    emotion_category: Optional[str]
    event_type: str
    event_pattern: Optional[str]
    correlation_type: str
    strength: float
    direction: str
    confidence: float
    lag_seconds: Optional[int]
    sample_size: int
    evidence: Dict[str, Any]
    status: str
    first_detected: datetime
    last_validated: datetime
    user_feedback: Optional[str]
    user_feedback_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class CorrelationFeedbackRequest(BaseModel):
    """Schema for user feedback on a correlation."""

    feedback: str = Field(..., pattern=r"^(confirmed|dismissed)$")


class CorrelationListResponse(BaseModel):
    """List of correlations."""

    correlations: List[CorrelationResponse]
    total: int


# ---------------------------------------------------------------------------
# Search / Timeline Schemas
# ---------------------------------------------------------------------------


class JournalSearchRequest(BaseModel):
    """Schema for semantic search queries."""

    query: str = Field(..., min_length=1, max_length=500)
    search_type: str = Field(default="events", pattern=r"^(events|emotions|all)$")
    limit: int = Field(default=10, ge=1, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
