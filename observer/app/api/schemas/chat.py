from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.api.schemas.common import VACVector


class MessageRelationship(BaseModel):
    id: UUID
    source_message_id: UUID
    target_message_id: UUID
    relationship_type: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime


class InsightData(BaseModel):
    emotion: str
    category: str
    vac: VACVector
    confidence: float
    summary: str
    recommendations: List[Dict[str, Any]] = []
    strategies: Optional[List[Dict[str, Any]]] = None
    guidance: str


class DisplayMessage(BaseModel):
    id: UUID
    session_id: UUID
    type: str = Field(..., validation_alias="message_type")  # user, analysis, insight, transcription
    content: str
    timestamp: datetime
    
    # Analysis fields
    emotion: Optional[str] = None
    category: Optional[str] = None
    vac: Optional[VACVector] = None
    confidence: Optional[float] = None
    
    # Mappings
    original_emotion: Optional[str] = Field(None, alias="originalEmotion")
    match_method: Optional[str] = Field(None, alias="matchMethod")
    match_confidence: Optional[float] = Field(None, alias="matchConfidence")
    
    # Structured data
    insights: Optional[InsightData] = None
    relationships: Optional[List[MessageRelationship]] = None
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
