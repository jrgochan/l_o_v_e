import pytest

from app.services.insights.utils import (
    analyze_vac_coordinates,
    interpret_arousal,
    interpret_connection,
    interpret_valence,
    value_to_percentile,
)


@pytest.mark.parametrize(
    "value,expected",
    [
        (0.6, "Very positive"),
        (0.2, "Somewhat positive"),
        (0.0, "Neutral"),
        (-0.2, "Somewhat negative"),  # Line 13
        (-0.6, "Very negative"),
    ],
)
def test_interpret_valence(value, expected):
    assert interpret_valence(value) == expected


@pytest.mark.parametrize(
    "value,expected",
    [
        (0.6, "Very high energy"),
        (0.2, "Somewhat high energy"),
        (0.0, "Moderate energy"),
        (-0.2, "Somewhat low energy"),  # Line 27
        (-0.6, "Very low energy"),
    ],
)
def test_interpret_arousal(value, expected):
    assert interpret_arousal(value) == expected


@pytest.mark.parametrize(
    "value,expected",
    [
        (0.6, "Strong connection/alignment"),
        (0.2, "Somewhat connected"),
        (0.0, "Neutral connection"),
        (-0.2, "Somewhat disconnected"),  # Line 40
        (-0.6, "Strongly disconnected/separated"),  # Line 42
    ],
)
def test_interpret_connection(value, expected):
    assert interpret_connection(value) == expected


def test_value_to_percentile():
    assert value_to_percentile(0.0) == 50
    assert value_to_percentile(1.0) == 100
    assert value_to_percentile(-1.0) == 0


def test_analyze_vac_coordinates_structure():
    data = {"valence": 0.5, "arousal": 0.5, "connection": 0.5}
    res = analyze_vac_coordinates(data)

    assert res["valence"]["value"] == 0.5
    assert res["valence"]["interpretation"]
    assert "percentile" in res["valence"]
    assert "quadrant" in res


@pytest.mark.parametrize(
    "valence,arousal,expected_quadrant",
    [
        (0.5, 0.5, "High positive energy (excited, joyful)"),
        (0.5, -0.5, "Low positive energy (calm, content)"),  # Line 79
        (-0.5, 0.5, "High negative energy (anxious, angry)"),
        (-0.5, -0.5, "Low negative energy (sad, depressed)"),
    ],
)
def test_analyze_vac_coordinates_quadrants(valence, arousal, expected_quadrant):
    res = analyze_vac_coordinates({"valence": valence, "arousal": arousal})
    assert res["quadrant"] == expected_quadrant
