from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.transition_strategy import UserJourney
from app.repositories.journeys import JourneyRepository


@pytest.fixture
def repo():
    session = AsyncMock()
    return JourneyRepository(session)


@pytest.mark.asyncio
async def test_get_active_journey(repo):
    """Test get_active_journey (lines 26-33)."""
    user_id = uuid4()

    # Mock result
    mock_journey = MagicMock(spec=UserJourney)
    mock_journey.status = "in_progress"

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_journey
    repo.session.execute.return_value = mock_result

    result = await repo.get_active_journey(user_id)

    assert result == mock_journey

    # Verify query construction (roughly)
    repo.session.execute.assert_called_once()
    # call_args[0][0] is the statement
    stmt = repo.session.execute.call_args[0][0]
    # Check if WHERE clauses present (string repr includes them)
    assert "WHERE" in str(stmt)
    assert "user_journeys.user_id" in str(stmt)
    assert "status" in str(stmt)


@pytest.mark.asyncio
async def test_get_active_journey_none(repo):
    """Test get_active_journey returns None if no active journey."""
    user_id = uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    repo.session.execute.return_value = mock_result

    result = await repo.get_active_journey(user_id)
    assert result is None
