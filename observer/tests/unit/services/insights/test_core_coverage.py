from unittest.mock import AsyncMock

import pytest

from app.services.insights.core import InsightGenerator


@pytest.fixture
def generator():
    db = AsyncMock()
    return InsightGenerator(db)


def test_generate_guidance_no_strategy_match(generator):
    """Test line 93: Loop finishes without match, returns empty string."""
    # Clear strategies to force no match
    generator.guidance_strategies = []

    msg = generator._generate_guidance({}, {"valence": 0}, "default")
    assert msg == ""


def test_generate_fallback_insights(generator):
    """Test line 99: _generate_fallback_insights structure."""
    vac = {"valence": 0.1, "arousal": 0.2, "connection": 0.3}
    result = generator._generate_fallback_insights("UnknownEmotion", vac, "default")

    assert result["emotion"] == "UnknownEmotion"
    assert result["category"] == "Unknown"
    assert result["confidence"] == 0.0
    assert result["recommendations"] == []
    assert "guidance" in result
    assert "vac_analysis" in result
