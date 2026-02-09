from unittest.mock import AsyncMock

import pytest

from app.services.emotions.mapper import EmotionMapper, MapperQuery


@pytest.fixture
def mapper():
    session = AsyncMock()
    return EmotionMapper(session)


@pytest.mark.asyncio
async def test_get_top_k_nearest_empty_raises(mapper):
    """Test line 148: raises ValueError if no candidates."""
    # Mock repo to return empty list
    mapper.repo = AsyncMock()
    mapper.repo.find_nearest_neighbors.return_value = []

    query = MapperQuery(vac_values=[0, 0, 0])

    with pytest.raises(ValueError, match="No emotions found"):
        await mapper.get_top_k_nearest(query)


@pytest.mark.asyncio
async def test_find_nearest_by_vac_only_empty_raises(mapper):
    """Test line 171: raises ValueError if no results."""
    # Mock repo to return empty list
    mapper.repo = AsyncMock()
    mapper.repo.find_nearest_neighbors.return_value = []

    with pytest.raises(ValueError, match="No emotions found"):
        await mapper.find_nearest_by_vac_only([0, 0, 0])


@pytest.mark.asyncio
async def test_fetch_candidates_semantic_switch(mapper):
    """Test lines 194-195: switch to semantic search for long text."""
    mapper.repo = AsyncMock()
    mapper.repo.find_nearest_neighbors.return_value = [
        ("some", "result")
    ]  # Just to return something

    query = MapperQuery(vac_values=[0, 0, 0], text_embedding=[0.1] * 384, word_count=15)  # >= 10

    await mapper._fetch_candidates(query)

    # Verify called with vector_type="semantic" and the text embedding
    mapper.repo.find_nearest_neighbors.assert_awaited_once()
    call_kwargs = mapper.repo.find_nearest_neighbors.await_args.kwargs

    assert call_kwargs["vector_type"] == "semantic"
    assert call_kwargs["vector"] == query.text_embedding
