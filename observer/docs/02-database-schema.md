# Observer Module - Database Schema

## Overview

The Observer's database schema is designed for **hybrid workloads**: high-volume transactional writes (emotional state logging) and low-latency vector similarity searches (insight generation). This is achieved using PostgreSQL 16+ with the pgvector extension.

## Technology Requirements

- **PostgreSQL**: Version 16.2 or later
- **pgvector**: Version 0.6.0 or later (HNSW support required)
- **Extensions**: `uuid-ossp` (UUID generation), `pgvector` (vector operations)

## Schema Overview

The database consists of two primary tables:

1. **`atlas_definitions`**: Static reference of 87 emotions (immutable after seeding)
2. **`user_trajectory`**: Dynamic log of user's emotional journey (high-volume writes)

## Table 1: atlas_definitions

### Purpose

Stores the "Ground Truth" for the 87 emotions from Atlas of the Heart. This table is populated once during system initialization and remains largely static.

### Schema Definition

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE atlas_definitions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Emotion Identity
    emotion_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,

    -- Computational Vectors
    vac_vector VECTOR(3) NOT NULL,              -- [Valence, Arousal, Connection]
    q_constant VECTOR(4) NOT NULL,              -- Pre-calculated quaternion [w, x, y, z]
    semantic_embedding VECTOR(1536) NOT NULL,   -- OpenAI text-embedding-3-small

    -- Visualization Metadata
    haptic_pattern_id VARCHAR(50),              -- e.g., 'HEAVY_THROB', 'HEARTBEAT'
    color_hint VARCHAR(7),                      -- Hex color (optional override)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_atlas_category ON atlas_definitions(category);
CREATE INDEX idx_atlas_emotion_name ON atlas_definitions(emotion_name);

-- No vector index needed (only 87 rows, sequential scan is instant)
```

### Column Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `emotion_name` | VARCHAR(100) | NOT NULL, UNIQUE | "Joy", "Shame", "Schadenfreude" |
| `category` | VARCHAR(100) | NOT NULL | One of 13 categories |
| `definition` | TEXT | NOT NULL | Lexicographical definition |
| `vac_vector` | VECTOR(3) | NOT NULL | [valence, arousal, connection] |
| `q_constant` | VECTOR(4) | NOT NULL | [w, x, y, z] quaternion |
| `semantic_embedding` | VECTOR(1536) | NOT NULL | High-dimensional embedding |
| `haptic_pattern_id` | VARCHAR(50) | NULL | Reference to vibration pattern |
| `color_hint` | VARCHAR(7) | NULL | Optional color override |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

### Example Row

```sql
INSERT INTO atlas_definitions (
    emotion_name,
    category,
    definition,
    vac_vector,
    q_constant,
    semantic_embedding,
    haptic_pattern_id
) VALUES (
    'Compassion',
    'Places We Go With Others',
    'The daily practice of recognizing and accepting our shared humanity.',
    '[0.5, 0.2, 0.9]'::vector,
    '[0.87, 0.25, 0.10, 0.42]'::vector,
    '[0.023, -0.014, ...]'::vector(1536),
    'GENTLE_PULSE'
);
```

## Table 2: user_trajectory

### Purpose

Logs the continuous emotional journey of each user. This is a **high-volume write table** (potentially millions of rows per user over time).

### Schema Definition

```sql
CREATE TABLE user_trajectory (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User Context
    user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Input Data (from Listener)
    input_transcription TEXT,                    -- Sanitized text (PII stripped)
    input_embedding VECTOR(1536),                -- Semantic embedding of input

    -- Computed State
    vac_values VECTOR(3) NOT NULL,               -- [Valence, Arousal, Connection]
    quaternion_state VECTOR(4) NOT NULL,         -- [w, x, y, z]
    dominant_emotion_id UUID,                    -- Foreign key to atlas_definitions

    -- Temporal Metrics
    elasticity_metric FLOAT DEFAULT 0.0,         -- E = θ / Δt (velocity)
    rigidity_score FLOAT DEFAULT 0.0,            -- R = 1 / variance (resistance)

    -- Contextual Metadata
    metadata JSONB DEFAULT '{}'::jsonb,          -- Flexible tags (e.g., {"context": "work"})

    -- Foreign Keys
    CONSTRAINT fk_dominant_emotion
        FOREIGN KEY (dominant_emotion_id)
        REFERENCES atlas_definitions(id)
);

-- Indexes for Performance
CREATE INDEX idx_trajectory_user_time
    ON user_trajectory(user_id, timestamp DESC);

CREATE INDEX idx_trajectory_session
    ON user_trajectory(session_id, timestamp DESC);

