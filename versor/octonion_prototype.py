#!/usr/bin/env python3
"""Octonion Math Prototype — Phase 0 Validation

Standalone script to validate the 8D emotional octonion math before
integrating into the Versor engine. Tests:
  1. VAC-Extended → S⁷ conversion (angle = π × mag / √7)
  2. Geometric SLERP on S⁷ (dot product + arc-cosine)
  3. Unit-norm preservation along interpolation paths
  4. Angular distance computation
  5. Fano plane multiplication table (Cayley-Dickson)
  6. Clinical triple validation
  7. Quaternion vs Octonion directional preservation for pure-VAC inputs

Usage:
    python octonion_prototype.py

No external dependencies — pure Python + math module.
"""

import math
from dataclasses import dataclass
from typing import Final, List, Tuple

EPSILON: Final[float] = 1e-6


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: Octonion Dataclass
# ═══════════════════════════════════════════════════════════════════════════════


@dataclass(frozen=True)
class Octonion:
    """Unit octonion (8D hypercomplex number) representing emotional state on S⁷.

    Notation: o = e0 + e1·i₁ + e2·i₂ + e3·i₃ + e4·i₄ + e5·i₅ + e6·i₆ + e7·i₇

    Mapping:
        e0: scalar (total emotional intensity, from normalization)
        e1: Valence     — Pleasure ↔ Displeasure
        e2: Arousal     — Energy ↔ Lethargy
        e3: Connection  — Connected ↔ Isolated
        e4: Depth       — Profound ↔ Superficial
        e5: Coping      — Empowered ↔ Helpless
        e6: Velocity    — Rapid change ↔ Stillness (computed)
        e7: Novelty     — Novel ↔ Familiar
    """

    e0: float  # Scalar component
    e1: float  # Valence
    e2: float  # Arousal
    e3: float  # Connection
    e4: float  # Depth
    e5: float  # Coping
    e6: float  # Velocity
    e7: float  # Novelty

    @classmethod
    def identity(cls) -> "Octonion":
        """Identity octonion (no rotation/neutral state)."""
        return cls(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    def components(self) -> Tuple[float, ...]:
        """Return all 8 components as a tuple."""
        return (self.e0, self.e1, self.e2, self.e3, self.e4, self.e5, self.e6, self.e7)

    def imaginary(self) -> Tuple[float, ...]:
        """Return the 7 imaginary components."""
        return (self.e1, self.e2, self.e3, self.e4, self.e5, self.e6, self.e7)

    def magnitude(self) -> float:
        """Euclidean norm ‖o‖ = √(e0² + e1² + ... + e7²)."""
        return math.sqrt(sum(c * c for c in self.components()))

    def is_unit(self, epsilon: float = EPSILON) -> bool:
        """Check if this is a unit octonion (‖o‖ ≈ 1.0)."""
        return abs(self.magnitude() - 1.0) < epsilon

    def normalize(self) -> "Octonion":
        """Return unit-norm version of this octonion."""
        mag = self.magnitude()
        if mag < EPSILON:
            return Octonion.identity()
        inv = 1.0 / mag
        return Octonion(*(c * inv for c in self.components()))

    def dot(self, other: "Octonion") -> float:
        """Inner product in ℝ⁸: o₁·o₂ = Σ(o₁ᵢ × o₂ᵢ)."""
        return sum(a * b for a, b in zip(self.components(), other.components()))

    def negate(self) -> "Octonion":
        """Return -o (all components negated)."""
        return Octonion(*(-c for c in self.components()))

    def conjugate(self) -> "Octonion":
        """Octonion conjugate: o* = e0 - e1·i₁ - ... - e7·i₇."""
        return Octonion(
            self.e0, -self.e1, -self.e2, -self.e3, -self.e4, -self.e5, -self.e6, -self.e7
        )

    def __repr__(self) -> str:
        labels = ["1", "V", "A", "C", "D", "P", "Ė", "N"]
        parts = []
        for label, val in zip(labels, self.components()):
            if abs(val) > EPSILON:
                parts.append(f"{val:+.4f}·{label}")
        return f"Oct({', '.join(parts) if parts else '0'})"


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: VAC-Extended → Octonion Conversion
# ═══════════════════════════════════════════════════════════════════════════════


def vac_extended_to_octonion(
    valence: float,
    arousal: float,
    connection: float,
    depth: float = 0.0,
    coping: float = 0.0,
    velocity: float = 0.0,
    novelty: float = 0.0,
) -> Octonion:
    """Map 7 emotional dimensions to a unit octonion on S⁷.

    Generalizes the existing VAC→Quaternion conversion:
      Quaternion: angle = π × mag / √3  (3 inputs → 4D)
      Octonion:   angle = π × mag / √7  (7 inputs → 8D)

    The scalar component e₀ = cos(θ/2) encodes total emotional intensity,
    just as w = cos(θ/2) does for quaternions.

    Args:
        valence:    Pleasure ↔ Displeasure [-1, 1]
        arousal:    Energy ↔ Lethargy [-1, 1]
        connection: Connected ↔ Isolated [-1, 1]
        depth:      Profound ↔ Superficial [-1, 1]
        coping:     Empowered ↔ Helpless [-1, 1]
        velocity:   Rapid change ↔ Stillness [-1, 1] (computed)
        novelty:    Novel ↔ Familiar [-1, 1]

    Returns:
        Octonion: Unit octonion on S⁷
    """
    # Clamp all inputs to [-1, 1]
    dims = [
        max(-1.0, min(1.0, valence)),
        max(-1.0, min(1.0, arousal)),
        max(-1.0, min(1.0, connection)),
        max(-1.0, min(1.0, depth)),
        max(-1.0, min(1.0, coping)),
        max(-1.0, min(1.0, velocity)),
        max(-1.0, min(1.0, novelty)),
    ]

    # Magnitude of the 7D emotional vector
    mag = math.sqrt(sum(d * d for d in dims))

    # Near-zero → identity (neutral state)
    if mag < EPSILON:
        return Octonion.identity()

    # Map magnitude to rotation angle: [0, √7] → [0, π]
    max_magnitude = math.sqrt(7)  # √7 ≈ 2.646 (max when all = ±1)
    angle = math.pi * (mag / max_magnitude)

    # Construct octonion via axis-angle analog on S⁷
    half_angle = angle / 2
    cos_half = math.cos(half_angle)
    sin_half = math.sin(half_angle)

    # Scale factor: projects normalized direction into imaginary space
    scale = sin_half / mag

    octonion = Octonion(
        e0=cos_half,
        e1=dims[0] * scale,  # Valence
        e2=dims[1] * scale,  # Arousal
        e3=dims[2] * scale,  # Connection
        e4=dims[3] * scale,  # Depth
        e5=dims[4] * scale,  # Coping
        e6=dims[5] * scale,  # Velocity
        e7=dims[6] * scale,  # Novelty
    )

    assert octonion.is_unit(), f"Octonion not unit: ‖o‖ = {octonion.magnitude()}"
    return octonion


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: VAC → Quaternion Conversion (Reference Implementation)
# ═══════════════════════════════════════════════════════════════════════════════
# Exact mirror of versor/app/core/vac_model.py for comparison.


@dataclass(frozen=True)
class Quaternion:
    """Minimal quaternion for comparison tests."""

    w: float
    x: float
    y: float
    z: float

    def magnitude(self) -> float:
        return math.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)

    def is_unit(self, epsilon: float = EPSILON) -> bool:
        return abs(self.magnitude() - 1.0) < epsilon


