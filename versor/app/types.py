"""Type Aliases for Versor Module.

This module provides common type aliases used throughout the Versor codebase
to improve readability, maintainability, and type safety.

Type aliases serve several purposes:
1. **Readability:** `AxisTuple` is clearer than `tuple[float, float, float]`
2. **Maintainability:** Change definition once, affects all usages
3. **Documentation:** Self-documenting code through descriptive names
4. **IDE Support:** Better autocomplete and type hints

Why Type Aliases?
    - Complex types become easier to understand
    - Reduces repetition in type annotations
    - Makes refactoring safer (change in one place)
    - Provides semantic meaning to generic types

Usage:
    from app.types import QuaternionComponents, VACComponents

    def process_vac(vac: VACComponents) -> QuaternionComponents:
        ...

References:
    - PEP 613: TypeAlias annotation
    - Python typing documentation
"""

from typing import TypeAlias

# ═══════════════════════════════════════════════════════════════════════
# QUATERNION TYPES
# ═══════════════════════════════════════════════════════════════════════

QuaternionComponents: TypeAlias = tuple[float, float, float, float]
"""
Quaternion components in scalar-first notation [w, x, y, z].

Represents a unit quaternion for 3D rotations:
- w: Scalar/real part (cos(θ/2))
- x: i component of vector part (sin(θ/2) * axis_x)
- y: j component of vector part (sin(θ/2) * axis_y)
- z: k component of vector part (sin(θ/2) * axis_z)

Example:
    identity: QuaternionComponents = (1.0, 0.0, 0.0, 0.0)
"""

# ═══════════════════════════════════════════════════════════════════════
# VAC MODEL TYPES
# ═══════════════════════════════════════════════════════════════════════

VACComponents: TypeAlias = tuple[float, float, float]
"""
VAC (Valence-Arousal-Connection) vector components.

Represents emotional state in 3D space:
- valence: Pleasure (+1) to Displeasure (-1)
- arousal: High Energy (+1) to Low Energy (-1)
- connection: Connected (+1) to Disconnected (-1)

All components should be in range [-1.0, 1.0].

Example:
    joy: VACComponents = (0.8, 0.6, 0.7)
    sadness: VACComponents = (-0.6, -0.3, -0.4)
"""

AxisTuple: TypeAlias = tuple[float, float, float]
"""
3D axis vector for rotation representation.

Used for axis-angle representation where:
- Axis defines direction of rotation
- Usually normalized (unit vector)
- Components: (x, y, z)

Example:
    z_axis: AxisTuple = (0.0, 0.0, 1.0)
    arbitrary_axis: AxisTuple = (0.577, 0.577, 0.577)  # (1, 1, 1) normalized
"""

# ═══════════════════════════════════════════════════════════════════════
# TRANSITION METRICS TYPES
# ═══════════════════════════════════════════════════════════════════════

AngularDistance: TypeAlias = float
"""
Angular distance in radians representing emotional transition magnitude.

Range: [0, π] where:
- 0: No change (identical states)
- π/2: 90° rotation (moderate shift)
- π: 180° rotation (maximum possible)

Clinical interpretation:
- < 0.5 rad: Minor adjustment
- 0.5-1.0: Typical shift
- 1.0-2.0: Significant transition
- > 2.0: Major shift requiring support
"""

Elasticity: TypeAlias = float
"""
Rate of emotional change in radians per second.

Represents velocity of transition:
- E = φ / Δt (distance / time)

Range: [0, ∞) with typical values:
- < 0.5 rad/s: Slow, gradual change
- 1.0 rad/s: Normal pace
- > 2.0 rad/s: Rapid (flooding threshold)
- > 4.0 rad/s: Dangerous velocity
"""

# ═══════════════════════════════════════════════════════════════════════
# INSIGHT CODES
# ═══════════════════════════════════════════════════════════════════════

InsightCode: TypeAlias = str
"""
Dominant axis insight code for transition characterization.

Valid values:
- "VALENCE_SHIFT": Mood dimension dominates
- "AROUSAL_SHIFT": Energy dimension dominates
- "CONNECTION_SHIFT": Relational dimension dominates
- "NEUTRAL": No significant change detected

These codes help identify the "character" of emotional shifts
for clinical interpretation and intervention selection.
"""
