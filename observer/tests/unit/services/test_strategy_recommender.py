import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime
from app.services.strategy_recommender import StrategyRecommender
from app.models.atlas_definition import AtlasDefinition
from app.models.transition_strategy import TransitionPattern, TransitionStrategy, PatternStrategy, StrategyAttempt

@pytest.fixture
def mock_session():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def recommender(mock_session):
    return StrategyRecommender(mock_session)

@pytest.fixture
def transition_objects():
    anger = AtlasDefinition(
        id=uuid4(),
        emotion_name="Anger",
        vac_vector=[-0.6, 0.8, -0.4],
        category="Negative"
    )
    calm = AtlasDefinition(
        id=uuid4(),
        emotion_name="Calm",
        vac_vector=[0.4, 0.0, 0.5],
        category="Positive"
    )
    return anger, calm

@pytest.mark.asyncio
async def test_get_strategies_no_pattern_fallback(recommender, mock_session, transition_objects):
    anger, calm = transition_objects
    
    # Mock no patterns found
    # Mock universal strategies
    strat = TransitionStrategy(
        id=uuid4(), strategy_name="Breathing", difficulty_level=1, evidence_level="meta_analysis"
    )
    
    # First call: patterns (empty)
    mock_result_patterns = MagicMock()
    mock_result_patterns.scalars.return_value.all.return_value = []
    
    # Second call: universal strategies
    mock_result_universal = MagicMock()
    mock_result_universal.scalars.return_value.all.return_value = [strat]
    
    mock_session.execute.side_effect = [mock_result_patterns, mock_result_universal]
    
    strategies = await recommender.get_strategies_for_transition(anger, calm)
    
    assert len(strategies) == 1
    assert strategies[0]["name"] == "Breathing"
    assert strategies[0]["evidence_level"] == "meta_analysis"

