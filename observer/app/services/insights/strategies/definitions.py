"""Concrete Guidance Strategies.

Implementations of specific guidance logic for different emotional states.
"""

from typing import Any, Dict

from app.services.insights.strategies.base import GuidanceStrategy


class HighArousalNegativeValenceStrategy(GuidanceStrategy):
    """Strategy for high arousal, negative valence (e.g., panic, rage)."""

    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if strategy applies to high arousal, negative valence."""
        return vac_data.get("arousal", 0) > 0.7 and vac_data.get("valence", 0) < 0

    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate guidance for high arousal, negative valence."""
        if tone_mode == "clinical":
            return (
                "High arousal with negative valence detected. Consider immediate "
                "grounding techniques."
            )
        return (
            "When emotions feel this intense, it can help to take a few deep breaths and "
            "ground yourself in the present moment."
        )


class LowArousalStrategy(GuidanceStrategy):
    """Strategy for low arousal (e.g., depression, fatigue)."""

    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if strategy applies to low arousal."""
        return vac_data.get("arousal", 0) < -0.5

    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate guidance for low arousal."""
        if tone_mode == "clinical":
            return (
                "Low arousal state suggesting deactivation. Behavioral "
                "activation may be indicated."
            )
        return (
            "Low energy can be a signal to rest, or sometimes it means we need gentle "
            "movement or connection with others."
        )


class DisconnectionStrategy(GuidanceStrategy):
    """Strategy for feelings of disconnection."""

    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if strategy applies to disconnection."""
        return vac_data.get("connection", 0) < -0.3

    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate guidance for disconnection."""
        if tone_mode == "clinical":
            return "Disconnection pattern detected - social support assessment recommended."
        return (
            "Feeling disconnected is really hard. You don't have to face this alone - "
            "consider reaching out to someone you trust."
        )


class PositiveValenceStrategy(GuidanceStrategy):
    """Strategy for positive valence states."""

    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if strategy applies to positive valence."""
        return vac_data.get("valence", 0) > 0.5

    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate guidance for positive valence."""
        if tone_mode == "clinical":
            return "Positive affective state. Encorage savoring and reinforcement."
        return (
            "This is a positive state - take a moment to notice and appreciate what's "
            "contributing to these feelings."
        )


class DefaultStrategy(GuidanceStrategy):
    """Fallback strategy."""

    def can_handle(self, vac_data: Dict[str, float], emotion: Dict[str, Any]) -> bool:
        """Check if strategy applies (always True)."""
        return True  # Always handles if no other strategy matched

    def generate(self, vac_data: Dict[str, float], tone_mode: str) -> str:
        """Generate default guidance."""
        if tone_mode == "clinical":
            return "General emotional processing indicated."
        return (
            "Whatever you're feeling right now is valid. Take your time exploring what "
            "this emotion is telling you."
        )
