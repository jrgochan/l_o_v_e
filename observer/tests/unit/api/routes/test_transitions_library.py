"""Tests for POST /strategies/for-transition endpoint and _find_nearest_emotion helper.

Covers library.py lines 109-141 (endpoint body) and 154-158 (helper).
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes.transitions.library import (
    TransitionStrategyRequest,
    _find_nearest_emotion,
    get_strategies_for_transition,
)
from app.models.emotion_definition import EmotionDefinition


@pytest.fixture
def mock_db():
    return AsyncMock()


# ── _find_nearest_emotion ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_find_nearest_emotion_returns_match(mock_db):
    """Lines 154-158: returns the closest EmotionDefinition."""
    emotion = MagicMock(spec=EmotionDefinition, emotion_name="Joy")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = emotion
    mock_db.execute.return_value = mock_result

    result = await _find_nearest_emotion(mock_db, [0.8, 0.3, 0.6])

    assert result == emotion
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_find_nearest_emotion_returns_none(mock_db):
    """Lines 154-158: returns None when no emotions in DB."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await _find_nearest_emotion(mock_db, [0.0, 0.0, 0.0])

    assert result is None


# ── get_strategies_for_transition endpoint ───────────────────────────────


@pytest.mark.asyncio
async def test_for_transition_success(mock_db):
    """Lines 109-135: happy path — emotions found, strategies returned."""
    request = TransitionStrategyRequest(
        from_vac=[0.2, 0.8, -0.4],
        to_vac=[0.5, 0.1, 0.5],
        user_id=uuid4(),
        limit=3,
    )

    from_e = MagicMock(spec=EmotionDefinition, emotion_name="Anxiety")
    to_e = MagicMock(spec=EmotionDefinition, emotion_name="Calm")
    strategies = [{"name": "Deep Breathing", "match_reason": "pattern"}]

    with (
        patch(
            "app.api.routes.transitions.library._find_nearest_emotion",
            new_callable=AsyncMock,
            side_effect=[from_e, to_e],
        ),
        patch("app.api.routes.transitions.library.StrategyRecommender") as MockRecommender,
    ):
        mock_instance = AsyncMock()
        mock_instance.get_strategies_for_transition.return_value = strategies
        MockRecommender.return_value = mock_instance

        result = await get_strategies_for_transition(request, mock_db)

    assert result["from_emotion"] == "Anxiety"
    assert result["to_emotion"] == "Calm"
    assert result["strategies"] == strategies
    assert result["count"] == 1


@pytest.mark.asyncio
async def test_for_transition_no_user_id(mock_db):
    """Line 122: user_id is None path."""
    request = TransitionStrategyRequest(
        from_vac=[0.0, 0.0, 0.0],
        to_vac=[1.0, 1.0, 1.0],
    )

    from_e = MagicMock(spec=EmotionDefinition, emotion_name="Neutral")
    to_e = MagicMock(spec=EmotionDefinition, emotion_name="Ecstatic")

    with (
        patch(
            "app.api.routes.transitions.library._find_nearest_emotion",
            new_callable=AsyncMock,
            side_effect=[from_e, to_e],
        ),
        patch("app.api.routes.transitions.library.StrategyRecommender") as MockRecommender,
    ):
        mock_instance = AsyncMock()
        mock_instance.get_strategies_for_transition.return_value = []
        MockRecommender.return_value = mock_instance

        result = await get_strategies_for_transition(request, mock_db)

        # Verify user_id=None was passed through
        call_kwargs = mock_instance.get_strategies_for_transition.call_args.kwargs
        assert call_kwargs["user_id"] is None

    assert result["count"] == 0


@pytest.mark.asyncio
async def test_for_transition_emotion_not_found(mock_db):
    """Lines 114-118: raises 404 when no matching emotion exists."""
    request = TransitionStrategyRequest(
        from_vac=[0.0, 0.0, 0.0],
        to_vac=[1.0, 1.0, 1.0],
    )

    with patch(
        "app.api.routes.transitions.library._find_nearest_emotion",
        new_callable=AsyncMock,
        side_effect=[None, None],  # Both return None
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_strategies_for_transition(request, mock_db)

        assert exc_info.value.status_code == 404
        assert "Could not find matching emotions" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_for_transition_unexpected_error(mock_db):
    """Lines 139-141: unexpected exception becomes 500."""
    request = TransitionStrategyRequest(
        from_vac=[0.0, 0.0, 0.0],
        to_vac=[1.0, 1.0, 1.0],
    )

    with patch(
        "app.api.routes.transitions.library._find_nearest_emotion",
        new_callable=AsyncMock,
        side_effect=RuntimeError("DB connection lost"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_strategies_for_transition(request, mock_db)

        assert exc_info.value.status_code == 500
        assert "Strategy lookup failed" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_for_transition_reraises_http_exception(mock_db):
    """Lines 137-138: HTTPException is re-raised, not wrapped in 500."""
    request = TransitionStrategyRequest(
        from_vac=[0.0, 0.0, 0.0],
        to_vac=[1.0, 1.0, 1.0],
    )

    from_e = MagicMock(spec=EmotionDefinition, emotion_name="A")
    to_e = MagicMock(spec=EmotionDefinition, emotion_name="B")

    with (
        patch(
            "app.api.routes.transitions.library._find_nearest_emotion",
            new_callable=AsyncMock,
            side_effect=[from_e, to_e],
        ),
        patch("app.api.routes.transitions.library.StrategyRecommender") as MockRecommender,
    ):
        mock_instance = AsyncMock()
        mock_instance.get_strategies_for_transition.side_effect = HTTPException(
            status_code=429, detail="Rate limited"
        )
        MockRecommender.return_value = mock_instance

        with pytest.raises(HTTPException) as exc_info:
            await get_strategies_for_transition(request, mock_db)

        # Should preserve the original 429, not wrap as 500
        assert exc_info.value.status_code == 429