-- HNSW Index for Vector Similarity Search
CREATE INDEX idx_trajectory_embedding_hnsw
    ON user_trajectory
    USING hnsw (input_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Optional: Separate index for quaternion search (if needed)
CREATE INDEX idx_trajectory_quaternion_hnsw
    ON user_trajectory
    USING hnsw (quaternion_state vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Composite index for emotion analysis
CREATE INDEX idx_trajectory_emotion_time
    ON user_trajectory(dominant_emotion_id, timestamp DESC);
```

### Column Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique event identifier |
| `user_id` | UUID | NOT NULL | Reference to user |
| `session_id` | UUID | NOT NULL | Groups states by interaction session |
| `timestamp` | TIMESTAMPTZ | NOT NULL | Precise moment of state |
| `input_transcription` | TEXT | NULL | Sanitized text from Listener |
| `input_embedding` | VECTOR(1536) | NULL | Semantic vector of input |
| `vac_values` | VECTOR(3) | NOT NULL | [V, A, C] scalars |
| `quaternion_state` | VECTOR(4) | NOT NULL | Unit quaternion [w, x, y, z] |
| `dominant_emotion_id` | UUID | FOREIGN KEY | Nearest Atlas emotion |
| `elasticity_metric` | FLOAT | DEFAULT 0.0 | Speed of change |
| `rigidity_score` | FLOAT | DEFAULT 0.0 | Resistance to change |
| `metadata` | JSONB | DEFAULT '{}' | Flexible context tags |

### Example Row

```sql
INSERT INTO user_trajectory (
    user_id,
    session_id,
    timestamp,
    input_transcription,
    input_embedding,
    vac_values,
    quaternion_state,
    dominant_emotion_id,
    elasticity_metric,
    rigidity_score,
    metadata
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    '789e0123-e89b-12d3-a456-426614174001'::uuid,
    NOW(),
    'I feel amazing today, everything is clicking.',
    '[0.012, -0.045, ...]'::vector(1536),
    '[0.9, 0.7, 0.8]'::vector,          -- Joy
    '[0.68, 0.50, 0.39, 0.45]'::vector,
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Joy'),
    0.8,
    0.2,
    '{"context": "work", "trigger": "promotion"}'::jsonb
);
```

## Indexing Strategy

### Why HNSW?

**HNSW** (Hierarchical Navigable Small World) is selected over **IVFFlat** because:

| Feature | HNSW | IVFFlat |
|---------|------|---------|
| **Training Required** | No | Yes (requires clustering) |
| **Query Speed** | Faster | Slower |
| **Recall** | Higher (>95%) | Lower (~90%) |
| **Build Time** | Slower | Faster |
| **Memory Usage** | Higher | Lower |

**For the Observer**, query speed and recall are paramount (real-time insights), making HNSW the correct choice.

### HNSW Parameters

```sql
CREATE INDEX idx_trajectory_embedding_hnsw
    ON user_trajectory
    USING hnsw (input_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

**Parameters**:
- `m = 16`: Number of bi-directional links per node (higher = better recall, more memory)
- `ef_construction = 64`: Size of dynamic candidate list during build (higher = better quality, slower build)

**Runtime Configuration**:
```sql
-- Set search depth (higher = better recall, slower queries)
SET hnsw.ef_search = 40;
```

For datasets < 1M rows, these defaults provide excellent performance.

### B-Tree Indexes

For temporal queries (retrieving user history):

```sql
CREATE INDEX idx_trajectory_user_time
    ON user_trajectory(user_id, timestamp DESC);
```

This allows fast retrieval of a user's chronological history:

```sql
SELECT * FROM user_trajectory
WHERE user_id = :user_id
ORDER BY timestamp DESC
LIMIT 100;
```

## Partitioning Strategy

As `user_trajectory` grows, implement **time-series partitioning**:

```sql
CREATE TABLE user_trajectory (
    -- ... columns as above
) PARTITION BY RANGE (timestamp);

-- Monthly partitions
CREATE TABLE user_trajectory_2025_01
    PARTITION OF user_trajectory
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_trajectory_2025_02
    PARTITION OF user_trajectory
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

**Benefits**:
- Faster queries (only scan relevant partitions)
- Easier archival (drop old partitions)
- Better index performance (smaller indexes per partition)

## Row-Level Security (RLS)

Prevent cross-user data leakage:

```sql
-- Enable RLS
ALTER TABLE user_trajectory ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY user_isolation ON user_trajectory
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Application sets user context before queries
SET app.current_user_id = '123e4567-e89b-12d3-a456-426614174000';
```

Even if the application logic has a bug, the database enforces isolation.

## Constraints and Validations

### Check Constraints

Ensure VAC values are normalized:

```sql
ALTER TABLE user_trajectory
ADD CONSTRAINT chk_vac_normalized
CHECK (
    vac_values[0] >= -1.0 AND vac_values[0] <= 1.0 AND
    vac_values[1] >= -1.0 AND vac_values[1] <= 1.0 AND
    vac_values[2] >= -1.0 AND vac_values[2] <= 1.0
);
```

### Quaternion Unit Length

```sql
ALTER TABLE user_trajectory
ADD CONSTRAINT chk_quaternion_unit
CHECK (
    ABS(
        quaternion_state[0]^2 +
        quaternion_state[1]^2 +
        quaternion_state[2]^2 +
        quaternion_state[3]^2 - 1.0
    ) < 0.001
);
```

## Supporting Tables

### users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

### sessions Table

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    session_type VARCHAR(50),  -- 'voice_note', 'journal_entry', 'chat'
    metadata JSONB DEFAULT '{}'::jsonb
);
```

## Triggers

### Update Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atlas_updated_at
BEFORE UPDATE ON atlas_definitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Next Steps

Now that you understand the schema:
- **03-vac-model-and-emotions.md** - The 87 emotions and their coordinates
- **04-vector-search.md** - pgvector queries and HNSW tuning
- **05-api-specification.md** - FastAPI endpoints
