from unittest.mock import MagicMock, patch

import pytest

from app.utils.audio_utils import AudioProcessor, cleanup_temp_files


@pytest.fixture
def mock_ffmpeg():
    with patch("app.utils.audio_utils.ffmpeg") as mock:
        # Define a real Exception class for mocking
        class MockFFmpegError(Exception):
            def __init__(self, cmd, stdout, stderr):
                self.cmd = cmd
                self.stdout = stdout
                self.stderr = stderr

        mock.Error = MockFFmpegError
        yield mock


class TestAudioProcessor:
    def test_validate_audio_file_exists(self):
        """Test validation of existing supported file."""
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = True
            assert AudioProcessor.validate_audio_file("test.wav")
            assert AudioProcessor.validate_audio_file("test.mp3")

    def test_validate_audio_file_missing(self):
        """Test validation of missing file."""
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = False
            assert not AudioProcessor.validate_audio_file("missing.wav")

    def test_validate_audio_file_unsupported(self):
        """Test validation of unsupported format."""
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = True
            assert not AudioProcessor.validate_audio_file("test.txt")

    def test_get_audio_duration(self, mock_ffmpeg):
        """Test getting duration."""
        mock_ffmpeg.probe.return_value = {"format": {"duration": "10.5"}}
        duration = AudioProcessor.get_audio_duration("test.wav")
        assert duration == 10.5
        mock_ffmpeg.probe.assert_called_with("test.wav")

    def test_get_audio_duration_error(self, mock_ffmpeg):
        """Test duration error handling."""
        mock_ffmpeg.probe.side_effect = Exception("Probe failed")
        duration = AudioProcessor.get_audio_duration("test.wav")
        assert duration == 0.0

    def test_get_audio_info(self, mock_ffmpeg):
        """Test getting audio details."""
        mock_ffmpeg.probe.return_value = {
            "format": {"duration": "10.5"},
            "streams": [
                {
                    "codec_type": "audio",
                    "sample_rate": "44100",
                    "channels": 2,
                    "codec_name": "mp3",
                    "bit_rate": "128000",
                }
            ],
        }
        info = AudioProcessor.get_audio_info("test.mp3")
        assert info["sample_rate"] == 44100
        assert info["channels"] == 2
        assert info["duration"] == 10.5

    def test_get_audio_info_no_stream(self, mock_ffmpeg):
        """Test info when no audio stream exists."""
        mock_ffmpeg.probe.return_value = {"format": {}, "streams": []}
        info = AudioProcessor.get_audio_info("test.mp4")
        assert info == {}

    def test_get_audio_info_error(self, mock_ffmpeg):
        """Test audio info extraction error."""
        mock_ffmpeg.probe.side_effect = Exception("Probe failed")
        info = AudioProcessor.get_audio_info("test.wav")
        assert info == {}

    def test_normalize_audio(self, mock_ffmpeg):
        """Test audio normalization."""
        # Mock validation to pass
        with patch.object(AudioProcessor, "validate_audio_file", return_value=True):
            input_path = "input.wav"

            # Setup ffmpeg chain
            stream_mock = MagicMock()
            mock_ffmpeg.input.return_value = stream_mock
            mock_ffmpeg.output.return_value = stream_mock
            mock_ffmpeg.overwrite_output.return_value = stream_mock

            output_path = AudioProcessor.normalize_audio(input_path)

            # Verify ffmpeg calls
            mock_ffmpeg.input.assert_called_with(input_path)
            mock_ffmpeg.output.assert_called_with(
                stream_mock,
                output_path,  # auto-generated path
                acodec="pcm_s16le",
                ac=1,
                ar=16000,
                loglevel="error",
            )
            mock_ffmpeg.run.assert_called_once()
            assert "_normalized.wav" in output_path

    def test_normalize_audio_invalid_input(self):
        """Test normalization with invalid input."""
        with patch.object(AudioProcessor, "validate_audio_file", return_value=False):
            with pytest.raises(ValueError, match="Invalid audio file"):
                AudioProcessor.normalize_audio("bad.wav")

    def test_normalize_audio_ffmpeg_error(self, mock_ffmpeg):
        """Test ffmpeg error during normalization."""
        with patch.object(AudioProcessor, "validate_audio_file", return_value=True):
            # Create a proper error instance
            mock_error = mock_ffmpeg.Error(cmd="ffmpeg", stdout=b"", stderr=b"ffmpeg error")
            mock_ffmpeg.run.side_effect = mock_error

            # Must setup chain to reach run()
            mock_ffmpeg.input.return_value = MagicMock()

            with pytest.raises(RuntimeError, match="Audio normalization failed"):
                AudioProcessor.normalize_audio("in.wav")

    def test_convert_to_wav(self, mock_ffmpeg):
        """Test wav conversion."""
        # Setup chain
        stream_mock = MagicMock()
        mock_ffmpeg.input.return_value = stream_mock
        mock_ffmpeg.output.return_value = stream_mock
        mock_ffmpeg.overwrite_output.return_value = stream_mock

        output = AudioProcessor.convert_to_wav("in.mp3")
        assert output.endswith(".wav")
        mock_ffmpeg.run.assert_called_once()

    def test_convert_to_wav_error(self, mock_ffmpeg):
        """Test error during simple conversion."""
        mock_error = mock_ffmpeg.Error(cmd="ffmpeg", stdout=b"", stderr=b"Convert failed")
        mock_ffmpeg.input.return_value = MagicMock()  # setup chain
        mock_ffmpeg.run.side_effect = mock_error

        with pytest.raises(RuntimeError, match="WAV conversion failed"):
            AudioProcessor.convert_to_wav("in.mp3")

    def test_convert_to_wav_error_with_output_path(self, mock_ffmpeg):
        """Test error during conversion with explicit output path."""
        mock_error = mock_ffmpeg.Error(cmd="ffmpeg", stdout=b"", stderr=b"Convert failed")
        mock_ffmpeg.input.return_value = MagicMock()
        mock_ffmpeg.run.side_effect = mock_error
        with pytest.raises(RuntimeError, match="WAV conversion failed"):
            AudioProcessor.convert_to_wav("in.mp3", "out.wav")

    def test_normalize_audio_default_output(self, mock_ffmpeg):
        # Test output_path=None
        mock_ffmpeg.run.return_value = (b"", b"")
        with patch.object(AudioProcessor, "validate_audio_file", return_value=True):
            # Setup ffmpeg chain
            stream_mock = MagicMock()
            mock_ffmpeg.input.return_value = stream_mock
            mock_ffmpeg.output.return_value = stream_mock
            mock_ffmpeg.overwrite_output.return_value = stream_mock

            path = AudioProcessor.normalize_audio("/tmp/test.mp3", None)
            assert path == "/tmp/test_normalized.wav"
            mock_ffmpeg.run.assert_called_once()

    def test_normalize_audio_explicit_output(self, mock_ffmpeg):
        # Test output_path provided (covers 90->94 branch)
        mock_ffmpeg.run.return_value = (b"", b"")
        with patch.object(AudioProcessor, "validate_audio_file", return_value=True):
            # Setup ffmpeg chain
            stream_mock = MagicMock()
            mock_ffmpeg.input.return_value = stream_mock
            mock_ffmpeg.output.return_value = stream_mock
            mock_ffmpeg.overwrite_output.return_value = stream_mock

            path = AudioProcessor.normalize_audio("/tmp/test.mp3", "/tmp/custom.wav")
            assert path == "/tmp/custom.wav"
            mock_ffmpeg.output.assert_called_with(
                stream_mock, "/tmp/custom.wav", acodec="pcm_s16le", ac=1, ar=16000, loglevel="error"
            )

    def test_convert_to_wav_default_output(self, mock_ffmpeg):
        mock_ffmpeg.run.return_value = (b"", b"")
        # Setup ffmpeg chain
        stream_mock = MagicMock()
        mock_ffmpeg.input.return_value = stream_mock
        mock_ffmpeg.output.return_value = stream_mock
        mock_ffmpeg.overwrite_output.return_value = stream_mock

        path = AudioProcessor.convert_to_wav("/tmp/test.mp3", None)
        assert path == "/tmp/test.wav"
        mock_ffmpeg.run.assert_called_once()


def test_cleanup_temp_files():
    """Test temp file cleanup."""
    with patch("os.path.exists", return_value=True), patch("os.remove") as mock_remove:

        cleanup_temp_files("temp1.wav", "temp2.wav")
        assert mock_remove.call_count == 2
        mock_remove.assert_any_call("temp1.wav")
        mock_remove.assert_any_call("temp2.wav")


def test_cleanup_temp_files_missing():
    """Test cleanup ignores missing files."""
    with patch("os.path.exists", return_value=False), patch("os.remove") as mock_remove:

        cleanup_temp_files("missing.wav")
        mock_remove.assert_not_called()


def test_cleanup_temp_files_error():
    """Test cleanup handles errors gratefully."""
    with (
        patch("os.path.exists", return_value=True),
        patch("os.remove", side_effect=OSError("Access denied")),
    ):

        # Should not raise exception
        cleanup_temp_files("locked.wav")
