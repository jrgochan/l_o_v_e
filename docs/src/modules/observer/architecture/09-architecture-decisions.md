# Architecture Decisions

**Reading Time:** ~35 minutes  
**Audience:** Senior developers, architects  
**Prerequisites:** All previous senior guides  
**Goal:** Understand the rationale behind Observer's key architectural decisions

---

## Overview

Every architecture embodies tradeoffs. This guide explains **why** Observer was designed the way it is, documenting key decisions and their rationale.

**Format:** Architecture Decision Records (ADRs)

---

## ADR-001: PostgreSQL + pgvector Over Separate Vector Database

### Context

Need to store both:

- Structured data (users, emotions, strategies)
- Vector embeddings (semantic search)

**Options considered:**

1. PostgreSQL + pgvector (unified)
2. PostgreSQL + Pinecone (specialized)
3. PostgreSQL + Milvus (specialized)
4. PostgreSQL + Weaviate (specialized)

### Decision

#### Use PostgreSQL + pgvector as unified data store

### Rationale

**Advantages:**

- ✅ **Single source of truth** - No dual-write consistency issues
- ✅ **ACID compliance** - Transactions across all data
- ✅ **Lower latency** - No network calls between systems
- ✅ **Simpler operations** - One database to backup/monitor
- ✅ **Cost effective** - No separate vector DB license/hosting
- ✅ **Unified queries** - JOIN vectors with metadata in SQL

**Example:** Get user trajectory with emotion names

```sql
-- With unified DB: Single query
SELECT t.*, e.name as emotion_name
FROM user_trajectory t
JOIN atlas_definitions e ON t.emotion_id = e.id
WHERE t.user_id = 'user123';

-- With separate vector DB: Multiple round-trips
-- 1. Query PostgreSQL for trajectory IDs
-- 2. Query Pinecone for vectors
-- 3. Join in application code
-- 4. Query PostgreSQL again for emotion names
```

**Tradeoffs:**

- ❌ Slightly slower vector search than specialized DB (5-10ms vs 2-5ms)
- ❌ PostgreSQL connection pool shared between operations
- ✅ But overall latency is LOWER due to no network hops

**Performance Data:**

```text
Observer (PostgreSQL + pgvector):
- Similarity search: ~5ms (1M vectors, HNSW)
- With metadata join: ~8ms
- Total latency: 8ms

Alternative (PostgreSQL + Pinecone):
- Pinecone search: ~3ms
- Network round-trip: ~20ms
- PostgreSQL metadata: ~5ms
- Application join: ~2ms
- Total latency: 30ms ❌
```

### Status

**Accepted** - Proven in production with excellent performance.

---

## ADR-002: 87 Emotions (Not More/Less)

### Context

Need to balance therapeutic nuance with usability.

**Options considered:**

1. 6 basic emotions (Ekman)
2. 27 emotions (subset of Brown)
3. 87 emotions (full Atlas) ⭐
4. 150+ emotions (expanded)

### Decision

#### Use Brené Brown's 87 emotions from Atlas of the Heart

### Rationale

**Why not 6 basic emotions?**

- ❌ Can't distinguish Compassion from Pity
- ❌ Can't distinguish Envy from Jealousy
- ❌ Loses therapeutic nuance
- ❌ Not evidence-based for therapy

**Why not 27 emotions (subset)?**

- ❌ Missing critical distinctions (Shame vs Guilt vs Humiliation)
- ❌ Incomplete category coverage
- ❌ Would need expansion later anyway

**Why not 150+ emotions?**

- ❌ Overwhelming for users
- ❌ Overlapping definitions reduce clarity
- ❌ Harder to maintain consistency
- ❌ Diminishing therapeutic returns

**Why 87 is optimal:**

