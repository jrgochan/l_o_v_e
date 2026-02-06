from app.services.insights.prosody import (
    analyze_prosody_features,
    analyze_voice_content_correlation,
    generate_voice_metrics_clinical,
    generate_voice_observations_legacy,
    generate_voice_observations_warm,
)


def test_analyze_prosody_features_branches():
    # Low energy
    res = analyze_prosody_features({"energy": 0.2})
    assert res["energy_interpretation"] == "Low vocal energy"

    # Moderate energy
    res = analyze_prosody_features({"energy": 0.5})
    assert res["energy_interpretation"] == "Moderate vocal energy"


def test_analyze_voice_content_correlation_branches():
    # Clinical mode
    res = analyze_voice_content_correlation({"energy": 0.9}, {"arousal": -0.8}, "clinical")
    assert "Significant discrepancy detected" in res["interpretation"]

    # Warm mode: Voice > Words
    # Voice 0.9, Arousal -0.8 (norm 0.1). Diff 0.8
    res = analyze_voice_content_correlation({"energy": 0.9}, {"arousal": -0.8}, "warm")
    assert "stronger feelings beneath" in res["interpretation"]

    # Warm mode: Words > Voice
    # Voice 0.2, Arousal 0.8 (norm 0.9). Diff 0.7
    res = analyze_voice_content_correlation({"energy": 0.2}, {"arousal": 0.8}, "warm")
    assert "managing intense feelings" in res["interpretation"]

    # Aligned
    res = analyze_voice_content_correlation({"energy": 0.5}, {"arousal": 0.0}, "warm")
    assert "well aligned" in res["interpretation"]


def test_generate_voice_observations_warm_branches():
    # Energy > 0.7, Pitch < 130
    obs = generate_voice_observations_warm({"energy": 0.8, "pitch_mean": 100}, {})
    assert any("power and intensity" in o for o in obs)

    # Energy < 0.3, Pitch > 170
    obs = generate_voice_observations_warm({"energy": 0.2, "pitch_mean": 180}, {})
    assert any("soft, almost fragile" in o for o in obs)

    # Energy < 0.3, Pitch normal
    obs = generate_voice_observations_warm({"energy": 0.2, "pitch_mean": 150}, {})
    assert any("heaviness" in o for o in obs)

    # Rate slow
    obs = generate_voice_observations_warm({"rate": 2.5}, {})
    assert any("slowly and deliberately" in o for o in obs)

    # Variability high
    obs = generate_voice_observations_warm({"pitch_std": 50}, {})
    assert any("animated" in o for o in obs)

    # Variability low
    obs = generate_voice_observations_warm({"pitch_std": 10}, {})
    assert any("flat or monotone" in o for o in obs)

    # Jitter high
    obs = generate_voice_observations_warm({"jitter": 0.03}, {})
    assert any("tightness" in o for o in obs)


def test_generate_voice_observations_legacy_branches():
    # Empty
    assert generate_voice_observations_legacy({}, {}) == ""

    # Energy > 0.7, Arousal > 0.5
    res = generate_voice_observations_legacy({"energy": 0.8}, {"arousal": 0.6})
    assert "intensity right now" in res

    # Energy < 0.3, Arousal < 0
    res = generate_voice_observations_legacy({"energy": 0.2}, {"arousal": -0.1})
    assert "quiet or subdued" in res

    # Rate fast
    res = generate_voice_observations_legacy({"rate": 6.0}, {})
    assert "speaking quickly" in res

    # Rate slow
    res = generate_voice_observations_legacy({"rate": 2.0}, {})
    assert "slowly and deliberately" in res


def test_generate_voice_metrics_clinical_branches():
    # Pitch low
    m = generate_voice_metrics_clinical({"pitch_mean": 90})
    assert m[0]["interpretation"].startswith("Depressed")

    # Pitch normal
    m = generate_voice_metrics_clinical({"pitch_mean": 150})
    assert m[0]["status"] == "stable"

    # Energy low
    m = generate_voice_metrics_clinical({"energy": 0.2})
    assert m[0]["status"] == "warning"

    # Energy normal
    m = generate_voice_metrics_clinical({"energy": 0.5})
    assert m[0]["status"] == "stable"

    # Rate slow
    m = generate_voice_metrics_clinical({"rate": 2.0})
    assert m[0]["status"] == "warning"

    # Rate normal
    m = generate_voice_metrics_clinical({"rate": 4.0})
    assert m[0]["status"] == "stable"

    # Jitter normal
    m = generate_voice_metrics_clinical({"jitter": 0.01})
    assert m[0]["status"] == "stable"

    # Shimmer high
    m = generate_voice_metrics_clinical({"shimmer": 0.07})
    assert m[0]["status"] == "attention"

    # Shimmer normal
    m = generate_voice_metrics_clinical({"shimmer": 0.01})
    assert m[0]["status"] == "stable"


def test_analyze_prosody_features_high_energy():
    # Line 17
    res = analyze_prosody_features({"energy": 0.8})
    assert res["energy_interpretation"] == "High vocal energy"


def test_generate_voice_observations_warm_high_energy_pitch():
    # Line 81: Energy > 0.7 and Pitch > 170
    obs = generate_voice_observations_warm({"energy": 0.8, "pitch_mean": 175}, {})
    assert any("energy and tension" in o for o in obs)


def test_generate_voice_observations_warm_fast_rate():
    # Line 91: Rate > 5.0
    obs = generate_voice_observations_warm({"rate": 6.0}, {})
    assert any("speaking quickly" in o for o in obs)


def test_generate_voice_observations_legacy_fast_rate():
    # Line 134-137
    # Rate > 5.0 already tested? Let's verify legacy specific logic
    res = generate_voice_observations_legacy({"rate": 6.0}, {})
    assert "speaking quickly" in res

    res_slow = generate_voice_observations_legacy({"rate": 2.0}, {})
    assert "speaking slowly" in res_slow


def test_generate_voice_observations_legacy_normal_rate():
    # Test line 134->137 (Rate between 3.0 and 5.0)
    res = generate_voice_observations_legacy({"rate": 4.0}, {})
    assert "speaking" not in res


def test_generate_voice_metrics_clinical_high_values():
    # Line 155: Pitch > 180
    m = generate_voice_metrics_clinical({"pitch_mean": 190})
    assert "Elevated" in m[0]["interpretation"]

    # Line 178: Energy > 0.75
    m = generate_voice_metrics_clinical({"energy": 0.9})
    assert "High vocal intensity" in m[0]["interpretation"]

    # Line 201: Rate > 5.5
    m = generate_voice_metrics_clinical({"rate": 6.0})
    assert "Accelerated speech" in m[0]["interpretation"]

    # Line 224: Jitter > 0.025
    m = generate_voice_metrics_clinical({"jitter": 0.03})
    assert "Elevated" in m[0]["interpretation"]
