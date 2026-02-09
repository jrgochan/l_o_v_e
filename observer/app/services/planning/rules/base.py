"""Base Interface for Harmonic Path Rules.

Defines the contract for validating and enhancing therapeutic paths.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple

from app.models.emotion_definition import EmotionDefinition


class HarmonicRule(ABC):
    """Abstract base class for harmonic path rules."""

    @abstractmethod
    async def check_and_fix(
        self,
        path: List[EmotionDefinition],
        start: EmotionDefinition,
        goal: EmotionDefinition,
    ) -> Tuple[List[EmotionDefinition], bool]:
        """Check path for rule violations and return fixed path.

        Args:
            path: Current list of emotions in the path.
            start: Starting emotion.
            goal: Goal emotion.

        Returns:
            Tuple of (modified_path, was_modified).
        """
