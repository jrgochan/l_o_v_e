# Database Architecture

**Reading Time:** ~50 minutes  
**Audience:** Senior developers, DBAs, architects  
**Prerequisites:** PostgreSQL knowledge, understanding of vector databases  
**Goal:** Master Observer's database design, pgvector integration, and optimization strategies

---

## Overview

Observer uses **PostgreSQL 16+ with pgvector** as a unified data store, combining:

- Traditional relational data (emotions, users, sessions)
- High-dimensional vectors (embeddings)
- Time-series data (emotional trajectories)
- Graph data (category relationships)

**Why unified?** Eliminates consistency issues, reduces latency, simplifies architecture.

---

## Schema Design

### Core Tables

```sql
-- 87 Emotions Atlas
CREATE TABLE atlas_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(200) NOT NULL,
    vac FLOAT ARRAY[3] NOT NULL,  -- [valence, arousal, connection]
    embedding VECTOR(384) NOT NULL,  -- Semantic embedding
    quaternion FLOAT ARRAY[4],  -- Pre-calculated [w, x, y, z]
    description TEXT NOT NULL,
    keywords TEXT ARRAY,
    citations JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_vac CHECK (
        array_length(vac, 1) = 3 AND
        vac[1] BETWEEN -1.0 AND 1.0 AND
        vac[2] BETWEEN -1.0 AND 1.0 AND
        vac[3] BETWEEN -1.0 AND 1.0
    )
);

-- User Emotional Trajectory
CREATE TABLE user_trajectory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    vac FLOAT ARRAY[3] NOT NULL,
    quaternion FLOAT ARRAY[4] NOT NULL,
    emotion_id UUID REFERENCES atlas_definitions(id),
    transcription TEXT,
    embedding VECTOR(384) NOT NULL,
    elasticity FLOAT,  -- Speed of emotional change
    rigidity FLOAT,    -- Resistance to change
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    
    -- Indexes for common queries
    CONSTRAINT fk_emotion FOREIGN KEY (emotion_id) 
        REFERENCES atlas_definitions(id) ON DELETE SET NULL
);

-- Therapeutic Strategies
CREATE TABLE transition_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,  -- ACT, DBT, CBT, etc.
    description TEXT NOT NULL,
    technique TEXT NOT NULL,
    evidence_base VARCHAR(500),
    when_to_use TEXT ARRAY,
    contraindications TEXT ARRAY,
    effectiveness FLOAT,  -- Effect size from research
    duration_minutes INT,
    embedding VECTOR(384),
    citations JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions (WebSocket)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    tone_preference VARCHAR(50) DEFAULT 'warm',  -- 'warm' or 'clinical'
    deep_feeling_mode BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,  -- 'user', 'analysis', 'insight'
    content TEXT NOT NULL,
    emotion_id UUID REFERENCES atlas_definitions(id),
    vac FLOAT ARRAY[3],
    embedding VECTOR(384),
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
```

### Supporting Tables

```sql
-- Clinical Alerts
CREATE TABLE clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    vac_data JSONB,
    prosody_data JSONB,
    triggered_at TIMESTAMP DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    metadata JSONB
);

-- Session Analytics
CREATE TABLE session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    message_count INT DEFAULT 0,
    avg_valence FLOAT,
    avg_arousal FLOAT,
    avg_connection FLOAT,
    dominant_emotion VARCHAR(100),
    elasticity_avg FLOAT,
    rigidity_avg FLOAT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Path Matrix Cache (Pre-computed paths)
CREATE TABLE path_matrix_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_emotion_id UUID REFERENCES atlas_definitions(id),
    to_emotion_id UUID REFERENCES atlas_definitions(id),
    path JSONB NOT NULL,  -- Array of waypoint IDs
    distance FLOAT NOT NULL,
    computation_time_ms INT,
    vac_hash VARCHAR(64),  -- Hash for cache invalidation
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(from_emotion_id, to_emotion_id)
);
```

---

## Indexing Strategy

### B-tree Indexes (Exact Lookups)

