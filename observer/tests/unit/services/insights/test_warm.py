from unittest.mock import patch

import pytest

from app.services.insights.warm import (
    generate_gentle_invitations,
    generate_gentle_suggestion,
    generate_reflection_question,
    generate_warm_opening,
    generate_warm_summary_legacy,
    generate_warm_summary_structured,
    interpret_arousal_warm,
    interpret_connection_warm,
    interpret_valence_warm,
)


@pytest.mark.parametrize(
    "arousal,expected_phrase",
    [
        (0.8, "high-activation"),
        (0.5, "moderate energy"),
        (0.0, "balanced energy"),
        (-0.5, "energy is quite low"),
        (-0.8, "very low-energy state"),
    ],
)
def test_interpret_arousal_warm_branches(arousal, expected_phrase):
    assert expected_phrase in interpret_arousal_warm(arousal)


@pytest.mark.parametrize(
    "valence,expected_phrase",
    [
        (0.8, "feels really good"),
        (0.5, "somewhat positive"),
        (0.0, "neutral or mixed"),
        (-0.5, "doesn't feel good"),
        (-0.8, "painful or difficult"),
    ],
)
def test_interpret_valence_warm_branches(valence, expected_phrase):
    assert expected_phrase in interpret_valence_warm(valence)


@pytest.mark.parametrize(
    "connection,expected_phrase",
    [
        (0.8, "deeply connected"),
        (0.5, "sense of connection"),
        (0.0, "neutral right now"),
        (-0.5, "somewhat alone"),
        (-0.8, "significant disconnection"),
    ],
)
def test_interpret_connection_warm_branches(connection, expected_phrase):
    assert expected_phrase in interpret_connection_warm(connection)


def test_generate_warm_opening_branches():
    # Validation branches
    assert "meaningful" in generate_warm_opening("Neutral", 0.0)  # -0.3 <= v <= 0.3

    # Context branches
    assert "honor what matters" in generate_warm_opening("Sadness", -0.5)
    assert "lights you up" in generate_warm_opening("Excitement", 0.8)
    assert "telling you something important" in generate_warm_opening("Unknown", 0.0)


def test_generate_reflection_question_branches():
    # Arousal low
    res = generate_reflection_question("Tired", {"arousal": -0.8, "valence": 0, "connection": 0})
    assert any(x in res for x in ["energy", "rest", "tiredness"])

    # Connection low
    res = generate_reflection_question("Lonely", {"arousal": 0, "valence": 0, "connection": -0.8})
    assert any(x in res for x in ["connection", "safe", "alone"])

    # Connection high
    res = generate_reflection_question("Connected", {"arousal": 0, "valence": 0, "connection": 0.8})
    assert any(x in res for x in ["creating", "helps", "nurture"])

    # Valence low (default else branch logic check)
    res = generate_reflection_question("Sad", {"arousal": 0, "valence": -0.8, "connection": 0})
    assert any(x in res for x in ["gentle", "need most", "helps"])

    # Valence high
    res = generate_reflection_question("Happy", {"arousal": 0, "valence": 0.8, "connection": 0})
    assert any(x in res for x in ["positive", "savor", "matters"])


def test_generate_gentle_suggestion_branches():
    # Arousal low
    res = generate_gentle_suggestion("Tired", {"arousal": -0.8, "valence": 0, "connection": 0})
    assert any(x in res for x in ["tiny bit of energy", "window", "movement"])

    # Connection low
    res = generate_gentle_suggestion("Lonely", {"arousal": 0, "valence": 0, "connection": -0.8})
    assert any(x in res for x in ["reach out", "connected to yourself", "remember times"])

    # Connection high
    res = generate_gentle_suggestion("Loved", {"arousal": 0, "valence": 0, "connection": 0.8})
    assert any(x in res for x in ["share this", "savoring", "contributing"])

    # Valence high (default else)
    res = generate_gentle_suggestion("Joy", {"arousal": 0, "valence": 0.8, "connection": 0})
    assert any(x in res for x in ["savor this", "extend", "creating"])


def test_generate_gentle_invitations_logic():
    # Test grounding addition and alternating types
    vac = {"arousal": 0.8, "valence": 0, "connection": 0}

    # Msg 1 (Odd) -> Reflection first
    inv1 = generate_gentle_invitations("Anxiety", vac, 1)
    assert inv1[0]["type"] == "reflection"
    assert inv1[1]["type"] == "suggestion"
    # Grounding check (arousal > 0.7)
    assert len(inv1) == 3
    assert "placing a hand" in inv1[2]["text"]

    # Msg 2 (Even) -> Suggestion first
    inv2 = generate_gentle_invitations("Anxiety", vac, 2)
    assert inv2[0]["type"] == "suggestion"
    assert inv2[1]["type"] == "reflection"


