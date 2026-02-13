"""Tests for VAC-profile based strategy matching (Tier 2) and related helpers.

Targets the uncovered lines added by the strategy display feature:
- _vac_delta_to_strategy_types (all delta branches + fallback)
- _match_by_vac_profile (empty results, with personalization)
- _get_universal_strategies
- get_strategies_for_transition Tier 3 universal fallback path
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import TransitionStrategy
from app.services.recommendation.strategies import StrategyRecommender


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def recommender(mock_session):
    return StrategyRecommender(mock_session)


# ── _vac_delta_to_strategy_types ─────────────────────────────────────────


class TestVacDeltaToStrategyTypes:
    """Pure-logic tests for the static VAC→strategy-type mapper."""

    def test_arousal_decrease_returns_response_modulation(self):
        # Arousal drops by 0.5 (> 0.3 threshold)
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.8, 0.0], [0.0, 0.2, 0.0])
        assert "response_modulation" in result

    def test_valence_improvement_returns_cognitive_reappraisal(self):
        # Valence increases by 0.5
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.0, 0.0], [0.5, 0.0, 0.0])
        assert "cognitive_reappraisal" in result

    def test_connection_increase_returns_situation_modification(self):
        # Connection increases by 0.5
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.0, 0.0], [0.0, 0.0, 0.5])
        assert "situation_modification" in result

    def test_arousal_increase_returns_attentional_deployment(self):
        # Arousal increases by 0.5
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.0, 0.0], [0.0, 0.5, 0.0])
        assert "attentional_deployment" in result

    def test_no_significant_change_falls_back_to_attentional_deployment(self):
        # All deltas below 0.3 threshold
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.0, 0.0], [0.1, 0.1, 0.1])
        assert result == ["attentional_deployment"]

    def test_multiple_significant_shifts_returns_multiple_types(self):
        # Arousal decrease (-0.8) + valence increase (+0.5) + connection increase (+0.5)
        result = StrategyRecommender._vac_delta_to_strategy_types([0.0, 0.8, 0.0], [0.5, 0.0, 0.5])
        assert "response_modulation" in result
        assert "cognitive_reappraisal" in result
        assert "situation_modification" in result


# ── _match_by_vac_profile ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_match_by_vac_profile_returns_empty_when_no_db_strategies(
    recommender,
    mock_session,
):
    """Line 473: returns [] when DB query yields no strategies."""
    from_e = MagicMock(spec=EmotionDefinition)
    from_e.vac_vector = [0.0, 0.8, 0.0]
    to_e = MagicMock(spec=EmotionDefinition)
    to_e.vac_vector = [0.0, 0.2, 0.0]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    result = await recommender._match_by_vac_profile(from_e, to_e, None, 5)
    assert result == []


@pytest.mark.asyncio
async def test_match_by_vac_profile_without_user_id(
    recommender,
    mock_session,
):
    """Branch 479->483: strategies found but user_id is None, skips personalization."""
    from_e = MagicMock(spec=EmotionDefinition)
    from_e.vac_vector = [0.0, 0.8, 0.0]
    to_e = MagicMock(spec=EmotionDefinition)
    to_e.vac_vector = [0.0, 0.2, 0.0]

    strat = MagicMock(spec=TransitionStrategy)
    strat.id = uuid4()
    strat.to_dict.return_value = {"strategy_id": str(strat.id), "name": "PMR"}

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [strat]
    mock_session.execute.return_value = mock_result

    result = await recommender._match_by_vac_profile(from_e, to_e, None, 5)

    assert len(result) == 1
    assert result[0]["name"] == "PMR"
    assert result[0]["effectiveness_rating"] == 3.5
    assert "times_successful_for_user" not in result[0]


@pytest.mark.asyncio
async def test_match_by_vac_profile_with_user_personalization(
    recommender,
    mock_session,
):
    """Lines 480-482: personalisation branch when user_id is provided."""
    from_e = MagicMock(spec=EmotionDefinition)
    from_e.vac_vector = [0.0, 0.8, 0.0]
    to_e = MagicMock(spec=EmotionDefinition)
    to_e.vac_vector = [0.5, 0.1, 0.5]

    strat = MagicMock(spec=TransitionStrategy)
    strat.id = uuid4()
    strat.to_dict.return_value = {"strategy_id": str(strat.id), "name": "Breathing"}

    # Call 1: strategy query
    mock_result_strats = MagicMock()
    mock_result_strats.scalars.return_value.all.return_value = [strat]

    # Call 2: user history
    mock_result_hist = MagicMock()
    mock_result_hist.scalars.return_value.all.return_value = []  # no attempts

    mock_session.execute.side_effect = [mock_result_strats, mock_result_hist]

    result = await recommender._match_by_vac_profile(from_e, to_e, "user123", 5)

    assert len(result) == 1
    assert result[0]["times_successful_for_user"] == 0
    assert result[0]["effectiveness_rating"] == 3.5


# ── _get_universal_strategies ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_universal_strategies(recommender, mock_session):
    """Lines 525-538: covers the universal strategy query."""
    strat = MagicMock(spec=TransitionStrategy)
    strat.to_dict.return_value = {"name": "Grounding", "difficulty_level": 1}

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [strat]
    mock_session.execute.return_value = mock_result

    result = await recommender._get_universal_strategies(5)

    assert len(result) == 1
    assert result[0]["name"] == "Grounding"


# ── get_strategies_for_transition — Tier 3 fallback ──────────────────────


@pytest.mark.asyncio
async def test_full_fallback_to_universal_tier3(recommender):
    """Lines 264-268: both pattern and VAC-profile return nothing → universal."""
    with (
        patch.object(recommender, "_match_to_pattern", new_callable=AsyncMock) as mock_pattern,
        patch.object(recommender, "_match_by_vac_profile", new_callable=AsyncMock) as mock_vac,
        patch.object(
            recommender, "_get_universal_strategies", new_callable=AsyncMock
        ) as mock_universal,
    ):
        mock_pattern.return_value = None  # Tier 1: no match
        mock_vac.return_value = []  # Tier 2: no match
        mock_universal.return_value = [{"name": "Deep Breathing"}]  # Tier 3

        result = await recommender.get_strategies_for_transition(
            MagicMock(spec=EmotionDefinition, emotion_name="A"),
            MagicMock(spec=EmotionDefinition, emotion_name="B"),
        )

        assert len(result) == 1
        assert result[0]["match_reason"] == "universal"
        mock_universal.assert_called_once()


@pytest.mark.asyncio
async def test_tier2_vac_profile_sets_match_reason(recommender):
    """Tier 2 path sets match_reason = 'vac_profile'."""
    with (
        patch.object(recommender, "_match_to_pattern", new_callable=AsyncMock) as mock_pattern,
        patch.object(recommender, "_match_by_vac_profile", new_callable=AsyncMock) as mock_vac,
    ):
        mock_pattern.return_value = None
        mock_vac.return_value = [{"name": "PMR"}]

        result = await recommender.get_strategies_for_transition(
            MagicMock(spec=EmotionDefinition, emotion_name="X"),
            MagicMock(spec=EmotionDefinition, emotion_name="Y"),
        )

        assert result[0]["match_reason"] == "vac_profile"
