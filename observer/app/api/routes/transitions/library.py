"""Strategy Library API.

Provides access to the repository of therapeutic strategies and interventions.
Supports searching by type, difficulty, and evidence level.
"""

import logging
from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.planning.types import StrategySearchCriteria
from app.services.recommendation.strategies import StrategyRecommender

logger = logging.getLogger(__name__)

router = APIRouter()


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
