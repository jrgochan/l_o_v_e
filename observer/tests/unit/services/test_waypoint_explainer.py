from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.waypoint_explainer import WaypointExplainer


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def explainer(mock_session):
    return WaypointExplainer(mock_session)


@pytest.fixture
def sample_emotions():
    prev_e = EmotionDefinition(id=uuid4(), emotion_name="Anger", vac_vector=[0.2, 0.8, -0.4])
    waypoint_e = EmotionDefinition(
        id=uuid4(),
        emotion_name="Frustration",
        vac_vector=[0.3, 0.1, -0.2],  # +V, Low A (0.1), +C
    )
    next_e = EmotionDefinition(id=uuid4(), emotion_name="Calm", vac_vector=[0.5, 0.2, 0.5])
    return prev_e, waypoint_e, next_e


@pytest.mark.asyncio
async def test_explain_waypoint_template_found(explainer, mock_session, sample_emotions):
    """Test when a template exists in the database."""
    prev_e, waypoint_e, next_e = sample_emotions

    # Mock template row
    mock_row = (
        "Purpose",  # psychological_purpose
        "Order logic",  # why_this_order
        ["Enable A"],  # what_it_enables
        ["Change A"],  # previous_what_changed
        "Why necessary",  # previous_why_necessary
        ["Enable Next"],  # next_what_enabled
        "Prepares how",  # next_how_prepares
        ["Ready A"],  # readiness_signs
        ["Warning A"],  # warning_signs
        [{"citation": "Ref 1"}],  # research_citations
    )

    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row
    mock_session.execute.return_value = mock_result

    explanation = await explainer.explain_waypoint(waypoint_e, prev_e, next_e)

    assert explanation["psychological_purpose"] == "Purpose"
    assert explanation["vac_analysis"]["arousal_shift"]["delta"] == -0.7
    assert explanation["readiness_signs"] == ["Ready A"]
    assert explanation["previous_context"]["research"]["citation"] == "Ref 1"


@pytest.mark.asyncio
async def test_explain_waypoint_fallback(explainer, mock_session, sample_emotions):
    """Test algorithmic generation when no template exists."""
    prev_e, waypoint_e, next_e = sample_emotions

    # Mock no template found
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_session.execute.return_value = mock_result

    explanation = await explainer.explain_waypoint(waypoint_e, prev_e, next_e)

    # Check fallback generation logic
    assert "provides regulating arousal" in explanation["psychological_purpose"]
    assert explanation["vac_analysis"]["arousal_shift"]["delta"] == -0.7
    assert "Significant decrease" in explanation["vac_analysis"]["arousal_shift"]["interpretation"]
    assert len(explanation["readiness_signs"]) > 0


@pytest.mark.asyncio
async def test_vac_analysis_logic(explainer):
    """Test detailed VAC analysis branches."""
    # 1. Valence: Start [-0.8] -> End [0.8] => Delta +1.6 (Significant Positive)
    res = await explainer._analyze_vac_shifts([-0.8, 0, 0], [0.8, 0, 0])
    assert "Significant shift toward positive" in res["valence_shift"]["interpretation"]

    # 2. Valence: Start [0.8] -> End [-0.8] => Delta -1.6 (Significant Negative)
    res = await explainer._analyze_vac_shifts([0.8, 0, 0], [-0.8, 0, 0])
    assert "Significant shift toward negative" in res["valence_shift"]["interpretation"]

    # 3. Arousal: Start [0.2] -> End [0.8] => Delta +0.6 (Significant Increase)
    res = await explainer._analyze_vac_shifts([0, 0.2, 0], [0, 0.8, 0])
    assert "Significant increase" in res["arousal_shift"]["interpretation"]

    # 4. Connection: Start [-0.5] -> End [0.5] => Delta +1.0 (Dramatic Increase)
    res = await explainer._analyze_vac_shifts([0, 0, -0.5], [0, 0, 0.5])
    assert "Dramatic increase" in res["connection_shift"]["interpretation"]

    # 5. Moderate Shifts (Checking missing branches)
    # Valence: +0.3 (Moderate Positive)
    res = await explainer._analyze_vac_shifts([0, 0, 0], [0.3, 0, 0])
    assert "Moderate shift toward positive" in res["valence_shift"]["interpretation"]

    # Valence: -0.3 (Moderate Negative)
    res = await explainer._analyze_vac_shifts([0, 0, 0], [-0.3, 0, 0])
    assert "Moderate shift toward negative" in res["valence_shift"]["interpretation"]

    # Arousal: -0.6 (Significant Decrease)
    res = await explainer._analyze_vac_shifts([0, 0.6, 0], [0, 0, 0])
    assert "Significant decrease" in res["arousal_shift"]["interpretation"]

    # Connection: +0.4 (Significant but not Dramatic)
    res = await explainer._analyze_vac_shifts([0, 0, 0], [0, 0, 0.4])
    assert "Significant increase" in res["connection_shift"]["interpretation"]


