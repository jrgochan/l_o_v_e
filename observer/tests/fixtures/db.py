"""Database fixtures."""

from typing import AsyncGenerator
from unittest.mock import patch

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.database as app_database_module
import app.db_init as app_db_init_module
from app.core.settings import settings
from app.database import get_db
from app.main import app as fastapi_app


@pytest.fixture
async def test_engine():
    """Create test database engine (uses same PostgreSQL container)."""
    # Use same database but with separate schema or careful cleanup

    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,  # Quieter for tests
        poolclass=NullPool,  # No connection pooling for tests
    )

    yield engine

    await engine.dispose()


@pytest.fixture
async def test_db(
    test_engine,
) -> AsyncGenerator[AsyncSession, None]:  # pylint: disable=redefined-outer-name
    """Provide a test database session.

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


@pytest.fixture(autouse=True)
async def cleanup_test_data(request):
    """Automatically clean up test data before and after each test.

    Runs before and after every test function.
    Skipped for unit tests to avoid DB connection.
    """
    if "unit" in request.node.keywords:
        yield
        return

    _test_db = request.getfixturevalue("test_db")

    async def _cleanup():
        # Delete in correct order to avoid FK violations

        # Child tables first
        await _test_db.execute(text("DELETE FROM emotion_relationships"))
        await _test_db.execute(text("DELETE FROM detected_emotions"))
        await _test_db.execute(text("DELETE FROM multi_emotion_analyses"))
        await _test_db.execute(text("DELETE FROM emotion_goals"))

        await _test_db.execute(text("DELETE FROM strategy_attempts"))
        await _test_db.execute(text("DELETE FROM journey_waypoints"))
        await _test_db.execute(text("DELETE FROM user_journeys"))
        await _test_db.execute(text("DELETE FROM category_transitions"))
        await _test_db.execute(text("DELETE FROM user_trajectory"))
        # Deleting cache tables that reference atlas
        await _test_db.execute(text("DELETE FROM path_matrix_cache"))

        # Chat tables
        await _test_db.execute(text("DELETE FROM session_analytics"))
        await _test_db.execute(
            text("DELETE FROM alert_acknowledgments")
        )  # Depends on clinical_alerts
        await _test_db.execute(text("DELETE FROM clinical_notes"))  # Depends on users + sessions
        await _test_db.execute(text("DELETE FROM clinical_alerts"))  # New
        await _test_db.execute(text("DELETE FROM chat_messages"))
        await _test_db.execute(text("DELETE FROM chat_sessions"))

        # New Feature Tables
        await _test_db.execute(text("DELETE FROM consent_records"))  # New
        await _test_db.execute(text("DELETE FROM audit_log"))  # New

        # Parent tables last
        await _test_db.execute(text("DELETE FROM emotion_definitions"))
        await _test_db.execute(text("DELETE FROM emotion_collections"))
        await _test_db.execute(text("DELETE FROM users"))
        await _test_db.commit()

    # Cleanup before test
    try:
        await _cleanup()
    except Exception as e:  # pylint: disable=broad-exception-caught
        print(f"Cleanup failed: {e}")
        await _test_db.rollback()

    yield  # Test runs here

    # Cleanup after test
    try:
        await _cleanup()
    except Exception as e:  # pylint: disable=broad-exception-caught
        print(f"Cleanup failed: {e}")
        await _test_db.rollback()


@pytest.fixture(autouse=True)
async def override_db(request):
    """Override FastAPI get_db dependency to use the test database session.

    Skipped for unit tests.
    """
    if "unit" in request.node.keywords:
        yield
        return

    _test_db = request.getfixturevalue("test_db")
    _test_engine = request.getfixturevalue("test_engine")

    # Avoid circular import by importing inside fixture if possible or lazy
    # But here we need app.main
    # If app.main imports settings which imports env...

    fastapi_app.dependency_overrides[get_db] = lambda: _test_db

    # Patch the global engine so init_db uses the test engine (correct loop)
    with (
        patch.object(app_database_module, "engine", _test_engine),
        patch.object(app_db_init_module, "engine", _test_engine),
    ):
        yield

    fastapi_app.dependency_overrides.clear()
