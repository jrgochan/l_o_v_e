import pytest
import datetime
import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.services.insight_generator import InsightGenerator
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    # FIX: db.execute(...) returns a coroutine, which returns a Result object (MagicMock)
    mock_db.execute.return_value = MagicMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_db.refresh = AsyncMock()
    # Flush is async
    mock_db.flush = AsyncMock()
    return mock_db

@pytest.fixture
def insight_generator_service(mock_db):
    return InsightGenerator(mock_db)

@pytest.fixture
def insight_generator():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock())
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.flush = AsyncMock()
    return InsightGenerator(mock_db)

class MockAsyncDb:
    def __init__(self, result=None, exception=None):
        self.result = result
        self.exception = exception
        
    async def execute(self, *args, **kwargs):
        if self.exception:
            raise self.exception
        return self.result

@pytest.mark.asyncio
async def test_get_emotion_details_no_vac_vector(insight_generator):
    """Test when emotion found but has no VAC vector."""
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        mapping_result = MagicMock(
            atlas_name="Joy", 
            atlas_id=str(uuid4()), 
            vac=[0.8, 0.5, 0.2], 
            match_method="exact", 
            match_confidence=0.9
        )
        MockMapper.return_value.map_emotion = AsyncMock(return_value=mapping_result)
        
        mock_emotion = MagicMock(
            id=uuid4(),
            emotion_name="Joy",
            category="Happiness",
            definition="A feeling of great pleasure.",
            vac_vector=None
        )
        mock_db_result = MagicMock()
        mock_db_result.scalar_one_or_none.return_value = mock_emotion
        
        insight_generator.db = MockAsyncDb(result=mock_db_result)
        
        details = await insight_generator._get_emotion_details("Joy", [0.8, 0.5, 0.2], use_atlas_mapping=True)
        assert details["name"] == "Joy"
        assert details["vac"] == [0.8, 0.5, 0.2]

@pytest.mark.asyncio
async def test_get_emotion_details_db_exception(insight_generator):
    """Test DB exception handling in emotion details."""
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        MockMapper.return_value.map_emotion = AsyncMock(
            return_value=MagicMock(atlas_name="Joy", atlas_id=str(uuid4()))
        )
        
        insight_generator.db = MockAsyncDb(exception=Exception("DB Fail"))
        
        details = await insight_generator._get_emotion_details("Joy", use_atlas_mapping=True)
        assert details is None

@pytest.mark.asyncio
async def test_get_emotion_details_not_found_after_map(insight_generator):
    """Test mapping returns ID but DB returns None."""
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        MockMapper.return_value.map_emotion = AsyncMock(
            return_value=MagicMock(atlas_name="Joy", atlas_id=str(uuid4()))
        )
        
        mock_db_result = MagicMock()
        mock_db_result.scalar_one_or_none.return_value = None
        
        insight_generator.db = MockAsyncDb(result=mock_db_result)
        
        details = await insight_generator._get_emotion_details("Joy", use_atlas_mapping=True)
        assert details is None

@pytest.mark.asyncio
async def test_recommendations_no_emotion_id(insight_generator):
    """Test generate_insights skipping recommendations if emotion has no ID."""
    with patch.object(insight_generator, "_get_emotion_details") as mock_get:
        mock_get.return_value = {
            "id": None, 
            "name": "Joy", 
            "category": "Happiness", 
            "definition": "Def", 
            "vac": [0.8, 0.5, 0.2]
        }
        
        with patch("app.services.insight_generator.SessionAnalyticsService"):
            res = await insight_generator.generate_insights(
                "Joy", {"valence": 0.8, "arousal": 0.5, "connection": 0.2}, 0.9, "warm"
            )
            assert "recommendations" not in res or res["recommendations"] == []

