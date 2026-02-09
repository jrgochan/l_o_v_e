from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.insights.core import InsightGenerator
from app.types.insights import InsightGenerationRequest


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def generator(mock_db):
    with patch("app.services.insights.core.RecommendationEngine") as MockRec:
        gen = InsightGenerator(mock_db)
        gen.rec_engine_mock = MockRec.return_value
        # Mock default behavior
        gen.rec_engine_mock.get_recommendations = AsyncMock(return_value={})
        yield gen


@pytest.fixture
def base_request():
    return InsightGenerationRequest(
        emotion_name="Joy",
        vac_data={"valence": 0.5, "arousal": 0.5, "connection": 0.5},
        confidence=0.9,
        tone_mode="warm",
        use_emotion_mapping=False,
    )


@pytest.mark.asyncio
async def test_generate_insights_default_strategy(generator, base_request):
    """Test default strategy output."""
    # Use neutral VAC to trigger default strategy
    base_request.vac_data = {"valence": 0.1, "arousal": 0.1, "connection": 0.1}

    result = await generator.generate_insights(base_request)

    assert "formatted_summary" not in result  # Old field
    assert "summary" in result
    assert "valid" in result["summary"]  # Part of default strategy text
    assert result["confidence"] == 0.9


@pytest.mark.asyncio
async def test_generate_insights_high_arousal_strategy(generator, base_request):
    """Test high arousal negative valence strategy."""
    base_request.vac_data = {"valence": -0.5, "arousal": 0.8, "connection": 0.1}
    base_request.emotion_name = "Panic"

    result = await generator.generate_insights(base_request)

    assert "ground yourself" in result["guidance"]


@pytest.mark.asyncio
async def test_generate_insights_clinical_tone(generator, base_request):
    """Test clinical tone definition."""
    base_request.tone_mode = "clinical"
    base_request.vac_data = {"valence": 0.1, "arousal": 0.1, "connection": 0.1}

    result = await generator.generate_insights(base_request)

    assert "General emotional processing" in result["guidance"]


@pytest.mark.asyncio
async def test_generate_insights_with_recommendations(generator, base_request):
    """Test recommendations integration."""
    base_request.use_emotion_mapping = True

    # Mock EmotionMapper
    with patch("app.services.insights.core.EmotionMapper") as MockMapper:
        mock_mapper = MockMapper.return_value
        emotion_def = MagicMock(spec=EmotionDefinition)
        emotion_def.id = uuid4()
        mock_mapper.find_nearest = AsyncMock(return_value=emotion_def)

        # Mock Recommendations
        mock_rec = MagicMock()
        mock_rec.title = "A Journey"
        mock_rec.content_type = "journey"
        mock_rec.description = "Desc"

        generator.recommendation_engine.get_recommendations.return_value = {
            "curated_journeys": [mock_rec]
        }

        result = await generator.generate_insights(base_request)

        assert len(result["recommendations"]) == 1
        assert result["recommendations"][0]["title"] == "A Journey"

        # Verify mapper called
        mock_mapper.find_nearest.assert_awaited()
        generator.recommendation_engine.get_recommendations.assert_awaited_with(
            current_emotion_id=emotion_def.id, limit=3
        )


@pytest.mark.asyncio
async def test_generate_insights_mapping_failure(generator, base_request):
    """Test graceful handling of mapping failure."""
    base_request.use_emotion_mapping = True

    with patch("app.services.insights.core.EmotionMapper") as MockMapper:
        mock_mapper = MockMapper.return_value
        mock_mapper.find_nearest.side_effect = ValueError("No match")

        result = await generator.generate_insights(base_request)

        # Should still return result, just no recs based on ID
        assert result["summary"]
        assert result["recommendations"] == []


@pytest.mark.asyncio
async def test_disconnection_strategy(generator, base_request):
    """Test disconnection strategy."""
    base_request.vac_data = {"connection": -0.8}

    result = await generator.generate_insights(base_request)

    assert "reaching out" in result["guidance"]


@pytest.mark.asyncio
async def test_positive_valence_strategy(generator, base_request):
    """Test positive valence strategy."""
    base_request.vac_data = {"valence": 0.8}

    result = await generator.generate_insights(base_request)

    assert "appreciate" in result["guidance"]
