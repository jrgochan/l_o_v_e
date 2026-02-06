from fastapi.testclient import TestClient

from app.main import app


def test_main_app_loads():
    """Verify main app instantiates and root endpoint works."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "L.O.V.E. Observer API"
