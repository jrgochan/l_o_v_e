from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.recommendations import get_smart_recommendations


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.execute.return_value = MagicMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.scalar = AsyncMock()
    return mock_db


# -----------------------------------------------------------------------------
# GET /atlas/recommendations
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_smart_recommendations_success(mock_db):
    with patch("app.api.routes.recommendations.RecommendationEngine") as MockEngine:
        engine_instance = MockEngine.return_value
        engine_instance.get_recommendations = AsyncMock(return_value={"recs": []})

        response = await get_smart_recommendations(
            context="exploration",
            emotion_id=None,
            selected_ids=None,
            limit=5,
            db=mock_db,
        )
        assert response["recommendations"]["recs"] == []


@pytest.mark.asyncio
async def test_get_smart_recommendations_invalid_emotion_id(mock_db):
    # Patch RecommendationEngine to prevent side effects
    with patch("app.api.routes.recommendations.RecommendationEngine") as _:
        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(
                context="exploration", emotion_id="invalid-uuid", db=mock_db
            )
        assert exc.value.status_code == 400
        assert "Invalid emotion_id UUID" in exc.value.detail


@pytest.mark.asyncio
async def test_get_smart_recommendations_invalid_selected_ids(mock_db):
    # Patch RecommendationEngine to prevent side effects
    with patch("app.api.routes.recommendations.RecommendationEngine") as _:
        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(
                context="exploration",
                emotion_id=None,
                selected_ids="valid-uuid,invalid-uuid",
                db=mock_db,
            )
        assert exc.value.status_code == 400
        assert "Invalid selected_ids format" in exc.value.detail


@pytest.mark.asyncio
async def test_get_smart_recommendations_exception(mock_db):
    with patch("app.api.routes.recommendations.RecommendationEngine") as MockEngine:
        engine_instance = MockEngine.return_value
        engine_instance.get_recommendations.side_effect = Exception("Engine Error")

        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(db=mock_db)
        assert exc.value.status_code == 500