@pytest.mark.asyncio
async def test_vac_analysis_quadrants(insight_generator):
    """Test VAC analysis quadrant logic."""
    # 1. Low Positive (Calm)
    vac_calm = {"valence": 0.5, "arousal": -0.5, "connection": 0.5}
    analysis = insight_generator._analyze_vac_coordinates(vac_calm, "warm")
    assert "Low positive energy" in analysis["quadrant"]
    
    # 2. High Negative (Anxious)
    vac_anxious = {"valence": -0.5, "arousal": 0.5, "connection": 0.5}
    analysis2 = insight_generator._analyze_vac_coordinates(vac_anxious, "warm")
    assert "High negative energy" in analysis2["quadrant"]
    
    # 3. Low Negative (Depressed) 
    vac_depressed = {"valence": -0.5, "arousal": -0.5, "connection": 0.5}
    analysis3 = insight_generator._analyze_vac_coordinates(vac_depressed, "warm")
    assert "Low negative energy" in analysis3["quadrant"]

def test_generate_voice_metrics_missing_keys(insight_generator):
    """Test voice metrics generation with partial data."""
    # Missing pitch_mean
    prosody_no_pitch = {"energy": 0.5, "rate": 4.0}
    summary = insight_generator._generate_clinical_summary(
        {"name": "Joy", "definition": "Def", "category": "Happ"}, 
        {"valence": 0.5, "arousal": 0.5, "connection": 0.5}, 
        0.9,
        prosody_no_pitch, 
        None
    )
    assert "**Voice Characteristics:**" in summary
    assert "Pitch:" not in summary
    assert "Energy:" in summary
    
@pytest.mark.asyncio
async def test_insight_voice_metrics_normal():
    """Test 'stable' ranges for voice metrics."""
    with patch("app.services.insight_generator.AsyncSession", autospec=True):
        generator = InsightGenerator(AsyncMock())
        prosody = {"energy": 0.5, "rate": 4.0, "jitter": 0.01, "shimmer": 0.03}
        
        if hasattr(generator, "_generate_voice_metrics_clinical"):
            metrics = generator._generate_voice_metrics_clinical(prosody)
            energy_m = next(m for m in metrics if m["label"] == "Energy Level")
            assert energy_m["status"] == "stable"
            assert "Appropriate" in energy_m["interpretation"]

@pytest.mark.asyncio
async def test_get_emotion_details_no_vac_vector_direct():
    """Test _get_emotion_details where emotion has no VAC vector (direct lookup)."""
    mock_session = AsyncMock()
    generator = InsightGenerator(mock_session)
    
    emotion = MagicMock(spec=AtlasDefinition, id=1, emotion_name="Joy", vac_vector=None)
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = emotion
    mock_session.execute.return_value = mock_res
    
    details = await generator._get_emotion_details("Joy", use_atlas_mapping=False)
    assert details["vac"] is None
@pytest.mark.asyncio
async def test_generate_insights_warm_flow(insight_generator_service, mock_db):
    """Test standard warm mode flow."""
    emotion_name = "Joy"
    vac_data = {"valence": 0.8, "arousal": 0.5, "connection": 0.6}
    confidence = 0.95
    prosody_data = {"energy": 0.8, "rate": 4.5}
    
    with patch.object(insight_generator_service, '_get_emotion_details') as mock_get_details:
        mock_get_details.return_value = {
            "id": uuid4(),
            "name": "Joy",
            "category": "Happiness",
            "definition": "A feeling of great pleasure and happiness.",
        }
        insight_generator_service.recommendation_engine.get_recommendations.return_value = {
            "similar_emotions": [{"name": "Delight", "category": "Happiness"}]
        }
        
        res = await insight_generator_service.generate_insights(
            emotion_name, vac_data, confidence, tone_mode="warm", prosody_data=prosody_data
        )
        
        assert res["mode"] == "warm"
        assert "opening" in res
        assert "voice_observations" in res
        assert "session_analytics" not in res 


