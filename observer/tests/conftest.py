"""
Shared pytest fixtures for Observer module tests.
Provides database sessions, test data, and mocks.
"""

import uuid
from typing import AsyncGenerator, List

try:
    import nest_asyncio

    nest_asyncio.apply()
except ImportError:
    pass

# import nest_asyncio
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.models.emotion_definition import EmotionCollection, EmotionDefinition
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
async def seeded_test_atlas(test_db: AsyncSession) -> List[EmotionDefinition]:
    """
    Seed test database with essential emotions.
    Uses get-or-create pattern to avoid unique constraint violations.
    """
    test_emotions = []
    from sqlalchemy import select

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
        stmt = select(EmotionDefinition).where(
            EmotionDefinition.emotion_name == emotion_name,
            EmotionDefinition.collection_id == collection.id,
        )
        result = await test_db.execute(stmt)
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
        is_active=True,
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
        "current_state": {"w": 0.68, "x": 0.50, "y": 0.39, "z": 0.45},
        "transition_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
        "angular_distance_radians": 0.5,
        "elasticity_metric": 0.5,
        "is_flooding": False,
        "insight_code": "STABLE",
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
    from tests.test_data import COMPASSION_VAC, GRIEF_VAC, JOY_VAC, NEUTRAL_VAC, PITY_VAC, SHAME_VAC

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
async def cleanup_test_data(request):
    """
    Automatically clean up test data before and after each test.
    Runs before and after every test function.
    Skipped for unit tests to avoid DB connection.
    """
    if "unit" in request.node.keywords:
        yield
        return

    test_db = request.getfixturevalue("test_db")

    async def _cleanup():
        # Delete in correct order to avoid FK violations
        from sqlalchemy import text

        # Child tables first
        await test_db.execute(text("DELETE FROM emotion_relationships"))
        await test_db.execute(text("DELETE FROM detected_emotions"))
        await test_db.execute(text("DELETE FROM multi_emotion_analyses"))
        await test_db.execute(text("DELETE FROM emotion_goals"))

        await test_db.execute(text("DELETE FROM strategy_attempts"))
        await test_db.execute(text("DELETE FROM journey_waypoints"))
        await test_db.execute(text("DELETE FROM user_journeys"))
        await test_db.execute(text("DELETE FROM category_transitions"))
        await test_db.execute(text("DELETE FROM user_trajectory"))
        # Deleting cache tables that reference atlas
        await test_db.execute(text("DELETE FROM path_matrix_cache"))

        # Chat tables
        await test_db.execute(text("DELETE FROM session_analytics"))
        await test_db.execute(text("DELETE FROM chat_messages"))
        await test_db.execute(text("DELETE FROM chat_sessions"))

        # Parent tables last
        await test_db.execute(text("DELETE FROM emotion_definitions"))
        await test_db.execute(text("DELETE FROM emotion_collections"))
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
async def override_db(request):
    """
    Override FastAPI get_db dependency to use the test database session.
    Skipped for unit tests.
    """
    if "unit" in request.node.keywords:
        yield
        return

    test_db = request.getfixturevalue("test_db")
    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
async def override_auth(request):
    """
    Mock authentication for all tests.
    Skipped for unit tests (they should mock dependencies directly).
    """
    if "unit" in request.node.keywords:
        yield
        return

    seeded_test_user = request.getfixturevalue("seeded_test_user")
    from app.api.deps import get_current_user, get_current_user_ws
    from app.main import app

    # Override both HTTP and WebSocket auth
    app.dependency_overrides[get_current_user] = lambda: seeded_test_user
    app.dependency_overrides[get_current_user_ws] = lambda: seeded_test_user

    yield

    # No need to manual clear here if override_db or others clear,
    # but good practice to clear specific keys if we want to be safe,
    # or rely on the final yield to clear everything.
    # Note: override_db clears everything at the end of its yield?
    # Actually override_db does app.dependency_overrides.clear() at the end.
    # Since fixtures are stack-like, we should be careful.
    # Safest is just to let them be.
