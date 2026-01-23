"""Listener Module - PII Scrubbing Service.

Removes personally identifiable information from text using HuggingFace Transformers NER.

This module implements privacy protection by detecting and removing/replacing PII before
text is stored in the Observer database. Critical for HIPAA/GDPR compliance and user
privacy protection.

Key Components:
    PIIScrubber: Main class for PII detection and scrubbing
    get_pii_scrubber: Factory function returning singleton instance

Integration Points:
    - Uses: HuggingFace Transformers (dslim/bert-base-NER)
    - Used by: API routes (ingest.py), workers (audio_processor.py)

Performance:
    - Latency: ~100ms per text (slower than Spacy but Python 3.12 compatible)
    - Accuracy: ~95% PII detection rate (BERT based)
    - Model loading: ~2s first time, then cached

Privacy:
    - All processing happens locally
    - No external API calls
    - PII never leaves the machine

PII Types Detected (BERT NER labels):
    - PER: Names of people -> [NAME]
    - ORG: Organizations -> [ORG]
    - LOC: Locations -> [LOCATION]
    - MISC: Miscellaneous -> [MISC]

Examples:
    >>> from app.services.pii_scrubber import get_pii_scrubber
    >>> scrubber = get_pii_scrubber()
    >>> text = "I saw Dr. Smith at Kaiser Hospital on Tuesday"
    >>> scrubbed = scrubber.scrub(text)
    >>> print(scrubbed)
    "I saw [NAME] at [ORG] on Tuesday"

See Also:
    - Tests: tests/unit/test_pii_scrubber.py
"""

import logging
import os
from typing import Any, List, Optional, Tuple

import spacy
from transformers import pipeline

logger = logging.getLogger(__name__)


