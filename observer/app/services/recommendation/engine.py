"""Recommendation Engine Facade.

Aggregates spatial analysis, curated journeys, and discovery logic
into a single interface for the API and other services.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.recommendation.curation import CurationProvider
from app.services.recommendation.discovery import DiscoveryEngine
from app.services.recommendation.spatial import SpatialAnalyzer

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Intelligent recommendation engine facade."""

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
        self.spatial = SpatialAnalyzer(session)
        self.curation = CurationProvider(session)
        self.discovery = DiscoveryEngine(session)

    async def get_recommendations(
        self,
        context: str = "exploration",
        current_emotion_id: Optional[UUID] = None,
        selected_emotions: Optional[List[UUID]] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Get comprehensive recommendations based on context and state.

        Args:
            context: 'exploration', 'healing', or 'growth'
            current_emotion_id: Current emotional state UUID
            selected_emotions: List of selected emotion UUIDs
            limit: Max results per category

        Returns:
            Dict containing similar_emotions, curated_journeys, etc.
        """
        if selected_emotions is None:
            selected_emotions = []

        # 1. Spatial Analysis (if emotional state provided)
        similar_emotions = []
        if current_emotion_id:
            similar_emotions = await self.spatial.get_similar_emotions(current_emotion_id, limit)

        # 2. Curated Journeys (filtered by context)
        curated_journeys = await self.curation.get_curated_journeys(context)

        # 3. Problematic Transitions (only for exploration)
        problematic_transitions = []
        if context == "exploration":
            problematic_transitions = await self.discovery.get_problematic_transitions(limit)

        # 4. Complementary Suggestions (based on selection)
        complementary_suggestions = []
        if selected_emotions:
            complementary_suggestions = await self.discovery.get_complementary_paths(
                selected_emotions, limit
            )

        return {
            "similar_emotions": similar_emotions,
            "curated_journeys": curated_journeys,
            "problematic_transitions": problematic_transitions,
            "complementary_suggestions": complementary_suggestions,
        }
