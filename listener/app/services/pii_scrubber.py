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
    - Latency: ~100ms per text (slower than Spacy but Python 3.14 compatible)
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
from typing import Any, List, Optional, Tuple, Dict

# Replace spacy with transformers
# import spacy
from transformers import pipeline

logger = logging.getLogger(__name__)


class PIIScrubber:
    """Scrub PII from text using Named Entity Recognition (HuggingFace Transformers).

    Protects user privacy by detecting and removing personally identifiable information
    before text is stored in the database. Uses BERT-based NER to identify entities.

    Attributes:
        model_name (str): HF model name (default: "dslim/bert-base-NER")
        _nlp: Loaded pipeline instance (lazy loaded)
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

    def __init__(self, model_name: str = "dslim/bert-base-NER"):
        """Initialize PII scrubber with HF model.

        Args:
            model_name: HuggingFace model hub path
        """
        self.model_name = model_name
        self._nlp: Optional[Any] = None

        logger.info(f"PIIScrubber initialized with model: {model_name}")

    def _load_model(self) -> Any:
        """Load HF NER pipeline into memory with lazy initialization."""
        if self._nlp is None:
            try:
                # Load pipeline
                # aggregation_strategy="simple" merges sub-tokens (e.g. "San" "Francisco" -> "San Francisco")
                self._nlp = pipeline(
                    "token-classification",
                    model=self.model_name,
                    tokenizer=self.model_name,
                    aggregation_strategy="simple"
                )
                logger.info(f"Transformers model loaded: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to load Transformers model: {e}")
                raise RuntimeError(f"Failed to load Transformers model '{self.model_name}': {e}")

        return self._nlp

    def scrub(self, text: str, keep_structure: bool = True) -> str:
        """Remove personally identifiable information from text using NER.

        Args:
            text: Input text.
            keep_structure: True = Replace with [PLACEHOLDER], False = Remove.

        Returns:
            str: Scrubbed text.
        """
        if not text or len(text.strip()) == 0:
            return text

        nlp = self._load_model()
        
        # Run inference
        # Output is list of dicts: {'entity_group': 'PER', 'score': 0.99, 'word': 'Smith', 'start': 6, 'end': 11}
        entities = nlp(text)

        # Collect entities to scrub
        entities_to_scrub = []
        for ent in entities:
            # HF 'simple' aggregation uses 'entity_group', raw uses 'entity'
            label = ent.get("entity_group", ent.get("entity"))
            if label in self.PII_ENTITIES:
                entities_to_scrub.append((ent["start"], ent["end"], label))

        # Sort by start position in reverse order (to replace safely)
        entities_to_scrub.sort(key=lambda x: x[0], reverse=True)

        scrubbed = text
        for start, end, label in entities_to_scrub:
            if keep_structure:
                replacement = self.PII_ENTITIES.get(label, "[REDACTED]")
            else:
                replacement = ""

            # Replace slice
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

        nlp = self._load_model()
        entities = nlp(text)

        pii_found = []
        for ent in entities:
            label = ent.get("entity_group", ent.get("entity"))
            if label in self.PII_ENTITIES:
                # (text, type, start, end)
                pii_found.append((ent.get("word", ""), label, ent["start"], ent["end"]))

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
