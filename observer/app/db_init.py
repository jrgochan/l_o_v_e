"""Database initialization module.

Moves init_db here to avoid cyclic imports between app.database and app.models.
"""

import logging

from app.core.settings import settings
from app.database import Base, engine

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Initialize database on application startup.

    Creates all tables defined in models.

    Note: In production, use Alembic migrations instead.
    """
    logger.info("Initializing database connection...")

    try:
        # Test connection
        async with engine.begin() as conn:
            # Import all models to register them with Base
            # pylint: disable=unused-import, import-outside-toplevel
            from app.models import chat_message  # noqa: F401
            from app.models import chat_session  # noqa: F401
            from app.models import clinical_alert  # noqa: F401
            from app.models import emotion_definition  # noqa: F401
            from app.models import session_analytics  # noqa: F401
            from app.models import user_trajectory  # noqa: F401

            # Create tables (development only)
            if settings.DEBUG:
                logger.warning("DEBUG mode: Creating tables if not exist")
                await conn.run_sync(Base.metadata.create_all)

        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database: %s", e)
        raise
