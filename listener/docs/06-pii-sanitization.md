# Listener Module - PII Sanitization

## Overview

The Listener processes highly personal emotional data. Before any text is stored in the Observer database, it must be **sanitized** to remove Personally Identifiable Information (PII).

## Privacy Philosophy

**Core Principle**: Audio and raw text are **ephemeral**. They exist only during processing and are discarded immediately.

**Data Lifecycle**:
1. Audio recorded → Processed → Deleted
2. Raw text transcribed → Analyzed → Scrubbed → Stored
3. Only sanitized text persists

## PII Categories

### Entities to Scrub

| Entity Type | Examples | Replacement Token |
|-------------|----------|-------------------|
| **PERSON** | "Dr. Smith", "Jane" | `[NAME]` |
| **ORG** | "Kaiser Hospital", "Google" | `[ORG]` |
| **GPE** | "San Francisco", "California" | `[LOC]` |
| **DATE** | "Tuesday", "January 15th" | `[DATE]` |
| **EMAIL** | "user@example.com" | `[EMAIL]` |
| **PHONE** | "(555) 123-4567" | `[PHONE]` |
| **SSN** | "123-45-6789" | `[SSN]` |

### What NOT to Scrub

- **Emotional language**: Keep "angry", "sad", "joyful"
- **General descriptions**: Keep "my boss", "my friend" (but scrub names)
- **Non-identifying context**: Keep "at work", "at home"

## Implementation

### Using Spacy NER

```python
# backend/app/services/pii_scrubber.py

import spacy
import re
from typing import List, Tuple

class PIIScrubber:
    """Remove PII using Named Entity Recognition"""

    def __init__(self):
        # Load English NER model
        self.nlp = spacy.load("en_core_web_sm")

    def scrub(self, text: str) -> str:
        """
        Remove PII from text.

        Args:
            text: Raw transcription

        Returns:
            Sanitized text with PII replaced by tokens
        """
        # Step 1: NER with Spacy
        doc = self.nlp(text)

        # Collect entities to replace (in reverse order to preserve positions)
        replacements = []
        for ent in reversed(doc.ents):
            if ent.label_ in ['PERSON', 'ORG', 'GPE', 'DATE']:
                token = self._get_token(ent.label_)
                replacements.append((ent.start_char, ent.end_char, token))

        # Apply replacements
        sanitized = text
        for start, end, token in replacements:
            sanitized = sanitized[:start] + token + sanitized[end:]

        # Step 2: Regex patterns for structured PII
        sanitized = self._scrub_patterns(sanitized)

        return sanitized

    def _get_token(self, entity_type: str) -> str:
        """Map entity type to replacement token"""
        mapping = {
            'PERSON': '[NAME]',
            'ORG': '[ORG]',
            'GPE': '[LOC]',
            'DATE': '[DATE]'
        }
        return mapping.get(entity_type, '[REDACTED]')

    def _scrub_patterns(self, text: str) -> str:
        """Use regex for structured PII"""

        # Email addresses
        text = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            '[EMAIL]',
            text
        )

        # Phone numbers
        text = re.sub(
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            '[PHONE]',
            text
        )

        # SSN
        text = re.sub(
            r'\b\d{3}-\d{2}-\d{4}\b',
            '[SSN]',
            text
        )

        return text

    def contains_pii(self, text: str) -> bool:
        """Check if text contains PII"""
        doc = self.nlp(text)
        return len(doc.ents) > 0 or self._has_pattern_pii(text)

    def _has_pattern_pii(self, text: str) -> bool:
        """Check for regex-pattern PII"""
        patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone
            r'\b\d{3}-\d{2}-\d{4}\b'  # SSN
        ]

        for pattern in patterns:
            if re.search(pattern, text):
                return True

        return False
```

### Example Scrubbing

**Input**:
```
"I had a terrible meeting with Dr. Sarah Johnson at Kaiser Hospital
on Tuesday. I felt so anxious I could barely think. You can reach
me at sarah.j@example.com if you need to talk."
```

**Output**:
```
"I had a terrible meeting with [NAME] at [ORG] on [DATE]. I felt so
anxious I could barely think. You can reach me at [EMAIL] if you
need to talk."
```

**Preserved**: Emotional content ("terrible", "anxious")
**Scrubbed**: Names, organizations, dates, emails

## Testing

### Unit Tests

```python
def test_person_name_scrubbed():
    text = "I talked to Dr. Smith about my anxiety."
    result = scrubber.scrub(text)

    assert "Dr. Smith" not in result
    assert "[NAME]" in result
    assert "anxiety" in result  # Emotional word preserved

def test_email_scrubbed():
    text = "Contact me at user@example.com"
    result = scrubber.scrub(text)

    assert "user@example.com" not in result
    assert "[EMAIL]" in result

def test_emotional_language_preserved():
    text = "I feel so overwhelmed and disconnected"
    result = scrubber.scrub(text)

    assert result == text  # No PII, no changes
```

## Next Steps

Now that you understand PII sanitization:
- **07-api-specification.md** - FastAPI endpoints
- **08-async-queue.md** - Arq + Redis task processing
- **09-setup-and-installation.md** - Development environment
