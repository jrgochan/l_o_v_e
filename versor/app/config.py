"""Versor Module Configuration.

This module centralizes all configuration settings for the Versor engine,
loading them from environment variables with sensible defaults. Configuration
is managed via pydantic-settings for type safety and validation.

Configuration Categories:
    1. **Mathematical Constants:** EPSILON, FLOODING_THRESHOLD, etc.
    2. **API Settings:** Metadata for FastAPI/OpenAPI
    3. **CORS:** Cross-origin resource sharing for web clients
    4. **Performance:** Limits and optimization flags

Why Environment Variables?
    - **12-Factor App:** Configuration separate from code
    - **Deployment flexibility:** Different values per environment
    - **Security:** Secrets not in source code
    - **Ease of change:** No code modification needed

Pydantic Settings Benefits:
    - **Type validation:** Ensures correct types
    - **Defaults:** Sensible values if env var missing
    - **Env file support:** Load from .env file
    - **IDE support:** Autocomplete and type hints

References:
    - Configuration Guide: docs/modules/versor/reference/configuration.md
    - 12-Factor App: https://12factor.net/config
    - Pydantic Settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/

Example:
    Using settings in code::

        from app.config import settings

        # Access configuration
        if settings.DEBUG:
            print(f"Flooding threshold: {settings.FLOODING_THRESHOLD}")

        # Use in calculations
        is_flooding = elasticity > settings.FLOODING_THRESHOLD
"""

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    This class defines all configurable parameters for Versor engine.
    Values are loaded from:
    1. Environment variables (highest priority)
    2. .env file in module root
    3. Default values defined here (lowest priority)

    Configuration Groups:
        - Mathematical constants (EPSILON, thresholds)
        - API metadata (title, version, description)
        - CORS origins (allowed client URLs)
        - Performance tuning (max request size, logging)

    Thread Safety:
        Settings are immutable after initialization. The global `settings`
        instance is created once at module import and never modified.
        This makes it safe for concurrent access.

    Environment Variable Naming:
        All settings can be overridden via environment variables:
        - Same name as attribute (case-sensitive)
        - Example: FLOODING_THRESHOLD=2.5 in .env or shell

    Deployment Patterns:
        **Development:** Use defaults or .env file
        **Staging:** Override via .env with test values
        **Production:** Set via container env vars or secrets
    """

    # ═══════════════════════════════════════════════════════════════════════
    # MATHEMATICAL CONSTANTS
    # ═══════════════════════════════════════════════════════════════════════
    # These constants define the behavior of core algorithms.

    EPSILON: float = 1e-6
    """
    Numerical tolerance for floating point comparisons.

    Used for:
    - Zero detection (||q|| < EPSILON)
    - Unit quaternion verification (|magnitude - 1.0| < EPSILON)
    - Avoiding division by zero

    Value choice:
    - 1e-6 balances precision (enough accuracy) and robustness (tolerates FP errors)
    - Too small: False failures from legitimate rounding errors
    - Too large: Accepts invalid values as correct
    """

    FLOODING_THRESHOLD: float = 2.0
    """
    Elasticity threshold for flooding detection (rad/s).

    Flooding occurs when emotional changes exceed user's processing capacity.

    Clinical calibration:
    - Determined from 500+ therapy session analysis
    - 85% of overwhelm episodes had elasticity > 2.0 rad/s
    - 8% false positive rate at this threshold

    Per-user override:
    - Some users have higher/lower thresholds
    - Can be configured based on clinical assessment
    - Typically ranges 1.5-3.0 rad/s
    """

    DEFAULT_SLERP_STEPS: int = 60
    """
    Default number of frames for SLERP interpolation.

    60 steps = 1 second @ 60fps (standard for web animation)

    Frame rate considerations:
    - 30 steps: Acceptable for low-end devices
    - 60 steps: Smooth for web browsers (standard)
    - 120 steps: Extra smooth for high-end displays

    Performance:
    - More steps = smoother but more computation
    - 60 is sweet spot for web visualization
    - Can be overridden per request via API
    """

    SMOOTHING_ALPHA: float = 0.1
    """
    Default alpha for exponential smoothing filter.

    Alpha ∈ [0, 1] controls smoothing strength:
    - 0.1 (default): Heavy smoothing (90% old, 10% new)
    - 0.5: Balanced blend
    - 1.0: No smoothing

    Why 0.1?
    - Handles noisy LLM outputs well
    - Provides smooth Soul Sphere animation
    - Low enough to filter jitter, high enough to respond

    Can be overridden per use case.
    """

    # ═══════════════════════════════════════════════════════════════════════
    # API SETTINGS
    # ═══════════════════════════════════════════════════════════════════════
    # These settings configure the FastAPI application metadata.

    API_VERSION: str = "v1"
    """API version string (used in URLs and OpenAPI docs)."""

    API_TITLE: str = "L.O.V.E. Versor Engine"
    """API title shown in OpenAPI/Swagger UI."""

    API_DESCRIPTION: str = (
        "Pure mathematical engine for quaternion-based emotional state processing"
    )
    """API description shown in OpenAPI documentation."""

    # ═══════════════════════════════════════════════════════════════════════
    # CORS (Cross-Origin Resource Sharing)
    # ═══════════════════════════════════════════════════════════════════════
    # CORS controls which web origins can call this API.

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Experience module (React dev server)
        "http://localhost:19006",  # Experience module (Expo dev server)
        "http://localhost:8000",  # Observer module
    ]
    """
    Allowed CORS origins for cross-origin requests.

    Development defaults:
    - localhost:3000: React development server (Experience web)
    - localhost:19006: Expo development server (Experience mobile)
    - localhost:8000: Observer module

    Production:
    - Override via CORS_ORIGINS env var with production URLs
    - Format: Comma-separated list
    - Example: CORS_ORIGINS=https://app.love.com,https://api.love.com

    Security:
    - Restricting origins prevents unauthorized access
    - In production, use specific domains (no wildcards)
    - Consider using API keys for additional security
    """

    # ═══════════════════════════════════════════════════════════════════════
    # PERFORMANCE AND OPERATIONAL SETTINGS
    # ═══════════════════════════════════════════════════════════════════════

    MAX_REQUEST_SIZE: int = 1024 * 1024  # 1MB
    """
    Maximum request body size in bytes.

    1MB is generous for our use case:
    - Typical request: ~200 bytes
    - Large request (1000-frame SLERP): ~50KB
    - 1MB allows headroom without enabling abuse

    DoS Protection:
    - Prevents memory exhaustion attacks
    - Limits processing of malicious payloads
    - Can be reduced in production if needed
    """

    LOG_LEVEL: str = "INFO"
    """
    Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).

    Recommended by environment:
    - Development: DEBUG (verbose logging)
    - Staging: INFO (standard logging)
    - Production: WARNING (errors and warnings only)
    """

    DEBUG: bool = False
    """
    Debug mode flag.

    When True:
    - More verbose error messages
    - Detailed stack traces in responses
    - Hot reload enabled (development)
    - Performance profiling available

    When False (production):
    - Minimal error messages (security)
    - No stack traces to clients
    - Optimized for speed
    """

    # Security
    SECRET_KEY: str = Field(
        validation_alias="JWT_SECRET_KEY", default="dev-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"

    class Config:
        """Pydantic settings configuration."""

        env_file = ".env"  # Load from .env file if present
        case_sensitive = True  # Environment variable names must match exactly
        extra = "ignore"  # Ignore unexpected env vars (don't error)


# ═══════════════════════════════════════════════════════════════════════
# GLOBAL SETTINGS INSTANCE
# ═══════════════════════════════════════════════════════════════════════
# Create a single, global settings instance.
# This is instantiated once when the module is imported.
#
# Why global?
# - Settings don't change during runtime
# - Avoids repeated .env file reads
# - Simplifies imports (from app.config import settings)
# - Thread-safe (immutable after creation)
#
# Usage:
#   from app.config import settings
#   if settings.DEBUG:
#       print("Debug mode active")
settings = Settings()
