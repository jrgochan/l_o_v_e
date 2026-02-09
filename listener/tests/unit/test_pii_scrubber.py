# pylint: disable=redefined-outer-name, unused-argument, protected-access
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.services.pii_scrubber import PIIScrubber, get_pii_scrubber


@pytest.fixture
def mock_pipeline() -> Any:
    with patch("app.services.pii_scrubber.pipeline") as mock:
        pipe_mock = MagicMock()
        mock.return_value = pipe_mock
        yield mock


@pytest.fixture
def mock_spacy() -> Any:
    with patch("app.services.pii_scrubber.spacy") as mock:
        nlp_mock = MagicMock()
        mock.load.return_value = nlp_mock
        yield mock


class TestPIIScrubber:
    def test_singleton_getter(self) -> None:
        """Test singleton pattern."""
        with patch("app.services.pii_scrubber.PIIScrubber") as mock_cls:
            # Reset global
            import app.services.pii_scrubber  # pylint: disable=import-outside-toplevel

            app.services.pii_scrubber._SCRUBBER_INSTANCE = None

            s1 = get_pii_scrubber()
            s2 = get_pii_scrubber()

            assert s1 is s2
            mock_cls.assert_called_once()

    def test_load_models_success(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test hybrid model loading."""
        scrubber = PIIScrubber(model_name="test_model")
        assert scrubber._nlp_bert is None
        assert scrubber._nlp_spacy is None

        nlp_bert, nlp_spacy = scrubber._load_models()

        assert nlp_bert is not None
        assert nlp_spacy is not None

        # Verify BERT load
        mock_pipeline.assert_called_with(
            "token-classification",
            model="test_model",
            tokenizer="test_model",
            aggregation_strategy="simple",
        )

        # Verify Spacy load
        mock_spacy.load.assert_called_with("en_core_web_sm")

        # Second call uses cache
        nlp_bert2, nlp_spacy2 = scrubber._load_models()
        assert nlp_bert2 is nlp_bert
        assert nlp_spacy2 is nlp_spacy
        mock_pipeline.assert_called_once()
        mock_spacy.load.assert_called_once()

    def test_load_model_failure_graceful_spacy(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test that failure to load Spacy allows BERT to continue."""
        mock_spacy.load.side_effect = Exception("Spacy missing")

        scrubber = PIIScrubber()
        nlp_bert, nlp_spacy = scrubber._load_models()

        assert nlp_bert is not None
        assert nlp_spacy is None  # Spacy failed but we proceeded

    def test_scrub_pii_structure(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test scrubbing with placeholders (Hybrid)."""
        scrubber = PIIScrubber()

        # Mock BERT output
        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {"entity_group": "PER", "score": 0.99, "word": "Smith", "start": 10, "end": 15}
        ]

        # Mock Spacy output
        spacy_nlp = mock_spacy.load.return_value

        # Create a mock Doc and Ents for Spacy
        # Text: "I saw Dr. Smith at Kaiser"
        # Kaiser -> ORG (Spacy)

        # Spacy Doc simulation
        mock_doc = MagicMock()
        mock_doc.text = "I saw Dr. Smith at Kaiser"

        ent_org = MagicMock()
        ent_org.text = "Kaiser"
        ent_org.label_ = "ORG"
        ent_org.start_char = 19
        ent_org.end_char = 25

        mock_doc.ents = [ent_org]
        spacy_nlp.return_value = mock_doc

        text = "I saw Dr. Smith at Kaiser"

        result = scrubber.scrub(text, keep_structure=True)

        # Expected:
        # Smith (BERT) -> [NAME] (PER->[NAME])
        # Kaiser (Spacy) -> [ORG] (ORG->[ORG])

        expected = "I saw Dr. [NAME] at [ORG]"
        assert result == expected

    def test_detect_pii_hybrid_deduplication(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test that overlapping PII is handled (first one wins usually)."""
        scrubber = PIIScrubber()

        # Text: "Bob Smith"
        # BERT finds "Bob Smith" (PER) 0-9
        # Spacy finds "Smith" (PERSON) 4-9

        # BERT Mock
        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {"entity_group": "PER", "score": 0.99, "word": "Bob Smith", "start": 0, "end": 9}
        ]

        # Spacy Mock
        spacy_nlp = mock_spacy.load.return_value
        mock_doc = MagicMock()

        ent_person = MagicMock()
        ent_person.text = "Smith"
        ent_person.label_ = "PERSON"
        ent_person.start_char = 4
        ent_person.end_char = 9

        mock_doc.ents = [ent_person]
        spacy_nlp.return_value = mock_doc

        results = scrubber.detect_pii("Bob Smith")

        # Should detect "Bob Smith" from BERT.
        # "Smith" from Spacy overlaps 4-9 with 0-9.
        # Logic says: if overlap, skip new one.
        # So Spacy finding should be ignored.

        assert len(results) == 1
        assert results[0] == ("Bob Smith", "PER", 0, 9)

    def test_detect_pii_regex_fallback(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test regex fallback works with hybrid models."""
        scrubber = PIIScrubber()

        # Empty AI findings
        mock_pipeline.return_value.return_value = []
        mock_spacy.load.return_value.return_value.ents = []

        text = "Call me at 555-123-4567"
        results = scrubber.detect_pii(text)

        assert len(results) == 1
        # PHONE regex match
        word, label, _, _ = results[0]
        assert "555-123-4567" in word
        assert label == "PHONE"

    def test_scrub_empty(self) -> None:
        """Test empty input."""
        scrubber = PIIScrubber()
        assert scrubber.scrub("") == ""
        assert scrubber.scrub(None) is None  # type: ignore[arg-type]

    def test_load_model_failure_transformers(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test that failure to load Transformers raises RuntimeError."""
        mock_pipeline.side_effect = Exception("Model not found")

        scrubber = PIIScrubber()
        with pytest.raises(RuntimeError, match="Failed to load Transformers model"):
            scrubber._load_models()

    def test_scrub_no_structure(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test scrubbing with keep_structure=False (Redaction)."""
        scrubber = PIIScrubber()

        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {"entity_group": "PER", "score": 0.99, "word": "John", "start": 6, "end": 10}
        ]

        # Mock Spacy empty
        mock_spacy.load.return_value.return_value.ents = []

        text = "Hello John"
        # Should remove "John" entirely
        result = scrubber.scrub(text, keep_structure=False)
        assert result == "Hello"

    def test_scrub_overlap_complex_break(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test overlap logic causing 'break' in add_entity."""
        scrubber = PIIScrubber()

        # BERT: "John Smith"
        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {"entity_group": "PER", "score": 0.99, "word": "John Smith", "start": 0, "end": 10}
        ]

        # Spacy: "Smith" (5-10) -> Should be ignored due to overlap
        spacy_nlp = mock_spacy.load.return_value
        mock_doc = MagicMock()
        ent = MagicMock()
        ent.text = "Smith"
        ent.label_ = "PERSON"
        ent.start_char = 5
        ent.end_char = 10
        mock_doc.ents = [ent]
        spacy_nlp.return_value = mock_doc

        text = "John Smith"
        result = scrubber.scrub(text, keep_structure=True)
        assert result == "[NAME]"

    def test_detect_pii_overlap_logic_explicit(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test the overlap break in detect_pii -> add_finding."""
        scrubber = PIIScrubber()

        # BERT: "New York" (0-8)
        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {"entity_group": "LOC", "score": 0.99, "word": "New York", "start": 0, "end": 8}
        ]

        # Spacy: "York" (4-8) - Overlaps
        spacy_nlp = mock_spacy.load.return_value
        mock_doc = MagicMock()
        ent = MagicMock()
        ent.text = "York"
        ent.label_ = "GPE"
        ent.start_char = 4
        ent.end_char = 8
        mock_doc.ents = [ent]
        spacy_nlp.return_value = mock_doc

        findings = scrubber.detect_pii("New York")
        assert len(findings) == 1
        assert findings[0][0] == "New York"

    def test_unknown_entity_label(self, mock_pipeline: Any, mock_spacy: Any) -> None:
        """Test that unknown entity labels are ignored."""
        scrubber = PIIScrubber()

        # BERT: "Something" with unknown label "UNKNOWN_TYPE"
        bert_mock = mock_pipeline.return_value
        bert_mock.return_value = [
            {
                "entity_group": "UNKNOWN_TYPE",
                "score": 0.99,
                "word": "Something",
                "start": 0,
                "end": 9,
            }
        ]

        # Mock Spacy empty
        mock_spacy.load.return_value.return_value.ents = []

        text = "Something"

        # 1. Test scrub (should leave text alone)
        result = scrubber.scrub(text)
        assert result == "Something"

        # 2. Test detect_pii (should return empty)
        findings = scrubber.detect_pii(text)
        assert len(findings) == 0
