
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.recommendation_engine import RecommendationEngine, CURATED_JOURNEYS

@pytest.fixture
def mock_session():
    # Remove spec=AsyncSession to avoid auto-creation of async mocks for internal attributes
    # that might not be consumed/awaited, causing RuntimeWarnings.
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.add = MagicMock()
    db.delete = MagicMock()
    db.close = AsyncMock()
    return db

@pytest.fixture
def engine(mock_session):
    return RecommendationEngine(mock_session)

@pytest.mark.asyncio
async def test_get_similar_emotions(engine, mock_session):
    """Test VAC distance retrieval."""
    
    # Mock SQL result
    # Columns: id, name, category, vac, distance
    mock_rows = [
        (uuid4(), "Joy", "Happiness", "[0.5, 0.5, 0.5]", 0.1),
        (uuid4(), "Elation", "Happiness", "[0.6, 0.6, 0.6]", 0.2)
    ]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_session.execute.return_value = mock_result
    
    similar = await engine.get_similar_emotions(uuid4())
    
    assert len(similar) == 2
    assert similar[0]["name"] == "Joy"
    assert similar[0]["distance"] == 0.1
    assert similar[0]["vac"] == [0.5, 0.5, 0.5]

@pytest.mark.asyncio
async def test_get_curated_journeys(engine, mock_session):
    """Test retrieving and filtering curated journeys."""
    
    # Mock emotion ID lookup
    mock_ids_result = MagicMock()
    mock_ids_result.fetchall.return_value = [(uuid4(),), (uuid4(),)]
    mock_session.execute.return_value = mock_ids_result
    
    # 1. Healing Context
    healing = await engine.get_curated_journeys("healing")
    assert all(j["category"] == "healing" for j in healing)
    assert len(healing) > 0
    assert "emotion_ids" in healing[0]
    
    # 2. Growth Context
    growth = await engine.get_curated_journeys("growth")
    assert all(j["category"] == "growth" for j in growth)

@pytest.mark.asyncio
async def test_get_problematic_transitions(engine, mock_session):
    """Test fetching difficult path queries."""
    
    # Columns: from, to, dist, diff, wp_count, bridge, from_name, from_cat, to_name, to_cat
    mock_rows = [
        (uuid4(), uuid4(), 3.5, "difficult", 5, True, "Rage", "Anger", "Peace", "Calm")
    ]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_session.execute.return_value = mock_result
    
    transitions = await engine.get_problematic_transitions()
    
    assert len(transitions) == 1
    assert transitions[0]["from_name"] == "Rage"
    assert transitions[0]["distance"] == 3.5

@pytest.mark.asyncio
async def test_get_recommendations_pipeline(engine):
    """Test the orchestration method."""
    
    # Mock sub-methods to isolate orchestration logic
    engine.get_similar_emotions = AsyncMock(return_value=["sim"])
    engine.get_curated_journeys = AsyncMock(return_value=["curated"])
    engine.get_problematic_transitions = AsyncMock(return_value=["prob"])
    engine.get_complementary_paths = AsyncMock(return_value=["comp"])
    
    # Case 1: Exploration
    recs = await engine.get_recommendations(
        context="exploration", 
        current_emotion_id=uuid4(),
        selected_emotions=[uuid4()]
    )
    
    assert "similar_emotions" in recs
    assert "curated_journeys" in recs
    assert "problematic_transitions" in recs
    assert "complementary_suggestions" in recs
    
    # Case 2: Healing (filters out problematic)
    recs_healing = await engine.get_recommendations(context="healing")
    assert "problematic_transitions" not in recs_healing

@pytest.mark.asyncio
async def test_complementary_paths(engine):
    """Test bridge loop logic."""
    
    # Mock internal helpers which we didn't fully see but can patch
    with patch.object(engine, '_suggest_bridges', new_callable=AsyncMock) as mock_bridges, \
         patch.object(engine, '_suggest_triangle_completion', new_callable=AsyncMock) as mock_triangle, \
         patch.object(engine, '_suggest_opposites', new_callable=AsyncMock) as mock_opposite:
         
        mock_bridges.return_value = ["bridge"]
        mock_triangle.return_value = ["triangle"]
        mock_opposite.return_value = ["opposite"]
        
        # 1. No selections
        empty = await engine.get_complementary_paths([])
        assert empty == []
        

@pytest.mark.asyncio
async def test_recommendation_curated_journeys_context():
    engine = RecommendationEngine(AsyncMock())
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [(uuid4(),), (uuid4(),)]
    engine.session.execute.return_value = mock_result
    healing = await engine.get_curated_journeys(context="healing")
    assert len(healing) > 0

@pytest.mark.asyncio
async def test_recommendation_curated_journeys_no_context():
    engine = RecommendationEngine(AsyncMock())
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    engine.session.execute.return_value = mock_result
    all_journeys = await engine.get_curated_journeys(context=None)
    assert len(all_journeys) == len(CURATED_JOURNEYS)

@pytest.mark.asyncio
async def test_recommendation_complementary_paths_triangle():
    mock_db = AsyncMock()
    engine = RecommendationEngine(mock_db)
    engine._suggest_bridges = AsyncMock(return_value=[])
    engine._suggest_triangle_completion = AsyncMock(return_value=[{"name": "Triangle"}])
    engine._suggest_opposites = AsyncMock(return_value=[])
    selected = [uuid4(), uuid4()]
    result = await engine.get_complementary_paths(selected_emotions=selected)
    engine._suggest_triangle_completion.assert_called_once()
    assert len(result) == 1

@pytest.mark.asyncio
async def test_recommendation_complementary_paths_single():
    mock_db = AsyncMock()
    engine = RecommendationEngine(mock_db)
    engine._suggest_bridges = AsyncMock(return_value=[])
    engine._suggest_opposites = AsyncMock(return_value=[])
    engine._suggest_triangle_completion = AsyncMock(return_value=[])
    selected = [uuid4()]
    result = await engine.get_complementary_paths(selected_emotions=selected)
    engine._suggest_triangle_completion.assert_not_called()
