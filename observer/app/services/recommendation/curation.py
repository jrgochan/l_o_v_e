from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition

# Curated therapeutic journey patterns
CURATED_JOURNEYS = {
    "shame_healing": {
        "id": "shame_healing",
        "name": "Shame Healing Triangle",
        "description": (
            "Brené Brown's research-backed path from shame to compassion through vulnerability"
        ),
        "emotions": ["Shame", "Vulnerability", "Compassion"],
        "why_powerful": (
            "Addresses shame's core mechanism: isolation. Vulnerability breaks the secrecy "
            "that feeds shame, enabling compassionate connection."
        ),
        "research": "Brown, B. (2012). Daring Greatly",
        "estimated_time": "2-4 weeks",
        "category": "healing",
        "difficulty": "difficult",
        "icon": "🔺",
    },
    "joy_cultivation": {
        "id": "joy_cultivation",
        "name": "Joy Cultivation Path",
        "description": "Building sustainable joy through gratitude and awe",
        "emotions": ["Contentment", "Gratitude", "Joy", "Awe"],
        "why_powerful": (
            "Counters foreboding joy. Gratitude amplifies positive emotions, awe provides "
            "perspective that sustains joy."
        ),
        "research": "Emmons (2007), Keltner (2023)",
        "estimated_time": "1-2 weeks",
        "category": "growth",
        "difficulty": "easy",
        "icon": "😊",
    },
    "anxiety_relief": {
        "id": "anxiety_relief",
        "name": "Anxiety Relief Sequence",
        "description": "From worry to peace through perspective shift and acceptance",
        "emotions": ["Anxiety", "Awe", "Acceptance", "Peace"],
        "why_powerful": (
            "Awe interrupts anxious rumination by reducing self-focus. Acceptance stops "
            "the struggle. Peace emerges naturally."
        ),
        "research": "Keltner (2023), Hayes (ACT 1999)",
        "estimated_time": "1-3 weeks",
        "category": "healing",
        "difficulty": "moderate",
        "icon": "🌊",
    },
    "grief_integration": {
        "id": "grief_integration",
        "name": "Grief Integration Journey",
        "description": "Healthy grief processing toward peace without bypassing loss",
        "emotions": ["Grief", "Sadness", "Acceptance", "Peace"],
        "why_powerful": (
            "Honors loss authentically. Acceptance doesn't mean forgetting - "
            "it means finding peace alongside grief."
        ),
        "research": "Kessler (2019) - Finding Meaning",
        "estimated_time": "Variable (months)",
        "category": "healing",
        "difficulty": "difficult",
        "icon": "💔",
    },
    "connection_building": {
        "id": "connection_building",
        "name": "Connection Building Path",
        "description": "From isolation to belonging through vulnerability and compassion",
        "emotions": ["Loneliness", "Vulnerability", "Compassion", "Belonging"],
        "why_powerful": (
            "Addresses the core human need for connection. Vulnerability is the pathway "
            "from isolation to authentic belonging."
        ),
        "research": "Brown (2012) - Daring Greatly",
        "estimated_time": "2-4 weeks",
        "category": "growth",
        "difficulty": "moderate",
        "icon": "🤝",
    },
    "courage_building": {
        "id": "courage_building",
        "name": "Courage Building Sequence",
        "description": "From fear to confidence through courageous action",
        "emotions": ["Fear", "Courage", "Confidence"],
        "why_powerful": (
            "Confidence comes from evidence that you can handle challenges. "
            "Courage provides that evidence."
        ),
        "research": "Brown (2018) - Dare to Lead",
        "estimated_time": "2-6 weeks",
        "category": "growth",
        "difficulty": "moderate",
        "icon": "💪",
    },
}


class CurationProvider:
    """Manages curated journey data."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_curated_journeys(self, context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get curated therapeutic journey patterns."""
        journeys = list(CURATED_JOURNEYS.values())

        # Filter by context if specified
        if context and context in ["healing", "growth"]:
            journeys = [j for j in journeys if j["category"] == context]

        # Look up emotion IDs for each journey
        enriched_journeys = []
        for journey in journeys:
            emotion_ids = await self._get_emotion_ids_by_names(list(journey["emotions"]))

            enriched_journey = {
                **journey,
                "emotion_ids": emotion_ids,
                "emotion_count": len(emotion_ids),
            }
            enriched_journeys.append(enriched_journey)

        return enriched_journeys

    async def _get_emotion_ids_by_names(self, emotion_names: List[str]) -> List[UUID]:
        """Look up UUIDs for emotion names."""
        stmt = select(EmotionDefinition.id).where(EmotionDefinition.emotion_name.in_(emotion_names))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
