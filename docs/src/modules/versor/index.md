# Versor Module

**The Mathematical Heart of L.O.V.E.**

---

## Overview

The **Versor** module is the pure mathematical engine that transforms 3D emotional vectors into 4D rotational orientations. While the Listener interprets language and the Observer tracks emotional journeys, the Versor deals in absolute mathematical truths—quaternion algebra, spherical interpolation, and geometric topology.

**Key Innovation:** Uses quaternions instead of Euler angles to represent emotional state as rotation in 3D space, avoiding gimbal lock and enabling smooth transitions between any two emotional states.

---

## Quick Facts

- **Status:** ✅ Production Ready
- **Language:** Python 3.12
- **Architecture:** Stateless microservice
- **Test Coverage:** 100% (68 tests passing)
- **P99 Latency:** < 50ms
- **Port:** 8001

---

## Core Capabilities

### 1. VAC to Quaternion Conversion

Transforms 3D emotional vectors (Valence, Arousal, Connection) into 4D quaternion rotations using axis-angle representation.

### 2. Transition Calculations

Computes the "emotional work" required to shift between states:

- Angular distance (radians and degrees)
- Elasticity metric (rate of change)
- Flooding detection (E > 2.0 rad/s)

### 3. SLERP Path Generation

Creates smooth animation paths with 60-120 intermediate frames for constant angular velocity rotation visualization.

### 4. Axis Analysis

Identifies which emotional dimension changed most (Valence, Arousal, or Connection) to provide contextual insights.

---

## The Critical Innovation: Connection Axis

The Versor's most important contribution is enabling the **Connection axis** (z-axis) to differentiate emotional states that traditional models conflate:

### Example: Pity vs. Compassion

```text
Pity:       VAC[-0.3, -0.2, -0.6]  # Feeling FOR (separation)
Compassion: VAC[-0.3, -0.2, +0.8]  # Feeling WITH (connection)
```

Traditional models (using Valence and Arousal only) cannot distinguish these. The Versor's Connection axis makes this differentiation possible—validated by the **Pity→Compassion test** that proves a pure Connection shift.

---

## Why Quaternions?

### The Problem: Gimbal Lock

Traditional 3D rotation (Euler angles) suffers from **gimbal lock**—a mathematical singularity where you lose a degree of freedom:

1. Rotate 90° around X-axis
2. Y-axis and Z-axis become parallel
3. Certain rotations become impossible

**Emotional Metaphor:** Gimbal lock represents trauma or emotional "stuckness" where perspective and pivot become impossible.

### The Solution: Quaternions

Quaternions are 4D numbers (`[w, x, y, z]`) that represent rotations without singularities:

- ✅ No gimbal lock
- ✅ Smooth interpolation (SLERP)
- ✅ Computationally efficient
- ✅ Represent full 3D rotation space

---

## Who Should Read What?

### 👔 Executives

**Start here:** [Executive Overview](overview/01-executive-summary.md)

Understand what the Versor does, why quaternions matter, and the competitive advantages this mathematical approach provides.

- [Overview](overview/01-executive-summary.md) - What is Versor (non-technical)
- [Business Value](overview/02-business-value.md) - Patent potential, differentiation
- [Roadmap](overview/03-roadmap.md) - Future enhancements

### 👨‍💼 Managers

**Start here:** [Architecture Overview](architecture/00-high-level-overview.md)

Learn about system design, integration points, monitoring strategies, and team structure.

- [Architecture Overview](architecture/00-high-level-overview.md) - High-level design
- [Integration Points](operations/../architecture/10-integration-points.md) - How modules connect
- [Monitoring & Operations](operations/01-monitoring.md) - Health checks, metrics
- [Team Structure](operations/02-team-structure.md) - Roles and skills needed
- [Incident Response](operations/03-incident-response.md) - Failure modes and recovery

### 👨‍💻 Senior Developers

