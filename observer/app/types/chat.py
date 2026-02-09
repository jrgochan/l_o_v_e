"""Chat-related type definitions for Observer."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from uuid import UUID


@dataclass
class MessageCreationContext:
    """Context for creating a new user message.

    Encapsulates all necessary data to persist a message, reducing
    argument count in service methods.
    """

    session_id: UUID
    content: Optional[str] = None
    audio_url: Optional[str] = None
    transcription: Optional[str] = None
    message_type: str = "user_text"
    related_message_id: Optional[UUID] = None
    relationship_type: Optional[str] = None
    relationship_metadata: Optional[Dict[str, Any]] = field(default_factory=dict)
    role: str = "user"  # Added to match original if needed, or inferred


@dataclass
class AnalysisMessageContext:
    """Context for saving an analysis message."""

    session_id: UUID
    emotion_name: str
    vac_coordinates: List[float]
    confidence: float
    content: str
    tone_mode: str
    prosody_data: Optional[Dict[str, Any]] = None


@dataclass
class MultiEmotionAnalysisContext:
    """Context for saving a multi-emotion analysis."""

    message_id: UUID
    session_id: UUID
    emotions: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    aggregate_vac: List[float]
    complexity_score: float
    emotional_clarity: float
    temporal_pattern: str
    three_way_data: Optional[Dict[str, Any]] = None


@dataclass
class MessageContext:
    """Context wrapper for passing message data between services."""

    session_id: str
    user_id: UUID
    message_id: UUID
    content: str
    role: str
    tone_preference: str = "warm"
    audio_url: Optional[str] = None
