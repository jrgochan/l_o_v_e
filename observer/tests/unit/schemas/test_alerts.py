"""Unit tests for clinical alert schemas."""

from datetime import datetime
from uuid import uuid4

from app.schemas.alerts import ClinicalAlertResponse


def test_clinical_alert_response_schema() -> None:
    """Test ClinicalAlertResponse instantiation and field access."""
    alert = ClinicalAlertResponse(
        id=uuid4(),
        session_id=uuid4(),
        timestamp=datetime.now(),
        level="warning",
        type="emotional_crisis",
        message="Elevated distress detected",
        suggestion="Consider a brief check-in",
        triggered_by={"emotion": "Despair", "valence": -0.9},
        threshold_used={"valence_threshold": -0.7},
        version="1.0",
    )
    assert alert.level == "warning"
    assert alert.type == "emotional_crisis"
    assert alert.suggestion == "Consider a brief check-in"


def test_clinical_alert_response_optional_suggestion() -> None:
    """Test ClinicalAlertResponse with suggestion omitted."""
    alert = ClinicalAlertResponse(
        id=uuid4(),
        session_id=uuid4(),
        timestamp=datetime.now(),
        level="critical",
        type="self_harm_risk",
        message="Risk indicators detected",
        triggered_by={"pattern": "escalation"},
        threshold_used={"risk_score": 0.85},
        version="2.0",
    )
    assert alert.suggestion is None
