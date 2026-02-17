"""Module documentation."""

from typing import Any, Dict, List, Optional

from app.services.insights.prosody import generate_voice_metrics_clinical
from app.services.insights.utils import interpret_arousal, interpret_connection, interpret_valence


def generate_clinical_opening(emotion_name: str, confidence: float, category: str) -> str:
    """Generate professional opening statement."""
    confidence_pct = int(confidence * 100)

    if confidence >= 0.8:
        certainty = "High confidence"
    elif confidence >= 0.6:
        certainty = "Moderate confidence"
    else:
        certainty = "Low confidence"

    return (
        f"{certainty} detection of {emotion_name} ({confidence_pct}%) within the {category} "
        "category. Analysis indicates emotional state requires clinical assessment."
    )


def assess_risk_indicators(vac_data: Dict[str, float]) -> List[str]:
    """Assess risk indicators from VAC data."""
    indicators = []

    arousal = vac_data["arousal"]
    valence = vac_data["valence"]
    connection = vac_data["connection"]

    if arousal > 0.75 and valence < -0.5:
        indicators.append("High arousal + negative valence (potential crisis state)")

    if arousal < -0.7 and valence < -0.5:
        indicators.append("Low energy + negative mood (depression indicators)")

    if connection < -0.6:
        indicators.append("Significant disconnection (isolation risk)")

    if abs(arousal) > 0.8:
        indicators.append("Extreme activation/deactivation detected")

    return indicators


def generate_vac_assessment_clinical(vac_data: Dict[str, float]) -> Dict[str, Any]:
    """Generate clinical VAC assessment."""
    valence = vac_data["valence"]
    arousal = vac_data["arousal"]
    connection = vac_data["connection"]

    # Determine quadrant and clinical significance
    # Determine quadrant and clinical significance
    if valence > 0 < arousal:
        quadrant = "Quadrant I: High Arousal, Positive Valence"
        clinical_note = "Activated positive affect - generally adaptive"
    elif valence < 0 < arousal:
        quadrant = "Quadrant II: High Arousal, Negative Valence"
        clinical_note = "Activated negative affect - monitor for anxiety/agitation"
    elif valence < 0 > arousal:
        quadrant = "Quadrant III: Low Arousal, Negative Valence"
        clinical_note = "Deactivated negative affect - assess for depression risk"
    else:
        quadrant = "Quadrant IV: Low Arousal, Positive Valence"
        clinical_note = "Deactivated positive affect - calm/contentment state"

    return {
        "coordinates": {
            "valence": {
                "value": valence,
                "label": interpret_valence(valence),
            },
            "arousal": {
                "value": arousal,
                "label": interpret_arousal(arousal),
            },
            "connection": {
                "value": connection,
                "label": interpret_connection(connection),
            },
        },
        "quadrant": quadrant,
        "clinical_note": clinical_note,
        "risk_indicators": assess_risk_indicators(vac_data),
    }


def generate_clinical_recommendations(
    emotion_name: str, vac_data: Dict[str, float], _category: str
) -> List[Dict[str, str]]:
    """Generate evidence-based clinical recommendations."""
    recommendations = []

    arousal = vac_data["arousal"]
    valence = vac_data["valence"]
    connection = vac_data["connection"]

    # Arousal-based interventions
    if arousal > 0.6:
        recommendations.append(
            {
                "type": "intervention",
                "title": "Arousal Reduction",
                "description": (
                    "Consider grounding techniques, deep breathing exercises, "
                    "or progressive muscle relaxation"
                ),
            }
        )
    elif arousal < -0.6:
        recommendations.append(
            {
                "type": "intervention",
                "title": "Activation Strategy",
                "description": (
                    "Behavioral activation recommended: gentle physical activity, "
                    "environmental change, or social engagement"
                ),
            }
        )

    # Valence-based interventions
    if valence < -0.5:
        recommendations.append(
            {
                "type": "assessment",
                "title": "Mood Assessment",
                "description": "Consider administering PHQ-9 or similar depression screening",
            }
        )

    # Connection-based interventions
    if connection < -0.4:
        recommendations.append(
            {
                "type": "intervention",
                "title": "Social Connection",
                "description": (
                    "Explore barriers to connection; consider referral to group therapy "
                    "or support groups"
                ),
            }
        )

    # Emotion-specific recommendations
    if emotion_name.lower() in ["anxiety", "fear", "panic"]:
        recommendations.append(
            {
                "type": "intervention",
                "title": "Anxiety Management",
                "description": (
                    "CBT techniques for anxiety; assess for panic disorder if acute symptoms "
                    "present"
                ),
            }
        )
    elif emotion_name.lower() in ["sadness", "grie", "depression"]:
        recommendations.append(
            {
                "type": "assessment",
                "title": "Depression Screening",
                "description": (
                    "Monitor duration and severity; assess for major depressive episode criteria"
                ),
            }
        )

    return recommendations[:3]  # Max 3


def generate_clinical_summary_structured(
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    confidence: float,
    prosody_data: Optional[Dict[str, Any]],
    reasoning: Optional[str],
    _message_count: int = 1,
) -> Dict[str, Any]:
    """Generate structured clinical mode insights."""
    # Build structured clinical insights
    structured = {
        "opening": generate_clinical_opening(emotion["name"], confidence, emotion["category"]),
        "emotion_definition": emotion["definition"],
        "vac_assessment": generate_vac_assessment_clinical(vac_data),
        "clinical_recommendations": generate_clinical_recommendations(
            emotion["name"], vac_data, emotion["category"]
        ),
    }

    # Add voice metrics if available
    if prosody_data:
        structured["voice_metrics"] = generate_voice_metrics_clinical(prosody_data)

    # Add reasoning if available
    if reasoning:
        structured["analysis_reasoning"] = reasoning

    return structured


def generate_clinical_summary_legacy(
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    confidence: float,
    prosody_data: Optional[Dict[str, Any]],
    reasoning: Optional[str],
) -> str:
    """Generate clinical/technical summary (Legacy Format)."""
    valence = vac_data.get("valence", 0.0)
    arousal = vac_data.get("arousal", 0.0)
    connection = vac_data.get("connection", 0.0)

    summary = f"**Analysis: {emotion['name']}** (confidence: {confidence:.1%})\n\n"
    summary += f"**Category:** {emotion['category']}\n\n"
    summary += "**VAC Coordinates:**\n"
    summary += f"- Valence: {valence:+.3f} ({interpret_valence(valence)})\n"
    summary += f"- Arousal: {arousal:+.3f} ({interpret_arousal(arousal)})\n"
    summary += f"- Connection: {connection:+.3f} ({interpret_connection(connection)})\n\n"

    if prosody_data:
        summary += "**Voice Characteristics:**\n"
        if "pitch_mean" in prosody_data:
            summary += (
                f"- Pitch: {prosody_data['pitch_mean']:.1f} Hz "
                f"(±{prosody_data.get('pitch_std', 0):.1f})\n"
            )
        if "energy" in prosody_data:
            summary += f"- Energy: {prosody_data['energy']:.3f}\n"
        if "rate" in prosody_data:
            summary += f"- Speech rate: {prosody_data['rate']:.1f} syll/sec\n"
        summary += "\n"

    if reasoning:
        summary += f"**Reasoning:** {reasoning}\n\n"

    summary += f"**Definition:** {emotion['definition']}"

    return summary