@pytest.mark.asyncio
async def test_generate_insights_clinical_flow_with_analytics(insight_generator_service, mock_db):
    """Test clinical mode flow with session integration."""
    emotion_name = "Anxiety"
    vac_data = {"valence": -0.5, "arousal": 0.8, "connection": -0.2}
    confidence = 0.85
    session_id = str(uuid4())
    
    with patch.object(insight_generator_service, '_get_emotion_details') as mock_get_details, \
         patch("app.services.insight_generator.SessionAnalyticsService") as MockAnalyticsService, \
         patch("app.services.insight_generator.ClinicalAlertService") as MockAlertService:
            
        mock_get_details.return_value = {
            "id": uuid4(),
            "name": "Anxiety",
            "category": "Fear",
            "definition": "A feeling of worry, nervousness, or unease.",
        }
        
        mock_analytics_svc = MockAnalyticsService.return_value
        mock_analytics_svc.get_or_create = AsyncMock()
        mock_analytics_svc.get_or_create.return_value.emotion_count = 5
        mock_analytics_svc.update_metrics = AsyncMock()
        mock_analytics_svc.update_metrics.return_value.to_dict.return_value = {"metrics": "test"}
        
        mock_alert_svc = MockAlertService.return_value
        mock_alert_svc.evaluate_alerts = AsyncMock(return_value=[])
        mock_alert_svc.determine_overall_status = MagicMock(return_value="stable")
        
        # FIX: update_metrics is AsyncMock, returns MagicMock when awaited
        mock_metrics_result = MagicMock() 
        mock_metrics_result.to_dict.return_value = {"metrics": "test"}
        mock_analytics_svc.update_metrics.return_value = mock_metrics_result

        res = await insight_generator_service.generate_insights(
            emotion_name, vac_data, confidence, tone_mode="clinical", session_id=session_id
        )
        
        assert res["mode"] == "clinical"
        assert "vac_assessment" in res
        assert "clinical_recommendations" in res
        assert res["overall_status"] == "stable"
        assert "session_analytics" in res
        mock_analytics_svc.update_metrics.assert_called_once()


@pytest.mark.asyncio
async def test_generate_insights_errors_graceful(insight_generator):
    """Test error handling in recommendations and analytics."""
    vac_data = {"valence": 0, "arousal": 0, "connection": 0}
    with patch.object(insight_generator, '_get_emotion_details') as mock_get_details:
        mock_get_details.return_value = {
            "id": uuid4(), 
            "name": "Test", 
            "category": "Test",
            "definition": "Test definition"
        }
        
        # Mock recommendation engine on the instance
        # Mock recommendation engine on the instance
        async def raise_rec_fail(*args, **kwargs):
            raise Exception("RecFail")
        insight_generator.recommendation_engine.get_recommendations = raise_rec_fail
        
        
        # Mock session analytics (class patch)
        with patch("app.services.insight_generator.SessionAnalyticsService") as MockAnalyticsService:
            MockAnalyticsService.side_effect = Exception("AnalyticsFail")
            res = await insight_generator.generate_insights("Test", vac_data, 1.0, session_id="sess1")
            
            assert res["emotion"] == "Test"
            assert res["recommendations"] == []
            assert "session_analytics" not in res


@pytest.mark.asyncio
async def test_get_emotion_details_logic(insight_generator_service, mock_db):
    """Test emotion lookup logic."""
    mock_emotion = MagicMock()
    mock_emotion.vac_vector = [0.1, 0.2, 0.3]
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Test"
    mock_emotion.definition = "Def"
    mock_emotion.id = uuid4()
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_res
    
    res1 = await insight_generator_service._get_emotion_details("Joy", use_atlas_mapping=False)
    assert res1["name"] == "Joy"
    assert res1["vac"] == [0.1, 0.2, 0.3]
    
    mock_emotion.vac_vector = json.dumps([0.5, 0.5, 0.5])
    res2 = await insight_generator_service._get_emotion_details("Joy", use_atlas_mapping=False)
    assert res2["vac"] == [0.5, 0.5, 0.5]
    
    mock_res.scalar_one_or_none.return_value = None
    res3 = await insight_generator_service._get_emotion_details("Unknown", use_atlas_mapping=False)
    assert res3 is None
    
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        mock_map_res = MagicMock()
        mock_map_res.atlas_name = "MappedJoy"
        mock_map_res.atlas_id = str(uuid4())
        mock_map_res.vac = [0.9, 0.9, 0.9]
        mock_map_res.match_method = "fuzzy"
        MockMapper.return_value.map_emotion = AsyncMock(return_value=mock_map_res)
        
        mock_res.scalar_one_or_none.return_value = mock_emotion
        res4 = await insight_generator_service._get_emotion_details("Joyful", use_atlas_mapping=True)
        assert res4["name"] == "Joy"
        assert res4["matched_by"] == "fuzzy"


