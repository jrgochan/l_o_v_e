from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import (
    PatternStrategy,
    StrategyAttempt,
    TransitionPattern,
    TransitionStrategy,
)
from app.services.recommendation.strategies import StrategyRecommender


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def recommender(mock_session):
    return StrategyRecommender(mock_session)


@pytest.fixture
def sample_emotions():
    from_e = EmotionDefinition(
        emotion_name="Anxiety",
        category="When Things Are Uncertain",
        vac_vector=[0.2, 0.8, -0.4],  # High arousal, neg connection
    )
    to_e = EmotionDefinition(
        emotion_name="Calm",
        category="When Life Is Good",
        vac_vector=[0.5, 0.1, 0.5],  # Low arousal, pos connection
    )
    return from_e, to_e


@pytest.fixture
def mock_patterns():
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="anxiety_regulation",
        from_category="When Things Are Uncertain",
        to_category="When Life Is Good",
        vac_change_characteristics={
            "arousal_change": "major_decrease",
            "connection_change": "increase",
            "valence_change": "increase",
        },
    )
    return [pattern]


@pytest.mark.asyncio
async def test_match_to_pattern_success(recommender, mock_session, sample_emotions, mock_patterns):
    """Test standard pattern matching logic."""
    from_e, to_e = sample_emotions

    # Mock database returning patterns
    result_mock = MagicMock()
    result_mock.scalars().all.return_value = mock_patterns
    mock_session.execute.return_value = result_mock

    match = await recommender._match_to_pattern(from_e, to_e)

    assert match is not None
    assert match.pattern_name == "anxiety_regulation"


@pytest.mark.asyncio
async def test_get_strategies_for_transition_with_match(
    recommender, mock_session, sample_emotions, mock_patterns
):
    """Test full flow: match pattern -> get strategies."""
    from_e, to_e = sample_emotions

    # 1. Match Pattern (returns mock_patterns)
    # 2. Get Strategies for Pattern
    #    returns [(strategy, pattern_strategy)]

    strategy = TransitionStrategy(id=uuid4(), strategy_name="Deep Breathing", difficulty_level=1)
    p_strategy = PatternStrategy(effectiveness_rating=4.5)

    # Mock execute results
    # Call 1: _match_to_pattern -> select(TransitionPattern)
    res_patterns = MagicMock()
    res_patterns.scalars().all.return_value = mock_patterns

    # Call 2: _get_pattern_strategies -> select(Strategy, PStrategy)
    res_strategies = MagicMock()
    res_strategies.all.return_value = [(strategy, p_strategy)]

    mock_session.execute.side_effect = [res_patterns, res_strategies]

    strategies = await recommender.get_strategies_for_transition(from_e, to_e)

    assert len(strategies) == 1
    assert strategies[0]["name"] == "Deep Breathing"
    assert strategies[0]["effectiveness_rating"] == 4.5


@pytest.mark.asyncio
async def test_fallback_to_universal(recommender, mock_session, sample_emotions):
    """Test fallback when no pattern matches."""
    from_e, to_e = sample_emotions

    # 1. Match Pattern -> returns empty list
    res_patterns = MagicMock()
    res_patterns.scalars().all.return_value = []

    # 2. Universal Strategies -> returns list of strategies
    univ_strategy = TransitionStrategy(id=uuid4(), strategy_name="Universal", difficulty_level=1)
    res_universal = MagicMock()
    res_universal.scalars().all.return_value = [univ_strategy]

    mock_session.execute.side_effect = [res_patterns, res_universal]

    strategies = await recommender.get_strategies_for_transition(from_e, to_e)

    assert len(strategies) == 1
    assert strategies[0]["name"] == "Universal"


@pytest.mark.asyncio
async def test_personalization(recommender, mock_session, sample_emotions, mock_patterns):
    """Test strategy personalization with user history."""
    from_e, to_e = sample_emotions
    user_id = "test_user"

    strategy = TransitionStrategy(id=uuid4(), strategy_name="Test Strat", difficulty_level=2)
    p_strategy = PatternStrategy(effectiveness_rating=4.0)

    attempt = StrategyAttempt(helpful_rating=5, user_notes="Great!")

    # Call sequence:
    # 1. Patterns
    res_patterns = MagicMock()
    res_patterns.scalars().all.return_value = mock_patterns

    # 2. Strategies
    res_strategies = MagicMock()
    res_strategies.all.return_value = [(strategy, p_strategy)]

    # 3. User Data (_get_user_strategy_data)
    res_attempts = MagicMock()
    res_attempts.scalars().all.return_value = [attempt]

    mock_session.execute.side_effect = [res_patterns, res_strategies, res_attempts]

    results = await recommender.get_strategies_for_transition(from_e, to_e, user_id=user_id)

    s = results[0]
    assert s["times_successful_for_user"] == 1
    assert s["user_notes"] == ["Great!"]