@pytest.mark.asyncio
async def test_generate_purpose_branches(explainer):
    """Test generating purpose from different VAC states."""
    # 1. Connection Building (C > 0.5)
    w_conn = EmotionDefinition(vac_vector=[0, 0.4, 0.6], emotion_name="Love")
    mock_analysis = {"valence_shift": {"delta": 0}}
    purpose = explainer._generate_purpose_from_vac(w_conn, mock_analysis)
    assert "building positive connection" in purpose

    # 2. Valence Improvement (Delta > 0.3)
    w_joy = EmotionDefinition(vac_vector=[0, 0.4, 0], emotion_name="Joy")
    mock_analysis = {"valence_shift": {"delta": 0.4}}
    purpose = explainer._generate_purpose_from_vac(w_joy, mock_analysis)
    assert "creating positive emotional momentum" in purpose


@pytest.mark.asyncio
async def test_readiness_signs_branches(explainer):
    """Test generation of readiness signs."""
    # 1. Low Arousal (< 0)
    w1 = EmotionDefinition(vac_vector=[0, -0.1, 0], emotion_name="Calm")
    signs = explainer._generate_readiness_signs(w1, None)
    assert any("arousal level has decreased" in s for s in signs)

    # 2. High Connection (> 0.5)
    w2 = EmotionDefinition(vac_vector=[0, 0, 0.6], emotion_name="Connected")
    signs = explainer._generate_readiness_signs(w2, None)
    assert any("more connected" in s for s in signs)

    # 3. Pos Valence (> 0.3)
    w3 = EmotionDefinition(vac_vector=[0.4, 0, 0], emotion_name="Happy")
    signs = explainer._generate_readiness_signs(w3, None)
    assert any("positive emotions emerging" in s for s in signs)


def test_get_vac_distance(explainer):
    """Test distance calculation."""
    d = explainer._get_vac_distance([0, 0, 0], [3, 4, 0])
    assert d == 5.0


@pytest.mark.asyncio
async def test_interpret_arousal_moderate(explainer):
    """Test moderate arousal branches."""
    # Moderate increase (0 < delta <= 0.5)
    res = await explainer._analyze_vac_shifts([0, 0, 0], [0, 0.3, 0])
    assert "Moderate increase in energy" in res["arousal_shift"]["interpretation"]

    # Moderate decrease (-0.5 <= delta < 0)
    res = await explainer._analyze_vac_shifts([0, 0, 0], [0, -0.3, 0])
    assert "Moderate calming" in res["arousal_shift"]["interpretation"]


@pytest.mark.asyncio
async def test_infer_changes_branches(explainer):
    """Test inference branches when shifts are small."""
    # All small shifts -> Default message
    vac_analysis = {
        "valence_shift": {"delta": 0.1, "interpretation": "V"},
        "arousal_shift": {"delta": 0.1, "interpretation": "A"},
        "connection_shift": {"delta": 0.1, "interpretation": "C"},
    }
    changes = explainer._infer_changes_from_vac(vac_analysis)
    assert changes == ["Emotional state shifted"]

    # Only one significant
    vac_analysis["arousal_shift"]["delta"] = 0.3
    changes = explainer._infer_changes_from_vac(vac_analysis)
    assert changes == ["A"]

    # Validation for line 534->537 edge (Arousal small but others big)
    vac_analysis = {
        "valence_shift": {"delta": 0.5, "interpretation": "V"},
        "arousal_shift": {"delta": 0.1, "interpretation": "A"},
        "connection_shift": {"delta": 0.5, "interpretation": "C"},
    }
    changes = explainer._infer_changes_from_vac(vac_analysis)
    assert "V" in changes
    assert "C" in changes
    assert "A" not in changes


@pytest.mark.asyncio
async def test_extract_first_citation_invalid_type(explainer):
    """Test handling of invalid citation format."""
    # Pass a dict (truthy, has len, but not a list)
    invalid_input = {"citation": "foo"}
    res = explainer._extract_first_citation(invalid_input)
    assert res is None


@pytest.mark.asyncio
async def test_warning_signs_generation(explainer, mock_session):
    """Test generation of warning signs based on thresholds."""
    # High arousal (>0.7), Negative Connection (<-0.5), Negative Valence (<-0.7)
    waypoint_e = EmotionDefinition(id=uuid4(), emotion_name="Panic", vac_vector=[-0.8, 0.9, -0.6])
    prev_e = EmotionDefinition(vac_vector=[0, 0, 0], emotion_name="Neutral")
    next_e = EmotionDefinition(vac_vector=[0, 0, 0], emotion_name="Neutral")

    mock_result = MagicMock()
    mock_result.fetchone.return_value = None  # Fallback
    mock_session.execute.return_value = mock_result

    explanation = await explainer.explain_waypoint(waypoint_e, prev_e, next_e)

    warnings = explanation["warning_signs"]
    assert any("overwhelmed" in w for w in warnings)  # Arousal > 0.7
    assert any("isolated" in w for w in warnings)  # Connection < -0.5
    assert any("intense distress" in w for w in warnings)  # Valence < -0.7


@pytest.mark.asyncio
async def test_extract_first_citation(explainer):
    """Test citation extraction helper."""
    assert explainer._extract_first_citation(None) is None
    assert explainer._extract_first_citation([]) is None
    assert explainer._extract_first_citation([{"a": 1}]) == {"a": 1}
