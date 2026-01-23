"""Enumerations for Observer models."""

from enum import Enum


class RelationshipType(str, Enum):
    """Types of relationships between messages."""

    REPLY = "reply"  # Standard conversational reply
    PRECIPITATED_BY = "precipitated_by"  # Causal link: Event A caused Emotion B
    RESOLVES = "resolves"  # Resolution: Message B resolves tension from Message A
    REOCCURS_IN = "reoccurs_in"  # Pattern matching: Emotion A reoccurs in Message B
    SEMANTIC_SIMILARITY = "semantic_similarity"  # Auto-generated link based on embedding
    CONTRADICTS = "contradicts"  # Message B contradicts Message A
    REFERENCES = "references"  # Explicit citation
