"""Emotion Collection Management Routes.

Endpoints for managing emotion datasets/collections (e.g., Atlas of the Heart, Plutchik).
"""

import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.emotion_definition import EmotionCollection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/collections", tags=["Collections"])
async def get_collections(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """List all available emotion collections."""
    try:
        stmt = select(EmotionCollection).order_by(EmotionCollection.name)
        result = await db.execute(stmt)
        collections = result.scalars().all()

        return {
            "total_count": len(collections),
            "collections": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "description": c.description,
                    "is_active": c.is_active,
                    "is_default": c.is_default,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
                for c in collections
            ],
        }
    except Exception as e:
        logger.error(f"Failed to fetch collections: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collections/{collection_id}/activate", tags=["Collections"])
async def set_active_collection(
    collection_id: UUID, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Set a collection as the default active collection.
    
    This disables 'is_default' on all other collections.
    """
    try:
        # Check if collection exists
        stmt = select(EmotionCollection).where(EmotionCollection.id == collection_id)
        result = await db.execute(stmt)
        collection = result.scalar_one_or_none()

        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Begin transaction to swap default
        # 1. Set all to not default
        await db.execute(
            update(EmotionCollection).values(is_default=False)
        )
        
        # 2. Set target to default
        await db.execute(
            update(EmotionCollection)
            .where(EmotionCollection.id == collection_id)
            .values(is_default=True, is_active=True)
        )
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Collection '{collection.name}' is now the default dataset",
            "active_collection": {
                "id": str(collection.id),
                "name": collection.name
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to activate collection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
