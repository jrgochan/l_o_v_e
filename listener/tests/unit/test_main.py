from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "Listener API"
    assert "ingest" in response.json()["endpoints"]


def test_startup_shutdown_events() -> None:
    # TestClient context manager triggers startup and shutdown events
    with patch("app.main.logger") as mock_logger:
        with TestClient(app) as _:
            # Startup should have run
            pass
        # Shutdown should have run

        # Verify logging calls
        # Note: Startup logs 4 info messages, Shutdown logs 1
        assert mock_logger.info.called
        assert mock_logger.info.call_count >= 5


def test_cors_middleware() -> None:
    # Test CORS headers
    # Note: CORSMiddleware with allow_origins=["*"] and allow_credentials=True
    # typically reflects the Origin header in Access-Control-Allow-Origin
    # when credentials are true, because '*' is invalid with credentials.
    origin = "http://localhost:3000"
    response = client.options(
        "/health", headers={"Origin": origin, "Access-Control-Request-Method": "GET"}
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    allow_methods = response.headers["access-control-allow-methods"]
    assert "GET" in allow_methods
    assert "POST" in allow_methods
    assert "OPTIONS" in allow_methods


def test_routes_exist() -> None:
    # Verify all expected routes are registered
    routes = [r.path for r in app.routes]  # type: ignore[attr-defined]
    assert "/health" in routes
    assert "/listener/ingest" in routes
    assert "/listener/ai/models/local" in routes
