# Observer Module - Deployment

## Overview

This document provides production deployment strategies for the Observer module, including containerization, database configuration, scaling, and monitoring.

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│          Load Balancer (ALB/NGINX)              │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┴────────┐
    ↓                 ↓
┌─────────┐      ┌─────────┐
│Observer │      │Observer │  (Multiple instances)
│Instance1│      │Instance2│
└────┬────┘      └────┬────┘
     │                │
     └────────┬───────┘
              ↓
    ┌──────────────────┐
    │   PostgreSQL     │
    │   (Master)       │
    └────────┬─────────┘
             │
    ┌────────┴────────┐
    ↓                 ↓
┌─────────┐      ┌─────────┐
│Replica 1│      │Replica 2│  (Read replicas)
└─────────┘      └─────────┘
```

## Containerization

### Dockerfile

```dockerfile
# Multi-stage build for smaller image

# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Make sure scripts are executable
RUN chmod +x scripts/*.py

# Set Python path
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      # Performance tuning
      POSTGRES_SHARED_BUFFERS: 4GB
      POSTGRES_WORK_MEM: 256MB
      POSTGRES_MAINTENANCE_WORK_MEM: 2GB
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - love_network
    restart: unless-stopped

  observer:
    build:
      context: .
      dockerfile: Dockerfile
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      LOG_LEVEL: INFO
    depends_on:
      - postgres
    networks:
      - love_network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G

networks:
  love_network:
    driver: bridge

volumes:
  postgres_data:
```

## Cloud Deployment

### AWS Deployment

#### RDS PostgreSQL Setup

```bash
# Create RDS instance with pgvector
aws rds create-db-instance \
  --db-instance-identifier love-observer-db \
  --db-instance-class db.r6g.xlarge \
  --engine postgres \
  --engine-version 16.2 \
  --master-username love_admin \
  --master-user-password SecurePassword123 \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --multi-az

# Enable pgvector (via custom parameter group)
aws rds create-db-parameter-group \
  --db-parameter-group-name love-pgvector-params \
  --db-parameter-group-family postgres16 \
  --description "pgvector enabled"

# Modify to enable shared_preload_libraries
aws rds modify-db-parameter-group \
  --db-parameter-group-name love-pgvector-params \
  --parameters "ParameterName=shared_preload_libraries,ParameterValue=vector,ApplyMethod=pending-reboot"
```

#### ECS Deployment

```yaml
# task-definition.json
{
  "family": "observer-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "observer",
      "image": "your-ecr-repo/observer:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://user:pass@rds-endpoint:5432/love_db"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/observer",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "observer"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

```bash
# Cloud SQL PostgreSQL with pgvector
gcloud sql instances create love-observer-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=us-central1

# Deploy to Cloud Run
gcloud run deploy observer \
  --image gcr.io/your-project/observer:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql+asyncpg://..." \
  --set-secrets="OPENAI_API_KEY=openai-key:latest"
```

## PostgreSQL Configuration for Production

### postgresql.conf Tuning

```conf
# Memory Settings (for 16GB RAM server)
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 256MB
maintenance_work_mem = 2GB

# Vector Index Performance
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# Connection Pooling
max_connections = 200
shared_preload_libraries = 'pg_stat_statements,vector'

# WAL Settings (for write performance)
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Connection Pooling with PgBouncer

```ini
# pgbouncer.ini
[databases]
love_db = host=localhost port=5432 dbname=love_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

## Scaling Strategies

### Horizontal Scaling (Application)

Deploy multiple Observer instances behind a load balancer:

```bash
# AWS Application Load Balancer
aws elbv2 create-load-balancer \
  --name observer-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name observer-targets \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxx \
  --health-check-path /health
```

### Vertical Scaling (Database)

Monitor and scale PostgreSQL instance:

```sql
-- Monitor query performance
SELECT
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Monitor index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Read Replicas

For scaling read-heavy insight queries:

```python
# Configure separate engines
from app.config import settings

write_engine = create_async_engine(settings.DATABASE_URL_MASTER)
read_engine = create_async_engine(settings.DATABASE_URL_REPLICA)

# Use in routes
@router.post("/insight")
async def get_insight(
    session: AsyncSession = Depends(get_read_db)  # Use replica
):
    pass

@router.post("/state")
async def record_state(
    session: AsyncSession = Depends(get_write_db)  # Use master
):
    pass
```

## Monitoring

### Application Metrics

```python
from prometheus_client import Counter, Histogram, generate_latest

# Metrics
state_records_total = Counter('observer_state_records_total', 'Total states recorded')
insight_queries_total = Counter('observer_insight_queries_total', 'Total insight queries')
processing_duration = Histogram('observer_processing_seconds', 'State processing duration')

# Use in code
state_records_total.inc()

with processing_duration.time():
    await observer_service.process_state(...)

# Expose metrics
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Over 100ms
ORDER BY mean_exec_time DESC;

-- Table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup Strategy

### Automated Backups

```bash
# Daily pg_dump
0 2 * * * /usr/bin/pg_dump -U love_user love_db | gzip > /backups/love_db_$(date +\%Y\%m\%d).sql.gz

# Keep last 30 days
find /backups -name "love_db_*.sql.gz" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving in postgresql.conf
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

## Next Steps

Now that you understand deployment:
- **11-testing-strategy.md** - Comprehensive testing approach
- **12-performance-optimization.md** - Database tuning strategies
- **13-security-and-privacy.md** - Security hardening
