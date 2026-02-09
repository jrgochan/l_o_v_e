"""Service fixtures."""

import pytest

from app.services import get_embedding_service, get_quaternion_builder


@pytest.fixture
def mock_versor_response():
    """Mock Versor API response."""
    return {
        "current_state": {"w": 0.68, "x": 0.50, "y": 0.39, "z": 0.45},
        "transition_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
        "angular_distance_radians": 0.5,
        "elasticity_metric": 0.5,
        "is_flooding": False,
        "insight_code": "STABLE",
    }


@pytest.fixture
def mock_embedding():
    """Mock embedding vector (384 dimensions for all-MiniLM-L6-v2)."""
    return [0.01] * 384


@pytest.fixture
def embedding_service():
    """Provide embedding service instance."""
    return get_embedding_service()


@pytest.fixture
def quaternion_builder():
    """Provide quaternion builder instance."""
    return get_quaternion_builder()
