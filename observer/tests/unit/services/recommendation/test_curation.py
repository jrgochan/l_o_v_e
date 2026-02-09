from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.recommendation.curation import CurationProvider


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def curation_provider(mock_session):
    return CurationProvider(mock_session)


def test_load_journeys_empty_or_missing(mock_session):
    # Test file missing
    with patch("pathlib.Path.exists", return_value=False):
        provider = CurationProvider(mock_session)
        assert provider._journeys == []

    # Test file load exception
    with (
        patch("pathlib.Path.exists", return_value=True),
        patch("builtins.open", side_effect=Exception("Read error")),
    ):
        provider = CurationProvider(mock_session)
        assert provider._journeys == []


@pytest.mark.asyncio
async def test_get_curated_journeys_empty_emotions(mock_session):
    # Setup provider with a journey that has no emotions
    provider = CurationProvider(mock_session)
    provider._journeys = [
        {"name": "Empty Journey", "category": "healing", "emotions": []},
        {"name": "Valid Journey", "category": "growth", "emotions": ["Joy"]},
    ]

    # Mock DB response for the valid journey
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["uuid-joy"]
    mock_session.execute.return_value = mock_result

    journeys = await provider.get_curated_journeys()

    # Should skip the empty one and return valid one
    assert len(journeys) == 1
    assert journeys[0]["name"] == "Valid Journey"


@pytest.mark.asyncio
async def test_get_curated_journeys_malformed(mock_session):
    # Setup provider with malformed journey (missing 'emotions' key)
    provider = CurationProvider(mock_session)
    provider._journeys = [{"name": "Malformed Journey", "category": "healing"}]

    journeys = await provider.get_curated_journeys()
    assert len(journeys) == 0


@pytest.mark.asyncio
async def test_get_curated_journeys_context_filtering(mock_session):
    # Setup provider with mixed categories
    provider = CurationProvider(mock_session)
    provider._journeys = [
        {"name": "Healing Journey", "category": "healing", "emotions": ["Hope"]},
        {"name": "Growth Journey", "category": "growth", "emotions": ["Joy"]},
        {"name": "Other Journey", "category": "other", "emotions": ["Neutral"]},
    ]

    # Mock DB response
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["uuid-placeholder"]
    mock_session.execute.return_value = mock_result

    # Test filtering for 'healing'
    healing_journeys = await provider.get_curated_journeys(context="healing")
    assert len(healing_journeys) == 1
    assert healing_journeys[0]["name"] == "Healing Journey"

    # Test filtering for 'growth'
    growth_journeys = await provider.get_curated_journeys(context="growth")
    assert len(growth_journeys) == 1
    assert growth_journeys[0]["name"] == "Growth Journey"

    # Test invalid context (should return all)
    all_journeys = await provider.get_curated_journeys(context="invalid")
    assert len(all_journeys) == 3
