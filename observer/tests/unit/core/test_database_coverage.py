import uuid

from app.database import uuid_factory


def test_uuid_factory():
    """Test line 20: uuid_factory returns a UUID."""
    val = uuid_factory()
    assert isinstance(val, uuid.UUID)
    # Check version 4
    assert val.version == 4
