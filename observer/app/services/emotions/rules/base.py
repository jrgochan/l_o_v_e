"""Base Interface for Emotion Relationship Rules.

Defines the contract for strategy-based relationship detection.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional

import numpy.typing as npt


@dataclass
class RelationshipContext:
    """Context data for evaluating relationships."""

    emotion_a: Dict[str, Any]
    emotion_b: Dict[str, Any]
    vac_a: npt.NDArray[Any]
    vac_b: npt.NDArray[Any]
    valence_diff: float
    arousal_diff: float
    distance: float


class RelationshipRule(ABC):
    """Abstract base class for relationship detection rules."""

    @abstractmethod
    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Evaluate if a relationship exists between the two emotions.

        Args:
            context: Data context containing emotion details and pre-calculated statistics.

        Returns:
            Dict with relationship details if found, None otherwise.
        """
