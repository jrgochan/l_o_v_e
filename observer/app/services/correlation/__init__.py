"""Correlation Engine — Discovers emotion-event patterns."""

from app.services.correlation.engine import CorrelationEngine
from app.services.correlation.temporal import TemporalProximityAnalyzer

__all__ = [
    "TemporalProximityAnalyzer",
    "CorrelationEngine",
]
