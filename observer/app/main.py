"""Observer Module - Main FastAPI Application.

The memory and contextual core of the L.O.V.E. stack.
"""

import uvicorn

from app.core.factory import create_app
from app.core.settings import settings

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=str(settings.LOG_LEVEL).lower(),
    )
