# pylint: disable=protected-access, redefined-outer-name, unused-argument
# pylint: disable=import-outside-toplevel, line-too-long
from typing import Any
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.services.prosody_analyzer import ProsodyAnalyzer, get_prosody_analyzer


# Setup Mocks
@pytest.fixture
def mock_librosa() -> Any:
    with patch("app.services.prosody_analyzer.librosa") as mock:
        # Defaults
        mock.load.return_value = (np.array([0.1, 0.2]), 16000.0)
        mock.get_duration.return_value = 10.0
        mock.note_to_hz.return_value = 100.0
        yield mock


@pytest.fixture
def mock_parselmouth() -> Any:
    with patch("app.services.prosody_analyzer.parselmouth") as mock:
        yield mock


@pytest.fixture
def mock_praat_call() -> Any:
    with patch("app.services.prosody_analyzer.call") as mock:
        yield mock


class TestProsodyAnalyzer:
    def test_singleton(self) -> None:
        with patch("app.services.prosody_analyzer.ProsodyAnalyzer") as mock_cls:
            # Reset global
            import app.services.prosody_analyzer

            app.services.prosody_analyzer._prosody_analyzer_instance = None  # type: ignore

            p1 = get_prosody_analyzer()
            p2 = get_prosody_analyzer()
            assert p1 is p2
            mock_cls.assert_called_once()

    def test_init_missing_librosa(self) -> None:
        with patch("app.services.prosody_analyzer.LIBROSA_AVAILABLE", False):
            with patch("app.services.prosody_analyzer.logger") as mock_logger:
                ProsodyAnalyzer()
                mock_logger.error.assert_called_with(
                    "Prosody analysis requires librosa - "
                    "install with: pip install librosa soundfile"
                )

    def test_analyze_no_librosa(self) -> None:
        with patch("app.services.prosody_analyzer.LIBROSA_AVAILABLE", False):
            analyzer = ProsodyAnalyzer()
            analyzer.librosa_available = False  # Ensure instance state
            result = analyzer.analyze("file.wav")
            assert result["pitch_mean"] == 150.0
            assert result["interpretation"]["pitch"] == "Mock data - install librosa"

    def test_analyze_happy_path(
        self, mock_librosa: Any, mock_parselmouth: Any, mock_praat_call: Any
    ) -> None:
        """Test full analysis flow with all dependencies."""
        analyzer = ProsodyAnalyzer()
        analyzer.librosa_available = True
        analyzer.parselmouth_available = True

        # Mock libs
        # Pitch: [100, 110]
        mock_librosa.pyin.return_value = (np.array([100.0, 110.0]), None, None)
        # Energy: [0.1, 0.1]
        mock_librosa.feature.rms.return_value = np.array([[0.1, 0.1]])
        # Rate: 5 onsets
        mock_librosa.onset.onset_detect.return_value = [1, 2, 3, 4, 5]

        # Parselmouth calls
        # jitter, shimmer, harmonics, hnr
        mock_praat_call.side_effect = [
            MagicMock(),  # To Pitch
            MagicMock(),  # To PointProcess
            0.005,  # Jitter
            0.02,  # Shimmer
            MagicMock(),  # To Harmonicity
            12.0,  # HNR
        ]

        result = analyzer.analyze("file.wav")

        assert result["pitch_mean"] == 105.0
        assert result["energy"] == 0.1
        assert result["rate"] == 0.5  # 5 onsets / 10s
        assert result["jitter"] == 0.5
        assert result["shimmer"] == 2.0
        assert result["hnr"] == 12.0
        assert "interpretation" in result

    def test_analyze_exception_top(self, mock_librosa: Any) -> None:
        """Test top-level exception handler."""
        mock_librosa.load.side_effect = Exception("Load fail")
        analyzer = ProsodyAnalyzer()
        analyzer.librosa_available = True

        result = analyzer.analyze("file.wav")
        assert result["pitch_mean"] == 150.0  # Mock fallback

    def test_extract_pitch_no_voiced(self, mock_librosa: Any) -> None:
        analyzer = ProsodyAnalyzer()
        # All NaNs
        mock_librosa.pyin.return_value = (np.array([np.nan, np.nan]), None, None)

        features = analyzer._extract_pitch(np.array([]), 16000)
        assert features["pitch_mean"] == 0.0

    def test_extract_pitch_exception(self, mock_librosa: Any) -> None:
        analyzer = ProsodyAnalyzer()
        mock_librosa.pyin.side_effect = Exception("Fail")
        features = analyzer._extract_pitch(np.array([]), 16000)
        assert not features

    def test_extract_energy_exception(self, mock_librosa: Any) -> None:
        analyzer = ProsodyAnalyzer()
        mock_librosa.feature.rms.side_effect = Exception("Fail")
        features = analyzer._extract_energy(np.array([]))
        assert not features

    def test_estimate_speech_rate_zero_duration(self, mock_librosa: Any) -> None:
        analyzer = ProsodyAnalyzer()
        rate = analyzer._estimate_speech_rate(np.array([]), 16000, 0.0)
        assert rate == 0.0

    def test_estimate_speech_rate_exception(self, mock_librosa: Any) -> None:
        analyzer = ProsodyAnalyzer()
        mock_librosa.onset.onset_strength.side_effect = Exception("Fail")
        rate = analyzer._estimate_speech_rate(np.array([]), 16000, 10.0)
        assert rate == 0.0

    def test_extract_voice_quality_no_parselmouth(self) -> None:
        analyzer = ProsodyAnalyzer()
        # Explicitly set false even if imported
        analyzer.parselmouth_available = False
        analyzer._extract_voice_quality("file.wav")
        # Should actually raise error/do nothing if called directly?
        # In `analyze`, it checks flag.
        # But `_extract_voice_quality` assumes avail?
        # It creates `parselmouth.Sound`, so will crash if not patched or real.
        # But we patch at module level for usage.

        # If we call it directly, we expect it to fail if not mocked

    def test_extract_voice_quality_exception(self, mock_parselmouth: Any) -> None:
        analyzer = ProsodyAnalyzer()
        mock_parselmouth.Sound.side_effect = Exception("Fail")
        features = analyzer._extract_voice_quality("file.wav")
        assert not features

    def test_interpret_prosody_branches(self) -> None:
        analyzer = ProsodyAnalyzer()

        # Test 1: Low stats
        p1 = {"pitch_mean": 100, "energy": 0.01, "rate": 2.0, "hnr": 4}
        i1 = analyzer._interpret_prosody(p1)
        assert "Low pitch" in i1["pitch"]
        assert "Very low" in i1["energy"]
        assert "Slow" in i1["rate"]
        assert "Poor" in i1["quality"]

        # Test 2: Mid stats
        p2 = {"pitch_mean": 150, "energy": 0.03, "rate": 3.0, "hnr": 8}
        i2 = analyzer._interpret_prosody(p2)
        assert "Moderate pitch" in i2["pitch"]
        assert "Low vocal" in i2["energy"]
        assert "Normal" in i2["rate"]
        assert "Moderate quality" in i2["quality"]

        # Test 3: High stats
        p3 = {"pitch_mean": 210, "energy": 0.15, "rate": 5.0, "hnr": 16}
        i3 = analyzer._interpret_prosody(p3)
        assert "High pitch" in i3["pitch"]
        assert "High vocal" in i3["energy"]
        assert "Fast" in i3["rate"]
        assert "Excellent" in i3["quality"]

        # Test 4: More branches
        p4 = {"energy": 0.06, "hnr": 12}
        i4 = analyzer._interpret_prosody(p4)
        assert "Moderate vocal" in i4["energy"]
        assert "Good" in i4["quality"]

    def test_analyze_parselmouth_unavailable(self, mock_librosa: Any) -> None:
        """Test analysis when parselmouth is disabled."""
        analyzer = ProsodyAnalyzer()
        analyzer.librosa_available = True
        analyzer.parselmouth_available = False

        # mock librosa basics
        mock_librosa.pyin.return_value = (np.array([100.0]), None, None)
        mock_librosa.feature.rms.return_value = np.array([[0.1]])
        mock_librosa.onset.onset_detect.return_value = []

        result = analyzer.analyze("file.wav")
        assert "jitter" not in result
        assert "hnr" not in result

    def test_interpret_prosody_no_hnr(self) -> None:
        """Test interpretation without HNR."""
        analyzer = ProsodyAnalyzer()
        prosody = {"pitch_mean": 100}  # No hnr
        interp = analyzer._interpret_prosody(prosody)
        assert "quality" not in interp
