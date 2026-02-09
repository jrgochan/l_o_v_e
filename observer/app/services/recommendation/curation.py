"""Module documentation."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition


class CurationProvider:
    """Manages curated journey data."""

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
        self._journeys: List[Dict[str, Any]] = []
        self._load_journeys()

    def _load_journeys(self) -> None:
        """Load curated journeys from JSON file."""
        try:
            # Assuming file is in app/data relative to project root
            # Adjust path resolution as needed based on deployment
            base_path = Path(__file__).resolve().parent.parent.parent
            data_file = base_path / "data" / "curated_journeys.json"

            if data_file.exists():
                with open(data_file, "r", encoding="utf-8") as f:
                    self._journeys = json.load(f)
            else:
                # Fallback to empty or log warning
                self._journeys = []
        except Exception:  # pylint: disable=broad-except
            # Fallback for safety
            self._journeys = []

    async def get_curated_journeys(self, context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get curated therapeutic journey patterns."""
        journeys = self._journeys

        # Filter by context if specified
        if context and context in ["healing", "growth"]:
            journeys = [j for j in journeys if j["category"] == context]

        # Look up emotion IDs for each journey
        enriched_journeys = []
        for journey in journeys:
            # Safely handle missing keys if JSON is malformed
            emotions = journey.get("emotions", [])
            if not emotions:
                continue

            emotion_ids = await self._get_emotion_ids_by_names(list(emotions))

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
