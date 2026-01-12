
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_liveness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "listener"
    assert "timestamp" in response.json()