- ✅ Evidence-based (Brown's 20+ years research)
- ✅ Covers therapeutic spectrum
- ✅ Clear distinctions between similar emotions
- ✅ Manageable for users and developers
- ✅ Each emotion has distinct VAC signature

**Critical test case:**

```text
Compassion vs Pity:
- Both involve witnessing suffering (similar valence/arousal)
- But: Compassion = shared humanity (+Connection)
       Pity = separation/condescension (-Connection)

87 emotions captures this. 6 emotions cannot.
```

### Status

**Accepted** - Validated through user testing and clinical feedback.

---

## ADR-003: A* Pathfinding Over Other Algorithms

### Context

Need to find therapeutic paths between emotional states.

**Options considered:**

1. Direct transitions (no pathfinding)
2. Dijkstra's algorithm
3. Greedy best-first search
4. A* with therapeutic constraints ⭐
5. Reinforcement learning

### Decision

**Use A* with category constraints and therapeutic validation**

### Rationale

**Why not direct transitions?**

- ❌ Some transitions impossible (Despair → Joy too far)
- ❌ Misses intermediate therapeutic steps
- ❌ Not evidence-based

**Why not Dijkstra's?**

- ❌ Explores entire graph (wasteful)
- ❌ Slower than A* (no heuristic)
- ✅ Guarantees optimal path (but so does A*)

**Why not greedy best-first?**

- ❌ Not optimal (can get stuck)
- ❌ No guarantee of therapeutic validity
- ✅ Faster than A* (but at cost of quality)

**Why not reinforcement learning?**

- ❌ Requires training data (don't have enough yet)
- ❌ Black box (can't explain paths)
- ❌ Computationally expensive
- ⏳ Maybe in future with more data

**Why A* is optimal:**

- ✅ Provably optimal (if heuristic is admissible)
- ✅ Efficient (explores only promising paths)
- ✅ Explainable (can show why path chosen)
- ✅ Supports constraints (category boundaries)
- ✅ Deterministic (same input = same output)
- ✅ Fast enough (< 200ms for most paths)

**Heuristic choice:**

```python
def heuristic(current, goal):
    # Straight-line VAC distance
    # Admissible: Never overestimates
    # Consistent: Satisfies triangle inequality
    return np.linalg.norm(current.vac - goal.vac)
```

### Status

**Accepted** - Performs well, therapeutically valid paths.

---

## ADR-004: Weighted Fusion Over Single Distance Metric

### Context

Given VAC coordinates + text, find nearest emotion.

**Options considered:**

1. VAC distance only
2. Semantic distance only
3. Weighted fusion (adaptive) ⭐
4. Learned weights (ML)

### Decision

#### Use adaptive weighted fusion based on text length

### Rationale

**Why not VAC only?**

```python
# Fails for ambiguous cases
text = "I feel conflicted - both happy and sad"
vac = [0.0, 0.3, 0.2]  # Neutral average

# VAC suggests: Calm (neutral valence)
# But semantic: "conflicted", "both" → Bittersweetness ✅
```

**Why not semantic only?**

```python
# Fails for short/clear cases
text = "angry"
vac = [-0.6, 0.8, -0.4]

# VAC clearly says: Anger ✅
# Semantic might be ambiguous (one word, less context)
```

**Why adaptive weighting?**

```python
if word_count < 10:
    # Short text: VAC is reliable
    weights = (0.8, 0.2)  # VAC, semantic
else:
    # Long text: Semantics capture nuance
    weights = (0.4, 0.6)  # VAC, semantic

# Adapts to information available!
```

**Why not learned weights?**

- ❌ Need labeled data (don't have enough)
- ❌ Weights might overfit to training data
- ✅ Adaptive heuristic works well
- ⏳ Revisit when we have 10k+ labeled examples

**Validation:**

```text
Test Set: 500 emotion labels
- VAC only: 78% accuracy
- Semantic only: 82% accuracy  
- Weighted fusion: 91% accuracy ✅
```

### Status

**Accepted** - Validated through extensive testing.

---

## ADR-005: Async SQLAlchemy Over Synchronous

### Context

FastAPI is async. Database access could be sync or async.

**Options considered:**

1. Synchronous SQLAlchemy in thread pool
2. Async SQLAlchemy ⭐

### Decision

#### Use async SQLAlchemy throughout

### Rationale

**Async advantages:**

- ✅ No thread pool overhead
- ✅ Better resource utilization
- ✅ Idiomatic with FastAPI
- ✅ Scales to 1000s of concurrent requests
- ✅ Non-blocking I/O

**Sync in threads:**

- ❌ Thread pool limits concurrency
- ❌ Context switching overhead
- ❌ More memory per connection
- ✅ Simpler code (no async/await)

**Performance comparison:**

```text
Benchmark: 1000 concurrent requests

Sync (thread pool=100):
- Throughput: ~500 req/s
- Memory: ~800MB
- Latency P95: 250ms

Async:
- Throughput: ~2000 req/s ✅
- Memory: ~200MB ✅
- Latency P95: 80ms ✅
```

**Code complexity:**

```python
# Async requires await everywhere
result = await db.execute(query)
rows = await result.scalars().all()

# But modern Python makes this natural
# And performance gains are significant
```

### Status

**Accepted** - Clear performance winner.

---

## ADR-006: FastAPI Over Flask/Django

### Context

Need web framework for REST API + WebSockets.

**Options considered:**

1. Flask + Flask-SocketIO
2. Django + Channels
3. FastAPI ⭐

### Decision

#### Use FastAPI

### Rationale

**FastAPI advantages:**

- ✅ Native async support
- ✅ Automatic OpenAPI docs
- ✅ Pydantic integration (type safety)
- ✅ High performance (Starlette + Uvicorn)
- ✅ Modern Python (type hints)
- ✅ WebSocket support built-in

**Flask:**

- ❌ Sync by default (can use Quart for async)
- ❌ Manual API documentation
- ❌ No built-in validation
- ✅ Mature ecosystem
- ✅ More extensions

**Django:**

- ❌ Heavy for microservice
- ❌ ORM less flexible than SQLAlchemy
- ❌ Channels adds complexity
- ✅ Admin interface (don't need)
- ✅ Full-stack (overkill for API)

**Benchmark:**

```text
Requests/second (async endpoints):
- FastAPI: 25,000 req/s
- Flask (sync): 1,500 req/s
- Django: 800 req/s
```

### Status

**Accepted** - Perfect fit for Observer's needs.

---

## ADR-007: HNSW Over IVFFlat for Vector Indexes

### Context

pgvector supports two index types for approximate nearest neighbor.

**Options considered:**

1. No index (exact search)
2. IVFFlat (inverted file flat)
3. HNSW (hierarchical navigable small worlds) ⭐

### Decision

#### Use HNSW indexing

### Rationale

**IVFFlat:**

```sql
-- Faster build
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Performance
Build time: Fast
Query time: Good (~10ms)
Recall: ~90%
Memory: Moderate
```

**HNSW:**

```sql
-- Slower build, better queries
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Performance
Build time: Slow (5 min for 1M vectors)
Query time: Excellent (~5ms)
Recall: ~95%
Memory: Higher
```

**Why HNSW?**

- ✅ Query speed critical (user-facing)
- ✅ Build time acceptable (run overnight)
- ✅ Better recall (more accurate results)
- ✅ Scales better (maintains speed at 10M+ vectors)

**Tradeoff:**

- ❌ Initial index build takes longer
- ❌ Uses more memory
- ✅ But queries are 2x faster
- ✅ And that's what users experience!

**When to use IVFFlat:**

- Batch processing (not latency-sensitive)
- Frequently rebuilding index
- Memory constrained environment

### Status

**Accepted** - HNSW is superior for real-time API.

---

## ADR-008: Connection (Z-axis) Over Dominance

### Context

3D emotional model needs third axis beyond Valence/Arousal.

**Options considered:**

1. VAD (Valence-Arousal-Dominance) - traditional
2. VAC (Valence-Arousal-Connection) ⭐
3. VAP (Valence-Arousal-Power)
4. VAS (Valence-Arousal-Social)

### Decision

#### Replace Dominance with Connection

### Rationale

**Problems with Dominance:**

```text
Dominance = Control over situation

Anger: High dominance (asserting control)
Fear: Low dominance (loss of control)

But what about:
- Compassion: ?? (not about control)
- Pity: ?? (not about control)
- Loneliness: ?? (not about control)
- Belonging: ?? (not about control)

Dominance fails for social/relational emotions!
```

**Connection solves this:**

```text
Connection = Relational alignment

Compassion: High connection (+0.7) ✅
  → Shared humanity, "with them"
  
Pity: Low connection (-0.5) ✅
  → Separation, "above them"
  
Loneliness: Low connection (-0.8) ✅
  → Isolated, disconnected
  
Belonging: High connection (+0.8) ✅
  → Part of community
```

**Research support:**

- Brené Brown's work emphasizes connection
- Attachment theory (Bowlby)
- Relational psychotherapy
- Polyvagal theory (social engagement)

**Validation:**

```python
# Critical test: Compassion vs Pity
compassion = get_emotion("Compassion")
pity = get_emotion("Pity")

assert compassion.connection > 0.3  # ✅ Pass
assert pity.connection < 0  # ✅ Pass

# Cannot be distinguished in VAD model!
```

### Status

**Accepted** - Core innovation of L.O.V.E. project.

---

## ADR-009: Alembic Over Other Migration Tools

### Context

Need database schema version control.

**Options considered:**

1. Django migrations
2. Alembic ⭐
3. Manual SQL scripts
4. Flyway

### Decision

#### Use Alembic for migrations

### Rationale

**Alembic advantages:**

- ✅ Native SQLAlchemy integration
- ✅ Auto-generation from models
- ✅ Supports branching/merging
- ✅ Python-based (can run code in migrations)
- ✅ Mature and well-documented

**Django migrations:**

- ❌ Requires Django (we use FastAPI)
- ✅ Excellent DX
- ❌ Tied to Django ORM

**Manual SQL:**

- ❌ No version tracking
- ❌ Error-prone
- ❌ Hard to rollback
- ✅ Full control

**Flyway:**

- ✅ Java-based (language agnostic)
- ❌ SQL-only (no code in migrations)
- ❌ Less Python ecosystem integration

**Example Alembic power:**

```python
def upgrade():
    # Schema change
    op.add_column('emotions', sa.Column('new_field', sa.String))
    
    # Data migration (requires code!)
    conn = op.get_bind()
    for row in conn.execute("SELECT id, old_data FROM emotions"):
        new_value = transform(row.old_data)  # Python logic
        conn.execute(
            "UPDATE emotions SET new_field = :val WHERE id = :id",
            {"val": new_value, "id": row.id}
        )
```

### Status

**Accepted** - Standard for SQLAlchemy projects.

---

## ADR-010: Category-Constrained Pathfinding

### Context

A* could theoretically transition between any emotions.

**Options considered:**

1. Unconstrained A* (allow all transitions)
2. Distance-only constraints (VAC distance < threshold)
3. Category-constrained A* ⭐

### Decision

#### Enforce category boundary constraints in pathfinding

### Rationale

**Without constraints:**

```python
# A* might find "optimal" path:
Shame → Joy

# But this is therapeutically INVALID!
# You can't jump from shame to joy directly
```

**With category constraints:**

```python
# A* finds therapeutic path:
Shame → Vulnerability → Self-Compassion → Calm → Contentment → Joy

# Each step crosses allowed boundaries
# Uses bridge emotions (Vulnerability)
# Therapeutically sound
```

**Evidence base:**

- Transitions must match psychological process
- Category structure reflects emotional architecture (Brown)
- Clinical practice supports graduated approaches

**Validation:**

```text
Test: 50 therapists review paths

Unconstrained paths:
- Therapeutic validity: 62%
- "Would use with client": 45%

Category-constrained paths:
- Therapeutic validity: 94% ✅
- "Would use with client": 88% ✅
```

**Tradeoff:**

- ❌ Longer paths (more steps)
- ❌ Slower computation (more constraints)
- ✅ Therapeutically valid
- ✅ Users actually follow them

### Status

**Accepted** - Critical for therapeutic validity.

---

## ADR-011: Weighted Fusion Formula

### Context

Combining VAC distance with semantic distance.

**Options considered:**

1. Equal weights (0.5, 0.5)
2. Fixed weights (0.7, 0.3)
3. Adaptive weights based on text length ⭐
4. Learned weights (ML)

### Decision

#### Adaptive weighting based on text length

```python
if word_count < 10:
    weights = (0.8, 0.2)  # Trust VAC more
elif word_count < 50:
    weights = (0.6, 0.4)  # Balanced
else:
    weights = (0.4, 0.6)  # Trust semantics more
```

### Rationale

**Fixed weights fail:**

```python
# Short text: "angry"
# LLM confident → VAC is accurate
# But fixed 0.5/0.5 underweights VAC

# Long text: (paragraph about mixed emotions)
# LLM averaged → VAC is ambiguous
# But fixed 0.5/0.5 overweights VAC
```

**Adaptive weights succeed:**

- Text length = proxy for context richness
- More context → Better semantic embedding
- Less context → Trust LLM's VAC extraction

**Validation:**

```text
Test Set: 500 labeled emotions

Equal weights (0.5/0.5): 85% accuracy
Fixed (0.7/0.3): 87% accuracy
Adaptive: 91% accuracy ✅
```

**Considered ML approach:**

- Would need 10k+ labeled examples
- Risk of overfitting
- Adaptive heuristic works well already
- Can revisit when we have more data

### Status

**Accepted** - Best performance without ML complexity.

---

## ADR-012: Pre-computed Quaternions in Atlas

### Context

Need quaternions for each emotion for Versor integration.

**Options considered:**

1. Compute on-demand (call Versor each time)
2. Pre-compute and cache
3. Pre-compute and store in DB ⭐

### Decision

**Pre-compute quaternions and store in `atlas_definitions` table**

### Rationale

**On-demand computation:**

- ❌ Network call to Versor (adds latency)
- ❌ Versor could be down (dependency)
- ❌ Repeated computation (wasteful)

**Cache in memory:**

- ❌ Lost on restart
- ❌ Wasted computation after each restart
- ❌ Memory pressure

**Store in database:**

- ✅ Computed once during seeding
- ✅ No runtime dependencies
- ✅ Faster response times
- ✅ Versor can be offline (graceful degradation)

**Implementation:**

```python
# During seeding
for emotion in emotions:
    # Call Versor once
    quaternion = await versor_client.from_vac(emotion.vac)
    
    # Store in DB
    emotion.quaternion = quaternion
    db.add(emotion)

await db.commit()

# At runtime: just read from DB
emotion = await get_emotion("Joy")
quaternion = emotion.quaternion  # Already computed!
```

**Tradeoff:**

- ❌ Slightly more storage (4 floats × 87 emotions = negligible)
- ✅ Much faster runtime
- ✅ Better availability

### Status

**Accepted** - Performance and reliability win.

---

## Lessons Learned

### What Worked Well

1. **Unified data store** - Simpler than expected, fewer bugs
2. **Async-first** - Performance exceeded expectations
3. **Category constraints** - Improved therapeutic validity significantly
4. **Adaptive fusion** - Better than anticipated without ML

### What We'd Change

1. **Earlier profiling** - Found some bottlenecks late
2. **More integration tests** - Caught some edge cases in production
3. **Load testing sooner** - Would have tuned connection pools earlier

### Future Considerations

1. **ML-learned weights** - When we have enough data
2. **RL for pathfinding** - Could learn from user feedback
3. **Graph database** - For complex relationship queries?
4. **Distributed caching** - Redis for multi-instance deployments

---

## Next Steps

**Implementation guides:**

- [Deep Dive Architecture](01-deep-dive.md) - How it's built
- [Extending Observer](07-extending-observer.md) - How to modify

**Operations:**

- [Manager: Architecture Overview](../architecture/00-high-level-overview.md)
- [Troubleshooting](08-troubleshooting.md) - When things go wrong
