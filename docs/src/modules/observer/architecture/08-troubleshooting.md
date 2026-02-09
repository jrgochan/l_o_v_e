# Troubleshooting Guide

**Reading Time:** ~40 minutes
**Audience:** Senior developers, DevOps
**Prerequisites:** All previous senior guides
**Goal:** Diagnose and resolve common Observer issues

---

## Overview

This guide covers troubleshooting strategies for:

- Database connection issues
- Vector search problems
- A* pathfinding failures
- Migration conflicts
- Performance degradation
- WebSocket connection issues

---

## Database Issues

### Issue 1: Connection Pool Exhausted

**Symptoms:**

```text
sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 10 reached
```

**Diagnosis:**

```python
# Check active connections
from app.database import engine

async def check_pool_status():
    pool = engine.pool
    print(f"Size: {pool.size()}")
    print(f"Checked out: {pool.checkedout()}")
    print(f"Overflow: {pool.overflow()}")
    print(f"Checked in: {pool.checkedin()}")
```

**Solutions:**

1. **Increase pool size:**

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=30,  # Increase from 20
    max_overflow=20  # Increase from 10
)
```

1. **Find connection leaks:**

```python
# Check for unclosed sessions
SELECT
    pid,
    application_name,
    state,
    state_change,
    query
FROM pg_stat_activity
WHERE application_name = 'observer'
  AND state = 'idle in transaction';

# Kill stuck connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'observer'
  AND state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

1. **Ensure proper session cleanup:**

```python
# ✅ GOOD: Always use context manager
async def query_db():
    async with AsyncSessionLocal() as session:
        result = await session.execute(query)
        return result
    # Session automatically closed

# ❌ BAD: Manual session management
async def query_db():
    session = AsyncSessionLocal()
    result = await session.execute(query)
    # Forgot to close! Memory leak!
    return result
```

### Issue 2: pgvector Extension Not Found

**Symptoms:**

```text
psycopg2.errors.UndefinedObject: type "vector" does not exist
```

**Diagnosis:**

```sql
-- Check if extension is installed
\dx

-- Check PostgreSQL version
SELECT version();
```

**Solutions:**

1. **Install pgvector:**

```bash
# macOS
brew install pgvector

# Linux (from source)
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql
```

1. **Enable in database:**

```sql
\c observer_dev
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
\dx
```

1. **Check extension version:**

```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

### Issue 3: Slow Queries

**Symptoms:** API responses > 500ms

**Diagnosis:**

```sql
-- Enable query logging
ALTER DATABASE observer_dev SET log_min_duration_statement = 100;

-- Check slow queries
SELECT
    substring(query, 1, 100) as query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- EXPLAIN a specific query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM user_trajectory
WHERE user_id = 'user123'
ORDER BY timestamp DESC
LIMIT 100;
```

**Common Causes & Fixes:**

1. **Missing index:**

```sql
-- Check query plan
EXPLAIN SELECT * FROM user_trajectory WHERE user_id = 'user123';

-- If you see "Seq Scan" on large table:
CREATE INDEX idx_trajectory_user ON user_trajectory(user_id);
```

1. **Outdated statistics:**

```sql
-- Update table statistics
ANALYZE user_trajectory;

-- Check last analysis
SELECT
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'user_trajectory';
```

1. **Index bloat:**

```sql
-- Check index size
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename = 'user_trajectory';

-- Rebuild if bloated
REINDEX INDEX CONCURRENTLY idx_trajectory_embedding;
```

---

## Vector Search Issues

### Issue 4: Poor Recall

**Symptoms:** Similarity search returns unexpected results

**Diagnosis:**

```python
async def test_recall():
    """Compare HNSW vs exact search"""
    query_vector = [0.1, 0.2, ...]

    # Exact search (no index)
    exact = await db.execute(text("""
        SET enable_indexscan = off;
        SELECT name, embedding <=> :query as distance
        FROM atlas_definitions
        ORDER BY distance
        LIMIT 10
    """), {"query": query_vector})
    exact_names = [row.name for row in exact]

    # HNSW search
    hnsw = await db.execute(text("""
        SET enable_seqscan = off;
        SELECT name, embedding <=> :query as distance
        FROM atlas_definitions
        ORDER BY distance
        LIMIT 10
    """), {"query": query_vector})
    hnsw_names = [row.name for row in hnsw]

    # Compare
    overlap = len(set(exact_names) & set(hnsw_names))
    recall = overlap / 10
    print(f"Recall: {recall:.1%}")

    if recall < 0.9:
        print("WARNING: Low recall!")
        print(f"Exact: {exact_names}")
        print(f"HNSW:  {hnsw_names}")
