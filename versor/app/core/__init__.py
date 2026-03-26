"""Core Mathematical Operations Package.

This package contains the pure mathematical functions that power the Versor engine.
All functions are stateless, deterministic, and have no side effects - they perform
only mathematical computations on quaternions and VAC vectors.

Package Structure:
    - quaternion.py: Quaternion algebra (multiply, conjugate, normalize, etc.)
    - vac_model.py: VAC representation and quaternion conversion
    - interpolation.py: SLERP and smoothing functions
    - transitions.py: Transition metrics (distance, elasticity, flooding)

Public API:
    This __init__.py exports the core public interface that other modules
    (API layer, tests) should use. Import from app.core, not submodules:

    ✓ Good:  from app.core import Quaternion, VACVector
    ✗ Avoid: from app.core.quaternion import Quaternion

Exported Classes:
    - Quaternion: 4D unit quaternion for 3D rotations
    - VACVector: 3D emotional state representation

Exported Functions:
    Transition Analysis:
        - calculate_transition(): Get rotation between states
        - angular_distance(): Quantify emotional work
        - calculate_elasticity(): Measure velocity of change
        - detect_flooding(): Identify overwhelm risk
        - detect_dominant_axis(): Find which dimension changed most
        - generate_insight(): Convert axis code to user message

    Interpolation:
        - generate_slerp_path(): Create smooth animation paths
        - ensure_shortest_path(): Correct for quaternion double-cover
        - smooth_transition(): Apply exponential smoothing filter

Design Principles:
    - **Pure functions:** No state, no side effects, deterministic
    - **Type safety:** Full type hints for all functions
    - **Documented:** Comprehensive docstrings with examples
    - **Tested:** 100% test coverage
    - **Fast:** Optimized for performance (< 100ns typical)

Example:
    Using the core API::

        from app.core import (
            VACVector,
            calculate_transition,
            angular_distance,
            generate_slerp_path
        )

        # Convert VAC to quaternion
        joy = VACVector(valence=0.8, arousal=0.5, connection=0.7)
        q_joy = joy.to_quaternion()

        sadness = VACVector(valence=-0.6, arousal=-0.3, connection=-0.4)
        q_sadness = sadness.to_quaternion()

        # Analyze transition
        q_trans = calculate_transition(q_joy, q_sadness)
        distance = angular_distance(q_trans)

        # Generate animation
        path = generate_slerp_path(q_joy, q_sadness, steps=60)
"""

from .interpolation import ensure_shortest_path, generate_slerp_path, smooth_transition

# Octonion extension (parallel to quaternion API)
from .octonion import (
    CLINICAL_NARRATIVES,
    DIMENSION_NAMES,
    FANO_TRIPLES,
    Octonion,
    detect_dominant_octonion_axis,
    generate_octonion_insight,
    octonion_angular_distance,
    octonion_multiply,
    vac_extended_to_octonion,
)
from .octonion_interpolation import (
    ensure_shortest_path_oct,
    generate_octonion_slerp_path,
    octonion_slerp,
)
from .quaternion import Quaternion
from .transitions import (
    angular_distance,
    calculate_elasticity,
    calculate_transition,
    detect_dominant_axis,
    detect_flooding,
    generate_insight,
)
from .vac_model import VACVector

__all__ = [
    # Core classes
    "Quaternion",
    "VACVector",
    # Transition analysis
    "calculate_transition",
    "angular_distance",
    "calculate_elasticity",
    "detect_flooding",
    "detect_dominant_axis",
    "generate_insight",
    # Interpolation
    "ensure_shortest_path",
    "generate_slerp_path",
    "smooth_transition",
    # Octonion extension
    "Octonion",
    "vac_extended_to_octonion",
    "octonion_multiply",
    "octonion_angular_distance",
    "detect_dominant_octonion_axis",
    "generate_octonion_insight",
    "octonion_slerp",
    "generate_octonion_slerp_path",
    "ensure_shortest_path_oct",
    "FANO_TRIPLES",
    "DIMENSION_NAMES",
    "CLINICAL_NARRATIVES",
]
