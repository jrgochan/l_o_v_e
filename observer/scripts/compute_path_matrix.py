#!/usr/bin/env python3
"""
Path Matrix Pre-Computation Script

Pre-computes all 87×87 = 7,569 emotion-to-emotion transition paths and caches them
in the database for instant API responses.

Usage:
    python scripts/compute_path_matrix.py
    python scripts/compute_path_matrix.py --max-parallel 10

Benefits:
    - API responses: seconds → milliseconds
    - Production-ready performance from day 1
    - Background computation with progress tracking

Note: This can take 30-60 minutes depending on system performance.
Run after seeding Atlas emotions.
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging
import uuid

from app.database import AsyncSessionLocal
from app.services.matrix.service import PathMatrixService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def compute_matrix(collection_name: str = None):
    """
    Compute all paths in the matrix for the specified collection.

    Note: Parallelization is built into PathMatrixService.
    """
    logger.info("=" * 70)
    logger.info("PATH MATRIX PRE-COMPUTATION")
    logger.info("=" * 70)
    logger.info(f"Collection: {collection_name}")
    logger.info(f"Computing emotion transition paths")
    logger.info(f"Estimated time: 15-30 minutes")
    logger.info("")

    start_time = datetime.now()

    async with AsyncSessionLocal() as session:
        # Get collection ID first
        if collection_name:
            from sqlalchemy import select

            from app.models.emotion_definition import EmotionCollection

            stmt = select(EmotionCollection).where(EmotionCollection.name == collection_name)
            result = await session.execute(stmt)
            collection = result.scalar_one_or_none()

            if not collection:
                logger.error(f"Collection '{collection_name}' not found!")
                return False

            collection_id = str(collection.id)
            logger.info(f"Resolved collection ID: {collection_id}")
        else:
            collection_id = None
            logger.warning(
                "No collection specified - computing for ALL emotions (mixed collections!)"
            )

        service = PathMatrixService(session)

        try:
            # Create a computation job
            job_id = uuid.uuid4()
            logger.info(f"Creating computation job: {job_id}")
            logger.info("Starting matrix computation...")
            logger.info("Progress will be logged as paths complete")
            logger.info("")

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
                f"Duration: {duration.total_seconds():.1f} seconds ({duration.total_seconds()/60:.1f} min)"
            )
            logger.info(f"Paths computed: {result.get('completed_paths', 0)}")
            logger.info(f"Paths failed: {result.get('failed_paths', 0)}")
            logger.info(f"Total paths: {result.get('total_paths', 0)}")
            logger.info("")

            if result.get("failed_paths", 0) > 0:
                logger.warning(f"Some paths failed - check logs for details")
                return False
            else:
                logger.info("✅ All paths computed successfully!")
                logger.info("API responses will now be milliseconds instead of seconds")
                return True

        except Exception as e:
            logger.error(f"❌ Matrix computation failed: {e}")
            import traceback

            traceback.print_exc()
            return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Pre-compute path matrix")
    parser.add_argument("--collection", type=str, help="Name of collection to compute paths for")

    args = parser.parse_args()

    try:
        success = asyncio.run(compute_matrix(args.collection))
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Fatal error: {e}")
        sys.exit(1)