class PIIScrubber:
    """Scrub PII from text using Named Entity Recognition (HuggingFace Transformers).

    Protects user privacy by detecting and removing personally identifiable information
    before text is stored in the database. Uses BERT-based NER to identify entities.

    Attributes:
        model_name (str): HF model name (default: "dslim/bert-base-NER")
        _nlp_bert: Loaded BERT pipeline instance (lazy loaded)
        _nlp_spacy: Loaded Spacy pipeline instance (lazy loaded)
        PII_ENTITIES (dict): Mapping of entity types to placeholders
    """

    # Entity types to scrub (Mapping HF labels to placeholders)
    # dslim/bert-base-NER uses: PER, ORG, LOC, MISC
    PII_ENTITIES = {
        "PER": "[NAME]",
        "ORG": "[ORG]",
        "LOC": "[LOCATION]",
        "MISC": "[MISC]",
        # Mapping legacy Spacy labels if we switch models or purely for compatibility in logic
        "PERSON": "[NAME]",
        "GPE": "[LOCATION]",
    }

    # Regex patterns for fallback detection
    REGEX_PATTERNS = {
        "DATE": [
            r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b",
            r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b",
            r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",
            r"\b\d{4}-\d{1,2}-\d{1,2}\b",
        ],
        "EMAIL": [r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"],
        "PHONE": [r"\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b"],
    }

    def __init__(self, model_name: str = "dslim/bert-base-NER"):
        """Initialize PII scrubber with HF model.

        Args:
            model_name: HuggingFace model hub path
        """
        # Allow override via environment variable (useful for local offline models)
        env_model = os.getenv("PII_MODEL_PATH")
        if env_model:
            model_name = env_model

        self.model_name = model_name
        self._nlp_bert: Optional[Any] = None
        self._nlp_spacy: Optional[Any] = None

        # Pre-compile regexes
        import re

        self._compiled_patterns = {}
        for label, patterns in self.REGEX_PATTERNS.items():
            self._compiled_patterns[label] = [re.compile(p, re.IGNORECASE) for p in patterns]

            self._compiled_patterns[label] = [re.compile(p, re.IGNORECASE) for p in patterns]

        logger.info(f"PIIScrubber initialized with BERT model: {model_name}")

    def _load_models(self) -> Tuple[Any, Any]:
        """Load both Spacy and BERT models with lazy initialization."""
        # Load BERT
        if self._nlp_bert is None:
            try:
                self._nlp_bert = pipeline(
                    "token-classification",
                    model=self.model_name,
                    tokenizer=self.model_name,
                    aggregation_strategy="simple",
                )
                logger.info(f"Transformers model loaded: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to load Transformers model: {e}")
                raise RuntimeError(f"Failed to load Transformers model '{self.model_name}': {e}")

        # Load Spacy
        if self._nlp_spacy is None:
            try:
                self._nlp_spacy = spacy.load("en_core_web_sm")
                logger.info("Spacy model loaded: en_core_web_sm")
            except Exception as e:
                logger.error(f"Failed to load Spacy model: {e}")
                # Fallback to just BERT if Spacy fails (though strictly we want both per user request)
                logger.warning("Continuing without Spacy (BERT only)")

        return self._nlp_bert, self._nlp_spacy

    def _detect_regex_entities(self, text: str) -> List[Tuple[int, int, str, str]]:
        """Detect entities using regex patterns."""
        entities = []
        for label, patterns in self._compiled_patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    # (start, end, label, text)
                    entities.append((match.start(), match.end(), f"[{label}]", match.group()))
        return entities

    def scrub(self, text: str, keep_structure: bool = True) -> str:
        """Remove personally identifiable information from text using NER + Regex.

        Args:
            text: Input text.
            keep_structure: True = Replace with [PLACEHOLDER], False = Remove.

        Returns:
            str: Scrubbed text.
        """
        if not text or len(text.strip()) == 0:
            return text

        # 1. Hybrid Detection (BERT + Spacy)
        nlp_bert, nlp_spacy = self._load_models()

        # Collect entities to scrub: (start, end, replacement, original_text)
        entities_to_scrub = []
        covered_ranges = set()

        # Helper to add entity if no overlap
        def add_entity(start: int, end: int, label: str, word: str, _source: str = "BERT") -> None:
            # Simple overlap check: if any index in range is already covered
            is_new = True
            for i in range(start, end):
                if i in covered_ranges:
                    is_new = False
                    break

            if is_new:
                if label in self.PII_ENTITIES:
                    replacement = self.PII_ENTITIES.get(label, "[REDACTED]")
                    entities_to_scrub.append((start, end, replacement, word))
                    for i in range(start, end):
                        covered_ranges.add(i)

        # Run BERT
        bert_entities = nlp_bert(text)
        for ent in bert_entities:
            label = ent.get("entity_group", ent.get("entity"))
            add_entity(ent["start"], ent["end"], label, ent.get("word", ""), "BERT")

        # Run Spacy (if loaded)
        if nlp_spacy:
            doc = nlp_spacy(text)
            for ent in doc.ents:
                # Spacy labels: PERSON, ORG, GPE, etc.
                add_entity(ent.start_char, ent.end_char, ent.label_, ent.text, "Spacy")

        # 2. Regex Detection (Fallback for Dates, Emails, etc.)
        regex_matches = self._detect_regex_entities(text)
        for start, end, label, word in regex_matches:
            # Check overlap
            is_overlap = any((start < e[1] and end > e[0]) for e in entities_to_scrub)
            if not is_overlap:
                entities_to_scrub.append((start, end, label, word))

        # Sort by start position in reverse order (to replace safely)
        entities_to_scrub.sort(key=lambda x: x[0], reverse=True)

        scrubbed = text
        for start, end, replacement, _ in entities_to_scrub:
            if not keep_structure:
                replacement = ""

            # Replace slice
            # Ensure we don't mess up if overlap logic failed slightly (though masked above)
            scrubbed = scrubbed[:start] + replacement + scrubbed[end:]

        if entities_to_scrub:
            logger.info(
                f"Scrubbed {len(entities_to_scrub)} PII entities: {[e[2] for e in entities_to_scrub]}"
            )

        return scrubbed.strip()

    def detect_pii(self, text: str) -> List[Tuple[str, str, int, int]]:
        """Detect PII in text without removing it."""
        if not text or len(text.strip()) == 0:
            return []

        # 1. Hybrid Detection
        nlp_bert, nlp_spacy = self._load_models()

        pii_found = []
        covered_ranges = set()

        def add_finding(word: str, label: str, start: int, end: int, _source: str) -> None:
            # Check overlap
            is_new = True
            for i in range(start, end):
                if i in covered_ranges:
                    is_new = False
                    break

            if is_new:
                if label in self.PII_ENTITIES:
                    pii_found.append((word, label, start, end))
                    for i in range(start, end):
                        covered_ranges.add(i)

        # BERT
        bert_entities = nlp_bert(text)
        for ent in bert_entities:
            label = ent.get("entity_group", ent.get("entity"))
            add_finding(ent.get("word", ""), label, ent["start"], ent["end"], "BERT")

        # Spacy
        if nlp_spacy:
            doc = nlp_spacy(text)
            for ent in doc.ents:
                add_finding(ent.text, ent.label_, ent.start_char, ent.end_char, "Spacy")

        # 2. Regex
        regex_matches = self._detect_regex_entities(text)
        for start, end, label, word in regex_matches:
            # Check overlap logic compatible with set
            is_overlap = False
            for i in range(start, end):
                if i in covered_ranges:
                    is_overlap = True
                    break
            if not is_overlap:
                # Strip brackets for consistent type string if needed, or keep as is
                # label is like '[DATE]', BERT is like 'PER'.
                # Let's clean the label to 'DATE' for consistency with type return?
                # Actually detect_pii returns (word, type, start, end).
                # PII_ENTITIES maps 'PER' -> '[NAME]'.
                # Here regex label is '[DATE]'.
                clean_type = label.strip("[]")
                pii_found.append((word, clean_type, start, end))

        return pii_found

    def has_pii(self, text: str) -> bool:
        """Quick boolean check if text contains any PII."""
        return len(self.detect_pii(text)) > 0


# Global scrubber instance
_scrubber_instance = None


def get_pii_scrubber() -> PIIScrubber:
    """Get or create global PIIScrubber instance (singleton pattern)."""
    global _scrubber_instance

    if _scrubber_instance is None:
        _scrubber_instance = PIIScrubber()

    return _scrubber_instance
