# Observer Module - Security and Privacy

## Overview

The Observer stores highly sensitive emotional data. This document provides comprehensive security hardening strategies to protect user privacy and ensure regulatory compliance (GDPR, HIPAA considerations).

## Data Classification

### Sensitive Data in Observer

| Data Type | Sensitivity | Storage Location | Retention |
|-----------|-------------|------------------|-----------|
| Emotional state (VAC) | High | `user_trajectory.vac_values` | Indefinite |
| Transcription text | Critical | `user_trajectory.input_transcription` | 90 days |
| Semantic embeddings | Medium | `user_trajectory.input_embedding` | Indefinite |
| User metadata | High | `users` table | Until deletion |

## Database Security

### 1. Row-Level Security (RLS)

Prevent cross-user data leakage at the database level:

```sql
-- Enable RLS on user_trajectory
ALTER TABLE user_trajectory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY user_isolation ON user_trajectory
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid)
    WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- Grant access to application role
GRANT ALL ON user_trajectory TO love_app_role;
```

**Application Usage**:
```python
async def set_user_context(session: AsyncSession, user_id: UUID):
    """Set PostgreSQL session variable for RLS"""
    await session.execute(
        text(f"SET app.current_user_id = '{str(user_id)}'")
    )

# In route handler
@router.post("/state")
async def record_state(
    input_data: StateInput,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Set RLS context
    await set_user_context(session, current_user.id)
    
    # Even if input_data.user_id != current_user.id, RLS prevents access
    await observer_service.process_state(...)
```

### 2. Encryption at Rest

```bash
# AWS RDS: Enable encryption
aws rds create-db-instance \
  --db-instance-identifier love-observer-db \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:region:account:key/key-id

# Self-hosted: Use LUKS encryption
cryptsetup luksFormat /dev/sdb
cryptsetup luksOpen /dev/sdb postgres_encrypted
mkfs.ext4 /dev/mapper/postgres_encrypted
```

### 3. Encryption in Transit

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'

# Require SSL
ssl_min_protocol_version = 'TLSv1.2'
```

**Connection String**:
```python
DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/db?ssl=require"
```

### 4. Access Control

```sql
-- Create application role (least privilege)
CREATE ROLE love_app_role WITH LOGIN PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT ON atlas_definitions TO love_app_role;
GRANT SELECT, INSERT, UPDATE ON user_trajectory TO love_app_role;

-- Revoke dangerous permissions
REVOKE DELETE ON user_trajectory FROM love_app_role;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM love_app_role;
```

## Application Security

### 1. JWT Authentication

```python
# app/security/auth.py

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate JWT and extract user"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Fetch user from database
    user = await get_user_by_id(UUID(user_id))
    if user is None:
        raise credentials_exception
    
    return user
```

### 2. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/state")
@limiter.limit("100/minute")  # Max 100 states per minute per IP
async def record_state(...):
    pass

@router.post("/insight")
@limiter.limit("50/minute")   # Max 50 insight queries per minute
async def get_insight(...):
    pass
```

### 3. Input Validation

```python
from pydantic import BaseModel, Field, validator

class StateInput(BaseModel):
    user_id: UUID
    input_text: str = Field(max_length=5000)
    vac_scalars: VACVector
    
    @validator('input_text')
    def validate_no_sql_injection(cls, v):
        """Prevent SQL injection in text fields"""
        dangerous_patterns = [';--', 'DROP TABLE', 'DELETE FROM', 'UPDATE ']
        
        if any(pattern.lower() in v.lower() for pattern in dangerous_patterns):
            raise ValueError("Potentially malicious input detected")
        
        return v
    
    @validator('input_text')
    def validate_no_scripts(cls, v):
        """Prevent XSS"""
        if '<script' in v.lower() or 'javascript:' in v.lower():
            raise ValueError("Script tags not allowed")
        
        return v
```

### 4. PII Scrubbing (Secondary Check)