**Start here:** [Deep Dive Architecture](architecture/01-deep-dive.md)

Master the quaternion mathematics, algorithms, and architectural decisions that make the Versor work.

- [Deep Dive Architecture](architecture/01-deep-dive.md) - FastAPI structure
- [Quaternion Mathematics](architecture/02-quaternion-mathematics.md) - Algebra deep dive
- [VAC Conversion](architecture/03-vac-conversion.md) - VAC→Quaternion algorithm
- [SLERP Interpolation](architecture/04-slerp-interpolation.md) - Smooth paths
- [SciPy Integration](architecture/05-scipy-integration.md) - Scalar conventions
- [Performance Optimization](architecture/06-performance-optimization.md) - Latency tuning
- [Extending Versor](architecture/07-extending-versor.md) - Adding features
- [Troubleshooting](architecture/08-troubleshooting.md) - Common issues
- [Architecture Decisions](architecture/09-architecture-decisions.md) - Why we chose this

### 🎓 Junior Developers

**Start here:** [Getting Started](guides/01-getting-started.md)

Get up and running quickly with step-by-step guides and practical examples.

- [Getting Started](guides/01-getting-started.md) - Installation and first API call
- [Codebase Tour](guides/02-codebase-tour.md) - Where everything is
- [Key Concepts](guides/03-key-concepts.md) - Quaternions, VAC, SLERP
- [Common Tasks](guides/04-common-tasks.md) - Practical how-tos
- [Testing Guide](guides/05-testing-guide.md) - Running tests
- [First Contribution](guides/06-first-contribution.md) - PR workflow

### 📚 Reference

**Quick lookup:** [API Reference](reference/api-reference.md)

Complete API documentation, configuration options, error codes, and terminology.

- [API Reference](reference/api-reference.md) - All endpoints with examples
- [Configuration](reference/configuration.md) - Environment variables
- [Error Codes](reference/error-codes.md) - Error catalog
- [Glossary](reference/glossary.md) - Mathematical terminology

---

## Architecture in L.O.V.E. Stack

```text
┌─────────────┐
│  LISTENER   │ → Produces VAC vectors from voice/text
└──────┬──────┘
       │
       ↓ VAC[valence, arousal, connection]
       │
┌──────────────────────────────────────────┐
│            VERSOR ⭐                     │
│  ┌────────────────────────────────────┐  │
│  │ 1. Convert VAC → Quaternion       │  │
│  │ 2. Calculate angular distance     │  │
│  │ 3. Compute elasticity metric      │  │
│  │ 4. Detect flooding                │  │
│  │ 5. Generate SLERP path (60 frames)│  │
│  │ 6. Identify dominant axis         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Pure Math Engine (Stateless)            │
│  • No database                           │
│  • No state                              │
│  • Just calculations                     │
└──────┬───────────────────────────────────┘
       │
       ↓ Quaternions + SLERP path
       │
┌──────┴──────┐
│  OBSERVER   │ → Stores quaternions in trajectory
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ EXPERIENCE  │ → Animates Soul Sphere rotation
└─────────────┘
```

---

## Key Files

### Core Mathematics (`versor/app/core/`)

- **`quaternion.py`** - Quaternion class with algebra operations
- **`vac_model.py`** - VAC vector class with conversion logic
- **`transitions.py`** - Angular distance, elasticity, flooding detection
- **`interpolation.py`** - SLERP path generation

### API Layer (`versor/app/api/`)

- **`routes/calculate.py`** - Main calculation endpoint
- **`models/request.py`** - Request schemas (Pydantic)
- **`models/response.py`** - Response schemas

### Supporting

- **`main.py`** - FastAPI application
- **`config.py`** - Settings and environment
- **`utils/scipy_adapter.py`** - Scalar convention handling

---

## The Pity→Compassion Test

This is the **validation test** that proves the entire VAC model works:

