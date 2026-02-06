from fastapi.testclient import TestClient

from app.main import app


def test_listener_app_loads():
    """Verify listener app instantiates and root endpoint works."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "Listener API"