@pytest.mark.asyncio
async def test_match_to_pattern_success(recommender, mock_session, transition_objects):
    anger, calm = transition_objects
    
    pattern = TransitionPattern(
        id=uuid4(),
        pattern_name="Anger Management",
        from_category="Negative",
        to_category="Positive",
        vac_change_characteristics={
            "valence_change": "increase",
            "arousal_change": "decrease",
            "connection_change": "increase"
        }
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [pattern]
    mock_session.execute.return_value = mock_result
    
    match = await recommender._match_to_pattern(anger, calm)
    assert match == pattern

@pytest.mark.asyncio
async def test_get_pattern_strategies_with_history(recommender, mock_session):
    pattern = TransitionPattern(id=uuid4())
    user_id = "user1"
    
    s1 = TransitionStrategy(id=uuid4(), strategy_name="S1")
    ps1 = PatternStrategy(strategy_id=s1.id, pattern_id=pattern.id, effectiveness_rating=4.5)
    
    mock_result_strats = MagicMock()
    mock_result_strats.all.return_value = [(s1, ps1)]
    
    mock_result_history = MagicMock()
    attempt = StrategyAttempt(helpful_rating=5, user_notes="Good")
    mock_result_history.scalars.return_value.all.return_value = [attempt]
    
    mock_session.execute.side_effect = [mock_result_strats, mock_result_history]
    
    strategies = await recommender._get_pattern_strategies(pattern, user_id, 5)
    
    assert len(strategies) == 1
    assert strategies[0]["times_successful_for_user"] == 1
    assert strategies[0]["effectiveness_rating"] == 4.5
    assert strategies[0]["user_notes"] == ["Good"]

@pytest.mark.asyncio
async def test_match_pattern_scoring_logic(recommender, mock_session, transition_objects):
    anger, calm = transition_objects
    
    p1 = TransitionPattern(
        from_category="Negative", to_category="Positive",
        vac_change_characteristics={}
    )
    
    p2 = TransitionPattern(
        from_category="Negative", to_category="Positive",
        vac_change_characteristics={"arousal_change": "decrease"}
    )
    
    # Explicitly use MagicMock for the result to avoid AsyncMock children issues
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [p1, p2]
    mock_session.execute.return_value = mock_result
    
    match = await recommender._match_to_pattern(anger, calm)
    assert match == p2

@pytest.mark.asyncio
async def test_get_strategies_by_type(recommender, mock_session):
    s = TransitionStrategy(id=uuid4(), strategy_type="CBT", strategy_name="Cognitive")
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [s]
    mock_session.execute.return_value = mock_result
    
    res = await recommender.get_strategies_by_type("CBT")
    assert len(res) == 1
    assert res[0]["strategy_id"] == str(s.id)

@pytest.mark.asyncio
async def test_get_strategy_by_id(recommender, mock_session):
    sid = str(uuid4())
    s = TransitionStrategy(id=uuid4(), strategy_name="Test")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = s
    mock_session.execute.return_value = mock_result
    
    res = await recommender.get_strategy_by_id(sid)
    assert res["name"] == "Test"
    
    mock_result.scalar_one_or_none.return_value = None
    res = await recommender.get_strategy_by_id(sid)
    assert res is None

@pytest.mark.asyncio
async def test_strategy_recommender_user_data_loop():
    mock_db = AsyncMock()
    recommender_svc = StrategyRecommender(mock_db)
    mock_strategy = MagicMock(spec=TransitionStrategy); mock_strategy.id = uuid4(); mock_strategy.to_dict.return_value = {"id": str(mock_strategy.id)}
    mock_pattern_strategy = MagicMock(spec=PatternStrategy); mock_pattern_strategy.effectiveness_rating = 4.5
    mock_result = MagicMock(); mock_result.all.return_value = [(mock_strategy, mock_pattern_strategy)]
    recommender_svc.session.execute.return_value = mock_result
    mock_pattern = MagicMock(); mock_pattern.id = uuid4()
    recommender_svc._get_user_strategy_data = AsyncMock(return_value={"times_tried": 5})
    result = await recommender_svc._get_pattern_strategies(mock_pattern, "user-123", 5)
    assert result[0]["times_successful_for_user"] == 5

@pytest.mark.asyncio
async def test_strategy_recommender_no_user_id():
    mock_db = AsyncMock()
    recommender_svc = StrategyRecommender(mock_db)
    mock_strategy = MagicMock(spec=TransitionStrategy); mock_strategy.id = uuid4(); mock_strategy.to_dict.return_value = {"id": str(mock_strategy.id)}
    mock_pattern_strategy = MagicMock(spec=PatternStrategy); mock_pattern_strategy.effectiveness_rating = 4.5
    mock_result = MagicMock(); mock_result.all.return_value = [(mock_strategy, mock_pattern_strategy)]
    recommender_svc.session.execute.return_value = mock_result
    mock_pattern = MagicMock(); mock_pattern.id = uuid4()
    recommender_svc._get_user_strategy_data = AsyncMock()
    result = await recommender_svc._get_pattern_strategies(mock_pattern, None, 5)
    recommender_svc._get_user_strategy_data.assert_not_called()

@pytest.mark.asyncio
async def test_strategy_scoring_branches(mock_session):
    """
    Test StrategyRecommender._match_to_pattern specific scoring branches.
    Covers lines 326 (valence decrease) and 343 (arousal increase).
    """
    recommender = StrategyRecommender(mock_session)
    
    # Setup Emotions
    # Case 1: Valence Decrease (Positive -> Negative)
    from_pos = AtlasDefinition(emotion_name="Joy", vac_vector=[0.8, 0.5, 0.5], category="Pos")
    to_neg = AtlasDefinition(emotion_name="Sadness", vac_vector=[-0.8, 0.5, 0.5], category="Neg")
    
    # Case 2: Arousal Increase (Low -> High)
    from_low = AtlasDefinition(emotion_name="Boredom", vac_vector=[0.0, -0.5, 0.0], category="Low")
    to_high = AtlasDefinition(emotion_name="Excitement", vac_vector=[0.0, 0.5, 0.0], category="High")
    
    # Defined Patterns
    pattern_val_dec = TransitionPattern(
        pattern_name="mood_worsening",
        from_category="Pos",
        to_category="Neg",
        vac_change_characteristics={"valence_change": "decrease"}
    )
    
    pattern_arousal_inc = TransitionPattern(
        pattern_name="activation",
        from_category="Low",
        to_category="High",
        vac_change_characteristics={"arousal_change": "increase"}
    )
    
    # Mock DB return
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [
        pattern_val_dec, pattern_arousal_inc
    ]
    mock_session.execute.return_value = mock_result
    
    # Test Valence Decrease
    match1 = await recommender._match_to_pattern(from_pos, to_neg)
    assert match1.pattern_name == "mood_worsening"
    
    # Test Arousal Increase
    match2 = await recommender._match_to_pattern(from_low, to_high)
    assert match2.pattern_name == "activation"
