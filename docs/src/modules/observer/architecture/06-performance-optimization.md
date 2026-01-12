# Performance Optimization

**Reading Time:** ~40 minutes  
**Audience:** Senior developers, performance engineers  
**Prerequisites:** [Database Architecture](02-database-architecture.md), [Vector Search](03-vector-search.md)  
**Goal:** Master techniques for optimizing Observer performance at scale

---

## Performance Goals

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **API Response Time (P95)** | < 100ms | < 200ms |
| **Vector Search** | < 50ms | < 100ms |
| **A* Pathfinding** | < 200ms | < 500ms |
| **Database Queries** | < 50ms | < 100ms |
| **WebSocket Latency** | < 20ms | < 50ms |
| **Concurrent Users** | 1000+ | 500+ |

---

## Database Optimization

### 1. Query Optimization

**Identify Slow Queries:**

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT 
    substring(query, 1, 100) as query_preview,
    calls,
    total_exec_time / 1000 as total_sec,
    mean_exec_time as avg_ms,
    stddev_exec_time as stddev_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Common Issues & Fixes:**

```sql
-- ❌ BAD: N+1 queries
-- Getting trajectories with emotions
SELECT * FROM user_trajectory WHERE user_id = 'user123';
-- Then for each:
SELECT * FROM atlas_definitions WHERE id = emotion_id;

-- ✅ GOOD: Single query with JOIN
SELECT 
    t.*,
    e.name as emotion_name,
    e.category as emotion_category
FROM user_trajectory t
JOIN atlas_definitions e ON t.emotion_id = e.id
WHERE t.user_id = 'user123';


-- ❌ BAD: Full table scan
SELECT * FROM user_trajectory 
WHERE EXTRACT(MONTH FROM timestamp) = 1;

-- ✅ GOOD: Index-friendly
SELECT * FROM user_trajectory
WHERE timestamp >= '2026-01-01' AND timestamp < '2026-02-01';


-- ❌ BAD: ORDER BY without index
SELECT * FROM user_trajectory
WHERE user_id = 'user123'
ORDER BY timestamp DESC;
-- Missing index on (user_id, timestamp)

-- ✅ GOOD: Composite index
CREATE INDEX idx_user_timeline ON user_trajectory(user_id, timestamp DESC);
SELECT * FROM user_trajectory
WHERE user_id = 'user123'
ORDER BY timestamp DESC;
```

### 2. Connection Pooling Tuning

```python
from sqlalchemy.ext.asyncio import create_async_engine

# Development
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10
)

# Production
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,          # Based on expected concurrent requests
    max_overflow=10,       # Burst capacity
    pool_timeout=30,       # Wait before giving up
    pool_recycle=3600,     # Recycle hourly (avoid stale connections)
    pool_pre_ping=True,    # Verify connections are alive
    
    # Connection-level timeouts
    connect_args={
        "command_timeout": 60,      # Query timeout
        "server_settings": {
            "application_name": "observer",
            "statement_timeout": "60000",  # 60 seconds
            "idle_in_transaction_session_timeout": "300000"  # 5 minutes
        }
    }
)
```

**Calculate pool_size:**

```text
pool_size = (concurrent_requests × avg_query_time) / request_duration

Example:
- 100 concurrent requests
- 50ms avg query time
- 200ms request duration

pool_size = (100 × 0.05) / 0.2 = 25
```

### 3. Index Maintenance

```sql
-- Monitor index bloat
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    idx_tup_read / NULLIF(idx_scan, 0) as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Unused indexes (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_trajectory_embedding;

-- Update statistics
ANALYZE user_trajectory;
```

---

## Application-Level Caching

### 1. Atlas Caching

**Problem:** Atlas doesn't change often but queried frequently

```python
from cachetools import TTLCache
import asyncio

class AtlasCache:
    def __init__(self, ttl: int = 3600):
        self._cache = TTLCache(maxsize=1, ttl=ttl)
        self._lock = asyncio.Lock()
    
    async def get_atlas(self, db: AsyncSession) -> List[AtlasDefinition]:
        """Get atlas with caching"""
        cache_key = "atlas_emotions"
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        async with self._lock:
            # Double-check after acquiring lock
            if cache_key in self._cache:
                return self._cache[cache_key]
            
            # Load from database
            result = await db.execute(select(AtlasDefinition))
            emotions = result.scalars().all()
            
            # Cache
            self._cache[cache_key] = emotions
            return emotions

# Global instance
atlas_cache = AtlasCache(ttl=3600)
```

### 2. Path Matrix Caching

**Problem:** A* is expensive, common paths requested frequently