@pytest.mark.asyncio
async def test_fallback_insights_coverage(insight_generator):
    """Test fallback generation."""
    vac_data = {"valence": 0, "arousal": 0, "connection": 0}
    with patch.object(insight_generator, '_get_emotion_details') as mock_get:
        mock_get.return_value = None
        res = await insight_generator.generate_insights("Unknown", vac_data, 0.0)
        assert res["summary"].startswith("Detected emotion 'Unknown' but unable")


@pytest.mark.asyncio
async def test_private_helpers_coverage(insight_generator):
    """Coverage for helpers not fully exercised by main flows."""
    assert "positive" in insight_generator._interpret_valence(0.8)
    assert "negative" in insight_generator._interpret_valence(-0.8)
    assert "high" in insight_generator._interpret_arousal(0.8)
    assert "low" in insight_generator._interpret_arousal(-0.8)
    assert insight_generator._value_to_percentile(-1) == 0
    assert insight_generator._value_to_percentile(0) == 50
    assert insight_generator._value_to_percentile(1) == 100
    risk_vac = {"valence": -0.8, "arousal": 0.8, "connection": -0.7} 
    risks = insight_generator._assess_risk_indicators(risk_vac)
    assert len(risks) >= 2


@pytest.mark.asyncio
async def test_generate_insights_prosody_coverage(insight_generator_service, mock_db):
    """Cover all branches of voice metrics interpretation."""
    emotion_name = "Joy"
    vac_data = {"valence": 0.5, "arousal": 0.5, "connection": 0.5}
    confidence = 0.9
    
    with patch.object(insight_generator_service, '_get_emotion_details') as mock_get:
        mock_get.return_value = {"id": uuid4(), "name": "Joy", "category": "Happiness", "definition": "Def"}
        
        prosody_low = {"energy": 0.1, "pitch_mean": 90.0, "rate": 2.0, "jitter": 0.03, "shimmer": 0.07}
        res_low = await insight_generator_service.generate_insights(
            emotion_name, vac_data, confidence, tone_mode="clinical", prosody_data=prosody_low
        )
        metrics = {m["label"]: m for m in res_low["voice_metrics"]}
        assert "Depressed" in metrics["Pitch (F0)"]["interpretation"]
        assert "Low vocal intensity" in metrics["Energy Level"]["interpretation"]
        assert "Slowed speech" in metrics["Speech Rate"]["interpretation"]
        assert "Elevated" in metrics["Jitter"]["interpretation"]
        assert "Elevated" in metrics["Shimmer"]["interpretation"]
        
        prosody_high = {"energy": 0.9, "pitch_mean": 200.0, "rate": 6.0, "jitter": 0.01, "shimmer": 0.01}
        res_high = await insight_generator_service.generate_insights(
            emotion_name, vac_data, confidence, tone_mode="clinical", prosody_data=prosody_high
        )
        metrics = {m["label"]: m for m in res_high["voice_metrics"]}
        assert "Elevated" in metrics["Pitch (F0)"]["interpretation"]
        assert "High vocal intensity" in metrics["Energy Level"]["interpretation"]
        assert "Accelerated speech" in metrics["Speech Rate"]["interpretation"]


@pytest.mark.asyncio
async def test_voice_content_correlation_branches(insight_generator):
    """Test voice-content alignment branches."""
    prosody = {"energy": 0.9}
    vac = {"arousal": -0.8}
    corr = insight_generator._analyze_voice_content_correlation(prosody, vac, tone_mode="warm")
    assert not corr["aligned"]
    
    prosody = {"energy": 0.1}
    vac = {"arousal": 0.8}
    corr = insight_generator._analyze_voice_content_correlation(prosody, vac, tone_mode="warm")
    assert not corr["aligned"]
    
    corr_clin = insight_generator._analyze_voice_content_correlation(prosody, vac, tone_mode="clinical")
    assert "Significant discrepancy" in corr_clin["interpretation"]
    # Missing energy
    prosody_no_energy = {"pitch_mean": 150, "rate": 4.0}
    summary2 = insight_generator._generate_clinical_summary(
        {"name": "Joy", "definition": "Def", "category": "Happ"}, 
        {"valence": 0.5, "arousal": 0.5, "connection": 0.5}, 
        0.9,
        prosody_no_energy, 
        None
    )
    assert "Energy:" not in summary2
    assert "Pitch:" in summary2

