"""Unit tests for ClinicalNote and AlertAcknowledgment models."""

from datetime import datetime
from uuid import uuid4

import pytest

from app.models.alert_acknowledgment import AlertAcknowledgment
from app.models.clinical_note import ClinicalNote


@pytest.mark.unit
class TestClinicalNoteModel:
    """Unit tests for the ClinicalNote SQLAlchemy model."""

    def test_create_clinical_note_minimal(self):
        """ClinicalNote can be created with minimal fields."""
        note = ClinicalNote(
            clinician_id=uuid4(),
            client_id=uuid4(),
            content="Patient shows improvement.",
            category="general",
        )
        assert note.content == "Patient shows improvement."
        assert note.category == "general"
        assert note.session_id is None

    def test_create_clinical_note_all_fields(self):
        """ClinicalNote accepts all explicit fields."""
        cid = uuid4()
        uid = uuid4()
        sid = uuid4()
        note = ClinicalNote(
            clinician_id=cid,
            client_id=uid,
            session_id=sid,
            content="Follow-up needed.",
            category="follow_up",
        )
        assert note.clinician_id == cid
        assert note.client_id == uid
        assert note.session_id == sid
        assert note.category == "follow_up"

    def test_to_dict(self):
        """to_dict() returns the expected keys."""
        note_id = uuid4()
        cid = uuid4()
        uid = uuid4()
        now = datetime.utcnow()
        note = ClinicalNote(
            id=note_id,
            clinician_id=cid,
            client_id=uid,
            content="Test note",
            category="progress",
            created_at=now,
            updated_at=now,
        )
        d = note.to_dict()
        assert d["id"] == str(note_id)
        assert d["clinician_id"] == str(cid)
        assert d["client_id"] == str(uid)
        assert d["content"] == "Test note"
        assert d["category"] == "progress"
        assert d["session_id"] is None
        assert "created_at" in d
        assert "updated_at" in d


@pytest.mark.unit
class TestAlertAcknowledgmentModel:
    """Unit tests for the AlertAcknowledgment SQLAlchemy model."""

    def test_create_acknowledgment_minimal(self):
        """AlertAcknowledgment can be created with minimal fields."""
        ack = AlertAcknowledgment(
            alert_id=uuid4(),
            clinician_id=uuid4(),
            action_taken="reviewed",
        )
        assert ack.action_taken == "reviewed"
        assert ack.response_note is None

    def test_create_acknowledgment_all_fields(self):
        """AlertAcknowledgment accepts all explicit fields."""
        aid = uuid4()
        cid = uuid4()
        ack = AlertAcknowledgment(
            alert_id=aid,
            clinician_id=cid,
            action_taken="escalated",
            response_note="Contacted supervisor.",
        )
        assert ack.alert_id == aid
        assert ack.clinician_id == cid
        assert ack.action_taken == "escalated"
        assert ack.response_note == "Contacted supervisor."

    def test_to_dict(self):
        """to_dict() returns the expected keys."""
        ack_id = uuid4()
        aid = uuid4()
        cid = uuid4()
        now = datetime.utcnow()
        ack = AlertAcknowledgment(
            id=ack_id,
            alert_id=aid,
            clinician_id=cid,
            action_taken="dismissed",
            response_note="False positive.",
            acknowledged_at=now,
        )
        d = ack.to_dict()
        assert d["id"] == str(ack_id)
        assert d["alert_id"] == str(aid)
        assert d["clinician_id"] == str(cid)
        assert d["action_taken"] == "dismissed"
        assert d["response_note"] == "False positive."
        assert "acknowledged_at" in d

    def test_action_taken_values(self):
        """Validate common action_taken values are accepted."""
        for action in ["reviewed", "escalated", "dismissed", "contacted_client"]:
            ack = AlertAcknowledgment(
                alert_id=uuid4(),
                clinician_id=uuid4(),
                action_taken=action,
            )
            assert ack.action_taken == action
