"""Strategy Library API.

Provides access to the repository of therapeutic strategies and interventions.
Supports searching by type, difficulty, and evidence level.
Also provides a dedicated endpoint for per-waypoint strategy recommendations
based on raw VAC vectors (dataset-agnostic).
"""

import logging
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.emotion_definition import EmotionDefinition
from app.services.planning.types import StrategySearchCriteria
from app.services.recommendation.strategies import StrategyRecommender

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST SCHEMA
# ============================================================================


class TransitionStrategyRequest(BaseModel):
    """Request to get strategies for a specific emotional transition."""

    from_vac: List[float] = Field(..., min_length=3, max_length=3)
    to_vac: List[float] = Field(..., min_length=3, max_length=3)
    user_id: Optional[UUID] = None
    limit: int = Field(default=5, ge=1, le=10)


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.get("/strategies")
async def search_strategies(
    db: Annotated[AsyncSession, Depends(get_db)],
    criteria: Annotated[StrategySearchCriteria, Depends(StrategySearchCriteria)],
) -> Dict[str, Any]:
    """Search and browse the therapeutic strategy library.

    Args:
        db: Database session.
        criteria: Search criteria filter.

    Returns:
        Dict: List of strategies matching criteria.
    """
    recommender = StrategyRecommender(db)
    return await recommender.search_strategies(criteria)


@router.get("/strategies/{strategy_id}")
async def get_strategy_details(
    strategy_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Retrieve detailed information for a specific strategy.

    Includes full step-by-step instructions, contraindications, and
    expected outcomes.

    Args:
        strategy_id: The unique strategy identifier.
        db: Database session.

    Returns:
        Dict: Full strategy definition.

    Raises:
        HTTPException: If strategy is not found.
    """
    recommender = StrategyRecommender(db)
    result = await recommender.get_strategy_by_id(strategy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return result


@router.post("/strategies/for-transition")
async def get_strategies_for_transition(
    request: TransitionStrategyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Dict[str, Any]:
    """Get recommended strategies for a specific emotional transition.

    Accepts raw VAC vectors, making it fully dataset-agnostic. Finds the
    nearest emotions to the provided coordinates and runs the 3-tier
    strategy matching system (pattern → VAC-profile → universal).

    Args:
        request: From/To VAC coordinates, optional user_id for personalization.
        db: Database session.

    Returns:
        Dict containing matched strategies with match_reason metadata.
    """
    try:
        # Resolve VAC vectors to nearest database emotions
        from_emotion = await _find_nearest_emotion(db, request.from_vac)
        to_emotion = await _find_nearest_emotion(db, request.to_vac)

        if not from_emotion or not to_emotion:
            raise HTTPException(
                status_code=404,
                detail="Could not find matching emotions for the provided VAC vectors",
            )

        # Run strategy recommendation
        recommender = StrategyRecommender(db)
        user_id = str(request.user_id) if request.user_id else None
        strategies = await recommender.get_strategies_for_transition(
            from_emotion=from_emotion,
            to_emotion=to_emotion,
            user_id=user_id,
            limit=request.limit,
        )

        return {
            "from_emotion": from_emotion.emotion_name,
            "to_emotion": to_emotion.emotion_name,
            "strategies": strategies,
            "count": len(strategies),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get strategies for transition: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Strategy lookup failed: {str(e)}") from e


# ============================================================================
# HELPERS
# ============================================================================


async def _find_nearest_emotion(db: AsyncSession, vac: List[float]) -> Optional[EmotionDefinition]:
    """Find the nearest emotion to a VAC vector using L2 distance.

    Uses pgvector's distance operator for efficient nearest-neighbor search.
    """
    stmt = (
        select(EmotionDefinition).order_by(EmotionDefinition.vac_vector.l2_distance(vac)).limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