@pytest.mark.asyncio
async def test_get_simple_lookups(recommender, mock_session):
    """Test get_strategies_by_type and get_strategy_by_id."""
    strategy = TransitionStrategy(
        id=uuid4(),
        strategy_name="Test",
        strategy_type="cognitive_reappraisal",
        difficulty_level=3,
    )

    # 1. By Type
    res_type = MagicMock()
    res_type.scalars().all.return_value = [strategy]

    # 2. By ID
    res_id = MagicMock()
    res_id.scalar_one_or_none.return_value = strategy

    mock_session.execute.side_effect = [res_type, res_id]

    # Test By Type
    by_type = await recommender.get_strategies_by_type("cognitive_reappraisal")
    assert len(by_type) == 1
    assert by_type[0]["type"] == "cognitive_reappraisal"

    # Test By ID
    by_id = await recommender.get_strategy_by_id(str(strategy.id))
    assert by_id["name"] == "Test"


@pytest.mark.asyncio
async def test_match_pattern_complex_conditions(recommender, mock_session):
    """Test various VAC condition branches."""
    # Pattern expecting major connection increase and valence decrease
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="complex_pattern",
        from_category="A",
        to_category="B",
        vac_change_characteristics={
            "valence_change": "decrease",
            "connection_change": "major_increase",
            "arousal_change": "increase",
        },
    )

    # Transition: +Valence, -Arousal, +Connection
    from_e = EmotionDefinition(vac_vector=[0.5, 0.5, 0.0], category="A", emotion_name="E1")
    to_e = EmotionDefinition(vac_vector=[0.1, 0.9, 0.8], category="B", emotion_name="E2")
    # Change:
    # V: -0.4 (Decrease) -> Matches
    # A: +0.4 (Increase) -> Matches activation (>0.3)
    # C: +0.8 (Major Increase) -> Matches major (>0.6)

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [pattern]
    mock_session.execute.return_value = mock_result

    match = await recommender._match_to_pattern(from_e, to_e)
    assert match is not None
    assert match.pattern_name == "complex_pattern"


@pytest.mark.asyncio
async def test_personalization_no_history(
    recommender, mock_session, sample_emotions, mock_patterns
):
    """Test personalization implicitly handles no history."""
    # Same setup as personalization but return empty attempts
    from_e, to_e = sample_emotions
    strategy = TransitionStrategy(id=uuid4(), strategy_name="Test", difficulty_level=1)
    p_strategy = PatternStrategy(effectiveness_rating=4.0)

    res_patterns = MagicMock()
    res_patterns.scalars().all.return_value = mock_patterns
    res_strategies = MagicMock()
    res_strategies.all.return_value = [(strategy, p_strategy)]
    res_attempts = MagicMock()  # Empty attempts
    res_attempts.scalars().all.return_value = []

    mock_session.execute.side_effect = [res_patterns, res_strategies, res_attempts]

    strategies = await recommender.get_strategies_for_transition(from_e, to_e, user_id="new_user")
    assert strategies[0]["times_successful_for_user"] == 0


