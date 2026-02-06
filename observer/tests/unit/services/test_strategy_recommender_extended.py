from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import (
    PatternStrategy,
    StrategyAttempt,
    TransitionPattern,
    TransitionStrategy,
)
from app.services.strategy_recommender import StrategyRecommender


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def recommender(mock_session):
    return StrategyRecommender(mock_session)


@pytest.fixture
def emotions():
    from_e = MagicMock(spec=EmotionDefinition)
    from_e.category = "Anxiety"
    from_e.vac_vector = [0, 0.8, -0.4]

    to_e = MagicMock(spec=EmotionDefinition)
    to_e.category = "Calm"
    to_e.vac_vector = [0.4, 0.0, 0.5]

    return from_e, to_e


@pytest.mark.asyncio
async def test_match_pattern_scoring_branches(recommender, mock_session, emotions):
    """Test detailed VAC scoring logic in _match_to_pattern."""
    from_e, to_e = emotions

    # Setup patterns with different characteristics
    p1 = MagicMock(spec=TransitionPattern)
    p1.from_category = "Anxiety"
    p1.vac_change_characteristics = {
        "valence_change": "increase",  # +1.0
        "arousal_change": "major_decrease",  # +2.5
        "connection_change": "increase",  # +2.0
    }

    p2 = MagicMock(spec=TransitionPattern)
    p2.from_category = "Other"  # No match

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [p1, p2]
    mock_session.execute.return_value = mock_result

    match = await recommender._match_to_pattern(from_e, to_e)
    assert match == p1

    # cover other scoring branches
    # Test "decrease" valence, "decrease" arousal, "major_increase" connection
    p3 = MagicMock(spec=TransitionPattern)
    p3.from_category = "Anxiety"  # Match
    p3.vac_change_characteristics = {
        "valence_change": "decrease",
        "arousal_change": "decrease",  # -0.8 < -0.3 -> +2.0
        "connection_change": "major_increase",  # +0.9 > 0.6 -> +2.5
    }

    mock_result.scalars.return_value.all.return_value = [p3]
    match3 = await recommender._match_to_pattern(from_e, to_e)
    assert match3 == p3


@pytest.mark.asyncio
async def test_get_pattern_strategies_with_user_history(recommender, mock_session):
    """Test retrieving strategies with user personalization."""
    pattern = MagicMock(spec=TransitionPattern)
    pattern.id = uuid4()

    # Strategy mocks
    strat = MagicMock(spec=TransitionStrategy)
    strat.id = str(uuid4())
    strat.to_dict.return_value = {"id": strat.id, "name": "Deep Breath"}

    p_strat = MagicMock(spec=PatternStrategy)
    p_strat.effectiveness_rating = 4.5

    # DB Result for strategies
    mock_result_strats = MagicMock()
    mock_result_strats.all.return_value = [(strat, p_strat)]

    # DB Result for user history
    attempt = MagicMock(spec=StrategyAttempt)
    attempt.helpful_rating = 5
    attempt.user_notes = "Great"

    mock_result_hist = MagicMock()
    mock_result_hist.scalars.return_value.all.return_value = [attempt]

    # Configure execute side effects
    # First call: strategies, Second call: user history
    mock_session.execute.side_effect = [mock_result_strats, mock_result_hist]

    strategies = await recommender._get_pattern_strategies(pattern, "user1", 5)

    assert len(strategies) == 1
    assert strategies[0]["times_successful_for_user"] == 1
    assert strategies[0]["effectiveness_rating"] == 4.5


@pytest.mark.asyncio
async def test_get_strategies_by_type_coverage(recommender, mock_session):
    """Cover get_strategies_by_type."""
    strat = MagicMock(spec=TransitionStrategy)
    strat.to_dict.return_value = {"name": "Test"}

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [strat]
    mock_session.execute.return_value = mock_result

    res = await recommender.get_strategies_by_type("somatic")
    assert len(res) == 1
    assert res[0]["name"] == "Test"


@pytest.mark.asyncio
async def test_get_user_strategy_data_empty(recommender, mock_session):
    """Test _get_user_strategy_data with no history."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    data = await recommender._get_user_strategy_data("s1", "u1")
    assert data["times_tried"] == 0
    assert data["avg_rating"] is None


@pytest.mark.asyncio
async def test_get_strategies_for_transition_pattern_match(recommender):
    """Test full flow when pattern matches."""
    # Mock internal methods to avoid complex DB setup
    with (
        patch.object(recommender, "_match_to_pattern", new_callable=AsyncMock) as mock_match,
        patch.object(recommender, "_get_pattern_strategies", new_callable=AsyncMock) as mock_strat,
    ):

        mock_match.return_value = MagicMock(spec=TransitionPattern, pattern_name="Pattern")
        mock_strat.return_value = [{"name": "Strat"}]

        res = await recommender.get_strategies_for_transition(
            MagicMock(), MagicMock(), user_id="u1"
        )

        assert len(res) == 1
        mock_match.assert_called()
        mock_strat.assert_called()
