"""Unit tests for Temporal Proximity correlation algorithm."""

from app.services.correlation.temporal import (
    MIN_CONFIDENCE,
    MIN_STRENGTH,
    WINDOWS,
    TemporalCorrelation,
    TemporalProximityAnalyzer,
)


class TestChiSquared:
    """Test the chi-squared significance computation."""

    def test_no_observations(self) -> None:
        """Zero observations → zero everything."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=0, expected=0.0, sample_size=0
        )
        assert strength == 0.0
        assert confidence == 0.0
        assert chi_sq == 0.0

    def test_expected_equals_observed(self) -> None:
        """When observed == expected, chi_sq should be 0."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=5, expected=5.0, sample_size=10
        )
        assert chi_sq == 0.0
        assert strength == 0.0

    def test_strong_positive_correlation(self) -> None:
        """Much higher observed than expected → strong correlation."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=9, expected=2.0, sample_size=10
        )
        # (9-2)^2 / 2 = 49/2 = 24.5
        assert chi_sq == 24.5
        assert strength > 0.5
        assert confidence > 0.95

    def test_moderate_correlation(self) -> None:
        """Moderate difference → moderate strength."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=6, expected=3.0, sample_size=10
        )
        # (6-3)^2 / 3 = 3.0
        assert chi_sq == 3.0
        assert 0.1 < strength < 0.8

    def test_weak_correlation(self) -> None:
        """Small difference → weak correlation."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=3, expected=2.5, sample_size=10
        )
        # (3-2.5)^2 / 2.5 = 0.1
        assert chi_sq == 0.1
        assert strength < 0.2

    def test_large_sample_high_confidence(self) -> None:
        """Large sample with clear effect → high confidence."""
        strength, confidence, chi_sq = TemporalProximityAnalyzer._chi_squared(
            observed=80, expected=20.0, sample_size=100
        )
        assert chi_sq > 6.63  # p < 0.01 threshold
        assert confidence > 0.99

    def test_strength_capped_at_one(self) -> None:
        """Strength should never exceed 1.0."""
        strength, _, _ = TemporalProximityAnalyzer._chi_squared(
            observed=100, expected=1.0, sample_size=5
        )
        assert strength <= 1.0


class TestTemporalCorrelationDataclass:
    """Test the TemporalCorrelation data class."""

    def test_creation(self) -> None:
        """Test basic instantiation."""
        tc = TemporalCorrelation(
            event_type="wellness.exercise",
            emotion_name="Joy",
            emotion_category="When Things Are Good",
            strength=0.72,
            direction="positive",
            confidence=0.95,
            lag_seconds=3600,
            sample_size=30,
            window_label="2hr",
            evidence={"p_value": 0.003},
        )
        assert tc.event_type == "wellness.exercise"
        assert tc.emotion_name == "Joy"
        assert tc.strength == 0.72
        assert tc.direction == "positive"
        assert tc.window_label == "2hr"

    def test_negative_direction(self) -> None:
        """Test negative direction (event → negative emotion)."""
        tc = TemporalCorrelation(
            event_type="wellness.substance",
            emotion_name="Anxiety",
            emotion_category="When Things Are Uncertain",
            strength=0.67,
            direction="negative",
            confidence=0.92,
            lag_seconds=5400,
            sample_size=45,
            window_label="2hr",
            evidence={"baseline_rate": 0.15, "observed_rate": 0.67},
        )
        assert tc.direction == "negative"
        assert tc.lag_seconds == 5400


class TestConstants:
    """Test that analysis constants are reasonable."""

    def test_windows_ordered(self) -> None:
        """Windows should be in ascending order."""
        secs = [w[0] for w in WINDOWS]
        assert secs == sorted(secs)

    def test_min_thresholds(self) -> None:
        """Thresholds should be in valid ranges."""
        assert 0.0 < MIN_STRENGTH < 1.0
        assert 0.0 < MIN_CONFIDENCE < 1.0

    def test_four_windows(self) -> None:
        """Should have 4 analysis windows."""
        assert len(WINDOWS) == 4
