"""
Shared pytest fixtures for Observer module tests.
Provides database sessions, test data, and mocks.
"""

import pytest
import asyncio
from typing import AsyncGenerator, List
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
import uuid

from app.database import Base
from app.models.atlas_definition import AtlasDefinition
from app.models.user_trajectory import UserTrajectory
from app.models.user_trajectory import UserTrajectory
from app.models.user import User
from tests.test_data import TEST_EMOTIONS


# ============================================================================
# DATABASE FIXTURES
# ============================================================================




@pytest.fixture
async def test_engine():
    """Create test database engine (uses same PostgreSQL container)"""
    
    # Use same database but with separate schema or careful cleanup
    from app.config import settings
    
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,  # Quieter for tests
        poolclass=NullPool,  # No connection pooling for tests
    )
    
    yield engine
    
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a test database session.
    Wraps everything in a transaction that is rolled back after the test.
    """
    connection = await test_engine.connect()
    transaction = await connection.begin()
    
    async_session = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session
        await session.close()
    
    await transaction.rollback()
    await connection.close()


@pytest.fixture
async def seeded_test_atlas(test_db: AsyncSession) -> List[AtlasDefinition]:
    """
    Seed test database with essential emotions.
    Uses get-or-create pattern to avoid unique constraint violations.
    """
    test_emotions = []
    from sqlalchemy import select
    
    for emotion_name, emotion_data in TEST_EMOTIONS.items():
        # Check if already exists
        stmt = select(AtlasDefinition).where(AtlasDefinition.emotion_name == emotion_name)
        result = await test_db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            test_emotions.append(existing)
            continue
            
        atlas_entry = AtlasDefinition(
            id=uuid.uuid4(),
            emotion_name=emotion_name,
            category=emotion_data["category"],
            definition=emotion_data["definition"],
            vac_vector=emotion_data["vac"],
            q_constant=[0.5, 0.5, 0.5, 0.5],  # Dummy quaternion for tests
            semantic_embedding=[0.0] * 384,  # Dummy embedding
            haptic_pattern_id=emotion_data["haptic"]
        )
        test_db.add(atlas_entry)
        test_emotions.append(atlas_entry)
    
    await test_db.commit()
    return test_emotions


@pytest.fixture
async def seeded_test_user(test_db: AsyncSession, test_user_id) -> User:
    """Seed test database with a user."""
    from sqlalchemy import select
    
    # Check if already exists
    stmt = select(User).where(User.id == test_user_id)
    result = await test_db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing
        
    user = User(
        id=test_user_id,
        email="test@example.com",
        password_hash="dummy_hash",
        full_name="Test User",
        is_active=True
    )
    test_db.add(user)
    await test_db.commit()
    return user


# ============================================================================
# MOCK FIXTURES
# ============================================================================

@pytest.fixture
def mock_versor_response():
    """Mock Versor API response"""
    return {
        "current_state": {
            "w": 0.68,
            "x": 0.50,
            "y": 0.39,
            "z": 0.45
        },
        "transition_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
        "angular_distance_radians": 0.5,
        "elasticity_metric": 0.5,
        "is_flooding": False,
        "insight_code": "STABLE"
    }


@pytest.fixture
def mock_embedding():
    """Mock embedding vector (384 dimensions for all-MiniLM-L6-v2)"""
    return [0.01] * 384


# ============================================================================
# TEST DATA FIXTURES
# ============================================================================

@pytest.fixture
def sample_vac_vectors():
    """Provide sample VAC vectors for testing"""
    from tests.test_data import (
        JOY_VAC, SHAME_VAC, COMPASSION_VAC, PITY_VAC, GRIEF_VAC, NEUTRAL_VAC
    )
    return {
        "joy": JOY_VAC,
        "shame": SHAME_VAC,
        "compassion": COMPASSION_VAC,
        "pity": PITY_VAC,
        "grief": GRIEF_VAC,
        "neutral": NEUTRAL_VAC,
    }


@pytest.fixture
def test_user_id():
    """Provide consistent test user UUID"""
    return uuid.UUID("123e4567-e89b-12d3-a456-426614174000")


@pytest.fixture
def test_session_id():
    """Provide consistent test session UUID"""
    return uuid.UUID("789e0123-e89b-12d3-a456-426614174001")


# ============================================================================
# SERVICE FIXTURES
# ============================================================================

@pytest.fixture
def embedding_service():
    """Provide embedding service instance"""
    from app.services import get_embedding_service
    return get_embedding_service()


@pytest.fixture
def quaternion_builder():
    """Provide quaternion builder instance"""
    from app.services import get_quaternion_builder
    return get_quaternion_builder()


# ============================================================================
# CLEANUP FIXTURES
# ============================================================================

@pytest.fixture(autouse=True)
async def cleanup_test_data(test_db: AsyncSession):
    """
    Automatically clean up test data before and after each test.
    Runs before and after every test function.
    """
    async def _cleanup():
        # Delete in correct order to avoid FK violations
        from sqlalchemy import text
        # Child tables first
        await test_db.execute(text("DELETE FROM strategy_attempts"))
        await test_db.execute(text("DELETE FROM journey_waypoints"))
        await test_db.execute(text("DELETE FROM user_journeys"))
        await test_db.execute(text("DELETE FROM category_transitions"))
        await test_db.execute(text("DELETE FROM user_trajectory"))
        # Deleting cache tables that reference atlas
        await test_db.execute(text("DELETE FROM path_matrix_cache"))
        
        # Parent tables last
        await test_db.execute(text("DELETE FROM atlas_definitions"))
        await test_db.execute(text("DELETE FROM users"))
        await test_db.commit()

    # Cleanup before test
    try:
        await _cleanup()
    except Exception as e:
        print(f"Cleanup failed: {e}")
        await test_db.rollback()

    yield  # Test runs here
    
    # Cleanup after test
    try:
        await _cleanup()
    except Exception as e:
        print(f"Cleanup failed: {e}")
        await test_db.rollback()

@pytest.fixture(autouse=True)
async def override_db(test_db):
    """
    Override FastAPI get_db dependency to use the test database session.
    This ensures the app uses the function-scoped test engine/session
    instead of the global application engine (which binds to the wrong loop).
    """
    from app.main import app
    from app.database import get_db
    
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()