def test_generate_guidance_coverage(insight_generator):
    """Test all branches of guidance generation."""
    emotion = {"name": "Test"}
    
    # Clinical: Low Connection (< -0.3)
    g1 = insight_generator._generate_guidance(
        emotion, {"connection": -0.4, "arousal": 0.0, "valence": 0.0}, "clinical"
    )
    assert "Disconnection pattern" in g1
    
    # Clinical: High Connection (> 0.5)
    g2 = insight_generator._generate_guidance(
        emotion, {"connection": 0.6, "arousal": 0.0, "valence": 0.0}, "clinical"
    )
    assert "Strong connection" in g2
    
    # Warm: Low Arousal (< -0.5)
    g3 = insight_generator._generate_guidance(
        emotion, {"arousal": -0.6, "valence": 0.0, "connection": 0.0}, "warm"
    )
    assert "Low energy can be a signal" in g3
    
    # Warm: Low Connection (< -0.3)
    g4 = insight_generator._generate_guidance(
        emotion, {"connection": -0.4, "arousal": 0.0, "valence": 0.0}, "warm"
    )
    assert "Feeling disconnected" in g4
    
    # Interpret Connection: Very low (<= -0.5)
    interp = insight_generator._interpret_connection(-0.6)
    assert "Strongly disconnected" in interp

@pytest.mark.asyncio
async def test_generate_clinical_structure_reasoning(insight_generator):
    """Test reasoning inclusion in clinical structure."""
    with patch.object(insight_generator, "_get_emotion_details") as mock_get:
        mock_get.return_value = {
            "id": uuid4(), "name": "Joy", "category": "Happiness", "definition": "Def", "vac": [0.8, 0.5, 0.2]
        }
        
        res = await insight_generator.generate_insights(
            "Joy", {"valence": 0.8, "arousal": 0.5, "connection": 0.2}, 0.9, "clinical", reasoning="Because I said so"
        )
        assert res.get("analysis_reasoning") == "Because I said so"

@pytest.mark.asyncio
async def test_generate_warm_opening(insight_generator_service):
    # Test various valence ranges
    assert "completely valid" in insight_generator_service._generate_warm_opening("Anxiety", -0.5)
    assert "wonderful" in insight_generator_service._generate_warm_opening("Joy", 0.8)
    assert "meaningful" in insight_generator_service._generate_warm_opening("Contentment", 0.2)
    
    # Test context logic
    assert "protect you" in insight_generator_service._generate_warm_opening("Anxiety", -0.5)
    assert "lights you up" in insight_generator_service._generate_warm_opening("Excitement", 0.8)

@pytest.mark.asyncio
async def test_generate_voice_observations_warm(insight_generator_service):
    # High energy/pitch
    obs = insight_generator_service._generate_voice_observations_warm(
        {"energy": 0.8, "pitch_mean": 180}, {}
    )
    assert any("energy and tension" in o for o in obs)
    
    # Low energy
    obs = insight_generator_service._generate_voice_observations_warm(
        {"energy": 0.2, "pitch_mean": 100}, {}
    )
    assert any("heaviness" in o for o in obs)

@pytest.mark.asyncio
async def test_generate_clinical_opening(insight_generator_service):
    opening = insight_generator_service._generate_clinical_opening("Anxiety", 0.9, "Fear")
    assert "High confidence detection" in opening
    assert "90%" in opening
    assert "Fear category" in opening

@pytest.mark.asyncio
async def test_generate_voice_metrics_clinical(insight_generator_service):
    data = {"pitch_mean": 190, "energy": 0.8, "rate": 6.0, "jitter": 0.03}
    metrics = insight_generator_service._generate_voice_metrics_clinical(data)
    
    # Verify structure
    assert len(metrics) > 0
    pitch = next(m for m in metrics if m["label"] == "Pitch (F0)")
    assert pitch["status"] == "attention"
    assert "Elevated" in pitch["interpretation"]

