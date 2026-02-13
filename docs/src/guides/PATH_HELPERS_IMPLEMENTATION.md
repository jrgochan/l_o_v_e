# Path Helpers Implementation Guide

This guide covers the path helper utilities used for computing emotional transition paths.

## Overview

Path helpers provide utility functions for the A* pathfinding algorithm that computes optimal emotional transitions between states in the 87-emotion atlas.

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **PathMatrix** | `observer/app/services/matrix/` | Pre-computes all-pairs shortest paths |
| **Quaternion Builder** | `observer/app/services/math/quaternion_builder.py` | Converts VAC → quaternions for path distance |
| **Transition Planning** | `observer/app/api/routes/transitions/planning.py` | API routes for path requests |

## Usage

### Computing a Transition Path

```bash
curl -X POST http://localhost:8000/observer/transitions/transition-path \
  -H "Content-Type: application/json" \
  -d '{
    "from_emotion_id": 1,
    "to_emotion_id": 42,
    "max_steps": 5
  }'
```

### Path Constraints

The pathfinder respects psychological constraints:

- **Arousal ceiling** — Prevents jumps that exceed physiological limits
- **Toxic positivity prevention** — Avoids unrealistic direct negative-to-positive jumps
- **Bridge emotions** — Uses intermediate states for safe traversal

## Related Documentation

- [Observer Services Architecture](../modules/observer/architecture/02-services.md)
- [Transition System](../modules/observer/architecture/04-transition-system.md)
