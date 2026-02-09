# Versor - The Mathematical Heart of L.O.V.E.

**Status**: ✅ Production Ready
**Test Coverage**: 56/56 tests passing (100%)
**API**: http://localhost:8001

---

## Overview

The Versor is a **stateless microservice** that performs pure quaternion mathematics for emotional state processing. It converts 3D emotional vectors (VAC) into 4D rotational orientations, calculates transition metrics, and generates smooth animation paths.

## Features

✅ **VAC to Quaternion Conversion** - Maps emotional states to rotations
✅ **Transition Calculations** - Computes "emotional work" (angular distance)
✅ **SLERP Interpolation** - Generates 60-frame animation paths
✅ **Flooding Detection** - Identifies emotional overwhelm (E > 2.0 rad/s)
✅ **Axis Analysis** - Detects which dimension changed (Valence/Arousal/Connection)
✅ **Scalar Convention Handling** - Adapts between L.O.V.E. (scalar-first) and SciPy (scalar-last)

## Quick Start

### Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or `./venv/bin/activate` on some systems

# Install dependencies
pip install -r requirements.txt
```

### Run API Server

**Option 1: Direct (Development)**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**Option 2: With Podman (Recommended)**
```bash
# Build image
podman build -t versor:latest -f Containerfile .

# Run container
podman run -p 8001:8001 versor:latest

# Or use Podman Compose
podman-compose up
```

**Option 3: With Docker**
```bash
docker build -t versor:latest -f Containerfile .
docker compose up
```

Then visit:
- **API**: http://localhost:8001
- **Interactive Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

### Run Tests

```bash
pytest tests/unit/ -v
```

Expected: **56/56 tests passing**

## API Usage

### Calculate Emotional State

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {
      "valence": 0.9,
      "arousal": 0.7,
      "connection": 0.8
    },
    "previous_state": null,
    "time_delta_seconds": 1.0
  }'
```

**Response**:
```json
{
  "current_state": {"w": 0.306, "x": 0.615, "y": 0.478, "z": 0.546},
  "angular_distance_radians": 2.525,
  "angular_distance_degrees": 144.7,
  "elasticity_metric": 2.525,
  "is_flooding": true,
  "insight_code": "AROUSAL_SHIFT",
  "interpolation_path": [ ... 60 frames ... ]
}
```

## The Critical Test ⭐

**Pity vs. Compassion** - The test that validates the entire VAC model:

```python
# Pity: feeling FOR someone (separation)
pity = VACVector(valence=-0.3, arousal=-0.2, connection=-0.6)

# Compassion: feeling WITH someone (connection)
compassion = VACVector(valence=-0.3, arousal=-0.2, connection=0.8)

# Calculate transition
axis = detect_dominant_axis(calculate_transition(pity, compassion))

assert axis == "CONNECTION_SHIFT"  # ✅ PASSES!
```

This proves the Connection axis (z) correctly differentiates states that traditional models conflate.

## Architecture

```
versor/
├── app/
│   ├── core/           # Pure mathematics (quaternions, VAC, transitions, SLERP)
│   ├── api/            # FastAPI routes & Pydantic models
│   ├── utils/          # SciPy adapter for scalar conversion
│   ├── config.py       # Settings & environment variables
│   └── main.py         # FastAPI application
├── tests/
│   └── unit/           # 56 comprehensive tests
├── docs/               # 14 detailed documentation files
└── requirements.txt
```

## Documentation

See `docs/` directory for comprehensive guides:
- `00-overview.md` - Introduction & architecture
- `03-vac-to-quaternion.md` - Conversion algorithm
- `04-transition-calculations.md` - Emotional work metrics
- `05-slerp-interpolation.md` - Animation paths
- `09-setup-and-installation.md` - Development setup

## Performance

- **P99 Latency**: < 50ms (target met!)
- **Test Suite**: Runs in 0.55 seconds
- **Memory**: Stateless, minimal footprint
- **Scalability**: Horizontal scaling ready

## Dependencies

- Python 3.9+
- NumPy 1.26.3 (vector operations)
- SciPy 1.12.0 (SLERP implementation)
- FastAPI 0.109.0 (REST API)
- Pydantic 2.5.3 (validation)

## License

Part of Project L.O.V.E. - All rights reserved.

---

**Ready to integrate**: Observer and Experience modules can now call the Versor API for quaternion calculations!
