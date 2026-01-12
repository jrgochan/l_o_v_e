
import pytest
import uuid
from datetime import datetime
from app.models.session_analytics import SessionAnalytics

def test_session_analytics_to_dict():
    """Test SessionAnalytics serialization."""
    analytics = SessionAnalytics(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        emotion_count=10,
        average_confidence=0.9,
        dominant_category="Joy",
        start_time=datetime.utcnow(),
        last_emotion_time=datetime.utcnow(),
        total_duration_seconds=120,
        critical_alert_count=1,
        warning_alert_count=2,
        attention_alert_count=3,
        category_counts={"Joy": 10},
        vac_stats={"valence_avg": 0.5},
        updated_at=datetime.utcnow()
    )
    data = analytics.to_dict()
    assert data["emotion_count"] == 10
    assert data["alert_counts"]["critical"] == 1