def test_generate_warm_summary_legacy():
    # Case 1: Low valence, Low connection, Low arousal
    vac_low = {"valence": -0.8, "arousal": -0.8, "connection": -0.8}
    res_low = generate_warm_summary_legacy(
        emotion={"name": "Sadness", "definition": "Loss", "category": "Sadness"},
        vac_data=vac_low,
        confidence=1.0,
        prosody_data={"pitch_mean": 100},
        reasoning="Test",
    )
    assert "experiencing sadness" in res_low
    assert "low-energy" in res_low
    assert "disconnected" in res_low
    assert "Loss" in res_low  # validation of definition
    assert "Sadness" in res_low  # validation of category value
    assert "What this means" in res_low  # validation of label

    # Case 2: High valence, High arousal, High connection
    vac_high = {"valence": 0.8, "arousal": 0.8, "connection": 0.8}
    res_high = generate_warm_summary_legacy(
        emotion={"name": "Joy", "definition": "Happiness", "category": "Joy"},
        vac_data=vac_high,
        confidence=1.0,
        prosody_data=None,  # no voice
        reasoning="Test",
    )
    assert "feeling joy" in res_high
    assert "lot of energy" in res_high
    assert "connects you" in res_high
    assert "Happiness" in res_high

    # Case 3: Neutral
    vac_neutral = {"valence": 0.0, "arousal": 0.0, "connection": 0.0}
    res_neutral = generate_warm_summary_legacy(
        emotion={"name": "Calm", "definition": "Peace", "category": "Calm"},
        vac_data=vac_neutral,
        confidence=1.0,
        prosody_data=None,
        reasoning="Test",
    )
    assert "state of calm" in res_neutral
    assert "Peace" in res_neutral
    # Assert specific phrases are NOT present
    assert "energy" not in res_neutral  # unless matched by default? No, logic checks >0.5 or <-0.3
    assert "disconnected" not in res_neutral


def test_generate_warm_summary_structured_full():
    res = generate_warm_summary_structured(
        emotion={"name": "Joy", "definition": "Happy"},
        vac_data={"valence": 1, "arousal": 1, "connection": 1},
        prosody_data={"pitch_mean": 100},
    )
    assert res["opening"]
    assert res["vac_interpretation"]["energy_state"]
    assert len(res["gentle_invitations"]) >= 2
    assert "voice_observations" in res


def test_generate_warm_opening_anxiety():
    # Line 65: Anxiety branch
    assert "protect you" in generate_warm_opening("Anxiety", -0.5)


def test_generate_gentle_suggestion_valence_low():
    # Line 188: Valence focused (others lower abs), valence < 0
    # Arousal 0, Connection 0. Valence -0.8.
    res = generate_gentle_suggestion("Sad", {"arousal": 0, "valence": -0.8, "connection": 0})
    assert any(x in res for x in ["name this feeling", "writing down", "temporary"])


def test_generate_gentle_invitations_no_grounding():
    # Line 241: Arousal < 0.7 -> No grounding added
    vac = {"arousal": 0.5, "valence": 0, "connection": 0}
    inv = generate_gentle_invitations("Calm", vac, 1)
    assert len(inv) == 2  # Only reflection + suggestion


def test_generate_warm_summary_structured_no_prosody():
    # Line 278: No prosody data
    res = generate_warm_summary_structured(
        emotion={"name": "Joy", "definition": "Happy"},
        vac_data={"valence": 1, "arousal": 0.5, "connection": 1},
        prosody_data=None,  # Trigger False branch
    )
    assert "voice_observations" not in res


def test_generate_warm_summary_legacy_with_voice_obs():
    """Test legacy summary with voice observations."""
    prosody_data = {"energy": 0.8}
    emotion = {"name": "Joy", "definition": "Def", "category": "Happiness"}

    with patch(
        "app.services.insights.warm.generate_voice_observations_legacy",
        return_value="Voice Obs",
    ):
        res = generate_warm_summary_legacy(
            emotion=emotion,
            vac_data={"valence": 0.5, "arousal": 0.5, "connection": 0.5},
            confidence=1.0,
            prosody_data=prosody_data,
            reasoning="reason",
        )
        assert "Voice Obs" in res
        assert "**What this means:**" in res