```python
# app/utils/pii_scrubber.py

import re

class PIIScrubber:
    """Secondary PII check (primary is in Listener)"""
    
    PATTERNS = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
    }
    
    def scrub(self, text: str) -> str:
        """Remove PII from text"""
        scrubbed = text
        
        for pii_type, pattern in self.PATTERNS.items():
            scrubbed = re.sub(pattern, f'[{pii_type.upper()}_REDACTED]', scrubbed)
        
        return scrubbed
    
    def contains_pii(self, text: str) -> bool:
        """Check if text contains PII"""
        for pattern in self.PATTERNS.values():
            if re.search(pattern, text):
                return True
        return False

# Usage in ObserverService
scrubber = PIIScrubber()

if scrubber.contains_pii(input_text):
    logger.warning("PII detected in input", extra={"user_id": str(user_id)})
    input_text = scrubber.scrub(input_text)
```

## API Security

### 1. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Not "*" in production!
    allow_credentials=True,
    allow_methods=["GET", "POST"],           # Only needed methods
    allow_headers=["Authorization", "Content-Type"],
)
```

### 2. HTTPS Enforcement

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if not settings.DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 3. Request Size Limits

```python
from fastapi import Request
from fastapi.responses import JSONResponse

MAX_REQUEST_SIZE = 1024 * 1024  # 1MB

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get('content-length')
    
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request too large"}
        )
    
    response = await call_next(request)
    return response
```

## Privacy Compliance

### GDPR: Right to be Forgotten

```python
@router.delete("/users/{user_id}/data")
async def delete_user_data(
    user_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete all user data (GDPR Article 17).
    
    Requires user confirmation and is irreversible.
    """
    
    # Verify current user owns the data
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Delete from user_trajectory
    await session.execute(
        delete(UserTrajectory).where(UserTrajectory.user_id == user_id)
    )
    
    # Delete user account
    await session.execute(
        delete(User).where(User.id == user_id)
    )
    
    await session.commit()
    
    logger.info("User data deleted", extra={"user_id": str(user_id)})
    
    return {"message": "All data permanently deleted"}
```

### Data Retention Policy

```python
# scripts/cleanup_old_data.py

async def cleanup_old_transcriptions():
    """
    Remove transcription text after 90 days (privacy).
    
    Keep VAC values and embeddings for analytics.
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=90)
    
    async with AsyncSessionLocal() as session:
        stmt = (
            update(UserTrajectory)
            .where(UserTrajectory.timestamp < cutoff_date)
            .values(input_transcription=None)
        )
        
        result = await session.execute(stmt)
        await session.commit()
        
        logger.info(f"Cleaned {result.rowcount} transcriptions")

# Schedule daily via cron
# 0 3 * * * cd /app && python scripts/cleanup_old_data.py
```

## Audit Logging

```python
class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(UUID)
    action = Column(String)  # 'record_state', 'get_insight', 'delete_data'
    ip_address = Column(String)
    user_agent = Column(String)
    success = Column(Boolean)
    metadata = Column(JSONB)

# Middleware to log all API calls
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    start_time = datetime.utcnow()
    
    try:
        response = await call_next(request)
        success = response.status_code < 400
    except Exception as e:
        success = False
        raise
    finally:
        # Log to audit table
        await log_audit(
            user_id=request.state.user.id if hasattr(request.state, 'user') else None,
            action=f"{request.method} {request.url.path}",
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
            success=success
        )
    
    return response
```

## Secrets Management

### Environment Variables

```bash
# Never commit secrets to git!
# Use .env (gitignored) for local development

# .env
POSTGRES_PASSWORD=secure_password
OPENAI_API_KEY=sk-...
SECRET_KEY=generate-with-openssl-rand-hex-32
```

### Production Secrets

Use cloud secret managers:

```python
# AWS Secrets Manager
import boto3
import json

def get_secret(secret_name: str) -> dict:
    client = boto3.client('secretsmanager', region_name='us-east-1')
    
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Load secrets at startup
secrets = get_secret('love/observer/production')
POSTGRES_PASSWORD = secrets['postgres_password']
OPENAI_API_KEY = secrets['openai_api_key']
```

## Security Headers

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# Only allow requests from trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Add security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
```

## Monitoring and Alerting

### Security Event Logging

```python
import logging

security_logger = logging.getLogger("security")

# Log security events
security_logger.warning("Failed login attempt", extra={
    "ip": request.client.host,
    "user_agent": request.headers.get('user-agent'),
    "attempted_user": attempted_user_id
})

security_logger.critical("PII detected in input", extra={
    "user_id": str(user_id),
    "pii_type": "email"
})
```

