"""Listener Module - Configuration Management.

Centralized configuration using Pydantic Settings for type-safe environment variables.

This module manages all configuration for the Listener module, loading values from
environment variables (.env file) with type validation and default values.

Key Components:
    Settings: Pydantic BaseSettings class with all configuration parameters
    settings: Global settings instance (singleton)

Configuration Sources (in order of precedence):
    1. Environment variables (highest priority)
    2. .env file in listener/ directory
    3. Default values in Settings class (lowest priority)

Usage:
    >>> from app.config import settings
    >>> print(settings.OLLAMA_MODEL)
    "llama3.1:8b-instruct-q4_0"
    >>> print(settings.ENVIRONMENT)
    "development"

Environment Files:
    - .env - Local development (gitignored)
    - .env.example - Template for new developers
    - .env.production - Production values (never commit!)

Validation:
    - Type checking via Pydantic
    - Literal types for constrained values (e.g., ENVIRONMENT)
    - Automatic casting (strings to ints, etc.)

Examples:
    Access settings anywhere:
    >>> from app.config import settings
    >>> ollama_url = settings.OLLAMA_BASE_URL
    >>> model_name = settings.OLLAMA_MODEL

See Also:
    - Reference: docs/modules/listener/reference/configuration.md
    - .env.example - Template file
    - Deployment: docs/modules/listener/senior-developers/01-deep-dive-architecture.md
"""

from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables with type validation.

    This Pydantic Settings class provides:
    - Type-safe configuration
    - Automatic environment variable loading
    - Default values for all settings
    - Validation on startup

    Settings are loaded from:
    1. Environment variables (highest priority)
    2. .env file
    3. Default values (defined here)

    All settings can be overridden by setting environment variables with the same name.

    Configuration Groups:
        - Server: HOST, PORT, ENVIRONMENT, LOG_LEVEL
        - Transcription: WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
        - LLM: OLLAMA_BASE_URL, OLLAMA_MODEL, LLM_TEMPERATURE
        - Redis: REDIS_HOST, REDIS_PORT, REDIS_DB
        - External Services: OBSERVER_URL, VERSOR_URL
        - Workers: ARQ_MAX_JOBS, ARQ_JOB_TIMEOUT

    Sample Usage:
        Access settings:
        >>> from app.config import settings
        >>> print(settings.OLLAMA_MODEL)
        "llama3.1:8b-instruct-q4_0"

        Override with environment variable:
        $ export OLLAMA_MODEL="phi-3:mini"
        $ python
        >>> from app.config import settings
        >>> print(settings.OLLAMA_MODEL)
        "phi-3:mini"

    Notes:
        - Validated on import (startup fails fast if config is invalid)
        - Case-sensitive variable names
        - Reads from .env file automatically
        - Type casting is automatic (e.g., "8002" → 8002)

    See Also:
        - Complete reference: docs/modules/listener/reference/configuration.md
        - .env.example - Template with all settings
        - Pydantic Settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
    """

    # Server Configuration
    HOST: str = "0.0.0.0"  # nosec B104 - Intentional for Docker/container deployment
    PORT: int = 8002
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Transcription Configuration
    WHISPER_MODEL: str = "base.en"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"

    # LLM Configuration (Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b-instruct-q4_0"
    LLM_TEMPERATURE: float = 0.0

    # Cloud AI Configuration
    AI_PROVIDER: Literal["ollama", "google_vertex"] = "ollama"
    GOOGLE_CLOUD_PROJECT: Optional[str] = None
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    VERTEX_MODEL_NAME: str = "gemini-1.5-flash-001"

    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # External Services
    OBSERVER_URL: str = "http://localhost:8000"
    VERSOR_URL: str = "http://localhost:8001"

    # Logging
    LOG_LEVEL: str = "INFO"

    # AI Model Configuration
    PII_MODEL_PATH: Optional[str] = None

    # Security
    SECRET_KEY: str = Field(
        validation_alias="JWT_SECRET_KEY", default="dev-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"

    # Worker Configuration
    ARQ_MAX_JOBS: int = 5
    ARQ_JOB_TIMEOUT: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # Changed from forbid to allow potential legacy/extra env vars, or just add the field
    )


# Global settings instance
settings = Settings()
