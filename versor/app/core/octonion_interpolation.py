"""Octonion Interpolation — Geometric SLERP on S⁷.

This module provides spherical linear interpolation for octonions.
Unlike quaternion SLERP (which uses SciPy), this operates directly
on ℝ⁸ vectors using the geometric SLERP formula:

    slerp(o₁, o₂, t) = (sin((1-t)θ) × o₁ + sin(tθ) × o₂) / sin(θ)

Where θ = arccos(o₁·o₂) is the angle between o₁ and o₂ on S⁷.

Key Insight:
    SLERP is a GEOMETRIC operation on spheres — it does not require
    associativity. It works identically for quaternions (S³) and
    octonions (S⁷), because it only uses:
    - Dot product (to find the angle)
    - Scalar multiplication and addition (linear combination)
    - Trigonometric functions

    This means we bypass the non-associativity problem entirely.

NOTE: This module does NOT modify or replace the existing SciPy-based
quaternion SLERP in interpolation.py. Both coexist.
"""

import math
from typing import List

from .octonion import EPSILON, Octonion


def ensure_shortest_path_oct(o_start: Octonion, o_target: Octonion) -> tuple[Octonion, Octonion]:
    """Ensure SLERP takes the shortest path on S⁷.

    Due to the double-cover property, o and -o represent the same
    orientation. If the dot product is negative, negate the target
    to take the shorter arc.
    """
    if o_start.dot(o_target) < 0:
        return o_start, o_target.negate()
    return o_start, o_target


def octonion_slerp(
    o_start: Octonion,
    o_target: Octonion,
    t: float,
) -> Octonion:
    """Interpolate between two unit octonions at parameter t ∈ [0, 1].

    This is a single-step SLERP evaluation. For generating full paths,
    use generate_octonion_slerp_path().

    Args:
        o_start:  Starting octonion (t=0)
        o_target: Target octonion (t=1)
        t:        Interpolation parameter [0, 1]

    Returns:
        Octonion: Interpolated unit octonion
    """
    o_start, o_target = ensure_shortest_path_oct(o_start, o_target)

    dot = o_start.dot(o_target)
    dot = max(-1.0, min(1.0, dot))
    theta = math.acos(dot)

    if theta < EPSILON:
        return o_start

    sin_theta = math.sin(theta)
    weight_start = math.sin((1 - t) * theta) / sin_theta
    weight_target = math.sin(t * theta) / sin_theta

    start_comps = o_start.components()
    target_comps = o_target.components()

    interpolated = tuple(
        weight_start * s + weight_target * e for s, e in zip(start_comps, target_comps)
    )

    return Octonion(*interpolated)


def generate_octonion_slerp_path(
    o_start: Octonion,
    o_target: Octonion,
    steps: int = 60,
) -> List[Octonion]:
    """Generate a complete SLERP interpolation path on S⁷.

    Produces `steps` evenly-spaced octonions from o_start to o_target
    with constant angular velocity (guaranteed by SLERP).

    Args:
        o_start:  Starting octonion (t=0)
        o_target: Target octonion (t=1)
        steps:    Number of frames (default: 60)

    Returns:
        List[Octonion]: Interpolated path, length = steps

    Raises:
        ValueError: If steps < 2
    """
    if steps < 2:
        raise ValueError(f"Steps must be ≥ 2, got {steps}")

    o_start, o_target = ensure_shortest_path_oct(o_start, o_target)

    dot = o_start.dot(o_target)
    dot = max(-1.0, min(1.0, dot))
    theta = math.acos(dot)

    path: List[Octonion] = []

    for i in range(steps):
        t = i / (steps - 1)

        if theta < EPSILON:
            path.append(o_start)
            continue

        sin_theta = math.sin(theta)
        weight_start = math.sin((1 - t) * theta) / sin_theta
        weight_target = math.sin(t * theta) / sin_theta

        start_comps = o_start.components()
        target_comps = o_target.components()

        interpolated = tuple(
            weight_start * s + weight_target * e for s, e in zip(start_comps, target_comps)
        )

        path.append(Octonion(*interpolated))

    return path
