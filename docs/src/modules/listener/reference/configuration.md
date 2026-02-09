# Configuration Reference

**Last Updated:** January 2, 2026
**Audience:** All developers, DevOps
**Goal:** Complete reference for all configuration options

---

## Configuration Files

### Primary: `.env` File

**Location:** `listener/.env`

**Example:**

```bash
# Copy from template
cp .env.example .env

# Edit with your settings
nano .env
```

---

## Core Settings

### Environment

```bash
# Application environment
ENVIRONMENT=development
# Options: development, staging, production
# Impact: Logging verbosity, debug mode, CORS settings

# Logging level
LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Recommendation: DEBUG (dev), INFO (prod)
```

---

## Ollama Configuration

### LLM Settings

```bash
# Ollama server URL
OLLAMA_BASE_URL=http://localhost:11434
# Production: Could be remote Ollama instance
# Example: http://ollama-service:11434 (K8s)

# Default model for semantic analysis
OLLAMA_MODEL=llama3.1:8b-instruct-q4_0
# Options:
#   - phi-3:mini (fastest, less accurate)
#   - llama3.1:8b-instruct-q4_0 (balanced - recommended)
#   - llama3.1:8b-instruct-q8_0 (slower, more accurate)
#   - llama3.1:70b (slowest, best accuracy - GPU required)

# LLM temperature (0.0 = deterministic, 1.0 = creative)
LLM_TEMPERATURE=0.0
# Recommendation: Keep at 0.0 for consistent results
# Impact: Higher temperature = more variation in outputs
```

**Model Selection Guide:**

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| phi-3:mini | 2.3GB | 0.6s | 85% | Development |
| llama3.1:8b-q4_0 | 4.7GB | 1.5s | 91% | **Production (default)** |
| llama3.1:8b-q8_0 | 8.5GB | 2.2s | 93% | High accuracy needs |
| llama3.1:70b | 40GB | 8s (CPU) / 0.8s (GPU) | 96% | Clinical/critical use |

---

## Whisper Configuration

### Transcription Settings

```bash
# Whisper model size
WHISPER_MODEL=base.en
# Options:
#   - tiny.en (39MB, fast, less accurate)
#   - base.en (74MB, balanced - recommended)
#   - small.en (244MB, more accurate)
#   - medium.en (769MB, high accuracy)
#   - large-v3 (1550MB, best accuracy)

# Device to use for inference
WHISPER_DEVICE=cpu
# Options: cpu, cuda, auto
# auto = Use GPU if available, else CPU

# Compute type/precision
WHISPER_COMPUTE_TYPE=int8
# Options: int8, int16, float16, float32
# int8 = Fastest, lowest memory
# float32 = Slowest, highest accuracy
```

**Model Selection Guide:**

| Model | Size | WER | Speed (10s audio) | Use Case |
|-------|------|-----|-------------------|----------|
| tiny.en | 39MB | ~8% | 200ms | Mobile/edge |
| **base.en** | 74MB | ~5% | 500ms | **Default** |
| small.en | 244MB | ~4% | 1.5s | High accuracy |
| large-v3 | 1550MB | ~3% | 5s (CPU) | Clinical/critical |

---

## Redis Configuration

### Queue Settings

```bash
# Redis host
REDIS_HOST=localhost
# Production: redis-service

# Redis port
REDIS_PORT=6379
# Standard Redis port

# Redis database number
REDIS_DB=0
# Use different DB for different environments
# Example: DB 0 (prod), DB 1 (staging), DB 2 (dev)

# Redis password (optional)
REDIS_PASSWORD=
# Leave empty for local development
# Set in production for security
```

---

## Observer Integration

### Observer Settings

```bash
# Observer API URL
OBSERVER_URL=http://localhost:8000
# Production: http://observer-service:8000

# Observer timeout (seconds)
OBSERVER_TIMEOUT=30.0
# How long to wait for Observer responses
# Recommendation: 30s (Observer calls can be slow)

# Fail gracefully if Observer is down
OBSERVER_REQUIRED=false
# true = Fail if Observer unavailable
# false = Continue without Observer (recommended)
```

---

## Performance Tuning

### Resource Limits

```bash
# Max concurrent LLM requests
MAX_CONCURRENT_LLM=5
# Prevent Ollama overload
# Recommendation: 5-10 depending on hardware

# Request timeout (seconds)
REQUEST_TIMEOUT=30
# How long before request times out
# Recommendation: 30s (allow for slow LLM inference)

# Worker concurrency
ARQ_MAX_JOBS=10
# Max concurrent background jobs
# Recommendation: 10-20 depending on resources
```

