# L.O.V.E. Stack — API Reference

> **L**istener · **O**bserver · **V**ersor · **E**xperience  
> A multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Connection) model with quaternion mathematics.

---

## Overview

The L.O.V.E. stack exposes four independent FastAPI services. All services require a **Bearer JWT** token in the `Authorization` header (obtained via the Observer `/auth/login` endpoint) unless noted otherwise. Interactive Swagger documentation is available at `/docs` on each service.

| Service | Base URL | Port | Responsibility |
|---------|----------|------|----------------|
| **Observer** | `http://localhost:8000` | 8000 | Data persistence, emotion atlas, user management |
| **Versor** | `http://localhost:8001` | 8001 | Quaternion mathematics engine |
| **Listener** | `http://localhost:8002` | 8002 | Audio/text ingestion & emotion analysis |
| **PersonaPlex** | `http://localhost:8003` | 8003 | Voice mode (persona-conditioned speech-to-speech) |

---

## The VAC Model

All emotion processing is grounded in the **VAC coordinate system**, a three-dimensional space whose axes are:

| Axis | Range | Positive Pole | Negative Pole |
|------|-------|---------------|---------------|
| **V**alence | `[-1, 1]` | Pleasure / Joy | Displeasure / Pain |
| **A**rousal | `[-1, 1]` | High Energy | Low Energy / Calm |
| **C**onnection | `[-1, 1]` | Connected / Empathy | Disconnected / Isolation |

VAC coordinates are converted to **unit quaternions** `[w, x, y, z]` (scalar-first) for smooth 3-D interpolation and visualization. The Connection axis differentiates states that appear identical in classic valence-arousal circumplex models (e.g., Pity vs. Compassion).

### Temporal Metrics

Two higher-order metrics are derived from successive quaternion states:

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Elasticity (E)** | `E = θ / Δt` | Rate of emotional rotation (radians/sec) |
| **Rigidity (R)** | `R = 1 / variance` | Stability / resistance to change |

Alerts are raised automatically:

- `"flooding"` — Elasticity > 0.8 (emotional overwhelm)
- `"stuckness"` — Rigidity > 3.0 with negative valence (depression pattern)

---

## Authentication (Observer)

All protected endpoints require a JWT obtained from Observer's auth routes. Prefix every call with:

```
Authorization: Bearer <access_token>
```

### `POST /auth/login`

Authenticate and receive a bearer token.

**Request** — `application/x-www-form-urlencoded`

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | User's email address |
| `password` | string | User's password |

