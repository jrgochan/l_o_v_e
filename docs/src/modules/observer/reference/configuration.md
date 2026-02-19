# Configuration Reference

**Audience:** DevOps, system administrators, developers
**Goal:** Complete reference for Observer configuration

---

## Overview

Observer is configured via **environment variables** loaded from `.env` file or system environment.

**Configuration priority:**

1. System environment variables (highest)
2. `.env` file
3. Default values (lowest)

---

## Environment Variables

### Core Settings

```bash
# Application environment
ENVIRONMENT=development
# Options: development, staging, production
# Default: development

# Logging level
LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Default: INFO

# API server
HOST=0.0.0.0
# Default: 0.0.0.0 (all interfaces)

PORT=8000
# Default: 8000
```

---

### Database Configuration

```bash
# Database connection components (auto-assembled into DATABASE_URL)
POSTGRES_USER=love_user
# Default: love_user

POSTGRES_PASSWORD=love_password
# Default: love_password

POSTGRES_DB=love_db
# Default: love_db

POSTGRES_HOST=localhost
# Default: localhost

POSTGRES_PORT=5432
# Default: 5432

# OR set DATABASE_URL directly (overrides individual fields)
DATABASE_URL=postgresql+asyncpg://love_user:love_password@localhost:5432/love_db
# If not set, auto-assembled from POSTGRES_* fields above

# Connection pool settings
DB_POOL_SIZE=20
# Default: 20

DB_MAX_OVERFLOW=10
# Default: 10

DB_POOL_RECYCLE=3600
# Default: 3600 (1 hour)
```

---

### Versor Integration

```bash
# Versor service URL
VERSOR_URL=http://localhost:8001
# Default: http://localhost:8001

# Listener service URL
LISTENER_URL=http://localhost:8002
# Default: http://localhost:8002
```

---

### Security Settings

```bash
# JWT secret key (CHANGE IN PRODUCTION)
SECRET_KEY=dev-secret-key-change-in-production
# Default: dev-secret-key-change-in-production

# JWT algorithm
ALGORITHM=HS256
# Default: HS256

# JWT access token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30
# Default: 30

# CORS allowed origins (JSON array string)
ALLOWED_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:19006"]
# Default: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:19006"]
```

---

### Admin Configuration

```bash
# Default admin account (auto-created on first run)
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=lovelove
ADMIN_FULL_NAME=System Admin

# Allow new user registration
REGISTRATION_ENABLED=true
# Default: true
```

---

### Embedding Service

```bash
# Embedding provider
EMBEDDING_PROVIDER=local
# Options: local, openai
# Default: local

# Local embedding model (if provider=local)
EMBEDDING_MODEL=all-MiniLM-L6-v2
# Default: all-MiniLM-L6-v2
# Alternatives: all-mpnet-base-v2

# OpenAI settings (if provider=openai)
OPENAI_API_KEY=sk-...
# Required if EMBEDDING_PROVIDER=openai

OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# Default: text-embedding-3-small
# Alternatives: text-embedding-3-large
```

> **Note:** `EMBEDDING_DIMENSION` is automatically computed from the chosen model (384 for `all-MiniLM-L6-v2`, 768 for `all-mpnet-base-v2`, 1536 for `text-embedding-3-small`, 3072 for `text-embedding-3-large`). It is not configurable directly.

---

### Vector Search Settings

```bash
# HNSW search parameter
HNSW_EF_SEARCH=40
# Default: 40
# Higher = better recall, slower queries
```

---

### Emotion Matching Configuration

```bash
# VAC vs semantic weight for short text (< 10 words)
EMOTION_MATCHING_VAC_WEIGHT_SHORT=0.8
EMOTION_MATCHING_SEMANTIC_WEIGHT_SHORT=0.2

# VAC vs semantic weight for long text (>= 10 words)
EMOTION_MATCHING_VAC_WEIGHT_LONG=0.4
EMOTION_MATCHING_SEMANTIC_WEIGHT_LONG=0.6

# Word count threshold for short vs long
EMOTION_MATCHING_SHORT_TEXT_THRESHOLD=10

# Normalization constants
EMOTION_MATCHING_VAC_MAX_DISTANCE=3.46
EMOTION_MATCHING_SEMANTIC_MAX_DISTANCE=2.0
```

---

### Application Settings

```bash
# Application environment
APP_ENV=development
# Default: development

# API version
API_VERSION=v1

# Application name
APP_NAME=L.O.V.E. Observer API

# Default emotion collection
DEFAULT_EMOTION_COLLECTION=goemotions
```

