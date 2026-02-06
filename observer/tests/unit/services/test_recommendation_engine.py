from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.services.recommendation_engine import RecommendationEngine


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
    assert "problematic_transitions" not in recs_healing


@pytest.mark.asyncio
async def test_get_similar_emotions_delegation(engine):
    """Test direct delegation."""
    eid = uuid4()
    await engine.get_similar_emotions(eid, 5)
    engine.spatial.get_similar_emotions.assert_awaited_with(eid, 5)


@pytest.mark.asyncio
async def test_get_problematic_transitions_delegation(engine):
    await engine.get_problematic_transitions(10)
    engine.discovery.get_problematic_transitions.assert_awaited_with(10)


@pytest.mark.asyncio
async def test_get_curated_journeys_delegation(engine):
    await engine.get_curated_journeys("ctx")
    engine.curation.get_curated_journeys.assert_awaited_with("ctx")


@pytest.mark.asyncio
async def test_get_complementary_paths_delegation(engine):
    sel = [uuid4()]
    await engine.get_complementary_paths(sel, 5)
    engine.discovery.get_complementary_paths.assert_awaited_with(sel, 5)
