
import pytest
from unittest.mock import MagicMock, patch
from app.services.pii_scrubber import PIIScrubber, get_pii_scrubber

@pytest.fixture
def mock_pipeline():
    with patch('app.services.pii_scrubber.pipeline') as mock:
        pipe_mock = MagicMock()
        mock.return_value = pipe_mock
        yield mock

class TestPIIScrubber:
    def test_singleton_getter(self):
        """Test singleton pattern."""
        with patch('app.services.pii_scrubber.PIIScrubber') as mock_cls:
            # Reset global
            import app.services.pii_scrubber
            app.services.pii_scrubber._scrubber_instance = None
            
            s1 = get_pii_scrubber()
            s2 = get_pii_scrubber()
            
            assert s1 is s2
            mock_cls.assert_called_once()

    def test_load_model_success(self, mock_pipeline):
        """Test model loading."""
        scrubber = PIIScrubber(model_name="test_model")
        assert scrubber._nlp is None
        
        nlp = scrubber._load_model()
        assert nlp is not None
        mock_pipeline.assert_called_with(
            "token-classification",
            model="test_model",
            tokenizer="test_model",
            aggregation_strategy="simple"
        )
        
        # Second call uses cache
        nlp2 = scrubber._load_model()
        assert nlp2 is nlp
        mock_pipeline.assert_called_once()

    def test_load_model_failure(self, mock_pipeline):
        """Test model load failure."""
        mock_pipeline.side_effect = RuntimeError("Model fail")
        
        scrubber = PIIScrubber()
        with pytest.raises(RuntimeError, match="Failed to load Transformers model"):
            scrubber._load_model()

    def test_scrub_pii_structure(self, mock_pipeline):
        """Test scrubbing with placeholders."""
        scrubber = PIIScrubber()
        nlp_mock = mock_pipeline.return_value
        
        # Mock HF pipeline output
        # Input: "I saw Dr. Smith at Kaiser"
        # Smith -> PER, Kaiser -> ORG
        
        # Note: HF aggregation merges "Dr" "." "Smith" if they are adjacent PER tokens
        # but for this mock we just simulate the output list
        mock_output = [
            {'entity_group': 'PER', 'score': 0.99, 'word': 'Smith', 'start': 10, 'end': 15},
            {'entity_group': 'ORG', 'score': 0.98, 'word': 'Kaiser', 'start': 19, 'end': 25}
        ]
        nlp_mock.return_value = mock_output
        
        text = "I saw Dr. Smith at Kaiser"
        
        result = scrubber.scrub(text, keep_structure=True)
        
        # Logic is reverse order replacement
        # Kaiser (19-25) -> [ORG]
        # Smith (10-15) -> [NAME]
        
        # "I saw Dr. [NAME] at [ORG]"
        expected = "I saw Dr. [NAME] at [ORG]"
        assert result == expected
        
        # Check that pipeline was called with text
        nlp_mock.assert_called_with(text)

    def test_scrub_pii_remove(self, mock_pipeline):
        """Test scrubbing removing text."""
        scrubber = PIIScrubber()
        nlp_mock = mock_pipeline.return_value
        
        mock_output = [
            {'entity_group': 'PER', 'score': 0.99, 'word': 'Smith', 'start': 10, 'end': 15}
        ]
        nlp_mock.return_value = mock_output
        
        text = "I saw Dr. Smith"
        result = scrubber.scrub(text, keep_structure=False)
        
        # "I saw Dr." (stripped)
        expected = "I saw Dr."
        assert result == expected

    def test_scrub_empty(self):
        """Test empty input."""
        scrubber = PIIScrubber()
        assert scrubber.scrub("") == ""
        assert scrubber.scrub(None) is None

    def test_detect_pii(self, mock_pipeline):
        """Test detection."""
        scrubber = PIIScrubber()
        nlp_mock = mock_pipeline.return_value
        
        mock_output = [
            {'entity_group': 'PER', 'score': 0.99, 'word': 'Bob', 'start': 0, 'end': 3}
        ]
        nlp_mock.return_value = mock_output
        
        results = scrubber.detect_pii("Bob")
        assert len(results) == 1
        assert results[0] == ("Bob", "PER", 0, 3)

    def test_has_pii(self, mock_pipeline):
        """Test check."""
        scrubber = PIIScrubber()
        with patch.object(scrubber, 'detect_pii', return_value=[1]):
            assert scrubber.has_pii("text")
            
        with patch.object(scrubber, 'detect_pii', return_value=[]):
            assert not scrubber.has_pii("text")

    def test_scrub_ignored_entity(self, mock_pipeline):
        """Test that non-PII entities are ignored."""
        scrubber = PIIScrubber()
        nlp_mock = mock_pipeline.return_value
        
        # Entity with label not in PII_ENTITIES
        mock_output = [
            {'entity_group': 'UNKNOWN', 'score': 0.5, 'word': 'Thing', 'start': 0, 'end': 5}
        ]
        nlp_mock.return_value = mock_output
        
        # Test scrub
        assert scrubber.scrub("Thing") == "Thing"
        
        # Test detect
        assert scrubber.detect_pii("Thing") == []
