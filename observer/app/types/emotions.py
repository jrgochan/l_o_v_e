"""Emotion-related type definitions and configurations for Observer."""

from dataclasses import dataclass
from typing import Dict, List, Optional
from uuid import UUID

from app.models.chat_message import ChatMessage
from app.models.clinical_alert import ClinicalAlert
from app.models.emotion_definition import EmotionDefinition


@dataclass
class RelationshipContext:
    """Context for analyzing relationships between messages."""

    current_message: ChatMessage
    previous_message: ChatMessage
    current_emotion: EmotionDefinition
    previous_emotion: EmotionDefinition
    time_delta: float
    vac_deltas: Dict[str, float]


@dataclass
class ResolverConfig:
    """Configuration for Emotion Resolver."""

    collection_name: str = "atlas_of_emotions"
    collection_id: Optional[UUID] = None
    fuzzy_threshold: float = 0.8
    vac_threshold: float = 0.3
    enable_llm_fallback: bool = True
    cooldown_period: int = 300
    confidence_threshold: float = 0.6
    max_retries: int = 3
    priority_mode: str = "balanced"
    log_decisions: bool = True


@dataclass
class EmotionAnalysisResult:
    """Result of an emotion analysis to be tracked."""

    emotion_name: str
    category: str
    vac_data: Dict[str, float]
    confidence: float
    alerts: List[ClinicalAlert]
