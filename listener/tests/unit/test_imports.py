import importlib
import sys
from unittest.mock import MagicMock, patch


# Helper to reload module with patched sys.modules
def reload_with_missing_modules(module_name, missing_modules):
    with patch.dict(sys.modules):
        for mod in missing_modules:
            sys.modules[mod] = None

        # We need to ensure the module is re-imported from scratch
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
        else:
            importlib.import_module(module_name)

        return sys.modules[module_name]


class TestImportFailures:

    def test_transcription_whisper_missing(self):
        """Test TranscriptionService when whisper is not installed."""
        # 1. Force reload app.services.transcription with whisper=None
        with patch.dict(sys.modules, {"whisper": None}):
            # We must remove it from sys.modules to force re-import logic execution
            if "app.services.transcription" in sys.modules:
                del sys.modules["app.services.transcription"]

            import app.services.transcription

            importlib.reload(app.services.transcription)

            assert app.services.transcription.WHISPER_AVAILABLE is False
            assert app.services.transcription.whisper is None

    def test_prosody_librosa_missing(self):
        """Test ProsodyAnalyzer when librosa is missing."""
        with patch.dict(sys.modules, {"librosa": None}):
            if "app.services.prosody_analyzer" in sys.modules:
                del sys.modules["app.services.prosody_analyzer"]

            import app.services.prosody_analyzer

            importlib.reload(app.services.prosody_analyzer)

            assert app.services.prosody_analyzer.LIBROSA_AVAILABLE is False

    def test_prosody_parselmouth_missing(self):
        """Test ProsodyAnalyzer when parselmouth is missing."""
        # librosa present, parselmouth missing
        mock_librosa = MagicMock()
        with patch.dict(
            sys.modules, {"parselmouth": None, "parselmouth.praat": None, "librosa": mock_librosa}
        ):
            if "app.services.prosody_analyzer" in sys.modules:
                del sys.modules["app.services.prosody_analyzer"]

            import app.services.prosody_analyzer

            importlib.reload(app.services.prosody_analyzer)

            assert app.services.prosody_analyzer.PARSELMOUTH_AVAILABLE is False
            assert app.services.prosody_analyzer.LIBROSA_AVAILABLE is True

    def test_audio_utils_ffmpeg_missing(self):
        """Test AudioUtils when ffmpeg is missing."""
        with patch.dict(sys.modules, {"ffmpeg": None}):
            if "app.utils.audio_utils" in sys.modules:
                del sys.modules["app.utils.audio_utils"]

            import app.utils.audio_utils

            importlib.reload(app.utils.audio_utils)

            assert app.utils.audio_utils.FFMPEG_AVAILABLE is False
