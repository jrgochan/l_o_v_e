# Monitoring & Operations

**Reading Time:** ~25 minutes
**Audience:** Engineering managers, DevOps, SRE
**Prerequisites:** [Architecture Overview](../architecture/00-high-level-overview.md)
**Goal:** Understand how to monitor and operate Observer in production

---

## Overview

Effective monitoring ensures Observer remains:

- **Available** (99.9% uptime target)
- **Performant** (< 100ms P95 latency)
- **Reliable** (< 0.1% error rate)
- **Scalable** (handle growth)

---

## Key Performance Indicators (KPIs)

### Application Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **API Latency (P95)** | < 100ms | > 200ms | > 500ms |
| **Vector Search** | < 50ms | > 100ms | > 200ms |
| **Error Rate** | < 0.1% | > 0.5% | > 1.0% |
| **Throughput** | 100+ req/s | < 50 req/s | < 25 req/s |
| **WebSocket Connections** | < 500 | > 800 | > 1000 |

### Database Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Connection Pool** | < 15/20 | > 18/20 | 20/20 (exhausted) |
| **Query Time** | < 50ms | > 100ms | > 500ms |
| **Cache Hit Ratio** | > 99% | < 95% | < 90% |
| **Disk Usage** | < 80% | > 85% | > 95% |
| **Replication Lag** | < 1s | > 5s | > 30s |

---

## Monitoring Stack

### Prometheus Metrics

