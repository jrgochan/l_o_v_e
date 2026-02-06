import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.recommendation.curation import CurationProvider
from app.services.recommendation.discovery import DiscoveryEngine
from app.services.recommendation.spatial import SpatialAnalyzer

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Intelligent recommendation system for emotional exploration.

    Provides context-aware suggestions based on:
    - VAC spatial relationships
    - Path difficulty analysis
    - Curated therapeutic patterns
    - Category connectivity
    """

    def __init__(self, session: AsyncSession):
        """Initialize RecommendationEngine."""
        self.session = session
        self.curation = CurationProvider(session)
        self.spatial = SpatialAnalyzer(session)
        self.discovery = DiscoveryEngine(session)

    async def get_recommendations(
        self,
        context: str = "exploration",
        current_emotion_id: Optional[UUID] = None,
        selected_emotions: Optional[List[UUID]] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Get comprehensive recommendations based on context."""
        logger.info(
            "Generating recommendations (context=%s, emotion=%s)",
            context,
            current_emotion_id,
        )

        recommendations = {}

        if selected_emotions is None:
            selected_emotions = []

        # CATEGORY 1: Similar Emotions
        if current_emotion_id:
            recommendations["similar_emotions"] = await self.spatial.get_similar_emotions(
                emotion_id=current_emotion_id, limit=limit
            )

        # CATEGORY 2: Curated Journeys
        recommendations["curated_journeys"] = await self.curation.get_curated_journeys(
            context=context
        )

        # CATEGORY 3: Problematic Transitions
        if context == "exploration":
            recommendations["problematic_transitions"] = (
                await self.discovery.get_problematic_transitions(limit=limit)
            )

        # CATEGORY 4: Complementary Paths
        if len(selected_emotions) > 0:
            recommendations["complementary_suggestions"] = (
                await self.discovery.get_complementary_paths(
                    selected_emotions=selected_emotions, limit=limit
                )
            )

        return recommendations

    async def get_similar_emotions(self, emotion_id: UUID, limit: int = 5) -> List[Dict[str, Any]]:
        """Delegate to SpatialAnalyzer."""
        return await self.spatial.get_similar_emotions(emotion_id, limit)

    async def get_problematic_transitions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Delegate to DiscoveryEngine."""
        return await self.discovery.get_problematic_transitions(limit)

    async def get_curated_journeys(self, context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Delegate to CurationProvider."""
        return await self.curation.get_curated_journeys(context)

    async def get_complementary_paths(
        self, selected_emotions: List[UUID], limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Delegate to DiscoveryEngine."""
        return await self.discovery.get_complementary_paths(selected_emotions, limit)
