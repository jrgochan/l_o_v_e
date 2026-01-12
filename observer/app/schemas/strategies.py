"""Strategy Schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StrategyBase(BaseModel):
    """Base schema for strategies."""

    strategy_name: str
    strategy_type: str
    description: str
    detailed_steps: List[str]  # Based on act_techniques.json structure
    time_required: Optional[str] = None
    difficulty_level: Optional[int] = None
    evidence_level: str
    research_citations: Optional[List[Dict[str, Any]]] = None
    contraindications: Optional[str] = None


class StrategyUpdate(BaseModel):
    """Schema for strategy updates."""

    description: Optional[str] = None
    detailed_steps: Optional[List[str]] = None
    time_required: Optional[str] = None
    difficulty_level: Optional[int] = None
    evidence_level: Optional[str] = None
    contraindications: Optional[str] = None


class StrategyResponse(StrategyBase):
    """Schema for strategy response."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
