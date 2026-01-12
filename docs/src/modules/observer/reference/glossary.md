# Glossary

**Audience:** All users  
**Goal:** Definitions of Observer-specific terminology

---

## Emotional Concepts

### Atlas of the Heart

Brené Brown's research-based map of 87 distinct human emotions, organized into 13 categories. The foundation of Observer's emotion recognition.

### Bridge Emotion

An emotion that facilitates difficult transitions between categories. Examples: Curiosity, Vulnerability, Self-Compassion. Used in A* pathfinding to create therapeutically valid paths.

### Category

One of the 13 semantic groupings of emotions (e.g., "When Life Is Good", "When We're Hurting"). Categories structure the emotional landscape and constrain valid transitions.

### Connection (C-axis)

The third axis in the VAC model, measuring relational alignment from -1 (isolated/separated) to +1 (connected/aligned). L.O.V.E.'s innovation replacing traditional "Dominance" axis.

### Elasticity

Speed of emotional change, calculated as angular distance divided by time: E = θ / Δt. High elasticity (> 2.0) may indicate emotional flooding.

### Rigidity

Resistance to emotional change, calculated as inverse variance of quaternions: R = 1 / Variance(q₁, q₂, ..., qₙ). High rigidity may indicate being "stuck."

### VAC Model

**V**alence-**A**rousal-**C**onnection: L.O.V.E.'s 3D emotional space model. Each emotion has precise coordinates [valence, arousal, connection] in this space.

### Valence (V-axis)

Pleasantness dimension from -1 (very unpleasant) to +1 (very pleasant). First axis of VAC model.

### Arousal (A-axis)

Energy/activation dimension from -1 (very calm/deactivated) to +1 (very energized/activated). Second axis of VAC model.

---

## Technical Terms

### A* (A-star)

Graph search algorithm used for finding optimal therapeutic paths between emotions. Combines actual cost (g-score) with heuristic estimate (h-score) to efficiently find best path.

### Admissible Heuristic

A heuristic function that never overestimates the cost to reach the goal. Required for A* to guarantee optimal paths. Observer uses straight-line VAC distance.

### Cosine Distance

Measure of angle between two vectors, used for semantic similarity. Formula: 1 - (a · b) / (||a|| × ||b||). Range [0, 2] for normalized vectors.

### Embedding

Dense vector representation of text in high-dimensional space (typically 384 or 1536 dimensions). Captures semantic meaning for similarity search.

### Euclidean Distance

Geometric distance in n-dimensional space. Used for VAC distance calculations: sqrt(Σ(aᵢ - bᵢ)²).

### HNSW (Hierarchical Navigable Small Worlds)

Graph-based algorithm for approximate nearest neighbor search. Used by pgvector for fast vector similarity queries. Provides ~95% recall at 10x speed improvement.

### Nearest Neighbor

The closest point(s) to a query in vector space. Observer uses this to find similar emotions or past moments.

### pgvector

PostgreSQL extension enabling vector operations. Supports vector storage, distance calculations, and HNSW indexing.

### Quaternion

4D number system (w, x, y, z) used to represent rotations without gimbal lock. Observer converts VAC coordinates to quaternions for 3D visualization.

### Semantic Similarity

Measure of meaning similarity between texts, calculated using embeddings and cosine distance. Used to find "you felt this way before" moments.

### SLERP (Spherical Linear Interpolation)

Smooth interpolation between quaternions, used by Versor module to animate emotional transitions on the Soul Sphere.

### Vector

Array of floating-point numbers representing a point in high-dimensional space. Used for embeddings (384D) and VAC coordinates (3D).

### Weighted Fusion

Observer's algorithm combining VAC distance with semantic distance using adaptive weights based on text length. Core innovation for emotion matching.

---

## Database Terms

### ACID

**A**tomicity, **C**onsistency, **I**solation, **D**urability. Properties guaranteed by PostgreSQL, ensuring data integrity.

### Alembic

Python-based database migration tool for SQLAlchemy. Manages schema version control and changes.

### Connection Pool

Set of reusable database connections maintained by SQLAlchemy. Reduces overhead of creating new connections for each request.

### Index

Database structure that speeds up queries. Observer uses B-tree indexes for exact lookups and HNSW indexes for vector similarity.

### Migration

Version-controlled database schema change. Observer uses Alembic to manage migrations.

### Partitioning

Dividing a large table into smaller physical pieces. Recommended for `user_trajectory` table when scaling to millions of rows.

### Row-Level Security (RLS)

PostgreSQL feature ensuring users can only access their own data. Implemented via policies on `user_trajectory` and chat tables.

### VACUUM

PostgreSQL maintenance operation that reclaims storage and updates statistics. Critical for maintaining performance.

---

## Pathfinding Terms

### Bootstrap Pattern

Pre-defined emotional journey template for common transitions (e.g., "anxiety_to_calm"). Provides starting point for personalized pathfinding.

### Category Constraint

Rule limiting which emotion categories can transition to which others. Ensures therapeutic validity of paths.

### Category Graph

Directed graph of allowed transitions between the 13 emotion categories. Used by A* to validate paths.

### Fallback Path

Simpler path used when A* fails to find optimal path. Typically direct transition with bridge emotions inserted.

### g-score

In A*, the actual cost from start to current node. For Observer, this is cumulative VAC distance with category penalties.

### h-score (Heuristic)

In A*, the estimated cost from current node to goal. Observer uses straight-line VAC distance (admissible heuristic).

### f-score

In A*, total estimated cost: f(n) = g(n) + h(n). Nodes with lowest f-score are explored first.

### Path Validation

