
import pytest
import uuid
from datetime import datetime
from app.models.clinical_alert import AlertLevel, AlertType, ClinicalAlert

def test_clinical_alert_to_dict():
    """Test ClinicalAlert serialization."""
    alert = ClinicalAlert(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        timestamp=datetime.utcnow(),
        level=AlertLevel.CRITICAL.value,
        type=AlertType.HIGH_AROUSAL.value,
        message="Test alert",
        suggestion="Breathe",
        triggered_by={"vac": [1, 1, 1]},
        threshold_used={"limit": 0.8},
        version="1.0"
    )
    data = alert.to_dict()
    assert data["level"] == "critical"
