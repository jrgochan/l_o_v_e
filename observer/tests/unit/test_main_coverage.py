from contextlib import asynccontextmanager

from fastapi.testclient import TestClient

from app.main import app


@asynccontextmanager
async def mock_lifespan(_app):
    yield


def test_main_app_loads():
    """Verify main app instantiates and root endpoint works."""
    # Override lifespan to avoid DB connection
    app.router.lifespan_context = mock_lifespan

    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "L.O.V.E. Observer API"
