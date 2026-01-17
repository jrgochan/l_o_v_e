
import pytest
from unittest.mock import MagicMock, patch
import os
from app.services.pii_scrubber import PIIScrubber

class TestPIIScrubberCoverage:
    """Targeted tests for 100% coverage."""

    def test_detect_pii_empty(self):
        """Test detect_pii with empty input (Line 208)."""
        scrubber = PIIScrubber()
        assert scrubber.detect_pii("") == []
        assert scrubber.detect_pii("   ") == []
        assert scrubber.detect_pii(None) == []

    def test_env_var_override(self):
        """Test model path override via env var (Line 105)."""
        with patch.dict(os.environ, {"PII_MODEL_PATH": "custom-model-path"}):
            scrubber = PIIScrubber()
            assert scrubber.model_name == "custom-model-path"

    def test_scrub_overlap(self):
        """Test regex entity overlapping with BERT entity in scrub (Line 183)."""
        scrubber = PIIScrubber()
        
        # BERT finds "Dr. Smith" (PER)
        mock_bert_entities = [
            {'entity_group': 'PER', 'score': 0.9, 'word': 'Smith', 'start': 4, 'end': 9}
        ]
        
        # Regex finds "Smith" (Assume we fake a regex for this test or use a real one)
        # Using a real regex: "Tuesday" is a DATE.
        # Let's say text is "Tuesday". BERT says "Tuesday" is PER (wrong but possible). Regex says DATE.
        # BERT: Tuesday (0-7)
        # Regex: Tuesday (0-7) -> Overlap!
        
        text = "Tuesday"
        
        with patch('app.services.pii_scrubber.pipeline') as mock_pipe:
            mock_nlp = MagicMock()
            mock_nlp.return_value = [
                {'entity_group': 'PER', 'score': 0.9, 'word': 'Tuesday', 'start': 0, 'end': 7}
            ]
            mock_pipe.return_value = mock_nlp
            
            # This should prioritize BERT (PER -> [NAME]) and ignore Regex (DATE -> [DATE])
            scrubbed = scrubber.scrub(text)
            
            # BERT "Tuesday" -> [NAME] (PER)
            # Regex "Tuesday" -> [DATE] (DATE)
            # Result should be [NAME], not [DATE] or both.
            assert scrubbed == "[NAME]"

    def test_detect_pii_overlap(self):
        """Test regex entity overlapping with BERT entity in detect_pii (Line 231)."""
        scrubber = PIIScrubber()
        text = "Tuesday"
        
        with patch('app.services.pii_scrubber.pipeline') as mock_pipe:
            mock_nlp = MagicMock()
            mock_nlp.return_value = [
                {'entity_group': 'PER', 'score': 0.9, 'word': 'Tuesday', 'start': 0, 'end': 7}
            ]
            mock_pipe.return_value = mock_nlp
            
            detected = scrubber.detect_pii(text)
            
            # Should only finding one entity (BERT's PER)
            # The Regex DATE should be ignored due to overlap
            assert len(detected) == 1
            assert detected[0][1] == "PER" # Type
            assert detected[0][0] == "Tuesday" # Word

    def test_regex_no_overlap(self):
        """Test regex entity with NO overlap (Lines 184, 238-239)."""
        scrubber = PIIScrubber()
        text = "Contact test@example.com"
        
        # Mock BERT to find nothing
        with patch('app.services.pii_scrubber.pipeline') as mock_pipe:
            mock_nlp = MagicMock()
            mock_nlp.return_value = [] # No BERT entities
            mock_pipe.return_value = mock_nlp
            
            # 1. Test Detect
            detected = scrubber.detect_pii(text)
            assert len(detected) == 1
            assert detected[0][1] == "EMAIL"
            assert detected[0][0] == "test@example.com"
            
            # 2. Test Scrub
            scrubbed = scrubber.scrub(text)
            assert scrubbed == "Contact [EMAIL]"


