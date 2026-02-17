"""Admin Service.

Encapsulates complex administrative logic, particularly bulk data operations
for the Emotion Atlas and Therapeutic Strategies.
"""

import logging
from datetime import datetime
from typing import Any, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import TransitionStrategy
from app.services import get_embedding_service, get_quaternion_builder

logger = logging.getLogger(__name__)


class AdminService:
    """Service for administrative tasks and bulk data management."""

    def __init__(self, db: AsyncSession):
        """Initialize AdminService with database session."""
        self.db = db

    async def export_atlas_emotions(self) -> Dict[str, Any]:
        """Export current Emotion Atlas state as canonical JSON.

        Returns:
            Dict matching the emotions.json structure.
        """
        stmt = select(EmotionDefinition).order_by(EmotionDefinition.id)
        result = await self.db.execute(stmt)
        emotions = result.scalars().all()

        return {
            "version": "1.1 (Exported)",
            "source": "L.O.V.E. Observer Database Export",
            "metadata": {
                "total_emotions": len(emotions),
                "generated_at": datetime.now().isoformat(),
            },
            "emotions": [
                {
                    "emotion_name": e.emotion_name,
                    "category": e.category,
                    "definition": e.definition,
                    "vac": (list(e.vac_vector) if e.vac_vector is not None else [0, 0, 0]),
                    "haptic_pattern_id": e.haptic_pattern_id,
                }
                for e in emotions
            ],
        }

    async def import_atlas_emotions(self, import_data: Dict[str, Any]) -> Dict[str, Any]:
        """Import emotions.json data.

        Updates existing emotions by name. Contains logic to recalculate
        embeddings and quaternions only when necessary.

        Args:
            import_data: Raw JSON dictionary containing "emotions" list.

        Returns:
            Dict with status, updated count, and errors.
        """
        if "emotions" not in import_data or not isinstance(import_data["emotions"], list):
            raise ValueError("Invalid format: missing 'emotions' list")

        es = get_embedding_service()
        qb = get_quaternion_builder()

        updated_count = 0
        errors = []

        for item in import_data["emotions"]:
            name = item.get("emotion_name")
            if not name:
                continue

            try:
                # Find existing
                stmt = select(EmotionDefinition).where(EmotionDefinition.emotion_name == name)
                result = await self.db.execute(stmt)
                emotion = result.scalars().first()

                if emotion:
                    await self._update_emotion(emotion, item, es, qb)
                    self.db.add(emotion)
                    updated_count += 1
            except Exception as e:  # pylint: disable=broad-exception-caught
                errors.append(f"Failed to update {name}: {str(e)}")
                logger.error("Error importing emotion %s: %s", name, e)

        await self.db.commit()

        return {"status": "success", "updated": updated_count, "errors": errors}

    async def _update_emotion(
        self, emotion: EmotionDefinition, item: Dict[str, Any], es: Any, qb: Any
    ) -> None:
        """Update a single emotion and trigger recalculations."""
        needs_embed_update = False
        needs_quat_update = False

        # Check definition change
        if "definition" in item and item["definition"] != emotion.definition:
            emotion.definition = item["definition"]
            needs_embed_update = True

        # Check VAC change
        if "vac" in item:
            new_vac = item["vac"]
            current_vac = list(emotion.vac_vector) if emotion.vac_vector is not None else []
            if new_vac != current_vac:
                emotion.vac_vector = new_vac
                needs_quat_update = True

        # Update other fields
        if "category" in item:
            emotion.category = item["category"]
        if "haptic_pattern_id" in item:
            emotion.haptic_pattern_id = item.get("haptic_pattern_id")

        # Perform calculations
        if needs_embed_update:
            text = f"{emotion.emotion_name}: {emotion.definition}"
            emotion.semantic_embedding = await es.generate_embedding(text)

        if needs_quat_update:
            emotion.q_constant = await qb.from_vac(emotion.vac_vector)

    async def export_strategies(self) -> Dict[str, Any]:
        """Export therapeutic strategies as JSON."""
        stmt = select(TransitionStrategy).order_by(TransitionStrategy.strategy_name)
        result = await self.db.execute(stmt)
        strategies = result.scalars().all()

        return {
            "version": "1.0",
            "source": "L.O.V.E. Observer Database Export",
            "metadata": {
                "total_strategies": len(strategies),
                "generated_at": datetime.now().isoformat(),
            },
            "strategies": [
                {
                    "name": s.strategy_name,
                    "type": s.strategy_type,
                    "description": s.description,
                    "steps": s.detailed_steps,
                    "time_required": s.time_required,
                    "difficulty": s.difficulty_level,
                    "evidence": s.evidence_level,
                    "citations": s.research_citations,
                    "contraindications": s.contraindications,
                }
                for s in strategies
            ],
        }
