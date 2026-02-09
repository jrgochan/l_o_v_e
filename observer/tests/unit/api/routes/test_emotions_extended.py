from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes import emotions


@pytest.fixture(autouse=True)
def mock_logger():
    with patch("app.api.routes.emotions.logger", new_callable=MagicMock) as mock_logger:
        yield mock_logger


@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.delete = MagicMock()
    return session


@pytest.mark.asyncio
async def test_get_all_emotions_failure(mock_db):
    """Test 500 error when fetching emotions fails."""
    mock_db.execute.side_effect = Exception("DB Error")

    with pytest.raises(HTTPException) as exc:
        await emotions.get_all_emotions(category=None, db=mock_db)

    assert exc.value.status_code == 500
    assert "DB Error" in exc.value.detail


@pytest.mark.asyncio
async def test_get_categories_failure(mock_db):
    """Test 500 error when fetching categories fails."""
    mock_db.execute.side_effect = Exception("Query Failed")

    with pytest.raises(HTTPException) as exc:
        await emotions.get_categories(db=mock_db)

    assert exc.value.status_code == 500
    assert "Query Failed" in exc.value.detail


@pytest.mark.asyncio
async def test_get_emotion_by_id_not_found(mock_db):
    """Test 404 when emotion ID does not exist."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = result

    with pytest.raises(HTTPException) as exc:
        await emotions.get_emotion_by_id(str(uuid4()), db=mock_db)

    assert exc.value.status_code == 404
    assert "Emotion not found" in exc.value.detail


@pytest.mark.asyncio
async def test_get_emotion_by_id_failure(mock_db):
    """Test 500 error when fetching emotion details fails."""
    mock_db.execute.side_effect = Exception("Lookup Error")

    with pytest.raises(HTTPException) as exc:
        await emotions.get_emotion_by_id(str(uuid4()), db=mock_db)

    assert exc.value.status_code == 500
    assert "Lookup Error" in exc.value.detail


@pytest.mark.asyncio
async def test_search_emotions_failure(mock_db):
    """Test 500 error when search fails."""
    mock_db.execute.side_effect = Exception("Search Error")

    with pytest.raises(HTTPException) as exc:
        await emotions.search_emotions(query="joy", db=mock_db)

    assert exc.value.status_code == 500
    assert "Search Error" in exc.value.detail
