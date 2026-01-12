
import pytest
from unittest.mock import MagicMock, patch
from app.services.pii_scrubber import PIIScrubber, get_pii_scrubber

@pytest.fixture
def mock_spacy():
    with patch('app.services.pii_scrubber.spacy') as mock:
        nlp_mock = MagicMock()
        mock.load.return_value = nlp_mock
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

    def test_load_model_success(self, mock_spacy):
        """Test model loading."""
        scrubber = PIIScrubber(model_name="test_model")
        assert scrubber._nlp is None
        
        nlp = scrubber._load_model()
        assert nlp is not None
        mock_spacy.load.assert_called_with("test_model")
        
        # Second call uses cache
        nlp2 = scrubber._load_model()
        assert nlp2 is nlp
        mock_spacy.load.assert_called_once()

    def test_load_model_failure(self, mock_spacy):
        """Test model load failure."""
        mock_spacy.load.side_effect = OSError("Model not found")
        
        scrubber = PIIScrubber()
        with pytest.raises(RuntimeError, match="not installed"):
            scrubber._load_model()

    def test_scrub_pii_structure(self, mock_spacy):
        """Test scrubbing with placeholders."""
        scrubber = PIIScrubber()
        nlp_mock = mock_spacy.load.return_value
        
        # Mock Spacy doc and entities
        doc_mock = MagicMock()
        
        # Entities: Dr. Smith (PERSON), Kaiser (ORG)
        ent1 = MagicMock(label_="PERSON", start_char=6, end_char=15, text="Dr. Smith")
        ent2 = MagicMock(label_="ORG", start_char=19, end_char=25, text="Kaiser")
        
        doc_mock.ents = [ent1, ent2]
        nlp_mock.return_value = doc_mock
        
        text = "I saw Dr. Smith at Kaiser"
        # We need the text logic to work. The scrubber slices the string.
        # It relies on start_char/end_char to be accurate relative to input text.
        
        result = scrubber.scrub(text, keep_structure=True)
        
        # Logic is reverse order replacement
        # Kaiser (19-25) -> [ORG]
        # Dr. Smith (6-15) -> [NAME]
        
        expected = "I saw [NAME] at [ORG]"
        assert result == expected

    def test_scrub_pii_remove(self, mock_spacy):
        """Test scrubbing removing text."""
        scrubber = PIIScrubber()
        nlp_mock = mock_spacy.load.return_value
        doc_mock = MagicMock()
        
        ent1 = MagicMock(label_="PERSON", start_char=6, end_char=15)
        doc_mock.ents = [ent1]
        nlp_mock.return_value = doc_mock
        
        text = "I saw Dr. Smith"
        result = scrubber.scrub(text, keep_structure=False)
        
        expected = "I saw"
        assert result == expected

    def test_scrub_empty(self):
        """Test empty input."""
        scrubber = PIIScrubber()
        assert scrubber.scrub("") == ""
        assert scrubber.scrub(None) is None

    def test_detect_pii(self, mock_spacy):
        """Test detection."""
        scrubber = PIIScrubber()
        nlp_mock = mock_spacy.load.return_value
        doc_mock = MagicMock()
        
        ent1 = MagicMock(label_="PERSON", start_char=0, end_char=3, text="Bob")
        doc_mock.ents = [ent1]
        nlp_mock.return_value = doc_mock
        
        results = scrubber.detect_pii("Bob")
        assert len(results) == 1
        assert results[0] == ("Bob", "PERSON", 0, 3)

    def test_has_pii(self, mock_spacy):
        """Test check."""
        scrubber = PIIScrubber()
        with patch.object(scrubber, 'detect_pii', return_value=[1]):
            assert scrubber.has_pii("text")
            
        with patch.object(scrubber, 'detect_pii', return_value=[]):
            assert not scrubber.has_pii("text")

    def test_detect_pii_load_fail(self, mock_spacy):
        """Test runtime error if model fails."""
        scrubber = PIIScrubber()
        with patch.object(scrubber, '_load_model', return_value=None):
            with pytest.raises(RuntimeError):
                scrubber.detect_pii("text")

    def test_scrub_load_fail(self):
        """Test scrub runtime error if model fails."""
        scrubber = PIIScrubber()
        with patch.object(scrubber, '_load_model', return_value=None):
            with pytest.raises(RuntimeError):
                scrubber.scrub("text")

    def test_detect_pii_empty(self):
        """Test detect empty."""
        scrubber = PIIScrubber()
        assert scrubber.detect_pii("") == []
        assert scrubber.detect_pii(None) == []

    def test_scrub_ignored_entity(self, mock_spacy):
        """Test that non-PII entities are ignored."""
        scrubber = PIIScrubber()
        nlp_mock = mock_spacy.load.return_value
        doc_mock = MagicMock()
        
        # Entity with label not in PII_ENTITIES
        ent1 = MagicMock(label_="UNKNOWN", start_char=0, end_char=5, text="Thing")
        doc_mock.ents = [ent1]
        nlp_mock.return_value = doc_mock
        
        # Test scrub
        assert scrubber.scrub("Thing") == "Thing"
        
        # Test detect
        assert scrubber.detect_pii("Thing") == []