---

## Feature Flags

### Experimental Features

```bash
# Enable batch processing endpoint
ENABLE_BATCH_PROCESSING=true

# Enable multi-emotion analysis
ENABLE_MULTI_EMOTION=true

# Enable clinical mode
ENABLE_CLINICAL_MODE=false
# Set to true only for clinical deployments

# Enable prosody analysis
ENABLE_PROSODY=true

# Enable PII scrubbing
ENABLE_PII_SCRUBBING=true
# Recommendation: Always true in production
```

---

## Security Settings

### Privacy & Security

```bash
# PII scrubbing entities to remove
PII_ENTITIES=PERSON,ORG,GPE,DATE,PHONE,EMAIL,SSN
# Comma-separated list of entity types

# CORS allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
# Production: Specific domains only
# Development: Can use * (wildcard)

# Enable HTTPS only
REQUIRE_HTTPS=false
# Set to true in production
```

---

## Environment-Specific Configurations

### Development

```bash
# listener/.env.development
ENVIRONMENT=development
LOG_LEVEL=DEBUG
OLLAMA_BASE_URL=http://localhost:11434
REDIS_HOST=localhost
OBSERVER_URL=http://localhost:8000
CORS_ORIGINS=*
REQUIRE_HTTPS=false
```

### Staging

```bash
# listener/.env.staging
ENVIRONMENT=staging
LOG_LEVEL=INFO
OLLAMA_BASE_URL=http://ollama:11434
REDIS_HOST=redis
OBSERVER_URL=http://observer:8000
CORS_ORIGINS=https://staging.love-platform.dev
REQUIRE_HTTPS=true
```

### Production

```bash
# listener/.env.production
ENVIRONMENT=production
LOG_LEVEL=WARNING
OLLAMA_BASE_URL=http://ollama-service.production.svc.cluster.local:11434
REDIS_HOST=redis-service.production.svc.cluster.local
OBSERVER_URL=http://observer-service.production.svc.cluster.local:8000
CORS_ORIGINS=https://love-platform.dev,https://app.love-platform.dev
REQUIRE_HTTPS=true
ENABLE_CLINICAL_MODE=true
```

---

## Configuration Validation

### Startup Checks

```python
# app/config.py
class Settings(BaseSettings):
    """Validates configuration on startup"""

    @validator('OLLAMA_MODEL')
    def validate_model(cls, v):
        """Ensure model name is valid"""
        valid_models = [
            "phi-3:mini",
            "llama3.1:8b-instruct-q4_0",
            "llama3.1:70b"
        ]
        if v not in valid_models:
            logger.warning(f"Unusual model: {v}")
        return v

    @validator('LLM_TEMPERATURE')
    def validate_temperature(cls, v):
        """Ensure temperature is in valid range"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Temperature must be 0.0-1.0")
        if v != 0.0:
            logger.warning("Non-zero temperature may cause inconsistent results")
        return v
```

---

## Configuration Best Practices

### ✅ DO

1. **Use environment variables** for all config
2. **Never commit .env** to git (.gitignore includes it)
3. **Use .env.example** as template
4. **Validate on startup**
5. **Document all settings** (this file!)

### ❌ DON'T

1. **Don't hardcode** config in code
2. **Don't commit secrets** (.env files)
3. **Don't use same config** for all environments
4. **Don't skip validation**

---

## Troubleshooting Config Issues

### Issue: "Config not loading"

**Check:**

```bash
# Is .env in correct location?
ls listener/.env

# Is it readable?
cat listener/.env

# Are you in correct directory?
pwd  # Should be .../listener
```

---

### Issue: "Ollama connection refused"

**Check:**

```bash
# What's in config?
grep OLLAMA_BASE_URL .env

# Can you reach it?
curl $OLLAMA_BASE_URL/api/tags

# Try default
curl http://localhost:11434/api/tags
```

---

## Configuration Checklist

Before deploying, verify:

- [ ] `.env` file exists
- [ ] All required variables set
- [ ] Ollama URL correct and reachable
- [ ] Redis URL correct and reachable
- [ ] Observer URL correct (or OBSERVER_REQUIRED=false)
- [ ] Log level appropriate for environment
- [ ] CORS origins restrictive (production)
- [ ] HTTPS required (production)
- [ ] Secrets not committed to git

---

## Key Takeaways

✅ **All config in .env** - Easy to modify
✅ **Environment-specific** - Dev, staging, prod
✅ **Validated on startup** - Catch errors early
✅ **Well-documented** - This reference!
✅ **Security-minded** - Secrets management

---

**Next:** [Error Codes Reference →](error-codes.md)
