# Incident Response

**Reading Time:** ~20 minutes
**Audience:** Engineering managers, on-call engineers
**Prerequisites:** [Monitoring & Operations](01-monitoring.md)
**Goal:** Respond effectively to Observer incidents

---

## Overview

This guide provides **runbooks** for common Observer incidents, organized by severity and type.

**Incident severity:**

- **P0 (Critical):** Complete outage, data loss
- **P1 (High):** Degraded performance, elevated errors
- **P2 (Medium):** Warnings, minor issues

---

## P0: Complete Outage

### Scenario: All Observer Instances Down

**Symptoms:**

- `/health` endpoint returns 503 or times out
- Listener cannot store states (500 errors)
- Experience cannot load trajectories

**Immediate actions:**

1. **Page on-call engineer** (if not already notified)
2. **Check instance status:**

   ```bash
   # Kubernetes
   kubectl get pods -l app=observer

   # Docker
   docker ps -a | grep observer

   # Systemd
   systemctl status observer
   ```

3. **Check logs:**

   ```bash
   # Recent errors
   kubectl logs observer-pod --tail=100

   # Or
   journalctl -u observer -n 100
   ```

4. **Restart instances:**

   ```bash
   # Kubernetes
   kubectl rollout restart deployment/observer

   # Docker
   docker-compose restart observer

   # Systemd
   systemctl restart observer
   ```

5. **Verify recovery:**

   ```bash
   curl http://observer:8000/health
   ```

**Root cause analysis:**

- Check deployment logs (bad config?)
- Check database (connection issue?)
- Check resource limits (OOM?)
- Review recent changes (bad deploy?)

---

## P0: Database Unavailable

### Scenario: PostgreSQL Down

**Symptoms:**

- Observer health check fails
- All database operations error
- "connection refused" errors

**Immediate actions:**

1. **Check PostgreSQL status:**

   ```bash
   systemctl status postgresql
   pg_isready -h localhost -p 5432
   ```

2. **Check PostgreSQL logs:**

   ```bash
   tail -100 /var/log/postgresql/postgresql-16-main.log
   ```

3. **If crashed, restart:**

   ```bash
   systemctl start postgresql

   # Verify
   psql -c "SELECT version()"
   ```

4. **If corrupted, restore from backup:**

   ```bash
   # See disaster recovery section
   # Estimated time: 10-30 minutes
   ```

**Communication:**

```text
Status: OUTAGE - Observer database down
Impact: Users cannot save emotional states
ETA: 15 minutes (restart) or 30 minutes (restore)
Workaround: Listener caching locally
```

---

## P1: High Error Rate

### Scenario: 5xx Error Rate > 1%

**Symptoms:**

- Prometheus alert "ObserverHighErrorRate"
- Errors in logs
- Some requests failing

**Investigation:**

1. **Check error distribution:**

   ```python
   # Group errors by endpoint
   SELECT
       endpoint,
       error_type,
       COUNT(*) as count
   FROM error_logs
   WHERE timestamp > NOW() - INTERVAL '5 minutes'
   GROUP BY endpoint, error_type
   ORDER BY count DESC;
   ```

2. **Check specific errors:**

   ```bash
   # Last 100 errors
   grep "ERROR" /var/log/observer/app.log | tail -100
   ```

3. **Common causes:**

**Database connection pool exhausted:**

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE application_name = 'observer';

-- If at limit (20), increase pool or kill stuck connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

**Versor unavailable:**

```bash
# Check Versor health
curl http://versor:8001/health

# If down, Observer should auto-fallback to local computation
# Verify fallback is working
grep "versor_unavailable" /var/log/observer/app.log
```

**Bad data from Listener:**

```python
# Check validation errors
grep "ValidationError" /var/log/observer/app.log

# If frequent, coordinate with Listener team
```

---

## P1: High Latency

### Scenario: P95 Latency > 500ms

**Symptoms:**

- Users complain of slowness
- Prometheus alert "ObserverHighLatency"

**Investigation:**

1. **Identify slow endpoints:**

   ```python
   # Check Prometheus
   topk(5, histogram_quantile(0.95,
     observer_http_request_duration_seconds{bucket}
   ))
   ```

2. **Check database queries:**

   ```sql
   SELECT
       query,
       calls,
       mean_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%user_trajectory%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Common causes:**

**Missing index:**

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM user_trajectory
WHERE user_id = 'problem-user'
ORDER BY timestamp DESC;

-- If "Seq Scan", create index
CREATE INDEX CONCURRENTLY idx_problem
ON user_trajectory(user_id, timestamp DESC);
```

**Vector search slow:**

