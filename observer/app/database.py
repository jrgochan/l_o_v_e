"""Database connection management and session factory.

Uses SQLAlchemy 2.0 async patterns with connection pooling.
"""

import logging
import uuid
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.settings import settings

logger = logging.getLogger(__name__)


def uuid_factory() -> uuid.UUID:
    """Generate a new UUID."""
    return uuid.uuid4()


# Create async engine with connection pooling
engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connection health before use
    pool_recycle=settings.DB_POOL_RECYCLE,  # Recycle connections after 1 hour
)

# Session factory
AsyncSessionLocal = async_sessionmaker(  # pylint: disable=invalid-name
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Declarative base for ORM models
class Base(DeclarativeBase):
    """Base class for all ORM models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for FastAPI routes.

    Yields a database session and ensures it's closed after use.

    Usage:
        @app.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Model))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error("Database session error: %s", e)
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connection on application shutdown."""
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")
