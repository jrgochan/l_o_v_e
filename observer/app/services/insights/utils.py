"""Module documentation."""

from typing import Any, Dict


def interpret_valence(value: float) -> str:
    """Interpret valence value."""
    if value > 0.5:
        return "Very positive"
    if value > 0.1:
        return "Somewhat positive"
    if value > -0.1:
        return "Neutral"
    if value > -0.5:
        return "Somewhat negative"
    return "Very negative"


def interpret_arousal(value: float) -> str:
    """Interpret arousal value."""
    if value > 0.5:
        return "Very high energy"
    if value > 0.1:
        return "Somewhat high energy"
    if value > -0.1:
        return "Moderate energy"
    if value > -0.5:
        return "Somewhat low energy"
    return "Very low energy"


def interpret_connection(value: float) -> str:
    """Interpret connection value."""
    if value > 0.5:
        return "Strong connection/alignment"
    if value > 0.1:
        return "Somewhat connected"
    if value > -0.1:
        return "Neutral connection"
    if value > -0.5:
        return "Somewhat disconnected"
    return "Strongly disconnected/separated"


def value_to_percentile(value: float) -> int:
    """Convert -1 to +1 value to percentile (0-100)."""
    return int(((value + 1) / 2) * 100)


def analyze_vac_coordinates(vac_data: Dict[str, float]) -> Dict[str, Any]:
    """Analyze VAC coordinates in detail."""
    valence = vac_data.get("valence", 0.0)
    arousal = vac_data.get("arousal", 0.0)
    connection = vac_data.get("connection", 0.0)

    analysis: Dict[str, Any] = {
        "valence": {
            "value": valence,
            "interpretation": interpret_valence(valence),
            "percentile": value_to_percentile(valence),
        },
        "arousal": {
            "value": arousal,
            "interpretation": interpret_arousal(arousal),
            "percentile": value_to_percentile(arousal),
        },
        "connection": {
            "value": connection,
            "interpretation": interpret_connection(connection),
            "percentile": value_to_percentile(connection),
        },
    }

    # Add quadrant analysis
    if valence > 0 < arousal:
        analysis["quadrant"] = "High positive energy (excited, joyful)"
    elif valence > 0 > arousal:
        analysis["quadrant"] = "Low positive energy (calm, content)"
    elif valence < 0 < arousal:
        analysis["quadrant"] = "High negative energy (anxious, angry)"
    else:
        analysis["quadrant"] = "Low negative energy (sad, depressed)"

    return analysis
