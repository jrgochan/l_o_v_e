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
# Database connection URL
DATABASE_URL=postgresql+asyncpg://observer_user:observer_pass@localhost:5432/observer_dev
# Format: postgresql+asyncpg://user:password@host:port/database
# Required: Yes

# Connection pool settings
DB_POOL_SIZE=20
# Number of persistent connections
# Default: 20
# Recommended: 20-30 for production

DB_MAX_OVERFLOW=10
# Additional connections under load
# Default: 10
# Recommended: 10-20

DB_POOL_TIMEOUT=30
# Seconds to wait for connection
# Default: 30

DB_POOL_RECYCLE=3600
# Recycle connections after N seconds
# Default: 3600 (1 hour)

# Query timeout
DB_STATEMENT_TIMEOUT=60000
# Milliseconds
# Default: 60000 (60 seconds)
```

---

### Versor Integration

```bash
# Versor service URL
VERSOR_URL=http://localhost:8001
# Default: http://localhost:8001
# Set to empty to use local quaternion computation

# Use HTTP for Versor calls (vs local computation)
USE_VERSOR_HTTP=true
# Default: true
# Set to false to always use local computation
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

OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
# Default: text-embedding-ada-002
# Alternatives: text-embedding-3-small, text-embedding-3-large

# Embedding dimension
EMBEDDING_DIMENSION=384
# Default: 384 (matches all-MiniLM-L6-v2)
# Must match chosen model
```

---

### Vector Search Settings

```bash
# HNSW index parameters
HNSW_M=16
# Number of connections per node
# Default: 16
# Range: 4-64
# Higher = better recall, more memory

HNSW_EF_CONSTRUCTION=64
# Exploration factor during index build
# Default: 64
# Range: 10-500
# Higher = better quality, slower build

HNSW_EF_SEARCH=40
# Exploration factor during query
# Default: 40
# Range: 10-500
# Higher = better recall, slower queries
```

---

### Pathfinding Configuration

```bash
# A* algorithm settings
ASTAR_MAX_ITERATIONS=1000
# Prevent infinite loops
# Default: 1000

ASTAR_MAX_STEP_DISTANCE=1.5
# Max VAC distance per transition
# Default: 1.5
# Range: 0.5-2.0

ASTAR_MAX_AROUSAL_CHANGE=0.6
# Max arousal change per step
# Default: 0.6
# Range: 0.3-1.0

# Path caching
ENABLE_PATH_CACHE=true
# Cache computed paths in database
# Default: true

PATH_CACHE_TTL=2592000
# Cache duration in seconds
# Default: 2592000 (30 days)
```

---

### WebSocket Settings

```bash
# Enable WebSocket endpoints
ENABLE_WEBSOCKET=true
# Default: true

# Max connections per session
MAX_WEBSOCKET_CONNECTIONS_PER_SESSION=5
# Default: 5

# Max total connections
MAX_WEBSOCKET_CONNECTIONS_TOTAL=1000
# Default: 1000

# Heartbeat interval (seconds)
WEBSOCKET_HEARTBEAT_INTERVAL=30
# Default: 30

# Message timeout (seconds)
WEBSOCKET_MESSAGE_TIMEOUT=300
# Default: 300 (5 minutes)
```

---

### Chat Configuration

```bash
# Enable chat features
ENABLE_CHAT=true
# Default: true

# Default tone
DEFAULT_TONE=warm
# Options: warm, clinical
# Default: warm

# Deep Feeling Mode enabled by default
DEFAULT_DEEP_FEELING=false
# Default: false
```

---

### Performance Tuning

```bash
# Atlas cache TTL (seconds)
ATLAS_CACHE_TTL=3600
# Default: 3600 (1 hour)

# Embedding cache size
EMBEDDING_CACHE_SIZE=10000
# Number of cached embeddings
# Default: 10000

# Embedding cache TTL (seconds)
EMBEDDING_CACHE_TTL=3600
# Default: 3600

# Enable query result caching
ENABLE_QUERY_CACHE=true
# Default: true

# Query cache TTL (seconds)
QUERY_CACHE_TTL=300
# Default: 300 (5 minutes)
```

---

### Feature Flags

```bash
# Enable clinical alerts
ENABLE_CLINICAL_ALERTS=true
# Default: true