Post-processing step that checks therapeutic validity, adds bridge emotions, and ensures arousal regulation.

### Waypoint

An emotion along a transition path. Each waypoint represents a step in the therapeutic journey.

---

## Service Terms

### ChatService

Service managing WebSocket chat sessions, message storage, and tone preferences.

### EmotionMapper

Service that finds nearest emotion from atlas using weighted fusion of VAC distance and semantic similarity.

### EmbeddingService

Service generating semantic embeddings for text, supporting local (sentence-transformers) or OpenAI providers.

### InsightGenerator

Service creating natural language insights in warm (empathetic) or clinical (professional) tones.

### MetricsCalculator

Service calculating elasticity and rigidity from quaternion trajectories.

### PathPlanner

Service implementing A* pathfinding for emotional transitions with therapeutic constraints.

### QuaternionBuilder

Service converting VAC coordinates to quaternions, either via Versor HTTP or local computation.

### StrategyRecommender

Service matching therapeutic strategies to emotional transitions based on patterns and evidence.

---

## Therapeutic Terms

### ACT (Acceptance and Commitment Therapy)

Evidence-based therapy emphasizing psychological flexibility and values-based action. Source of many Observer strategies.

### CBT (Cognitive Behavioral Therapy)

Therapy focusing on thought patterns and behaviors. Observer includes CBT techniques like cognitive restructuring.

### DBT (Dialectical Behavior Therapy)

Therapy emphasizing emotional regulation and distress tolerance. Observer includes DBT skills like opposite action.

### Deep Feeling Mode

Extended emotional exploration mode with layered questioning and deeper therapeutic inquiry.

### Evidence-Based Strategy

Therapeutic intervention supported by research (randomized controlled trials, meta-analyses). All 107 Observer strategies have research backing.

### Therapeutic Validity

Whether an emotional transition makes psychological sense and aligns with clinical practice. Validated by therapist review.

### Transition Strategy

Specific technique or practice to facilitate movement between emotional states. Examples: Deep Breathing, Cognitive Defusion, Grounding.

---

## System Terms

### AsyncSession

SQLAlchemy session supporting asynchronous database operations. All Observer database access uses async.

### Dependency Injection

FastAPI pattern where dependencies (like database sessions) are automatically provided to route functions.

### FastAPI

Modern Python web framework with automatic API documentation, async support, and type validation.

### Pydantic

Data validation library using Python type hints. Observer uses Pydantic for request/response schemas.

### Repository Pattern

Design pattern separating data access logic from business logic. Observer uses service layer instead.

### Service Layer

Design pattern where business logic lives in dedicated service classes, keeping API routes thin.

### SQLAlchemy

Python ORM (Object-Relational Mapper) for database access. Observer uses async SQLAlchemy 2.0.

### WebSocket

Protocol enabling full-duplex communication between client and server. Used for Observer's real-time chat.

---

## Metrics & Monitoring

### P50/P95/P99

Percentile latency metrics. P95 means 95% of requests complete faster than this time. Observer targets P95 < 100ms.

### Prometheus

Time-series database for metrics collection. Observer exports metrics for Prometheus scraping.

### Rate Limiting

Restricting number of requests per time window. Observer limits to 60 requests/minute per user.

### SLI (Service Level Indicator)

Measurable metric of service performance (e.g., latency, error rate).

### SLO (Service Level Objective)

Target value for SLI (e.g., P95 latency < 100ms).

### Uptime

Percentage of time service is available. Observer targets 99.9% (43 minutes downtime/month).

---

## Acronyms

**ACT:** Acceptance and Commitment Therapy  
**ADR:** Architecture Decision Record  
**API:** Application Programming Interface  
**CBT:** Cognitive Behavioral Therapy  
**DBT:** Dialectical Behavior Therapy  
**DBA:** Database Administrator  
**FFT:** Fast Fourier Transform (for cycle detection)  
**HNSW:** Hierarchical Navigable Small Worlds  
**JWT:** JSON Web Token  
**PITR:** Point-In-Time Recovery  
**RLS:** Row-Level Security  
**SLI:** Service Level Indicator  
**SLO:** Service Level Objective  
**SQL:** Structured Query Language  
**TLS:** Transport Layer Security  
**VAC:** Valence-Arousal-Connection  
**VAD:** Valence-Arousal-Dominance (traditional model)  
**WAL:** Write-Ahead Log

---

## Related Terms from Other Modules

### Listener

Module that ingests audio/text and extracts VAC coordinates using LLM analysis. Sends states to Observer for storage.

### Versor

Module that handles quaternion mathematics for 3D rotations. Observer can call Versor or use local computation.

### Experience

Module that visualizes emotional journeys in 3D (Soul Sphere). Queries Observer for trajectory data.

### Soul Sphere

3D visualization of emotional state as rotating sphere. Rendered by Experience module using quaternions from Observer.

---

## Quick Reference

**Common confusions:**

- **VAC vs VAD:** VAC uses Connection (relational), VAD uses Dominance (control)
- **Emotion vs Category:** 87 emotions grouped into 13 categories
- **Elasticity vs Rigidity:** Speed of change vs resistance to change
- **HNSW vs IVFFlat:** Both vector indexes, HNSW is faster for queries
- **Compassion vs Pity:** Both involve witnessing suffering, but Compassion has +Connection, Pity has -Connection

---

## Next Steps

**For API details:**

- [API Reference](api-reference.md)
- [Configuration](configuration.md)
- [Error Codes](error-codes.md)

**For concepts:**

- [Junior Dev: Key Concepts](../guides/03-key-concepts.md)
- [Senior Dev: Vector Search](../architecture/03-vector-search.md)
