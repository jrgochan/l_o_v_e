from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.repositories.emotions import EmotionRepository


@pytest.mark.asyncio
async def test_get_emotion_by_name():
    """Test retrieving an emotion by name."""
    mock_session = AsyncMock()
    repo = EmotionRepository(mock_session)

    # Mock result
    mock_emotion = MagicMock(spec=EmotionDefinition)
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"

    # Setup mock execution
    mock_result = MagicMock()
    # scalars().first()
    mock_result.scalars.return_value.first.return_value = mock_emotion
    mock_session.execute.return_value = mock_result

    # Execute
    result = await repo.get_by_name("Joy")

    # Verify
    assert result == mock_emotion
    assert result.emotion_name == "Joy"
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_find_nearest_neighbors():
    """Test vector search for nearest emotions."""
    mock_session = AsyncMock()
    repo = EmotionRepository(mock_session)

    # Mock result
    mock_emotion = MagicMock(spec=EmotionDefinition)
    mock_emotion.emotion_name = "Joy"

    # Setup mock execution for vector search
    mock_result = MagicMock()
    # Returns (emotion, distance) tuples
    mock_result.all.return_value = [(mock_emotion, 0.1)]
    mock_session.execute.return_value = mock_result

    # Execute
    input_vector = [0.1, 0.2, 0.3]
    results = await repo.find_nearest_neighbors(input_vector, limit=5)

    # Verify
    assert len(results) == 1
    assert results[0][0] == mock_emotion
    assert results[0][1] == 0.1
    mock_session.execute.assert_called_once()
