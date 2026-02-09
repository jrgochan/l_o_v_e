"""Insight-related type definitions for Observer."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class InsightGenerationRequest:
    """Request context for insight generation."""

    emotion_name: str
    vac_data: Dict[str, float]
    confidence: float
    tone_mode: str = "warm"
    prosody_data: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    use_emotion_mapping: bool = True
    session_id: Optional[str] = None


@dataclass
class PromptCreateContext:
    """Context for creating a new prompt template."""

    function_name: str
    version: str
    template_content: str
    input_variables: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: bool = False
    created_by: Optional[str] = None
