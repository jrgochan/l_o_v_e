
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.emotion_mapper import EmotionMapper
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
def mapper(mock_session):
    return EmotionMapper(mock_session)

@pytest.fixture
def mock_emotion():
    e = MagicMock(spec=AtlasDefinition)
    e.id = uuid4()
    e.emotion_name = "Test"
    e.vac_vector = [0,0,0]
    e.semantic_embedding = [0.1, 0.2]
    return e

@pytest.mark.asyncio
async def test_find_nearest_no_emotions(mapper, mock_session):
    """Test ValueError when no emotions exist."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result
    
    with pytest.raises(ValueError, match="No emotions found"):
        await mapper.find_nearest([0,0,0])

@pytest.mark.asyncio
async def test_find_nearest_invalid_embedding(mapper, mock_session, mock_emotion):
    """Test handling of invalid semantic embedding in DB."""
    # Simulate DB object where semantic_embedding access raises TypeError
    # We need to mock the property access.
    # A simpler way: mock the attribute to be something that list() fails on if not handled,
    # or rely on the fact that the code does: 
    # try: emotion_embedding = list(emotion.semantic_embedding)
    
    # If we set it to None, the code handles it (line 121).
    # To hit line 123 (except TypeError), we need list() to fail.
    # e.g. semantic_embedding is an integer.
    mock_emotion.semantic_embedding = 123 
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_result.scalar_one.return_value = mock_emotion
    mock_session.execute.return_value = mock_result
    
    # Should calculate VAC distance only, no crash
    res = await mapper.find_nearest([0.1,0.1,0.1], text_embedding=[0.1,0.2], word_count=5)
    assert res == mock_emotion

@pytest.mark.asyncio
async def test_calculate_semantic_distance_zero_vector(mapper):
    """Test semantic distance with zero vector (edge case)."""
    # Should return 2.0 (max distance)
    dist = mapper._calculate_semantic_distance([0,0], [1,1])
    assert dist == 2.0
    
    dist2 = mapper._calculate_semantic_distance([1,1], [0,0])
    assert dist2 == 2.0

@pytest.mark.asyncio
async def test_weighted_fusion_logic(mapper):
    """Test fusion weights explicitly."""
    # Short text (<10 words): 0.8 / 0.2
    # Long text (>=10 words): 0.4 / 0.6
    
    # VAC max ~3.46. Sem max 2.0.
    
    # Text length 5:
    # vac_dist = 3.46 (norm 1.0). sem_dist = 2.0 (norm 1.0).
    # combined = 0.8*1 + 0.2*1 = 1.0
    res = mapper._weighted_fusion(3.46, 2.0, 5)
    assert res == pytest.approx(1.0)
    
    # Text length 15:
    # combined = 0.4*1 + 0.6*1 = 1.0
    res2 = mapper._weighted_fusion(3.46, 2.0, 15)
    assert res2 == pytest.approx(1.0)
