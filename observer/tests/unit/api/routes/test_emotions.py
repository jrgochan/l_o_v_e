from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes.emotions import (
    get_all_emotions,
    get_categories,
    get_emotion_by_id,
    search_emotions,
)
from app.models.emotion_definition import EmotionDefinition


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    # FIX: db.execute(...) returns a coroutine, which returns a Result object (MagicMock)
    mock_db.execute.return_value = MagicMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.scalar = AsyncMock()
    return mock_db


@pytest.fixture
def mock_emotion():
    return EmotionDefinition(
        id=uuid4(),
        emotion_name="Test Emotion",
        category="Test Category",
        definition="Test Definition",
        vac_vector=[0.1, 0.2, 0.3],
        q_constant=[1.0, 0.0, 0.0, 0.0],
        color_hint="#123456",
    )


# -----------------------------------------------------------------------------
# GET /emotions
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_all_emotions_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result

    # 1. No filter
    response = await get_all_emotions(category=None, collection_id=None, db=mock_db)
    assert response["total_count"] == 1
    assert response["emotions"][0]["name"] == "Test Emotion"

    # 2. With filter
    await get_all_emotions(category="Test Category", collection_id=None, db=mock_db)
    # Verification of call args would confirm filtering logic


@pytest.mark.asyncio
async def test_get_all_emotions_with_collection_id(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result

    cid = uuid4()
    await get_all_emotions(collection_id=cid, db=mock_db)

    # Verify we didn't check for default collection
    mock_db.scalar.assert_not_called()

    # Verify execute was called (filtering happens in query construction, hard to verify exact SQL without integration test,
    # but coverage will show line hit)


@pytest.mark.asyncio
async def test_get_all_emotions_default_collection(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result

    # Mock default collection found
    default_coll = MagicMock()
    default_coll.id = uuid4()
    mock_db.scalar.return_value = default_coll

    await get_all_emotions(collection_id=None, db=mock_db)

    # Verify scalar called to find default
    mock_db.scalar.assert_called_once()

    # Verify execute called
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_get_all_emotions_no_default_collection(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result

    # Mock default collection NOT found
    mock_db.scalar.return_value = None

    # Call with no ID
    await get_all_emotions(collection_id=None, db=mock_db)

    # Scalar called
    mock_db.scalar.assert_called_once()

    # Should still execute search (just without collection filter)
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_get_all_emotions_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_all_emotions(collection_id=None, db=mock_db)
    assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /categories
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_categories_success(mock_db):
    mock_result = MagicMock()
    # Mock return of [(category, count)]
    mock_result.all.return_value = [("Cat1", 10), ("Cat2", 5)]
    mock_db.execute.return_value = mock_result

    response = await get_categories(db=mock_db)
    assert response["total_categories"] == 2
    assert response["categories"][0]["name"] == "Cat1"
    assert response["categories"][0]["emotion_count"] == 10


@pytest.mark.asyncio
async def test_get_categories_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_categories(db=mock_db)
    assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /emotions/{id}
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_emotion_by_id_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result

    response = await get_emotion_by_id(str(mock_emotion.id), db=mock_db)
    assert response["name"] == "Test Emotion"


@pytest.mark.asyncio
async def test_get_emotion_by_id_not_found(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await get_emotion_by_id(str(uuid4()), db=mock_db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_emotion_by_id_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_emotion_by_id(str(uuid4()), db=mock_db)
    assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /search
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_emotions_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result

    response = await search_emotions(query="test", db=mock_db)
    assert response["result_count"] == 1
    assert response["emotions"][0]["name"] == "Test Emotion"


@pytest.mark.asyncio
async def test_search_emotions_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await search_emotions(query="test", db=mock_db)
    assert exc.value.status_code == 500


# Removed moved tests
