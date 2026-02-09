from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.services.recommendation.engine import RecommendationEngine


@pytest.fixture
def mock_session():
    db = AsyncMock()
    return db


@pytest.fixture
def engine(mock_session):
    # Mock initialization of components
    with (
        patch("app.services.recommendation.engine.CurationProvider") as MockCuration,
        patch("app.services.recommendation.engine.SpatialAnalyzer") as MockSpatial,
        patch("app.services.recommendation.engine.DiscoveryEngine") as MockDiscovery,
    ):

        e = RecommendationEngine(mock_session)
        # Set instance mocks (since init creates them)
        e.curation = MockCuration.return_value
        e.spatial = MockSpatial.return_value
        e.discovery = MockDiscovery.return_value

        # Ensure async methods are awaitable
        e.curation.get_curated_journeys = AsyncMock()
        e.spatial.get_similar_emotions = AsyncMock()
        e.discovery.get_problematic_transitions = AsyncMock()
        e.discovery.get_complementary_paths = AsyncMock()

        yield e


@pytest.mark.asyncio
async def test_get_recommendations_pipeline(engine):
    """Test the orchestration method delegates correctly."""

    engine.spatial.get_similar_emotions = AsyncMock(return_value=["sim"])
    engine.curation.get_curated_journeys = AsyncMock(return_value=["curated"])
    engine.discovery.get_problematic_transitions = AsyncMock(return_value=["prob"])
    engine.discovery.get_complementary_paths = AsyncMock(return_value=["comp"])

    # Case 1: Exploration
    recs = await engine.get_recommendations(
        context="exploration", current_emotion_id=uuid4(), selected_emotions=[uuid4()]
    )

    assert recs["similar_emotions"] == ["sim"]
    assert recs["curated_journeys"] == ["curated"]
    assert recs["problematic_transitions"] == ["prob"]
    assert recs["complementary_suggestions"] == ["comp"]

    # Case 2: Healing (filters out problematic)
    recs_healing = await engine.get_recommendations(context="healing")
    assert recs_healing["problematic_transitions"] == []
