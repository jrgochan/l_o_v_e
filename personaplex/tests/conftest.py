import pytest
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create a TestClient instance."""
    with TestClient(app) as c:
        yield c
