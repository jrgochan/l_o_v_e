"""Module documentation."""

import logging
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.emotions.mapper import EmotionMapper, MapperQuery
from app.services.insights.strategies.definitions import (
    DefaultStrategy,
    DisconnectionStrategy,
    HighArousalNegativeValenceStrategy,
    LowArousalStrategy,
    PositiveValenceStrategy,
)
from app.services.insights.utils import analyze_vac_coordinates
from app.services.recommendation.engine import RecommendationEngine
from app.types.insights import InsightGenerationRequest

logger = logging.getLogger(__name__)


class InsightGenerator:
    # pylint: disable=too-many-locals,too-many-branches,too-many-statements
    """Generate multi-modal emotional insights (Refactored Modular Version)."""

    def __init__(self, db: AsyncSession):
        """Initialize InsightGenerator."""
        self.db = db
        self.recommendation_engine = RecommendationEngine(db)

        # Initialize guidance strategies
        self.guidance_strategies = [
            HighArousalNegativeValenceStrategy(),
            LowArousalStrategy(),
            DisconnectionStrategy(),
            PositiveValenceStrategy(),
            DefaultStrategy(),
        ]

    async def generate_insights(self, request: "InsightGenerationRequest") -> Dict[str, Any]:
        """Generate insights based on the analysis request."""
        # 1. Map to EmotionDefinition if requested
        emotion_def = None
        if request.use_emotion_mapping:
            mapper = EmotionMapper(self.db)
            query = MapperQuery(vac_values=list(request.vac_data.values()))
            try:
                emotion_def = await mapper.find_nearest(query)
            except ValueError:
                logger.warning("Could not map emotion for insights: %s", request.emotion_name)

        # 2. Generate Guidance
        guidance = self._generate_guidance(
            emotion={"name": request.emotion_name},  # Simpler dict for strategy
            vac_data=request.vac_data,
            tone_mode=request.tone_mode,
        )

        # 3. Get Recommendations
        recommendations: Dict[str, Any] = {}
        if emotion_def:
            recommendations = await self.recommendation_engine.get_recommendations(
                current_emotion_id=emotion_def.id, limit=3
            )

        # 4. Construct Result
        return {
            "summary": (f"It sounds like you're feeling {request.emotion_name}. " f"{guidance}"),
            "guidance": guidance,
            "recommendations": [
                {
                    "title": getattr(rec, "title", "Recommendation"),
                    "type": getattr(rec, "content_type", "journey"),
                    "description": getattr(rec, "description", ""),
                }
                for rec in recommendations.get("curated_journeys", [])
            ],
            "vac_analysis": analyze_vac_coordinates(request.vac_data),
            "confidence": request.confidence,
        }

    # ... (rest of the class)

    def _generate_guidance(
        self, emotion: Dict[str, Any], vac_data: Dict[str, float], tone_mode: str
    ) -> str:
        """Generate contextual guidance using strategies."""
        for strategy in self.guidance_strategies:
            if strategy.can_handle(vac_data, emotion):
                return strategy.generate(vac_data, tone_mode)

        return ""

    def _generate_fallback_insights(
        self, emotion_name: str, vac_data: Dict[str, float], _tone_mode: str
    ) -> Dict[str, Any]:
        """Generate fallback insights when emotion not found in atlas."""
        return {
            "emotion": emotion_name,
            "category": "Unknown",
            "vac": vac_data,
            "confidence": 0.0,
            "summary": (
                f"Detected emotion '{emotion_name}' but unable to find detailed information in "
                "canonical definitions."
            ),
            "vac_analysis": analyze_vac_coordinates(vac_data),
            "recommendations": [],
            "guidance": "Consider exploring the emotion collection to find related emotions.",
        }
