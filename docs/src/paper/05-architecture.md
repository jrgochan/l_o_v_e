# Section 5: System Architecture

## Meta

- Target length: 2.5 pages
- Key messages: Microservices design, four modules (Listener, Observer, Versor, Experience), data flow, privacy-first principles
- Status: Draft

---

## Content

### 5.1 Overview: The L.O.V.E. Stack

The L.O.V.E. Stack implements the VAC model as a microservices architecture designed for mental health applications. The acronym reflects the system's four independent modules:

- **L**istener: Sensory input (speech/text → VAC extraction)
- **O**bserver: Memory and context (data storage, pattern recognition, pathfinding)
- **V**ersor: Mathematical engine (quaternion calculations, smooth transitions)
- **E**xperience: Presentation layer (3D visualization, user interaction)

Each module is independently deployable, scalable, and maintainable, communicating via REST APIs.

### 5.2 Design Principles

#### 1. Privacy-First Architecture

All sensitive processing occurs locally:

- **No cloud LLM APIs**: Ollama runs locally for semantic analysis
- **Local transcription**: faster-whisper for speech-to-text
- **PII scrubbing**: Spacy NER removes personally identifiable information before storage
- **User data control**: Users own their data, can export or delete at any time

#### 2. Evidence-Based Design

Every therapeutic suggestion cites peer-reviewed research:

- 107 regulation strategies with evidence hierarchy (meta-analysis > RCT > clinical observation)
- Pathfinding respects psychological constraints (e.g., shame → self-compassion requires vulnerability)
- No "toxic positivity": System detects and avoids inappropriate emotional shortcuts

#### 3. Interpretability

VAC coordinates are human-understandable:

- $(V, A, C) = (0.5, 0.2, 0.9)$ ≈ "Compassion"
- Unlike neural network embeddings, VAC dimensions have clear semantic meaning
- Users can see their emotional trajectory in 3D space

#### 4. Modularity

Each service has a single responsibility:

- Listener: Extract VAC
- Observer: Store and query
- Versor: Calculate quaternions
- Experience: Visualize

This separation enables independent development, testing, and scaling.

### 5.3 Module Details

#### 5.3.1 Listener: The Sensory Cortex

**Purpose**: Transform human expression (audio/text) into VAC coordinates

**Technology Stack**:

- Python 3.11 + FastAPI (async API)
- faster-whisper (local speech-to-text)
- Ollama + Llama 3.1 8B (local LLM for semantic analysis)
- Spacy (PII scrubbing)
- Redis + Arq (async job queuing)

**Key Endpoints**:

```text
POST /listener/analyze
Input: { "text": "I feel their pain with them" }
Output: {
  "vac": {"valence": 0.0, "arousal": 0.3, "connection": 0.95},
  "emotion": "Empathy",
  "confidence": 0.92,
  "reasoning": "Deep resonance, feeling WITH..."
}

POST /listener/transcribe  
Input: { "audio_file": <binary> }
Output: { "text": "...", "duration_ms": 450 }

POST /listener/ingest
Input: { "audio_file": <binary> }
Output: Full pipeline (transcribe → analyze → sanitize)
```

**Workflow**:

1. **Transcription** (if audio): faster-whisper converts speech to text (~500ms for 10s audio)
2. **Semantic Analysis**: LLM extracts VAC coordinates using few-shot prompt (~1-2s)
3. **PII Scrubbing**: Spacy NER removes names, addresses, phone numbers
4. **Confidence Scoring**: LLM provides reasoning and confidence (0-1)
5. **Return**: VAC coordinates + metadata

**Critical Innovation**: Teaching the LLM to recognize the Connection axis through prompt engineering (see Section 6).

#### 5.3.2 Observer: The Hippocampus

**Purpose**: Memory, context, and therapeutic guidance

**Technology Stack**:

- Python 3.11 + FastAPI
- PostgreSQL 16 + pgvector (vector similarity search)
- SQLAlchemy (ORM)
- Alembic (migrations)

**Data Model**:

```sql
-- Canonical emotions (87 emotions from Brown's atlas)
CREATE TABLE atlas_definitions (
  id UUID PRIMARY KEY,
  emotion_name VARCHAR(100),
  category VARCHAR(100),
  vac_valence FLOAT CHECK (vac_valence BETWEEN -1 AND 1),
  vac_arousal FLOAT CHECK (vac_arousal BETWEEN -1 AND 1),
  vac_connection FLOAT CHECK (vac_connection BETWEEN -1 AND 1),
  vac_vector VECTOR(3),  -- pgvector for similarity search
  q_constant VECTOR(4),  -- Pre-calculated quaternion
  definition TEXT,
  notes TEXT
);

-- User emotional trajectory (high-volume)
CREATE TABLE user_trajectory (
  id UUID PRIMARY KEY,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  vac_values VECTOR(3),
  quaternion_state VECTOR(4),
  dominant_emotion_id UUID REFERENCES atlas_definitions,
  raw_text TEXT,  -- Sanitized
  confidence FLOAT,
  elasticity_metric FLOAT,  -- Speed of change
  session_id UUID
);

-- Evidence-based regulation strategies
CREATE TABLE strategies (
  id UUID PRIMARY KEY,
  strategy_name VARCHAR(200),
  description TEXT,
  evidence_level VARCHAR(50),  -- Meta-analysis, RCT, Clinical
  citations JSONB,  -- Array of DOIs/references
  applicable_emotions VARCHAR[],
  contraindications TEXT
);

-- HNSW index for fast nearest-neighbor search
CREATE INDEX ON user_trajectory 
  USING hnsw (vac_values vector_cosine_ops);
```