```sql
-- Atlas lookups
CREATE INDEX idx_atlas_name ON atlas_definitions(name);
CREATE INDEX idx_atlas_category ON atlas_definitions(category);

-- Trajectory queries
CREATE INDEX idx_trajectory_user ON user_trajectory(user_id);
CREATE INDEX idx_trajectory_session ON user_trajectory(session_id);
CREATE INDEX idx_trajectory_timestamp ON user_trajectory(timestamp DESC);
CREATE INDEX idx_trajectory_emotion ON user_trajectory(emotion_id);

-- Composite index for user timeline
CREATE INDEX idx_user_timeline ON user_trajectory(user_id, timestamp DESC);

-- Chat sessions
CREATE INDEX idx_chat_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_status ON chat_sessions(status) WHERE status = 'active';

-- Chat messages
CREATE INDEX idx_message_session ON chat_messages(session_id);
CREATE INDEX idx_message_timestamp ON chat_messages(session_id, timestamp DESC);
```

### HNSW Indexes (Vector Similarity)

**HNSW (Hierarchical Navigable Small Worlds)** for fast approximate nearest neighbor search:

```sql
-- Atlas emotion embeddings
CREATE INDEX idx_atlas_embedding ON atlas_definitions 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Trajectory embeddings
CREATE INDEX idx_trajectory_embedding ON user_trajectory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Strategy embeddings
CREATE INDEX idx_strategy_embedding ON transition_strategies 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**HNSW Parameters:**

- `m`: Number of connections per node (default 16)
  - Higher = better recall, more memory
  - Lower = faster builds, less memory
- `ef_construction`: Exploration factor during build (default 64)
  - Higher = better index quality, slower build
  - Lower = faster build, slightly worse quality

**Query-time tuning:**

```sql
-- Set search accuracy (higher = slower but more accurate)
SET hnsw.ef_search = 100;  -- Default 40

-- Find similar emotions
SELECT name, embedding <=> query_vector as distance
FROM atlas_definitions
ORDER BY embedding <=> query_vector
LIMIT 10;
```

### GiST Indexes (Multi-dimensional)

For VAC coordinates (alternative to app-level filtering):

```sql
-- Create cube extension for multi-dimensional indexing
CREATE EXTENSION IF NOT EXISTS cube;

-- Convert VAC array to cube for indexing
ALTER TABLE atlas_definitions ADD COLUMN vac_cube cube;
UPDATE atlas_definitions SET vac_cube = cube(vac);

CREATE INDEX idx_atlas_vac_cube ON atlas_definitions USING gist(vac_cube);

-- Query: Find emotions within VAC range
SELECT * FROM atlas_definitions
WHERE vac_cube <-> cube(ARRAY[0.5, 0.6, 0.7]) < 0.3;
```

---

## pgvector Deep Dive

### Vector Data Type

```sql
-- Create vector column
ALTER TABLE my_table ADD COLUMN embedding VECTOR(384);

-- Vector dimensions are fixed at table creation
-- Common dimensions:
-- - 384: sentence-transformers (all-MiniLM-L6-v2)
-- - 768: BERT base
-- - 1536: OpenAI text-embedding-ada-002
-- - 3072: OpenAI text-embedding-3-large
```

### Distance Operators

```sql
-- <-> : L2 distance (Euclidean)
-- <#> : Inner product (negative)
-- <=> : Cosine distance

-- L2 distance (geometric)
SELECT name, embedding <-> '[0.1, 0.2, ...]'::vector as distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;

-- Cosine distance (semantic similarity)
SELECT name, embedding <=> '[0.1, 0.2, ...]'::vector as distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;

-- Cosine similarity (1 - cosine distance)
SELECT name, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM atlas_definitions
ORDER BY similarity DESC
LIMIT 5;
```

### Index Types Comparison

| Index | Build Time | Query Speed | Memory | Recall |
|-------|------------|-------------|--------|--------|
| **HNSW** | Slow | Very Fast | High | ~95% |
| **IVFFlat** | Fast | Fast | Medium | ~90% |
| **None (Exact)** | N/A | Slow | Low | 100% |

**HNSW vs IVFFlat:**

```sql
-- HNSW: Better for most use cases
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);

