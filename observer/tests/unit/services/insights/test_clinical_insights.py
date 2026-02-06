from app.services.insights.clinical import (
    assess_risk_indicators,
    generate_clinical_opening,
    generate_clinical_recommendations,
    generate_clinical_summary_legacy,
    generate_clinical_summary_structured,
    generate_vac_assessment_clinical,
)


def test_generate_clinical_opening():
    assert "High confidence" in generate_clinical_opening("Joy", 0.9, "Happiness")
    assert "Moderate confidence" in generate_clinical_opening("Joy", 0.65, "Happiness")
    assert "Low confidence" in generate_clinical_opening("Joy", 0.5, "Happiness")


def test_assess_risk_indicators():
    # Safe
    assert not assess_risk_indicators({"arousal": 0, "valence": 0, "connection": 0})

    # Crisis
    indicators = assess_risk_indicators({"arousal": 0.8, "valence": -0.6, "connection": 0})
    assert any("crisis" in i for i in indicators)

    # Depression
    indicators = assess_risk_indicators({"arousal": -0.8, "valence": -0.6, "connection": 0})
    assert any("depression" in i for i in indicators)

    # Isolation
    indicators = assess_risk_indicators({"arousal": 0, "valence": 0, "connection": -0.7})
    assert any("isolation" in i for i in indicators)


def test_generate_vac_assessment_clinical():
    res = generate_vac_assessment_clinical({"valence": 1.0, "arousal": 1.0, "connection": 0.5})
    assert "Quadrant I" in res["quadrant"]
    assert res["coordinates"]["valence"]["value"] == 1.0

    res = generate_vac_assessment_clinical({"valence": -1.0, "arousal": 1.0, "connection": 0.5})
    assert "Quadrant II" in res["quadrant"]

    res = generate_vac_assessment_clinical({"valence": -1.0, "arousal": -1.0, "connection": 0.5})
    assert "Quadrant III" in res["quadrant"]

    res = generate_vac_assessment_clinical({"valence": 1.0, "arousal": -1.0, "connection": 0.5})
    assert "Quadrant IV" in res["quadrant"]


def test_generate_clinical_recommendations():
    # Arousal high
    recs = generate_clinical_recommendations(
        "Anxiety", {"arousal": 0.8, "valence": -0.5, "connection": 0}, "Fear"
    )
    assert any(r["title"] == "Arousal Reduction" for r in recs)

    # Activation need
    recs = generate_clinical_recommendations(
        "Depression", {"arousal": -0.8, "valence": -0.5, "connection": 0}, "Sadness"
    )
    assert any(r["title"] == "Activation Strategy" for r in recs)

    # Connection need
    recs = generate_clinical_recommendations(
        "Loneliness", {"arousal": 0, "valence": 0, "connection": -0.8}, "Sadness"
    )
    assert any(r["title"] == "Social Connection" for r in recs)


def test_generate_clinical_summary_structured():
    res = generate_clinical_summary_structured(
        emotion={"name": "Joy", "category": "Happiness", "definition": "Def"},
        vac_data={"valence": 1, "arousal": 1, "connection": 1},
        confidence=0.9,
        prosody_data={"pitch_mean": 100},
        reasoning="Good",
    )
    assert res["opening"]
    assert res["voice_metrics"]
    assert res["analysis_reasoning"] == "Good"


def test_generate_clinical_recommendations_low_valence():
    # Line 116-117: Valence < -0.5
    recs = generate_clinical_recommendations(
        "Sadness", {"arousal": 0, "valence": -0.6, "connection": 0}, "Sadness"
    )
    assert any("Mood Assessment" in r["title"] for r in recs)


def test_generate_clinical_summary_structured_with_reasoning():
    # Line 182: Reasoning provided
    res = generate_clinical_summary_structured(
        {"name": "Joy", "definition": "Happy", "category": "Happiness"},
        {"valence": 0, "arousal": 0, "connection": 0},
        1.0,
        None,
        "Because verification",
    )
    assert res["analysis_reasoning"] == "Because verification"


def test_generate_clinical_summary_legacy_full():
    # Line 196-224
    res = generate_clinical_summary_legacy(
        {"name": "Joy", "definition": "Happy", "category": "Happiness"},
        {"valence": 0.5, "arousal": 0.5, "connection": 0.5},
        0.9,
        {"pitch_mean": 100, "energy": 0.5, "rate": 4.0},
        "Reasoning text",
    )

    assert "**Analysis: Joy**" in res
    assert "Category:** Happiness" in res
    assert "Valence: +0.500" in res
    assert "Pitch: 100.0 Hz" in res
    assert "Reasoning:** Reasoning text" in res
    assert "Definition:** Happy" in res
    assert "Definition:** Happy" in res


def test_clinical_summary_legacy_missing_data():
    # Test branches 182-185, 209-219, etc.

    # 1. No prosody, no reasoning
    res_minimal = generate_clinical_summary_legacy(
        {"name": "Joy", "category": "Happiness", "definition": "Def"},
        {"valence": 0, "arousal": 0, "connection": 0},
        1.0,
        None,  # No prosody
        None,  # No reasoning
    )
    assert "Voice Characteristics" not in res_minimal
    assert "Reasoning" not in res_minimal

    # 2. Prosody exists but empty or missing/false keys
    # To hit lines 211, 213, 215 as False (they are just 'if key in dict')
    # We pass a dict that doesn't have them
    res_partial_prosody = generate_clinical_summary_legacy(
        {"name": "Joy", "category": "Happiness", "definition": "Def"},
        {"valence": 0, "arousal": 0, "connection": 0},
        1.0,
        {"other_key": 1},  # Prosody dict exists but has no target keys
        None,
    )
    assert "**Voice Characteristics:**" in res_partial_prosody
    assert "- Pitch:" not in res_partial_prosody
    assert "- Energy:" not in res_partial_prosody
    assert "- Speech rate:" not in res_partial_prosody

    # 3. Structured summary with no reasoning
    res_structured = generate_clinical_summary_structured(
        {"name": "Joy", "category": "Happiness", "definition": "Def"},
        {"valence": 0, "arousal": 0, "connection": 0},
        1.0,
        None,
        None,  # No reasoning
    )
    assert "analysis_reasoning" not in res_structured
