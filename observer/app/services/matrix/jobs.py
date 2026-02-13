"""Module documentation."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class JobManager:
    """Manages path computation jobs."""

    def __init__(self, session: AsyncSession):
        """Docstring."""
        self.session = session

    async def update_job_status(  # pylint: disable=too-many-positional-arguments
        self,
        job_id: UUID,
        status: str,
        total: int,
        completed: int,
        failed: int,
        error_message: Optional[str] = None,
        completed_at: Optional[datetime] = None,
    ) -> None:
        """Update computation job status."""
        stmt = text(
            """
            UPDATE path_computation_jobs
            SET status = :status,
            total_paths = :total,
            completed_paths = :completed,
            failed_paths = :failed,
            error_message = :error,
            completed_at = :completed_at
            WHERE job_id = :job_id
        """
        )

        await self.session.execute(
            stmt,
            {
                "job_id": job_id,
                "status": status,
                "total": total,
                "completed": completed,
                "failed": failed,
                "error": error_message,
                "completed_at": completed_at,
            },
        )

    async def create_job(self, total_paths: int, user_id: Optional[str] = None) -> UUID:
        """Create a new computation job."""
        job_id = uuid4()
        stmt = text(
            """
            INSERT INTO path_computation_jobs (
                job_id,
                status,
                total_paths,
                completed_paths,
                failed_paths,
                started_at,
                created_by
            ) VALUES (
                :job_id,
                'pending',
                :total,
                0,
                0,
                NOW(),
                :user_id
            )
        """
        )
        await self.session.execute(
            stmt, {"job_id": job_id, "total": total_paths, "user_id": user_id}
        )
        return job_id

    async def get_job_status(self, job_id: UUID) -> Optional[Dict[str, Any]]:
        """Get job status."""
        stmt = text(
            """
            SELECT
                status,
                total_paths,
                completed_paths,
                failed_paths,
                started_at,
                completed_at,
                error_message
            FROM path_computation_jobs
            WHERE job_id = :job_id
        """
        )
        result = await self.session.execute(stmt, {"job_id": job_id})
        row = result.fetchone()

        if not row:
            return None

        return {
            "status": row[0],
            "total": row[1],
            "completed": row[2],
            "failed": row[3],
            "created_at": row[4],
            "completed_at": row[5],
            "error": row[6],
        }
