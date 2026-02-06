from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.insights.core import InsightGenerator


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def generator(mock_db):
    # Patch submodules during init/runtime
    with (
        patch("app.services.insights.core.RecommendationEngine") as MockRec,
        patch("app.services.insights.core.SessionAnalyticsService") as MockAnalytics,
        patch("app.services.insights.core.ClinicalAlertService") as MockAlerts,
        patch("app.services.insights.core.warm") as mock_warm,
        patch("app.services.insights.core.clinical") as mock_clinical,
        patch("app.services.insights.core.prosody") as mock_prosody,
    ):

        gen = InsightGenerator(mock_db)
        gen.rec_engine_mock = MockRec.return_value
        gen.analytics_mock = MockAnalytics.return_value
        gen.alerts_mock = MockAlerts.return_value
        gen.warm_module = mock_warm
        gen.clinical_module = mock_clinical
        gen.prosody_module = mock_prosody
        yield gen


@pytest.mark.asyncio
async def test_generate_insights_warm_flow(generator):
    """Test standard warm flow orchestration."""
    # Data
    vac = {"valence": 0.5, "arousal": 0.5, "connection": 0.5}

    # Mock emotion resolution
    generator._get_emotion_details = AsyncMock(
        return_value={"name": "Joy", "category": "Happiness", "id": str(uuid4())}
    )

    # Mock Warm generation
    generator.warm_module.generate_warm_summary_structured.return_value = {
        "structured_summary": "Warm summary"
    }
    generator.warm_module.generate_warm_summary_legacy.return_value = "Legacy warm"

    # Execute
    result = await generator.generate_insights(
        emotion_name="Joy", vac_data=vac, confidence=0.9, tone_mode="warm"
    )

    assert result["mode"] == "warm"
    assert result["structured_summary"] == "Warm summary"
    assert result["summary"] == "Legacy warm"
    generator.warm_module.generate_warm_summary_structured.assert_called_once()


@pytest.mark.asyncio
async def test_generate_insights_clinical_flow(generator):
    """Test clinical flow orchestration."""
    vac = {"valence": -0.5, "arousal": 0.5, "connection": 0.5}

    generator._get_emotion_details = AsyncMock(
        return_value={"name": "Anxiety", "category": "Fear", "id": str(uuid4())}
    )

    generator.clinical_module.generate_clinical_summary_structured.return_value = {
        "clinical_note": "Clinical note"
    }
    generator.clinical_module.generate_clinical_summary_legacy.return_value = "Legacy clinical"

    result = await generator.generate_insights(
        emotion_name="Anxiety", vac_data=vac, confidence=0.9, tone_mode="clinical"
    )

    assert result["mode"] == "clinical"
    assert "clinical_note" in result
    assert result["summary"] == "Legacy clinical"


@pytest.mark.asyncio
async def test_generate_insights_with_prosody(generator):
    """Test prosody analysis integration."""
    vac = {"valence": 0, "arousal": 0, "connection": 0}
    prosody_data = {"pitch_mean": 100}

    generator._get_emotion_details = AsyncMock(return_value={"name": "Neutral"})
    generator.prosody_module.analyze_prosody_features.return_value = {"pitch": "normal"}
    generator.prosody_module.analyze_voice_content_correlation.return_value = {"match": True}

    # Mock warm module return (required as default is warm usually if not specified or explicit)
    generator.warm_module.generate_warm_summary_structured.return_value = {}
    generator.warm_module.generate_warm_summary_legacy.return_value = ""

    result = await generator.generate_insights(
        emotion_name="Neutral", vac_data=vac, confidence=1.0, prosody_data=prosody_data
    )

    assert "prosody_analysis" in result
    assert "voice_content_correlation" in result
    generator.prosody_module.analyze_prosody_features.assert_called_with(prosody_data)


@pytest.mark.asyncio
async def test_generate_insights_fallback(generator):
    """Test fallback when emotion definition missing."""
    generator._get_emotion_details = AsyncMock(return_value=None)

    result = await generator.generate_insights(
        emotion_name="Unknown",
        vac_data={"valence": 0, "arousal": 0, "connection": 0},
        confidence=0.5,
    )

    assert result["category"] == "Unknown"
    assert "unable to find detailed information" in result["summary"]


@pytest.mark.asyncio
async def test_generate_insights_with_alerts(generator):
    """Test clinical alerts integration."""
    generator._get_emotion_details = AsyncMock(return_value={"name": "Joy"})
    generator.warm_module.generate_warm_summary_structured.return_value = {}

    # Mock Alert Service
    mock_alert = MagicMock()
    mock_alert.to_dict.return_value = {"level": "critical"}
    generator.alerts_mock.evaluate_alerts = AsyncMock(return_value=[mock_alert])
    generator.alerts_mock.determine_overall_status.return_value = "critical"

    result = await generator.generate_insights(
        emotion_name="Joy", vac_data={}, confidence=1.0, session_id="session1"
    )

    assert len(result["clinical_alerts"]) == 1
    assert result["overall_status"] == "critical"


