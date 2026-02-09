from app.api.schemas.common import QuaternionModel


def test_quaternion_model_to_list():
    """Test converting QuaternionModel to list."""
    q = QuaternionModel(w=1.0, x=0.5, y=0.3, z=0.1)
    result = q.to_list()
    assert result == [1.0, 0.5, 0.3, 0.1]