@pytest.mark.asyncio
async def test_assess_risk_indicators(insight_generator_service):
    # High risk case
    vac = {"valence": -0.8, "arousal": 0.9, "connection": -0.7}
    indicators = insight_generator_service._assess_risk_indicators(vac)
    assert any("High arousal + negative valence" in i for i in indicators)
    assert any("isolation risk" in i for i in indicators)
    
    # Low risk case
    vac_safe = {"valence": 0.5, "arousal": 0.0, "connection": 0.5}
    indicators = insight_generator_service._assess_risk_indicators(vac_safe)
    assert len(indicators) == 0

@pytest.mark.asyncio
async def test_generate_insights_warm_flow(insight_generator_service, mock_db):
    # Mock AtlasMapper
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        mapper = AsyncMock()
        MockMapper.return_value = mapper
        
        mock_def = AtlasDefinition(id=uuid4(), emotion_name="Joy", definition="Happiness")
        mapping = MagicMock()
        mapping.atlas_id = str(mock_def.id)
        mapping.atlas_name = "Joy"
        mapper.map_emotion.return_value = mapping
        
        # Mock DB execute for _get_emotion_details
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_def
        mock_db.execute.return_value = result_mock
        
        # Run generation
        insights = await insight_generator_service.generate_insights(
            emotion_name="Joy",
            vac_data={"valence": 0.8, "arousal": 0.5, "connection": 0.6},
            confidence=0.9,
            tone_mode="warm",
            prosody_data={"energy": 0.7}
        )
        
        assert insights["mode"] == "warm"
        assert "opening" in insights
        assert "gentle_invitations" in insights
        assert len(insights["gentle_invitations"]) >= 2

@pytest.mark.asyncio
async def test_generate_insights_clinical_flow(insight_generator_service, mock_db):
    # Mock AtlasMapper
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        mapper = AsyncMock()
        MockMapper.return_value = mapper
        
        mock_def = AtlasDefinition(id=uuid4(), emotion_name="Anxiety", definition="Worry", category="Fear")
        mapping = MagicMock()
        mapping.atlas_id = str(mock_def.id)
        mapping.atlas_name = "Anxiety"
        mapper.map_emotion.return_value = mapping
        
        # Mock DB execute for _get_emotion_details
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = mock_def
        mock_db.execute.return_value = result_mock
        
        # Test clinical flow with session_id to trigger alerts
        with patch("app.services.insight_generator.ClinicalAlertService") as MockAlerts:
            alert_service = AsyncMock()
            MockAlerts.return_value = alert_service
            
            with patch("app.services.insight_generator.SessionAnalyticsService") as MockAnalytics:
                analytics_service = AsyncMock()
                # Ensure update_metrics returns something with to_dict
                metrics_result = MagicMock()
                metrics_result.to_dict.return_value = {"msg_count": 5}
                # FIX: return_value of AsyncMock is what is returned when awaited
                analytics_service.update_metrics.return_value = metrics_result
                
                MockAnalytics.return_value = analytics_service
                
                insights = await insight_generator_service.generate_insights(
                    emotion_name="Anxiety",
                    vac_data={"valence": -0.6, "arousal": 0.8, "connection": -0.2},
                    confidence=0.9,
                    tone_mode="clinical",
                    session_id="session123"
                )
                
                assert insights["mode"] == "clinical"
                assert "vac_assessment" in insights
                assert "risk_indicators" in insights["vac_assessment"]
                
                # Check alert service called
                alert_service.evaluate_alerts.assert_awaited()
                # Check analytics called
                analytics_service.update_metrics.assert_called()

@pytest.mark.asyncio
async def test_generate_insights_no_mapping(insight_generator_service, mock_db):
    # Test fallback when AtlasMapper returns no ID
    with patch("app.services.insight_generator.AtlasMapper") as MockMapper:
        mapper = MagicMock()
        mapper.map_emotion = AsyncMock()
        MockMapper.return_value = mapper
        mapping = MagicMock()
        mapping.atlas_name = None  # Explicitly None to trigger fallback
        mapping.atlas_id = None
        mapper.map_emotion.return_value = mapping
        
        insights = await insight_generator_service.generate_insights(
            emotion_name="UnknownEmotion",
            vac_data={"valence": 0, "arousal": 0, "connection": 0},
            confidence=0.5
        )
        
        # Should still generate basic insights
        assert insights["emotion"] == "UnknownEmotion"
        assert "summary" in insights

