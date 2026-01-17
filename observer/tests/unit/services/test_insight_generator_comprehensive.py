import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.insight_generator import InsightGenerator
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def generator(mock_db):
    return InsightGenerator(mock_db)

@pytest.mark.asyncio
async def test_generate_warm_opening_branches(generator):
    # Test all branches of _generate_warm_opening
    
    # 1. Negative Valence (<-0.3) + Anxiety
    text = generator._generate_warm_opening("Anxiety", -0.5)
    assert "completely valid" in text
    assert "protect you" in text
    
    # 2. Positive Valence (>0.3) + Joy
    text = generator._generate_warm_opening("Joy", 0.5)
    assert "wonderful" in text
    assert "lights you up" in text
    
    # 3. Neutral Valence + Sadness
    text = generator._generate_warm_opening("Sadness", 0.0)
    assert "meaningful" in text
    assert "honor what matters" in text
    
    # 4. Fallback Context
    text = generator._generate_warm_opening("Unknown", 0.0)
    # The default context is: "This emotion is telling you something important."
    # The output is: "I sense you're experiencing unknown right now, and that's meaningful. This emotion is telling you something important."
    assert "telling you something important" in text

def test_generate_voice_observations_warm_branches(generator):
    # 1. High Energy + High Pitch
    obs = generator._generate_voice_observations_warm(
        {"energy": 0.8, "pitch_mean": 180}, {}
    )
    assert any("energy and tension" in o for o in obs)
    
    # 2. High Energy + Low Pitch
    obs = generator._generate_voice_observations_warm(
        {"energy": 0.8, "pitch_mean": 120}, {}
    )
    assert any("power and intensity" in o for o in obs)
    
    # 3. Low Energy + High Pitch
    obs = generator._generate_voice_observations_warm(
        {"energy": 0.2, "pitch_mean": 180}, {}
    )
    assert any("soft, almost fragile" in o for o in obs)
    
    # 4. Low Energy
    obs = generator._generate_voice_observations_warm(
        {"energy": 0.2, "pitch_mean": 150}, {}
    )
    assert any("heaviness" in o for o in obs)

    # 5. Fast Rate
    obs = generator._generate_voice_observations_warm(
        {"rate": 6.0}, {}
    )
    assert any("speaking quickly" in o for o in obs)
    
    # 6. Slow Rate
    obs = generator._generate_voice_observations_warm(
        {"rate": 2.0}, {}
    )
    assert any("speaking slowly" in o for o in obs)
    
    # 7. High Variability
    obs = generator._generate_voice_observations_warm(
        {"pitch_std": 50}, {}
    )
    assert any("animated" in o for o in obs)
    
    # 8. Low Variability
    obs = generator._generate_voice_observations_warm(
        {"pitch_std": 10}, {}
    )
    assert any("flat or monotone" in o for o in obs)
    
    # 9. Jitter
    obs = generator._generate_voice_observations_warm(
        {"jitter": 0.03}, {}
    )
    assert any("tightness" in o for o in obs)

def test_emotion_understanding_warm_fallback(generator):
    text = generator._get_emotion_understanding_warm("UnknownEmotion")
    assert "giving you important information" in text

def test_interpret_vac_warm_branches(generator):
    # Arousal
    assert "high-activation" in generator._interpret_arousal_warm(0.8)
    assert "moderate energy" in generator._interpret_arousal_warm(0.4)
    assert "balanced energy" in generator._interpret_arousal_warm(0.0)
    # The text is: "Your energy is quite low right now - you might feel tired or depleted"
    # "low energy" appears in the phrase "Your energy is quite low right now"
    # Wait, strict checking? The original test had 'low energy' which IS in string. 
    # Let's check line 304 of source: "Your energy is quite low right now - you might feel tired or depleted"
    assert "quite low" in generator._interpret_arousal_warm(-0.4)
    assert "very low-energy" in generator._interpret_arousal_warm(-0.8)
    
    # Valence
    assert "really good" in generator._interpret_valence_warm(0.8)
    assert "somewhat positive" in generator._interpret_valence_warm(0.4)
    assert "neutral or mixed" in generator._interpret_valence_warm(0.0)
    assert "doesn't feel good" in generator._interpret_valence_warm(-0.4)
    assert "painful or difficult" in generator._interpret_valence_warm(-0.8)
    
    # Connection
    assert "deeply connected" in generator._interpret_connection_warm(0.8)
    assert "sense of connection" in generator._interpret_connection_warm(0.4)
    assert "neutral" in generator._interpret_connection_warm(0.0)
    assert "somewhat alone" in generator._interpret_connection_warm(-0.4)
    assert "significant disconnection" in generator._interpret_connection_warm(-0.8)

