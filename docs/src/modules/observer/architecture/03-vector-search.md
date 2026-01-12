# Vector Search Deep Dive

**Reading Time:** ~35 minutes  
**Audience:** Senior developers, ML engineers  
**Prerequisites:** [Database Architecture](02-database-architecture.md), understanding of embeddings  
**Goal:** Master vector similarity search, HNSW algorithm, and optimization techniques

---

## Overview

Observer uses **pgvector** for similarity search across:

- **87 emotions** (find semantically similar emotions)
- **User trajectories** (find "you felt this way before..." moments)
- **Therapeutic strategies** (match strategies to emotional states)

**Key innovation:** Weighted fusion of geometric (VAC) + semantic (embedding) distances.

---

## Vector Embeddings Fundamentals

### What Are Embeddings?

Embeddings are dense vector representations of text in high-dimensional space where **semantic similarity = geometric proximity**.

```python
# Example: sentence-transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

# Generate embeddings
text1 = "I feel compassionate toward others"
text2 = "I have pity for those struggling"
text3 = "The weather is nice today"

emb1 = model.encode(text1)  # [384 dimensions]
emb2 = model.encode(text2)  # [384 dimensions]
emb3 = model.encode(text3)  # [384 dimensions]

# emb1 and emb2 are CLOSE (similar meaning)
# emb3 is FAR from both (different topic)
```

### Choosing Embedding Dimensions

| Model | Dimensions | Use Case | Performance |
|-------|------------|----------|-------------|
| **all-MiniLM-L6-v2** | 384 | General purpose, fast | ✅ Observer default |
| **all-mpnet-base-v2** | 768 | Better accuracy | Slower |
| **OpenAI ada-002** | 1536 | High quality | API costs |
| **OpenAI 3-large** | 3072 | Best quality | Highest costs |

**Observer uses 384D** for:

- Fast similarity search
- Reasonable memory usage
- Good accuracy for emotional text

---

## Distance Metrics

### 1. Euclidean Distance (L2)

#### Geometric distance in n-dimensional space

```python
def l2_distance(a: np.array, b: np.array) -> float:
    """
    Euclidean (L2) distance
    
    Formula: sqrt(sum((a_i - b_i)²))
    """
    return np.linalg.norm(a - b)

# Example
a = np.array([0.5, 0.6, 0.7])
b = np.array([0.6, 0.7, 0.8])
distance = l2_distance(a, b)
# distance ≈ 0.173
```

**In PostgreSQL:**

```sql
SELECT name, embedding <-> '[0.5, 0.6, ...]'::vector as distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;
```

**Characteristics:**

- ✅ Intuitive geometric interpretation
- ✅ Works well for normalized vectors
- ❌ Sensitive to vector magnitude
- **Use for:** VAC coordinates (already normalized to [-1, 1])

### 2. Cosine Distance

#### Measures angle between vectors (ignores magnitude)

```python
def cosine_distance(a: np.array, b: np.array) -> float:
    """
    Cosine distance = 1 - cosine similarity
    
    Formula: 1 - (a · b) / (||a|| × ||b||)
    """
    similarity = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    return 1 - similarity

# Example
a = np.array([0.5, 0.6, 0.7])
b = np.array([1.0, 1.2, 1.4])  # Same direction, different magnitude
distance = cosine_distance(a, b)
# distance ≈ 0.0 (same direction!)
```

**In PostgreSQL:**

```sql
SELECT name, embedding <=> '[0.5, 0.6, ...]'::vector as distance
FROM atlas_definitions
ORDER BY distance
LIMIT 5;
```

**Characteristics:**

- ✅ Magnitude-invariant
- ✅ Best for semantic similarity
- ✅ Range [0, 2] for normalized vectors
- **Use for:** Text embeddings (semantic search)

### 3. Inner Product

#### Dot product (useful for maximum inner product search)

```python
def inner_product(a: np.array, b: np.array) -> float:
    """
    Inner product (dot product)
    
    Formula: sum(a_i × b_i)
    """
    return np.dot(a, b)
```

**In PostgreSQL:**

```sql
-- Note: pgvector returns negative inner product for sorting
SELECT name, embedding <#> '[0.5, 0.6, ...]'::vector as neg_inner_product
FROM atlas_definitions
ORDER BY neg_inner_product
LIMIT 5;
```

**Use for:** Pre-normalized vectors (unit length), maximum inner product search.

---

## HNSW Algorithm Explained

### What is HNSW?

**Hierarchical Navigable Small Worlds** - A graph-based approximate nearest neighbor algorithm.

**Key idea:** Build a multi-layer graph where:

- **Top layers** = Coarse navigation (skip list)
- **Bottom layer** = Fine-grained search (all points)

```text
Layer 2: •─────────────────•
         |                 |
Layer 1: •───•───────•─────•
         |   |       |     |
Layer 0: •─•─•─•─•─•─•─•─•─•  (all points)
```

### How HNSW Works

**1. Construction:**

```python
def build_hnsw(points, m=16, ef_construction=64):
    """
    Build HNSW index
    
    Args:
        points: List of vectors
        m: Max connections per node (default 16)
        ef_construction: Exploration during build (default 64)
    """
    graph = MultiLayerGraph()
    
    for point in points:
        # Assign layer (exponential decay)
        layer = assign_layer()  # Most points in layer 0
        
        # Find ef_construction nearest neighbors
        neighbors = search_layer(point, ef_construction)
        
        # Connect to m nearest neighbors
        connect(point, neighbors[:m])
        
        # Prune connections if needed
        prune_connections(point, m)
```

**2. Search:**

```python
def search_hnsw(query, k=5, ef_search=40):
    """
    Search HNSW index
    
    Args:
        query: Query vector
        k: Number of results
        ef_search: Exploration during search (default 40)
    """
    # Start from entry point (top layer)
    current = entry_point
    
    # Navigate down layers
    for layer in reversed(range(num_layers)):
        # Greedy search in current layer
        current = greedy_search(query, current, layer)
    
    # Final layer: explore ef_search candidates
    candidates = beam_search(query, current, ef_search)
    
    # Return k nearest
    return sorted(candidates)[:k]
```

### HNSW Parameters

**m (Max connections):**

```sql
-- Low m (8): Faster build, less memory, lower recall
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 8);

-- Medium m (16): Balanced (default)
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16);

-- High m (32): Slower build, more memory, higher recall
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 32);
```

**ef_construction (Build quality):**

```sql
-- Low (32): Fast build, lower quality
WITH (m = 16, ef_construction = 32);

-- Medium (64): Balanced (default)
WITH (m = 16, ef_construction = 64);

-- High (128): Slow build, best quality
WITH (m = 16, ef_construction = 128);
```

**ef_search (Query accuracy):**

```sql
-- Set per-session
SET hnsw.ef_search = 40;  -- Default: fast, ~95% recall
SET hnsw.ef_search = 100; -- Slower, ~98% recall
SET hnsw.ef_search = 200; -- Slowest, ~99% recall
```

### Performance Characteristics

| Dataset Size | Build Time (m=16) | Query Time (ef=40) | Memory |
|--------------|-------------------|--------------------|--------|
| 10K vectors | ~2 sec | < 1ms | ~5MB |
| 100K vectors | ~30 sec | ~2ms | ~50MB |
| 1M vectors | ~5 min | ~5ms | ~500MB |
| 10M vectors | ~60 min | ~10ms | ~5GB |

---

## Weighted Fusion Algorithm

**Observer's core innovation:** Combining geometric + semantic distances.

```python
class EmotionMapper:
    def find_nearest(
        self,
        vac: List[float],
        text: str,
        k: int = 5
    ) -> List[EmotionMatch]:
        """
        Weighted fusion of VAC distance and semantic distance.
        
        Short text: Trust VAC more (LLM gave clear signal)
        Long text: Trust semantics more (rich context)
        """
        # Generate embedding
        text_embedding = self.embedding_service.generate_embedding(text)
        
        # Get all emotions
        emotions = await self._load_atlas()
        
        # Calculate both distances
        results = []
        for emotion in emotions:
            # Geometric distance (L2 in 3D space)
            vac_dist = np.linalg.norm(
                np.array(vac) - np.array(emotion.vac)
            )
            
            # Semantic distance (cosine in 384D space)
            sem_dist = 1 - np.dot(text_embedding, emotion.embedding) / (
                np.linalg.norm(text_embedding) * 
                np.linalg.norm(emotion.embedding)
            )
            
            # Adaptive weighting
            word_count = len(text.split())
            if word_count < 10:
                # Short: Trust VAC
                vac_weight = 0.8
                sem_weight = 0.2
            elif word_count < 50:
                # Medium: Balanced
                vac_weight = 0.6
                sem_weight = 0.4
            else:
                # Long: Trust semantics
                vac_weight = 0.4
                sem_weight = 0.6
            
            # Final distance
            final_dist = (vac_weight * vac_dist) + (sem_weight * sem_dist)
            
            results.append(EmotionMatch(
                emotion=emotion,
                vac_distance=vac_dist,
                semantic_distance=sem_dist,
                final_distance=final_dist
            ))
        
        # Sort and return top k
        results.sort(key=lambda x: x.final_distance)
        return results[:k]
```