**Application metrics:**

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
http_requests_total = Counter(
    'observer_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'observer_http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

# Database metrics
db_connections_active = Gauge(
    'observer_db_connections_active',
    'Active database connections'
)

db_query_duration = Histogram(
    'observer_db_query_duration_seconds',
    'Database query duration',
    ['operation']
)

# Vector search metrics
vector_search_duration = Histogram(
    'observer_vector_search_duration_seconds',
    'Vector search duration'
)

vector_search_recall = Gauge(
    'observer_vector_search_recall',
    'Vector search recall rate'
)

# WebSocket metrics
websocket_connections = Gauge(
    'observer_websocket_connections_active',
    'Active WebSocket connections'
)

# Business metrics
emotions_stored_total = Counter(
    'observer_emotions_stored_total',
    'Total emotions stored'
)

paths_computed_total = Counter(
    'observer_paths_computed_total',
    'Total transition paths computed'
)
```

### Grafana Dashboards

#### Dashboard 1: Application Health

- Request rate (req/s)
- Latency (P50, P95, P99)
- Error rate (%)
- Active connections

#### Dashboard 2: Database Health

- Connection pool usage
- Query performance
- Cache hit ratio
- Table sizes

#### Dashboard 3: Business Metrics

- Emotions stored per hour
- Most common emotions
- Average elasticity/rigidity
- Path computation rate

---

## Health Checks

### Application Health

```python
@router.get("/health")
async def health_check():
    """
    Health check for load balancer.

    Returns 200 if healthy, 503 if not.
    """
    health = {"status": "healthy", "checks": {}}

    # Database connectivity
    try:
        await db.execute(text("SELECT 1"))
        health["checks"]["database"] = "ok"
    except Exception as e:
        health["checks"]["database"] = "failed"
        health["status"] = "unhealthy"

    # Atlas loaded
    try:
        count = await get_atlas_count()
        health["checks"]["atlas"] = {"count": count, "status": "ok"}
        if count != 87:
            health["checks"]["atlas"]["status"] = "warning"
    except Exception:
        health["checks"]["atlas"] = "failed"
        health["status"] = "unhealthy"

    # Return appropriate status code
    status_code = 200 if health["status"] == "healthy" else 503
    return JSONResponse(content=health, status_code=status_code)

@router.get("/readiness")
async def readiness_check():
    """
    Readiness check - can accept traffic?

    Stricter than health check.
    """
    # All critical components must be ready
    if not await is_database_ready():
        return JSONResponse({"ready": False, "reason": "database"}, 503)

    if not await is_atlas_loaded():
        return JSONResponse({"ready": False, "reason": "atlas"}, 503)

    if not await is_migration_current():
        return JSONResponse({"ready": False, "reason": "migrations"}, 503)

    return {"ready": True}
```

### Database Health

```sql
-- Connection health
SELECT
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_txn,
    max(now() - state_change) as oldest_idle
FROM pg_stat_activity
WHERE datname = 'observer_prod';

-- Replication lag (if using streaming replication)
SELECT
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag
FROM pg_stat_replication;

-- Lock monitoring
SELECT
    count(*) as lock_count,
    mode
FROM pg_locks
WHERE granted = false
GROUP BY mode;
```

---

## Alerting Rules

### Critical Alerts (Page On-Call)

#### 1. Observer Down

```yaml
- alert: ObserverDown
  expr: up{job="observer"} == 0
  for: 1m
  annotations:
    summary: "Observer instance is down"
    description: "{{ $labels.instance }} has been down for 1 minute"
```

#### 2. Database Unavailable

```yaml
- alert: ObserverDatabaseDown
  expr: observer_db_connections_active == 0
  for: 2m
  annotations:
    summary: "Observer cannot connect to database"
```

#### 3. High Error Rate

```yaml
- alert: ObserverHighErrorRate
  expr: rate(observer_http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  annotations:
    summary: "Observer error rate > 1%"
```

### Warning Alerts (Notify Team)

#### 4. High Latency

```yaml
- alert: ObserverHighLatency
  expr: histogram_quantile(0.95, observer_http_request_duration_seconds) > 0.5
  for: 10m
  annotations:
    summary: "Observer P95 latency > 500ms"
```

#### 5. Connection Pool Near Limit

```yaml
- alert: ObserverConnectionPoolHigh
  expr: observer_db_connections_active > 18
  for: 5m
  annotations:
    summary: "Database connection pool > 90% (18/20)"
```

#### 6. Disk Space Low

```yaml
- alert: ObserverDiskSpaceLow
  expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
  for: 10m
  annotations:
    summary: "Database disk < 15% free"
```

---

## Logging Strategy

### Log Levels

```python
# Production
LOG_LEVEL=INFO

# Staging
LOG_LEVEL=DEBUG

# Development
LOG_LEVEL=DEBUG
```

### Structured Logging

```python
import structlog

logger = structlog.get_logger()

# INFO: Normal operations
logger.info("state_stored",
    user_id=user_id,
    emotion=emotion_name,
    elapsed_ms=elapsed
)

# WARNING: Degraded but functional
logger.warning("versor_unavailable",
    fallback="local_computation",
    vac=vac
)

# ERROR: Operation failed
logger.error("database_error",
    operation="insert_trajectory",
    error=str(e),
    exc_info=True
)
```

### Log Retention

- **Application logs:** 30 days
- **Database logs:** 7 days (high volume)
- **Access logs:** 90 days (compliance)
- **Audit logs:** 1 year (security)

---

## Backup & Recovery

### Backup Schedule

```bash
# Daily full backup (3 AM)
0 3 * * * pg_dump -Fc observer_prod > /backup/daily/observer_$(date +\%Y\%m\%d).dump

# Continuous WAL archiving
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

### Recovery Procedures

#### Scenario 1: Restore to latest

```bash
# Stop Observer
systemctl stop observer

# Restore database
pg_restore -d observer_prod -c /backup/daily/observer_20260102.dump

# Restart Observer
systemctl start observer
```

#### Scenario 2: Point-in-time recovery

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore base backup
rm -rf /var/lib/postgresql/16/main/*
tar -xzf /backup/base/base.tar.gz -C /var/lib/postgresql/16/main/

# Configure recovery
cat > /var/lib/postgresql/16/main/recovery.conf <<EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-01-02 14:30:00'
EOF

# Start PostgreSQL (will replay WAL)
systemctl start postgresql

# Verify data
psql observer_prod -c "SELECT MAX(timestamp) FROM user_trajectory"
```

### Backup Testing

**Monthly:** Restore backup to staging, verify data integrity

```bash
# Automated backup test
#!/bin/bash
pg_restore -d observer_staging -c /backup/daily/observer_latest.dump
if [ $? -eq 0 ]; then
    # Verify critical data
    psql observer_staging -c "SELECT COUNT(*) FROM atlas_definitions" | grep 87
    if [ $? -eq 0 ]; then
        echo "✅ Backup valid"
    else
        echo "❌ Backup corrupted - atlas incomplete"
        exit 1
    fi
else
    echo "❌ Backup restore failed"
    exit 1
fi
```

---

## Performance Baselines

### Response Time Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| `GET /atlas/emotions` | 10ms | 20ms | 30ms |
| `POST /atlas/similar` | 30ms | 60ms | 100ms |
| `POST /state` | 50ms | 100ms | 150ms |
| `POST /transitions/path` | 100ms | 200ms | 400ms |
| `GET /history/{user}` | 40ms | 80ms | 120ms |

### Capacity Planning

**Current capacity (single instance):**

- Throughput: 200 req/s sustained
- Concurrent WebSockets: 500
- Database: 10k trajectory points/hour

**Growth projections:**

| Users | Req/s | Instances | Database Size | Cost/Month |
|-------|-------|-----------|---------------|------------|
| 1,000 | 50 | 1 | 10GB | $200 |
| 10,000 | 500 | 3 | 100GB | $800 |
| 100,000 | 5,000 | 30 | 1TB | $5,000 |

---

## Operational Runbooks

### Daily Operations

**Morning checklist:**

- [ ] Check overnight alerts
- [ ] Review error logs
- [ ] Verify backup completed
- [ ] Check disk space
- [ ] Review performance metrics

**Weekly tasks:**

- [ ] Analyze slow queries
- [ ] Review database index usage
- [ ] Check for unused indexes
- [ ] Update dependency versions (if needed)
- [ ] Review and close old alerts

### Common Tasks

**Restart Observer:**

```bash
# Graceful restart (wait for connections to drain)
systemctl reload observer

# Hard restart
systemctl restart observer
```

**Clear caches:**

```python
# Connect to Observer
curl -X POST http://observer:8000/admin/clear-cache

# Or via database
TRUNCATE TABLE path_matrix_cache;
```

**Rebuild vector index:**

```sql
-- During low traffic hours
REINDEX INDEX CONCURRENTLY idx_trajectory_embedding;
ANALYZE user_trajectory;
```

---

## Incident Response

### Severity Levels

**P0 (Critical):**

- Complete outage (all instances down)
- Data loss
- Security breach

**Response time:** Immediate
**Escalation:** Page on-call engineer

**P1 (High):**

- Degraded performance (P95 > 500ms)
- Elevated error rate (> 1%)
- Single instance down (with redundancy)

**Response time:** 15 minutes
**Escalation:** Notify team channel

**P2 (Medium):**

- High latency (P95 > 200ms)
- Connection pool warnings
- Disk space warnings

**Response time:** 1 hour
**Escalation:** During business hours

---

## Disaster Scenarios

### Database Corruption

**Symptoms:** Query errors, data inconsistencies

**Response:**

1. Take database offline immediately
2. Run `pg_dump` to backup current state (even if corrupted)
3. Restore from latest clean backup
4. Replay WAL logs
5. Verify data integrity
6. Bring Observer back online

**Prevention:**

- Regular backup testing
- Checksums enabled (`data_checksums = on`)
- RAID for disk redundancy

### Vector Index Corruption

**Symptoms:** Slow vector searches, query errors

**Response:**

```sql
-- Drop corrupted index
DROP INDEX idx_trajectory_embedding;

-- Rebuild (may take 30+ minutes on large tables)
CREATE INDEX CONCURRENTLY idx_trajectory_embedding
ON user_trajectory
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Verify
SELECT COUNT(*) FROM user_trajectory;
EXPLAIN SELECT * FROM user_trajectory
ORDER BY embedding <=> '[0.1, ...]'::vector
LIMIT 10;
```

---

## Scaling Operations

### Horizontal Scaling

**Add new instance:**

```bash
# 1. Deploy new container
docker run -d \
  --name observer-3 \
  -e DATABASE_URL=postgresql://... \
  observer:latest

# 2. Wait for health check
while ! curl -f http://observer-3:8000/health; do
  sleep 1
done

# 3. Add to load balancer
# (done automatically in Kubernetes/ECS)
```

**Remove instance:**

```bash
# 1. Drain connections (remove from load balancer)
# 2. Wait for active requests to complete (30s)
# 3. Stop container
docker stop observer-3
```

### Vertical Scaling

**Database:**

```sql
-- Tune for more memory
ALTER SYSTEM SET shared_buffers = '4GB';  -- Was 2GB
ALTER SYSTEM SET effective_cache_size = '12GB';  -- Was 6GB
ALTER SYSTEM SET work_mem = '32MB';  -- Was 16MB

-- Reload
SELECT pg_reload_conf();
```

---

## Next Steps

**Operational guides:**

- [Team Structure](02-team-structure.md)
- [Incident Response](03-incident-response.md)

**Technical details:**

- [Senior Dev: Performance Optimization](../architecture/06-performance-optimization.md)
- [Senior Dev: Troubleshooting](../architecture/08-troubleshooting.md)
