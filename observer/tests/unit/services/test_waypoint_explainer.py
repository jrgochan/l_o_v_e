import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.services.waypoint_explainer import WaypointExplainer
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_session():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def explainer(mock_session):
    return WaypointExplainer(mock_session)

@pytest.fixture
def sample_emotions():
    anger = AtlasDefinition(
        id=uuid4(),
        emotion_name="Anger",
        vac_vector=[-0.6, 0.8, -0.4], 
        category="When We Feel Wronged"
    )
    frustration = AtlasDefinition(
        id=uuid4(),
        emotion_name="Frustration", 
        vac_vector=[-0.4, 0.6, -0.2], 
        category="When We Feel Wronged"
    )
    calm = AtlasDefinition(
        id=uuid4(),
        emotion_name="Calm",
        vac_vector=[0.1, -0.5, 0.2], 
        category="When Life Is Good"
    )
    return anger, frustration, calm

@pytest.mark.asyncio
async def test_explain_waypoint_with_template(explainer, mock_session, sample_emotions):
    anger, frustration, calm = sample_emotions
    
    mock_result = MagicMock()
    # Mock row matching SQL query in explainer
    mock_row = (
        "Purpose", "Order", "Enables", 
        ["Changed"], "Necessary", 
        ["NextEnabled"], "Prepares", 
        ["Ready1"], ["Warn1"], 
        [{"citation": "ref"}]
    )
    mock_result.fetchone.return_value = mock_row
    mock_session.execute.return_value = mock_result

    explanation = await explainer.explain_waypoint(frustration, anger, calm)

    assert explanation["psychological_purpose"] == "Purpose"
    assert explanation["readiness_signs"] == ["Ready1"]
    assert "vac_analysis" in explanation

@pytest.mark.asyncio
async def test_explain_waypoint_fallback(explainer, mock_session, sample_emotions):
    anger, frustration, calm = sample_emotions
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_session.execute.return_value = mock_result

    explanation = await explainer.explain_waypoint(frustration, anger, calm)

    assert explanation["psychological_purpose"] is not None
    assert len(explanation["readiness_signs"]) > 0

@pytest.mark.asyncio
async def test_interpret_valence_branches(explainer):
    """Test all valence shift branches."""
    # < 0.05
    assert "steady" in explainer._interpret_valence_shift(0.04)
    # > 0.5
    assert "Significant shift toward positive" in explainer._interpret_valence_shift(0.6)
    # > 0.2
    assert "Moderate shift toward positive" in explainer._interpret_valence_shift(0.3)
    # < -0.5
    assert "Significant shift toward negative" in explainer._interpret_valence_shift(-0.6)
    # < -0.2
    assert "Moderate shift toward negative" in explainer._interpret_valence_shift(-0.3)
    # Else
    assert "Small shift" in explainer._interpret_valence_shift(0.1)

@pytest.mark.asyncio
async def test_explain_valence_meaning(explainer):
    """Test valence meaning branches."""
    assert "Maintaining" in explainer._explain_valence_meaning(0.0)
    assert "Creating positive" in explainer._explain_valence_meaning(0.1)
    assert "Processing difficult" in explainer._explain_valence_meaning(-0.1)

@pytest.mark.asyncio
async def test_interpret_arousal_branches(explainer):
    """Test all arousal shift branches."""
    # < 0.05
    assert "steady" in explainer._interpret_arousal_shift(0.0)
    # > 0.5
    assert "Significant increase" in explainer._interpret_arousal_shift(0.6)
    # < -0.5
    assert "Significant decrease" in explainer._interpret_arousal_shift(-0.6)
    # < 0
    assert "Moderate calming" in explainer._interpret_arousal_shift(-0.3)
    # Else
    assert "Moderate increase" in explainer._interpret_arousal_shift(0.3)

@pytest.mark.asyncio
async def test_explain_arousal_meaning(explainer):
    """Test arousal meaning branches."""
    assert "processing and reflection" in explainer._explain_arousal_meaning(-0.3)
    assert "engagement and action" in explainer._explain_arousal_meaning(0.3)
    assert "Maintaining" in explainer._explain_arousal_meaning(0.0)

@pytest.mark.asyncio
async def test_interpret_connection_branches(explainer):
    """Test all connection shift branches."""
    # < 0.05
    assert "steady" in explainer._interpret_connection_shift(0.0)
    # > 0.7
    assert "Dramatic increase" in explainer._interpret_connection_shift(0.8)
    # > 0.3
    assert "Significant increase" in explainer._interpret_connection_shift(0.4)
    # < -0.3
    assert "Shift toward more individual" in explainer._interpret_connection_shift(-0.4)
    # Else
    assert "Moderate shift" in explainer._interpret_connection_shift(0.2)

@pytest.mark.asyncio
async def test_explain_connection_meaning(explainer):
    """Test connection meaning branches."""
    assert "most therapeutically significant" in explainer._explain_connection_meaning(0.6)
    assert "relational support" in explainer._explain_connection_meaning(0.2)
    assert "integration" in explainer._explain_connection_meaning(-0.6)
    assert "Appropriate relational" in explainer._explain_connection_meaning(0.0)

