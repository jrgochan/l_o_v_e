from fastapi.testclient import TestClient

from app.main import app


def test_versor_app_loads() -> None:
    """Verify versor app instantiates and root endpoint works."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "L.O.V.E. Versor Engine"
        assert data["status"] == "operational"


def test_versor_health_check() -> None:
    """Verify health endpoint returns dependencies."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "dependencies" in data
        assert "numpy" in data["dependencies"]
        assert "scipy" in data["dependencies"]
