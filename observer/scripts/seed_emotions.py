"""
Emotion Seeding Script - Populates emotion definitions for a specific collection.

This script:
1. Loads emotion data from a JSON file
2. Gets or creates the specified Emotion Collection
3. Generates semantic embeddings for each emotion
4. Calculates quaternions via Versor API
5. Bulk inserts into emotion_definitions table

Usage:
    python scripts/seed_emotions.py --file data/atlas/emotions.json --collection "Atlas of the Heart"
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select, text

from app.database import AsyncSessionLocal
from app.models.emotion_definition import EmotionCollection, EmotionDefinition
from app.services import get_embedding_service, get_quaternion_builder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_emotions_data(file_path: str) -> list:
    """
    Load emotions from JSON data file with validation.

    Args:
        file_path: Path to the JSON file

    Returns:
        List of emotion dictionaries
    """
    json_path = Path(file_path)

    if not json_path.exists():
        # Try relative to project root if not found
        project_root = Path(__file__).parent.parent
        json_path = project_root / file_path

        if not json_path.exists():
            raise FileNotFoundError(f"Emotions data file not found: {file_path}")

    # Load JSON
    with open(json_path, "r") as f:
        data = json.load(f)

    # Basic validation
    if "emotions" not in data or not isinstance(data["emotions"], list):
        raise ValueError("Invalid JSON: missing 'emotions' array")

    # Validate each emotion has required fields
    for idx, emotion in enumerate(data["emotions"]):
        required = ["emotion_name", "category", "definition", "vac"]
        missing = [f for f in required if f not in emotion]
        if missing:
            raise ValueError(f"Emotion {idx}: missing required fields: {missing}")

        # Validate VAC coordinates
        vac = emotion["vac"]
        if not isinstance(vac, list) or len(vac) != 3:
            raise ValueError(f"Emotion {emotion['emotion_name']}: VAC must be array of 3 numbers")

    logger.info(f"✓ Validated {len(data['emotions'])} emotions from {json_path}")
    return data["emotions"]


def load_category_motion_map(file_path: str) -> dict:
    """Load category motion types from sibling categories.json file."""
    emotions_path = Path(file_path)
    categories_path = emotions_path.parent / "categories.json"

    if not categories_path.exists():
        logger.warning(f"No categories.json found at {categories_path}, using defaults")
        return {}

    try:
        with open(categories_path, "r") as f:
            data = json.load(f)

        mapping = {}
        for cat in data.get("categories", []):
            if "motion_type" in cat:
                mapping[cat["name"]] = cat["motion_type"]

        logger.info(f"✓ Loaded {len(mapping)} category motion mappings")
        return mapping
    except Exception as e:
        logger.warning(f"Failed to load categories.json: {e}")
        return {}


async def get_or_create_collection(
    session,
    name: str,
    create_if_missing: bool = False,
    is_active: bool = True,
    is_default: bool = False,
) -> Optional[EmotionCollection]:
    """Get emotion collection by name or create if requested."""
    stmt = select(EmotionCollection).where(EmotionCollection.name == name)
    result = await session.execute(stmt)
    collection = result.scalar_one_or_none()

    if collection:
        logger.info(f"Found existing collection: '{name}' (ID: {collection.id})")
        # Update active status if needed
        if collection.is_active != is_active:
            collection.is_active = is_active
            await session.commit()
            logger.info(f"Updated collection status to is_active={is_active}")
        return collection

    if create_if_missing:
        logger.info(
            f"Creating new collection: '{name}' (Active: {is_active}, Default: {is_default})"
        )
        collection = EmotionCollection(name=name, is_active=is_active, is_default=is_default)
        session.add(collection)
        await session.commit()
        await session.refresh(collection)
        return collection

    if collection and is_default:
        # If updating existing to be default
        if not collection.is_default:
            collection.is_default = True
            await session.commit()
            logger.info("Updated collection to be default")

    return None


async def seed_emotions(
    file_path: str,
    collection_name: str,
    create_collection: bool = False,
    force_reseed: bool = False,
    is_active: bool = True,
    is_default: bool = False,
):
    """Main seeding function."""
    logger.info("=" * 60)
    logger.info("EMOTION SEEDING SCRIPT")
    logger.info("=" * 60)
    logger.info(f"File: {file_path}")
    logger.info(f"Collection: {collection_name}")

    # Load data first
    try:
        emotions_data = load_emotions_data(file_path)
    except Exception as e:
        logger.error(f"Failed to load data: {e}")
        return False

    # Load category mapping
    category_map = load_category_motion_map(file_path)

    # Initialize services
    try:
        logger.info("Initializing services...")
        embedding_service = get_embedding_service()
        quaternion_builder = get_quaternion_builder()
        logger.info("✓ Services initialized")
    except Exception as e:
        logger.error(f"✗ Failed to initialize services: {e}")
        return False

    # Database operations
    async with AsyncSessionLocal() as session:
        try:
            # 1. Get/Create Collection
            collection = await get_or_create_collection(
                session,
                collection_name,
                create_collection,
                is_active=is_active,
                is_default=is_default,
            )

            if not collection:
                logger.error(
                    f"Collection '{collection_name}' not found. Use --create-collection to create it."
                )
                return False

            # 2. Check existing emotions in this collection
            stmt = select(EmotionDefinition).where(EmotionDefinition.collection_id == collection.id)
            result = await session.execute(stmt)
            existing = result.scalars().all()

            if existing:
                logger.warning(
                    f"⚠ Collection '{collection_name}' already contains {len(existing)} emotions"
                )

                if force_reseed:
                    logger.info("Force reseed enabled - clearing existing data for this collection")
                else:
                    response = input(f"Clear and re-seed '{collection_name}'? (yes/no): ")
                    if response.lower() != "yes":
                        logger.info("Aborted by user")
                        return False

                # Delete existing for THIS collection (cleaning up dependencies)

                # 1. Clear path matrix cache
                await session.execute(
                    text(
                        "DELETE FROM path_matrix_cache WHERE from_emotion_id IN (SELECT id FROM emotion_definitions WHERE collection_id = :coll_id) OR to_emotion_id IN (SELECT id FROM emotion_definitions WHERE collection_id = :coll_id)"
                    ),
                    {"coll_id": collection.id},
                )

                # 2. Clear Emotion Goals (delete as they depend on specific emotion)
                await session.execute(
                    text(
                        "DELETE FROM emotion_goals WHERE goal_emotion_id IN (SELECT id FROM emotion_definitions WHERE collection_id = :coll_id)"
                    ),
                    {"coll_id": collection.id},
                )

                # 3. Nullify Detected Emotions references
                await session.execute(
                    text(
                        "UPDATE detected_emotions SET emotion_id = NULL WHERE emotion_id IN (SELECT id FROM emotion_definitions WHERE collection_id = :coll_id)"
                    ),
                    {"coll_id": collection.id},
                )

                # 4. Nullify Chat Message references
                await session.execute(
                    text(
                        "UPDATE chat_messages SET emotion_id = NULL WHERE emotion_id IN (SELECT id FROM emotion_definitions WHERE collection_id = :coll_id)"
                    ),
                    {"coll_id": collection.id},
                )

                # 5. Delete emotions
                await session.execute(
                    delete(EmotionDefinition).where(
                        EmotionDefinition.collection_id == collection.id
                    )
                )
                await session.commit()
                logger.info("✓ Cleared existing emotions")

            # 3. Process each emotion
            seeded_count = 0
            for idx, emotion in enumerate(emotions_data, 1):
                try:
                    logger.info(
                        f"[{idx}/{len(emotions_data)}] Processing: {emotion['emotion_name']}"
                    )

                    # Generate embedding
                    text_for_embedding = f"{emotion['emotion_name']}: {emotion['definition']}"
                    embedding = await embedding_service.generate_embedding(text_for_embedding)

                    # Calculate quaternion
                    quaternion = await quaternion_builder.from_vac(emotion["vac"])

                    # Build extended vector from JSON if present
                    ext = emotion.get("extended")
                    extended_vec = None
                    if ext and isinstance(ext, dict):
                        extended_vec = [
                            ext.get("depth", 0.0),
                            ext.get("coping", 0.0),
                            ext.get("velocity", 0.0),
                            ext.get("novelty", 0.0),
                        ]

                    # Create database entry
                    emotion_entry = EmotionDefinition(
                        collection_id=collection.id,
                        emotion_name=emotion["emotion_name"],
                        category=emotion["category"],
                        definition=emotion["definition"],
                        vac_vector=emotion["vac"],
                        q_constant=quaternion,
                        semantic_embedding=embedding,
                        extended_vector=extended_vec,
                        haptic_pattern_id=emotion.get("haptic_pattern_id"),
                        color_hint=emotion.get("color_hint"),
                        movement_pattern=emotion.get("movement_pattern")
                        or category_map.get(emotion["category"]),
                    )

                    session.add(emotion_entry)
                    seeded_count += 1

                except Exception as e:
                    logger.error(f"  ✗ Failed: {e}")
                    continue

            # Commit all
            await session.commit()
            logger.info("")
            logger.info("=" * 60)
            logger.info(
                f"✓ Successfully seeded {seeded_count}/{len(emotions_data)} emotions into '{collection_name}'"
            )
            logger.info("=" * 60)
            return True

        except Exception as e:
            logger.error(f"✗ Seeding failed: {e}")
            await session.rollback()
            return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed emotions into a collection")
    parser.add_argument(
        "--file",
        type=str,
        default="data/brene_brown/emotions.json",
        help="Path to JSON data file",
    )
    parser.add_argument(
        "--collection", type=str, default="brene_brown", help="Name of the collection"
    )
    parser.add_argument(
        "--create-collection",
        action="store_true",
        help="Create collection if it does not exist",
    )
    parser.add_argument(
        "--force-reseed",
        action="store_true",
        help="Clear existing data without prompting",
    )

    parser.add_argument(
        "--inactive",
        action="store_true",
        help="Seed collection as inactive (not enabled by default)",
    )
    parser.add_argument("--default", action="store_true", help="Set as default collection")

    args = parser.parse_args()

    success = asyncio.run(
        seed_emotions(
            file_path=args.file,
            collection_name=args.collection,
            create_collection=args.create_collection,
            force_reseed=args.force_reseed,
            is_active=not args.inactive,
            is_default=args.default,
        )
    )
    sys.exit(0 if success else 1)
