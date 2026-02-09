from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.repositories.emotions import EmotionRepository


@pytest.fixture
def repo():
    session = AsyncMock()
    return EmotionRepository(session)


@pytest.mark.asyncio
async def test_get_by_name_with_collection(repo):
    """Test line 30: get_by_name with collection_id."""
    collection_id = uuid4()
    mock_emotion = MagicMock(spec=EmotionDefinition)

    # Mock result
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_emotion
    repo.session.execute.return_value = mock_result

    await repo.get_by_name("Joy", collection_id=collection_id)

    # Verify call
    repo.session.execute.assert_called_once()
    stmt = repo.session.execute.call_args[0][0]
    # Check for collection_id filter in statement (string repr)
    stmt_str = str(stmt)
    assert "WHERE" in stmt_str
    assert "collection_id" in stmt_str


@pytest.mark.asyncio
async def test_get_by_collection(repo):
    """Test lines 37-43: get_by_collection."""
    mock_emotions = [
        MagicMock(spec=EmotionDefinition),
        MagicMock(spec=EmotionDefinition),
    ]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_emotions
    repo.session.execute.return_value = mock_result

    result = await repo.get_by_collection("Daily")

    assert result == mock_emotions

    # Verify call
    repo.session.execute.assert_called_once()
    stmt = repo.session.execute.call_args[0][0]
    stmt_str = str(stmt)
    assert "JOIN" in stmt_str
    assert "emotion_collections" in stmt_str
    assert "name" in stmt_str


@pytest.mark.asyncio
async def test_find_nearest_neighbors_quaternion(repo):
    """Test lines 68-71: vector_type='quaternion'."""
    repo.find_nearest_neighbors

    mock_result = MagicMock()
    mock_result.all.return_value = []
    repo.session.execute.return_value = mock_result

    await repo.find_nearest_neighbors([0, 0, 0, 1], vector_type="quaternion")

    repo.session.execute.assert_called_once()
    # Ideally check if q_constant column used but harder to check on compiled string
    # Just ensuring it runs without error means it hit the elif block


@pytest.mark.asyncio
async def test_find_nearest_neighbors_semantic(repo):
    """Test lines 72-75: vector_type='semantic'."""
    mock_result = MagicMock()
    mock_result.all.return_value = []
    repo.session.execute.return_value = mock_result

    await repo.find_nearest_neighbors([0.1] * 384, vector_type="semantic")

    repo.session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_find_nearest_neighbors_invalid_type(repo):
    """Test lines 76-77: invalid vector_type raises ValueError."""
    with pytest.raises(ValueError, match="Invalid vector_type"):
        await repo.find_nearest_neighbors([], vector_type="invalid")
