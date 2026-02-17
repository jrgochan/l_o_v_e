from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.events import DomainEvent
from app.models.audit_log import AuditLog
from app.services.audit_subscriber import audit_log_handler


@pytest.mark.asyncio
async def test_audit_log_handler_success():
    """Test successful audit log persistence."""
    event = DomainEvent(
        event_type="test.event",
        actor_id=uuid4(),
        target_id=uuid4(),
        metadata={"key": "value"},
        ip_address="127.0.0.1",
        timestamp=datetime.now(timezone.utc),
    )

    # Mock the database session context manager
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()

    # AsyncSessionLocal() returns a context manager whose __aenter__ returns the session
    mock_db_ctx = AsyncMock()
    mock_db_ctx.__aenter__.return_value = mock_session
    mock_db_ctx.__aexit__.return_value = None

    with patch("app.services.audit_subscriber.AsyncSessionLocal", return_value=mock_db_ctx):
        await audit_log_handler(event)

        # Verify AuditLog creation and persistence
        mock_session.add.assert_called_once()
        entry = mock_session.add.call_args[0][0]
        assert isinstance(entry, AuditLog)
        assert entry.event_type == "test.event"
        assert entry.actor_id == event.actor_id
        assert entry.target_id == event.target_id
        # Note: metadata is stored as metadata_ in the model, but initialised as...
        # Wait, the model init might be different or SQLAlchemy handles it.
        # Let's check the call args to be sure passed correctly.
        # In the code: entry = AuditLog(..., metadata_=event.metadata, ...)
        # So we can check entry.metadata_ if it's a model instance.

        mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_audit_log_handler_exception():
    """Test exception handling (rollback and log)."""
    event = DomainEvent(event_type="test.fail")

    # Mock session to raise exception on commit
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=Exception("DB Error"))
    mock_session.rollback = AsyncMock()

    mock_db_ctx = AsyncMock()
    mock_db_ctx.__aenter__.return_value = mock_session

    with patch("app.services.audit_subscriber.AsyncSessionLocal", return_value=mock_db_ctx):
        with patch("app.services.audit_subscriber.logger") as mock_logger:
            await audit_log_handler(event)

            mock_session.commit.assert_awaited_once()
            mock_session.rollback.assert_awaited_once()
            mock_logger.exception.assert_called_once()
