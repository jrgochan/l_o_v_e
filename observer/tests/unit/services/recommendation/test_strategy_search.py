from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.transition_strategy import TransitionStrategy
from app.services.recommendation.strategies import StrategyRecommender


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def recommender(mock_session):
    return StrategyRecommender(mock_session)


@pytest.mark.asyncio
async def test_search_strategies_no_filters(recommender, mock_session):
    """Test search with no filters applied."""
    # Mock result
    s1 = TransitionStrategy(id=uuid4(), strategy_name="S1")
    res = MagicMock()
    res.scalars().all.return_value = [s1]
    mock_session.execute.return_value = res

    from app.services.planning.types import StrategySearchCriteria

    criteria = StrategySearchCriteria()
    result = await recommender.search_strategies(criteria)

    assert len(result["strategies"]) == 1
    assert result["strategies"][0]["name"] == "S1"

    # Verify execute called
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_search_strategies_all_filters(recommender, mock_session):
    """Test applying all filters."""
    # Mock result
    res = MagicMock()
    res.scalars().all.return_value = []
    mock_session.execute.return_value = res

    from app.services.planning.types import StrategySearchCriteria

    criteria = StrategySearchCriteria(
        strategy_type="cognitive",
        evidence_level="strong",
        difficulty_min=1,
        difficulty_max=3,
        search="breathing",
        limit=10,
        offset=5,
    )

    await recommender.search_strategies(criteria)

    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_search_strategies_query_ilike(recommender, mock_session):
    """Test search query ILIKE construction."""
    # This hits lines 513-518
    res = MagicMock()
    res.scalars().all.return_value = []
    mock_session.execute.return_value = res

    from app.services.planning.types import StrategySearchCriteria

    criteria = StrategySearchCriteria(search="term")
    await recommender.search_strategies(criteria)
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_search_strategies_difficulty_range(recommender, mock_session):
    """Test difficulty range filters."""
    # Hits 507-511
    res = MagicMock()
    res.scalars().all.return_value = []
    mock_session.execute.return_value = res

    from app.services.planning.types import StrategySearchCriteria

    c1 = StrategySearchCriteria(difficulty_min=2)
    await recommender.search_strategies(c1)

    c2 = StrategySearchCriteria(difficulty_max=4)
    await recommender.search_strategies(c2)

    assert mock_session.execute.call_count == 2
