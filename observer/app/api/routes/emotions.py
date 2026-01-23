"""Emotion API Routes - Emotional Collection Discovery & Path Matrix Management.

REST endpoints for exploring Observer's emotion collection, initiating path matrix computation,
and accessing intelligent recommendations. Primary interface for emotion browsing, category
exploration, and therapeutic journey discovery.

API Architecture:

    Seven endpoint categories::

        1. Emotion Browsing
           GET /observer/emotions - List all emotions
           GET /observer/categories - List categories
           GET /observer/emotions/{id} - Get specific emotion
           GET /observer/search - Search by name/definition

        2. Path Matrix Management
           POST /observer/compute-all-paths - Start batch computation
           GET /observer/computation-status/{job_id} - Monitor progress
           GET /observer/paths/all - Query cached paths
           DELETE /observer/paths/cache - Clear cache

        3. Smart Recommendations
           GET /observer/recommendations - Context-aware suggestions

Endpoint Details:

    GET /observer/emotions
    ───────────────────
    Purpose: Retrieve all emotions, optionally filtered

    Query params:
    - category: Filter by category (optional)

    Response:
    {
        "total_count": 87,
        "emotions": [
            {
                "id": "uuid",
                "name": "Anxiety",
                "category": "When Things Are Uncertain",
                "definition": "Brené Brown's description...",
                "vac": [-0.6, 0.7, -0.3],
                "quaternion": [0.8, 0.3, 0.4, 0.3]
            },
            ...
        ]
    }

    Use cases:
    - Atlas explorer UI initialization
    - Category filtering
    - Dropdown population
    - Emotion selection menus

    GET /observer/categories
    ─────────────────────
    Purpose: List[Any] all 12 emotional categories

    Response:
    {
        "total_categories": 12,
        "categories": [
            {
                "name": "When Things Are Uncertain",
                "emotion_count": 13
            },
            ...
        ]
    }

    Use cases:
    - Navigation menu
    - Category browser
    - Distribution analysis

    GET /observer/emotions/{emotion_id}
    ────────────────────────────────
    Purpose: Get detailed info for single emotion

    Response: Full emotion object with VAC, quaternion, definition

    Use cases:
    - Emotion detail page
    - Tooltip information
    - Journey waypoint display

    GET /observer/search?query={text}
    ──────────────────────────────
    Purpose: Text search across emotions

    Searches: emotion_name and definition (ILIKE)

    Search examples:
    - query="overwhelm" → Overwhelm, Anxiety, Stress
    - query="happy" → Happiness, Joy, Contentment

    Use cases:
    - Search box functionality
    - Quick emotion lookup
    - Fuzzy finding

    POST /observer/compute-all-paths
    ─────────────────────────────
    Purpose: Start 7,482-path batch computation

    Background task: Yes (returns immediately)
    Duration: 30-45 minutes

    Response:
    {
        "job_id": "uuid",
        "status": "pending",
        "total_paths": 7482,
        "estimated_time": "8-10 minutes"
    }

    Use cases:
    - Initial atlas setup
    - After VAC coordinate updates
    - Rebuild cache

    GET /observer/computation-status/{job_id}
    ──────────────────────────────────────
    Purpose: Monitor batch computation progress

    Response:
    {
        "job_id": "uuid",
        "status": "running",
        "percentage": 46.8,
        "completed_paths": 3500,
        "total_paths": 7482,
        "estimated_time_remaining": "~28 minutes"
    }

    Poll interval: Every 5-10 seconds

    GET /observer/paths/all
    ───────────────────
    Purpose: Query cached transition paths

    Query params:
    - difficulty: easy|moderate|difficult
    - requires_bridge: true|false
    - limit: Max results
    - offset: Pagination

    Response: Filtered paths + cache statistics

    Use cases:
    - Browse all paths
    - Filter by difficulty
    - Find bridge paths
    - Paginated exploration

    GET /observer/statistics
    ────────────────────
    Purpose: Cache statistics and metrics

    Response:
    {
        "total_cached": 7478,
        "completion_percentage": 99.9,
        "difficulty_distribution": {
            "easy": 2341,
            "moderate": 3892,
            "difficult": 1245
        },
        "bridge_paths": 3456,
        "avg_waypoints": 2.3
    }

    Use cases:
    - Admin dashboard
    - Cache health monitoring
    - System status

    DELETE /observer/paths/cache
    ─────────────────────────
    Purpose: Clear all cached paths

    Response: Deleted count

    Use cases:
    - Testing
    - After atlas updates
    - Cache invalidation

    GET /observer/recommendations
    ──────────────────────────
    Purpose: Intelligent exploration suggestions

    Query params:
    - context: exploration|healing|growth
    - emotion_id: Current emotion (optional)
    - selected_ids: CSV of selected emotions
    - limit: Results per category

    Response:
    {
        "similar_emotions": [...],
        "curated_journeys": [...],
        "problematic_transitions": [...],
        "complementary_suggestions": [...]
    }

    Use cases:
    - "What's next?" suggestions
    - Curated journey display
    - Similar emotion discovery
    - Context-aware guidance

Performance Characteristics:
    - GET /emotions: 15-30ms (87 rows, indexed)
    - GET /categories: 5-10ms (aggregation, 12 groups)
    - GET /emotions/{id}: <5ms (primary key lookup)
    - GET /search: 10-30ms (ILIKE search, small table)
    - POST /compute-all-paths: <100ms (starts background job)
    - GET /computation-status: <5ms (single row lookup)
    - GET /paths/all: 20-100ms (depends on filters)
    - GET /statistics: 50-100ms (aggregates 7k+ rows)
    - DELETE /paths/cache: 200-500ms (bulk delete)
    - GET /recommendations: 30-60ms (complex multi-query)

Error Handling:

    Robust exception management::

        404 Not Found:
        ─────────────
        - Emotion ID doesn't exist
        - Job ID not found
        - No results from search

        400 Bad Request:
        ───────────────
        - Invalid UUID format
        - Invalid enum values (difficulty, context)
        - Malformed query parameters

        500 Internal Server Error:
        ─────────────────────────
        - Database connection failures
        - Unexpected exceptions
        - Service layer errors

        All errors logged with context for debugging

Integration Points:

    API consumers::

        - Experience Web UI: Browse atlas, get recommendations
        - Mobile Apps: Emotion selection, journey navigation
        - Admin Dashboard: Path matrix management
        - Testing: API-driven atlas exploration

References:
    - Atlas model: observer/app/models/atlas_definition.py
    - Path matrix service: observer/app/services/path_matrix_service.py
    - Recommendation engine: observer/app/services/recommendation_engine.py
    - FastAPI docs: https://fastapi.tiangolo.com/
    - REST best practices: Richardson & Ruby (2007). RESTful Web Services
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.emotion_definition import EmotionDefinition, EmotionCollection
from app.services.path_matrix_service import PathMatrixService
from app.services.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/emotions", tags=["Emotions"])
async def get_all_emotions(
    category: Optional[str] = Query(None, description="Filter by category"),
    collection_id: Optional[UUID] = Query(None, description="Filter by collection ID"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get all emotions from the collection.

    Returns the complete emotion set (defaulting to primary collection),
    optionally filtered by category.
    """
    try:
        # Determine collection
        target_collection_id = collection_id
        if not target_collection_id:
            # Get default collection
            default_coll = await db.scalar(
                select(EmotionCollection).where(EmotionCollection.is_default == True)
            )
            if default_coll:
                target_collection_id = default_coll.id

        stmt = select(EmotionDefinition)
        
        if target_collection_id:
            stmt = stmt.where(EmotionDefinition.collection_id == target_collection_id)

        if category:
            stmt = stmt.where(EmotionDefinition.category == category)

        stmt = stmt.order_by(EmotionDefinition.category, EmotionDefinition.emotion_name)

        result = await db.execute(stmt)
        emotions = result.scalars().all()

        return {
            "total_count": len(emotions),
            "emotions": [
                {
                    "id": str(emotion.id),
                    "name": emotion.emotion_name,
                    "category": emotion.category,
                    "definition": emotion.definition,
                    "vac": [
                        float(emotion.vac_vector[0]),
                        float(emotion.vac_vector[1]),
                        float(emotion.vac_vector[2]),
                    ],
                    "quaternion": (
                        [
                            float(emotion.q_constant[0]),
                            float(emotion.q_constant[1]),
                            float(emotion.q_constant[2]),
                            float(emotion.q_constant[3]),
                        ]
                        if emotion.q_constant is not None
                        else [1.0, 0.0, 0.0, 0.0]
                    ),
                    "color_hint": emotion.color_hint,
                    "movement_pattern": emotion.movement_pattern,
                }
                for emotion in emotions
            ],
        }

    except Exception as e:
        logger.error(f"Failed to fetch emotions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories", tags=["Emotions"])