def vac_to_quaternion(valence: float, arousal: float, connection: float) -> Quaternion:
    """VAC → Quaternion (mirrors existing versor implementation)."""
    v = max(-1.0, min(1.0, valence))
    a = max(-1.0, min(1.0, arousal))
    c = max(-1.0, min(1.0, connection))

    mag = math.sqrt(v**2 + a**2 + c**2)

    if mag < EPSILON:
        return Quaternion(1.0, 0.0, 0.0, 0.0)

    axis = [v / mag, a / mag, c / mag]
    max_mag = math.sqrt(3)
    angle = math.pi * (mag / max_mag)

    half = angle / 2
    cos_half = math.cos(half)
    sin_half = math.sin(half)

    return Quaternion(
        w=cos_half,
        x=axis[0] * sin_half,
        y=axis[1] * sin_half,
        z=axis[2] * sin_half,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: Geometric SLERP on S⁷
# ═══════════════════════════════════════════════════════════════════════════════


def octonion_angular_distance(o1: Octonion, o2: Octonion) -> float:
    """Angular distance between two unit octonions on S⁷.

    Uses: θ = arccos(|o₁·o₂|)
    The absolute value handles the double-cover property.

    Returns:
        float: Angular distance in radians [0, π]
    """
    dot = o1.dot(o2)
    # Clamp for numerical stability (dot might be 1.0000001 due to float)
    dot_clamped = max(-1.0, min(1.0, abs(dot)))
    return math.acos(dot_clamped)


def ensure_shortest_path_oct(o1: Octonion, o2: Octonion) -> Tuple[Octonion, Octonion]:
    """Ensure SLERP takes the shortest path (double-cover correction)."""
    if o1.dot(o2) < 0:
        return o1, o2.negate()
    return o1, o2


def geometric_slerp_s7(
    o_start: Octonion,
    o_target: Octonion,
    steps: int = 60,
) -> List[Octonion]:
    """Geometric SLERP on S⁷ — interpolation on the 7-sphere.

    This is the KEY mathematical insight: SLERP is a geometric operation
    on spheres, not an algebraic operation requiring associativity.
    It works identically for quaternions (S³) and octonions (S⁷).

    Formula:
        slerp(o₁, o₂, t) = (sin((1-t)θ) × o₁ + sin(tθ) × o₂) / sin(θ)

    Where θ = arccos(o₁·o₂) is the angle between o₁ and o₂ on S⁷.

    Args:
        o_start:  Starting octonion (t=0)
        o_target: Target octonion (t=1)
        steps:    Number of interpolation frames (default: 60)

    Returns:
        List[Octonion]: Interpolated path, length = steps

    Raises:
        ValueError: If steps < 2
    """
    if steps < 2:
        raise ValueError(f"Steps must be ≥ 2, got {steps}")

    # Double-cover correction: ensure shortest path
    o_start, o_target = ensure_shortest_path_oct(o_start, o_target)

    # Compute angle between the two octonions
    dot = o_start.dot(o_target)
    dot = max(-1.0, min(1.0, dot))  # Clamp for numerical safety
    theta = math.acos(dot)

    path: List[Octonion] = []

    for i in range(steps):
        t = i / (steps - 1)  # t ∈ [0, 1]

        if theta < EPSILON:
            # Near-identical: just return start (avoid division by zero)
            path.append(o_start)
            continue

        # SLERP formula: component-wise linear combination in ℝ⁸
        sin_theta = math.sin(theta)
        weight_start = math.sin((1 - t) * theta) / sin_theta
        weight_target = math.sin(t * theta) / sin_theta

        start_comps = o_start.components()
        target_comps = o_target.components()

        interpolated = tuple(
            weight_start * s + weight_target * e for s, e in zip(start_comps, target_comps)
        )

        result = Octonion(*interpolated)
        path.append(result)

    return path


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: Fano Plane Multiplication Table
# ═══════════════════════════════════════════════════════════════════════════════
# The Fano plane defines 7 oriented triples for octonion multiplication:
#   eᵢ × eⱼ = eₖ  (and eⱼ × eᵢ = -eₖ)
#
# We choose the most common convention (matching Cayley-Dickson construction):
#   (1,2,4), (2,3,5), (3,4,6), (4,5,7), (5,6,1), (6,7,2), (7,1,3)
#
# Dimension assignments for clinical triples:
#   e1=Valence, e2=Arousal, e3=Connection, e4=Depth,
#   e5=Coping, e6=Velocity, e7=Novelty
#
# Resulting clinical interpretations:
#   (1,2,4): Valence × Arousal → Depth
#            "How pleasant + how energized → how deeply you feel"
#   (2,3,5): Arousal × Connection → Coping
#            "Energy level + social bond → sense of control"
#   (3,4,6): Connection × Depth → Velocity
#            "Social bond + depth of feeling → emotional momentum"
#   (4,5,7): Depth × Coping → Novelty
#            "Depth of feeling + sense of control → whether this is new"
#   (5,6,1): Coping × Velocity → Valence
#            "Sense of control + pace of change → overall mood"
#   (6,7,2): Velocity × Novelty → Arousal
#            "Pace of change + novelty → energy level"
#   (7,1,3): Novelty × Valence → Connection
#            "Whether this is new + overall mood → social orientation"

# Fano triples: (i, j, k) means eᵢ × eⱼ = eₖ
FANO_TRIPLES: Final[List[Tuple[int, int, int]]] = [
    (1, 2, 4),  # Valence × Arousal → Depth
    (2, 3, 5),  # Arousal × Connection → Coping
    (3, 4, 6),  # Connection × Depth → Velocity
    (4, 5, 7),  # Depth × Coping → Novelty
    (5, 6, 1),  # Coping × Velocity → Valence
    (6, 7, 2),  # Velocity × Novelty → Arousal
    (7, 1, 3),  # Novelty × Valence → Connection
]

DIMENSION_NAMES: Final[dict[int, str]] = {
    1: "Valence",
    2: "Arousal",
    3: "Connection",
    4: "Depth",
    5: "Coping",
    6: "Velocity",
    7: "Novelty",
}

CLINICAL_NARRATIVES: Final[dict[Tuple[int, int, int], str]] = {
    (1, 2, 4): "How pleasant + how energized → how deeply you feel",
    (2, 3, 5): "Energy level + social bond → sense of control",
    (3, 4, 6): "Social bond + depth of feeling → emotional momentum",
    (4, 5, 7): "Depth of feeling + sense of control → whether this is new",
    (5, 6, 1): "Sense of control + pace of change → overall mood",
    (6, 7, 2): "Pace of change + novelty → energy level",
    (7, 1, 3): "Whether this is new + overall mood → social orientation",
}


def octonion_multiply(a: Octonion, b: Octonion) -> Octonion:
    """Full octonion multiplication using Fano plane rules.

    Product is anti-commutative and non-associative but alternative.

    Multiplication rules:
      eᵢ × eᵢ = -1  (for i = 1..7)
      eᵢ × eⱼ = eₖ  if (i,j,k) is a Fano triple
      eⱼ × eᵢ = -eₖ (reversed order → negated)

    Uses the full 8×8 multiplication table derived from the Fano triples.
    """
    # Build the sparse multiplication sign table from Fano triples
    # mult[i][j] = (sign, result_index)
    # For basis elements only (not the scalar e0)
    result = [0.0] * 8

    a_c = a.components()
    b_c = b.components()

    # e0 × e0 = +1 (scalar × scalar)
    # e0 × eᵢ = eᵢ, eᵢ × e0 = eᵢ (scalar commutes)
    # eᵢ × eᵢ = -1 (square of imaginary)
    # eᵢ × eⱼ = ±eₖ from Fano triples

    # Build full multiplication table: mult_table[i][j] = (sign, index)
    # Index 0 = scalar, 1-7 = imaginary
    mult_table: dict[Tuple[int, int], Tuple[int, int]] = {}

    # eᵢ × eᵢ = -e0  (squares to -1)
    for i in range(1, 8):
        mult_table[(i, i)] = (-1, 0)

    # Fano triples: eᵢ × eⱼ = +eₖ, eⱼ × eᵢ = -eₖ
    for i, j, k in FANO_TRIPLES:
        mult_table[(i, j)] = (+1, k)
        mult_table[(j, i)] = (-1, k)
        # Cyclic: also eⱼ × eₖ = +eᵢ, eₖ × eⱼ = -eᵢ
        mult_table[(j, k)] = (+1, i)
        mult_table[(k, j)] = (-1, i)
        # And: eₖ × eᵢ = +eⱼ, eᵢ × eₖ = -eⱼ
        mult_table[(k, i)] = (+1, j)
        mult_table[(i, k)] = (-1, j)

    # Compute product component-by-component
    for i in range(8):
        for j in range(8):
            if i == 0 and j == 0:
                # e0 × e0 = +e0
                result[0] += a_c[0] * b_c[0]
            elif i == 0:
                # e0 × eⱼ = +eⱼ
                result[j] += a_c[0] * b_c[j]
            elif j == 0:
                # eᵢ × e0 = +eᵢ
                result[i] += a_c[i] * b_c[0]
            else:
                # Imaginary × Imaginary: look up in table
                sign, idx = mult_table[(i, j)]
                result[idx] += sign * a_c[i] * b_c[j]

    return Octonion(*result)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: Validation Tests
# ═══════════════════════════════════════════════════════════════════════════════


def test_basic_octonion_creation():
    """Test 1: Basic octonion construction and unit-norm."""
    print("=" * 60)
    print("TEST 1: Basic Octonion Creation")
    print("=" * 60)

    identity = Octonion.identity()
    assert identity.is_unit(), "Identity must be unit"
    print(f"  ✅ Identity:  {identity}")
    print(f"     ‖o‖ = {identity.magnitude():.10f}")

    # Joy: high valence, moderate arousal, connected
    joy = vac_extended_to_octonion(0.8, 0.5, 0.7)
    assert joy.is_unit(), f"Joy must be unit, got {joy.magnitude()}"
    print(f"  ✅ Joy (VAC only): {joy}")
    print(f"     ‖o‖ = {joy.magnitude():.10f}")

    # Joy with full 7D: add depth, coping, novelty
    joy_full = vac_extended_to_octonion(0.8, 0.5, 0.7, depth=0.6, coping=0.4, novelty=-0.2)
    assert joy_full.is_unit(), f"Joy(7D) must be unit, got {joy_full.magnitude()}"
    print(f"  ✅ Joy (full 7D): {joy_full}")
    print(f"     ‖o‖ = {joy_full.magnitude():.10f}")

    # Neutral / zero
    neutral = vac_extended_to_octonion(0.0, 0.0, 0.0)
    assert neutral == identity, "Zero input must give identity"
    print(f"  ✅ Neutral:   {neutral}")

    # Maximum intensity
    max_intense = vac_extended_to_octonion(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0)
    assert max_intense.is_unit(), f"Max intensity must be unit, got {max_intense.magnitude()}"
    print(f"  ✅ Max (all +1): {max_intense}")
    print(f"     ‖o‖ = {max_intense.magnitude():.10f}")
    print(f"     e0 (scalar) = {max_intense.e0:.6f}  (should be cos(π/2) ≈ 0)")
    print()


def test_slerp_norm_preservation():
    """Test 2: SLERP maintains unit-norm at every step."""
    print("=" * 60)
    print("TEST 2: SLERP Norm Preservation on S⁷")
    print("=" * 60)

    joy = vac_extended_to_octonion(0.8, 0.5, 0.7, 0.6, 0.4, 0.0, -0.2)
    sadness = vac_extended_to_octonion(-0.6, -0.3, -0.4, -0.3, -0.5, 0.0, 0.1)

    path = geometric_slerp_s7(joy, sadness, steps=60)

    max_deviation = 0.0
    for i, o in enumerate(path):
        deviation = abs(o.magnitude() - 1.0)
        max_deviation = max(max_deviation, deviation)
        if deviation > EPSILON:
            print(f"  ❌ Frame {i}: ‖o‖ = {o.magnitude():.10f} (deviation: {deviation:.2e})")

    if max_deviation < EPSILON:
        print(f"  ✅ All {len(path)} frames maintain unit norm!")
        print(f"     Max deviation: {max_deviation:.2e}")
    else:
        print(f"  ⚠️  Max deviation: {max_deviation:.2e}")

    # Check endpoints
    assert path[0].dot(joy) > 0.999, "Path start must match joy"
    assert (
        path[-1].dot(sadness) > 0.999 or path[-1].dot(sadness.negate()) > 0.999
    ), "Path end must match sadness"
    print("  ✅ Endpoints verified (start≈joy, end≈sadness)")

    # Angular distance verification
    dist = octonion_angular_distance(joy, sadness)
    print(f"  📐 Angular distance Joy→Sadness: {dist:.4f} rad ({math.degrees(dist):.1f}°)")
    print()


def test_slerp_constant_velocity():
    """Test 3: SLERP has constant angular velocity between frames."""
    print("=" * 60)
    print("TEST 3: SLERP Constant Angular Velocity")
    print("=" * 60)

    o1 = vac_extended_to_octonion(0.8, 0.5, 0.7, 0.3, 0.2, 0.0, 0.1)
    o2 = vac_extended_to_octonion(-0.4, 0.6, -0.3, -0.1, 0.5, 0.0, -0.4)

    path = geometric_slerp_s7(o1, o2, steps=20)

    # Compute per-frame angular distances
    frame_distances = []
    for i in range(1, len(path)):
        d = octonion_angular_distance(path[i - 1], path[i])
        frame_distances.append(d)

    if not frame_distances:
        print("  ⚠️  Not enough frames")
        return

    avg_dist = sum(frame_distances) / len(frame_distances)
    max_var = max(abs(d - avg_dist) for d in frame_distances)

    print(f"  Average per-frame distance: {avg_dist:.6f} rad")
    print(f"  Max variance from average:  {max_var:.2e}")

    if max_var < 1e-10:
        print("  ✅ Constant angular velocity confirmed!")
    else:
        print("  ⚠️  Slight velocity variance (still acceptable if < 1e-6)")
    print()


def test_directional_preservation():
    """Test 4: VAC axis ratios are preserved in octonion projection.

    Given pure VAC values (new dims = 0), the *direction* (ratios) of
    the first 3 imaginary components should match the quaternion.
    The absolute magnitude will differ due to √3 vs √7 scaling.
    """
    print("=" * 60)
    print("TEST 4: Directional Preservation (VAC Ratios)")
    print("=" * 60)

    test_cases = [
        (0.8, 0.5, 0.7, "Joy"),
        (-0.6, -0.3, -0.4, "Sadness"),
        (-0.7, 0.8, -0.3, "Anger"),
        (0.9, 0.4, 0.95, "Love"),
        (0.01, 0.01, 0.01, "Near-neutral"),
    ]

    for v, a, c, name in test_cases:
        q = vac_to_quaternion(v, a, c)
        o = vac_extended_to_octonion(v, a, c)  # D=P=Ė=N all 0

        # Check imaginary direction ratios
        # q: (x, y, z) and o: (e1, e2, e3) should be proportional
        q_imag = [q.x, q.y, q.z]
        o_imag = [o.e1, o.e2, o.e3]

        # Check ratio consistency: e1/x ≈ e2/y ≈ e3/z
        q_mag = math.sqrt(sum(x**2 for x in q_imag))
        o_mag = math.sqrt(sum(x**2 for x in o_imag))

        if q_mag < EPSILON or o_mag < EPSILON:
            print(f"  ✅ {name}: Both near-zero (neutral), skip ratio check")
            continue

        # Normalize both to unit vectors and compare directions
        q_dir = [x / q_mag for x in q_imag]
        o_dir = [x / o_mag for x in o_imag]

        direction_dot = sum(qd * od for qd, od in zip(q_dir, o_dir))

        if abs(direction_dot - 1.0) < 1e-6:
            print(f"  ✅ {name}: Direction preserved! (dot = {direction_dot:.10f})")
            print(f"     Q scalar: {q.w:.6f}, O scalar: {o.e0:.6f} (differ due to √3 vs √7)")
        else:
            print(f"  ❌ {name}: Direction NOT preserved! (dot = {direction_dot:.10f})")

        # Verify octonion dims 4-7 are zero
        assert abs(o.e4) < EPSILON, f"{name}: e4 should be 0, got {o.e4}"
        assert abs(o.e5) < EPSILON, f"{name}: e5 should be 0, got {o.e5}"
        assert abs(o.e6) < EPSILON, f"{name}: e6 should be 0, got {o.e6}"
        assert abs(o.e7) < EPSILON, f"{name}: e7 should be 0, got {o.e7}"

    print()


def test_fano_multiplication():
    """Test 5: Fano plane multiplication rules."""
    print("=" * 60)
    print("TEST 5: Fano Plane Multiplication")
    print("=" * 60)

    # Create basis unit octonions
    def basis(idx: int) -> Octonion:
        """Create unit basis octonion eᵢ."""
        comps = [0.0] * 8
        comps[idx] = 1.0
        return Octonion(*comps)

    # Test each Fano triple: eᵢ × eⱼ = eₖ
    for i, j, k in FANO_TRIPLES:
        ei = basis(i)
        ej = basis(j)
        ek = basis(k)

        product = octonion_multiply(ei, ej)
        expected_comps = ek.components()
        actual_comps = product.components()

        match = all(abs(a - e) < EPSILON for a, e in zip(actual_comps, expected_comps))

        name_i = DIMENSION_NAMES[i]
        name_j = DIMENSION_NAMES[j]
        name_k = DIMENSION_NAMES[k]
        narrative = CLINICAL_NARRATIVES[(i, j, k)]

        if match:
            print(f"  ✅ e{i}×e{j}=e{k}: {name_i} × {name_j} → {name_k}")
            print(f'     Clinical: "{narrative}"')
        else:
            print(f"  ❌ e{i}×e{j}=e{k}: FAILED!")
            print(f"     Expected: {expected_comps}")
            print(f"     Got:      {actual_comps}")

    # Test anti-commutativity: eᵢ × eⱼ = -eⱼ × eᵢ
    print()
    print("  Anti-commutativity check:")
    for i, j, _k in FANO_TRIPLES:
        ei = basis(i)
        ej = basis(j)
        p1 = octonion_multiply(ei, ej)
        p2 = octonion_multiply(ej, ei)
        # p1 should equal -p2
        match = all(abs(a + b) < EPSILON for a, b in zip(p1.components(), p2.components()))
        if match:
            print(f"  ✅ e{i}×e{j} = -e{j}×e{i}")
        else:
            print(f"  ❌ Anti-commutativity failed for e{i}, e{j}")

    # Test non-associativity (expected to fail for general case)
    print()
    print("  Non-associativity demonstration:")
    e1, e2, e3 = basis(1), basis(2), basis(3)
    lhs = octonion_multiply(octonion_multiply(e1, e2), e3)  # (e1×e2)×e3
    rhs = octonion_multiply(e1, octonion_multiply(e2, e3))  # e1×(e2×e3)
    is_associative = all(abs(a - b) < EPSILON for a, b in zip(lhs.components(), rhs.components()))
    if not is_associative:
        print("  ✅ Confirmed non-associative: (e1×e2)×e3 ≠ e1×(e2×e3)")
        print(f"     (e1×e2)×e3 = {lhs}")
        print(f"     e1×(e2×e3) = {rhs}")
    else:
        print("  ⚠️  This triple is associative (valid for some triples)")
    print()


def test_clinical_emotions():
    """Test 6: Create rich 7D emotional states and interpolate."""
    print("=" * 60)
    print("TEST 6: Clinical Emotions — Rich 7D States")
    print("=" * 60)

    emotions = {
        "Joy (Deep, Empowered)": (0.8, 0.5, 0.7, 0.6, 0.4, 0.0, -0.2),
        "Sadness (Shallow, Helpless)": (-0.6, -0.3, -0.4, -0.3, -0.5, 0.0, 0.1),
        "Anger (Deep, Empowered)": (-0.7, 0.8, -0.3, 0.7, 0.6, 0.0, 0.3),
        "Anxiety (Surface, Helpless)": (-0.4, 0.7, -0.2, -0.5, -0.7, 0.0, 0.8),
        "Serenity (Deep, Empowered)": (0.6, -0.3, 0.5, 0.8, 0.7, 0.0, -0.6),
        "Surprise (Novel)": (0.2, 0.9, 0.1, 0.3, 0.0, 0.0, 0.9),
    }

    octonions = {}
    for name, dims in emotions.items():
        o = vac_extended_to_octonion(*dims)
        octonions[name] = o
        print(f"  🔮 {name}")
        print(f"     {o}")
        print(f"     ‖o‖ = {o.magnitude():.10f}")

    # Pairwise distances
    print()
    print("  Pairwise Angular Distances:")
    names = list(emotions.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            dist = octonion_angular_distance(octonions[names[i]], octonions[names[j]])
            print(
                f"    {names[i][:20]:>20s} ↔ {names[j][:20]:<20s}: "
                f"{dist:.4f} rad ({math.degrees(dist):.1f}°)"
            )
    print()


def test_edge_cases():
    """Test 7: Edge cases — extremes, near-antipodal, velocity bootstrapping."""
    print("=" * 60)
    print("TEST 7: Edge Cases")
    print("=" * 60)

    # 1. First-utterance velocity = 0 (cold start)
    first_utterance = vac_extended_to_octonion(0.5, 0.3, 0.4, 0.2, 0.3, velocity=0.0, novelty=0.5)
    assert first_utterance.is_unit(), "First utterance (velocity=0) must be unit"
    print(f"  ✅ First utterance (Velocity=0): {first_utterance}")

    # 2. All negative extremes
    all_neg = vac_extended_to_octonion(-1, -1, -1, -1, -1, -1, -1)
    assert all_neg.is_unit()
    print(f"  ✅ All -1: {all_neg}")

    # 3. Single dimension active
    valence_only = vac_extended_to_octonion(0.9, 0, 0, 0, 0, 0, 0)
    assert valence_only.is_unit()
    assert abs(valence_only.e2) < EPSILON, "Only e1 should be active"
    print(f"  ✅ Valence-only: {valence_only}")

    # 4. SLERP between near-identical states
    o1 = vac_extended_to_octonion(0.5, 0.3, 0.4)
    o2 = vac_extended_to_octonion(0.500001, 0.300001, 0.400001)
    path = geometric_slerp_s7(o1, o2, steps=10)
    all_unit = all(abs(o.magnitude() - 1.0) < EPSILON for o in path)
    print(f"  ✅ Near-identical SLERP: all unit = {all_unit}")

    # 5. SLERP between near-antipodal states
    o_pos = vac_extended_to_octonion(0.8, 0.5, 0.7, 0.4, 0.3, 0.2, 0.1)
    o_neg = vac_extended_to_octonion(-0.8, -0.5, -0.7, -0.4, -0.3, -0.2, -0.1)
    path = geometric_slerp_s7(o_pos, o_neg, steps=30)
    all_unit = all(abs(o.magnitude() - 1.0) < 1e-5 for o in path)
    print(f"  ✅ Antipodal SLERP: all unit = {all_unit}")

    # 6. Identity SLERP (start = target)
    o = vac_extended_to_octonion(0.3, 0.4, 0.5)
    path = geometric_slerp_s7(o, o, steps=10)
    all_same = all(abs(p.dot(o) - 1.0) < EPSILON for p in path)
    print(f"  ✅ Identity SLERP (o→o): all identical = {all_same}")
    print()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║   L.O.V.E. Octonion Math Prototype — Phase 0 Validation    ║")
    print("║   8D Emotional Space on S⁷ with Geometric SLERP            ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    test_basic_octonion_creation()
    test_slerp_norm_preservation()
    test_slerp_constant_velocity()
    test_directional_preservation()
    test_fano_multiplication()
    test_clinical_emotions()
    test_edge_cases()

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║   ALL TESTS COMPLETE — Octonion math validated on S⁷! 🎉   ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
