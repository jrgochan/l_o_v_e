import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.routes.bootstrap import (
    ContextRecommendationsParams,
    get_all_bootstrap_data,
    get_challenge_patterns,
    get_context_recommendations,
    get_path_templates,
    get_strategy_effectiveness,
)


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db


@pytest.mark.asyncio
async def test_get_strategy_effectiveness_error(mock_db):
    """Test database error handling for strategy effectiveness."""
    mock_db.execute.side_effect = Exception("DB Error")

    with pytest.raises(HTTPException) as exc:
        await get_strategy_effectiveness(mock_db)
    assert exc.value.status_code == 500
    assert "DB Error" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_get_path_templates_not_found(mock_db):
    """Test 404 when no path templates found."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await get_path_templates(db=mock_db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_path_templates_to_emotion_filter(mock_db):
    """Test filtering by to_emotion."""
    templates = [
        {"from_emotion": "Anxiety", "to_emotion": "Calm"},
        {"from_emotion": "Anxiety", "to_emotion": "Peace"},
    ]
    mock_rows = [[json.dumps(t)] for t in templates]

    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result

    resp = await get_path_templates(
        from_emotion=None, to_emotion="Calm", max_difficulty=None, db=mock_db
    )
    assert resp["filtered_count"] == 1
    assert resp["templates"][0]["to_emotion"] == "Calm"


@pytest.mark.asyncio
async def test_get_path_templates_error(mock_db):
    """Test error handling for path templates."""
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_path_templates(
            from_emotion=None, to_emotion=None, max_difficulty=None, db=mock_db
        )
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_get_context_recommendations_not_found(mock_db):
    """Test 404 when no context modifiers found."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_db.execute.return_value = mock_result

    params = ContextRecommendationsParams(
        time_of_day=None,
        energy_level=None,
        location=None,
        available_time=None,
        experience_level=None,
    )
    with pytest.raises(HTTPException) as exc:
        await get_context_recommendations(db=mock_db, params=params)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_context_recommendations_extra_filters(mock_db):
    """Test location, available_time, and experience_level filtering."""
    modifiers = [
        {
            "modifier_type": "location",
            "modifier_value": {"work": {"recommended_strategies": ["Deep Breath"]}},
        },
        {
            "modifier_type": "available_time",
            "modifier_value": {"5_minutes": {"recommended_strategies": ["Quick Scan"]}},
        },
        {
            "modifier_type": "experience_level",
            "modifier_value": {"beginner": {"recommended_strategies": ["Basic Grounding"]}},
        },
    ]
    mock_rows = [[json.dumps(m)] for m in modifiers]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result

    params = ContextRecommendationsParams(
        time_of_day=None,
        energy_level=None,
        location="work",
        available_time="5_minutes",
        experience_level="beginner",
    )
    resp = await get_context_recommendations(db=mock_db, params=params)

    recs = resp["recommendations"]["recommended_strategies"]
    assert "Deep Breath" in recs
    assert "Quick Scan" in recs
    assert "Basic Grounding" in recs


@pytest.mark.asyncio
async def test_get_context_recommendations_error(mock_db):
    """Test error handling for context recommendations."""
    mock_db.execute.side_effect = Exception("DB Fail")

    params = ContextRecommendationsParams(
        time_of_day=None,
        energy_level=None,
        location=None,
        available_time=None,
        experience_level=None,
    )
    with pytest.raises(HTTPException) as exc:
        await get_context_recommendations(db=mock_db, params=params)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_get_challenge_patterns_not_found(mock_db):
    """Test 404 when no patterns found."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await get_challenge_patterns(challenge_name=None, db=mock_db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_challenge_patterns_error(mock_db):
    """Test error handling for challenge patterns."""
    mock_db.execute.side_effect = Exception("DB Fail")
    with pytest.raises(HTTPException) as exc:
        await get_challenge_patterns(challenge_name=None, db=mock_db)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_get_all_bootstrap_data_not_found(mock_db):
    """Test 404 when overall bootstrap data is empty."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await get_all_bootstrap_data(db=mock_db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_all_bootstrap_data_error(mock_db):
    """Test error handling for bulk data."""
    mock_db.execute.side_effect = Exception("DB Fail")
    with pytest.raises(HTTPException) as exc:
        await get_all_bootstrap_data(db=mock_db)
    assert exc.value.status_code == 500