### Anomaly Detection

```python
async def detect_anomalous_activity(user_id: UUID) -> bool:
    """
    Detect suspicious activity patterns.
    
    Examples:
    - 100+ state records in 1 minute (DDoS/bot)
    - Insight queries from different IPs simultaneously
    - Unusual access patterns
    """
    
    # Check request frequency
    recent_count = await session.scalar(
        select(func.count(UserTrajectory.id))
        .where(
            UserTrajectory.user_id == user_id,
            UserTrajectory.timestamp > datetime.utcnow() - timedelta(minutes=1)
        )
    )
    
    if recent_count > 100:
        logger.warning("Anomalous activity detected", extra={
            "user_id": str(user_id),
            "count": recent_count
        })
        return True
    
    return False
```

## Compliance

### GDPR Requirements

- [x] **Right to Access**: API endpoint to export all user data
- [x] **Right to be Forgotten**: Delete endpoint (see above)
- [x] **Data Portability**: Export as JSON
- [x] **Consent Management**: Store consent in user metadata
- [x] **Data Minimization**: Only store necessary fields
- [x] **Purpose Limitation**: Clear data retention policy

### Export User Data

```python
@router.get("/users/{user_id}/export")
async def export_user_data(
    user_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export all user data in machine-readable format (GDPR Article 20).
    """
    
    if current_user.id != user_id:
        raise HTTPException(status_code=403)
    
    # Fetch all user states
    result = await session.execute(
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp)
    )
    states = result.scalars().all()
    
    # Format as JSON
    export_data = {
        "user_id": str(user_id),
        "export_date": datetime.utcnow().isoformat(),
        "total_states": len(states),
        "states": [
            {
                "timestamp": s.timestamp.isoformat(),
                "vac": s.vac_values,
                "emotion": s.dominant_emotion_id,
                "text": s.input_transcription  # If still available
            }
            for s in states
        ]
    }
    
    return export_data
```

## Security Checklist

Before production:

- [ ] Row-Level Security enabled on all user tables
- [ ] Database encryption at rest enabled
- [ ] SSL/TLS enforced for all connections
- [ ] JWT authentication implemented
- [ ] Rate limiting configured
- [ ] PII scrubbing verified (secondary check)
- [ ] Audit logging enabled
- [ ] Security headers added to responses
- [ ] Secrets stored in secure vault (not .env)
- [ ] GDPR endpoints implemented (export, delete)
- [ ] Data retention policy automated
- [ ] Anomaly detection active
- [ ] Security incident response plan documented
- [ ] Penetration testing completed
- [ ] Third-party security audit passed

## Incident Response

### Security Breach Protocol

1. **Detect**: Monitoring alerts on suspicious activity
2. **Contain**: Immediately revoke compromised tokens
3. **Investigate**: Review audit logs, identify scope
4. **Remediate**: Patch vulnerability, rotate secrets
5. **Notify**: Inform affected users within 72 hours (GDPR requirement)
6. **Document**: Post-mortem analysis

### Emergency User Data Wipe

```python
# scripts/emergency_wipe.py

async def emergency_wipe_user(user_id: UUID, reason: str):
    """
    Emergency deletion of user data.
    
    Only use in case of security breach or legal requirement.
    Logs action to audit trail.
    """
    
    logger.critical("Emergency data wipe initiated", extra={
        "user_id": str(user_id),
        "reason": reason,
        "initiated_by": "system_admin"
    })
    
    async with AsyncSessionLocal() as session:
        # Delete trajectory
        await session.execute(
            delete(UserTrajectory).where(UserTrajectory.user_id == user_id)
        )
        
        # Delete user
        await session.execute(
            delete(User).where(User.id == user_id)
        )
        
        await session.commit()
    
    logger.info("Emergency wipe completed", extra={"user_id": str(user_id)})
```

---

**Remember**: Security is not a one-time task. Regular audits, updates, and monitoring are essential for protecting user trust and sensitive emotional data.

## Next Steps

Congratulations! You've completed all Observer documentation. Now you're ready to:
1. Set up the development environment (doc 09)
2. Implement the schema and models (doc 02)
3. Build the services (docs 06-08)
4. Write comprehensive tests (doc 11)
5. Deploy to production (doc 10)
