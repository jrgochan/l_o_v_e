"""Unit tests for Life Journal schemas."""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.journal import (
    CorrelationFeedbackRequest,
    CorrelationResponse,
    JournalSearchRequest,
    LifeEventCreate,
    LifeEventListResponse,
    LifeEventResponse,
    LifeEventUpdate,
)

# ---------------------------------------------------------------------------
# LifeEventCreate
# ---------------------------------------------------------------------------


class TestLifeEventCreate:
    """Test LifeEventCreate schema validation."""

    def test_valid_create(self) -> None:
        """Test valid event creation with all fields."""
        event = LifeEventCreate(
            event_type="wellness.exercise",
            title="Morning run",
            description="30 minute jog in the park",
            duration_minutes=30,
            event_data={"activity": "jogging", "distance_km": 3.5},
            mood_before=[-0.2, 0.3, 0.1],
            mood_after=[0.6, 0.2, 0.3],
            tags=["morning", "routine", "outdoor"],
            source="manual",
            impact=0.6,
            predictability=0.9,
            controllability=0.8,
        )
        assert event.event_type == "wellness.exercise"
        assert event.title == "Morning run"
        assert event.duration_minutes == 30
        assert event.impact == 0.6

    def test_minimal_create(self) -> None:
        """Test minimal required fields only."""
        event = LifeEventCreate(
            event_type="work.meeting",
            title="Team standup",
        )
        assert event.event_type == "work.meeting"
        assert event.source == "manual"
        assert event.event_data == {}
        assert event.is_recurring is False

    def test_invalid_event_type_format(self) -> None:
        """Reject event_type not in domain.type format."""
        with pytest.raises(ValidationError) as exc_info:
            LifeEventCreate(event_type="exercise", title="Run")
        errors = exc_info.value.errors()
        assert any("event_type" in str(e) for e in errors)

    def test_invalid_event_type_uppercase(self) -> None:
        """Reject uppercase event_type."""
        with pytest.raises(ValidationError):
            LifeEventCreate(event_type="Wellness.Exercise", title="Run")

    def test_vac_out_of_range(self) -> None:
        """Reject VAC values outside [-1.0, 1.0]."""
        with pytest.raises(ValidationError) as exc_info:
            LifeEventCreate(
                event_type="wellness.exercise",
                title="Run",
                mood_before=[2.0, 0.0, 0.0],
            )
        assert "Valence" in str(exc_info.value)

    def test_vac_wrong_length(self) -> None:
        """Reject VAC with wrong number of components."""
        with pytest.raises(ValidationError):
            LifeEventCreate(
                event_type="wellness.exercise",
                title="Run",
                mood_before=[0.5, 0.5],  # Only 2 values
            )

    def test_impact_out_of_range(self) -> None:
        """Reject impact values outside [0.0, 1.0]."""
        with pytest.raises(ValidationError):
            LifeEventCreate(
                event_type="wellness.exercise",
                title="Run",
                impact=1.5,
            )

    def test_negative_duration(self) -> None:
        """Reject negative duration."""
        with pytest.raises(ValidationError):
            LifeEventCreate(
                event_type="wellness.exercise",
                title="Run",
                duration_minutes=-10,
            )

    def test_empty_title(self) -> None:
        """Reject empty title."""
        with pytest.raises(ValidationError):
            LifeEventCreate(event_type="wellness.exercise", title="")


# ---------------------------------------------------------------------------
# LifeEventUpdate
# ---------------------------------------------------------------------------


class TestLifeEventUpdate:
    """Test LifeEventUpdate partial update schema."""

    def test_partial_update(self) -> None:
        """Only specified fields are set."""
        update = LifeEventUpdate(title="Updated title")
        dump = update.model_dump(exclude_unset=True)
        assert dump == {"title": "Updated title"}

    def test_empty_update(self) -> None:
        """Empty update body is valid (no-op)."""
        update = LifeEventUpdate()
        dump = update.model_dump(exclude_unset=True)
        assert dump == {}


