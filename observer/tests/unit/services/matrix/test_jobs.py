from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.matrix.jobs import JobManager


@pytest.fixture
def mock_session():
    s = AsyncMock()
    s.execute = AsyncMock()
    return s


@pytest.fixture
def manager(mock_session):
    return JobManager(mock_session)


@pytest.mark.asyncio
async def test_create_job(manager, mock_session):
    job_id = await manager.create_job(100, "user1")
    assert job_id
    mock_session.execute.assert_awaited()
    # Check params
    args = mock_session.execute.call_args
    assert args[0][1]["total"] == 100
    assert args[0][1]["user_id"] == "user1"


@pytest.mark.asyncio
async def test_update_job_status(manager, mock_session):
    job_id = uuid4()
    await manager.update_job_status(job_id, "completed", 100, 100, 0)
    mock_session.execute.assert_awaited()
    args = mock_session.execute.call_args
    assert args[0][1]["status"] == "completed"


@pytest.mark.asyncio
async def test_get_job_status(manager, mock_session):
    job_id = uuid4()

    # Mock result row
    mock_result = MagicMock()
    # status, total, completed, failed, created, completed_at, error
    row = ("completed", 100, 100, 0, datetime.now(), datetime.now(), None)
    mock_result.fetchone.return_value = row
    mock_session.execute.return_value = mock_result

    status = await manager.get_job_status(job_id)
    assert status["status"] == "completed"
    assert status["total"] == 100


@pytest.mark.asyncio
async def test_get_job_status_none(manager, mock_session):
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_session.execute.return_value = mock_result

    status = await manager.get_job_status(uuid4())
    assert status is None
