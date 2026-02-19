from datetime import datetime
from uuid import uuid4

from app.models.consent_record import ConsentRecord


def test_consent_record_repr():
    """Test __repr__ method for active and revoked consents."""
    user_id = uuid4()

    # Active
    c1 = ConsentRecord(user_id=user_id, consent_type="param1", version="1.0", revoked_at=None)
    assert "active" in repr(c1)
    assert "param1" in repr(c1)

    # Revoked
    c2 = ConsentRecord(
        user_id=user_id,
        consent_type="param2",
        version="2.0",
        revoked_at=datetime.utcnow(),
    )
    assert "revoked" in repr(c2)
    assert "param2" in repr(c2)


def test_consent_record_to_dict():
    """Test to_dict method."""
    user_id = uuid4()
    now = datetime.utcnow()

    c = ConsentRecord(
        id=uuid4(),
        user_id=user_id,
        consent_type="param1",
        version="1.0",
        granted_at=now,
        revoked_at=None,
        ip_address="127.0.0.1",
    )

    d = c.to_dict()
    assert d["id"] == str(c.id)
    assert d["user_id"] == str(user_id)
    assert d["consent_type"] == "param1"
    assert d["version"] == "1.0"
    assert d["granted_at"] == now.isoformat()
    assert d["revoked_at"] is None
    assert d["ip_address"] == "127.0.0.1"