# Enable session analytics
ENABLE_SESSION_ANALYTICS=true
# Default: true

# Enable multi-emotion analysis
ENABLE_MULTI_EMOTION=true
# Default: true

# Enable path matrix pre-computation
ENABLE_PATH_MATRIX=true
# Default: true

# Enable AI model management
ENABLE_AI_SETTINGS=true
# Default: true
```

---

### Monitoring & Observability

```bash
# Enable Prometheus metrics
ENABLE_METRICS=true
# Default: true

# Metrics port
METRICS_PORT=9090
# Default: 9090

# Enable structured logging
STRUCTURED_LOGGING=true
# Default: true
# Uses structlog for JSON logs

# Sentry DSN (error tracking)
SENTRY_DSN=https://...
# Optional: Set to enable Sentry integration
```

---

## Configuration Files

### .env.example

Complete example configuration:

```bash
# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://observer_user:observer_pass@localhost:5432/observer_dev
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# Versor Integration
VERSOR_URL=http://localhost:8001
USE_VERSOR_HTTP=true

# Embeddings
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Vector Search
HNSW_M=16
HNSW_EF_CONSTRUCTION=64
HNSW_EF_SEARCH=40

# Pathfinding
ASTAR_MAX_ITERATIONS=1000
ASTAR_MAX_STEP_DISTANCE=1.5
ASTAR_MAX_AROUSAL_CHANGE=0.6
ENABLE_PATH_CACHE=true

# WebSocket
ENABLE_WEBSOCKET=true
MAX_WEBSOCKET_CONNECTIONS_PER_SESSION=5
WEBSOCKET_HEARTBEAT_INTERVAL=30

# Chat
ENABLE_CHAT=true
DEFAULT_TONE=warm
DEFAULT_DEEP_FEELING=false

# Features
ENABLE_CLINICAL_ALERTS=true
ENABLE_SESSION_ANALYTICS=true
ENABLE_MULTI_EMOTION=true

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
STRUCTURED_LOGGING=true
```

---

## Environment-Specific Configurations

### Development

```bash
# .env.development
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql+asyncpg://observer_user:observer_pass@localhost:5432/observer_dev
DB_POOL_SIZE=5
ENABLE_METRICS=false
```

### Staging

```bash
# .env.staging
ENVIRONMENT=staging
LOG_LEVEL=INFO
DATABASE_URL=postgresql+asyncpg://observer_user:***@staging-db:5432/observer_staging
DB_POOL_SIZE=15
ENABLE_METRICS=true
SENTRY_DSN=https://***
```

### Production

```bash
# .env.production
ENVIRONMENT=production
LOG_LEVEL=WARNING
DATABASE_URL=postgresql+asyncpg://observer_user:***@prod-db:5432/observer_prod
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=20
ENABLE_METRICS=true
SENTRY_DSN=https://***
STRUCTURED_LOGGING=true

# OpenAI for better embeddings
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-***
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSION=3072
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
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql+asyncpg://observer:${DB_PASSWORD}@postgres:5432/observer
      - EMBEDDING_PROVIDER=local
      - ENABLE_WEBSOCKET=true
    depends_on:
      - postgres
  
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=observer
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=observer
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

Observer validates configuration on startup:

```python
# app/config.py
class Settings(BaseSettings):
    # Validate DATABASE_URL format
    @validator('DATABASE_URL')
    def validate_database_url(cls, v):
        if not v.startswith('postgresql'):
            raise ValueError('DATABASE_URL must start with postgresql://')
        return v
    
    # Validate pool size
    @validator('DB_POOL_SIZE')
    def validate_pool_size(cls, v):
        if v < 1 or v > 100:
            raise ValueError('DB_POOL_SIZE must be between 1 and 100')
        return v
    
    # Validate HNSW parameters
    @validator('HNSW_M')
    def validate_hnsw_m(cls, v):
        if v < 4 or v > 64:
            raise ValueError('HNSW_M must be between 4 and 64')
        return v
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
python -c "from app.config import settings; print(settings.dict())"

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
