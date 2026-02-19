# Configuration Reference - Versor Module

Complete reference for all configuration options, environment variables, and settings.

---

## Environment Variables

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HOST` | string | `"0.0.0.0"` | Server bind address |
| `PORT` | integer | `8001` | Server port |
| `API_TITLE` | string | `"L.O.V.E. Versor Engine"` | API title in docs |
| `API_DESCRIPTION` | string | `"Pure mathematical engine..."` | API description |
| `API_VERSION` | string | `"v1"` | API version string |

**Example (.env):**

```bash
HOST=0.0.0.0
PORT=8001
```

### Threshold Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FLOODING_THRESHOLD` | float | `2.0` | Elasticity threshold for flooding (rad/s) |
| `EPSILON` | float | `1e-6` | Numerical tolerance for zero checks |
| `SMOOTHING_ALPHA` | float | `0.1` | Exponential smoothing filter alpha (0=heavy, 1=none) |

**Example:**

```bash
FLOODING_THRESHOLD=2.5  # More permissive
EPSILON=1e-7            # Stricter zero detection
```

### SLERP Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEFAULT_SLERP_STEPS` | integer | `60` | Default frame count for SLERP |
| `MIN_SLERP_STEPS` | integer | `10` | Minimum allowed frames |
| `MAX_SLERP_STEPS` | integer | `120` | Maximum allowed frames |

**Example:**

```bash
DEFAULT_SLERP_STEPS=120  # Smoother animations
MAX_SLERP_STEPS=240      # Allow ultra-smooth
```

### CORS Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGINS` | list[string] | `["http://localhost:3000", "http://localhost:19006", "http://localhost:8000"]` | Allowed origins for CORS |

### Security Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SECRET_KEY` | string | `"dev-secret-key-change-in-production"` | JWT secret (alias: `JWT_SECRET_KEY`) |
| `ALGORITHM` | string | `"HS256"` | JWT signing algorithm |

### Operational Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MAX_REQUEST_SIZE` | integer | `1048576` | Max request body size in bytes (1MB) |
| `LOG_LEVEL` | string | `"INFO"` | Logging level |
| `DEBUG` | boolean | `false` | Debug mode flag |

**Example:**

```bash
CORS_ORIGINS='["http://localhost:8000","http://localhost:3000","https://app.love.com"]'
```

---

## Configuration File

### Using .env File

Create `.env` in `versor/` directory:

```bash
# Server
HOST=0.0.0.0
PORT=8001

# Thresholds
FLOODING_THRESHOLD=2.0
EPSILON=0.000001

# SLERP
DEFAULT_SLERP_STEPS=60
MIN_SLERP_STEPS=10
MAX_SLERP_STEPS=120

# CORS
CORS_ORIGINS='["http://localhost:3000","http://localhost:19006","http://localhost:8000"]'

# Security
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256

# Logging
LOG_LEVEL=WARNING
```

### Settings Class

**File:** `app/config.py`

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    from settings import LoveBaseSettings
except ImportError:
    LoveBaseSettings = BaseSettings

class Settings(LoveBaseSettings):
    """Application settings loaded from environment variables."""

    # Mathematical constants
    EPSILON: float = 1e-6
    FLOODING_THRESHOLD: float = 2.0
    SMOOTHING_ALPHA: float = 0.1
    DEFAULT_SLERP_STEPS: int = 60
    MIN_SLERP_STEPS: int = 10
    MAX_SLERP_STEPS: int = 120

    # API
    API_VERSION: str = "v1"
    API_TITLE: str = "L.O.V.E. Versor Engine"
    API_DESCRIPTION: str = "Pure mathematical engine for quaternion-based emotional state processing"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:19006",
        "http://localhost:8000",
    ]

    # Performance
    MAX_REQUEST_SIZE: int = 1024 * 1024  # 1MB
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = Field(
        validation_alias="JWT_SECRET_KEY",
        default="dev-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=(".env", "../../infra/config/base.env"),
        case_sensitive=True,
        extra="ignore",
    )

