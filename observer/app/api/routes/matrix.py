"""Path Matrix API Routes.

Management of the transition path cache and batch computations.
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.matrix import PathMatrixService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/compute-all-paths", tags=["Path Matrix"])
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
        job_id = await service.create_computation_job(total_paths, user_id=user_id or "admin")

        # Start background computation
        background_tasks.add_task(service.compute_all_paths_batch, job_id=job_id, user_id=user_id)

        logger.info("Started batch path computation job %s", job_id)

        return {
            "job_id": str(job_id),
            "status": "pending",
            "total_paths": total_paths,
            "estimated_time": "8-10 minutes",
            "message": (
                "Batch computation started. Poll /observer/computation-status/{job_id} "
                "for progress."
            ),
        }

    except Exception as e:
        logger.error("Failed to start batch computation: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/computation-status/{job_id}", tags=["Path Matrix"])
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
        logger.error("Failed to get job status: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/paths/all", tags=["Path Matrix"])
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
        logger.error("Failed to retrieve cached paths: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/statistics", tags=["Path Matrix"])
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
        logger.error("Failed to get statistics: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/paths/cache", tags=["Path Matrix"])
async def clear_path_cache(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Clear all cached paths from the path matrix.

    Useful for testing or when VAC coordinates have been updated.
    """
    try:
        service = PathMatrixService(db)
        deleted_count = await service.clear_cache()

        logger.info("Cleared %d cached paths", deleted_count)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Successfully cleared {deleted_count} cached paths",
        }

    except Exception as e:
        logger.error("Failed to clear cache: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
