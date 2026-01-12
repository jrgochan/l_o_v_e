"""AI Model Schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ModelAssignmentBase(BaseModel):
    """Base schema for AI model assignment."""

    function: str
    ai_model_name: str


class ModelAssignmentUpdate(BaseModel):
    """Schema for updating model assignment."""

    ai_model_name: str


class ModelAssignmentResponse(ModelAssignmentBase):
    """Schema for model assignment response."""

    assigned_at: datetime
    assigned_by: Optional[str] = None
    avg_latency_ms: Optional[float] = None
    total_invocations: int = 0
    last_used_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
