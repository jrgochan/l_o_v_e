"""Unit tests for health check endpoints."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

def test_health_check_liveness():
    """Test /health liveness probe."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "listener"
    assert "version" in data
    assert "timestamp" in data

# Note: /health/ready is mentioned in docs but not implemented in code yet.
# We only test what exists.
