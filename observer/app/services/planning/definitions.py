"""Module documentation."""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.emotion_definition import EmotionDefinition


@dataclass
class TransitionPath:
    """Represents a complete emotional transition path."""

    current_emotion: EmotionDefinition
    goal_emotion: EmotionDefinition
    waypoints: List[EmotionDefinition]
    total_distance: float
    estimated_time: str
    difficulty: str
    search_metadata: Optional[Dict[str, Any]] = None