### Why This Works

#### Example 1: Short text

```python
text = "angry"  # 1 word
vac = [-0.6, 0.8, -0.4]  # Clear emotional signal

# VAC is reliable → Weight it 80%
# Semantic less reliable → Weight it 20%
```

#### Example 2: Long text

```python
text = "I'm feeling conflicted about my relationship with my coworker. \
On one hand, I appreciate their help, but on the other, I feel like \
they're being condescending. It's a complex mix of gratitude and resentment."

vac = [-0.2, 0.3, -0.1]  # Average of complex emotions

# VAC is ambiguous → Weight it 40%
# Semantic captures nuance → Weight it 60%
```

---

## Query Optimization

### 1. Pre-filtering Before Vector Search

```sql
-- ❌ BAD: Vector search on entire table
SELECT * FROM user_trajectory
ORDER BY embedding <=> query_vector
LIMIT 10;

-- ✅ GOOD: Pre-filter, then vector search
SELECT * FROM user_trajectory
WHERE user_id = 'user123'
  AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> query_vector
LIMIT 10;

-- Even better: Use CTE
WITH recent_emotions AS (
    SELECT * FROM user_trajectory
    WHERE user_id = 'user123'
      AND timestamp > NOW() - INTERVAL '30 days'
)
SELECT * FROM recent_emotions
ORDER BY embedding <=> query_vector
LIMIT 10;
```

### 2. Batch Processing

```python
async def find_similar_batch(queries: List[np.array], k: int = 5):
    """
    Process multiple queries in one transaction.
    Reduces connection overhead.
    """
    async with db.begin():
        results = []
        for query in queries:
            stmt = (
                select(AtlasDefinition)
                .order_by(AtlasDefinition.embedding.cosine_distance(query))
                .limit(k)
            )
            result = await db.execute(stmt)
            results.append(result.scalars().all())
        return results
```

### 3. Result Caching

```python
from cachetools import TTLCache

# Cache for frequent queries
similarity_cache = TTLCache(maxsize=1000, ttl=3600)

async def find_similar_cached(vac: List[float], text: str):
    # Create cache key
    cache_key = f"{tuple(vac)}:{hash(text)}"
    
    if cache_key in similarity_cache:
        return similarity_cache[cache_key]
    
    # Not cached: compute
    results = await find_similar(vac, text)
    
    # Cache for 1 hour
    similarity_cache[cache_key] = results
    return results
```

---

## Benchmarking Vector Search

### Measuring Query Performance

```python
import time
import numpy as np

async def benchmark_vector_search(
    db: AsyncSession,
    num_queries: int = 100
):
    """Benchmark vector search performance"""
    times = []
    
    for _ in range(num_queries):
        # Random query vector
        query = np.random.rand(384).astype(np.float32)
        query = query / np.linalg.norm(query)  # Normalize
        
        start = time.time()
        
        # Query
        result = await db.execute(
            select(AtlasDefinition)
            .order_by(AtlasDefinition.embedding.cosine_distance(query))
            .limit(10)
        )
        _ = result.scalars().all()
        
        elapsed = (time.time() - start) * 1000  # milliseconds
        times.append(elapsed)
    
    # Statistics
    print(f"Mean query time: {np.mean(times):.2f}ms")
    print(f"Median query time: {np.median(times):.2f}ms")
    print(f"95th percentile: {np.percentile(times, 95):.2f}ms")
    print(f"99th percentile: {np.percentile(times, 99):.2f}ms")
```

### Expected Performance

| Index | Table Size | P50 | P95 | P99 |
|-------|------------|-----|-----|-----|
| None | 10K | 50ms | 80ms | 100ms |
| HNSW | 10K | 1ms | 2ms | 3ms |
| HNSW | 100K | 2ms | 4ms | 6ms |
| HNSW | 1M | 5ms | 10ms | 15ms |
| HNSW | 10M | 10ms | 20ms | 30ms |

---

## Recall vs Speed Tradeoff

### Measuring Recall

```python
def measure_recall(
    db: AsyncSession,
    test_queries: List[np.array],
    k: int = 10
):
    """
    Compare HNSW results vs exact search.
    
    Recall = |HNSW ∩ Exact| / |Exact|
    """
    recalls = []
    
    for query in test_queries:
        # Exact search (no index)
        exact_ids = exact_search(query, k)
        
        # HNSW search
        hnsw_ids = hnsw_search(query, k)
        
        # Calculate recall
        overlap = len(set(exact_ids) & set(hnsw_ids))
        recall = overlap / k
        recalls.append(recall)
    
    avg_recall = np.mean(recalls)
    print(f"Average recall@{k}: {avg_recall:.2%}")
    return avg_recall
```

