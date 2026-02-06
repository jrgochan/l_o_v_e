from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.matrix.batch import BatchProcessor
from app.services.matrix.cache import CacheManager
from app.services.matrix.jobs import JobManager


class PathMatrixService:
    """Service for batch computing and caching the complete path matrix."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize PathMatrixService."""
        self.session = session
        self.batch_processor = BatchProcessor(session)
        self.cache_manager = CacheManager(session)
        self.job_manager = JobManager(session)

    async def compute_all_paths_batch(
        self,
        job_id: UUID,
        user_id: Optional[str] = None,
        collection_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute all possible emotion transitions for the specified collection.

        Delegates to BatchProcessor.
        """
        # Note: In a real async implementation, this would likely launch a background task.
        # Here we run it directly (awaiting) as per the original design pattern,
        # or it could be wrapped in a task.
        return await self.batch_processor.execute_batch(job_id, user_id, collection_id)

    async def get_all_cached_paths(
        self,
        difficulty_filter: Optional[str] = None,
        requires_bridge_filter: Optional[bool] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Query cached paths using CacheManager."""
        return await self.cache_manager.get_all_cached_paths(
            difficulty_filter, requires_bridge_filter, limit
        )

    async def get_cache_statistics(self) -> Dict[str, Any]:
        """Get statistics about the path matrix cache."""
        return await self.cache_manager.get_cache_statistics()

    async def create_computation_job(self, total_paths: int, user_id: Optional[str] = None) -> UUID:
        """Create a new computation job."""
        job_id = await self.job_manager.create_job(total_paths, user_id)
        # Service layer commit
        await self.session.commit()
        return job_id

    async def get_computation_job_status(self, job_id: UUID) -> Optional[Dict[str, Any]]:
        """Get the status of a computation job."""
        return await self.job_manager.get_job_status(job_id)
