"""Listener Module - FastAPI Application.

Main application entry point for the Listener API server.

This is a thin wrapper around the application factory. The actual
configuration lives in app.core.factory.create_app().

Running the Application:
    Development:
        uvicorn app.main:app --reload --port 8002

    Production:
        uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4

Interactive Documentation:
    - Swagger UI: http://localhost:8002/docs
    - ReDoc: http://localhost:8002/redoc
    - OpenAPI JSON: http://localhost:8002/openapi.json

Examples:
    Import the app for testing:
    >>> from app.main import app
    >>> from fastapi.testclient import TestClient
    >>> client = TestClient(app)
    >>> response = client.get("/health")
    >>> assert response.status_code == 200

See Also:
    - Factory: app/core/factory.py
    - Configuration: app/config.py
    - Routes: app/api/routes/ (health.py, ingest.py, ai_models.py)
"""

import uvicorn

from app.config import settings
from app.core.factory import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
