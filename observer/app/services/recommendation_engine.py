"""Shim for backward compatibility. Use app.services.recommendation.RecommendationEngine."""

from app.services.recommendation import RecommendationEngine
from app.services.recommendation.curation import CURATED_JOURNEYS

__all__ = ["RecommendationEngine", "CURATED_JOURNEYS"]