-- IVFFlat: Faster build, slightly slower query
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Number of clusters
```

**When to use exact search (no index):**

- Small datasets (< 10k vectors)
- Batch processing (not latency-sensitive)
- Initial testing/development

---

## Partitioning Strategy

### Time-based Partitioning for Trajectories

**Problem:** `user_trajectory` grows unbounded

**Solution:** Partition by month

```sql
-- Create partitioned table
CREATE TABLE user_trajectory (
    id UUID DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    vac FLOAT ARRAY[3] NOT NULL,
    quaternion FLOAT ARRAY[4] NOT NULL,
    emotion_id UUID,
    transcription TEXT,
    embedding VECTOR(384) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE user_trajectory_2026_01 PARTITION OF user_trajectory
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE user_trajectory_2026_02 PARTITION OF user_trajectory
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes on each partition
CREATE INDEX idx_traj_2026_01_user ON user_trajectory_2026_01(user_id);
CREATE INDEX idx_traj_2026_01_emb ON user_trajectory_2026_01 
    USING hnsw (embedding vector_cosine_ops);
```

**Benefits:**

- Faster queries (partition pruning)
- Easier archival (drop old partitions)
- Better vacuum performance
- Parallel operations

**Automated partition creation:**

```sql
-- Use pg_partman extension
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
    'public.user_trajectory',
    'timestamp',
    'native',
    'monthly'
);
```

---

## Row-Level Security (RLS)

### Multi-tenancy isolation: Users can only see their own data

```sql
-- Enable RLS
ALTER TABLE user_trajectory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users see only their own trajectories
CREATE POLICY user_trajectory_isolation ON user_trajectory
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE));

-- Policy: Users see only their own sessions
CREATE POLICY chat_session_isolation ON chat_sessions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE));

-- Policy: Users see messages in their sessions
CREATE POLICY chat_message_isolation ON chat_messages
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE user_id = current_setting('app.current_user_id', TRUE)
        )
    );

-- Admin bypass (for system operations)
CREATE POLICY admin_all_access ON user_trajectory
    FOR ALL
    TO admin_role
    USING (true);
```

**Setting user context in application:**

```python
async def get_db_with_user_context(user_id: str):
    async with AsyncSessionLocal() as session:
        # Set user context for RLS
        await session.execute(
            text(f"SET app.current_user_id = '{user_id}'")
        )
        yield session
```

---

## Connection Pooling

### Application-Level Pooling (SQLAlchemy)

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    
    # Pool configuration
    pool_size=20,              # Normal connections
    max_overflow=10,           # Additional under load
    pool_timeout=30,           # Wait for connection (seconds)
    pool_recycle=3600,         # Recycle after 1 hour
    pool_pre_ping=True,        # Test connections before use
    
    # Connection arguments
    connect_args={
        "server_settings": {
            "application_name": "observer",
            "jit": "off"  # Disable JIT for predictable performance
        },
        "command_timeout": 60,  # Query timeout
    },
    
    # Async pool
    poolclass=AsyncAdaptedQueuePool,
    
    # Logging
    echo=False,  # Set True for SQL logging
    echo_pool=False  # Set True for pool logging
)
```

### Database-Level Pooling (PgBouncer)

#### For production: Use PgBouncer in front of PostgreSQL

```ini
# pgbouncer.ini
[databases]
observer_prod = host=localhost dbname=observer_prod

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction  # or 'session' or 'statement'
max_client_conn = 1000   # Max clients
default_pool_size = 25   # Connections to PostgreSQL
reserve_pool_size = 5    # Emergency connections
```

**Pool modes:**

- **session**: One connection per client session (safest)
- **transaction**: One connection per transaction (recommended)
- **statement**: One connection per statement (rarely used)

---

## Migrations with Alembic

### Migration Structure

```text
migrations/
├── env.py                 # Alembic environment
├── script.py.mako        # Template for new migrations
└── versions/
    ├── 001_initial_schema.py
    ├── 002_add_chat_system.py
    ├── 003_add_clinical_alerts.py
    └── ...
```

### Creating Migrations