@pytest.mark.asyncio
@pytest.mark.filterwarnings("ignore::RuntimeWarning")
async def test_generate_clinical_recommendations(insight_generator_service):
    """Test clinical recommendation triggers."""
    # Arousal Reduction
    recs = insight_generator_service._generate_clinical_recommendations(
        "Any", {"valence": 0, "arousal": 0.7, "connection": 0}, "Cat"
    )
    assert any(r["title"] == "Arousal Reduction" for r in recs)
    
    # Activation Strategy
    recs = insight_generator_service._generate_clinical_recommendations(
        "Any", {"valence": 0, "arousal": -0.7, "connection": 0}, "Cat"
    )
    assert any(r["title"] == "Activation Strategy" for r in recs)
    
    # Mood Assessment
    recs = insight_generator_service._generate_clinical_recommendations(
        "Any", {"valence": -0.6, "arousal": 0, "connection": 0}, "Cat"
    )
    assert any(r["title"] == "Mood Assessment" for r in recs)
    
    # Social Connection
    recs = insight_generator_service._generate_clinical_recommendations(
        "Any", {"valence": 0, "arousal": 0, "connection": -0.5}, "Cat"
    )
    assert any(r["title"] == "Social Connection" for r in recs)
    
    # Anxiety specific
    recs = insight_generator_service._generate_clinical_recommendations(
        "Anxiety", {"valence": 0, "arousal": 0, "connection": 0}, "Cat"
    )
    assert any(r["title"] == "Anxiety Management" for r in recs)
    
    # Depression specific
    recs = insight_generator_service._generate_clinical_recommendations(
        "Depression", {"valence": 0, "arousal": 0, "connection": 0}, "Cat"
    )
    assert any(r["title"] == "Depression Screening" for r in recs)

@pytest.mark.asyncio
async def test_insight_generation_error_resilience(insight_generator_service, mock_db):
    """Test graceful degradation when dependencies fail."""
    
    # Mock _get_emotion_details to return something valid so we reach later steps
    async def get_details_mock(*args, **kwargs):
        return {
            "id": uuid4(), "name": "Joy", "category": "Happiness", "definition": "Def", "vac": [0.8, 0.5, 0.6]
        }
    
    with patch.object(insight_generator_service, '_get_emotion_details', side_effect=get_details_mock):
        
        # 1. Message Count Error
        # Mock SessionAnalyticsService to raise error on init
        with patch('app.services.insight_generator.SessionAnalyticsService', side_effect=Exception("Analytics Down")):
             # 2. Recommendations Error
            async def raise_recs_down(*args, **kwargs):
                raise Exception("Recs Down")
            # We don't replace the whole engine with AsyncMock, just the method
            insight_generator_service.recommendation_engine.get_recommendations = raise_recs_down
            
            # 3. Clinical Alerts Error
            with patch('app.services.insight_generator.ClinicalAlertService', side_effect=Exception("Alerts Down")):
                
                # Run generation
                insights = await insight_generator_service.generate_insights(
                    "Joy", {"valence": 0.8, "arousal": 0.5, "connection": 0.6}, 0.9, session_id="sess1"
                )
                
                # Should still return basic insights despite failures
                assert insights["emotion"] == "Joy"
                assert insights["recommendations"] == [] # Fallback
                assert insights.get("clinical_alerts") == [] # Fallback

@pytest.mark.asyncio
async def test_voice_observations_low_rate(insight_generator_service):
    """Test voice observation for low speech rate."""
    prosody = {"rate": 2.5} # < 3.0
    vac = {"arousal": 0}
    obs = insight_generator_service._generate_voice_observations(prosody, vac)
    assert "**I notice:**" in obs
    assert "speaking slowly and deliberately" in obs

