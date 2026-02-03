from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Detect project root relative to this file
# Assuming this file will be copied/installed to: <module>/app/common/settings.py
# Or referenced from a shared lib.
# For now, we'll design this to be a mixin or base class to be copied into modules
# or a shared package if we had one.
# Since we are in a monorepo without a shared 'common' python package yet,
# We will place this in `infra/lib/python/settings.py` and encourage symlinking
# or copying.
#
# Actually, for Phase 2.1, let's create it in a standard location we can path to.


class LoveBaseSettings(BaseSettings):
    """
    Base settings for all L.O.V.E. stack services.
    Automatically loads from infra/config/base.env
    """

    # Project Info
    PROJECT_NAME: str = "love-stack"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "love_db"
    DB_USER: str = "love_user"
    DB_PASSWORD: str = "love_password"
    DATABASE_URL: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None

    # Service URLs
    VERSOR_URL: str = "http://localhost:8001"
    OBSERVER_URL: str = "http://localhost:8000"
    LISTENER_URL: str = "http://localhost:8002"
    PERSONAPLEX_URL: str = "http://localhost:8003"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Use field for computed defaults if needed, or just properties
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=(".env", "../../infra/config/base.env"),  # Try local .env first, then base.env
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def model_post_init(self, __context):
        # Construct derived URLs if missing
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@"
                f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )

        if not self.REDIS_URL:
            self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"
