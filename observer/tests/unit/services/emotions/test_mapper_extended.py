from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.emotions.mapper import EmotionMapper


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mapper(mock_session):
    return EmotionMapper(mock_session)


@pytest.fixture
def mock_emotion():
    e = MagicMock(spec=EmotionDefinition)
    e.id = uuid4()
    e.emotion_name = "Test"
    e.vac_vector = [0, 0, 0]
    e.semantic_embedding = [0.1, 0.2]
    return e


@pytest.mark.asyncio
async def test_find_nearest_no_emotions(mapper, mock_session):
    """Test ValueError when no emotions exist."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    # FIX: mock all() to return empty list
    mock_result.all.return_value = []
    mock_session.execute.return_value = mock_result

    from app.services.emotions.mapper import MapperQuery

    with pytest.raises(ValueError, match="No emotions found"):
        await mapper.find_nearest(MapperQuery(vac_values=[0.0, 0.0, 0.0]))


@pytest.mark.asyncio
async def test_find_nearest_invalid_embedding(mapper, mock_session, mock_emotion):
    """Test handling of invalid semantic embedding in DB."""
    # Simulate DB object where semantic_embedding access raises TypeError
    mock_emotion.semantic_embedding = 123

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    # FIX: mock all() to return list of tuples
    mock_result.all.return_value = [(mock_emotion, 0.0)]

    mock_result.scalar_one.return_value = mock_emotion
    mock_session.execute.return_value = mock_result

    from app.services.emotions.mapper import MapperQuery

    # Should calculate VAC distance only, no crash
    # FIX: Use MapperQuery
    query = MapperQuery(vac_values=[0.1, 0.1, 0.1], text_embedding=[0.1, 0.2], word_count=5)
    res = await mapper.find_nearest(query)
    assert res == mock_emotion


@pytest.mark.asyncio
async def test_calculate_semantic_distance_zero_vector(mapper):
    """Test semantic distance with zero vector (edge case)."""
    # Should return 1.0 (orthogonal/unrelated) not 2.0 (opposite)
    dist = mapper._calculate_semantic_distance([0, 0], [1, 1])
    assert dist == 1.0

    dist2 = mapper._calculate_semantic_distance([1, 1], [0, 0])
    assert dist2 == 1.0


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
