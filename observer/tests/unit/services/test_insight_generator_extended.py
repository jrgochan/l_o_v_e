
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.insight_generator import InsightGenerator
from app.models.emotion_definition import EmotionDefinition

@pytest.fixture
def mock_db():
    db = AsyncMock(spec=AsyncSession)
    db.execute = AsyncMock(return_value=MagicMock())
    return db

@pytest.fixture
def generator(mock_db):
    with patch("app.services.insight_generator.logger", new_callable=MagicMock) as mock_logger:
        yield InsightGenerator(mock_db)

@pytest.mark.asyncio
async def test_get_emotion_details_exact_match(generator, mock_db):
    """Test standard exact match retrieval."""
    mock_emotion = MagicMock()
    mock_emotion.id = uuid4()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Happiness"
    mock_emotion.definition = "Def"
    mock_emotion.vac_vector = [1.0, 0.5, 0.5] # List format
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result
    
    details = await generator._get_emotion_details("Joy", use_emotion_mapping=False)
    assert details["name"] == "Joy"
    assert details["matched_by"] == "exact"
    assert details["vac"] == [1.0, 0.5, 0.5]

@pytest.mark.asyncio
async def test_get_emotion_details_vac_string_parsing(generator, mock_db):
    """Test parsing of VAC vector stored as string."""
    mock_emotion = MagicMock()
    mock_emotion.vac_vector = "[0.5, 0.5, 0.5]" # String format
    mock_emotion.emotion_name = "Joy"
    mock_emotion.category = "Happiness"
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result
    
    details = await generator._get_emotion_details("Joy", use_emotion_mapping=False)
    assert details["vac"] == [0.5, 0.5, 0.5]

@pytest.mark.asyncio
async def test_interpret_methods_edge_cases(generator):
    """Test middle ranges of interpretation methods."""
    # Valence 0.0 -> Neutral > -0.1
    assert generator._interpret_valence(0.0) == "Neutral"
    assert generator._interpret_valence(-0.2) == "Somewhat negative"
    
    # Arousal
    assert generator._interpret_arousal(0.0) == "Moderate energy"
    assert generator._interpret_arousal(-0.2) == "Somewhat low energy"
    
    # Connection
    assert generator._interpret_connection(0.0) == "Neutral connection"
    assert generator._interpret_connection(-0.2) == "Somewhat disconnected"

@pytest.mark.asyncio
async def test_generate_guidance_branches(generator):
    """Test all branches of guidance generation logic."""
    # Clinical High Arousal
    g1 = generator._generate_guidance(
        {"name": "Joy"}, {"arousal": 0.6, "valence": 0, "connection": 0}, "clinical"
    )
    assert "high arousal" in g1
    
    # Clinical Low Arousal
    g2 = generator._generate_guidance(
        {"name": "Sadness"}, {"arousal": -0.4, "valence": 0, "connection": 0}, "clinical"
    )
    assert "low arousal" in g2
    
    # Warm High Arousal + Negative
    g3 = generator._generate_guidance(
        {"name": "Anxiety"}, {"arousal": 0.8, "valence": -0.1, "connection": 0}, "warm"
    )
    assert "deep breaths" in g3
    
    # Warm Neutral/Fallback
    g4 = generator._generate_guidance(
        {"name": "Meh"}, {"arousal": 0, "valence": 0, "connection": 0}, "warm"
    )
    assert "valid" in g4

@pytest.mark.asyncio
async def test_analyze_voice_content_correlation_branches(generator):
    """Test all branches of voice/content correlation."""
    # Clinical Discrepancy (Energy 0.9 vs Arousal 0.0 -> norm 0.5. Diff 0.4. Wait.
    # Arousal 0.0 -> (0+1)/2 = 0.5. Energy 0.9. Diff 0.4. 
    # Logic: if diff > 0.5. 
    
    # Let's force diff > 0.5
    # Energy 0.9. Arousal -0.8 -> norm 0.1. Diff 0.8.
    
    corr = generator._analyze_voice_content_correlation(
        {"energy": 0.9}, {"arousal": -0.8}, "clinical"
    )
    assert "Significant discrepancy" in corr["interpretation"]
    
    # Warm Discrepancy (Voice > Content)
    corr2 = generator._analyze_voice_content_correlation(
        {"energy": 0.9}, {"arousal": -0.8}, "warm"
    )
    assert "more intensity than your words" in corr2["interpretation"]
    
    # Warm Discrepancy (Content > Voice)
    # Energy 0.1. Arousal 0.8 -> norm 0.9. Diff 0.8.
    corr3 = generator._analyze_voice_content_correlation(
        {"energy": 0.1}, {"arousal": 0.8}, "warm"
    )
    assert "managing intense feelings" in corr3["interpretation"]