### Tuning for Use Case

```sql
-- High recall (slower, research/batch)
SET hnsw.ef_search = 200;  -- ~99% recall

-- Balanced (default, API)
SET hnsw.ef_search = 40;   -- ~95% recall

-- Low recall (fastest, suggestions)
SET hnsw.ef_search = 20;   -- ~90% recall
```

---

## Debugging Vector Search Issues

### Issue 1: Poor Recall

**Symptoms:** Results don't match expectations

**Diagnosis:**

```sql
-- Check index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'atlas_definitions';

-- Check ef_search setting
SHOW hnsw.ef_search;

-- Compare exact vs HNSW
-- Exact:
SELECT name FROM atlas_definitions
ORDER BY embedding <-> query_vector
LIMIT 10;

-- With HNSW (check if same results)
SET enable_seqscan = off;
SELECT name FROM atlas_definitions
ORDER BY embedding <-> query_vector
LIMIT 10;
```

**Solutions:**

- Increase `ef_search`
- Rebuild index with higher `ef_construction`
- Check vector normalization

### Issue 2: Slow Queries

**Symptoms:** Queries take > 50ms

**Diagnosis:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_trajectory
ORDER BY embedding <=> query_vector
LIMIT 10;

-- Look for:
-- - "Seq Scan" (bad - not using index)
-- - "Index Scan using hnsw" (good)
```

**Solutions:**

```sql
-- Force index use
SET enable_seqscan = off;

-- Check table stats are up to date
ANALYZE user_trajectory;

-- Rebuild index if corrupted
REINDEX INDEX idx_trajectory_embedding;
```

### Issue 3: Memory Issues

**Symptoms:** OOM errors during index build

**Solutions:**

```sql
-- Build index with lower maintenance_work_mem
SET maintenance_work_mem = '1GB';
CREATE INDEX ...;

-- Or build in batches
-- 1. Create table with no index
-- 2. Insert data in batches
-- 3. Create index at end
```

---

## Advanced Techniques

### Hybrid Search (Dense + Sparse)

**Combine vector search with full-text search:**

```sql
-- Create tsvector column
ALTER TABLE atlas_definitions 
ADD COLUMN description_tsv tsvector;

UPDATE atlas_definitions
SET description_tsv = to_tsvector('english', description);

CREATE INDEX idx_atlas_fts ON atlas_definitions 
USING gin(description_tsv);

-- Hybrid query
WITH vector_results AS (
    SELECT id, embedding <=> query_vector as distance
    FROM atlas_definitions
    ORDER BY distance
    LIMIT 20
),
text_results AS (
    SELECT id, ts_rank(description_tsv, query_tsv) as rank
    FROM atlas_definitions
    WHERE description_tsv @@ query_tsv
    ORDER BY rank DESC
    LIMIT 20
)
SELECT 
    a.*,
    COALESCE(v.distance, 999) as vec_score,
    COALESCE(t.rank, 0) as text_score,
    (0.7 * (1 - COALESCE(v.distance, 999))) + (0.3 * COALESCE(t.rank, 0)) as hybrid_score
FROM atlas_definitions a
LEFT JOIN vector_results v ON a.id = v.id
LEFT JOIN text_results t ON a.id = t.id
WHERE v.id IS NOT NULL OR t.id IS NOT NULL
ORDER BY hybrid_score DESC
LIMIT 10;
```

### Re-ranking

**Two-stage retrieval:**

1. **Stage 1:** Fast HNSW search (get top 100)
2. **Stage 2:** Expensive re-ranking (re-rank to top 10)

```python
async def search_with_reranking(query: str, k: int = 10):
    # Stage 1: Fast vector search
    candidates = await fast_search(query, k=100)
    
    # Stage 2: Re-rank with cross-encoder
    reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    pairs = [[query, cand.text] for cand in candidates]
    scores = reranker.predict(pairs)
    
    # Sort by re-ranking score
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [cand for cand, score in ranked[:k]]
```

---

## Next Steps

**Related guides:**

- [Database Architecture](02-database-architecture.md) - Index design
- [Performance Optimization](06-performance-optimization.md) - Query tuning
- [Troubleshooting](08-troubleshooting.md) - Debugging issues

**Dive deeper:**

- [Transition System](04-transition-system.md) - A* pathfinding
- [Deep Dive Architecture](01-deep-dive.md) - Service layer