**Key Endpoints**:

```text
POST /observer/state
Input: { "vac": [0.5, 0.2, 0.9], "user_id": "..." }
Output: { "state_id": "...", "nearest_emotion": "Compassion" }

GET /observer/trajectory?user_id=...&limit=50
Output: [ {"timestamp": ..., "vac": ..., "emotion": ...}, ... ]

POST /observer/transition-path
Input: { "from_vac": [-0.7, -0.2, -0.8], "to_vac": [0.6, 0.1, 0.85] }
Output: {
  "path": ["Shame", "Vulnerability", "Self-Compassion"],
  "strategies": [...],
  "estimated_difficulty": 0.85
}

GET /observer/atlas/emotions?category=...
Output: All emotions in specified category
```

**Workflow**:

1. **State Recording**: Store incoming VAC + timestamp
2. **Nearest Emotion**: pgvector similarity search finds closest atlas emotion
3. **Pathfinding**: A* algorithm finds therapeutic path from current to goal state
4. **Strategy Selection**: Filters 107 strategies by applicability and evidence level
5. **Pattern Recognition**: Detects recurring emotional states or stuck points

**Critical Innovation**: A* pathfinding with psychological constraints (see Section 8).

#### 5.3.3 Versor: The Mathematical Engine

**Purpose**: Pure quaternion mathematics for smooth 3D transitions

**Technology Stack**:

- Python 3.11 + FastAPI
- NumPy (numerical operations)
- No database (stateless microservice)

**Key Endpoints**:

```text
POST /versor/vac-to-quaternion
Input: { "vac": [0.5, 0.2, 0.9] }
Output: { "quaternion": [0.866, 0.354, 0.236, 0.25] }

POST /versor/slerp
Input: {
  "q1": [0.866, 0.354, 0.236, 0.25],
  "q2": [0.707, 0.500, 0.433, 0.259],
  "frames": 60
}
Output: {
  "frames": [ [q0], [q1], ..., [q59] ],  // 60 quaternions
  "angular_distance": 0.523  // radians
}

POST /versor/calculate
Input: {
  "current_vac": [-0.7, -0.2, -0.8],
  "target_vac": [0.6, 0.1, 0.85]
}
Output: {
  "current_q": [...],
  "target_q": [...],
  "slerp_path": [...],
  "angular_distance": 1.89,
  "elasticity": 0.63,  // Speed metric
  "difficulty": 0.85  // Psychological challenge
}
```

**Algorithms**:

**VAC → Quaternion Conversion**:
$$\begin{align}
\theta &= \pi \cdot \frac{V + 1}{2} \\
\phi &= \pi \cdot \frac{A + 1}{2} \\
\psi &= \pi \cdot \frac{C + 1}{2} \\
\\
w &= \cos(\theta/2) \\
x &= \sin(\theta/2) \cdot \cos(\phi) \cdot \sin(\psi) \\
y &= \sin(\theta/2) \cdot \sin(\phi) \cdot \sin(\psi) \\
z &= \sin(\theta/2) \cdot \cos(\psi)
\end{align}$$

Then normalize to unit quaternion: $q = \frac{(w, x, y, z)}{||(w, x, y, z)||}$

**SLERP (Spherical Linear Interpolation)**:
$$q(t) = \frac{\sin((1-t)\Omega)}{\sin(\Omega)} q_1 + \frac{\sin(t\Omega)}{\sin(\Omega)} q_2$$

where $\Omega = \cos^{-1}(q_1 \cdot q_2)$ is the angular distance.

**Why Quaternions?**
- **No gimbal lock**: Euler angles fail at certain orientations
- **Smooth interpolation**: SLERP maintains constant angular velocity
- **Efficient**: 4 numbers vs. 9 for rotation matrix
- **Composable**: Multiply to combine rotations

**Critical Innovation**: Mapping 3D emotional space to 4D rotational space enables smooth visualization and animation.

#### 5.3.4 Experience: The Presentation Layer

**Purpose**: Real-time 3D visualization and user interaction

**Technology Stack**:
- TypeScript + Next.js 16
- React 19 + React Three Fiber
- Three.js (3D engine)
- Custom GLSL shaders
- Zustand (state management)