```python
class PathMatrixCache:
    def __init__(self):
        self._cache: Dict[Tuple[UUID, UUID], TransitionPath] = {}
    
    async def get_path(
        self,
        db: AsyncSession,
        from_id: UUID,
        to_id: UUID
    ) -> Optional[TransitionPath]:
        """Get cached path or compute"""
        cache_key = (from_id, to_id)
        
        # Check memory cache
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Check database cache
        result = await db.execute(
            select(PathMatrixCache)
            .where(
                PathMatrixCache.from_emotion_id == from_id,
                PathMatrixCache.to_emotion_id == to_id
            )
        )
        cached = result.scalar_one_or_none()
        
        if cached:
            # Deserialize and cache in memory
            path = TransitionPath.from_dict(cached.path)
            self._cache[cache_key] = path
            return path
        
        return None
    
    async def store_path(
        self,
        db: AsyncSession,
        from_id: UUID,
        to_id: UUID,
        path: TransitionPath
    ):
        """Store computed path in cache"""
        # Store in memory
        self._cache[(from_id, to_id)] = path
        
        # Store in database
        cache_entry = PathMatrixCache(
            from_emotion_id=from_id,
            to_emotion_id=to_id,
            path=path.to_dict(),
            distance=path.total_distance,
            created_at=datetime.utcnow()
        )
        db.add(cache_entry)
        await db.commit()
```

### 3. Embedding Caching

```python
from functools import lru_cache

class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self._cache = TTLCache(maxsize=10000, ttl=3600)
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding with caching"""
        # Normalize text for cache key
        cache_key = text.strip().lower()
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Generate (expensive operation)
        embedding = await asyncio.to_thread(
            self.model.encode,
            text,
            normalize_embeddings=True
        )
        
        # Cache
        self._cache[cache_key] = embedding.tolist()
        return embedding.tolist()
```

---

## Batch Processing

### 1. Batch Embedding Generation

```python
async def generate_embeddings_batch(
    texts: List[str],
    batch_size: int = 32
) -> List[List[float]]:
    """
    Generate embeddings in batches for efficiency.
    
    ~5x faster than one-at-a-time
    """
    embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        # Generate batch (runs in thread pool)
        batch_embeddings = await asyncio.to_thread(
            model.encode,
            batch,
            batch_size=batch_size,
            show_progress_bar=False
        )
        
        embeddings.extend(batch_embeddings.tolist())
    
    return embeddings
```

### 2. Bulk Database Operations

```python
async def bulk_insert_trajectories(
    db: AsyncSession,
    trajectories: List[Dict]
):
    """Bulk insert for performance"""
    # ❌ BAD: One at a time
    for traj in trajectories:
        db.add(UserTrajectory(**traj))
        await db.commit()  # N commits!
    
    # ✅ GOOD: Batch commit
    for traj in trajectories:
        db.add(UserTrajectory(**traj))
    await db.commit()  # 1 commit
    
    # ✅ BETTER: Bulk insert with execute
    await db.execute(
        insert(UserTrajectory),
        trajectories
    )
    await db.commit()
```

---

## Async Optimization

### 1. Parallel Operations

```python
async def process_emotion_state(
    db: AsyncSession,
    vac: List[float],
    text: str
) -> Dict:
    """Run independent operations in parallel"""
    
    # ❌ BAD: Sequential (total: 150ms)
    emotion = await find_nearest_emotion(vac, text)  # 50ms
    quaternion = await convert_to_quaternion(vac)     # 50ms
    embedding = await generate_embedding(text)        # 50ms
    
    # ✅ GOOD: Parallel (total: 50ms)
    emotion_task = asyncio.create_task(find_nearest_emotion(vac, text))
    quaternion_task = asyncio.create_task(convert_to_quaternion(vac))
    embedding_task = asyncio.create_task(generate_embedding(text))
    
    # Wait for all
    emotion, quaternion, embedding = await asyncio.gather(
        emotion_task,
        quaternion_task,
        embedding_task
    )
    
    return {
        "emotion": emotion,
        "quaternion": quaternion,
        "embedding": embedding
    }
```

### 2. Connection Pooling for HTTP

```python
import httpx

# ❌ BAD: New client for each request
async def call_versor(vac: List[float]):
    async with httpx.AsyncClient() as client:
        response = await client.post(VERSOR_URL, json={"vac": vac})
        return response.json()

# ✅ GOOD: Reuse client
class VersorClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=10.0,
            limits=httpx.Limits(
                max_connections=100,
                max_keepalive_connections=20
            )
        )
    
    async def convert_vac(self, vac: List[float]):
        response = await self.client.post(
            f"{VERSOR_URL}/convert",
            json={"vac": vac}
        )
        return response.json()["quaternion"]
    
    async def close(self):
        await self.client.aclose()

# Global instance
versor_client = VersorClient()
```

