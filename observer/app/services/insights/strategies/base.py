"""Base Interface for Insight Guidance Strategies.

Defines the contract for generating contextual emotional guidance.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class GuidanceStrategy(ABC):
    """Abstract base class for guidance generation strategies."""

    @abstractmethod
    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if this strategy is applicable to the current emotional context.

        Args:
            vac_data: Dictionary containing valence, arousal, connection.
            emotion: Dictionary containing emotion details.

        Returns:
            True if this strategy should handle the guidance generation.
        """

    @abstractmethod
    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate guidance text based on the emotional context.

        Args:
            vac_data: Dictionary containing valence, arousal, connection.
            tone_mode: 'warm' or 'clinical'.

        Returns:
            String containing the guidance text.
        """