@pytest.mark.asyncio
async def test_session_analytics_integration(generator):
    """Test session analytics integration (get and update)."""
    # Setup mocks
    mock_analytics = generator.analytics_mock
    # Important: These must be AsyncMock because they are awaited
    mock_analytics.get_or_create = AsyncMock(return_value=MagicMock(emotion_count=5))
    mock_analytics.update_metrics = AsyncMock(
        return_value=MagicMock(to_dict=lambda: {"updated": True})
    )

    # Setup emotion details to pass step 1
    generator._get_emotion_details = AsyncMock(
        return_value={"name": "Joy", "category": "Happiness", "id": "123"}
    )
    generator.warm_module.generate_warm_summary_structured.return_value = {}

    result = await generator.generate_insights(
        emotion_name="Joy", vac_data={}, confidence=1.0, session_id="session1"
    )

    # Verify Get Count (Line 74)
    mock_analytics.get_or_create.assert_called_with("session1")

    # Verify Update Metrics (Line 200)
    mock_analytics.update_metrics.assert_called_once()
    assert result["session_analytics"]["updated"] is True


@pytest.mark.asyncio
async def test_recommendation_formatting(generator):
    """Test recommendation formatting logic."""
    # Mock Rec Engine
    mock_recs = {
        "similar_emotions": [{"name": "E1", "category": "C1", "distance": 0.1}],
        "curated_journeys": [{"from": {"name": "A"}, "to": {"name": "B"}, "description": "Path"}],
    }
    generator.recommendation_engine.get_recommendations = AsyncMock(return_value=mock_recs)

    # Mock emotion details
    generator._get_emotion_details = AsyncMock(return_value={"id": "123", "name": "Sadness"})
    generator.warm_module.generate_warm_summary_structured.return_value = {}

    result = await generator.generate_insights(
        emotion_name="Sadness",
        vac_data={},
        confidence=1.0,
        tone_mode="clinical",  # Test clinical title branch
    )

    recs = result["recommendations"]
    assert len(recs) == 2  # Similar + Journeys
    assert recs[0]["type"] == "similar_emotions"
    assert recs[0]["title"] == "Related Emotions"  # Clinical title
    assert recs[1]["type"] == "journeys"


@pytest.mark.asyncio
async def test_get_emotion_details_exact_match(generator, mock_db):
    """Test _get_emotion_details with use_emotion_mapping=False."""
    # Create real generator instance with mocked DB scalar/execute
    # We need to un-mock _get_emotion_details for this test, but fixture doesn't mock on class,
    # only on instance in previous tests. Use fixture's generator but ensure method isn't mocked.
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    # Mock DB result
    mock_emotion = MagicMock()
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Happiness"
    mock_emotion.definition = "Def"
    mock_emotion.vac_vector = "[0.5, 0.5, 0.5]"  # String format test

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result

    # Execute
    res = await generator._get_emotion_details("Joy", use_emotion_mapping=False)

    assert res["name"] == "Joy"
    assert res["vac"] == [0.5, 0.5, 0.5]
    assert res["matched_by"] == "exact"


@pytest.mark.asyncio
async def test_get_emotion_details_resolver(generator, mock_db):
    """Test _get_emotion_details with valid resolver mapping."""
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    # Mock Resolver
    with patch("app.services.insights.core.EmotionResolver") as MockResolver:
        resolver_inst = MockResolver.return_value
        # Use simple object for mapping result
        mapping = MagicMock()
        mapping.emotion_name = "Joy"
        mapping.emotion_id = str(uuid4())
        mapping.vac = [0.1, 0.2, 0.3]
        mapping.match_method = "semantic"
        mapping.original_name = "Happy"
        mapping.match_confidence = 0.9
        resolver_inst.resolve_emotion = AsyncMock(return_value=mapping)

        # Mock DB for fetching full details
        mock_emotion = MagicMock()
        mock_emotion.id = mapping.emotion_id
        mock_emotion.emotion_name = "Joy"
        mock_emotion.category = "Happiness"
        mock_emotion.definition = "Def"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_emotion
        mock_db.execute.return_value = mock_result

        res = await generator._get_emotion_details("Happy", vac_coords={}, use_emotion_mapping=True)

        assert res["name"] == "Joy"
        assert res["original_emotion"] == "Happy"
        assert res["matched_by"] == "semantic"


