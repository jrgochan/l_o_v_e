from uuid import uuid4

from app.models.bootstrap_data import BootstrapData


def test_bootstrap_data_to_dict():
    """Test to_dict() method for BootstrapData."""
    bd = BootstrapData(id=uuid4(), data_type="test", content={})
    assert isinstance(bd.to_dict(), dict)
