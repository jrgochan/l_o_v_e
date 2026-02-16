r"""Versor Module - FastAPI Application.

Quaternion mathematics engine for the L.O.V.E. stack.

This is a thin wrapper around the application factory. The actual
configuration lives in app.core.factory.create_app().

Running the Application:
    Development:
        uvicorn app.main:app --reload --port 8001

    Production:
        uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4

API Endpoints:
    - GET  /: Service information and endpoint list
    - GET  /health: Health check with dependency versions
    - POST /versor/calculate: Main VAC→quaternion calculation
    - POST /versor/slerp: Generate SLERP interpolation paths

See Also:
    - Factory: app/core/factory.py
    - Configuration: app/config.py
    - Core Math: app/core/ (quaternion.py, vac_model.py, interpolation.py)
"""

import uvicorn

from app.config import settings
from app.core.factory import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # nosec B104 — intentional for container deployments
        port=8001,
        reload=settings.DEBUG,
        log_level=str(settings.LOG_LEVEL).lower(),
    )