@pytest.mark.asyncio
async def test_match_pattern_score_logic(recommender, mock_session):
    """Test that higher score wins (fixing logic bug) and cover edge branches."""
    # Pattern A: Weak match (only category)
    # Expects "increase" arousal, but we will give stable -> Hits 342 False branch (coverage)
    pattern_weak = TransitionPattern(
        id=uuid4(),
        pattern_name="weak",
        from_category="A",
        to_category="B",
        vac_change_characteristics={
            "arousal_change": "increase",  # We will provide stable
            "connection_change": "increase",  # We will provide increase
            "valence_change": "increase",  # We will provide increase
        },
    )

    # Pattern B: Strong match
    # Expects "major_increase" connection, we give major -> Hits 359 True
    # Also matches arousal -> Hits 342 True
    pattern_strong = TransitionPattern(
        id=uuid4(),
        pattern_name="strong",
        from_category="A",
        to_category="B",
        vac_change_characteristics={
            "arousal_change": "increase",
            "connection_change": "major_increase",
            "valence_change": "increase",
        },
    )

    # Transition: +V, +A (Small), +C (Major)
    from_e = EmotionDefinition(vac_vector=[0, 0, 0], category="A", emotion_name="E1")
    to_e = EmotionDefinition(vac_vector=[0.5, 0.4, 0.8], category="B", emotion_name="E2")
    # Changes: V=+0.5, A=+0.4 (Increase), C=+0.8 (Major Increase)

    # Wait, to hit 342 False branch for weak pattern:
    # Pattern Weak expects "increase" (>0.3).
    # If input A is +0.2 (stable), 342 is False.
    # So let's use input A=+0.2 everywhere?
    # But Strong pattern needs A increase match to be "Strong".
    # Let's verify logic.

    # Let's adjust inputs to split behavior.

    # weak_pattern: expects "increase" Arousal.
    # strong_pattern: expects "increase" Arousal.

    # Input Arousal change: 0.1 (Stable).
    # both match 342 False (miss expected increase). Score 0 for arousal.
    # weak matches connection "increase" (+0.8). Score += 2.0.
    # strong matches connection "major_increase" (+0.8). Score += 2.5.
    # Result: Strong has 2.5, Weak has 2.0.
    # Logic should pick Strong.
    # The bug (minimize) would pick Weak?

    # Wait, checking branches too.
    # 342->357 (Missing False).
    # If Arousal change is 0.1, and vac_char is "increase".
    # 342 check: `vac_char == "increase" and change > 0.3`.
    # "increase" == "increase" (True) AND 0.1 > 0.3 (False). -> False.
    # Jump to 357. Covered!

    # 359->370 (Missing False).
    # 359 check: `vac_char == "major_increase" and change > 0.6`.
    # We need a pattern that expects "major_increase" but gets small increase.
    # Let's add Pattern C: "Failed Major"
    # If input is +0.4.
    # 357 (increase check): False (pattern is not "increase").
    # 359 (major check): `major == major` (True) AND `0.4 > 0.6` (False). -> False.
    # Jump to 370. Covered!

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [pattern_weak, pattern_strong]
    mock_session.execute.return_value = mock_result

    # Case 1: Reproduce scoring bug (Strong vs Weak) with A=+0.4 (Match)
    # Changes: V=+0.5 (Match), A=+0.4 (Match both), C=+0.8 (Match Weak incr, Match Strong major)
    # Weak: V(1) + A(2) + C(2) = 5.0
    # Strong: V(1) + A(2) + C(2.5) = 5.5
    # If minimizing, it picks Weak (5.0). Expected: Strong (5.5).

    match = await recommender._match_to_pattern(from_e, to_e)
    assert match.pattern_name == "strong"


@pytest.mark.asyncio
async def test_match_pattern_359_miss_branch(recommender, mock_session):
    """Test specifically the 359 False branch."""
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="miss_major",
        from_category="A",
        to_category="B",
        vac_change_characteristics={"connection_change": "major_increase"},
    )
    # Input gives small increase +0.4.
    from_e = EmotionDefinition(vac_vector=[0, 0, 0], category="A", emotion_name="E1")
    to_e = EmotionDefinition(vac_vector=[0, 0, 0.4], category="B", emotion_name="E2")

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [pattern]
    mock_session.execute.return_value = mock_result

    mock_session.execute.return_value = mock_result

    match = await recommender._match_to_pattern(from_e, to_e)
    # Score should be 0 (no match). match is None.
    assert match is None


@pytest.mark.asyncio
async def test_match_pattern_category_mismatch(recommender, mock_session):
    """Test that patterns with non-matching categories are filtered."""
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="wrong_category",
        from_category="Other",
        to_category="Other",
        vac_change_characteristics={},
    )
    from_e = EmotionDefinition(vac_vector=[0, 0, 0], category="A", emotion_name="E1")
    to_e = EmotionDefinition(vac_vector=[0, 0, 0], category="B", emotion_name="E2")

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [pattern]
    mock_session.execute.return_value = mock_result

    match = await recommender._match_to_pattern(from_e, to_e)
    assert match is None


@pytest.mark.asyncio
async def test_match_pattern_major_decrease_miss(recommender, mock_session):
    """Test specifically the 340 False branch (major decrease miss)."""
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="miss_major_dec",
        from_category="A",
        to_category="B",
        vac_change_characteristics={"arousal_change": "major_decrease"},
    )
    # Input gives small decrease -0.4 (not < -0.6).
    from_e = EmotionDefinition(vac_vector=[0, 0.4, 0], category="A", emotion_name="E1")
    to_e = EmotionDefinition(vac_vector=[0, 0, 0], category="B", emotion_name="E2")

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [pattern]
    mock_session.execute.return_value = mock_result

    match = await recommender._match_to_pattern(from_e, to_e)
    assert match is None