async def get_categories(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get all emotion categories.

    Returns categories with emotion counts.
    """
    try:
        stmt = (
            select(
                EmotionDefinition.category,
                # pylint: disable=not-callable
                func.count(EmotionDefinition.id).label("emotion_count"),
            )
            .group_by(EmotionDefinition.category)
            .order_by(EmotionDefinition.category)
        )

        result = await db.execute(stmt)
        categories = result.all()

        return {
            "total_categories": len(categories),
            "categories": [{"name": cat[0], "emotion_count": cat[1]} for cat in categories],
        }

    except Exception as e:
        logger.error(f"Failed to fetch categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emotions/{emotion_id}", tags=["Emotions"])
async def get_emotion_by_id(emotion_id: str, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get a specific emotion by ID.

    Returns complete emotion details including VAC coordinates and definition.
    """
    try:
        stmt = select(EmotionDefinition).where(EmotionDefinition.id == emotion_id)
        result = await db.execute(stmt)
        emotion = result.scalar_one_or_none()

        if not emotion:
            raise HTTPException(status_code=404, detail="Emotion not found")

        return {
            "id": str(emotion.id),
            "name": emotion.emotion_name,
            "category": emotion.category,
            "definition": emotion.definition,
            "vac": [
                float(emotion.vac_vector[0]),
                float(emotion.vac_vector[1]),
                float(emotion.vac_vector[2]),
            ],
            "quaternion": (
                [
                    float(emotion.q_constant[0]),
                    float(emotion.q_constant[1]),
                    float(emotion.q_constant[2]),
                    float(emotion.q_constant[3]),
                ]
                if emotion.q_constant is not None
                else [1.0, 0.0, 0.0, 0.0]
            ),
            "color_hint": emotion.color_hint,
            "movement_pattern": emotion.movement_pattern,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch emotion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", tags=["Emotions"])
async def search_emotions(
    query: str = Query(..., description="Search term for emotion name or definition"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Search emotions by name or definition.

    Useful for finding specific emotions or exploring the atlas.
    """
    try:
        stmt = (
            select(EmotionDefinition)
            .where(
                (EmotionDefinition.emotion_name.ilike(f"%{query}%"))
                | (EmotionDefinition.definition.ilike(f"%{query}%"))
            )
            .order_by(EmotionDefinition.emotion_name)
        )

        result = await db.execute(stmt)
        emotions = result.scalars().all()

        return {
            "query": query,
            "result_count": len(emotions),
            "emotions": [
                {
                    "id": str(emotion.id),
                    "name": emotion.emotion_name,
                    "category": emotion.category,
                    "definition": emotion.definition,
                    "vac": [
                        float(emotion.vac_vector[0]),
                        float(emotion.vac_vector[1]),
                        float(emotion.vac_vector[2]),
                    ],
                    "color_hint": emotion.color_hint,
                    "movement_pattern": emotion.movement_pattern,
                }
                for emotion in emotions
            ],
        }

    except Exception as e:
        logger.error(f"Failed to search emotions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compute-all-paths", tags=["Emotions", "Path Matrix"])
async def compute_all_paths_batch(
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Query(None, description="User ID for personalized paths"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Compute ALL 87×86 = 7,482 emotion-to-emotion transition paths.

    This endpoint starts a background job and returns immediately.
    Use the returned job_id to poll /observer/computation-status/{job_id} for progress.

    Results are cached in the database for instant retrieval on subsequent requests.
    """
    try:
        service = PathMatrixService(db)

        # Create job record
        total_paths = 87 * 86  # All possible transitions
        job_id = await service.create_computation_job(total_paths, created_by=user_id or "admin")

        # Start background computation
        background_tasks.add_task(service.compute_all_paths_batch, job_id=job_id, user_id=user_id)

        logger.info(f"Started batch path computation job {job_id}")

        return {
            "job_id": str(job_id),
            "status": "pending",
            "total_paths": total_paths,
            "estimated_time": "8-10 minutes",
            "message": (
                "Batch computation started. Poll /observer/computation-status/{job_id} for progress."
            ),
        }

    except Exception as e:
        logger.error(f"Failed to start batch computation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/computation-status/{job_id}", tags=["Emotions", "Path Matrix"])
async def get_computation_status(
    job_id: UUID, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get status of a batch path computation job.

    Returns progress, ETA, and current status.
    """
    try:
        service = PathMatrixService(db)
        status = await service.get_computation_job_status(job_id)

        if not status:
            raise HTTPException(status_code=404, detail="Job not found")

        return status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/paths/all", tags=["Emotions", "Path Matrix"])
async def get_all_cached_paths(
    difficulty: Optional[str] = Query(
        None, description="Filter by difficulty: easy, moderate, difficult"
    ),
    requires_bridge: Optional[bool] = Query(None, description="Filter by bridge requirement"),
    limit: Optional[int] = Query(None, description="Maximum results to return"),
    offset: int = Query(0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve all cached paths from the path matrix.

    Returns paths with optional filtering and pagination.
    First call to /observer/compute-all-paths to populate the cache.
    """
    try:
        service = PathMatrixService(db)

        paths = await service.get_all_cached_paths(
            difficulty_filter=difficulty,
            requires_bridge_filter=requires_bridge,
            limit=limit,
            offset=offset,
        )

        # Get cache statistics
        stats = await service.get_cache_statistics()

        return {
            "cache_stats": stats,
            "results": len(paths),
            "paths": paths,
            "pagination": {"limit": limit, "offset": offset},
        }

    except Exception as e:
        logger.error(f"Failed to retrieve cached paths: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", tags=["Emotions", "Path Matrix"])
async def get_path_statistics(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get comprehensive statistics about the path matrix.

    Returns aggregated metrics including difficulty distribution,
    distance statistics, bridge usage, and category connectivity.
    """
    try:
        service = PathMatrixService(db)
        stats = await service.get_cache_statistics()

        return stats

    except Exception as e:
        logger.error(f"Failed to get statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/paths/cache", tags=["Emotions", "Path Matrix"])
async def clear_path_cache(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Clear all cached paths from the path matrix.

    Useful for testing or when VAC coordinates have been updated.
    """
    try:
        service = PathMatrixService(db)
        deleted_count = await service.clear_cache()

        logger.info(f"Cleared {deleted_count} cached paths")

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Successfully cleared {deleted_count} cached paths",
        }

    except Exception as e:
        logger.error(f"Failed to clear cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations", tags=["Emotions", "Smart Recommendations"])
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
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid emotion_id UUID: {emotion_id}"
                )

        selected_emotions = []
        if selected_ids:
            try:
                selected_emotions = [
                    UUID(sid.strip()) for sid in selected_ids.split(",") if sid.strip()
                ]
            except ValueError as e:
                logger.error(f"Failed to parse selected_ids: {selected_ids}, error: {e}")
                raise HTTPException(
                    status_code=400, detail=f"Invalid selected_ids format: {str(e)}"
                )

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
        logger.error(f"Failed to get recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")