---

## Memory Optimization

### 1. Lazy Loading

```python
class EmotionMapper:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._atlas_cache = None  # Load on demand
    
    async def _get_atlas(self) -> List[AtlasDefinition]:
        """Lazy load atlas"""
        if self._atlas_cache is None:
            result = await self.db.execute(select(AtlasDefinition))
            self._atlas_cache = result.scalars().all()
        return self._atlas_cache
```

### 2. Pagination

```python
@router.get("/trajectory/{user_id}")
async def get_trajectory(
    user_id: str,
    skip: int = 0,
    limit: int = 100,  # Default page size
    db: AsyncSession = Depends(get_db)
):
    """Get user trajectory with pagination"""
    # ❌ BAD: Load everything
    # all_trajectories = await db.execute(
    #     select(UserTrajectory).where(UserTrajectory.user_id == user_id)
    # )
    
    # ✅ GOOD: Paginated
    result = await db.execute(
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    
    trajectories = result.scalars().all()
    
    # Return with pagination metadata
    return {
        "trajectories": trajectories,
        "skip": skip,
        "limit": limit,
        "has_more": len(trajectories) == limit
    }
```

### 3. Streaming Large Results

```python
from fastapi.responses import StreamingResponse

@router.get("/export/{user_id}")
async def export_trajectory(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Stream large dataset as NDJSON"""
    async def generate():
        # Stream results without loading all into memory
        result = await db.stream(
            select(UserTrajectory)
            .where(UserTrajectory.user_id == user_id)
            .order_by(UserTrajectory.timestamp)
        )
        
        async for trajectory in result.scalars():
            # Convert to JSON and yield
            yield trajectory.to_json() + "\n"
    
    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson"
    )
```

---

## Vector Search Optimization

### 1. Index Parameters

```sql
-- Default (balanced)
CREATE INDEX ON user_trajectory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- High throughput (more memory, faster queries)
CREATE INDEX ON user_trajectory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);

-- Memory constrained (less memory, acceptable speed)
CREATE INDEX ON user_trajectory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 8, ef_construction = 32);
```

### 2. Query-Time Tuning

```python
async def find_similar_optimized(
    db: AsyncSession,
    query_embedding: List[float],
    accuracy: str = "balanced"
):
    """Adjust search parameters based on accuracy needs"""
    
    # Set ef_search based on accuracy requirement
    if accuracy == "high":
        await db.execute(text("SET hnsw.ef_search = 200"))
    elif accuracy == "balanced":
        await db.execute(text("SET hnsw.ef_search = 40"))
    else:  # "fast"
        await db.execute(text("SET hnsw.ef_search = 20"))
    
    # Execute search
    result = await db.execute(
        select(UserTrajectory)
        .order_by(UserTrajectory.embedding.cosine_distance(query_embedding))
        .limit(10)
    )
    
    return result.scalars().all()
```

### 3. Pre-filtering

```python
# ❌ BAD: Vector search entire table
SELECT * FROM user_trajectory
ORDER BY embedding <=> query_vector
LIMIT 10;
-- Searches millions of rows

# ✅ GOOD: Pre-filter first
SELECT * FROM user_trajectory
WHERE user_id = 'user123'
  AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> query_vector
LIMIT 10;
-- Searches ~100 rows
```

---

## Caching Strategies

### 1. Multi-Level Cache

```python
from cachetools import LRUCache, TTLCache

class MultiLevelCache:
    def __init__(self):
        # L1: Recent (LRU, 100 items)
        self.l1_cache = LRUCache(maxsize=100)
        
        # L2: Time-based (TTL, 1000 items, 1 hour)
        self.l2_cache = TTLCache(maxsize=1000, ttl=3600)
    
    def get(self, key: str) -> Optional[Any]:
        """Check L1, then L2"""
        # Try L1
        if key in self.l1_cache:
            return self.l1_cache[key]
        
        # Try L2
        if key in self.l2_cache:
            value = self.l2_cache[key]
            # Promote to L1
            self.l1_cache[key] = value
            return value
        
        return None
    
    def set(self, key: str, value: Any):
        """Store in both levels"""
        self.l1_cache[key] = value
        self.l2_cache[key] = value
```

### 2. Invalidation Strategy

