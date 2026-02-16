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


def test_main_block_calls_uvicorn(monkeypatch: "pytest.MonkeyPatch") -> None:
    """Cover the ``if __name__ == '__main__'`` block (line 35)."""
    import importlib
    import types
    from unittest.mock import MagicMock

    import pytest  # noqa: F811 — needed for type hint above

    mock_run = MagicMock()
    monkeypatch.setattr("uvicorn.run", mock_run)

    # Read the source and exec it with __name__ set to "__main__"
    spec = importlib.util.find_spec("app.main")
    assert spec is not None and spec.origin is not None
    source = open(spec.origin).read()  # noqa: SIM115
    code = compile(source, spec.origin, "exec")
    fake_globals: dict = {"__name__": "__main__", "__file__": spec.origin}
    exec(code, fake_globals)  # noqa: S102 — intentional for test coverage

    mock_run.assert_called_once()
    call_kwargs = mock_run.call_args
    assert call_kwargs[1]["host"] == "0.0.0.0"  # nosec B104
    assert call_kwargs[1]["port"] == 8001
