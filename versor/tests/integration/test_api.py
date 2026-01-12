import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "dependencies" in data
    assert "numpy" in data["dependencies"]
    assert "scipy" in data["dependencies"]

def test_root_endpoint():
    """Test root service information endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "L.O.V.E. Versor Engine"
    assert data["status"] == "operational"
    assert "endpoints" in data

def test_calculate_endpoint_valid():
    """Test calculation with valid VAC vector."""
    payload = {
        "current_vac": {
            "valence": 0.8,
            "arousal": 0.5,
            "connection": 0.2
        },
        "time_delta_seconds": 1.0
    }
    response = client.post("/versor/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Check response structure
    assert "current_state" in data
    assert "transition_quaternion" in data
    assert "elasticity_metric" in data
    assert "insight_code" in data
    assert "interpolation_path" in data
    assert isinstance(data["interpolation_path"], list)

def test_calculate_endpoint_with_previous_state():
    """Test calculation with provided previous state."""
    payload = {
        "current_vac": {
            "valence": 0.5,
            "arousal": 0.5,
            "connection": 0.5
        },
        "previous_state": {
            "w": 1.0,
            "x": 0.0,
            "y": 0.0,
            "z": 0.0
        },
        "time_delta_seconds": 0.5
    }
    response = client.post("/versor/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["angular_distance_radians"] >= 0

def test_calculate_endpoint_invalid_vac():
    """Test validation error for out-of-range VAC values."""
    payload = {
        "current_vac": {
            "valence": 1.5,  # Invalid: > 1.0
            "arousal": 0.0,
            "connection": 0.0
        }
    }
    response = client.post("/versor/calculate", json=payload)
    assert response.status_code == 422

def test_slerp_endpoint_valid():
    """Test SLERP path generation."""
    payload = {
        "start_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
        "target_quaternion": {"w": 0.0, "x": 1.0, "y": 0.0, "z": 0.0},
        "steps": 10
    }
    response = client.post("/versor/slerp", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "path" in data
    assert len(data["path"]) == 10
    assert data["total_frames"] == 10
    assert "angular_distance" in data