```bash
# Auto-generate from models (review carefully!)
alembic revision --autogenerate -m "add user preferences"

# Manual migration
alembic revision -m "add vector index to trajectories"
```

### Migration Best Practices

```python
"""add_embedding_index

Revision ID: abc123
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    """
    Add HNSW index to user_trajectory embeddings.
    Note: This can take several minutes on large tables.
    """
    # Create index concurrently (doesn't block writes)
    op.execute("""
        CREATE INDEX CONCURRENTLY idx_trajectory_embedding 
        ON user_trajectory 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

def downgrade():
    """Remove the index"""
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_trajectory_embedding")


# For data migrations
def upgrade():
    """Migrate old emotion names to new names"""
    conn = op.get_bind()
    
    # Update in batches to avoid long locks
    conn.execute("""
        UPDATE atlas_definitions
        SET name = 'Anticipation'
        WHERE name = 'Expectation'
    """)
    
    # Cascade to foreign keys
    conn.execute("""
        UPDATE user_trajectory ut
        SET emotion_id = (
            SELECT id FROM atlas_definitions 
            WHERE name = 'Anticipation'
        )
        WHERE emotion_id IN (
            SELECT id FROM atlas_definitions 
            WHERE name = 'Expectation'
        )
    """)
```

---

## Backup and Recovery

### Continuous Archiving (PITR)

```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 300  # Archive every 5 minutes

# Take base backup
pg_basebackup -D /backup/base -Fp -Xs -P

# Restore to point in time
# recovery.conf
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-01-02 14:30:00'
```

### Logical Backups

```bash
# Full database dump
pg_dump -Fc observer_prod > observer_prod.dump

# Restore
pg_restore -d observer_prod observer_prod.dump

# Specific tables only
pg_dump -Fc -t atlas_definitions -t transition_strategies observer_prod > atlas.dump

# With pgvector
pg_dump --extension=vector observer_prod > observer_with_vector.sql
```

---

### Performance Impactoring

### Key Metrics

```sql
-- Connection stats
SELECT 
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_txn
FROM pg_stat_activity
WHERE datname = 'observer_prod';

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Slow queries (enable pg_stat_statements)
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%user_trajectory%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Cache hit ratio (should be > 99%)
SELECT 
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

### EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT * FROM user_trajectory 
WHERE user_id = 'user123' 
ORDER BY timestamp DESC 
LIMIT 100;

-- Look for:
-- - Seq Scan (bad on large tables)
-- - Index Scan (good)
-- - Buffers: shared hit vs read (hit = cache)
-- - Execution time
```

---

## Optimization Tips

### Vacuum Strategy

```sql
-- Auto vacuum settings (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 10s

-- Aggressive vacuum for heavily updated tables
ALTER TABLE user_trajectory SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- Manual vacuum
VACUUM ANALYZE user_trajectory;

-- Full vacuum (locks table, use carefully)
VACUUM FULL user_trajectory;
```

### Query Optimization

```sql
-- ❌ BAD: Full table scan
SELECT * FROM user_trajectory 
WHERE EXTRACT(MONTH FROM timestamp) = 1;

-- ✅ GOOD: Index-friendly
SELECT * FROM user_trajectory 
WHERE timestamp >= '2026-01-01' 
  AND timestamp < '2026-02-01';

-- ❌ BAD: Function prevents index use
SELECT * FROM atlas_definitions 
WHERE LOWER(name) = 'joy';

-- ✅ GOOD: Functional index or case-insensitive comparison
CREATE INDEX idx_atlas_name_lower ON atlas_definitions(LOWER(name));
SELECT * FROM atlas_definitions WHERE LOWER(name) = 'joy';
-- OR
SELECT * FROM atlas_definitions WHERE name ILIKE 'joy';
```

---

## Next Steps

**Deep dives:**

- [Vector Search](03-vector-search.md) - HNSW algorithm internals
- [Performance Optimization](06-performance-optimization.md) - Advanced tuning
- [Troubleshooting](08-troubleshooting.md) - Database issues

**Related:**

- [Deep Dive Architecture](01-deep-dive.md) - Application layer
- [Transition System](04-transition-system.md) - A* pathfinding