@pytest.mark.parametrize(
    "tone,vac,expected_phrases",
    [
        ("clinical", {"arousal": 0.8, "connection": -0.8}, ["activation", "Disconnection pattern"]),
        ("clinical", {"arousal": -0.8, "connection": 0.8}, ["deactivation", "Strong connection"]),
        ("warm", {"arousal": 0.8, "valence": -0.5}, ["ground yourself"]),
        ("warm", {"arousal": -0.8}, ["rest", "gentle movement"]),
        ("warm", {"connection": -0.8}, ["reaching out"]),
        ("warm", {"valence": 0.8, "arousal": 0, "connection": 0}, ["positive state"]),
        ("warm", {"valence": 0, "arousal": 0, "connection": 0}, ["valid"]),
    ],
)
def test_generate_guidance_branches(generator, tone, vac, expected_phrases):
    """Test guidance generation logic."""
    guidance = generator._generate_guidance({"name": "Test"}, vac, tone)
    for phrase in expected_phrases:
        assert phrase in guidance


@pytest.mark.asyncio
async def test_error_handling_blocks(generator):
    """Test warning/error blocks in main flow."""
    # 1. Message Count Error
    generator.analytics_mock.get_or_create.side_effect = Exception("DB Error")
    generator._get_emotion_details = AsyncMock(return_value={"name": "E"})
    generator.warm_module.generate_warm_summary_structured.return_value = {}

    # 2. Recommendations Error
    generator.recommendation_engine.get_recommendations.side_effect = Exception("Rec Error")

    # 3. Clinical Alert Error
    generator.alerts_mock.evaluate_alerts.side_effect = Exception("Alert Error")

    # 4. Analytics Update Error
    generator.analytics_mock.update_metrics.side_effect = Exception("Update Error")

    res = await generator.generate_insights("E", {}, 1.0, session_id="sess")

    assert res  # Should still return insights
    assert res["recommendations"] == []  # Fallback
    assert res["clinical_alerts"] == []  # Fallback
    # Logs would be generated, verifying execution continued


@pytest.mark.asyncio
async def test_get_emotion_details_vac_list_structure(generator, mock_db):
    # Test line 230: vac_vector is already a list (not string)
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    mock_emotion = MagicMock()
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Happiness"
    mock_emotion.definition = "Happy"
    mock_emotion.vac_vector = [0.8, 0.8, 0.8]  # Direct list

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result

    details = await generator._get_emotion_details("Joy", use_emotion_mapping=False)
    assert details["vac"] == [0.8, 0.8, 0.8]


@pytest.mark.asyncio
async def test_get_emotion_details_resolver_exception(generator, mock_db):
    # Test line 275-276: Exception handler
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    with patch("app.services.insights.core.EmotionResolver") as MockResolver:
        mock_instance = MockResolver.return_value

        # Resolver succeeds
        mapping = MagicMock()
        mapping.emotion_name = "Joy"
        mapping.emotion_id = str(uuid4())
        mapping.match_method = "semantic"
        mock_instance.resolve_emotion = AsyncMock(return_value=mapping)

        # DB fails
        mock_db.execute.side_effect = Exception("DB Fetch Error")

        details = await generator._get_emotion_details("Joy", use_emotion_mapping=True)
        assert details is None


def test_format_recommendations_empty(generator):
    # Test lines 288->309 and 310->330 (Empty lists)
    recs = {"similar_emotions": [], "curated_journeys": []}
    formatted = generator._format_recommendations(recs, "warm")
    assert formatted == []

    # Partial empty
    recs_similar = {"similar_emotions": [{"name": "A", "category": "B"}], "curated_journeys": []}
    formatted_sim = generator._format_recommendations(recs_similar, "warm")
    assert len(formatted_sim) == 1
    assert formatted_sim[0]["type"] == "similar_emotions"

    assert formatted_sim[0]["type"] == "similar_emotions"


@pytest.mark.asyncio
async def test_get_emotion_details_exact_match_no_vac(generator, mock_db):
    # Test line 226->232: vac_vector is None
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    mock_emotion = MagicMock()
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Happiness"
    mock_emotion.definition = "Def"
    mock_emotion.vac_vector = None

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result

    res = await generator._get_emotion_details("Joy", use_emotion_mapping=False)
    assert res["vac"] is None


@pytest.mark.asyncio
async def test_get_emotion_details_exact_match_not_found(generator, mock_db):
    # Test line 244: Emotion not found (exact)
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    res = await generator._get_emotion_details("Joy", use_emotion_mapping=False)
    assert res is None


@pytest.mark.asyncio
async def test_get_emotion_details_resolver_found_but_db_miss(generator, mock_db):
    # Test line 260->278: Resolver finds mapping, but DB lookup fails/returns None
    if isinstance(generator._get_emotion_details, AsyncMock):
        del generator._get_emotion_details

    with patch("app.services.insights.core.EmotionResolver") as MockResolver:
        mock_instance = MockResolver.return_value

        mapping = MagicMock()
        mapping.emotion_name = "Joy"
        mapping.emotion_id = str(uuid4())
        mock_instance.resolve_emotion = AsyncMock(return_value=mapping)

        # DB returns None for the mapped ID
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        res = await generator._get_emotion_details("Joy", use_emotion_mapping=True)
        assert res is None
