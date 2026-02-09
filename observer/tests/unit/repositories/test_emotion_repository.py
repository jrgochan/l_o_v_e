from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.repositories.emotions import EmotionRepository


@pytest.mark.asyncio
async def test_get_by_name():
    """Test retrieving an emotion by name."""
    mock_session = AsyncMock()
    repo = EmotionRepository(mock_session)

    # Mock result
    mock_emotion = MagicMock(spec=EmotionDefinition)
    mock_emotion.emotion_name = "Joy"

    # Setup execute result
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_emotion
    mock_session.execute.return_value = mock_result

    result = await repo.get_by_name("Joy")

    assert result == mock_emotion


@pytest.mark.asyncio
async def test_find_nearest_neighbors():
    """Test find_nearest_neighbors logic."""
    mock_session = AsyncMock()
    repo = EmotionRepository(mock_session)

    mock_emotion = MagicMock(spec=EmotionDefinition)
    mock_emotion.emotion_name = "Joy"

    # Repo returns (EmotionDefinition, distance)
    mock_row = (mock_emotion, 0.1)

    mock_result = MagicMock()
    mock_result.all.return_value = [mock_row]
    mock_session.execute.return_value = mock_result

    # Call
    results = await repo.find_nearest_neighbors(vector=[0.1, 0.2, 0.3], vector_type="vac", limit=5)

    assert len(results) == 1
    assert results[0][0] == mock_emotion
    assert results[0][1] == 0.1

    assert mock_session.execute.called
