"""Path Matrix Commands."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

import typer
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.emotion_definition import EmotionCollection
from app.services.matrix.service import PathMatrixService

logger = logging.getLogger(__name__)

app = typer.Typer(help="Path Matrix operations.")


async def compute_matrix_logic(collection_name: Optional[str] = None) -> bool:
    """Compute all paths in the matrix for the specified collection."""
    logger.info("=" * 70)
    logger.info("PATH MATRIX PRE-COMPUTATION")
    logger.info("=" * 70)
    logger.info("Collection: %s", collection_name)
    logger.info("Computing emotion transition paths")

    start_time = datetime.now()

    async with AsyncSessionLocal() as session:
        # Get collection ID first
        if collection_name:
            stmt = select(EmotionCollection).where(EmotionCollection.name == collection_name)
            query_result = await session.execute(stmt)
            collection = query_result.scalar_one_or_none()

            if not collection:
                logger.error("Collection '%s' not found!", collection_name)
                return False

            collection_id = str(collection.id)
            logger.info("Resolved collection ID: %s", collection_id)
        else:
            collection_id = None
            logger.warning(
                "No collection specified - computing for ALL emotions (mixed collections!)"
            )

        try:
            service = PathMatrixService(session)

            # Create a computation job
            job_id = uuid.uuid4()
            logger.info("Creating computation job: %s", job_id)
            logger.info("Starting matrix computation...")

            # Start batch computation
            result = await service.compute_all_paths_batch(
                job_id=job_id, collection_id=collection_id
            )

            # Report results
            end_time = datetime.now()
            duration = end_time - start_time

            logger.info("")
            logger.info("=" * 70)
            logger.info("COMPUTATION COMPLETE")
            logger.info("=" * 70)
            logger.info(
                "Duration: %.1f s (%.1f m)",
                duration.total_seconds(),
                duration.total_seconds() / 60,
            )
            logger.info("Paths computed: %d", result.get("completed_paths", 0))
            logger.info("Paths failed: %d", result.get("failed_paths", 0))
            logger.info("Total paths: %d", result.get("total_paths", 0))
            logger.info("")

            if result.get("failed_paths", 0) > 0:
                logger.warning("Some paths failed - check logs for details")
                return False

            logger.info("✅ All paths computed successfully!")
            return True

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("❌ Matrix computation failed: %s", e)
            return False


@app.command()
def compute(
    collection: str = typer.Option(
        None, "--collection", help="Name of collection to compute paths for"
    ),
) -> None:
    """Compute path matrix (pre-calculate paths)."""
    success = asyncio.run(compute_matrix_logic(collection))
    if not success:
        raise typer.Exit(code=1)