**Response `200 OK`**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "consent_required": true,          // optional – present when re-consent is needed
  "outstanding_policies": [ ... ]    // optional – list of pending consent policy objects
}
```

---

### `POST /auth/register`

Create a new user account. May be disabled server-side (`REGISTRATION_ENABLED=false`).

**Request** — JSON body (`UserCreate`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Registration email |
| `password` | string | ✅ | Must meet complexity requirements |
| `full_name` | string | ✅ | Display name |
| `consents` | array | ❌ | Pre-grant consent policies at registration time |

**Response `201 Created`** — `UserResponse` object.

---

### `POST /auth/refresh`

Issue a fresh access token. Accepts tokens expired within a 5-minute grace window.

**Response `200 OK`**

```json
{ "access_token": "<new_jwt>", "token_type": "bearer" }
```

---

## User Management (Observer)

### `GET /users/me`

Return the currently authenticated user's profile.

**Response** — `UserResponse` (id, email, full_name, role, is_active)

---

### `PUT /users/me`

Update profile fields (name and/or email). Cannot change role or password here.

**Request** — JSON (`UserProfileUpdate`)

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string | New display name |
| `email` | string | New email address |

---

### `PUT /users/me/password`

Change password. Requires current password for verification. New password must include uppercase, lowercase, digit, and special character (8+ chars).

**Request** — JSON (`PasswordChange`)

| Field | Type |
|-------|------|
| `current_password` | string |
| `new_password` | string |

---

### `DELETE /users/me`

Soft-delete the authenticated user's account. Data is retained for the configured GDPR retention period before purge. Reversible by an admin within the retention window.

---

### `GET /users/me/export`

Export all personal data as JSON (GDPR Article 20 portability). Includes profile, sessions, messages, emotional trajectory, and clinical alerts.

---

### `GET /users/me/sessions`

List the current user's chat sessions.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Max sessions to return |
| `offset` | int | 0 | Pagination offset |

---

## Emotion Atlas (Observer)

The Observer stores 87+ categorised emotions mapped to VAC coordinates and quaternions. The 12 categories are based on Brené Brown's emotional taxonomy.

### `GET /observer/emotions`

Retrieve the full emotion collection, optionally filtered.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category name |
| `collection_id` | UUID | Filter by collection (defaults to primary) |

**Response `200 OK`**

```json
{
  "total_count": 87,
  "emotions": [
    {
      "id": "uuid",
      "name": "Anxiety",
      "category": "When Things Are Uncertain",
      "definition": "...",
      "vac": [-0.6, 0.7, -0.3],
      "quaternion": [0.8, 0.3, 0.4, 0.3],
      "color_hint": "#ff6b6b",
      "movement_pattern": "spiral"
    }
  ]
}
```

*Latency: 15–30 ms*

---

### `GET /observer/categories`

Return all emotion categories with counts.

**Response `200 OK`**

```json
{
  "total_categories": 12,
  "categories": [
    { "name": "When Things Are Uncertain", "emotion_count": 13 }
  ]
}
```

*Latency: 5–10 ms*

---

### `GET /observer/emotions/{emotion_id}`

Retrieve a single emotion by UUID.

**Path Parameter** — `emotion_id` (UUID)

**Response `200 OK`** — Full emotion object (same shape as above).  
**Response `404 Not Found`** — Emotion does not exist.

*Latency: < 5 ms*

---

### `GET /observer/search`

Full-text search across emotion names and definitions.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ | Search term (case-insensitive `ILIKE`) |

**Response `200 OK`**

```json
{
  "query": "overwhelm",
  "result_count": 3,
  "emotions": [ ... ]
}
```

*Latency: 10–30 ms*

---

### `POST /observer/compute-all-paths`

Start a background job to pre-compute all 7,482 emotion-to-emotion transition paths. Runs asynchronously; returns immediately.

> [!NOTE]
> This is a heavy, long-running operation (30–45 minutes). Intended for initial setup or after VAC coordinate updates.

**Response `200 OK`**

```json
{
  "job_id": "uuid",
  "status": "pending",
  "total_paths": 7482,
  "estimated_time": "8-10 minutes"
}
```

---

### `GET /observer/computation-status/{job_id}`

Poll path computation progress.

**Response `200 OK`**

```json
{
  "job_id": "uuid",
  "status": "running",
  "percentage": 46.8,
  "completed_paths": 3500,
  "total_paths": 7482,
  "estimated_time_remaining": "~28 minutes"
}
```

Recommended poll interval: every 5–10 seconds.

---

### `GET /observer/paths/all`

Query the cached transition path matrix.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `difficulty` | `easy\|moderate\|difficult` | Filter by difficulty |
| `requires_bridge` | bool | Filter bridge paths only |
| `limit` | int | Max results |
| `offset` | int | Pagination offset |

---

### `GET /observer/statistics`

Cache health metrics for the path matrix.

**Response `200 OK`**

```json
{
  "total_cached": 7478,
  "completion_percentage": 99.9,
  "difficulty_distribution": { "easy": 2341, "moderate": 3892, "difficult": 1245 },
  "bridge_paths": 3456,
  "avg_waypoints": 2.3
}
```

---

### `DELETE /observer/paths/cache`

Clear all cached paths. Returns number of records deleted.

---

### `GET /observer/recommendations`

Intelligent, context-aware emotion exploration suggestions.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `context` | `exploration\|healing\|growth` | Recommendation context |
| `emotion_id` | UUID | Current emotion anchor (optional) |
| `selected_ids` | string | CSV of already-selected emotion UUIDs |
| `limit` | int | Results per category |

**Response `200 OK`**

```json
{
  "similar_emotions": [ ... ],
  "curated_journeys": [ ... ],
  "problematic_transitions": [ ... ],
  "complementary_suggestions": [ ... ]
}
```

*Latency: 30–60 ms*

---

## Emotional State Recording (Observer)

### `POST /observer/state`

**Primary ingestion endpoint.** Record a new emotional state for a user. Performs an 8-stage enrichment pipeline (embedding → atlas mapping → quaternion conversion → temporal metrics → alert detection → persistence → WebSocket broadcast) and returns the enriched result.

> [!IMPORTANT]
> The authenticated user must match `user_id` in the request body. Recording state on behalf of another user returns `403`.

**Request** — JSON (`StateInput`)

```json
{
  "user_id": "uuid",
  "session_id": "uuid",
  "vac_scalars": {
    "valence": -0.6,
    "arousal":  0.7,
    "connection": -0.3
  },
  "input_text": "I'm worried about tomorrow",
  "confidence": 0.87,
  "timestamp": "2026-01-02T22:00:00Z",
  "prosody_data": {
    "pitch_mean": 245.3,
    "pitch_std": 45.2,
    "energy": 0.78,
    "jitter": 4.1
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | UUID | ✅ | Must match authenticated user |
| `session_id` | UUID | ✅ | Session identifier |
| `vac_scalars` | object | ✅ | Valence, Arousal, Connection floats in `[-1, 1]` |
| `input_text` | string | ✅ | Source text (PII-scrubbed before storage) |
| `confidence` | float | ✅ | Confidence in the VAC estimate (0–1) |
| `timestamp` | datetime | ❌ | Defaults to server time |
| `prosody_data` | object | ❌ | Voice features from Listener (pitch, energy, jitter…) |

**Response `200 OK`** (`StateResponse`)

```json
{
  "state_id": "uuid",
  "dominant_emotion": {
    "id": "uuid",
    "name": "Anxiety",
    "category": "When Things Are Uncertain",
    "vac": [-0.6, 0.7, -0.3]
  },
  "quaternion": { "w": 0.8, "x": 0.3, "y": 0.4, "z": 0.3 },
  "previous_quaternion": { "w": 0.9, "x": 0.2, "y": 0.3, "z": 0.2 },
  "metrics": {
    "elasticity": 0.42,
    "rigidity": 1.2,
    "angular_distance": 0.15,
    "alerts": []
  },
  "timestamp": "2026-01-02T22:00:00Z"
}
```

*Total pipeline latency: 60–150 ms typical; target < 200 ms.*

---

### `GET /observer/current/{user_id}`

Fetch the most recent emotional state for a user.

**Path Parameter** — `user_id` (UUID)

**Response `200 OK`** — Same `StateResponse` shape as above.  
**Response `404 Not Found`** — No states recorded yet for this user.

*Latency: 10–20 ms*

---

### `GET /observer/history/{user_id}`

Retrieve time-series trajectory data for charting and analysis.

**Path Parameter** — `user_id` (UUID)

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `start_date` | datetime | — | Inclusive start filter |
| `end_date` | datetime | — | Inclusive end filter |
| `limit` | int | 100 | Max data points |

**Response `200 OK`**

```json
{
  "user_id": "uuid",
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-02T23:00:00Z",
  "data_points": 47,
  "trajectory": [
    {
      "timestamp": "2026-01-01T09:15:23Z",
      "vac": [-0.6, 0.7, -0.3],
      "quaternion": [0.8, 0.3, 0.4, 0.3],
      "emotion": "Anxiety",
      "elasticity": 0.42,
      "message_id": "uuid",
      "relationship_marker": { "type": "...", "target_id": "uuid", "count": 1 }
    }
  ]
}
```

*Latency: 20–100 ms depending on filters.*

---

### Observer Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe (checks DB, services) |

---

## Emotion Analysis (Listener)

The Listener performs transcription → PII scrubbing → LLM-based VAC extraction → Observer recording.

### `POST /listener/analyze`

**Synchronous text analysis.** Analyzes a plain-text string and returns VAC coordinates with a single dominant emotion. Also records to Observer automatically.

**Request** — `multipart/form-data`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | ✅ | — | Text to analyze |
| `user_id` | string | ❌ | `"demo-user"` | User identifier |
| `session_id` | string | ❌ | `"demo-session"` | Session identifier |

**Response `200 OK`**

```json
{
  "user_id": "demo-user",
  "session_id": "demo-session",
  "transcription": "I'm feeling overwhelmed but hopeful",
  "emotion": "Ambivalence",
  "category": "When Things Are Uncertain",
  "vac": { "valence": -0.1, "arousal": 0.5, "connection": 0.2 },
  "confidence": 0.82,
  "reasoning": "The speaker expresses simultaneous overwhelm and hope...",
  "processing_time_ms": 1843
}
```

*Latency: ~2 s*

**Example**
```bash
curl -X POST http://localhost:8002/listener/analyze \
  -H "Authorization: Bearer <token>" \
  -F "text=I'm feeling overwhelmed but hopeful"
```

---

### `POST /listener/analyze-multi-emotion`

**Synchronous multi-emotion text analysis (Deep Feeling mode).** Detects up to 3 concurrent emotions with inter-emotion relationships and an aggregate state. Optionally accepts prosody data from a prior `extract-audio-features` call for 3-way analysis.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✅ | Text to analyze |
| `prosody_data_json` | string | ❌ | JSON-encoded prosody dict (enables 3-way analysis) |
| `user_id` | string | ❌ | User identifier |
| `session_id` | string | ❌ | Session identifier |

**Response `200 OK`** (text-only)

```json
{
  "user_id": "demo-user",
  "session_id": "demo-session",
  "transcription": "I'm hopeful but also anxious",
  "processing_time_ms": 3200,
  "emotions": [
    {
      "emotion_name": "Hope",
      "category": "When Life Is Good",
      "vac": { "valence": 0.6, "arousal": 0.4, "connection": 0.5 },
      "confidence": 0.88,
      "prominence": 0.6
    },
    {
      "emotion_name": "Anxiety",
      "category": "When Things Are Uncertain",
      "vac": { "valence": -0.6, "arousal": 0.7, "connection": -0.3 },
      "confidence": 0.76,
      "prominence": 0.4
    }
  ],
  "relationships": [
    {
      "emotion_a": "Hope",
      "emotion_b": "Anxiety",
      "type": "tension",
      "strength": 0.7,
      "description": "Forward-looking optimism held alongside present-moment worry"
    }
  ],
  "aggregate_vac": { "valence": 0.1, "arousal": 0.55, "connection": 0.15 },
  "complexity_score": 0.68,
  "emotional_clarity": 0.72,
  "temporal_pattern": "oscillating",
  "reasoning": "..."
}
```

When `prosody_data_json` is supplied, the response additionally includes:

```json
{
  "prosody": { ... },
  "three_way_analysis": {
    "content_only": { ... },
    "voice_only": { ... },
    "blended": { ... },
    "discrepancy": {
      "content_primary": "Hope",
      "voice_primary": "Anxiety",
      "blended_primary": "Hope",
      "content_voice_distance": 0.43
    }
  }
}
```

*Latency: ~4 s (text-only) · ~12–16 s (3-way with prosody)*

---

### `POST /listener/analyze-audio`

**Synchronous audio analysis.** Accepts an audio file, transcribes it, extracts prosody features, and runs single-emotion semantic analysis. Perfect for interactive chat.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ✅ | Audio file (WAV, WebM, M4A, MP3, OGG, FLAC, AAC, WMA; max 50 MB) |
| `user_id` | string | ❌ | Defaults to `"admin"` |
| `session_id` | string | ❌ | Defaults to `"chat-session"` |

**Response `200 OK`**

```json
{
  "status": "success",
  "transcription": "...",
  "emotion": "Calm",
  "category": "When Life Is Good",
  "vac": { "valence": 0.5, "arousal": -0.3, "connection": 0.6 },
  "confidence": 0.91,
  "reasoning": "...",
  "prosody": {
    "pitch_mean": 198.4,
    "pitch_std": 22.1,
    "energy": 0.62,
    "jitter": 1.8
  },
  "processing_time_seconds": 2.8
}
```

*Latency: ~3 s*

---

### `POST /listener/analyze-audio-multi-emotion`

**Synchronous 3-way audio multi-emotion analysis (Deep Feeling mode).** Combines transcription, prosody extraction, and parallel content/voice/blended analysis in a single call. Detects up to 3 concurrent emotions.

**Request** — Same shape as `analyze-audio`.

**Response `200 OK`** — Same as `analyze-multi-emotion` with `three_way_analysis` block always present.

*Latency: ~12–16 s*

---

### `POST /listener/extract-audio-features`

**Fast feature extraction only** — transcription + prosody without full emotion analysis. Use this to obtain the prosody payload for a subsequent `analyze-multi-emotion` call, enabling a two-stage flow with faster initial feedback.

**Request** — `multipart/form-data` (same as `analyze-audio`)

**Response `200 OK`**

```json
{
  "status": "success",
  "transcription": "...",
  "prosody": {
    "pitch_mean": 245.3,
    "pitch_std": 45.2,
    "energy": 0.78,
    "jitter": 4.1
  },
  "processing_time_seconds": 0.9
}
```

---

### `POST /listener/ingest`

**Async ingestion** — queue an audio or text payload for background processing via Redis/Arq. Returns a `job_id` immediately.

> [!NOTE]
> Use this for batch processing. For interactive features use the synchronous `analyze` endpoints.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ⚠️ XOR | Audio file (same formats as above) |
| `text` | string | ⚠️ XOR | Plain text input |
| `user_id` | string | ✅ | User identifier |
| `session_id` | string | ✅ | Session identifier |

Exactly one of `audio` or `text` must be provided (not both).

**Response `200 OK`**

```json
{
  "status": "queued",
  "job_id": "uuid",
  "user_id": "...",
  "session_id": "...",
  "message": "Processing started. Use job_id to check status."
}
```

---

### `GET /listener/status/{job_id}`

Poll the status of an async ingest job.

**Response `200 OK`**

```json
{
  "job_id": "uuid",
  "status": "complete",
  "result": { ... }
}
```

`status` is one of: `queued`, `in_progress`, `complete`, `failed`.

---

### Listener Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe — returns `{"status":"healthy","service":"listener","version":"0.1.0","timestamp":"..."}` |
| `GET` | `/health/ready` | Readiness probe — checks Ollama, Redis, Observer connectivity |

---

## AI Model Management (Listener)

These endpoints allow runtime management of the Ollama LLM models used by the Listener without SSH/CLI access.

### `GET /listener/ai/models/local`

List all Ollama models currently installed.

**Response `200 OK`** — Array of `ModelInfo` objects (name, size, parameters, etc.)

---

### `POST /listener/ai/models/pull`

Start downloading a model from the Ollama registry. Returns a `task_id` for WebSocket progress tracking.

**Request** — JSON

```json
{ "name": "phi-3:mini" }
```

**Response `200 OK`**

```json
{
  "task_id": "uuid",
  "ai_model_name": "phi-3:mini",
  "status": "started"
}
```

---

### `WS /listener/ai/models/pull/{task_id}`

WebSocket stream for model download progress. Connect after calling `POST /ai/models/pull`.

**Messages received**

```json
{
  "task_id": "uuid",
  "ai_model_name": "phi-3:mini",
  "status": "downloading",
  "digest": "sha256:...",
  "total": 2000000000,
  "completed": 750000000,
  "percent": 37.5
}
```

Final message has `"status": "success"` or `"status": "error"`.

---

### `DELETE /listener/ai/models/{model_name}`

Delete a locally installed model.

**Path Parameter** — `model_name` (e.g., `phi-3:mini`)

**Response `200 OK`**

```json
{ "status": "success", "model": "phi-3:mini", "result": { ... } }
```

---

### `GET /listener/ai/models/{model_name}/details`

Get detailed specs for a specific model (RAM requirements, speed estimates, recommendations).

**Response `200 OK`** — `ModelDetails` object.  
**Response `404 Not Found`** — Model not found or Ollama error.

---

### `GET /listener/ai/models/health`

Check Ollama service availability.

**Response `200 OK`**

```json
{ "status": "ok", "ollama": "running" }
```

---

## Quaternion Engine (Versor)

Pure math service. Converts VAC vectors to quaternions, computes transition metrics, and generates SLERP animation paths.

### `POST /versor/calculate`

**Main calculation endpoint.** Converts a VAC vector to a quaternion and computes all transition metrics in one call.

**Request** — JSON (`StateRequest`)

```json
{
  "current_vac": {
    "valence": 0.9,
    "arousal": 0.7,
    "connection": 0.8
  },
  "previous_state": {
    "w": 0.9, "x": 0.3, "y": 0.2, "z": 0.1
  },
  "time_delta_seconds": 30.0
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `current_vac` | `VACVectorModel` | ✅ | Each component ∈ `[-1, 1]` | New emotional state |
| `previous_state` | `QuaternionModel` | ❌ | Unit quaternion `[w,x,y,z]` | Defaults to identity if not supplied |
| `time_delta_seconds` | float | ❌ | `> 0` | Time since last state; default `1.0` |

**Response `200 OK`** (`TrajectoryResponse`)

```json
{
  "current_state": { "w": 0.6, "x": 0.5, "y": 0.4, "z": 0.5 },
  "transition_quaternion": { "w": 0.9, "x": 0.2, "y": 0.2, "z": 0.3 },
  "angular_distance_radians": 0.31,
  "angular_distance_degrees": 17.8,
  "elasticity_metric": 0.42,
  "is_flooding": false,
  "insight_code": "V+",
  "interpolation_path": [
    { "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 },
    { "w": 0.98, "x": 0.1, "y": 0.1, "z": 0.1 },
    "... 58 more frames ..."
  ]
}
```

| Field | Description |
|-------|-------------|
| `current_state` | Quaternion representing the new VAC position |
| `transition_quaternion` | Rotation from previous to current state |
| `angular_distance_radians` | Arc length of the transition (θ) |
| `angular_distance_degrees` | Same value in degrees |
| `elasticity_metric` | `E = θ / Δt` — rate of emotional change |
| `is_flooding` | `true` if E exceeds the flooding threshold |
| `insight_code` | Dominant axis label (e.g., `"V+"`, `"A-"`, `"C+"`) |
| `interpolation_path` | SLERP animation frames (default 20 steps) |

*Latency: < 5 ms*

---

### `POST /versor/slerp`

Generate a SLERP interpolation path between two quaternions. Use when you already have quaternions and don't need full VAC processing.

**Request** — JSON (`SLERPRequest`)

```json
{
  "start_quaternion": { "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 },
  "target_quaternion": { "w": 0.7071, "x": 0.7071, "y": 0.0, "z": 0.0 },
  "steps": 60
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `start_quaternion` | `QuaternionModel` | ✅ | — | Interpolation start |
| `target_quaternion` | `QuaternionModel` | ✅ | — | Interpolation end |
| `steps` | int | ❌ | `1 ≤ steps ≤ 1000` | Number of frames; default `60` |

**Response `200 OK`** (`SLERPResponse`)

```json
{
  "path": [
    { "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 },
    "... N frames ..."
  ],
  "total_frames": 60,
  "angular_distance": 1.5708
}
```

*Latency: < 5 ms*

---

### Versor Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

---

## Typical Integration Flow

The following sequence shows how the services interact for a complete voice-to-visualization pipeline:

```
User speaks
      │
      ▼
POST /listener/analyze-audio
      │
      ├─► Transcription (Whisper/local)
      ├─► Prosody extraction
      └─► Semantic VAC analysis (Ollama/Llama 3)
            │
            ▼
    POST /observer/state         (called internally by Listener)
            │
            ├─► 384-D text embedding (MiniLM)
            ├─► Atlas emotion mapping (87 emotions)
            ├─► VAC → Quaternion (Versor)
            ├─► Elasticity / Rigidity metrics
            ├─► Alert detection
            ├─► Persist to user_trajectory
            └─► WebSocket broadcast → Experience UI
```

For the two-stage Deep Feeling flow:

```
1.  POST /listener/extract-audio-features
    → Returns transcription + prosody immediately (fast feedback)

2.  POST /listener/analyze-multi-emotion
    → Accepts text + prosody_data_json
    → Returns full 3-way (content / voice / blended) analysis
```

---

## Common Types

### `VACVectorModel`
```json
{ "valence": float, "arousal": float, "connection": float }
```
All components must be in `[-1.0, 1.0]`.

### `QuaternionModel`
```json
{ "w": float, "x": float, "y": float, "z": float }
```
Scalar-first unit quaternion. Identity (neutral) = `{"w":1.0,"x":0.0,"y":0.0,"z":0.0}`.

### `EmotionInfo`
```json
{ "id": "uuid", "name": "string", "category": "string", "vac": [float, float, float] }
```

### `MetricsInfo`
```json
{
  "elasticity": float,
  "rigidity": float,
  "angular_distance": float,
  "alerts": ["flooding"|"stuckness"]
}
```

### `StateResponse`
```json
{
  "state_id": "uuid",
  "dominant_emotion": EmotionInfo,
  "quaternion": QuaternionModel,
  "previous_quaternion": QuaternionModel | null,
  "metrics": MetricsInfo,
  "timestamp": "ISO-8601 datetime"
}
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — validation error, missing required field, unsupported file type |
| `401` | Unauthorized — missing or invalid Bearer token |
| `403` | Forbidden — authenticated but not permitted (e.g., recording another user's state) |
| `404` | Not Found — resource doesn't exist |
| `413` | Payload Too Large — audio file exceeds 50 MB |
| `422` | Unprocessable Entity — Pydantic validation failure (body fields out of range) |
| `500` | Internal Server Error — unexpected failure; check service logs |

---

## Performance Summary

| Endpoint | Typical Latency |
|----------|----------------|
| `GET /observer/emotions` | 15–30 ms |
| `GET /observer/current/{user_id}` | 10–20 ms |
| `GET /observer/history/{user_id}` | 20–100 ms |
| `POST /observer/state` | 60–150 ms |
| `POST /listener/analyze` | ~2 s |
| `POST /listener/analyze-audio` | ~3 s |
| `POST /listener/analyze-multi-emotion` | ~4 s |
| `POST /listener/analyze-audio-multi-emotion` | 12–16 s |
| `POST /listener/extract-audio-features` | ~1 s |
| `POST /versor/calculate` | < 5 ms |
| `POST /versor/slerp` | < 5 ms |

---

*Patent notice: The VAC (Valence-Arousal-Connection) model and quaternion-based emotional mapping system are the subject of U.S. Provisional Patent Application No. 63/962,600.*
