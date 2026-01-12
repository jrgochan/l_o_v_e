# Observer Module - Vector Search

## Overview

The Observer uses **pgvector** to perform high-dimensional vector similarity searches. This enables:
- Finding the nearest emotion from the Atlas (87 emotions)
- Retrieving similar past moments ("You felt this way before...")
- Semantic search across user's emotional history

## pgvector Fundamentals

### What is pgvector?

**pgvector** is a PostgreSQL extension that adds:
- Vector data type (arrays of floats)
- Vector similarity operators
- Specialized indexes (IVFFlat, HNSW)
- Distance functions (L2, cosine, inner product)

### Installation

```sql
-- Enable extension
CREATE EXTENSION vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Vector Data Type

```sql
-- Create a vector column
CREATE TABLE test (
    embedding VECTOR(1536)  -- 1536-dimensional vector
);

-- Insert data
INSERT INTO test VALUES ('[0.1, 0.2, 0.3, ...]'::vector);

-- Or from array
INSERT INTO test VALUES (ARRAY[0.1, 0.2, 0.3, ...]::vector(1536));
```

## Distance Metrics

### Cosine Distance (Recommended)

**Formula**:
```
cosine_distance = 1 - (A · B) / (||A|| × ||B||)
```

**Range**: 0 (identical) to 2 (opposite)

**When to Use**: Text embeddings, semantic similarity

**SQL Operator**: `<=>`

```sql
SELECT emotion_name, 
       semantic_embedding <=> :query_embedding AS distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;
```

### Euclidean Distance (L2)

**Formula**:
```
euclidean_distance = √(Σ(Aᵢ - Bᵢ)²)
```

**When to Use**: VAC coordinates (physical distance in 3D space)

**SQL Operator**: `<->`

```sql
SELECT emotion_name,
       vac_vector <-> :input_vac AS distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;
```

### Inner Product (Dot Product)

**SQL Operator**: `<#>`

**When to Use**: Rarely—usually cosine or L2 is more appropriate

## HNSW Index Configuration

### Creating HNSW Index

```sql
CREATE INDEX idx_trajectory_embedding_hnsw 
ON user_trajectory 
USING hnsw (input_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Parameters Explained

#### `m` (Number of Connections)

- **Default**: 16
- **Range**: 2 to 100
- **Effect**: Higher = better recall, more memory

| m Value | Use Case | Memory | Query Speed | Recall |
|---------|----------|--------|-------------|--------|
| 8 | Low memory | Low | Fast | ~90% |
| 16 | **Recommended** | Medium | Medium | ~95% |
| 32 | High recall | High | Slower | ~98% |

#### `ef_construction` (Build Quality)

- **Default**: 64
- **Range**: 4 to 1000
- **Effect**: Higher = better index quality, slower build

| ef_construction | Build Time | Index Quality |
|-----------------|------------|---------------|
| 32 | Fast | Lower |
| 64 | **Recommended** | Good |
| 128 | Slow | Better |
| 200 | Very Slow | Best |

### Runtime Configuration

```sql
-- Set search depth (per-session)
SET hnsw.ef_search = 40;

-- Higher values = better recall, slower queries
-- Range: 1 to 1000
-- Recommended: 40 for production
```

**Dynamic Tuning**:
```python
async def set_search_quality(quality: str):
    if quality == 'fast':
        await session.execute("SET hnsw.ef_search = 20")
    elif quality == 'balanced':
        await session.execute("SET hnsw.ef_search = 40")
    elif quality == 'accurate':
        await session.execute("SET hnsw.ef_search = 100")
```

## Vector Operations in SQL

### Nearest Neighbor Search

Find 5 most similar emotions:

```sql
SELECT 
    id,
    emotion_name,
    vac_vector,
    input_embedding <=> :query_embedding AS distance
FROM user_trajectory
WHERE user_id = :user_id
ORDER BY input_embedding <=> :query_embedding
LIMIT 5;
```

**Note**: The `ORDER BY` clause triggers the HNSW index.

### Filtered Vector Search

Find similar moments within a specific time range:

```sql
SELECT 
    id,
    timestamp,
    input_transcription,
    input_embedding <=> :query_embedding AS distance
FROM user_trajectory
WHERE user_id = :user_id
    AND timestamp BETWEEN :start_date AND :end_date
ORDER BY input_embedding <=> :query_embedding
LIMIT 10;
```

⚠️ **Warning**: Filters applied BEFORE index search can degrade performance. For best results, ensure the filtered set is still large (>1000 rows).

### Hybrid Search (Vector + Metadata)

Combine semantic search with traditional filters:

```sql
SELECT 
    id,
    emotion_name,
    metadata->>'context' AS context,
    input_embedding <=> :query_embedding AS distance
FROM user_trajectory
WHERE user_id = :user_id
    AND metadata @> '{"context": "work"}'::jsonb
