"""API Routes Package.

This package contains all FastAPI route handlers (endpoints) for the Versor engine.
Each module defines a FastAPI router with related endpoints.

Route Modules:
    - calculate.py: Main VAC→quaternion calculation endpoint (/versor/calculate)
    - slerp.py: SLERP interpolation endpoint (/versor/slerp)

Route Organization:
    Routes are organized by functionality:
    - **Calculation routes:** Process VAC vectors and compute metrics
    - **Interpolation routes:** Generate animation paths

    Each route module exports a `router` that gets included in main.py.

Design Pattern:
    Each route file follows this structure:
    1. Import dependencies (FastAPI, models, core functions)
    2. Create APIRouter instance
    3. Define endpoint handlers with decorators
    4. Export router for inclusion in main app

Example:
    Route module structure::

        from fastapi import APIRouter
        from app.api.models import Request, Response

        router = APIRouter()

        @router.post("/endpoint", response_model=Response)
        async def handler(request: Request) -> Response:
            # Process request
            return Response(...)
"""
