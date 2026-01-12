"""
Atlas Seeding Script - Populates the 87 emotions from Atlas of the Heart.

This script:
1. Loads emotion data from canonical JSON file (data/atlas/emotions.json)
2. Generates semantic embeddings for each emotion
3. Calculates quaternions via Versor API
4. Bulk inserts into atlas_definitions table
5. Verifies HNSW indexes created

Usage:
    python scripts/seed_atlas.py
"""

import asyncio
import sys
import logging
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.atlas_definition import AtlasDefinition
from app.services import get_embedding_service, get_quaternion_builder
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_atlas_emotions() -> list:
    """
    Load Atlas emotions from canonical JSON data file with validation.
    
    Returns:
        List of emotion dictionaries with structure:
        {
            "emotion_name": str,
            "category": str,
            "definition": str,
            "vac": [float, float, float],
            "haptic_pattern_id": str
        }
    """
    json_path = Path(__file__).parent.parent / "data/atlas/emotions.json"
    
    if not json_path.exists():
        raise FileNotFoundError(
            f"Atlas emotions data file not found: {json_path}\n"
            f"Expected canonical data at: data/atlas/emotions.json"
        )
    
    # Load JSON
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Basic validation
    if 'emotions' not in data or not isinstance(data['emotions'], list):
        raise ValueError("Invalid emotions.json: missing 'emotions' array")
    
    if len(data['emotions']) != 87:
        raise ValueError(f"Invalid emotions.json: expected 87 emotions, found {len(data['emotions'])}")
    
    # Validate each emotion has required fields
    for idx, emotion in enumerate(data['emotions']):
        required = ['emotion_name', 'category', 'definition', 'vac']
        missing = [f for f in required if f not in emotion]
        if missing:
            raise ValueError(f"Emotion {idx}: missing required fields: {missing}")
        
        # Validate VAC coordinates
        vac = emotion['vac']
        if not isinstance(vac, list) or len(vac) != 3:
            raise ValueError(f"Emotion {emotion['emotion_name']}: VAC must be array of 3 numbers")
        
        if any(v < -1.0 or v > 1.0 for v in vac):
            raise ValueError(f"Emotion {emotion['emotion_name']}: VAC coordinates out of range [-1, 1]: {vac}")
    
    logger.info(f"✓ Validated {data['metadata']['total_emotions']} emotions from JSON")
    logger.info(f"Source: {data['source']}")
    logger.info(f"Version: {data['version']}")
    
    return data['emotions']


# Load emotions from JSON (replaces 640+ lines of hardcoded data)
try:
    ATLAS_EMOTIONS = load_atlas_emotions()
except FileNotFoundError as e:
    logger.error(str(e))
    logger.error("Cannot proceed without emotions data")
    sys.exit(1)


async def seed_atlas(force_reseed: bool = False):
    """Main seeding function.
    
    Args:
        force_reseed: If True, clear existing data without prompting
    """
    logger.info("=" * 60)
    logger.info("ATLAS SEEDING SCRIPT - L.O.V.E. Observer Module")
    logger.info("=" * 60)
    logger.info(f"Seeding {len(ATLAS_EMOTIONS)} emotions from Atlas of the Heart")
    logger.info(f"Embedding Provider: {settings.EMBEDDING_PROVIDER}")
    logger.info(f"Versor URL: {settings.VERSOR_URL}")
    if force_reseed:
        logger.info("Mode: FORCE RESEED (will clear existing data)")
    logger.info("")
    
    # Initialize services
    try:
        logger.info("Initializing services...")
        embedding_service = get_embedding_service()
        quaternion_builder = get_quaternion_builder()
        logger.info("✓ Services initialized")
    except Exception as e:
        logger.error(f"✗ Failed to initialize services: {e}")
        return False
    
    # Create database session
    async with AsyncSessionLocal() as session:
        try:
            # Check if already seeded
            from sqlalchemy import select, func, text
            result = await session.execute(
                select(func.count(AtlasDefinition.id))
            )
            existing_count = result.scalar()
            
            if existing_count > 0:
                logger.warning(f"⚠ Atlas already contains {existing_count} emotions")
                
                if force_reseed:
                    logger.info("Force reseed enabled - clearing existing data")
                else:
                    response = input("Clear and re-seed? (yes/no): ")
                    if response.lower() != 'yes':
                        logger.info("Aborted by user")
                        return False
                
                # Clear existing with CASCADE to clean up dependent tables
                await session.execute(text("DELETE FROM atlas_definitions CASCADE"))
                await session.commit()
                logger.info("✓ Cleared existing emotions (with CASCADE)")
            
            # Process each emotion
            seeded_count = 0
            for idx, emotion in enumerate(ATLAS_EMOTIONS, 1):
                try:
                    logger.info(f"[{idx}/{len(ATLAS_EMOTIONS)}] Processing: {emotion['emotion_name']}")
                    
                    # Generate embedding
                    text_for_embedding = f"{emotion['emotion_name']}: {emotion['definition']}"
                    embedding = await embedding_service.generate_embedding(text_for_embedding)
                    logger.info(f"  ✓ Generated embedding ({len(embedding)} dims)")
                    
                    # Calculate quaternion
                    quaternion = await quaternion_builder.from_vac(emotion['vac'])
                    logger.info(f"  ✓ Calculated quaternion: w={quaternion[0]:.3f}")
                    
                    # Create database entry
                    atlas_entry = AtlasDefinition(
                        emotion_name=emotion['emotion_name'],
                        category=emotion['category'],
                        definition=emotion['definition'],
                        vac_vector=emotion['vac'],
                        q_constant=quaternion,
                        semantic_embedding=embedding,
                        haptic_pattern_id=emotion.get('haptic_pattern_id')
                    )
                    
                    session.add(atlas_entry)
                    seeded_count += 1
                    logger.info(f"  ✓ Added to database")
                    
                except Exception as e:
                    logger.error(f"  ✗ Failed: {e}")
                    continue
            
            # Commit all
            await session.commit()
            logger.info("")
            logger.info("=" * 60)
            logger.info(f"✓ Successfully seeded {seeded_count}/{len(ATLAS_EMOTIONS)} emotions")
            logger.info("=" * 60)
            
            # Verify
            result = await session.execute(
                select(func.count(AtlasDefinition.id))
            )
            final_count = result.scalar()
            logger.info(f"Database now contains: {final_count} emotions")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Seeding failed: {e}")
            await session.rollback()
            return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed Atlas emotions from JSON")
    parser.add_argument('--force-reseed', action='store_true',
                       help='Clear existing data without prompting')
    
    args = parser.parse_args()
    
    success = asyncio.run(seed_atlas(force_reseed=args.force_reseed))
    sys.exit(0 if success else 1)