```

**Solutions:**

1. **Increase ef_search:**

```sql
-- Default (fast, ~95% recall)
SET hnsw.ef_search = 40;

-- Higher accuracy (~99% recall)
SET hnsw.ef_search = 200;
```

1. **Rebuild index with higher quality:**

```sql
DROP INDEX IF EXISTS idx_trajectory_embedding;
CREATE INDEX idx_trajectory_embedding ON user_trajectory
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);  -- Higher quality
```

1. **Check vector normalization:**

```python
# Vectors should be normalized
def check_normalization(embedding: List[float]):
    norm = np.linalg.norm(embedding)
    if not (0.99 <= norm <= 1.01):
        logger.warning(f"Vector not normalized: {norm}")
```

### Issue 5: Vector Search Timeout

**Symptoms:** Queries hang or timeout

**Diagnosis:**

```sql
-- Check if index is being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_trajectory
ORDER BY embedding <=> query_vector
LIMIT 10;

-- Look for "Seq Scan" (bad) vs "Index Scan using hnsw" (good)
```

**Solutions:**

1. **Force index use:**

```sql
SET enable_seqscan = off;
```

1. **Check index exists:**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_trajectory'
  AND indexdef LIKE '%hnsw%';
```

1. **Rebuild corrupted index:**

```sql
REINDEX INDEX idx_trajectory_embedding;
```

---

## Migration Issues

### Issue 6: Migration Conflict

**Symptoms:**

```text
alembic.util.exc.CommandError: Target database is not up to date
```

**Diagnosis:**

```bash
# Check current version
alembic current

# Check migration history
alembic history

# Compare with code
alembic heads
```

**Solutions:**

1. **Upgrade to latest:**

```bash
alembic upgrade head
```

1. **Resolve conflicts:**

```bash
# If you have a branch
alembic merge heads

# Edit generated merge migration
# Then upgrade
alembic upgrade head
```

1. **Nuclear option (development only!):**

```bash
# Drop all tables
psql observer_dev
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION vector;
\q

# Re-run migrations
alembic upgrade head
python scripts/seed_atlas.py
```

### Issue 7: Data Migration Failure

**Symptoms:** Migration runs but data is corrupted

**Diagnosis:**

```sql
-- Check data integrity
SELECT
    count(*) as total,
    count(*) FILTER (WHERE vac IS NULL) as null_vac,
    count(*) FILTER (WHERE embedding IS NULL) as null_embedding
FROM atlas_definitions;
```

**Solutions:**

1. **Add data validation to migration:**

```python
def upgrade():
    # Migrate data
    conn = op.get_bind()
    result = conn.execute("SELECT id, old_field FROM my_table")

    for row in result:
        # Validate before update
        if not validate_data(row.old_field):
            logger.error(f"Invalid data for row {row.id}")
            continue

        new_value = transform(row.old_field)
        conn.execute(
            "UPDATE my_table SET new_field = :val WHERE id = :id",
            {"val": new_value, "id": row.id}
        )
```

1. **Rollback and fix:**

```bash
# Rollback
alembic downgrade -1

# Fix migration script
# nano migrations/versions/xxxxx_migration.py

# Re-apply
alembic upgrade head
```

---

## A* Pathfinding Issues

### Issue 8: No Path Found

**Symptoms:**

```python
PathNotFoundException: No valid path from Despair to Joy
```

**Diagnosis:**

```python
async def diagnose_path_failure(from_emotion: str, to_emotion: str):
    """Debug why A* failed"""
    planner = PathPlanner(db)

    # Get emotions
    start = await planner._get_emotion(from_emotion)
    goal = await planner._get_emotion(to_emotion)

    # Check VAC distance
    distance = np.linalg.norm(np.array(start.vac) - np.array(goal.vac))
    print(f"VAC distance: {distance:.2f}")

    # Check category transition
    valid = planner._is_category_transition_valid(
        start.category, goal.category
    )
    print(f"Category transition valid: {valid}")

    # Check neighbors
    neighbors = await planner._get_valid_neighbors(start, goal)
    print(f"Valid neighbors from start: {len(neighbors)}")
    print(f"Neighbors: {[n.name for n in neighbors[:5]]}")
```

**Solutions:**

1. **Add bridge emotions:**

```python
# Check if transition needs a bridge
if not planner._is_category_transition_valid(start.category, goal.category):
    # Use fallback with bridge
    path = await planner._fallback_path(start, goal)
```

1. **Relax constraints (temporarily for testing):**

```python
class PathPlanner:
    MAX_STEP_DISTANCE = 2.0  # Increase from 1.5
    MAX_AROUSAL_CHANGE = 0.8  # Increase from 0.6
```

