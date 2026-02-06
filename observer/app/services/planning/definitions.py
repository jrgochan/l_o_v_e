from typing import Any, Dict, List, Optional

from app.models.emotion_definition import EmotionDefinition


class TransitionPath:
    """Represents a complete emotional transition path."""

    def __init__(
        self,
        current_emotion: EmotionDefinition,
        goal_emotion: EmotionDefinition,
        waypoints: List[EmotionDefinition],
        total_distance: float,
        estimated_time: str,
        difficulty: str,
        search_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Initialize TransitionPath."""
        self.current_emotion = current_emotion
        self.goal_emotion = goal_emotion
        self.waypoints = waypoints
        self.total_distance = total_distance
        self.estimated_time = estimated_time
        self.difficulty = difficulty
        self.search_metadata = search_metadata