```sql
-- Check HNSW index exists
\di+ *embedding*

-- If missing, create
CREATE INDEX CONCURRENTLY idx_trajectory_embedding
ON user_trajectory
USING hnsw (embedding vector_cosine_ops);
```

**Cache full/cold:**

```sql
-- Check cache hit ratio
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))
  as cache_hit_ratio
FROM pg_statio_user_tables;

-- If < 90%, increase shared_buffers
```

---

## P2: Connection Pool Warning

### Scenario: Pool Utilization > 90%

**Symptoms:**

- Alert "ObserverConnectionPoolHigh"
- Occasional timeout errors

**Actions:**

1. **Check connection usage:**

   ```python
   from app.database import engine
   pool = engine.pool
   print(f"Checked out: {pool.checkedout()}/{pool.size()}")
   ```

2. **Find connection leaks:**

   ```sql
   -- Long-running queries
   SELECT
       pid,
       now() - query_start as duration,
       state,
       query
   FROM pg_stat_activity
   WHERE state != 'idle'
     AND query_start < NOW() - INTERVAL '30 seconds'
   ORDER BY duration DESC;
   ```

3. **Solutions:**

**Short-term:** Kill stuck connections

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**Long-term:** Increase pool size

```python
# app/database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=30,  # Increase from 20
    max_overflow=20  # Increase from 10
)
```

---

## Communication Templates

### Status Update (Ongoing Incident)

```text
Incident: Observer High Latency
Status: INVESTIGATING
Started: 2026-01-02 21:15 MT
Impact: API responses 2-3x slower than normal
          Users experiencing delays in visualization
Affected: ~15% of requests
Updates: Every 15 minutes or when status changes

Current theory: Vector search index needs rebuild
Next step: Rebuilding index (ETA 20 minutes)
```

### Resolution Notice

```text
Incident: Observer High Latency
Status: RESOLVED
Started: 2026-01-02 21:15 MT
Resolved: 2026-01-02 21:45 MT
Duration: 30 minutes

Root cause: HNSW index became fragmented after bulk import
Resolution: Rebuilt index with REINDEX CONCURRENTLY
Prevention: Added monitoring for index bloat
           Scheduled weekly index maintenance

Post-mortem: https://link-to-document
```

---

## Escalation Paths

### L1: First Responder (On-Call Engineer)

**Responsibilities:**

- Acknowledge alert within 5 minutes
- Initial investigation
- Follow runbooks
- Escalate if needed

**Authority:**

- Restart services
- Kill stuck database connections
- Rollback recent deployments

### L2: Senior Engineer / Tech Lead

**When to escalate:**

- Incident not resolved within 30 minutes
- Requires architectural decision
- Data corruption suspected
- Cross-module coordination needed

**Authority:**

- Database schema changes
- Configuration changes
- Failover decisions

### L3: Engineering Manager / Director

**When to escalate:**

- Prolonged outage (> 1 hour)
- Customer communication needed
- Resource allocation required
- External vendor coordination

---

## Post-Incident Review

### Within 48 Hours

**Required documentation:**

1. **Timeline:** Minute-by-minute incident progression
2. **Root cause:** What actually happened
3. **Impact:** Users/requests affected, revenue impact
4. **Resolution:** How it was fixed
5. **Prevention:** How to avoid recurrence

**Template:**

```markdown
# Post-Incident Review: Observer High Latency

## Incident Summary
- Date: 2026-01-02
- Duration: 30 minutes
- Severity: P1

## Timeline
21:15 - Alert triggered (P95 latency > 500ms)
21:17 - On-call acknowledged
21:20 - Identified slow vector searches
21:25 - Began index rebuild
21:45 - Index rebuilt, latency normalized

## Root Cause
HNSW index fragmented after bulk import of 100k trajectories.
Did not run ANALYZE after import.

## Impact
- 15% of requests affected (slower, not failed)
- Average latency increase: 250ms → 800ms
- No data loss

## Resolution
Rebuilt HNSW index with REINDEX CONCURRENTLY

## Prevention
1. Add ANALYZE to bulk import scripts
2. Monitor index bloat (new alert)
3. Schedule weekly REINDEX during low traffic

## Action Items
- [ ] Update bulk import script (Owner: Alice, Due: 2026-01-05)
- [ ] Add index bloat monitoring (Owner: Bob, Due: 2026-01-05)
- [ ] Document index maintenance (Owner: Carol, Due: 2026-01-10)
```

---

## Next Steps

**Team preparation:**

- [Team Structure](02-team-structure.md)
- [Monitoring & Operations](01-monitoring.md)

**Technical details:**

- [Senior Dev: Troubleshooting](../architecture/08-troubleshooting.md)
