from typing import Any, Dict, List


def analyze_prosody_features(prosody_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze voice prosody features."""
    analysis = {
        "pitch": prosody_data.get("pitch_mean"),
        "pitch_variability": prosody_data.get("pitch_std"),
        "energy": prosody_data.get("energy"),
        "rate": prosody_data.get("rate"),
        "features": prosody_data.get("features", {}),
    }

    # Add interpretations
    energy = prosody_data.get("energy", 0.5)
    if energy > 0.7:
        analysis["energy_interpretation"] = "High vocal energy"
    elif energy < 0.3:
        analysis["energy_interpretation"] = "Low vocal energy"
    else:
        analysis["energy_interpretation"] = "Moderate vocal energy"

    return analysis


def analyze_voice_content_correlation(
    prosody_data: Dict[str, Any], vac_data: Dict[str, float], tone_mode: str
) -> Dict[str, Any]:
    """Analyze correlation between voice and content."""
    voice_energy = prosody_data.get("energy", 0.5)
    content_arousal = vac_data.get("arousal", 0.0)
    # _content_valence = vac_data.get("valence", 0.0)

    # Normalize arousal to 0-1 scale
    normalized_arousal = (content_arousal + 1) / 2

    # Calculate discrepancy
    energy_discrepancy = abs(voice_energy - normalized_arousal)

    correlation = {
        "voice_energy": voice_energy,
        "content_arousal": content_arousal,
        "discrepancy": energy_discrepancy,
        "aligned": energy_discrepancy < 0.3,
    }

    # Add interpretation
    if energy_discrepancy > 0.5:
        if tone_mode == "clinical":
            correlation["interpretation"] = (
                f"Significant discrepancy detected: voice energy ({voice_energy:.2f}) vs "
                f"content arousal ({content_arousal:+.2f})"
            )
        else:
            if voice_energy > normalized_arousal:
                correlation["interpretation"] = (
                    "Your voice shows more intensity than your words suggest - "
                    "there might be stronger feelings beneath the surface."
                )
            else:
                correlation["interpretation"] = (
                    "Your words suggest high emotion, but your voice is calmer - "
                    "you might be managing intense feelings."
                )
    else:
        correlation["interpretation"] = "Voice and content are well aligned."

    return correlation


def generate_voice_observations_warm(
    prosody_data: Dict[str, Any], vac_data: Dict[str, float]
) -> List[str]:
    """Generate natural language voice observations."""
    observations = []

    energy = prosody_data.get("energy", 0.5)
    pitch = prosody_data.get("pitch_mean", 150)
    rate = prosody_data.get("rate", 4.0)
    variability = prosody_data.get("pitch_std", 20)

    # Energy + Pitch combo
    if energy > 0.7 and pitch > 170:
        observations.append("Your voice has a lot of energy and tension")
    elif energy > 0.7 and pitch < 130:
        observations.append("There's power and intensity in your voice")
    elif energy < 0.3 and pitch > 170:
        observations.append("Your voice sounds soft, almost fragile")
    elif energy < 0.3:
        observations.append("There's a heaviness in your voice")

    # Speech rate
    if rate > 5.0:
        observations.append("You're speaking quickly, which often happens when thoughts are racing")
    elif rate < 3.0:
        observations.append("You're speaking slowly and deliberately, taking your time with words")

    # Variability
    if variability > 40:
        observations.append("Your voice is animated with lots of expression")
    elif variability < 15:
        observations.append(
            "Your voice sounds flat or monotone, which can happen when we're overwhelmed"
        )

    # Voice quality
    if prosody_data.get("jitter", 0) > 0.02:
        observations.append("There's a tightness in your voice that suggests your body is on alert")

    return observations[:4]  # Max 4


def generate_voice_observations_legacy(
    prosody_data: Dict[str, Any], vac_data: Dict[str, float]
) -> str:
    """Generate warm observations about voice characteristics (Legacy String Format)."""
    observations = []

    energy = prosody_data.get("energy", 0.5)
    arousal = vac_data.get("arousal", 0.0)

    if energy > 0.7 and arousal > 0.5:
        observations.append("Your voice has a lot of intensity right now")
    elif energy < 0.3 and arousal < 0:
        observations.append("Your voice sounds quite quiet or subdued")

    rate = prosody_data.get("rate")
    if rate:
        if rate > 5.0:
            observations.append("you're speaking quickly")
        elif rate < 3.0:
            observations.append("you're speaking slowly and deliberately")

    if observations:
        return "**I notice:** " + ", and ".join(observations) + "."
    return ""


def generate_voice_metrics_clinical(prosody_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate structured voice metrics for clinical display."""
    metrics = []

    # Pitch metrics
    if "pitch_mean" in prosody_data:
        pitch_mean = prosody_data["pitch_mean"]
        pitch_std = prosody_data.get("pitch_std", 0)

        # Classify pitch
        if pitch_mean > 180:
            interpretation = "Elevated (potential stress indicator)"
            status = "attention"
        elif pitch_mean < 100:
            interpretation = "Depressed (potential low affect indicator)"
            status = "attention"
        else:
            interpretation = "Within normal range"
            status = "stable"

        metrics.append(
            {
                "label": "Pitch (F0)",
                "value": f"{pitch_mean:.1f} Hz (±{pitch_std:.1f})",
                "interpretation": interpretation,
                "status": status,
            }
        )

    # Energy metrics
    if "energy" in prosody_data:
        energy = prosody_data["energy"]

        if energy > 0.75:
            interpretation = "High vocal intensity"
            status = "attention"
        elif energy < 0.25:
            interpretation = "Low vocal intensity (potential flattened affect)"
            status = "warning"
        else:
            interpretation = "Appropriate vocal energy"
            status = "stable"

        metrics.append(
            {
                "label": "Energy Level",
                "value": f"{energy:.3f}",
                "interpretation": interpretation,
                "status": status,
            }
        )

    # Speech rate
    if "rate" in prosody_data:
        rate = prosody_data["rate"]

        if rate > 5.5:
            interpretation = "Accelerated speech (potential agitation)"
            status = "attention"
        elif rate < 2.5:
            interpretation = "Slowed speech (potential psychomotor retardation)"
            status = "warning"
        else:
            interpretation = "Normal speech rate"
            status = "stable"

        metrics.append(
            {
                "label": "Speech Rate",
                "value": f"{rate:.1f} syll/sec",
                "interpretation": interpretation,
                "status": status,
            }
        )

    # Voice quality metrics
    if "jitter" in prosody_data:
        jitter = prosody_data["jitter"]

        if jitter > 0.025:
            interpretation = "Elevated (potential vocal tension)"
            status = "attention"
        else:
            interpretation = "Within normal limits"
            status = "stable"

        metrics.append(
            {
                "label": "Jitter",
                "value": f"{jitter:.4f}",
                "interpretation": interpretation,
                "status": status,
            }
        )

    if "shimmer" in prosody_data:
        shimmer = prosody_data["shimmer"]

        if shimmer > 0.06:
            interpretation = "Elevated (potential voice quality concern)"
            status = "attention"
        else:
            interpretation = "Within normal limits"
            status = "stable"

        metrics.append(
            {
                "label": "Shimmer",
                "value": f"{shimmer:.4f}",
                "interpretation": interpretation,
                "status": status,
            }
        )

    return metrics
