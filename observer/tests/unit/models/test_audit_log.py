from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.models.audit_log import AuditLog


@pytest.mark.unit
def test_audit_log_repr():
    """Test string representation of AuditLog."""
    actor_id = uuid4()
    now = datetime.now(timezone.utc)
    log = AuditLog(id=uuid4(), event_type="test.event", actor_id=actor_id, timestamp=now)

    expected = f"<AuditLog test.event actor={actor_id} @ {now}>"
    assert repr(log) == expected
