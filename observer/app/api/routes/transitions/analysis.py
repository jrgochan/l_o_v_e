"""Transition Analytics API.

Provides endpoints for analyzing user journey history and strategy effectiveness.
Used to adaptively improve recommendations based on past performance.
"""

import logging
from typing import Annotated, Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transition import EffectiveStrategiesResponse, JourneyHistoryResponse
from app.database import get_db
from app.models.transition_strategy import StrategyAttempt, UserJourney

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user/{user_id}/journey-history", response_model=JourneyHistoryResponse)
async def get_user_journey_history(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)]
) -> JourneyHistoryResponse:
    """Retrieve the complete history of a user's emotional journeys.

    Aggregates statistics on completed, abandoned, and in-progress journeys
    to provide a high-level overview of user engagement and success.

    Args:
        user_id: The UUID of the user.
        db: Database session.

    Returns:
        JourneyHistoryResponse: Aggregated stats and list of journeys.
    """
    try:
        stmt = select(UserJourney).where(UserJourney.user_id == user_id)
        result = await db.execute(stmt)
        journeys = result.scalars().all()

        total = len(journeys)
        completed = sum(1 for j in journeys if j.status == "completed")
        abandoned = sum(1 for j in journeys if j.status == "abandoned")
        in_progress = sum(1 for j in journeys if j.status == "in_progress")

        success_rate = completed / total if total > 0 else 0.0

        journey_list = [j.to_dict() for j in journeys]

        return JourneyHistoryResponse(
            total_journeys=total,
            completed=completed,
            abandoned=abandoned,
            in_progress=in_progress,
            success_rate=success_rate,
            journeys=journey_list,
        )

    except Exception as e:
        logger.error("Failed to get journey history: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/user/{user_id}/effective-strategies", response_model=EffectiveStrategiesResponse)
async def get_user_effective_strategies(
    user_id: UUID, db: Annotated[AsyncSession, Depends(get_db)], limit: int = 5
) -> EffectiveStrategiesResponse:
    """Identify the most effective therapeutic strategies for a specific user.

    Analyzes `StrategyAttempt` records to calculate average helpfulness ratings
    per strategy. Filters for strategies tried at least twice to ensure statistical
    relevance.

    Args:
        user_id: The UUID of the user.
        db: Database session.
        limit: Maximum number of strategies to return (default: 5).

    Returns:
        EffectiveStrategiesResponse: List of top strategies with usage stats.
    """
    try:
        # Query strategy attempts for this user
        stmt = (
            select(StrategyAttempt)
            .join(UserJourney, StrategyAttempt.journey_id == UserJourney.id)
            .where(
                UserJourney.user_id == user_id,
                StrategyAttempt.helpful_rating.isnot(None),
            )
        )

        result = await db.execute(stmt)
        attempts = result.scalars().all()

        # Group by strategy and calculate avg rating
        strategy_stats: Dict[str, Dict[str, Any]] = {}
        for attempt in attempts:
            sid = str(attempt.strategy_id)
            if sid not in strategy_stats:
                strategy_stats[sid] = {
                    "strategy_id": sid,
                    "strategy_name": attempt.strategy_name,
                    "ratings": [],
                    "times_tried": 0,
                }

            strategy_stats[sid]["ratings"].append(attempt.helpful_rating)
            strategy_stats[sid]["times_tried"] += 1

        # Calculate averages and sort
        top_strategies = []
        for stats in strategy_stats.values():
            if stats["times_tried"] >= 2:  # Only include if tried at least twice
                ratings = stats["ratings"]
                avg_rating = sum(float(r) for r in ratings) / len(ratings)
                stats["avg_rating"] = round(avg_rating, 2)
                top_strategies.append(stats)

        # Sort by rating, then by times tried
        top_strategies.sort(key=lambda x: (x["avg_rating"], x["times_tried"]), reverse=True)
        top_strategies = top_strategies[:limit]

        return EffectiveStrategiesResponse(
            user_id=str(user_id),
            total_strategies_tried=len(strategy_stats),
            top_strategies=top_strategies,
        )

    except Exception as e:
        logger.error("Failed to get effective strategies: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
