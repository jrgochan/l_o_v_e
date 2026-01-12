"""API Layer Package.

This package contains the FastAPI routes and Pydantic models that expose
Versor's mathematical capabilities via REST API. It provides the interface
between HTTP clients and the core mathematical engine.

Package Structure:
    - routes/: FastAPI endpoint implementations
        - calculate.py: Main VAC→quaternion calculation endpoint
        - slerp.py: SLERP interpolation endpoint
    - models/: Pydantic request/response schemas
        - request.py: Input validation models
        - response.py: Output serialization models

Responsibilities:
    - **HTTP handling:** Accept and validate requests
    - **Serialization:** JSON ↔ Python objects
    - **Validation:** Type checking and constraint enforcement
    - **Documentation:** Auto-generated OpenAPI/Swagger docs
    - **Error handling:** 422 validation errors, 500 server errors

Design Principles:
    - **Stateless:** No session management or caching
    - **RESTful:** HTTP methods and status codes used correctly
    - **Validated:** All inputs validated before processing
    - **Documented:** Complete OpenAPI specification
    - **Typed:** Strong typing throughout

Example:
    Registering routes in main.py::

        from app.api.routes import calculate, slerp

        app.include_router(calculate.router, prefix="/versor")
        app.include_router(slerp.router, prefix="/versor")
"""
