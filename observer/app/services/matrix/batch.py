import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.matrix.cache import CacheManager
from app.services.matrix.jobs import JobManager
from app.services.path_planner import PathPlanner

logger = logging.getLogger(__name__)


class BatchProcessor:
    """Handles batch path computation logic."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.path_planner = PathPlanner(session)
        self.cache_manager = CacheManager(session)
        self.job_manager = JobManager(session)

    async def execute_batch(
        self,
        job_id: UUID,
        user_id: Optional[str],
        collection_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute the batch computation job."""
        # pylint: disable=too-many-locals,too-many-branches,too-many-statements
        logger.info("Starting batch path computation for job %s", job_id)

        # Get all emotions (filtered by collection if provided)
        stmt = select(EmotionDefinition).order_by(EmotionDefinition.emotion_name)
        if collection_id:
            stmt = stmt.where(EmotionDefinition.collection_id == UUID(collection_id))

        result = await self.session.execute(stmt)
        all_emotions = result.scalars().all()

        total_emotions = len(all_emotions)
        total_pairs = total_emotions * (total_emotions - 1)

        logger.info("Computing paths for %d emotions = %d pairs", total_emotions, total_pairs)

        # Update job status to running
        await self.job_manager.update_job_status(job_id, "running", total_pairs, 0, 0)

        completed = 0
        failed = 0
        start_time = datetime.now(timezone.utc)

        try:
            for i in range(0, total_emotions):
                from_emotion = all_emotions[i]

                for j in range(0, total_emotions):
                    if i == j:
                        continue  # Skip self-transitions

                    to_emotion = all_emotions[j]

                    try:
                        # Check if already cached
                        if await self.cache_manager.is_cached(from_emotion.id, to_emotion.id):
                            completed += 1
                            continue

                        # Compute path
                        path_data = await self._compute_single_path(
                            from_emotion, to_emotion, user_id, collection_id
                        )

                        # Cache result
                        await self.cache_manager.cache_path(from_emotion, to_emotion, path_data)

                        completed += 1

                        # Update progress every 10 paths
                        if completed % 10 == 0:
                            await self.job_manager.update_job_status(
                                job_id, "running", total_pairs, completed, failed
                            )
                            await self.session.commit()

                    except Exception as e:  # pylint: disable=broad-exception-caught
                        logger.error(
                            "Failed to compute path %s → %s: %s",
                            from_emotion.emotion_name,
                            to_emotion.emotion_name,
                            e,
                        )
                        failed += 1
                        continue

            # Final commit
            await self.session.commit()

            # Update job to completed
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            await self.job_manager.update_job_status(
                job_id,
                "completed",
                total_pairs,
                completed,
                failed,
                completed_at=end_time,
            )
            await self.session.commit()

            logger.info(
                "Batch computation complete: %d succeeded, %d failed in %.2fs",
                completed,
                failed,
                duration,
            )

            return {
                "job_id": str(job_id),
                "status": "completed",
                "total_paths": total_pairs,
                "completed": completed,
                "failed": failed,
                "duration_seconds": duration,
            }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Batch computation failed: %s", e, exc_info=True)
            await self.job_manager.update_job_status(
                job_id, "failed", total_pairs, completed, failed, error_message=str(e)
            )
            await self.session.commit()
            raise

    async def _compute_single_path(
        self,
        from_emotion: EmotionDefinition,
        to_emotion: EmotionDefinition,
        user_id: Optional[str],
        collection_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute a single path using PathPlanner."""
        path = await self.path_planner.find_transition_path(
            current_vac=list(from_emotion.vac_vector),
            goal_vac=list(to_emotion.vac_vector),
            max_waypoints=3,
            user_id=user_id,
            collection_id=collection_id,
        )

        # Build complete path data
        return {
            "from_emotion": {
                "id": str(from_emotion.id),
                "name": from_emotion.emotion_name,
                "category": from_emotion.category,
                "vac": [float(x) for x in from_emotion.vac_vector],
            },
            "to_emotion": {
                "id": str(to_emotion.id),
                "name": to_emotion.emotion_name,
                "category": to_emotion.category,
                "vac": [float(x) for x in to_emotion.vac_vector],
            },
            "waypoints": [
                {
                    "emotion": wp.emotion_name,
                    "vac": [float(x) for x in wp.vac_vector],
                    "category": wp.category,
                }
                for wp in path.waypoints
            ],
            "distance": float(path.total_distance),
            "estimated_time": path.estimated_time,
            "difficulty": path.difficulty,
            "waypoint_count": len(path.waypoints),
            "requires_bridge": any(
                wp.emotion_name
                in [
                    "Vulnerability",
                    "Awe",
                    "Compassion",
                    "Curiosity",
                    "Acceptance",
                    "Gratitude",
                ]
                for wp in path.waypoints
            ),
        }