# Singleton
settings = Settings()
```

---

## Docker Configuration

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Non-root user
RUN useradd -m versor
USER versor

# Expose port
EXPOSE 8001

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=8001
ENV FLOODING_THRESHOLD=2.0

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  versor:
    build: .
    ports:
      - "8001:8001"
    environment:
      - HOST=0.0.0.0
      - PORT=8001
      - FLOODING_THRESHOLD=2.0
      - DEFAULT_SLERP_STEPS=60
      - CORS_ORIGINS=["http://localhost:8000"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Kubernetes Configuration

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: versor-config
data:
  HOST: "0.0.0.0"
  PORT: "8001"
  FLOODING_THRESHOLD: "2.0"
  DEFAULT_SLERP_STEPS: "60"
  CORS_ORIGINS: '["https://api.love.com"]'
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: versor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: versor
  template:
    metadata:
      labels:
        app: versor
    spec:
      containers:
      - name: versor
        image: versor:1.0.0
        ports:
        - containerPort: 8001
        envFrom:
        - configMapRef:
            name: versor-config
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 3
          periodSeconds: 5
```

---

## Performance Tuning

### Uvicorn Configuration

```bash
# Development
uvicorn app.main:app --reload --port 8001

# Production
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 1 \
  --log-level warning \
  --access-log \
  --no-use-colors
```

**Parameters:**

- `--workers 1`: Single process (scale with containers instead)
- `--log-level warning`: Minimal logging
- `--access-log`: Enable access logs (optional)
- `--no-use-colors`: Better for log aggregation

---

## Logging Configuration

### Log Levels

```python
# Development
LOG_LEVEL=DEBUG  # Verbose

# Staging
LOG_LEVEL=INFO   # Moderate

# Production
LOG_LEVEL=WARNING  # Minimal
```

### Log Format

```python
import logging

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
```

---

## Feature Flags

### Future Feature Toggles

```bash
# Not currently implemented, but prepared for:
ENABLE_BATCH_ENDPOINT=false
ENABLE_WEBSOCKET=false
ENABLE_PROMETHEUS_METRICS=false
ENABLE_REQUEST_ID_TRACKING=false
```

---

## Monitoring Configuration

### Prometheus (if enabled)

```bash
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

### Sentry (error tracking)

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=1.0
```

---

## Security Configuration

### CORS

**Development (permissive):**

```bash
CORS_ORIGINS='["*"]'  # Allow all (dev only!)
```

**Production (restrictive):**

```bash
CORS_ORIGINS='["https://love.jrgochan.io"]'
```

### HTTPS

**Handled by load balancer/ingress:**

- Versor serves HTTP internally
- Load balancer terminates SSL
- No SSL configuration in Versor

---

## Validation

### Settings Validation

```python
from app.config import settings

# Verify settings are valid
assert 0.0 < settings.FLOODING_THRESHOLD < 10.0
assert 10 <= settings.MIN_SLERP_STEPS <= 120
assert settings.MIN_SLERP_STEPS <= settings.DEFAULT_SLERP_STEPS <= settings.MAX_SLERP_STEPS
```

### Configuration Testing

```bash
# Test with different configs
FLOODING_THRESHOLD=1.5 pytest tests/ -v
```

---

## Best Practices

### 1. Use Environment Variables

**✅ Good:**

```bash
export FLOODING_THRESHOLD=2.5
uvicorn app.main:app
```

**❌ Bad:**

```python
# Hardcoded in code
FLOODING_THRESHOLD = 2.5
```

### 2. Provide Defaults

**✅ Good:**

```python
FLOODING_THRESHOLD: float = 2.0  # Sensible default
```

**❌ Bad:**

```python
FLOODING_THRESHOLD: float  # No default, crashes if not set
```

### 3. Validate at Startup

```python
class Settings(BaseSettings):
    FLOODING_THRESHOLD: float = Field(..., gt=0.0, lt=10.0)
```

---

## Next Steps

- **[Error Codes](error-codes.md)** - Complete error reference
- **[Glossary](glossary.md)** - Terminology guide

---

**Previous:** [← API Reference](api-reference.md)
**Next:** [Error Codes →](error-codes.md)
