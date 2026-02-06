from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.recommendation.curation import CurationProvider
from app.services.recommendation.discovery import DiscoveryEngine
from app.services.recommendation.spatial import SpatialAnalyzer


@pytest.fixture
def mock_session():
    s = AsyncMock()
    s.execute = AsyncMock()
    return s


# === Discovery Tests ===


@pytest.mark.asyncio
async def test_get_problematic_transitions(mock_session):
    engine = DiscoveryEngine(mock_session)

    # Mock row data: from_id, to_id, distance, difficulty, count, bridge,
    # f_name, f_cat, t_name, t_cat
    row_data = (uuid4(), uuid4(), 2.5, "difficult", 5, True, "Shame", "Sadness", "Joy", "Happiness")
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [row_data]
    mock_session.execute.return_value = mock_result

    res = await engine.get_problematic_transitions(limit=5)

    assert len(res) == 1
    assert res[0]["from_name"] == "Shame"
    assert res[0]["distance"] == 2.5
    mock_session.execute.assert_awaited()


@pytest.mark.asyncio
async def test_get_complementary_paths(mock_session):
    engine = DiscoveryEngine(mock_session)

    # Mock _suggest_bridges
    mock_result = MagicMock()
    # id, name, category
    row_data = (uuid4(), "Vulnerability", "Openness")
    mock_result.fetchall.return_value = [row_data]
    mock_session.execute.return_value = mock_result

    # Input selected emotions
    selected = [uuid4()]

    suggestions = await engine.get_complementary_paths(selected)

    assert len(suggestions) >= 1
    assert suggestions[0]["name"] == "Vulnerability"
    assert suggestions[0]["type"] == "bridge"


@pytest.mark.asyncio
async def test_get_complementary_paths_empty(mock_session):
    engine = DiscoveryEngine(mock_session)
    assert await engine.get_complementary_paths([]) == []


@pytest.mark.asyncio
async def test_get_complementary_paths_triangle(mock_session):
    engine = DiscoveryEngine(mock_session)

    # Mock _suggest_bridges to return empty so we focus on triangle
    # But wait, we can't easily mock private method on the instance unless we patch
    # For unit test of `get_complementary_paths`,
    # we want to see it call _suggest_triangle_completion

    # We'll just verify it doesn't crash and calls the database if we don't mock the privates
    # Or strict mocking:

    # Mocking session execute for bridges (first call)
    mock_result_bridges = MagicMock()
    mock_result_bridges.fetchall.return_value = []

    # The actual code calls _suggest_bridges then _suggest_triangle_completion
    # _suggest_triangle_completion is currently a placeholder returning [], so no DB call there?
    # Let's check code: Yes, returns [] immediately.

    mock_session.execute.return_value = mock_result_bridges

    suggestions = await engine.get_complementary_paths([uuid4(), uuid4()])
    # Should get results from bridges (empty) + triangle (empty) + opposites (empty) -> empty
    # But it proves the path was taken without error.
    assert suggestions == []

    # To really verify lines 87-90, we can mock the private method
    engine._suggest_triangle_completion = AsyncMock(return_value=[{"type": "triangle"}])
    engine._suggest_bridges = AsyncMock(return_value=[])
    engine._suggest_opposites = AsyncMock(return_value=[])

    suggestions = await engine.get_complementary_paths([uuid4(), uuid4()])
    assert len(suggestions) == 1
    assert suggestions[0]["type"] == "triangle"


@pytest.mark.asyncio
async def test_suggest_bridges_defensive(mock_session):
    """Test private method directly for coverage of defensive paths."""
    engine = DiscoveryEngine(mock_session)

    # Empty list case (normally guarded by public API)
    # This hits lines 111-112 and the 'if selected_ids' check at 126

    # Mock execute for the case where selected_ids is empty (it queries just by bridge_names)
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_session.execute.return_value = mock_result

    res = await engine._suggest_bridges([])
    assert res == []

    # Verify the SQL parameter didn't include selected_ids
    call_kwargs = mock_session.execute.call_args[0][1]
    assert "selected_ids" not in call_kwargs


@pytest.mark.asyncio
async def test_suggest_triangle_direct(mock_session):
    """Test private method for coverage."""
    engine = DiscoveryEngine(mock_session)
    res = await engine._suggest_triangle_completion([uuid4(), uuid4()])
    assert res == []


@pytest.mark.asyncio
async def test_suggest_opposites_direct(mock_session):
    """Test private method for coverage."""
    engine = DiscoveryEngine(mock_session)
    res = await engine._suggest_opposites([uuid4()])
    assert res == []


@pytest.mark.asyncio
async def test_get_curated_journeys(mock_session):
    provider = CurationProvider(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [uuid4(), uuid4()]
    mock_session.execute.return_value = mock_result

    journeys = await provider.get_curated_journeys(context="healing")

    assert len(journeys) > 0
    # verify "shame_healing" is likely in there
    shame = next((j for j in journeys if j["id"] == "shame_healing"), None)
    if shame:
        assert shame["emotion_count"] == 2  # based on mock return


@pytest.mark.asyncio
async def test_get_curated_journeys_all(mock_session):
    provider = CurationProvider(mock_session)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    # Call without context to hit False branch of filter
    journeys = await provider.get_curated_journeys()

    assert len(journeys) == 6  # There are 6 total journeys defined


# === Spatial Tests ===


@pytest.mark.asyncio
async def test_get_similar_emotions(mock_session):
    analyzer = SpatialAnalyzer(mock_session)

    # Mock row: id, name, category, vac_vector (string or list), distance
    # Testing list logic
    row_data = (uuid4(), "Joy", "Happiness", [1.0, 1.0, 1.0], 0.1)

    mock_result = MagicMock()
    mock_result.fetchall.return_value = [row_data]
    mock_session.execute.return_value = mock_result

    res = await analyzer.get_similar_emotions(uuid4())

    assert len(res) == 1
    assert res[0]["name"] == "Joy"
    assert res[0]["vac"] == [1.0, 1.0, 1.0]


@pytest.mark.asyncio
async def test_get_similar_emotions_json_parsing(mock_session):
    analyzer = SpatialAnalyzer(mock_session)

    # Testing string JSON logic
    row_data = (uuid4(), "Joy", "Happiness", "[1.0, 1.0, 1.0]", 0.1)

    mock_result = MagicMock()
    mock_result.fetchall.return_value = [row_data]
    mock_session.execute.return_value = mock_result

    res = await analyzer.get_similar_emotions(uuid4())

    assert len(res) == 1
    assert res[0]["vac"] == [1.0, 1.0, 1.0]