def test_generate_reflection_question_branches(generator):
    # Arousal dominance
    q = generator._generate_reflection_question("Test", {"arousal": 0.9, "valence": 0, "connection": 0})
    # Possible outputs:
    # "What would it feel like to slow down, even just for one breath?"
    # "Where in your body are you feeling this intensity?"
    # "What is this energy trying to tell you?"
    assert any(x in q for x in ["slow down", "intensity", "energy trying to tell"])
    
    q = generator._generate_reflection_question("Test", {"arousal": -0.9, "valence": 0, "connection": 0})
    assert any(x in q for x in ["little more energy", "numbness", "tiredness"])
    
    # Connection dominance
    q = generator._generate_reflection_question("Test", {"arousal": 0, "valence": 0, "connection": 0.9})
    assert any(x in q for x in ["creating this sense", "helps you feel", "nurture this"])
    
    q = generator._generate_reflection_question("Test", {"arousal": 0, "valence": 0, "connection": -0.9})
    assert any(x in q for x in ["connection feel like", "safe reaching out", "less alone"])
    
    # Valence dominance
    q = generator._generate_reflection_question("Test", {"arousal": 0, "valence": 0.9, "connection": 0})
    assert any(x in q for x in ["contributing to", "savor this", "what matters"])
    
    q = generator._generate_reflection_question("Test", {"arousal": 0, "valence": -0.9, "connection": 0})
    assert any(x in q for x in ["gentle with yourself", "need most", "helps when you feel"])

def test_generate_gentle_suggestion_branches(generator):
    # Similar structure to reflection questions
    s = generator._generate_gentle_suggestion("Test", {"arousal": 0.9, "valence": 0, "connection": 0})
    print(f"Debug Branch 1: {s}")
    assert any(x in s for x in ["hand on your heart", "three slow breaths", "move your body"])
    
    s = generator._generate_gentle_suggestion("Test", {"arousal": -0.9, "valence": 0, "connection": 0})
    print(f"Debug Branch 2: {s}")
    assert any(x in s for x in ["tiny bit of energy", "stepping outside", "gentle movement"])

    s = generator._generate_gentle_suggestion("Test", {"arousal": 0, "valence": 0, "connection": 0.9})
    print(f"Debug Branch 3: {s}")
    assert any(x in s for x in ["share this feeling", "savoring", "Notice what's contributing"])

    s = generator._generate_gentle_suggestion("Test", {"arousal": 0, "valence": 0, "connection": -0.9})
    print(f"Debug Branch 4: {s}")
    assert any(x in s for x in ["reach out", "connected to yourself", "remember times"])

    s = generator._generate_gentle_suggestion("Test", {"arousal": 0, "valence": 0.9, "connection": 0})
    print(f"Debug Branch 5: {s}")
    assert any(x in s for x in ["savor this", "extend or deepen", "creating this"])

    s = generator._generate_gentle_suggestion("Test", {"arousal": 0, "valence": -0.9, "connection": 0})
    print(f"Debug Branch 6: {s}")
    assert any(x in s for x in ["name this feeling", "writing down", "remember this is temporary"])

def test_generate_clinical_opening_branches(generator):
    assert "High confidence" in generator._generate_clinical_opening("Test", 0.9, "Cat")
    assert "Moderate confidence" in generator._generate_clinical_opening("Test", 0.7, "Cat")
    assert "Low confidence" in generator._generate_clinical_opening("Test", 0.4, "Cat")

