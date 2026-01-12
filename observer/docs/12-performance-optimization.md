# Observer Module - Performance Optimization

## Overview

The Observer must handle:
- High-volume writes (emotional state logging)
- Low-latency vector searches (insight generation)
- Complex metrics calculations (elasticity/rigidity)

This document provides concrete optimization strategies for production-grade performance.

## Performance Targets

| Operation | Target Latency | Target Throughput |
|-----------|---------------|-------------------|
| Record State | < 100ms | 1000 req/s |
| Vector Search (Insight) | < 50ms | 500 req/s |
| Get History | < 200ms | 200 req/s |
| Database Write | < 20ms | N/A |

## PostgreSQL Optimization

### 1. Memory Configuration

For a server with 16GB RAM:

```conf
# postgresql.conf

# Shared Memory
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB             # 75% of RAM

# Per-Query Memory
work_mem = 256MB                        # For sorting/hashing
maintenance_work_mem = 2GB              # For VACUUM, CREATE INDEX

# Background Writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
```

**Rationale**:
- `shared_buffers`: Vector indexes benefit from being memory-resident
- `maintenance_work_mem`: Critical for fast HNSW index building

### 2. HNSW Index Tuning

```sql
-- Build index with optimal parameters
CREATE INDEX idx_trajectory_embedding_hnsw 
ON user_trajectory 
USING hnsw (input_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Runtime: Adjust search quality dynamically
SET hnsw.ef_search = 40;  -- Balanced
-- SET hnsw.ef_search = 20;  -- Fast (lower recall)
-- SET hnsw.ef_search = 100; -- Accurate (slower)
```

**Performance vs. Recall Trade-off**:

| ef_search | Query Time | Recall | Use Case |
|-----------|-----------|--------|----------|
| 20 | ~5ms | ~85% | Real-time, low stakes |
| 40 | ~10ms | ~95% | **Recommended** |
| 100 | ~25ms | ~99% | High accuracy needed |

### 3. Partitioning Strategy

As `user_trajectory` grows, partition by time:

```sql
-- Create partitioned table
CREATE TABLE user_trajectory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    -- ... other columns
) PARTITION BY RANGE (timestamp);

-- Monthly partitions
CREATE TABLE user_trajectory_2025_01 
PARTITION OF user_trajectory
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_trajectory_2025_02 
PARTITION OF user_trajectory
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Indexes on each partition
CREATE INDEX idx_2025_01_embedding 
ON user_trajectory_2025_01 
USING hnsw (input_embedding vector_cosine_ops);
```

**Benefits**:
- Faster queries (smaller partitions)
- Easier archival (detach/drop old partitions)
- Better index performance

### 4. Query Optimization

#### Use EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT * FROM user_trajectory
WHERE user_id = :user_id
ORDER BY input_embedding <=> :query_embedding
LIMIT 10;
```

Look for:
- ✅ `Index Scan using idx_trajectory_embedding_hnsw`
- ❌ `Seq Scan` (bad - means index not used)

#### Optimize Common Queries

```sql
-- Create covering index for history queries
CREATE INDEX idx_history_covering 
ON user_trajectory(user_id, timestamp DESC)
INCLUDE (vac_values, quaternion_state);

-- Now this query is index-only (no heap access)
SELECT vac_values, quaternion_state
FROM user_trajectory
WHERE user_id = :user_id
ORDER BY timestamp DESC
LIMIT 100;
```

### 5. Maintenance Tasks

```sql
-- Regular VACUUM to prevent bloat
VACUUM ANALYZE user_trajectory;

-- Reindex if needed (rare)
REINDEX INDEX CONCURRENTLY idx_trajectory_embedding_hnsw;

-- Update statistics
ANALYZE user_trajectory;
```

## Application-Level Optimization

### 1. Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,              # Max concurrent connections
    max_overflow=10,           # Extra connections if pool full
    pool_pre_ping=True,        # Health check before use
    pool_recycle=3600,         # Recycle after 1 hour
    echo_pool=True             # Log pool events (debug only)
)
```

### 2. Batch Operations

For bulk inserts:

```python
async def bulk_insert_states(session: AsyncSession, states: List[UserTrajectory]):
    """Batch insert for performance"""
    session.add_all(states)
    await session.commit()
```

### 3. Caching

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
def cached_embedding(text: str) -> List[float]:
    """Cache embeddings to avoid regenerating"""
    return embedding_service.generate_embedding(text)

# Or use Redis
import aioredis

async def get_cached_embedding(text: str) -> Optional[List[float]]:
    """Use Redis for distributed caching"""
    key = f"embedding:{hashlib.sha256(text.encode()).hexdigest()}"
    
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    
    embedding = await embedding_service.generate_embedding(text)
    await redis.setex(key, 3600, json.dumps(embedding))  # Cache 1 hour
    
    return embedding
```

### 4. Async Optimization

```python
# ❌ BAD: Sequential
emotion = await find_emotion(...)
embedding = await generate_embedding(...)
previous = await get_previous_state(...)

# ✅ GOOD: Concurrent
emotion, embedding, previous = await asyncio.gather(
    find_emotion(...),
    generate_embedding(...),
    get_previous_state(...)
)
```

## Monitoring Performance

### Query Performance

```sql
-- Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

-- View slow queries
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 50  -- Over 50ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Application Profiling

```python
import cProfile
import pstats

# Profile a function
profiler = cProfile.Profile()
profiler.enable()

await observer_service.process_state(...)

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

## Database Sizing Guidelines

### For 1 Million User States

```
Table: user_trajectory
- Rows: 1,000,000
- Row size: ~2KB (with 1536-dim embedding)
- Total: ~2GB

HNSW Index:
- Memory: ~1.5GB (m=16)
- Build time: ~10 minutes

Recommended Instance:
- RAM: 16GB minimum
- CPU: 4 cores
- Storage: 100GB SSD (gp3)
```

### For 100 Million User States

```
Table: user_trajectory (partitioned)
- Rows: 100,000,000
- Total: ~200GB

HNSW Indexes (across partitions):
- Memory: ~150GB
- Recommended: Read replicas for queries

Recommended Instance:
- RAM: 256GB
- CPU: 16 cores
- Storage: 2TB SSD
```

## Optimization Checklist

Before production launch:

- [ ] `shared_buffers` set to 25% of RAM
- [ ] HNSW indexes created with m=16, ef_construction=64
- [ ] `hnsw.ef_search` set to 40 for production
- [ ] Connection pooling configured (20-50 connections)
- [ ] Partitioning strategy implemented
- [ ] VACUUM scheduled (daily)
- [ ] Slow query monitoring enabled
- [ ] Read replicas configured for insight queries
- [ ] Embedding caching implemented
- [ ] Batch operations used where possible
- [ ] Query performance < target latency

## Next Steps

Now that you understand optimization:
- **13-security-and-privacy.md** - Final doc on security hardening