ORDER BY input_embedding <=> :query_embedding
LIMIT 5;
```

## Weighted Distance Fusion

The Observer uses **weighted fusion** of VAC distance and semantic distance:

```sql
-- Stored procedure for weighted search
CREATE OR REPLACE FUNCTION find_nearest_emotion(
    query_vac VECTOR(3),
    query_embedding VECTOR(1536),
    word_count INT,
    top_k INT DEFAULT 5
)
RETURNS TABLE (
    emotion_id UUID,
    emotion_name VARCHAR(100),
    combined_distance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH distances AS (
        SELECT 
            id,
            emotion_name,
            vac_vector <-> query_vac AS vac_dist,
            semantic_embedding <=> query_embedding AS semantic_dist
        FROM atlas_definitions
    )
    SELECT 
        id,
        emotion_name,
        CASE 
            WHEN word_count < 10 THEN 
                0.8 * vac_dist + 0.2 * semantic_dist
            ELSE 
                0.4 * vac_dist + 0.6 * semantic_dist
        END AS combined_distance
    FROM distances
    ORDER BY combined_distance
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM find_nearest_emotion(
    '[0.5, 0.7, 0.8]'::vector(3),
    query_embedding,
    5  -- word count
);
```

## Performance Optimization

### Query Optimization

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM user_trajectory
WHERE user_id = :user_id
ORDER BY input_embedding <=> :query_embedding
LIMIT 10;

-- Look for "Index Scan using idx_trajectory_embedding_hnsw"
```

### Index Maintenance

```sql
-- Check index bloat
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'user_trajectory';

-- Rebuild index if needed (rare)
REINDEX INDEX idx_trajectory_embedding_hnsw;
```

### Monitoring Index Usage

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'user_trajectory'
ORDER BY idx_scan DESC;
```

## SQLAlchemy Integration

### Vector Type Definition

```python
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, UUID
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class UserTrajectory(Base):
    __tablename__ = 'user_trajectory'
    
    id = Column(UUID, primary_key=True)
    input_embedding = Column(Vector(1536))
    vac_values = Column(Vector(3))
    quaternion_state = Column(Vector(4))
```

### Vector Queries

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def find_similar_moments(
    session: AsyncSession,
    user_id: UUID,
    query_embedding: List[float],
    limit: int = 5
) -> List[UserTrajectory]:
    """Find semantically similar past moments"""
    
    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.input_embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    
    result = await session.execute(stmt)
    return result.scalars().all()
```

### VAC Distance Query

```python
async def find_nearest_atlas_emotion(
    session: AsyncSession,
    vac_vector: List[float]
) -> AtlasDefinition:
    """Find nearest emotion by VAC distance (Euclidean)"""
    
    stmt = (
        select(AtlasDefinition)
        .order_by(AtlasDefinition.vac_vector.l2_distance(vac_vector))
        .limit(1)
    )
    
    result = await session.execute(stmt)
    return result.scalar_one()
```

## Testing Vector Search

### Unit Tests

```python
import pytest
from app.services.emotion_mapper import EmotionMapper

@pytest.mark.asyncio
async def test_compassion_pity_distinction(session):
    """Critical test: System must distinguish based on Connection"""
    
    # Input: "I feel sorry for them" (Pity)
    pity_vac = [-0.3, -0.1, -0.7]
    pity_text = "I feel sorry for them, they're struggling."
    pity_embedding = await embedding_service.generate_embedding(pity_text)
    
    mapper = EmotionMapper(session)
    result = await mapper.find_nearest(
        vac_scalars=pity_vac,
        text_embedding=pity_embedding,
        word_count=len(pity_text.split())
    )
    
    assert result.emotion_name == "Pity"
    assert result.vac_vector[2] < 0  # Negative Connection
    
    # Input: "I feel with them" (Compassion)
    compassion_vac = [0.5, 0.2, 0.9]
    compassion_text = "I understand their pain, I'm here for them."
    compassion_embedding = await embedding_service.generate_embedding(compassion_text)
    
    result = await mapper.find_nearest(
        vac_scalars=compassion_vac,
        text_embedding=compassion_embedding,
        word_count=len(compassion_text.split())
    )
    
    assert result.emotion_name == "Compassion"
    assert result.vac_vector[2] > 0.5  # Positive Connection
```

### Performance Benchmarks

```python
import time

async def benchmark_vector_search(session, iterations=100):
    """Benchmark vector similarity search performance"""
    
    query_embedding = [0.1] * 1536  # Dummy query
    
    start = time.time()
    for _ in range(iterations):
        await find_similar_moments(session, user_id, query_embedding, limit=10)
    end = time.time()
    
    avg_latency = (end - start) / iterations * 1000  # ms
    
    assert avg_latency < 50, f"Query too slow: {avg_latency}ms"
    print(f"Average query latency: {avg_latency:.2f}ms")
```

## Next Steps

Now that you understand vector search:
- **05-api-specification.md** - FastAPI endpoints for state and insight
- **06-quaternion-conversion.md** - VAC to quaternion mathematics
- **07-metrics-engine.md** - Elasticity and rigidity calculations
