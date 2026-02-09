"""Prosody Analyzer Service.

Extracts voice characteristics (pitch, energy, speech rate, voice quality) from audio.

This module analyzes the acoustic properties of speech beyond the words themselves—
the "how" someone speaks, not just "what" they say. Prosodic features like pitch,
energy, and speech rate provide additional emotional cues that complement semantic
analysis for more accurate emotion detection.

Key Components:
    ProsodyAnalyzer: Main class for prosody feature extraction
    get_prosody_analyzer: Factory function returning singleton instance

Features Extracted:
    - Pitch (F0): Fundamental frequency (mean, std, range)
    - Energy: Vocal intensity (RMS, peak)
    - Speech Rate: Syllables per second (estimated)
    - Voice Quality: Jitter, shimmer, HNR (requires parselmouth)

Dependencies:
    - librosa: Basic prosody features (pitch, energy, rate)
    - parselmouth: Advanced voice quality (jitter, shimmer, HNR)
    - Optional: Falls back to mock data if libraries unavailable

Integration Points:
    - Used by: routes/ingest.py (analyze-audio endpoint)
    - Complements: semantic_analyzer.py (text analysis)
    - Enables: 3-way analysis (content, voice, blended)

Performance:
    - Latency: ~200-500ms per audio file
    - Memory: ~100MB for librosa/numpy operations

Examples:
    >>> from app.services.prosody_analyzer import get_prosody_analyzer
    >>> analyzer = get_prosody_analyzer()
    >>> prosody = analyzer.analyze("recording.wav")
    >>> print(f"Pitch: {prosody['pitch_mean']:.1f}Hz")
    "Pitch: 185.5Hz"

See Also:
    - Voice Analysis: docs/features/voice-analysis/PROSODY-SYSTEM.md
    - 3-Way Analysis: docs/features/voice-analysis/THREE-WAY-ANALYSIS.md
    - Tests: tests/unit/test_prosody.py
"""

import logging
from typing import Any, Dict, Optional

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)

# Try to import libraries (they may not be installed yet)
try:
    import librosa

    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logger.warning("librosa not installed - prosody analysis will return mock data")

try:
    import parselmouth
    from parselmouth.praat import call

    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False
    logger.warning("parselmouth not installed - advanced voice quality metrics unavailable")