@pytest.mark.asyncio
async def test_generate_purpose_conditions(explainer):
    """Test all purpose generation branches."""
    wp = AtlasDefinition(id=uuid4(), emotion_name="Test", vac_vector=[0,0,0], category="Test")
    va = {"valence_shift": {"delta": 0}, "arousal_shift": {"delta": 0}, "connection_shift": {"delta": 0}}
    
    # 1. Regulation (|a| < 0.3)
    wp.vac_vector = [0, 0.2, 0] 
    p = explainer._generate_purpose_from_vac(wp, va)
    assert "regulating arousal" in p

    # 2. Connection (> 0.5)
    wp.vac_vector = [0, 0.4, 0.6]
    p = explainer._generate_purpose_from_vac(wp, va)
    assert "positive connection" in p
    
    # 3. Valence Improvement (delta > 0.3)
    wp.vac_vector = [0, 0.8, 0]
    va["valence_shift"]["delta"] = 0.4
    p = explainer._generate_purpose_from_vac(wp, va)
    assert "positive emotional momentum" in p
    
    # 4. Fallback
    wp.vac_vector = [0, 0.5, 0.2] # Not reg, not High conn
    va["valence_shift"]["delta"] = 0
    p = explainer._generate_purpose_from_vac(wp, va)
    assert "intermediate step" in p

@pytest.mark.asyncio
async def test_infer_changes_from_vac(explainer):
    """Test change inference conditions."""
    va = {
        "valence_shift": {"delta": 0.3, "interpretation": "ValChange"},
        "arousal_shift": {"delta": 0.3, "interpretation": "AroChange"},
        "connection_shift": {"delta": 0.3, "interpretation": "ConnChange"}
    }
    changes = explainer._infer_changes_from_vac(va)
    assert len(changes) == 3
    assert "ValChange" in changes
    
    va_small = {
        "valence_shift": {"delta": 0.1},
        "arousal_shift": {"delta": 0.1},
        "connection_shift": {"delta": 0.1}
    }
    changes = explainer._infer_changes_from_vac(va_small)
    assert len(changes) == 1
    assert "Emotional state shifted" in changes[0]

@pytest.mark.asyncio
async def test_generate_signs(explainer):
    """Test all signs branches."""
    wp = AtlasDefinition(id=uuid4(), emotion_name="Test", vac_vector=[0,0,0], category="Test")
    va = None 

    # Readiness Signs
    # Arousal < 0
    wp.vac_vector = [0, -0.1, 0]
    s = explainer._generate_readiness_signs(wp, va)
    assert any("arousal level" in x for x in s)
    
    # Connection > 0.5
    wp.vac_vector = [0, 0, 0.6]
    s = explainer._generate_readiness_signs(wp, va)
    assert any("more connected" in x for x in s)
    
    # Valence > 0.3
    wp.vac_vector = [0.4, 0, 0]
    s = explainer._generate_readiness_signs(wp, va)
    assert any("positive emotions" in x for x in s)

    # Warning Signs
    # High Arousal > 0.7
    wp.vac_vector = [0, 0.8, 0]
    w = explainer._generate_warning_signs(wp, va)
    assert any("overwhelmed" in x for x in w)
    
    # Low Conn < -0.5
    wp.vac_vector = [0, 0, -0.6]
    w = explainer._generate_warning_signs(wp, va)
    assert any("isolated" in x for x in w)
    
    # Low Valence < -0.7
    wp.vac_vector = [-0.8, 0, 0]
    w = explainer._generate_warning_signs(wp, va)
    assert any("intense distress" in x for x in w)

@pytest.mark.asyncio
async def test_describe_direction(explainer):
    assert explainer._describe_direction(0.01, "up", "down") == "stable"
    assert explainer._describe_direction(0.1, "up", "down") == "up"
    assert explainer._describe_direction(-0.1, "up", "down") == "down"

@pytest.mark.asyncio
async def test_helper_methods(explainer):
    # Citation extraction
    assert explainer._extract_first_citation(None) is None
    assert explainer._extract_first_citation([]) is None
    assert explainer._extract_first_citation([{"a": 1}]) == {"a": 1}
    
    # VAC distance
    d = explainer._get_vac_distance([0,0,0], [3,4,0])
    assert d == 5.0

@pytest.mark.asyncio
async def test_generate_from_path_context(explainer, mock_session, sample_emotions):
    anger, frustration, calm = sample_emotions
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_session.execute.return_value = mock_result
    
    context = {"start": "Anger", "goal": "Calm", "total_waypoints": 3}
    explanation = await explainer.explain_waypoint(frustration, anger, calm, path_context=context)
    

def test_waypoint_citation_edge_case():
    """
    Test WaypointExplainer._extract_first_citation with non-list input.
    Covers line 594: return None (unreachable type check fallback)
    """
    explainer = WaypointExplainer(MagicMock())
    # Directly calling the helper with invalid type to force the check
    # MyPy would complain, but we are testing runtime safety
    result = explainer._extract_first_citation("not-a-list") # type: ignore
    assert result is None