# ---------------------------------------------------------------------------
# LifeEventResponse
# ---------------------------------------------------------------------------


class TestLifeEventResponse:
    """Test LifeEventResponse serialization schema."""

    def test_response_all_fields(self) -> None:
        """Test response with all fields populated."""
        now = datetime.utcnow()
        resp = LifeEventResponse(
            id=uuid4(),
            user_id=uuid4(),
            timestamp=now,
            duration_minutes=30,
            event_type="wellness.exercise",
            title="Morning run",
            description="Jog in the park",
            event_data={"distance_km": 3.5},
            mood_before=[0.5, 0.3, 0.2],
            mood_after=[0.7, 0.2, 0.4],
            tags=["morning"],
            source="manual",
            impact=0.6,
            predictability=0.9,
            controllability=0.8,
            is_recurring=False,
            recurrence_pattern=None,
            recurrence_id=None,
            created_at=now,
            updated_at=now,
        )
        assert resp.event_type == "wellness.exercise"
        assert resp.mood_before == [0.5, 0.3, 0.2]

    def test_list_response(self) -> None:
        """Test paginated list response."""
        resp = LifeEventListResponse(events=[], total=0, limit=50, offset=0)
        assert resp.total == 0
        assert resp.limit == 50


# ---------------------------------------------------------------------------
# CorrelationFeedbackRequest
# ---------------------------------------------------------------------------


class TestCorrelationFeedback:
    """Test correlation feedback schema."""

    def test_valid_confirmed(self) -> None:
        """Accept 'confirmed' feedback."""
        req = CorrelationFeedbackRequest(feedback="confirmed")
        assert req.feedback == "confirmed"

    def test_valid_dismissed(self) -> None:
        """Accept 'dismissed' feedback."""
        req = CorrelationFeedbackRequest(feedback="dismissed")
        assert req.feedback == "dismissed"

    def test_invalid_feedback(self) -> None:
        """Reject invalid feedback values."""
        with pytest.raises(ValidationError):
            CorrelationFeedbackRequest(feedback="maybe")


# ---------------------------------------------------------------------------
# CorrelationResponse
# ---------------------------------------------------------------------------


class TestCorrelationResponse:
    """Test correlation response schema."""

    def test_response_fields(self) -> None:
        """Test response with all fields populated."""
        now = datetime.utcnow()
        resp = CorrelationResponse(
            id=uuid4(),
            user_id=uuid4(),
            emotion_name="Anxiety",
            emotion_category="When Things Are Uncertain",
            event_type="wellness.substance",
            event_pattern="Caffeine before noon",
            correlation_type="temporal_proximity",
            strength=0.72,
            direction="negative",
            confidence=0.85,
            lag_seconds=5400,
            sample_size=45,
            evidence={"p_value": 0.003},
            status="active",
            first_detected=now,
            last_validated=now,
            user_feedback=None,
            user_feedback_at=None,
            created_at=now,
            updated_at=now,
        )
        assert resp.emotion_name == "Anxiety"
        assert resp.strength == 0.72
        assert resp.lag_seconds == 5400


# ---------------------------------------------------------------------------
# JournalSearchRequest
# ---------------------------------------------------------------------------


class TestJournalSearchRequest:
    """Test journal search schema."""

    def test_valid_search(self) -> None:
        """Test valid search query."""
        req = JournalSearchRequest(query="stressful meeting")
        assert req.query == "stressful meeting"
        assert req.limit == 10
        assert req.search_type == "events"

    def test_empty_query_rejected(self) -> None:
        """Reject empty search query."""
        with pytest.raises(ValidationError):
            JournalSearchRequest(query="")

    def test_limit_bounds(self) -> None:
        """Reject limit outside valid range."""
        with pytest.raises(ValidationError):
            JournalSearchRequest(query="test", limit=200)

    def test_invalid_search_type(self) -> None:
        """Reject invalid search type."""
        with pytest.raises(ValidationError):
            JournalSearchRequest(query="test", search_type="invalid")
