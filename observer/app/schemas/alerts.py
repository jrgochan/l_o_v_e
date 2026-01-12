"""Clinical Alert Schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClinicalAlertResponse(BaseModel):
    """Schema for clinical alert response."""

    id: UUID
    session_id: UUID
    timestamp: datetime
    level: str
    type: str
    message: str
    suggestion: Optional[str] = None
    triggered_by: Dict[str, Any]
    threshold_used: Dict[str, Any]
    version: str

    model_config = ConfigDict(from_attributes=True)
