"""Emotion fixtures."""

import uuid
from typing import List

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tests.test_data import (
    COMPASSION_VAC,
    GRIEF_VAC,
    JOY_VAC,
    NEUTRAL_VAC,
    PITY_VAC,
    SHAME_VAC,
    TEST_EMOTIONS,
)

from app.models.emotion_definition import EmotionCollection, EmotionDefinition


@pytest.fixture
def sample_vac_vectors():
    """Provide sample VAC vectors for testing."""
    return {
        "joy": JOY_VAC,
        "shame": SHAME_VAC,
        "compassion": COMPASSION_VAC,
        "pity": PITY_VAC,
        "grief": GRIEF_VAC,
        "neutral": NEUTRAL_VAC,
    }


@pytest.fixture
async def seeded_test_atlas(test_db: AsyncSession) -> List[EmotionDefinition]:
    """Seed test database with essential emotions.

    Uses get-or-create pattern to avoid unique constraint violations.
    """
    test_emotions = []

    # Ensure a collection exists
    stmt = select(EmotionCollection).where(EmotionCollection.name == "Test Collection")
    col_res = await test_db.execute(stmt)
    collection = col_res.scalar_one_or_none()

    if not collection:
        collection = EmotionCollection(id=uuid.uuid4(), name="Test Collection", is_default=True)
        test_db.add(collection)
        await test_db.flush()

    for emotion_name, emotion_data in TEST_EMOTIONS.items():
        # Check if already exists in this collection
        stmt_def = select(EmotionDefinition).where(
            EmotionDefinition.emotion_name == emotion_name,
            EmotionDefinition.collection_id == collection.id,
        )
        result = await test_db.execute(stmt_def)
        existing = result.scalar_one_or_none()

        if existing:
            test_emotions.append(existing)
            continue

        atlas_entry = EmotionDefinition(
            id=uuid.uuid4(),
            collection_id=collection.id,
            emotion_name=emotion_name,
            category=emotion_data["category"],
            definition=emotion_data["definition"],
            vac_vector=emotion_data["vac"],
            q_constant=[0.5, 0.5, 0.5, 0.5],  # Dummy quaternion for tests
            semantic_embedding=[0.0] * 384,  # Dummy embedding
            haptic_pattern_id=emotion_data["haptic"],
        )
        test_db.add(atlas_entry)
        test_emotions.append(atlas_entry)

    await test_db.commit()
    return test_emotions
