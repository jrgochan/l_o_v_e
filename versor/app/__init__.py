"""Project L.O.V.E. - Versor Module.

The Mathematical Heart of the L.O.V.E. Stack

Versor is a stateless microservice that provides pure mathematical operations
for quaternion-based emotional state processing. It serves as the computational
engine for the entire L.O.V.E. platform.

What Versor Does:
    1. **VAC → Quaternion Conversion:** Transforms 3D emotional vectors into
       4D quaternion representations for rotation-based mathematics

    2. **Transition Calculations:** Computes metrics quantifying emotional
       changes (angular distance, elasticity, flooding detection)

    3. **SLERP Interpolation:** Generates smooth animation paths between
       emotional states for Soul Sphere visualization

Module Architecture:
    versor/
    ├── app/
    │   ├── core/          # Pure mathematical functions
    │   │   ├── quaternion.py      # Quaternion algebra
    │   │   ├── vac_model.py       # VAC representation
    │   │   ├── interpolation.py   # SLERP implementation
    │   │   └── transitions.py     # Transition metrics
    │   ├── api/           # FastAPI routes and models
    │   │   ├── routes/            # Endpoint implementations
    │   │   └── models/            # Request/response schemas
    │   ├── utils/         # SciPy integration adapter
    │   ├── config.py      # Configuration management
    │   └── main.py        # FastAPI application

Design Philosophy:
    - **Stateless:** No database, no sessions, no state
    - **Pure functions:** Deterministic, testable, cacheable
    - **Single responsibility:** Only mathematical operations
    - **Fast:** In-memory computation, no I/O
    - **Scalable:** Horizontally scalable microservice

Integration:
    - **Listener:** Sends VAC vectors from LLM analysis
    - **Observer:** Receives quaternions for trajectory tracking
    - **Experience:** Uses SLERP paths for Soul Sphere animation

Performance:
    - Request latency: 1-5ms typical
    - Throughput: 500-1000 req/s per worker
    - Memory: ~50MB baseline
    - CPU: Negligible (pure math, no ML)

References:
    - Full documentation: docs/modules/versor/
    - API Reference: docs/modules/versor/reference/api-reference.md
    - Architecture: docs/modules/versor/senior-developers/01-deep-dive-architecture.md
"""

__version__ = "0.1.0"
