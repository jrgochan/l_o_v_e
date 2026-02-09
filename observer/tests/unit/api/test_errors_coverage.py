import pytest
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.errors import register_error_handlers


def create_test_app():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/http-error")
    def trigger_http_error():
        # Trigger standard HTTPException (which inherits from StarletteHTTPException)
        raise HTTPException(status_code=400, detail="Custom HTTP Error")

    @app.get("/starlette-error")
    def trigger_starlette_error():
        # Trigger raw StarletteHTTPException
        raise StarletteHTTPException(status_code=418, detail="I'm a teapot")

    @app.get("/validation-error")
    def trigger_validation_error():
        # Manually raise RequestValidationError to test handler directly
        # Typically this happens automatically via Pydantic models, but manual raise is cleaner for unit test
        raise RequestValidationError(
            errors=[{"loc": ["body", "field"], "msg": "Invalid", "type": "value_error"}]
        )

    @app.get("/generic-error")
    def trigger_generic_error():
        raise ValueError("Something went unexpected")

    return app


@pytest.fixture
def client():
    app = create_test_app()
    return TestClient(app, raise_server_exceptions=False)


def test_http_exception_handler(client):
    response = client.get("/http-error")
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Custom HTTP Error"
    assert data["code"] == "http_error"


def test_starlette_exception_handler(client):
    response = client.get("/starlette-error")
    assert response.status_code == 418
    data = response.json()
    assert data["detail"] == "I'm a teapot"
    assert data["code"] == "http_error"


def test_validation_exception_handler(client):
    response = client.get("/validation-error")
    assert response.status_code == 422
    data = response.json()
    # Pydantic/FastAPI validation errors are list of dicts
    assert isinstance(data["detail"], list)
    assert data["detail"][0]["msg"] == "Invalid"
    assert data["code"] == "validation_error"


def test_generic_exception_handler(client):
    response = client.get("/generic-error")
    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "Internal Server Error"
    assert data["code"] == "server_error"