```python
from versor.app.core.vac_model import VACVector
from versor.app.core.transitions import calculate_transition, detect_dominant_axis

# Pity: feeling FOR someone (negative connection)
pity = VACVector(valence=-0.3, arousal=-0.2, connection=-0.6)

# Compassion: feeling WITH someone (positive connection)
compassion = VACVector(valence=-0.3, arousal=-0.2, connection=0.8)

# Convert to quaternions
q_pity = pity.to_quaternion()
q_compassion = compassion.to_quaternion()

# Calculate transition
q_transition = calculate_transition(q_pity, q_compassion)

# Identify dominant axis
axis = detect_dominant_axis(q_transition)

assert axis == "CONNECTION_SHIFT"  # ✅ PASSES!
```

This test proves that the Connection axis successfully differentiates states that traditional VAD models treat as identical.

---

## Performance

- **P99 Latency:** < 50ms (typically 10-20ms)
- **Test Suite:** 0.55 seconds for 56 tests
- **Memory:** Minimal (stateless, no caching)
- **Scalability:** Horizontal scaling ready (no shared state)

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Python 3.12 | Scientific computing |
| Framework | FastAPI | Async REST API |
| Math Library | NumPy 1.26.3 | Vector operations |
| Rotation Library | SciPy 1.12.0 | SLERP implementation |
| Validation | Pydantic 2.5.3 | Type safety |
| Server | Uvicorn | ASGI server |

---

## Design Principles

1. **Mathematical Purity:** No business logic, just pure math
2. **Statelessness:** No database, no persistence, no sessions
3. **Scalar-First Convention:** `[w, x, y, z]` matches mathematical literature
4. **100% Test Coverage:** Every function proven correct
5. **Performance First:** Sub-50ms latency requirement

---

## Quick Start

```bash
# Navigate to versor module
cd versor

# Install dependencies
pip install -r requirements.txt

# Run API server
uvicorn app.main:app --reload --port 8001

# Test endpoint
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {"valence": 0.9, "arousal": 0.7, "connection": 0.8},
    "previous_state": null,
    "time_delta_seconds": 1.0
  }'

# Run tests
pytest tests/ -v --cov=app
```

Expected: All tests pass, 100% coverage, quaternion returned.

---

## Learn More

### Academic Foundation

- **Quaternion Algebra:** Hamilton's work (1843)
- **SLERP Algorithm:** Ken Shoemake (1985)
- **VAC Model:** Russell's Circumplex (extended with Connection)
- **Gimbal Lock:** Aerospace/robotics literature

### Technical Documentation

The `versor/docs/` directory contains 14 detailed technical documents:

- Mathematical foundations
- Algorithm specifications
- Performance analysis
- Deployment guides

### Integration Examples

See the Observer module documentation for how quaternions are:

- Stored in user trajectories
- Used in emotional pathfinding
- Visualized in the Experience module

---

## Contributing

Before contributing to Versor:

1. **Read:** [First Contribution Guide](guides/06-first-contribution.md)
2. **Setup:** Follow [Getting Started](guides/01-getting-started.md)
3. **Test:** Maintain 100% coverage
4. **Validate:** Run DX scripts (`infra/scripts/check-python-quality.sh --module=versor`)
5. **Document:** Add docstrings for new code

---

## Need Help?

- **Junior Developers:** Start with [Getting Started](guides/01-getting-started.md)
- **Senior Developers:** Jump to [Deep Dive](architecture/01-deep-dive.md)
- **Managers:** Check [Integration Points](operations/../architecture/10-integration-points.md)
- **Executives:** Read [Business Value](overview/02-business-value.md)
- **Quick Reference:** Browse [API Reference](reference/api-reference.md)

---

**Remember:** The Versor isn't a calculator—it's a **translation engine** that converts the qualitative concepts from Atlas of the Heart into the precise, non-commutative algebra of quaternions, enabling visualization of emotional trajectories through 3D rotational space.