@pytest.mark.asyncio
async def test_generate_clinical_summary_formatting(generator):
    """Test clinical summary text generation."""
    summary = generator._generate_clinical_summary(
        {"name": "Joy", "category": "Happiness", "definition": "Happy"},
        {"valence": 1, "arousal": 1, "connection": 1},
        0.9,
        {"pitch_mean": 200, "energy": 0.8}, # Prosody
        "Reasoning text"
    )
    
    assert "**Analysis: Joy**" in summary
    assert "Reasoning:" in summary
    assert "Voice Characteristics:" in summary
    assert "Pitch: 200.0 Hz" in summary

@pytest.mark.asyncio
async def test_generate_voice_metrics_clinical_branches(generator):
    """Test all voice metric branches."""
    # 1. Depressed/Low states
    metrics = generator._generate_voice_metrics_clinical({
        "pitch_mean": 90, # Low pitch
        "energy": 0.2,    # Low energy
        "rate": 2.0,      # Slow rate
        "jitter": 0.01,   # Normal
        "shimmer": 0.01   # Normal
    })
    
    pitch = next(m for m in metrics if m["label"] == "Pitch (F0)")
    assert pitch["status"] == "attention"
    assert "Depressed" in pitch["interpretation"]
    
    energy = next(m for m in metrics if m["label"] == "Energy Level")
    assert energy["status"] == "warning"
    
    rate = next(m for m in metrics if m["label"] == "Speech Rate")
    assert rate["status"] == "warning"

    # 2. Elevated/High states (jitter/shimmer)
    metrics2 = generator._generate_voice_metrics_clinical({
        "pitch_mean": 190, # High pitch
        "rate": 6.0,       # Fast rate
        "jitter": 0.03,    # High jitter
        "shimmer": 0.07    # High shimmer
    })
    
    pitch = next(m for m in metrics2 if m["label"] == "Pitch (F0)")
    assert pitch["status"] == "attention"
    
    jitter = next(m for m in metrics2 if m["label"] == "Jitter")
    assert jitter["status"] == "attention"
    
    shimmer = next(m for m in metrics2 if m["label"] == "Shimmer")
    assert shimmer["status"] == "attention"

@pytest.mark.asyncio
async def test_generate_vac_assessment_clinical_quadrants(generator):
    """Test all 4 clinical quadrants."""
    # Q1: High Pos
    q1 = generator._generate_vac_assessment_clinical({"valence": 1, "arousal": 1, "connection": 0})
    assert "Quadrant I" in q1["quadrant"]
    assert "Activated positive" in q1["clinical_note"]
    
    # Q2: High Neg
    q2 = generator._generate_vac_assessment_clinical({"valence": -1, "arousal": 1, "connection": 0})
    assert "Quadrant II" in q2["quadrant"]
    assert "Activated negative" in q2["clinical_note"]
    
    # Q3: Low Neg
    q3 = generator._generate_vac_assessment_clinical({"valence": -1, "arousal": -1, "connection": 0})
    assert "Quadrant III" in q3["quadrant"]
    assert "Deactivated negative" in q3["clinical_note"]
    
    # Q4: Low Pos
    q4 = generator._generate_vac_assessment_clinical({"valence": 1, "arousal": -1, "connection": 0})
    assert "Quadrant IV" in q4["quadrant"]
    assert "Deactivated positive" in q4["clinical_note"]

@pytest.mark.asyncio
async def test_assess_risk_indicators_branches(generator):
    """Test risk indicator branches."""
    # High Risk: High Arousal + Very Negative Valence
    indicators = generator._assess_risk_indicators({"valence": -0.6, "arousal": 0.8, "connection": 0})
    assert len(indicators) > 0
    assert "High arousal + negative valence" in indicators[0]
    
    # Connection Risk
    indicators2 = generator._assess_risk_indicators({"valence": 0, "arousal": 0, "connection": -0.8})
    assert len(indicators2) > 0
    assert "Significant disconnection" in indicators2[0]

@pytest.mark.asyncio
async def test_generate_warm_summary_branches(generator):
    """Test warm summary branches (connection, prosody)."""
    # 1. Connection < -0.3
    summary = generator._generate_warm_summary(
        {"name": "Lonely", "category": "Sadness", "definition": "Def"},
        {"valence": 0, "arousal": 0, "connection": -0.5},
        0.8, None, None
    )
    assert "disconnected or alone" in summary

    # 2. Prosody branches
    # High energy/arousal
    summary2 = generator._generate_warm_summary(
        {"name": "Anger", "category": "Anger", "definition": "Def"},
        {"valence": -0.5, "arousal": 0.8, "connection": 0},
        0.8, 
        {"energy": 0.8, "rate": 6.0}, 
        None
    )
    assert "lot of intensity" in summary2
    assert "speaking quickly" in summary2
    
    # Low energy/arousal
    summary3 = generator._generate_warm_summary(
        {"name": "Sadness", "category": "Sadness", "definition": "Def"},
        {"valence": -0.5, "arousal": -0.5, "connection": 0},
        0.8, 
        {"energy": 0.2, "rate": 2.0}, 
        None
    )
    assert "quiet or subdued" in summary3
    assert "speaking slowly" in summary3