def test_generate_voice_metrics_clinical_branches(generator):
    # Pitch
    m = generator._generate_voice_metrics_clinical({"pitch_mean": 190})[0]
    assert m["status"] == "attention" and "Elevated" in m["interpretation"]
    
    m = generator._generate_voice_metrics_clinical({"pitch_mean": 90})[0]
    assert m["status"] == "attention" and "Depressed" in m["interpretation"]
    
    m = generator._generate_voice_metrics_clinical({"pitch_mean": 150})[0]
    assert m["status"] == "stable"
    
    # Energy
    m = generator._generate_voice_metrics_clinical({"energy": 0.8})[0]
    assert m["status"] == "attention" and "High vocal" in m["interpretation"]
    
    m = generator._generate_voice_metrics_clinical({"energy": 0.1})[0]
    assert m["status"] == "warning" and "Low vocal" in m["interpretation"]
    
    # Rate
    m = generator._generate_voice_metrics_clinical({"rate": 6.0})[0]
    assert m["status"] == "attention" and "Accelerated" in m["interpretation"]
    
    m = generator._generate_voice_metrics_clinical({"rate": 2.0})[0]
    assert m["status"] == "warning" and "Slowed" in m["interpretation"]
    
    # Jitter/Shimmer
    m = generator._generate_voice_metrics_clinical({"jitter": 0.03})[0]
    assert m["status"] == "attention"
    
    m = generator._generate_voice_metrics_clinical({"shimmer": 0.07})[0]
    assert m["status"] == "attention"

def test_generate_vac_assessment_clinical_branches(generator):
    # Q1
    a = generator._generate_vac_assessment_clinical({"valence": 1, "arousal": 1, "connection": 0})
    assert "Quadrant I" in a["quadrant"]
    
    # Q2
    a = generator._generate_vac_assessment_clinical({"valence": -1, "arousal": 1, "connection": 0})
    assert "Quadrant II" in a["quadrant"]
    
    # Q3
    a = generator._generate_vac_assessment_clinical({"valence": -1, "arousal": -1, "connection": 0})
    assert "Quadrant III" in a["quadrant"]
    
    # Q4
    a = generator._generate_vac_assessment_clinical({"valence": 1, "arousal": -1, "connection": 0})
    assert "Quadrant IV" in a["quadrant"]

def test_assess_risk_indicators_branches(generator):
    # High Arousal + Negative
    i = generator._assess_risk_indicators({"arousal": 0.8, "valence": -0.6, "connection": 0})
    assert len(i) > 0 and "crisis state" in i[0]
    
    # Low Energy + Negative
    i = generator._assess_risk_indicators({"arousal": -0.8, "valence": -0.6, "connection": 0})
    assert len(i) > 0 and "depression indicators" in str(i)
    
    # Disconnection
    i = generator._assess_risk_indicators({"arousal": 0, "valence": 0, "connection": -0.7})
    assert len(i) > 0 and "isolation risk" in str(i)
    
    # Extreme Activation
    i = generator._assess_risk_indicators({"arousal": 0.9, "valence": 0, "connection": 0})
    assert len(i) > 0 and "Extreme activation" in str(i)

def test_generate_clinical_recommendations_branches(generator):
    # Arousal High
    r = generator._generate_clinical_recommendations("Test", {"arousal": 0.7, "valence": 0, "connection": 0}, "Cat")
    assert any(x["title"] == "Arousal Reduction" for x in r)
    
    # Arousal Low
    r = generator._generate_clinical_recommendations("Test", {"arousal": -0.7, "valence": 0, "connection": 0}, "Cat")
    assert any(x["title"] == "Activation Strategy" for x in r)
    
    # Valence Low
    r = generator._generate_clinical_recommendations("Test", {"arousal": 0, "valence": -0.6, "connection": 0}, "Cat")
    assert any(x["title"] == "Mood Assessment" for x in r)
    
    # Connection Low
    r = generator._generate_clinical_recommendations("Test", {"arousal": 0, "valence": 0, "connection": -0.5}, "Cat")
    assert any(x["title"] == "Social Connection" for x in r)
    
    # Specific Emotions
    r = generator._generate_clinical_recommendations("Anxiety", {"arousal": 0, "valence": 0, "connection": 0}, "Cat")
    assert any(x["title"] == "Anxiety Management" for x in r)
    
    r = generator._generate_clinical_recommendations("Depression", {"arousal": 0, "valence": 0, "connection": 0}, "Cat")
    assert any(x["title"] == "Depression Screening" for x in r)

def test_generate_gentle_invitations_order(generator):
    # Odd message count -> Reflection first
    i = generator._generate_gentle_invitations("Test", {"arousal": 0, "valence": 0, "connection": 0}, 1)
    assert i[0]["type"] == "reflection"
    
    # Even message count -> Suggestion first
    i = generator._generate_gentle_invitations("Test", {"arousal": 0, "valence": 0, "connection": 0}, 2)
    assert i[0]["type"] == "suggestion"
    
    # High arousal append
    i = generator._generate_gentle_invitations("Test", {"arousal": 0.8, "valence": 0, "connection": 0}, 1)
    assert len(i) == 3
