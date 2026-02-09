"""Smart Recommendations API Routes.

Context-aware suggestions for emotional exploration and healing.
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.recommendation.engine import RecommendationEngine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/recommendations", tags=["Smart Recommendations"])
async def get_smart_recommendations(
    context: str = Query("exploration", description="Context: exploration, healing, or growth"),
    emotion_id: Optional[str] = Query(None, description="Current emotion for similarity search"),
    selected_ids: Optional[str] = Query(None, description="Comma-separated selected emotion IDs"),
    limit: int = Query(5, description="Max results per category"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get intelligent recommendations for emotional exploration.

    Returns:
    - similar_emotions: Nearest neighbors in VAC space (if emotion_id provided)
    - curated_journeys: Research-backed therapeutic patterns
    - problematic_transitions: Hardest paths (exploration context)
    - complementary_suggestions: Smart suggestions based on selection

    Context options:
    - exploration: All recommendations including difficult transitions
    - healing: Focus on therapeutic journeys
    - growth: Focus on positive development paths
    """
    try:
        engine = RecommendationEngine(db)

        # Parse inputs with better error handling
        current_emotion_id = None
        if emotion_id:
            try:
                current_emotion_id = UUID(emotion_id)
            except ValueError as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid emotion_id UUID: {emotion_id}"
                ) from e

        selected_emotions = []
        if selected_ids:
            try:
                selected_emotions = [
                    UUID(sid.strip()) for sid in selected_ids.split(",") if sid.strip()
                ]
            except ValueError as e:
                logger.error("Failed to parse selected_ids: %s, error: %s", selected_ids, e)
                raise HTTPException(
                    status_code=400, detail=f"Invalid selected_ids format: {str(e)}"
                ) from e

        # Get recommendations
        recommendations = await engine.get_recommendations(
            context=context,
            current_emotion_id=current_emotion_id,
            selected_emotions=selected_emotions,
            limit=limit,
        )

        return {"context": context, "recommendations": recommendations}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get recommendations: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}") from e
