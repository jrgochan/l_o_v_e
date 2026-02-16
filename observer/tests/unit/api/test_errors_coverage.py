"""Tests for shared error handlers.

Validates that the global exception handlers installed by
``register_error_handlers`` produce the expected JSON response shapes.
"""

import pytest
from exceptions import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    LoveBaseError,
    NotFoundError,
    ServiceUnavailableError,
    ValidationError,
    register_error_handlers,
)
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException


def create_test_app():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/http-error")
    def trigger_http_error():
        raise HTTPException(status_code=400, detail="Custom HTTP Error")

    @app.get("/starlette-error")
    def trigger_starlette_error():
        raise StarletteHTTPException(status_code=418, detail="I'm a teapot")

    @app.get("/validation-error")
    def trigger_validation_error():
        raise RequestValidationError(
            errors=[{"loc": ["body", "field"], "msg": "Invalid", "type": "value_error"}]
        )

    @app.get("/generic-error")
    def trigger_generic_error():
        raise ValueError("Something went unexpected")

    @app.get("/not-found")
    def trigger_not_found():
        raise NotFoundError("Emotion not found")

    @app.get("/validation")
    def trigger_validation():
        raise ValidationError("VAC vector must have 3 components")

    @app.get("/auth-error")
    def trigger_auth_error():
        raise AuthenticationError()

    @app.get("/authz-error")
    def trigger_authz_error():
        raise AuthorizationError("Admin role required")

    @app.get("/conflict")
    def trigger_conflict():
        raise ConflictError("Session already exists", extra={"session_id": "abc"})

    @app.get("/unavailable")
    def trigger_unavailable():
        raise ServiceUnavailableError("Ollama is down")

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
    assert isinstance(data["detail"], list)
    assert data["detail"][0]["msg"] == "Invalid"
    assert data["code"] == "validation_error"


def test_generic_exception_handler(client):
    response = client.get("/generic-error")
    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "Internal Server Error"
    assert data["code"] == "server_error"


# ── Domain Exception Tests ──────────────────────────────────────────────────


def test_not_found_error(client):
    response = client.get("/not-found")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Emotion not found"
    assert data["code"] == "not_found"


def test_validation_error(client):
    response = client.get("/validation")
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "VAC vector must have 3 components"
    assert data["code"] == "validation_error"


def test_authentication_error(client):
    response = client.get("/auth-error")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Not authenticated"
    assert data["code"] == "authentication_error"


def test_authorization_error(client):
    response = client.get("/authz-error")
    assert response.status_code == 403
    data = response.json()
    assert data["detail"] == "Admin role required"
    assert data["code"] == "authorization_error"


def test_conflict_error_with_extra(client):
    response = client.get("/conflict")
    assert response.status_code == 409
    data = response.json()
    assert data["detail"] == "Session already exists"
    assert data["code"] == "conflict"
    assert data["extra"]["session_id"] == "abc"


def test_service_unavailable_error(client):
    response = client.get("/unavailable")
    assert response.status_code == 503
    data = response.json()
    assert data["detail"] == "Ollama is down"
    assert data["code"] == "service_unavailable"


# ── Exception Class Tests ───────────────────────────────────────────────────


def test_love_base_error_defaults():
    err = LoveBaseError()
    assert err.detail == "An unexpected error occurred"
    assert err.status_code == 500
    assert err.code == "server_error"
    assert err.extra == {}


def test_love_base_error_to_response():
    err = NotFoundError("User missing", extra={"user_id": "123"})
    response = err.to_response()
    assert response.status_code == 404
    import json

    body = json.loads(response.body)
    assert body["detail"] == "User missing"
    assert body["code"] == "not_found"
    assert body["extra"]["user_id"] == "123"


def test_exception_str():
    err = ValidationError("Bad input")
    assert str(err) == "Bad input"