@pytest.mark.asyncio
async def test_format_recommendations_full(insight_generator_service):
    """Test format recommendations with both similar emotions and journeys."""
    raw_recs = {
        "similar_emotions": [
            {"name": "Sim1", "category": "Cat1", "distance": 0.1},
            {"name": "Sim2", "category": "Cat2", "distance": 0.2}
        ],
        "curated_journeys": [
            {"from": {"name": "Start"}, "to": {"name": "End"}, "description": "Desc"}
        ]
    }
    
    formatted = insight_generator_service._format_recommendations(raw_recs, tone_mode="warm")
    assert len(formatted) == 2
    
    sim_block = next(item for item in formatted if item["type"] == "similar_emotions")
    assert sim_block["title"] == "You might also be feeling..."
    assert len(sim_block["items"]) == 2
    
    journey_block = next(item for item in formatted if item["type"] == "journeys")
    assert journey_block["title"] == "Paths to explore..."

def test_insight_generator_slow_speech():
    """
    Test InsightGenerator._generate_voice_observations for slow speech.
    Covers line 1241: elif rate < 3.0:
    """
    insight_generator_service = InsightGenerator(MagicMock())
    prosody_data = {"rate": 2.0}
    vac_data = {}
    
    # Correct method name found via view_file
    obs = insight_generator_service._generate_voice_observations(prosody_data, vac_data)
    
    assert "speaking slowly" in obs

def test_insight_generator_with_journeys():
    """
    Test InsightGenerator._format_recommendations with curated journeys.
    Covers line 1378: if journeys:
    """
    insight_generator_service = InsightGenerator(MagicMock())
    recs = {
        "curated_journeys": [
            {
                "from": {"name": "Sadness"},
                "to": {"name": "Joy"},
                "description": "A path to joy"
            }
        ]
    }
    
    formatted = insight_generator_service._format_recommendations(recs, tone_mode="general")
    
    journey_section = next((item for item in formatted if item["type"] == "journeys"), None)
    assert journey_section is not None
    assert len(journey_section["items"]) == 1
    assert journey_section["items"][0]["from"] == "Sadness"

def test_insight_generator_no_journeys():
    """
    Test InsightGenerator._format_recommendations with NO curated journeys.
    Covers line 1378->1396 (False branch).
    """
    insight_generator_service = InsightGenerator(MagicMock())
    recs = {
        "curated_journeys": [] # Empty list
    }
    
    formatted = insight_generator_service._format_recommendations(recs, tone_mode="general")
    
    journey_section = next((item for item in formatted if item["type"] == "journeys"), None)
    assert journey_section is None

def test_insight_generator_normal_speech():
    """
    Test InsightGenerator for normal speech rate (falls through logic).
    Covers implicit else for rate checks (1241->1244).
    """
    insight_generator_service = InsightGenerator(MagicMock())
    prosody_data = {"rate": 4.0}
    vac_data = {}
    
    obs = insight_generator_service._generate_voice_observations(prosody_data, vac_data)
    
    # Should not contain slow or fast observations
    assert "speaking slowly" not in obs
    assert "speaking quickly" not in obs

def test_insight_generator_high_energy_arousal():
    """Test observation for high energy and arousal."""
    insight_generator_service = InsightGenerator(MagicMock())
    prosody = {"energy": 0.8}
    vac = {"arousal": 0.6}
    obs = insight_generator_service._generate_voice_observations(prosody, vac)
    assert "intensity" in obs

def test_insight_generator_low_energy_arousal():
    """Test observation for low energy and arousal."""
    insight_generator_service = InsightGenerator(MagicMock())
    prosody = {"energy": 0.2}
    vac = {"arousal": -0.1}
    obs = insight_generator_service._generate_voice_observations(prosody, vac)
    assert "quiet or subdued" in obs

def test_insight_generator_fast_speech():
    """Test observation for fast speech rate."""
    insight_generator_service = InsightGenerator(MagicMock())
    prosody = {"rate": 6.0}
    vac = {}
    obs = insight_generator_service._generate_voice_observations(prosody, vac)
    assert "speaking quickly" in obs

def test_insight_generator_no_observations():
    """Test no observations generated (normal values)."""
    insight_generator_service = InsightGenerator(MagicMock())
    prosody = {"energy": 0.5, "rate": 4.0}
    vac = {"arousal": 0.0}
    obs = insight_generator_service._generate_voice_observations(prosody, vac)
    assert obs == ""