**Visual Mapping**:
- **Valence → Color**: Crimson ($V = -1$) to Cyan ($V = +1$)
- **Arousal → Geometry**: Smooth sphere ($A = -1$) to chaotic spikes ($A = +1$)
- **Connection → Glow/Opacity**: Opaque ($C = -1$) to luminous ($C = +1$)

**Key Components**:
```
<SoulSphere
  vac={[0.5, 0.2, 0.9]}
  quaternion={[0.866, 0.354, 0.236, 0.25]}
  slerpPath={[...]}  // 60-frame animation
  animationSpeed={0.016}  // 60fps
/>
```

**Workflow**:
1. **User Input**: Text or voice
2. **Call Listener**: Get VAC coordinates
3. **Call Observer**: Store state, get nearest emotion + path
4. **Call Versor**: Get quaternion + SLERP frames
5. **Render**: Animate Soul Sphere over 60 frames (1 second)
6. **Display**: Show emotion name, VAC coords, suggested strategies

**Critical Innovation**: Mapping abstract VAC coordinates to visceral 3D visual experience.

### 5.4 Data Flow: End-to-End Example

**Scenario**: User says "I feel so ashamed of myself"

```
1. User Input (Audio)
   ↓
2. Experience → Listener (POST /listener/ingest)
   ↓
3. Listener:
   - Transcribe: "I feel so ashamed of myself" (500ms)
   - Analyze: VAC = (-0.7, -0.2, -0.8) (1.5s)
   - Sanitize: Remove PII (if any)
   - Return: { vac: [-0.7, -0.2, -0.8], emotion: "Shame", confidence: 0.94 }
   ↓
4. Experience → Observer (POST /observer/state)
   ↓
5. Observer:
   - Store in user_trajectory table
   - pgvector search: Nearest = "Shame" (30ms)
   - Detect: High negative Connection (-0.8)
   - Call Versor for quaternion
   - Return: { state_id: "...", emotion: "Shame", suggested_path: [...] }
   ↓
6. Observer → Versor (POST /versor/calculate)
   ↓
7. Versor:
   - Convert VAC to quaternion: q1 = [0.123, -0.456, -0.789, 0.234]
   - If goal exists, generate SLERP path
   - Return: { quaternion: q1, ... } (10ms)
   ↓
8. Experience:
   - Render Soul Sphere with:
     * Color: Dark red (V = -0.7)
     * Geometry: Slightly jagged (A = -0.2)
     * Glow: Very dim (C = -0.8)
   - Animate rotation using quaternion
   - Display: "Shame" + suggested first step ("Practice vulnerability")
   ↓
9. User sees:
   - 3D sphere (dark, disconnected appearance)
   - Emotion label: "Shame"
   - Path suggestion: "Shame → Vulnerability → Self-Compassion"
   - Strategy: "Name your feelings without judgment (Linehan, 2015)"
```

**Total Latency**: ~2.5 seconds (transcription: 500ms, LLM: 1500ms, rest: 500ms)

### 5.5 Scalability and Deployment

**Development**: Native execution (Python virtual envs + Node)
```bash
cd infra
./run-love-stack.sh  # Starts all services
```

**Production**: Containerized with Podman/Docker
```yaml
# podman-compose.yml (simplified)
services:
  postgres:
    image: pgvector/pgvector:pg16

  redis:
    image: redis:7-alpine

  ollama:
    image: ollama/ollama

  versor:
    build: ./versor
    ports: ["8001:8001"]

  observer:
    build: ./observer
    ports: ["8000:8000"]
    depends_on: [postgres, versor]

  listener:
    build: ./listener
    ports: ["8002:8002"]
    depends_on: [redis, ollama]

  experience:
    build: ./experience/web
    ports: ["3000:3000"]
```

**Scaling Strategy**:
- **Versor**: Stateless → horizontal scaling (load balancer + multiple instances)
- **Listener**: GPU acceleration for Ollama → 10-100x speedup
- **Observer**: Read replicas for PostgreSQL, Redis cache for frequent queries
- **Experience**: CDN for static assets, server-side rendering

**Current Capacity**: ~100 concurrent users per instance  
**Bottleneck**: Ollama LLM inference (CPU-bound)  
**Future**: GPU deployment, model quantization, caching common queries

---

## Notes for LaTeX Conversion
- Figures to reference:
  - Figure 3: System architecture diagram (4 microservices + data flow)
  - Figure 4: Data flow sequence diagram (user input → 3D visualization)
- Citations needed:
  - Microservices architecture patterns
  - Privacy-preserving ML
  - Quaternion mathematics applications
- Math equations: VAC→quaternion conversion, SLERP formula
- Code blocks: API examples (pseudo-code, not full implementation)
- Tables: Technology stack comparison, latency breakdown

---

## Review Comments
- [Date] [Reviewer]: [Comment]
