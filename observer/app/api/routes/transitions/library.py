from typing import Annotated, Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.strategy_recommender import StrategyRecommender

router = APIRouter()


@router.get("/strategies")
async def search_strategies(
    db: Annotated[AsyncSession, Depends(get_db)],
    strategy_type: Optional[str] = None,
    evidence_level: Optional[str] = None,
    difficulty_min: Optional[int] = None,
    difficulty_max: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """Search and browse therapeutic strategies."""
    recommender = StrategyRecommender(db)
    return await recommender.search_strategies(
        strategy_type=strategy_type,
        evidence_level=evidence_level,
        difficulty_min=difficulty_min,
        difficulty_max=difficulty_max,
        search_query=search,
        limit=limit,
        offset=offset,
    )


@router.get("/strategies/{strategy_id}")
async def get_strategy_details(
    strategy_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Get detailed information for a specific strategy."""
    recommender = StrategyRecommender(db)
    result = await recommender.get_strategy_by_id(strategy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return result
