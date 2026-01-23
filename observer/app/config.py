"""Configuration management using Pydantic Settings.

Loads environment variables from .env file.
"""

import json
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ============================================================================
    # DATABASE CONFIGURATION
    # ============================================================================

    POSTGRES_USER: str = Field(default="love_user")
    POSTGRES_PASSWORD: str = Field(default="love_password")
    POSTGRES_DB: str = Field(default="love_db")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)

    @property
    def DATABASE_URL(self) -> str:
        """Construct async PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ============================================================================
    # EMBEDDING SERVICE
    # ============================================================================

    EMBEDDING_PROVIDER: str = Field(default="local")  # "local" or "openai"
    EMBEDDING_MODEL: str = Field(default="all-MiniLM-L6-v2")

    # OpenAI (optional)
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")

    @property
    def EMBEDDING_DIMENSION(self) -> int:
        """Return embedding dimension based on model."""
        dimensions = {
            "all-MiniLM-L6-v2": 384,
            "all-mpnet-base-v2": 768,
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
        }
        return dimensions.get(self.EMBEDDING_MODEL, 384)

    # ============================================================================
    # EXTERNAL SERVICES
    # ============================================================================

    VERSOR_URL: str = Field(default="http://localhost:8001")
    LISTENER_URL: str = Field(default="http://localhost:8002")

    @property
    def LISTENER_API_URL(self) -> str:
        """Construct Listener API URL for latency checks."""
        return self.LISTENER_URL

    # ============================================================================
    # SECURITY
    # ============================================================================

    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    ALLOWED_ORIGINS: str = Field(default='["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:19006"]')

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        """Parse comma-separated allowed origins into list."""
        try:
            result: List[str] = json.loads(self.ALLOWED_ORIGINS)
            return result
        except json.JSONDecodeError:
            return ["http://localhost:3000"]

    # ============================================================================
    # PERFORMANCE TUNING
    # ============================================================================

    HNSW_EF_SEARCH: int = Field(default=40)
    DB_POOL_SIZE: int = Field(default=20)
    DB_MAX_OVERFLOW: int = Field(default=10)
    DB_POOL_RECYCLE: int = Field(default=3600)

    # ============================================================================
    # LOGGING & DEBUGGING
    # ============================================================================

    DEBUG: bool = Field(default=True)
    LOG_LEVEL: str = Field(default="DEBUG")

    # ============================================================================
    # APPLICATION SETTINGS
    # ============================================================================

    API_VERSION: str = Field(default="v1")
    APP_NAME: str = Field(default="L.O.V.E. Observer API")
    APP_DESCRIPTION: str = Field(default="Emotional state persistence and context retrieval")
    DEFAULT_EMOTION_COLLECTION: str = Field(default="goemotions")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


# Global settings instance
settings = Settings()


# Convenience function for external imports
def get_settings() -> Settings:
    """Get application settings instance."""
    return settings