1. **Update category graph:**

```json
// data/category_rankings.json
{
  "When We're Hurting": {
    "allowed_transitions": [
      "When Life Is Good"  // Add if missing
    ]
  }
}
```

### Issue 9: Path Takes Too Long

**Symptoms:** A* search > 5 seconds

**Diagnosis:**

```python
import time

async def profile_pathfinding():
    start_time = time.time()

    path = await planner.find_transition_path("Anger", "Calm", "user123")

    elapsed = time.time() - start_time
    print(f"Pathfinding took {elapsed:.2f}s")

    if elapsed > 1.0:
        print("WARNING: Slow pathfinding!")
```

**Solutions:**

1. **Use path matrix cache:**

```python
# Pre-compute common paths
await path_matrix_service.compute_all_paths_batch()

# Check cache first
cached_path = await path_matrix_service.get_path(from_id, to_id)
if cached_path:
    return cached_path
```

1. **Limit search space:**

```python
class PathPlanner:
    MAX_ITERATIONS = 1000  # Prevent infinite loops

    async def _astar_search(self, start, goal):
        iterations = 0
        while open_set and iterations < self.MAX_ITERATIONS:
            iterations += 1
            # ... A* logic

        if iterations >= self.MAX_ITERATIONS:
            logger.warning("A* hit iteration limit")
            return None
```

---

## Performance Issues

### Issue 10: High Memory Usage

**Symptoms:** OOM errors, container restarts

**Diagnosis:**

```python
import psutil
import tracemalloc

# Start tracking
tracemalloc.start()

# Run operation
result = await expensive_operation()

# Check memory
current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1024 / 1024:.1f}MB")
print(f"Peak: {peak / 1024 / 1024:.1f}MB")

# Stop tracking
tracemalloc.stop()

# System memory
process = psutil.Process()
print(f"RSS: {process.memory_info().rss / 1024 / 1024:.1f}MB")
```

**Solutions:**

1. **Use pagination:**

```python
# Instead of loading all at once
trajectories = await get_all_trajectories(user_id)  # Could be 10k+ rows

# Load in batches
async for batch in get_trajectories_batched(user_id, batch_size=100):
    process_batch(batch)
```

1. **Clear caches periodically:**

```python
# Implement cache eviction
atlas_cache.clear()
embedding_cache.clear()
path_cache.clear()
```

1. **Limit concurrent operations:**

```python
# Use semaphore
semaphore = asyncio.Semaphore(10)  # Max 10 concurrent

async def limited_operation():
    async with semaphore:
        await expensive_operation()
```

### Issue 11: API Latency Spike

**Symptoms:** P95 latency > 1 second

**Diagnosis:**

```python
# Add timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start

    if elapsed > 0.5:
        logger.warning(f"Slow request: {request.url.path} took {elapsed:.2f}s")

    response.headers["X-Process-Time"] = str(elapsed)
    return response
```

**Solutions:**

1. **Profile slow endpoints:**

```python
from fastapi import Request
import cProfile

@router.get("/slow-endpoint")
async def slow_endpoint(request: Request):
    profiler = cProfile.Profile()
    profiler.enable()

    result = await process_request(request)

    profiler.disable()
    profiler.print_stats(sort='cumtime')

    return result
```

1. **Check database query times:**

```sql
-- Reset stats
SELECT pg_stat_statements_reset();

-- Run slow request
-- Then check
SELECT
    substring(query, 1, 100),
    calls,
    mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 5;
```

1. **Add caching:**

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def expensive_calculation(param):
    # Cached for repeated calls
    return result
```

---

## WebSocket Issues

### Issue 12: Connection Drops

**Symptoms:** WebSocket disconnects frequently

**Diagnosis:**

```python
# Add logging
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    logger.info(f"Connection attempt: {session_id}")

    try:
        await manager.connect(websocket, session_id)
        logger.info(f"Connected: {session_id}")

        async for message in websocket.iter_json():
            logger.debug(f"Message received: {message['type']}")
            # Process

    except WebSocketDisconnect as e:
        logger.warning(f"Disconnect: {session_id}, code: {e.code}, reason: {e.reason}")

    except Exception as e:
        logger.error(f"WebSocket error: {session_id}, {e}", exc_info=True)
```

**Solutions:**

1. **Add heartbeat:**

```python
async def heartbeat(session_id: str):
    while session_id in manager.active_connections:
        await manager.broadcast_to_session(
            session_id,
            {"type": "ping"}
        )
        await asyncio.sleep(30)

