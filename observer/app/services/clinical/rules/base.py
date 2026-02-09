"""Base Interface for Clinical Alert Rules.

Defines the contract for strategy-based clinical alert detection.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.clinical_alert import ClinicalAlert


@dataclass
class AnalysisContext:
    """Context for clinical analysis."""

    vac_data: Dict[str, float]
    prosody_data: Optional[Dict[str, Any]]
    confidence: float
    insights: Optional[Dict[str, Any]] = None


class AlertRule(ABC):
    """Abstract base class for clinical alert rules."""

    @abstractmethod
    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate context against thresholds to generate alerts.

        Args:
            session_id: The ID of the current session.
            context: Analysis data including VAC, prosody, etc.
            thresholds: Dictionary of configured clinical thresholds.

        Returns:
            List of generated ClinicalAlert objects (empty if no alert).
        """