```python
class CacheManager:
    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all caches for a user"""
        # Invalidate trajectory cache
        trajectory_cache.pop(f"trajectory:{user_id}", None)
        
        # Invalidate metrics cache
        metrics_cache.pop(f"metrics:{user_id}", None)
        
        # Invalidate session cache
        for key in list(session_cache.keys()):
            if key.startswith(f"session:{user_id}"):
                session_cache.pop(key)
    
    async def invalidate_atlas_cache(self):
        """Invalidate atlas cache when emotions updated"""
        atlas_cache._cache.clear()
```

---

## Load Testing

### 1. Locust Configuration

```python
# locustfile.py
from locust import HttpUser, task, between

class ObserverUser(HttpUser):
    wait_time = between(1, 3)  # Realistic user behavior
    
    @task(3)  # Weight: 3x more common
    def get_emotions(self):
        """Load test: Get emotions"""
        self.client.get("/atlas/emotions")
    
    @task(2)
    def find_similar(self):
        """Load test: Similarity search"""
        self.client.post("/atlas/similar", json={
            "valence": 0.5,
            "arousal": 0.6,
            "connection": 0.7
        })
    
    @task(1)
    def find_path(self):
        """Load test: Pathfinding"""
        self.client.post("/transitions/path", json={
            "from_emotion": "Anger",
            "to_emotion": "Calm",
            "user_id": "test-user"
        })
    
    def on_start(self):
        """Setup before tasks"""
        pass
```

**Run load test:**

```bash
# 100 users, spawn 10/second
locust -f locustfile.py --users 100 --spawn-rate 10 --host http://localhost:8000

# Headless mode
locust -f locustfile.py --users 1000 --spawn-rate 50 --run-time 5m --headless
```

### 2. Analyzing Results

Look for:

- **Response times:** P50, P95, P99
- **Throughput:** Requests/second
- **Error rate:** Should be < 0.1%
- **Database connections:** Should not hit pool limit

---

## Monitoring

### 1. Application Metrics

```python
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
request_count = Counter(
    'observer_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status']
)

request_latency = Histogram(
    'observer_request_duration_seconds',
    'Request latency',
    ['method', 'endpoint']
)

active_connections = Gauge(
    'observer_websocket_connections',
    'Active WebSocket connections'
)

# Middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start
    
    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    request_latency.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response
```

### 2. Database Monitoring

```sql
-- Active queries
SELECT 
    pid,
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Lock monitoring
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## Profiling

### 1. Python Profiling

```python
import cProfile
import pstats
from pstats import SortKey

def profile_function():
    """Profile a function"""
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Run function
    result = await expensive_function()
    
    profiler.disable()
    
    # Print stats
    stats = pstats.Stats(profiler)
    stats.sort_stats(SortKey.CUMULATIVE)
    stats.print_stats(20)  # Top 20 functions
```

### 2. Line Profiler

```bash
# Install
pip install line_profiler

# Decorate function
@profile
async def find_transition_path(from_emotion, to_emotion):
    # ... code

# Run
kernprof -l -v script.py
```

### 3. Memory Profiling

```bash
# Install
pip install memory_profiler

# Profile
python -m memory_profiler script.py

# Or in code
from memory_profiler import profile

@profile
def memory_intensive_function():
    # Shows memory usage per line
    pass
```

---

## Optimization Checklist

### Database

- [ ] Appropriate indexes on all foreign keys
- [ ] Composite indexes for common query patterns
- [ ] HNSW indexes on all vector columns
- [ ] Connection pooling configured
- [ ] Autovacuum tuned for workload
- [ ] pg_stat_statements enabled
- [ ] Slow queries identified and optimized

### Application

- [ ] Atlas cached in memory
- [ ] Path matrix pre-computed
- [ ] Embedding cache implemented
- [ ] Async operations parallelized
- [ ] HTTP client connection pooling
- [ ] Pagination for large results
- [ ] Proper error handling (no silent failures)

### Vector Search

- [ ] HNSW parameters tuned (m, ef_construction)
- [ ] ef_search set appropriately
- [ ] Pre-filtering before vector search
- [ ] Vector normalization verified
- [ ] Index rebuild schedule in place

### Monitoring

- [ ] Prometheus metrics exported
- [ ] Database metrics tracked
- [ ] Error rates monitored
- [ ] Latency percentiles tracked
- [ ] Alerting configured

---

## Next Steps

**Related guides:**

- [Database Architecture](02-database-architecture.md) - Index design
- [Vector Search](03-vector-search.md) - HNSW tuning
- [Troubleshooting](08-troubleshooting.md) - Performance issues

**Deep dive:**

- [Architecture Decisions](09-architecture-decisions.md) - Design tradeoffs
