# L.O.V.E. Stack — Current Functionality Technical Briefing

**Purpose:** Provide Google Deep Research with comprehensive context about the L.O.V.E. Stack's current architecture, emotional model, quaternion mathematics, data schemas, API contracts, and codebase structure — so it can produce a Software Requirements Specification (SRS) for adding **octonion support**.

**Patent Notice:** The VAC (Valence-Arousal-Connection) model and quaternion-based emotional mapping system are the subject of U.S. Provisional Patent Application No. 63/962,600. Inventor: Jason Robert Gochanour.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [The VAC Emotional Model](#3-the-vac-emotional-model)
4. [Quaternion Mathematics — The Versor Engine](#4-quaternion-mathematics--the-versor-engine)
5. [Observer — Data Persistence & Enrichment](#5-observer--data-persistence--enrichment)
6. [Listener — Ingestion & Semantic Analysis](#6-listener--ingestion--semantic-analysis)
7. [Experience — 3D Visualization Frontend](#7-experience--3d-visualization-frontend)
8. [PersonaPlex — Voice Mode](#8-personaplex--voice-mode)
9. [API Contracts & Data Flow](#9-api-contracts--data-flow)
10. [Database Schema](#10-database-schema)
11. [Complete Inventory of Quaternion Touchpoints](#11-complete-inventory-of-quaternion-touchpoints)
12. [Technology Stack](#12-technology-stack)
13. [Key Considerations for Octonion Extension](#13-key-considerations-for-octonion-extension)

---

## 1. Executive Summary

**L.O.V.E.** (Listener-Observer-Versor-Experience) is a multi-modal emotional intelligence platform. It processes human voice/text input, extracts a three-dimensional emotional vector (VAC), converts it to a 4D quaternion for singularity-free rotation, and visualizes the result as a living "Soul Sphere" in 3D space.

### Core Pipeline

```
Human Input (voice/text)
       ↓
[LISTENER] — Transcription + LLM-based VAC Extraction
       ↓ (3 floats: Valence, Arousal, Connection, each ∈ [-1, 1])
[OBSERVER] — Persistence, Embedding, Atlas Mapping, Metrics
       ↓ (calls Versor for VAC→Quaternion)
[VERSOR]  — Pure Quaternion Mathematics Engine
       ↓ (4 floats: w, x, y, z — unit quaternion)
[EXPERIENCE] — 3D Soul Sphere Visualization (Web/Three.js)
```

### Current Mathematical Model

| Layer | Dimensionality | Representation | Purpose |
|-------|---------------|----------------|---------|
| **Input** | 3D | VAC Vector `[V, A, C]` | Human-readable emotional coordinates |
| **Rotation** | 4D | Quaternion `[w, x, y, z]` | Singularity-free rotation & SLERP |
| **Embedding** | 384D | Semantic Vector | Natural language similarity search |

The system currently maps **3D → 4D** (VAC → Quaternion). Quaternions (ℍ) are 4-dimensional hypercomplex numbers with multiplication rules `i² = j² = k² = ijk = -1`. Octonions (𝕆) are 8-dimensional hypercomplex numbers that extend quaternions by adding four more imaginary units (e₁–e₇) but sacrifice associativity — `(ab)c ≠ a(bc)` in general.

---

## 2. System Architecture

### Module Decomposition

```
l_o_v_e/                          (monorepo)
├── listener/                     Python 3.12 / FastAPI   (Port 8002)
│   └── app/
│       ├── services/
│       │   ├── transcription.py       — faster-whisper (local STT)
│       │   ├── semantic_analyzer.py   — Ollama/Llama 3.1 (VAC extraction)
│       │   ├── pii_scrubber.py        — Transformers BERT NER
│       │   └── observer_client.py     — HTTP client → Observer
│       ├── workers/audio_processor.py — Redis/Arq async queue
│       └── models/vac_response.py     — Pydantic schemas
│
├── observer/                     Python 3.12 / FastAPI   (Port 8000)
│   └── app/
│       ├── models/
│       │   ├── emotion_definition.py  — 87 Atlas emotions (VAC + Quat + Embed)
│       │   ├── user_trajectory.py     — Time-series emotional journey
│       │   ├── multi_emotion_analysis.py — Deep Feeling (up to 3 concurrent)
│       │   ├── transition_strategy.py — Emotion-to-emotion pathfinding
│       │   └── clinical_alert.py      — Flooding/stuckness alerts
│       ├── services/
│       │   ├── math/quaternion_builder.py — VAC→Quaternion via Versor HTTP
│       │   ├── observer/pipeline.py    — 8-stage enrichment pipeline
│       │   ├── emotions/               — Atlas management
│       │   ├── chat/                   — WebSocket chat sessions
│       │   ├── clinical/              — Alert detection
│       │   └── analytics/             — Session analytics
│       └── repositories/              — SQLAlchemy data access
│
├── versor/                       Python 3.12 / FastAPI   (Port 8001)
│   └── app/
│       ├── core/
│       │   ├── quaternion.py          — Quaternion class (frozen dataclass)
│       │   ├── vac_model.py           — VACVector → Quaternion conversion
│       │   ├── transitions.py         — Angular distance, elasticity, flooding
│       │   ├── interpolation.py       — SLERP (via SciPy), smoothing
│       │   └── factory.py             — Convenience builders
│       ├── api/
│       │   ├── models/                — Pydantic request/response schemas
│       │   └── routes/                — /versor/calculate, /versor/slerp
│       └── utils/
│           └── scipy_adapter.py       — Scalar-first ↔ scalar-last conversion
│
├── experience/                   Next.js 16 / React 19 / Three.js (Port 3000)
│   ├── shared/src/core/
│   │   ├── vac.ts                     — VACVector, Quaternion types, CANONICAL_EMOTIONS
│   │   ├── quaternion.ts              — vacToQuaternion, slerp, angularDistance, multiply
│   │   └── easing.ts                  — 24 easing functions
│   ├── web/
│   │   ├── shaders/
│   │   │   ├── vertex.glsl            — Arousal → geometry displacement (Simplex noise)
│   │   │   └── fragment.glsl          — Valence → color, Connection → Fresnel glow
│   │   ├── components/                — SoulSphere, EmotionalControls, VACDisplay, etc.
│   │   └── stores/                    — Zustand state (quaternion-centric)
│   └── docs/                          — 13 spec documents
│
├── personaplex/                  Python 3.10+ / NVIDIA Moshi (Port 8003)
│   └── app/                           — Full-duplex speech-to-speech
│
├── infra/                        Ansible, Podman, scripts
│   ├── bin/                           — setup, run, test, build, lint scripts
│   └── deploy/                        — Production deployment
│
└── docs/                         Architecture docs, patent, API reference
    ├── api-reference.md               — Complete REST API documentation
    ├── provisional_patent_application.md
    └── src/                           — MkDocs documentation site
```

### Inter-Service Communication

```
┌───────────┐   HTTP/REST   ┌───────────┐   HTTP/REST   ┌───────────┐
│  LISTENER │ ──────────▶   │  OBSERVER │ ──────────▶   │  VERSOR   │
│  :8002    │               │  :8000    │               │  :8001    │
└───────────┘               └─────┬─────┘               └───────────┘
                                  │ WebSocket
                                  ▼
                            ┌───────────┐
                            │EXPERIENCE │
                            │  :3000    │
                            └───────────┘
```

- **Listener → Observer**: HTTP POST to record analyzed emotional state
- **Observer → Versor**: HTTP POST for VAC→Quaternion conversion
- **Observer → Experience**: WebSocket broadcast of enriched state updates
- **Experience ↔ Observer**: Polling + WebSocket for real-time state

---

## 3. The VAC Emotional Model

### Three Dimensions

| Axis | Symbol | Range | Positive Pole | Negative Pole | Clinical Meaning |
|------|--------|-------|---------------|---------------|------------------|
| **Valence** | V | [-1, 1] | Pleasure / Joy | Displeasure / Pain | Hedonic tone |
| **Arousal** | A | [-1, 1] | High Energy | Low Energy / Calm | Activation level |
| **Connection** | C | [-1, 1] | Connected / Empathy | Disconnected / Isolation | Relational quality |

### Why Three Axes (Not Two)?

Traditional emotion models (Russell's Circumplex) use only **Valence** and **Arousal** (2D). This fails to distinguish:

| Emotion | V | A | C | Distinguishing Factor |
|---------|---|---|---|-----------------------|
| **Pity** | -0.3 | -0.2 | **-0.6** | Feeling FOR someone (separation) |
| **Compassion** | -0.3 | -0.2 | **+0.8** | Feeling WITH someone (alignment) |
| **Grief** | -0.9 | -0.4 | **+0.5** | Love persists despite pain |
| **Despair** | -0.9 | -0.4 | **-0.8** | Isolated suffering |

The **Connection axis is L.O.V.E.'s core innovation** — it captures the relational stance that 2D models collapse.

### 87-Emotion Atlas

The system includes 87 canonical emotions from Brené Brown's "Atlas of the Heart," organized into 12 categories:
- "When Life Is Good"
- "When Things Are Uncertain"
- "When We Compare"
- "When Things Don't Go As Planned"
- "When Things Fall Apart"
- "When We're Hurting"
- "When We Feel Wronged"
- "When We Self-Assess"
- "When We Search for Connection"
- "When the Heart Is Open"
- "When We Go With Others"
- "When We Feel Something Different"

Each emotion is stored with **three simultaneous representations**:
1. **VAC Vector** (3D) — for geometric spatial queries
2. **Quaternion** (4D) — for smooth rotational transitions
3. **Semantic Embedding** (384D) — for natural language similarity search

---

## 4. Quaternion Mathematics — The Versor Engine

The Versor module is a **stateless, pure-math microservice**. It has no database, no side effects — only deterministic mathematical computations.

### 4.1 Core Data Structures

#### Quaternion (Python — frozen dataclass)
```python
@dataclass(frozen=True)
class Quaternion:
    w: float  # Scalar component: cos(θ/2)
    x: float  # Vector i: sin(θ/2) * axis_x  → maps to Valence
    y: float  # Vector j: sin(θ/2) * axis_y  → maps to Arousal
    z: float  # Vector k: sin(θ/2) * axis_z  → maps to Connection

    # Convention: scalar-first [w, x, y, z]
    # Hamilton product: i²=j²=k²=ijk=-1
    # Constraint: w²+x²+y²+z²=1 (unit quaternion)
```

#### Quaternion (TypeScript — tuple)
```typescript
export type Quaternion = [number, number, number, number]; // [w, x, y, z]
```

#### VACVector (Python — dataclass)
```python
@dataclass
class VACVector:
    valence: float    # V ∈ [-1, 1]
    arousal: float    # A ∈ [-1, 1]
    connection: float # C ∈ [-1, 1]
```

### 4.2 VAC → Quaternion Conversion Algorithm

This is the core mathematical mapping from 3D emotional space to 4D rotation space.

**Algorithm:**

1. **Clamp** each VAC component to [-1, 1]
2. **Compute magnitude**: `||VAC|| = √(V² + A² + C²)` → Range: [0, √3]
3. **Handle zero vector**: If `||VAC|| < ε`, return identity quaternion `[1, 0, 0, 0]`
4. **Normalize axis**: `axis = VAC / ||VAC||` → unit direction vector
5. **Compute rotation angle**: `θ = π × (||VAC|| / √3)` → Range: [0, π]
6. **Construct quaternion via axis-angle formula**:
   ```
   w = cos(θ/2)
   x = axis_V × sin(θ/2)
   y = axis_A × sin(θ/2)
   z = axis_C × sin(θ/2)
   ```

**Key design decisions:**
- Linear magnitude-to-angle mapping: `||VAC||` ∈ [0, √3] → `θ` ∈ [0, π]
- Maximum rotation is π (half-turn) to avoid quaternion double-cover ambiguity
- Zero VAC → identity quaternion (neutral emotional state = no rotation)
- Always produces unit quaternion (no normalization needed after conversion)

### 4.3 Quaternion Operations

| Operation | Formula | Purpose |
|-----------|---------|---------|
| **Identity** | `[1, 0, 0, 0]` | Neutral emotional state |
| **Magnitude** | `√(w²+x²+y²+z²)` | Verify unit length |
| **Normalize** | `q / \|\|q\|\|` | Ensure unit quaternion |
| **Conjugate** | `[w, -x, -y, -z]` | Inverse rotation |
| **Dot Product** | `w₁w₂ + x₁x₂ + y₁y₂ + z₁z₂` | Similarity measure |
| **Multiply (Hamilton)** | 16 mults + 12 adds | Rotation composition |
| **SLERP** | `(sin((1-t)Ω)/sinΩ)·q₁ + (sin(tΩ)/sinΩ)·q₂` | Smooth interpolation |

**Hamilton Product (Multiplication) — The critical operation:**
```
w = w₁w₂ - x₁x₂ - y₁y₂ - z₁z₂
x = w₁x₂ + x₁w₂ + y₁z₂ - z₁y₂
y = w₁y₂ - x₁z₂ + y₁w₂ + z₁x₂
z = w₁z₂ + x₁y₂ - y₁x₂ + z₁w₂
```

**Key algebraic properties of quaternions used by the system:**
- **Associative**: `(q₁q₂)q₃ = q₁(q₂q₃)` ✅ (This is **not** true for octonions!)
- **Non-commutative**: `q₁q₂ ≠ q₂q₁` in general
- **Double-cover**: `q` and `-q` represent the same rotation
- **Unit quaternions**: Form the group SU(2), isomorphic to S³
- **Division algebra**: Every nonzero quaternion has a multiplicative inverse

### 4.4 Transition Calculations

**Transition Quaternion** (rotation from state A to state B):
```
q_transition = q_target × q_start⁻¹ = q_target × q_start*
```

**Angular Distance (φ)** — "Emotional Work":
```
φ = 2 × arccos(|w_transition|)    Range: [0, π]
```

Clinical interpretation:
- φ < 0.5 rad (28°): Minor shift
- φ = 1.0 rad (57°): Moderate transition
- φ > 2.0 rad (114°): Major shift, needs support
- φ > 2.8 rad (160°): Extreme, crisis risk

**Elasticity (E)** — Rate of emotional change:
```
E = φ / Δt    (radians per second)
```

**Flooding Detection:**
```
If E > 2.0 rad/s → flooding = true (emotional overwhelm)
```

**Dominant Axis Detection:**
Examines quaternion vector components `|x|, |y|, |z|` to determine which VAC dimension changed most:
- `|x|` largest → `VALENCE_SHIFT`
- `|y|` largest → `AROUSAL_SHIFT`
- `|z|` largest → `CONNECTION_SHIFT`
- All < 0.1 → `NEUTRAL`

### 4.5 SLERP Interpolation

The system generates smooth animation paths using **Spherical Linear Interpolation**:

```python
def generate_slerp_path(q_start, q_target, steps=60):
    # 1. Ensure shortest path (dot product check, negate if needed)
    # 2. Convert L.O.V.E. scalar-first → SciPy scalar-last
    # 3. Delegate to scipy.spatial.transform.Slerp
    # 4. Generate `steps` evenly-spaced frames
    # 5. Convert back to L.O.V.E. format
    # Returns: List[Quaternion] — 60 frames for 1-second animation
```

**Scalar Convention Handling:**
- L.O.V.E. uses **scalar-first**: `[w, x, y, z]`
- SciPy uses **scalar-last**: `[x, y, z, w]`
- A `scipy_adapter.py` handles bidirectional conversion

### 4.6 Exponential Smoothing

For noisy LLM outputs, a `smooth_transition()` function applies exponential moving-average via SLERP:
```python
smoothed = SLERP(q_previous, q_new, alpha=0.1)
# alpha=0.1 → 90% previous, 10% new (heavy smoothing)
```

---

## 5. Observer — Data Persistence & Enrichment

### 5.1 Eight-Stage Enrichment Pipeline

When a new emotional state arrives (`POST /observer/state`), the Observer runs this pipeline:

```
1. EMBEDDING    → Generate 384D semantic vector from input text (sentence-transformers)
2. ATLAS MAP    → Find nearest emotion in 87-emotion atlas (vector similarity)
3. QUATERNION   → Convert VAC → Quaternion via Versor HTTP API
4. TEMPORAL     → Calculate elasticity (E = θ/Δt) from previous state
5. RIGIDITY     → Compute rigidity score (R = 1/variance) from recent history
6. ALERT        → Check for flooding (E > 0.8) or stuckness (R > 3.0 + negative V)
7. PERSIST      → Store enriched state in user_trajectory table
8. BROADCAST    → Push update to Experience UI via WebSocket
```

### 5.2 Pre-Computed Path Matrix

The system pre-computes all 87×86 = 7,482 emotion-to-emotion transition paths:
- Each path includes SLERP waypoints, difficulty rating, and bridge emotion suggestions
- Computation takes 30–45 minutes via background job
- Results cached in PostgreSQL for instant retrieval

### 5.3 Multi-Emotion Analysis (Deep Feeling)

The Listener's "Deep Feeling" mode detects up to 3 concurrent emotions:
- Each gets its own VAC coordinates and prominence weight
- Inter-emotion relationships are classified (tension, reinforcement, contrast)
- An aggregate VAC is computed as a prominence-weighted blend
- Optional 3-way analysis: content-only vs. voice-only vs. blended

---

## 6. Listener — Ingestion & Semantic Analysis

### 6.1 Local-First Processing

All processing happens on-device (no cloud APIs):

| Stage | Technology | Latency |
|-------|-----------|---------|
| Transcription | faster-whisper (base.en, local) | ~500ms |
| PII Scrubbing | Transformers BERT NER | ~50ms |
| VAC Extraction | Ollama + Llama 3.1 8B (local LLM) | ~1-2s |
| **Total Pipeline** | | **~2-3s** |

### 6.2 Connection Axis Extraction

The LLM prompt uses chain-of-thought reasoning to extract the Connection axis:

```
System: Analyze text for relational stance.
  - If speaker feels FOR the subject (separation) → Connection < 0
  - If speaker feels WITH the subject (shared space) → Connection > 0

Examples:
  "I feel sorry for them" → Connection = -0.7 (pity, separation)
  "I'm here with them"    → Connection = +0.9 (compassion, alignment)
```

### 6.3 Prosody Features

Audio input also yields prosody data:
- `pitch_mean`, `pitch_std` — Voice pitch statistics
- `energy` — Voice loudness/force
- `jitter` — Voice instability measure

These can influence VAC extraction in 3-way blended analysis.

---

## 7. Experience — 3D Visualization Frontend

### 7.1 Soul Sphere Visual Language

The Soul Sphere is a 3D sphere rendered with custom GLSL shaders. Each VAC axis maps to a distinct visual property:

| VAC Axis | Visual Property | Implementation | Range |
|----------|----------------|----------------|-------|
| **Valence** | **Color** | Fragment shader: `mix(crimson, cyan, smoothstep(V))` | Crimson → Cyan |
| **Arousal** | **Geometry** | Vertex shader: Simplex noise displacement, freq/amp scaled by `|A|` | Smooth → Spiky |
| **Connection** | **Glow** | Fragment shader: Fresnel effect intensity scaled by `C+0.5` | Opaque → Glowing |

### 7.2 Quaternion Usage in Frontend

The Experience module uses quaternions for:
1. **State management** (Zustand store): Stores `currentQuaternion`, `targetQuaternion`, `previousQuaternion`
2. **SLERP animation**: Smoothly rotates Soul Sphere via `meshRef.current.quaternion.slerp(target, delta)`
3. **Angular distance**: Calculates transition difficulty for haptic feedback
4. **Angular velocity**: Monitors rate of change for flooding visual effects

### 7.3 Frontend Quaternion Math (TypeScript)

The `experience/shared/src/core/quaternion.ts` implements:
- `vacToQuaternion(vac)` — Local simplified conversion (authoritative version is Versor API)
- `slerp(q1, q2, t)` — Full SLERP with shortest-path correction
- `angularDistance(q1, q2)` — Transition magnitude
- `multiply(q1, q2)` — Hamilton product
- `conjugate(q)` — Inverse for unit quaternions
- `normalize(q)` — Ensure unit length
- `generateSlerpPath(start, end, steps)` — Animation frame sequence

### 7.4 Shader Uniforms

The shaders receive these uniforms:
```glsl
uniform float uTime;       // Animation time
uniform float uArousal;    // [-1, 1] → geometry displacement
uniform float uValence;    // [-1, 1] → color gradient
uniform float uConnection; // [-1, 1] → Fresnel glow intensity
uniform vec3 uColorNeg;    // Crimson (negative valence)
uniform vec3 uColorPos;    // Cyan (positive valence)
```

The shaders operate on the **scalar VAC values**, not on quaternions directly. Quaternions drive the **rotation/orientation** of the sphere mesh via Three.js's `Object3D.quaternion`.

---

## 8. PersonaPlex — Voice Mode

An optional module providing full-duplex speech-to-speech via NVIDIA's Moshi model:
- Three personas: **Lumina** (warm/empathetic), **Logos** (analytical), **Metis** (insightful)
- Operates independently of the text-based pipeline
- Currently does **not** use quaternion math directly
- Future enhancement: parallel voice + VAC emotion tracking

---

## 9. API Contracts & Data Flow

### 9.1 Versor API — `POST /versor/calculate`

**Request:**
```json
{
  "current_vac": { "valence": 0.9, "arousal": 0.7, "connection": 0.8 },
  "previous_state": { "w": 0.9, "x": 0.3, "y": 0.2, "z": 0.1 },
  "time_delta_seconds": 30.0
}
```

**Response:**
```json
{
  "current_state": { "w": 0.6, "x": 0.5, "y": 0.4, "z": 0.5 },
  "transition_quaternion": { "w": 0.9, "x": 0.2, "y": 0.2, "z": 0.3 },
  "angular_distance_radians": 0.31,
  "angular_distance_degrees": 17.8,
  "elasticity_metric": 0.42,
  "is_flooding": false,
  "insight_code": "V+",
  "interpolation_path": [ /* 20 quaternion frames */ ]
}
```

### 9.2 Versor API — `POST /versor/slerp`

**Request:**
```json
{
  "start_quaternion": { "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 },
  "target_quaternion": { "w": 0.7071, "x": 0.7071, "y": 0.0, "z": 0.0 },
  "steps": 60
}
```

**Response:**
```json
{
  "path": [ /* 60 quaternion frames */ ],
  "total_frames": 60,
  "angular_distance": 1.5708
}
```

### 9.3 Observer API — `POST /observer/state`

**Request:**
```json
{
  "user_id": "uuid",
  "session_id": "uuid",
  "vac_scalars": { "valence": -0.6, "arousal": 0.7, "connection": -0.3 },
  "input_text": "I'm worried about tomorrow",
  "confidence": 0.87
}
```

**Response:**
```json
{
  "state_id": "uuid",
  "dominant_emotion": { "id": "uuid", "name": "Anxiety", "vac": [-0.6, 0.7, -0.3] },
  "quaternion": { "w": 0.8, "x": 0.3, "y": 0.4, "z": 0.3 },
  "previous_quaternion": { "w": 0.9, "x": 0.2, "y": 0.3, "z": 0.2 },
  "metrics": {
    "elasticity": 0.42,
    "rigidity": 1.2,
    "angular_distance": 0.15,
    "alerts": []
  }
}
```

### 9.4 Common Types

```
VACVectorModel:  { valence: float, arousal: float, connection: float }  — all ∈ [-1, 1]
QuaternionModel: { w: float, x: float, y: float, z: float }           — unit quaternion
```

---

## 10. Database Schema

### 10.1 `emotion_definitions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `collection_id` | UUID | FK to `emotion_collections` |
| `emotion_name` | VARCHAR(100) | "Joy", "Shame", "Compassion", etc. |
| `category` | VARCHAR(100) | One of 12 categories |
| `definition` | TEXT | Lexicographical definition |
| **`vac_vector`** | **VECTOR(3)** | **[V, A, C] — pgvector 3D** |
| **`q_constant`** | **VECTOR(4)** | **[w, x, y, z] — pgvector 4D** |
| `semantic_embedding` | VECTOR(384) | sentence-transformers embedding |
| `haptic_pattern_id` | VARCHAR(50) | Vibration pattern reference |
| `color_hint` | VARCHAR(7) | Hex color |

### 10.2 `user_trajectory` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User reference (indexed) |
| `session_id` | UUID | Session grouping (indexed) |
| `timestamp` | TIMESTAMPTZ | Moment of state (indexed) |
| `input_transcription` | TEXT | PII-stripped text |
| `input_embedding` | VECTOR(384) | Semantic embedding |
| **`vac_values`** | **VECTOR(3)** | **[V, A, C]** |
| **`quaternion_state`** | **VECTOR(4)** | **[w, x, y, z]** |
| `dominant_emotion_id` | UUID | FK to `emotion_definitions` |
| `elasticity_metric` | FLOAT | E = θ / Δt |
| `rigidity_score` | FLOAT | R = 1 / variance |
| `context_metadata` | JSONB | Flexible context tags |

### 10.3 Indexes

- **B-tree**: `user_id`, `session_id`, `timestamp`, `dominant_emotion_id`
- **HNSW Vector**: `input_embedding` (cosine similarity), `vac_values` (L2 distance)

---

## 11. Complete Inventory of Quaternion Touchpoints

Every file/component that currently references quaternions and would need modification or extension for octonions:

### Backend (Python)

| Module | File | What It Does |
|--------|------|--------------|
| **Versor** | `app/core/quaternion.py` | `Quaternion` class: dataclass `(w,x,y,z)`, multiply, conjugate, normalize, dot, magnitude, from_axis_angle |
| **Versor** | `app/core/vac_model.py` | `VACVector.to_quaternion()`: 3D→4D conversion via axis-angle |
| **Versor** | `app/core/transitions.py` | `calculate_transition()`, `angular_distance()`, `calculate_elasticity()`, `detect_flooding()`, `detect_dominant_axis()` |
| **Versor** | `app/core/interpolation.py` | `generate_slerp_path()`, `ensure_shortest_path()`, `smooth_transition()` |
| **Versor** | `app/core/factory.py` | Convenience builders for quaternion creation |
| **Versor** | `app/utils/scipy_adapter.py` | Scalar-first ↔ scalar-last conversion for SciPy |
| **Versor** | `app/types.py` | Type aliases: `QuaternionComponents = tuple[float, float, float, float]` |
| **Versor** | `app/api/models/` | Pydantic schemas: `QuaternionModel`, `StateRequest`, `TrajectoryResponse`, `SLERPRequest` |
| **Versor** | `app/api/routes/` | REST endpoints: `/versor/calculate`, `/versor/slerp` |
| **Observer** | `app/models/emotion_definition.py` | `q_constant: Vector(4)` column |
| **Observer** | `app/models/user_trajectory.py` | `quaternion_state: Vector(4)` column |
| **Observer** | `app/services/math/quaternion_builder.py` | `QuaternionBuilder.from_vac()` → calls Versor HTTP API |
| **Observer** | `app/services/observer/pipeline.py` | Stage 3 of enrichment pipeline: VAC→Quaternion |
| **Observer** | `app/schemas/` | Pydantic response models with quaternion fields |
| **Observer** | `alembic/` | Database migrations defining Vector(4) columns |

### Frontend (TypeScript)

| Module | File | What It Does |
|--------|------|--------------|
| **Shared** | `shared/src/core/vac.ts` | `Quaternion` type: `[number, number, number, number]`, `IDENTITY_QUATERNION` |
| **Shared** | `shared/src/core/quaternion.ts` | `vacToQuaternion()`, `slerp()`, `angularDistance()`, `multiply()`, `conjugate()`, `normalize()`, `generateSlerpPath()` |
| **Web** | `web/stores/useExperienceStore.ts` | Zustand store: `currentQuaternion`, `targetQuaternion`, `previousQuaternion`, `setTarget()`, `updateCurrent()` |
| **Web** | `web/stores/useVisualizationStore.ts` | Visualization state with quaternion transitions |
| **Web** | `web/components/SoulSphere.ts` | Three.js mesh rotation via `quaternion.slerp()` |
| **Web** | `web/components/VACAnimator.ts` | Drives VAC → visual property animation |
| **Web** | `web/shaders/vertex.glsl` | Uses `uArousal` for displacement (not quaternion directly) |
| **Web** | `web/shaders/fragment.glsl` | Uses `uValence`, `uConnection` for color/glow (not quaternion directly) |

### Documentation

| File | Content |
|------|---------|
| `docs/provisional_patent_application.md` | Patent claims reference quaternion representation |
| `docs/api-reference.md` | API contract documentation for all quaternion fields |
| `experience/docs/08-state-management.md` | Frontend state management spec |
| `experience/docs/07-haptic-feedback-system.md` | Haptic feedback using angular distance |
| `versor/docs/` | 14 spec documents covering all quaternion math |
| `observer/docs/` | Observer architecture and processing pipeline |

---

## 12. Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12+ | All backend services |
| FastAPI | 0.115+ | REST API framework |
| Pydantic | 2.10+ | Schema validation |
| NumPy | 1.26+ | Vector operations (Versor) |
| SciPy | 1.13+ | SLERP implementation (Versor) |
| SQLAlchemy | 2.0+ | Async ORM (Observer) |
| PostgreSQL | 18+ | Primary database |
| pgvector | 0.6+ | Vector similarity search |
| sentence-transformers | 2.7+ | Semantic embeddings |
| Ollama | Local LLM | Llama 3.1 8B for VAC extraction |
| faster-whisper | Local STT | Audio transcription |
| Redis + Arq | Queue | Async job processing |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16 | Web framework (Turbopack) |
| React | 19.2 | UI library |
| React Three Fiber | 9.0-alpha | Three.js React bindings |
| Three.js | r170 | 3D rendering engine |
| Zustand | 5 | State management |
| TypeScript | 5.3 | Type safety |
| Tailwind CSS | 4 | Styling |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Podman/Docker | Containerization |
| Ansible | Production deployment |
| OpenTelemetry | Distributed tracing |
| Prometheus | Metrics |

---

## 13. Key Considerations for Octonion Extension

This section outlines the **structural and mathematical challenges** that the SRS should address. This is not a proposed solution — it identifies the problem space.

### 13.1 Mathematical Properties Lost

Octonions (𝕆) are the next Cayley-Dickson algebra after quaternions (ℍ):

| Property | Real (ℝ) | Complex (ℂ) | Quaternion (ℍ) | Octonion (𝕆) |
|----------|---------|-------------|----------------|--------------|
| Commutative | ✅ | ✅ | ❌ | ❌ |
| Associative | ✅ | ✅ | ✅ | **❌** |
| Alternative | ✅ | ✅ | ✅ | ✅ |
| Division algebra | ✅ | ✅ | ✅ | ✅ |
| Dimensions | 1 | 2 | 4 | **8** |
| Norm-preserving | ✅ | ✅ | ✅ | ✅ |

**Loss of associativity is the primary challenge.** Every operation that chains quaternion multiplications — transition calculation, SLERP composition, rotation composition — relies on `(ab)c = a(bc)`.

### 13.2 What Additional Dimensions Could Represent

Currently the system maps 3 emotional axes to 4 quaternion dimensions. Octonions have 8 dimensions (1 scalar + 7 imaginary). The SRS should consider what the additional 4 input dimensions could represent. Potential candidates:

- **Temporal dynamics** (rate of change, acceleration)
- **Contextual factors** (environmental, social)
- **Cognitive appraisal dimensions** (novelty, goal-relevance, coping potential)
- **Physiological correlates** (heart rate variability, skin conductance, respiration)
- **Multi-person emotional dynamics** (dyadic or group emotional fields)
- **Depth/layer** (surface emotion vs. core feeling)

### 13.3 Affected System Components

| Component | Impact | Reason |
|-----------|--------|--------|
| `Quaternion` class | **Major** — May need `Octonion` class with 8 components | Core data structure |
| `VACVector.to_quaternion()` | **Major** — Would need extended input model (>3 axes) and new conversion | Core algorithm |
| SLERP interpolation | **Major** — Generalized SLERP for octonions requires different mathematics | Non-associative algebra |
| Transition calculations | **Major** — Angular distance is defined differently on S⁷ vs S³ | Metric space changes |
| Hamilton product | **Major** — Octonion multiplication has 7 imaginary units with different sign tables | Multiplication table |
| SciPy adapter | **Major** — SciPy has no octonion support; would need custom or third-party library | Library gap |
| Database schema | **Moderate** — `Vector(4)` → `Vector(8)` for octonion columns | Schema migration |
| API contracts | **Moderate** — `{w,x,y,z}` → `{e0,e1,e2,e3,e4,e5,e6,e7}` | Contract change |
| Frontend types | **Moderate** — `[number, number, number, number]` → 8-tuple | Type change |
| Shaders | **Low** — Shaders use scalar VAC values, not quaternions directly | Indirect impact |
| Listener | **Low** — Would need expanded VAC extraction if >3 input axes | Only if input model changes |

### 13.4 Current Dependencies on Associativity

Places in the codebase that explicitly rely on quaternion associativity:

1. **`calculate_transition()`**: `q_trans = q_target × q_start⁻¹` — uses composition through multiply + conjugate
2. **`generate_slerp_path()`**: Delegates to SciPy's `Slerp` which internally chains rotations
3. **`smooth_transition()`**: Composes SLERP with previous state
4. **`ensure_shortest_path()`**: Relies on `q` and `-q` representing the same rotation (works for octonions too — norm-preserving)
5. **Three.js `meshRef.current.quaternion.slerp()`**: Built into the 3D engine's quaternion class
6. **All pre-computed path matrix**: 7,482 paths using SLERP chains

### 13.5 Potential Library Landscape

The SRS should research:
- Whether a Python octonion library exists with SLERP-equivalent operations
- How to handle interpolation on S⁷ (the 7-sphere) without associativity
- Whether the "alternative" property of octonions is sufficient for the operations needed
- Whether Moufang loops (the algebraic structure of unit octonions) provide the needed operations
- How Three.js / React Three Fiber can be extended to support 8D rotation (or if a higher-dimensional visualization strategy is needed)

### 13.6 Backward Compatibility

Any solution must:
- Continue supporting the existing 3-axis (V, A, C) model as a subset
- Allow quaternion-only mode for clients that don't need the extended dimensions
- Maintain the existing API contract alongside any new octonion endpoints
- Support database migration from `Vector(4)` to `Vector(8)` without data loss (the existing 4 components map to a subset of 8)
- Keep the Experience visualization working — the shader visual language (color/geometry/glow) is independent of the rotation representation

---

*This document was generated on 2026-03-26 from a comprehensive analysis of the L.O.V.E. codebase. It covers all modules, their interactions, mathematical foundations, data structures, and the complete quaternion touchpoint inventory to support creation of an SRS for octonion extension.*
