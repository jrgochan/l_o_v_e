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


# ── Life Journal Enums ────────────────────────────────────────────────────


class EventDomain(str, Enum):
    """Top-level domains for life event classification.

    Events use dot-notation: ``domain.type`` (e.g., ``wellness.exercise``).
    This enum covers the domain portion.
    """

    WELLNESS = "wellness"  # Body & health routines
    WORK = "work"  # Career & professional
    RELATIONSHIP = "relationship"  # Social & interpersonal
    MENTAL = "mental"  # Mental health & inner life
    ENVIRONMENT = "environment"  # Living conditions & surroundings
    GROWTH = "growth"  # Learning & personal development
    FINANCIAL = "financial"  # Money & resources
    CUSTOM = "custom"  # User-defined


class CorrelationType(str, Enum):
    """Methods by which emotion-event correlations are discovered."""

    TEMPORAL_PROXIMITY = "temporal_proximity"  # Co-occurrence within time window
    PATTERN_RECURRENCE = "pattern_recurrence"  # Periodic cycles (daily, weekly, etc.)
    TRAJECTORY_SHIFT = "trajectory_shift"  # Before/after baseline change
    SEMANTIC_CLUSTER = "semantic_cluster"  # Embedding-based grouping
    USER_TAGGED = "user_tagged"  # User explicitly linked event to emotion


class CorrelationStatus(str, Enum):
    """Lifecycle states for a discovered correlation."""

    DISCOVERED = "discovered"  # Newly found, awaiting validation
    ACTIVE = "active"  # Pattern continues to hold
    WEAKENING = "weakening"  # Strength declining with new data
    EXPIRED = "expired"  # No longer statistically significant
    USER_CONFIRMED = "user_confirmed"  # User validated the pattern
    USER_DISMISSED = "user_dismissed"  # User rejected the pattern


class SharingAudience(str, Enum):
    """Audiences for field-level visibility control.

    Every life event field is visible to ``SELF`` by default.
    Users explicitly grant access to additional audiences.
    """

    SELF = "self"  # Only the user (always granted)
    CLINICIAN = "clinician"  # Assigned clinician
    CARE_TEAM = "care_team"  # Extended care team (future)
    RESEARCH = "research"  # De-identified for research
    EXPORT = "export"  # Included in data exports


class EventSource(str, Enum):
    """Origin of a life event record."""

    MANUAL = "manual"  # User-entered via API/UI
    CHAT_INFERRED = "chat_inferred"  # Extracted from chat context
    CALENDAR_IMPORT = "calendar_import"  # Imported from calendar integration
    WEARABLE = "wearable"  # Imported from wearable device
    PATTERN_ENGINE = "pattern_engine"  # System-inferred from patterns
