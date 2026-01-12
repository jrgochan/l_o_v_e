
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.recommendation_engine import RecommendationEngine

@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
def engine(mock_session):
    return RecommendationEngine(mock_session)

@pytest.mark.asyncio
async def test_get_similar_emotions_vac_list_handling(engine, mock_session):
    """Test VAC distance retrieval when DB returns list instead of string."""
    # Columns: id, name, category, vac, distance
    # Here VAC is a list, not string
    mock_rows = [
        (uuid4(), "Joy", "Happiness", [0.5, 0.5, 0.5], 0.1)
    ]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_session.execute.return_value = mock_result
    
    similar = await engine.get_similar_emotions(uuid4())
    
    assert len(similar) == 1
    assert similar[0]["vac"] == [0.5, 0.5, 0.5]

@pytest.mark.asyncio
async def test_get_emotion_ids_by_names_empty(engine):
    """Test returning empty list for empty name input."""
    ids = await engine._get_emotion_ids_by_names([])
    assert ids == []

@pytest.mark.asyncio
async def test_suggest_bridges_query(engine, mock_session):
    """Test that bridge suggestions execute correct query."""
    selected = [uuid4()]
    
    # Mock SQL
    mock_rows = [
        (uuid4(), "Awe", "Transcendence"),
        (uuid4(), "Vulnerability", "Opening")
    ]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_session.execute.return_value = mock_result
    
    bridges = await engine._suggest_bridges(selected)
    
    assert len(bridges) == 2
    assert bridges[0]["name"] == "Awe"
    assert bridges[0]["type"] == "bridge"

@pytest.mark.asyncio
async def test_suggest_triangle_and_opposites_empty(engine):
    """Cover the placeholder methods."""
    assert await engine._suggest_triangle_completion([uuid4(), uuid4()]) == []
    assert await engine._suggest_opposites([uuid4()]) == []