class ProsodyAnalyzer:  # pylint: disable=too-few-public-methods
    """Extract prosodic features from audio for emotional voice analysis.

    Analyzes acoustic properties of speech beyond words:
    - How someone speaks (prosody)
    - Not just what they say (semantics)

    This enables detection of emotions that words might hide or contradict,
    supporting the 3-way analysis feature (content, voice, blended).

    Architecture:
        Input: Audio file (WAV, M4A, etc.)
        Processing: librosa (pitch, energy, rate) + parselmouth (voice quality)
        Output: Dictionary of prosodic features + interpretations

    Features Extracted:
        Basic (librosa):
        - Pitch (F0): Fundamental frequency statistics
        - Energy: Vocal intensity (RMS)
        - Speech Rate: Estimated syllables/second

        Advanced (parselmouth - optional):
        - Jitter: Pitch period variability
        - Shimmer: Amplitude variability
        - HNR: Harmonics-to-noise ratio

    Performance:
        - Latency: ~200-500ms per audio file
        - Memory: ~100MB for numpy/librosa
        - GPU: Not used (CPU-only operations)

    Attributes:
        librosa_available (bool): Whether librosa is installed
        parselmouth_available (bool): Whether parselmouth is installed

    Sample Usage:
        Basic usage:
        >>> analyzer = ProsodyAnalyzer()
        >>> prosody = analyzer.analyze("recording.wav")
        >>> print(prosody)
        {
          'pitch_mean': 185.5,
          'energy': 0.065,
          'rate': 3.2,
          'interpretation': {...}
        }

        Check feature availability:
        >>> analyzer = get_prosody_analyzer()
        >>> print(f"Librosa: {analyzer.librosa_available}")
        >>> print(f"Parselmouth: {analyzer.parselmouth_available}")

    See Also:
        - Singleton: get_prosody_analyzer()
        - Voice Analysis: docs/features/voice-analysis/PROSODY-SYSTEM.md
        - 3-Way Analysis: docs/features/voice-analysis/THREE-WAY-ANALYSIS.md

    Notes:
        - Falls back to mock data if librosa not installed
        - Parselmouth is optional (for advanced features)
        - Interpretations are rule-based (not ML)
        - Complements semantic analysis (text + voice = better accuracy)

    Dependencies:
        Required: numpy
        Recommended: librosa, soundfile
        Optional: parselmouth (Praat bindings)
    """

    def __init__(self) -> None:
        """Initialize prosody analyzer and check for required dependencies."""
        self.librosa_available = LIBROSA_AVAILABLE
        self.parselmouth_available = PARSELMOUTH_AVAILABLE

        if not self.librosa_available:
            logger.error(
                "Prosody analysis requires librosa - install with: pip install librosa soundfile"
            )

    def analyze(self, audio_path: str) -> Dict[str, Any]:
        """Extract prosodic features from audio file.

        Args:
            audio_path: Path to audio file

        Returns:
            Dictionary with prosody features
        """
        logger.info("Analyzing prosody for: %s", audio_path)

        if not self.librosa_available:
            return self._get_mock_prosody()

        try:
            # Load audio
            y, sr_float = librosa.load(audio_path, sr=None)
            duration = librosa.get_duration(y=y, sr=sr_float)

            # Convert sample rate to int (it's always a whole number conceptually)
            sr = int(sr_float)

            logger.debug("Audio loaded: duration=%.2fs, sr=%dHz", duration, sr)

            # Extract basic prosody
            prosody: Dict[str, Any] = {}

            # Pitch (F0) analysis
            pitch_features = self._extract_pitch(y, sr)
            prosody.update(pitch_features)

            # Energy analysis
            energy_features = self._extract_energy(y)
            prosody.update(energy_features)

            # Speech rate (approximate)
            rate = self._estimate_speech_rate(y, sr, duration)
            prosody["rate"] = rate
            prosody["duration"] = round(duration, 2)

            # Advanced voice quality (if parselmouth available)
            if self.parselmouth_available:
                quality_features = self._extract_voice_quality(audio_path)
                prosody.update(quality_features)

            # Interpret findings
            prosody["interpretation"] = self._interpret_prosody(prosody)

            logger.info(
                "Prosody analysis complete: pitch=%.1fHz, energy=%.2f",
                prosody.get("pitch_mean", 0),
                prosody.get("energy", 0),
            )

            return prosody

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Prosody analysis failed: %s", e, exc_info=True)
            return self._get_mock_prosody()

    def _extract_pitch(self, y: NDArray[np.float32], sr: int) -> Dict[str, float]:
        """Extract fundamental frequency (F0/pitch) statistics using librosa's PYIN algorithm.

        PYIN (Probabilistic YIN) is optimized for voice and handles:
        - Octave errors better than standard autocorrelation
        - Variable voice quality (breathiness, hoarseness)
        - Transitions between voiced and unvoiced speech

        The algorithm works by:
        1. Dividing audio into overlapping frames
        2. Computing autocorrelation for each frame
        3. Finding the period that minimizes the difference function
        4. Converting period to frequency (F0)
        5. Applying probabilistic voicing threshold
        6. Outputting F0 values for voiced frames (NaN for unvoiced)

        Args:
            y: Audio time series as numpy array (samples)
            sr: Sample rate in Hz (typically 16000 or 22050)

        Returns:
            dict: Pitch statistics with keys:
                - pitch_mean: Average pitch across voiced frames (Hz)
                - pitch_std: Standard deviation (pitch variability)
                - pitch_min: Minimum pitch detected (Hz)
                - pitch_max: Maximum pitch detected (Hz)
                - pitch_range: Max - min (pitch range in Hz)

                Returns zeros if no voiced speech detected.

        Performance:
            - Latency: ~50-100ms for 10s audio
            - Memory: ~50MB for numpy operations

        Notes:
            - Pitch range C2-C7 (65-2093 Hz) covers full human voice range
            - C2 (65 Hz) captures low male voices
            - C7 (2093 Hz) captures high soprano range
            - Unvoiced frames (silence, noise) are filtered out
            - Better than autocorrelation for speech (handles octave errors)

        Examples:
            Typical results:
            - Male voice: 100-150 Hz mean
            - Female voice: 180-250 Hz mean
            - High variability: Emotional or stressed speech

        See Also:
            - PYIN paper: https://librosa.org/doc/main/generated/librosa.pyin.html
            - YIN algorithm: De Cheveigné & Kawahara (2002)
        """
        try:
            # Use pyin for pitch tracking (works better for voice than autocorrelation)
            # C2 (65 Hz) = Lower limit of human voice (bass singers)
            # C7 (2093 Hz) = Upper limit of human voice (soprano high notes)
            f0, _voiced_flag, _voiced_probs = librosa.pyin(
                y,
                fmin=float(librosa.note_to_hz("C2")),  # 65 Hz - Lower limit of human voice
                fmax=float(librosa.note_to_hz("C7")),  # 2093 Hz - Upper limit of human voice
                sr=sr,
            )

            # Filter out unvoiced frames (NaN values)
            f0_voiced = f0[~np.isnan(f0)]

            if len(f0_voiced) > 0:
                return {
                    "pitch_mean": float(np.mean(f0_voiced)),
                    "pitch_std": float(np.std(f0_voiced)),
                    "pitch_min": float(np.min(f0_voiced)),
                    "pitch_max": float(np.max(f0_voiced)),
                    "pitch_range": float(np.max(f0_voiced) - np.min(f0_voiced)),
                }

            logger.warning("No voiced frames detected in pitch analysis")
            return {
                "pitch_mean": 0.0,
                "pitch_std": 0.0,
                "pitch_min": 0.0,
                "pitch_max": 0.0,
                "pitch_range": 0.0,
            }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Pitch extraction failed: %s", e)
            return {}

    def _extract_energy(self, y: NDArray[np.float32]) -> Dict[str, float]:
        """Extract vocal energy/intensity statistics using RMS (Root Mean Square).

        RMS energy measures the average power/loudness of the audio signal.
        Higher RMS indicates louder, more intense speech, which often correlates
        with high arousal emotions (excitement, anger, panic).

        Args:
            y: Audio time series as numpy array (samples)

        Returns:
            dict: Energy statistics with keys:
                - energy: Mean RMS energy (average intensity)
                - energy_std: Standard deviation (intensity variability)
                - energy_max: Maximum RMS energy (peak intensity)

        Performance:
            - Latency: ~10-20ms for 10s audio (very fast)
            - Memory: ~20MB

        Notes:
            - RMS is computed over short frames (default: 2048 samples)
            - Values are normalized to [0, 1] range
            - Energy < 0.02 typically indicates quiet/subdued speech
            - Energy > 0.1 indicates loud/intense speech

        Examples:
            Typical ranges:
            - Whisper: 0.01-0.02
            - Normal conversation: 0.04-0.08
            - Excited/loud speech: 0.1-0.3

        See Also:
            - librosa.feature.rms: https://librosa.org/doc/main/generated/librosa.feature.rms.html
        """
        try:
            # RMS (Root Mean Square) energy - measures average power/loudness
            rms = librosa.feature.rms(y=y)

            return {
                "energy": float(np.mean(rms)),  # Average intensity across entire audio
                "energy_std": float(np.std(rms)),  # Intensity variability
                "energy_max": float(np.max(rms)),  # Peak intensity
            }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Energy extraction failed: %s", e)
            return {}

    def _estimate_speech_rate(self, y: NDArray[np.float32], sr: int, duration: float) -> float:
        """Estimate speech rate in syllables per second using onset detection.

        Since direct syllable detection is complex, we use acoustic onsets (sudden
        increases in energy) as a proxy. Each onset typically corresponds to a
        syllable boundary in natural speech.

        This is an approximation—actual syllable count may vary, but the relative
        rate is useful for emotional analysis (fast speech suggests high arousal).

        Args:
            y: Audio time series as numpy array
            sr: Sample rate in Hz
            duration: Audio duration in seconds

        Returns:
            float: Estimated syllables per second (rounded to 2 decimals)
                Returns 0.0 if duration is 0 or onset detection fails

        Performance:
            - Latency: ~30-50ms for 10s audio

        Notes:
            - Onset = sudden increase in spectral energy
            - Approximates syllable boundaries in natural speech
            - Accuracy varies with speech clarity and language
            - Fast rate (> 4.5 syl/sec) suggests excitement or anxiety
            - Slow rate (< 2.5 syl/sec) suggests calm or fatigue

        Examples:
            Typical rates:
            - Slow/deliberate: 2.0-3.0 syl/sec
            - Normal conversation: 3.0-4.5 syl/sec
            - Fast/excited: 4.5-6.0 syl/sec

        See Also:
            - librosa.onset: https://librosa.org/doc/main/generated/librosa.onset.onset_detect.html
        """
        try:
            # Detect onsets (approximates syllables)
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)

            # Estimate syllables per second
            if duration > 0:
                rate = len(onsets) / duration
                return round(rate, 2)

            return 0.0

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Speech rate estimation failed: %s", e)
            return 0.0

    def _extract_voice_quality(self, audio_path: str) -> Dict[str, Any]:
        """Extract advanced voice quality metrics using Parselmouth/Praat.

        Computes clinical voice quality measures that indicate:
        - Vocal stability (jitter)
        - Amplitude control (shimmer)
        - Voice clarity (HNR)

        These metrics are used in clinical voice assessment and can indicate:
        - Stress/fatigue (high jitter/shimmer, low HNR)
        - Emotional state (voice quality degrades under stress)
        - Vocal health

        Args:
            audio_path: Path to audio file (must be readable by parselmouth)

        Returns:
            dict: Voice quality metrics with keys:
                - jitter: Pitch period variability (%), normal < 1%
                - shimmer: Amplitude variability (%), normal < 3%
                - hnr: Harmonics-to-noise ratio (dB), normal > 10dB
                - voice_quality: Categorical assessment ('good', 'moderate', 'poor')

                Returns empty dict if parselmouth unavailable or analysis fails.

        Performance:
            - Latency: ~100-200ms (Praat operations are slower than librosa)
            - Memory: ~50MB

        Notes:
            - Requires parselmouth library (optional dependency)
            - Jitter < 1% = stable voice (calm)
            - Jitter > 1% = unstable voice (stress/emotion)
            - Shimmer < 3% = controlled amplitude
            - Shimmer > 3% = variable amplitude (stress/fatigue)
            - HNR > 10dB = clear, healthy voice
            - HNR < 5dB = hoarse/breathy voice (fatigue/stress)

        Examples:
            Typical values:
            - Calm speech: jitter ~0.5%, shimmer ~2%, HNR ~15dB
            - Stressed speech: jitter ~1.2%, shimmer ~4%, HNR ~8dB
            - Crying/distressed: jitter ~2%, shimmer ~6%, HNR ~5dB

        See Also:
            - Parselmouth: https://parselmouth.readthedocs.io/
            - Praat: http://www.fon.hum.uva.nl/praat/
            - Clinical voice assessment standards
        """
        try:
            # Load audio with parselmouth
            snd = parselmouth.Sound(audio_path)  # pylint: disable=c-extension-no-member

            # Create pitch object for jitter/shimmer analysis
            # Parameters: time_step=0.0 (auto), pitch_floor=75Hz, pitch_ceiling=600Hz
            call(snd, "To Pitch", 0.0, 75, 600)

            # Create point process (periodic pitch marks) for jitter/shimmer
            # "cc" = cross-correlation method (more accurate for voice)
            point_process = call(snd, "To PointProcess (periodic, cc)", 75, 600)

            # Jitter (local) - pitch period-to-period variability
            # Parameters: shortest_period=0.0001, longest_period=0.02, max_period_factor=1.3
            jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

            # Shimmer (local) - amplitude period-to-period variability
            # Parameters: shortest_period=0.0001, longest_period=0.02,
            # max_period_factor=1.3, max_amplitude_factor=1.6
            shimmer = call(
                [snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
            )

            # Harmonicity (HNR) - ratio of periodic to aperiodic components
            # Parameters: time_step=0.01, pitch_floor=75, silence_threshold=0.1,
            # periods_per_window=1.0
            harmonicity = call(snd, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
            hnr = call(harmonicity, "Get mean", 0, 0)

            # Interpret voice quality based on HNR (clinical thresholds)
            # HNR > 10dB = good (clear, stable voice)
            # HNR 5-10dB = moderate (some breathiness)
            # HNR < 5dB = poor (hoarse, strained)
            voice_quality = "good" if hnr > 10 else "moderate" if hnr > 5 else "poor"

            return {
                "jitter": round(jitter * 100, 3),  # Convert to percentage (normal < 1%)
                "shimmer": round(shimmer * 100, 3),  # Convert to percentage (normal < 3%)
                "hnr": round(hnr, 2),  # Harmonics-to-noise ratio in dB (normal > 10dB)
                "voice_quality": voice_quality,  # Categorical assessment
            }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Voice quality extraction failed: %s", e)
            return {}

    def _interpret_prosody(self, prosody: Dict[str, Any]) -> Dict[str, str]:
        """Generate human-readable interpretations of prosody features.

        Converts numeric prosody measurements into plain language descriptions
        that are meaningful for clinical and therapeutic contexts.

        Uses research-based thresholds to categorize:
        - Pitch levels (emotional arousal indicator)
        - Energy levels (vocal intensity/engagement)
        - Speech rate (cognitive/emotional state)
        - Voice quality (stress/fatigue indicator)

        Args:
            prosody: Dictionary of prosody measurements from extraction methods

        Returns:
            dict: Human-readable interpretations with keys:
                - pitch: Pitch level interpretation
                - energy: Energy level interpretation
                - rate: Speech rate interpretation
                - quality: Voice quality interpretation (if HNR available)

        Interpretation Thresholds:
            Pitch (Hz):
            - < 120: Low (calm, low energy, or male voice)
            - 120-200: Moderate (normal conversation)
            - > 200: High (excited, stressed, or female voice)

            Energy (RMS):
            - < 0.02: Very low (quiet, subdued)
            - 0.02-0.05: Low (calm)
            - 0.05-0.1: Moderate (normal)
            - > 0.1: High (intense, loud)

            Rate (syllables/sec):
            - < 2.5: Slow (deliberate, tired, depressed)
            - 2.5-4.5: Normal
            - > 4.5: Fast (excited, anxious, manic)

            HNR (dB):
            - > 15: Excellent voice quality
            - 10-15: Good voice quality
            - 5-10: Moderate (some breathiness/strain)
            - < 5: Poor (hoarse, strained, stressed)

        Examples:
            >>> prosody = {'pitch_mean': 220, 'energy': 0.08, 'rate': 5.2, 'hnr': 8}
            >>> interp = analyzer._interpret_prosody(prosody)
            >>> print(interp)
            {
              'pitch': 'High pitch (excited or stressed)',
              'energy': 'Moderate vocal energy (normal)',
              'rate': 'Fast speech (excited or anxious)',
              'quality': 'Moderate quality (some breathiness)'
            }

        Notes:
            - Thresholds are research-based but not absolute
            - Context matters (gender, age, culture affect norms)
            - Multiple factors should be considered together
            - High pitch + high energy + fast rate = high arousal

        See Also:
            - Emotional prosody research literature
            - Clinical voice assessment standards
        """
        interpretation = {}

        # Pitch interpretation
        interpretation["pitch"] = self._interpret_pitch(prosody.get("pitch_mean", 0))

        # Energy interpretation
        interpretation["energy"] = self._interpret_energy(prosody.get("energy", 0))

        # Rate interpretation
        interpretation["rate"] = self._interpret_rate(prosody.get("rate", 0))

        # Voice quality interpretation
        interpretation["quality"] = self._interpret_quality(prosody.get("hnr"))

        # Remove None values
        return {k: v for k, v in interpretation.items() if v is not None}

    def _interpret_pitch(self, pitch_mean: float) -> Optional[str]:
        """Interpret pitch level."""
        if pitch_mean <= 0:
            return None
        if pitch_mean < 120:
            return "Low pitch (calm or low energy)"
        if pitch_mean < 200:
            return "Moderate pitch (normal conversation)"
        return "High pitch (excited or stressed)"

    def _interpret_energy(self, energy: float) -> Optional[str]:
        """Interpret energy level."""
        if energy < 0.02:
            return "Very low vocal energy (quiet or subdued)"
        if energy < 0.05:
            return "Low vocal energy (calm)"
        if energy < 0.1:
            return "Moderate vocal energy (normal)"
        return "High vocal energy (intense or loud)"

    def _interpret_rate(self, rate: float) -> Optional[str]:
        """Interpret speech rate."""
        if rate <= 0:
            return None
        if rate < 2.5:
            return "Slow speech (deliberate or tired)"
        if rate < 4.5:
            return "Normal speech rate"
        return "Fast speech (excited or anxious)"

    def _interpret_quality(self, hnr: Optional[float]) -> Optional[str]:
        """Interpret voice quality."""
        if hnr is None:
            return None
        if hnr > 15:
            return "Excellent voice quality (clear, strong)"
        if hnr > 10:
            return "Good voice quality"
        if hnr > 5:
            return "Moderate quality (some breathiness)"
        return "Poor quality (hoarse or strained)"

    def _get_mock_prosody(self) -> Dict[str, Any]:
        """Return mock/placeholder prosody data when librosa is unavailable.

        This fallback ensures the API doesn't break when optional dependencies
        (librosa, parselmouth) are not installed. Returns realistic-looking
        data that matches the expected schema but with placeholder values.

        Use case: Development environments where librosa isn't needed, or
        when testing API endpoints without full prosody analysis.

        Returns:
            dict: Mock prosody features with typical values:
                - pitch_mean: 150.0 Hz (mid-range voice)
                - energy: 0.05 (moderate energy)
                - rate: 3.5 syl/sec (normal speech rate)
                - All interpretations indicate mock data

        Notes:
            - Logs warning so developers know real analysis isn't happening
            - Values are in typical ranges but not based on actual audio
            - Duration is 0.0 (no actual audio processed)
            - Allows API to return 200 even when librosa unavailable

        Examples:
            When called:
            >>> prosody = analyzer._get_mock_prosody()
            >>> print(prosody['pitch_mean'])
            150.0
            >>> print(prosody['interpretation']['pitch'])
            "Mock data - install librosa"

        See Also:
            - Real analysis: analyze()
            - Dependencies: librosa, soundfile (install to get real data)
        """
        logger.warning("Using mock prosody data - install librosa for real analysis")

        return {
            "pitch_mean": 150.0,  # Mid-range pitch (between male/female average)
            "pitch_std": 25.0,  # Moderate variability
            "pitch_min": 100.0,  # Lower end of range
            "pitch_max": 200.0,  # Upper end of range
            "pitch_range": 100.0,  # Full range
            "energy": 0.05,  # Moderate energy (normal conversation level)
            "energy_std": 0.02,  # Some variability
            "energy_max": 0.15,  # Peak energy
            "rate": 3.5,  # Normal speech rate (syllables per second)
            "duration": 0.0,  # No actual audio processed
            "interpretation": {
                "pitch": "Mock data - install librosa",
                "energy": "Mock data - install librosa",
                "rate": "Mock data - install librosa",
            },
        }


# Global instance
_PROSODY_ANALYZER_INSTANCE: Optional[ProsodyAnalyzer] = None


def get_prosody_analyzer() -> ProsodyAnalyzer:
    """Get or create global ProsodyAnalyzer instance (singleton pattern).

    This function implements the singleton pattern to ensure only one ProsodyAnalyzer
    instance exists throughout the application lifetime. This is important because:
    1. Librosa/parselmouth models are memory-intensive (~100MB)
    2. Multiple instances would waste memory
    3. Singleton ensures efficient resource usage

    The instance is created lazily (on first call) and cached for subsequent calls.

    Returns:
        ProsodyAnalyzer: Global analyzer instance

    Examples:
        Basic usage (recommended pattern):
        >>> analyzer = get_prosody_analyzer()
        >>> prosody = analyzer.analyze("recording.wav")

        Multiple calls return same instance:
        >>> analyzer1 = get_prosody_analyzer()
        >>> analyzer2 = get_prosody_analyzer()
        >>> assert analyzer1 is analyzer2  # Same object

        In API endpoints:
        >>> from app.services.prosody_analyzer import get_prosody_analyzer
        >>>
        >>> @router.post("/analyze-audio")
        >>> async def analyze_audio(audio: UploadFile):
        >>>     analyzer = get_prosody_analyzer()
        >>>     prosody = analyzer.analyze(audio.file)
        >>>     return prosody

    Notes:
        - Thread-safe: Python's GIL ensures singleton creation is safe
        - Lazy initialization: Instance created on first call, not at import
        - No configuration parameters (uses defaults)
        - For custom configuration, create ProsodyAnalyzer() directly

    See Also:
        - ProsodyAnalyzer class for direct instantiation
        - app/api/routes/ingest.py for usage examples
    """
    global _PROSODY_ANALYZER_INSTANCE  # pylint: disable=global-statement

    if _PROSODY_ANALYZER_INSTANCE is None:
        _PROSODY_ANALYZER_INSTANCE = ProsodyAnalyzer()

    return _PROSODY_ANALYZER_INSTANCE