# Start on connection
heartbeat_task = asyncio.create_task(heartbeat(session_id))
```

1. **Handle network issues:**

```python
async def robust_send(websocket: WebSocket, message: dict):
    try:
        await asyncio.wait_for(
            websocket.send_json(message),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        logger.error("Send timeout")
        raise WebSocketDisconnect
```

1. **Check reverse proxy settings:**

```nginx
# nginx.conf
location /ws/ {
    proxy_pass http://observer:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;  # 24 hours
    proxy_send_timeout 86400;
}
```

---

## Debugging Techniques

### 1. Enable Verbose Logging

```python
# app/config.py
import logging

# Development
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Log SQL queries
engine = create_async_engine(
    DATABASE_URL,
    echo=True  # Logs all SQL
)
```

### 2. Use pdb for Debugging

```python
import pdb

async def debug_function():
    result = await some_operation()

    # Drop into debugger
    pdb.set_trace()

    # Inspect variables
    # Continue with 'c'
    # Step with 's'
    # Next with 'n'
```

### 3. Structured Logging

```python
import structlog

logger = structlog.get_logger()

async def process_state(user_id: str, vac: List[float]):
    logger.info(
        "processing_state",
        user_id=user_id,
        vac=vac,
        operation="find_nearest"
    )

    try:
        result = await find_nearest(vac)
        logger.info(
            "state_processed",
            user_id=user_id,
            emotion=result.name,
            distance=result.distance
        )
    except Exception as e:
        logger.error(
            "processing_failed",
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        raise
```

---

## Common Error Messages

### Error: "SQLSTATE[42P01]: Undefined table"

**Cause:** Migrations not run

**Fix:**

```bash
alembic upgrade head
python scripts/seed_atlas.py
```

### Error: "Foreign key violation"

**Cause:** Referencing non-existent emotion_id

**Fix:**

```python
# Verify emotion exists before inserting
emotion = await db.execute(
    select(AtlasDefinition).where(AtlasDefinition.name == emotion_name)
)
if not emotion.scalar_one_or_none():
    raise EmotionNotFoundError(f"Emotion '{emotion_name}' not in atlas")
```

### Error: "Vector dimension mismatch"

**Cause:** Embedding has wrong dimensions

**Fix:**

```python
def validate_embedding(embedding: List[float]):
    if len(embedding) != 384:
        raise ValueError(
            f"Expected 384 dimensions, got {len(embedding)}"
        )

# Always validate before storing
validate_embedding(embedding)
```

### Error: "asyncpg.exceptions.DeadlockDetectedError"

**Cause:** Two transactions waiting for each other

**Fix:**

```python
# Use consistent lock ordering
# Always acquire locks in same order (e.g., by UUID)

# Add retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def update_with_retry():
    async with db.begin():
        # Transaction logic
        pass
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

```python
from prometheus_client import Counter, Histogram, Gauge

# Error rates
error_count = Counter(
    'observer_errors_total',
    'Total errors',
    ['error_type', 'endpoint']
)

# Latency
request_duration = Histogram(
    'observer_request_duration_seconds',
    'Request duration',
    ['endpoint']
)

# Active resources
active_db_connections = Gauge(
    'observer_db_connections',
    'Active database connections'
)

# Update metrics
error_count.labels(error_type='db_error', endpoint='/state').inc()
request_duration.labels(endpoint='/state').observe(0.152)
active_db_connections.set(engine.pool.checkedout())
```

### Alert Rules

```yaml
# Prometheus alerts
groups:
  - name: observer
    rules:
      - alert: HighErrorRate
        expr: rate(observer_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate in Observer"

      - alert: SlowQueries
        expr: histogram_quantile(0.95, observer_request_duration_seconds) > 1.0
        for: 5m
        annotations:
          summary: "P95 latency > 1s"

      - alert: DatabaseConnectionsHigh
        expr: observer_db_connections > 25
        for: 2m
        annotations:
          summary: "Database connection pool near limit"
```

---

## Quick Diagnostic Commands

```bash
# Check Observer is running
curl http://localhost:8000/health

# Check database connection
psql observer_dev -U observer_user -c "SELECT COUNT(*) FROM atlas_definitions"

# Check pgvector
psql observer_dev -U observer_user -c "\dx"

# Check migrations
alembic current

# Run tests
pytest -v

# Check logs
tail -f /var/log/observer/app.log

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log

# Check connections
psql -c "SELECT count(*), state FROM pg_stat_activity WHERE datname='observer_dev' GROUP BY state"
```

---

## Next Steps

**For deep understanding:**

- [Architecture Decisions](09-architecture-decisions.md) - Why things are designed this way
- [Performance Optimization](06-performance-optimization.md) - Prevent issues

**For operations:**

- [Manager: Monitoring & Operations](../operations/01-monitoring.md)