---

### Logging

```bash
DEBUG=false
# Default: false

LOG_LEVEL=INFO
# Default: INFO
```

---

## Configuration Files

### .env.example

Complete example configuration:

```bash
# Database
POSTGRES_USER=love_user
POSTGRES_PASSWORD=love_password
POSTGRES_DB=love_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600

# External Services
VERSOR_URL=http://localhost:8001
LISTENER_URL=http://localhost:8002

# Embeddings
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Vector Search
HNSW_EF_SEARCH=40

# Security
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Admin
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=lovelove
REGISTRATION_ENABLED=true

# Application
APP_ENV=development
LOG_LEVEL=INFO
DEBUG=false
```

---

## Environment-Specific Configurations

### Development

```bash
# .env.development
APP_ENV=development
LOG_LEVEL=DEBUG
DEBUG=true
POSTGRES_HOST=localhost
POSTGRES_DB=love_db
DB_POOL_SIZE=5
```

### Production

```bash
# .env.production
APP_ENV=production
LOG_LEVEL=WARNING
DEBUG=false
POSTGRES_HOST=localhost
POSTGRES_DB=love_db
POSTGRES_PASSWORD=<strong-password>
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=20
SECRET_KEY=<strong-random-key>
ALLOWED_ORIGINS=["https://love.jrgochan.io"]
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-***
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

---

## Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  observer:
    build: .
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=love_db
      - EMBEDDING_PROVIDER=local
    depends_on:
      - postgres

  postgres:
    image: pgvector/pgvector:pg18
    environment:
      - POSTGRES_USER=love_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=love_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

---

## Kubernetes Configuration

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: observer-config
data:
  ENVIRONMENT: "production"
  LOG_LEVEL: "INFO"
  HOST: "0.0.0.0"
  PORT: "8000"
  VERSOR_URL: "http://versor-service:8001"
  EMBEDDING_PROVIDER: "local"
  EMBEDDING_MODEL: "all-MiniLM-L6-v2"
  DB_POOL_SIZE: "30"
  ENABLE_WEBSOCKET: "true"
  ENABLE_METRICS: "true"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: observer-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql+asyncpg://user:pass@host:5432/db"
  OPENAI_API_KEY: "sk-..."
  SENTRY_DSN: "https://..."
```

---

## Configuration Validation

### Startup Checks

Observer validates configuration on startup using Pydantic v2 `@model_validator`:

```python
# app/core/settings.py
class Settings(LoveBaseSettings):
    POSTGRES_USER: str = Field(default="love_user")
    POSTGRES_PASSWORD: str = Field(default="love_password")
    POSTGRES_DB: str = Field(default="love_db")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    DATABASE_URL: str | None = None

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        """Build DATABASE_URL from components if not explicitly set."""
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self

    @model_validator(mode="after")
    def validate_embedding_config(self) -> "Settings":
        """Validate embedding provider configuration."""
        if self.EMBEDDING_PROVIDER == "openai" and not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set when EMBEDDING_PROVIDER is 'openai'")
        return self

    model_config = SettingsConfigDict(
        env_file=(".env", "../../../infra/config/base.env"),
        case_sensitive=True,
        extra="ignore",
    )
```

**On invalid config:**

```text
ERROR: Configuration validation failed
  DATABASE_URL: Must start with postgresql://
  DB_POOL_SIZE: Must be between 1 and 100
```

---

## Troubleshooting Configuration

### Issue: Observer won't start

**Check configuration:**

```bash
# Print current config
python -c "from app.core.settings import settings; print(settings.model_dump())"

# Validate .env file
cat .env | grep -v '^#' | grep -v '^$'
```

### Issue: Database connection fails

**Verify DATABASE_URL:**

```bash
# Extract components
python -c "
from urllib.parse import urlparse
url = 'postgresql+asyncpg://user:pass@host:5432/db'
parsed = urlparse(url)
print(f'Host: {parsed.hostname}')
print(f'Port: {parsed.port}')
print(f'Database: {parsed.path[1:]}')
print(f'User: {parsed.username}')
"

# Test connection
psql "$(echo $DATABASE_URL | sed 's/+asyncpg//')"
```

---

## Next Steps

**Related documentation:**

- [API Reference](api-reference.md) - API endpoints
- [Error Codes](error-codes.md) - Error reference
- [Senior Dev: Performance](../architecture/06-performance-optimization.md) - Tuning guide
