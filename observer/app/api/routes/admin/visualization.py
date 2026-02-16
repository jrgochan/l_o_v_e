"""Admin Routes — Visualization data management (Emotion Atlas)."""

import logging
from typing import Annotated, Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.emotion_definition import EmotionDefinition
from app.models.user import User
from app.schemas.emotions import EmotionResponse, EmotionUpdate
from app.services.admin.service import AdminService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/visualization/emotions", response_model=List[EmotionResponse])
async def list_visualization_emotions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """List all emotion definitions for the visualization."""
    stmt = select(EmotionDefinition).order_by(EmotionDefinition.emotion_name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def _update_emotion_quaternion(update_data: Dict[str, Any], emotion: Any) -> None:
    """Recalculate quaternion if VAC changed."""
    if "vac_vector" in update_data:
        from app.services import get_quaternion_builder  # pylint: disable=import-outside-toplevel

        try:
            qb = get_quaternion_builder()
            new_quat = await qb.from_vac(update_data["vac_vector"])
            emotion.q_constant = new_quat
            emotion.vac_vector = update_data["vac_vector"]
            del update_data["vac_vector"]
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to calculate quaternion: {str(e)}"
            ) from e


async def _update_emotion_embedding(update_data: Dict[str, Any], emotion: Any) -> None:
    """Recalculate embedding if definition changed."""
    if "definition" in update_data:
        from app.services import get_embedding_service  # pylint: disable=import-outside-toplevel

        try:
            es = get_embedding_service()
            embedding_text = f"{emotion.emotion_name}: {update_data['definition']}"
            new_embedding = await es.generate_embedding(embedding_text)
            emotion.semantic_embedding = new_embedding
            emotion.definition = update_data["definition"]
            del update_data["definition"]
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to generate embedding: {str(e)}"
            ) from e


@router.put("/visualization/emotions/{emotion_id}", response_model=EmotionResponse)
async def update_visualization_emotion(
    emotion_id: UUID,
    emotion_in: EmotionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update an emotion definition.

    Triggers recalculation of derived vectors:
    - If VAC changes -> Recalculate Quaternion
    - If Definition/Name changes -> Recalculate Semantic Embedding
    """
    stmt = select(EmotionDefinition).where(EmotionDefinition.id == emotion_id)
    result = await db.execute(stmt)
    emotion = result.scalars().first()

    if not emotion:
        raise HTTPException(status_code=404, detail="Emotion not found")

    update_data = emotion_in.model_dump(exclude_unset=True)

    await _update_emotion_quaternion(update_data, emotion)
    await _update_emotion_embedding(update_data, emotion)

    for field, value in update_data.items():
        setattr(emotion, field, value)

    db.add(emotion)
    await db.commit()
    await db.refresh(emotion)
    return emotion


@router.get("/visualization/export")
async def export_visualization_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Export current state as JSON matching the canonical emotions.json format."""
    service = AdminService(db)
    return await service.export_atlas_emotions()


@router.post("/visualization/import")
async def import_visualization_data(
    import_data: Dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Import emotions.json data.

    Updates existing emotions by name. Does NOT delete missing ones (safe update).
    """
    service = AdminService(db)
    try:
        return await service.import_atlas_emotions(import_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Import failed: %s", e)
        raise HTTPException(status_code=500, detail="Import process failed") from e
