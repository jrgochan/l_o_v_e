"""Octonion Algebra Implementation.

This module implements octonion mathematics for 8D emotional state representation
in the L.O.V.E. platform. Octonions extend quaternions to capture 7 appraisal
dimensions: Valence, Arousal, Connection, Depth, Coping, Velocity, and Novelty.

Mathematical Foundation:
    An octonion o = e₀ + e₁i₁ + e₂i₂ + e₃i₃ + e₄i₄ + e₅i₅ + e₆i₆ + e₇i₇ where:
    - e₀ = cos(θ/2) = scalar (total emotional intensity)
    - (e₁...e₇) = sin(θ/2) × axis = imaginary components
    - θ = rotation angle on S⁷, mapped from 7D emotional magnitude

Dimension Mapping (Hybrid Model):
    e₁: Valence     — Pleasure ↔ Displeasure
    e₂: Arousal     — Energy ↔ Lethargy
    e₃: Connection  — Connected ↔ Isolated
    e₄: Depth       — Profound ↔ Superficial
    e₅: Coping      — Empowered ↔ Helpless
    e₆: Velocity    — Rapid change ↔ Stillness (computed)
    e₇: Novelty     — Novel ↔ Familiar

Key Properties:
    - Non-commutative: a × b ≠ b × a
    - Non-associative: (a × b) × c ≠ a × (b × c)
    - Alternative: a × (a × b) = (a × a) × b
    - SLERP is geometric on S⁷ (does not require associativity)

References:
    - Baez, J. (2002). "The Octonions"
    - Cayley-Dickson construction
"""

import math
from dataclasses import dataclass
from typing import Final, List, Tuple

EPSILON: Final[float] = 1e-6


# Fano plane triples: (i, j, k) means eᵢ × eⱼ = eₖ
# Convention: (1,2,4), (2,3,5), (3,4,6), (4,5,7), (5,6,1), (6,7,2), (7,1,3)
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


# Pre-computed multiplication table from Fano triples
# mult_table[(i, j)] = (sign, result_index) for imaginary basis elements
def _build_multiplication_table() -> dict[Tuple[int, int], Tuple[int, int]]:
    """Build the sparse octonion multiplication table from Fano triples."""
    table: dict[Tuple[int, int], Tuple[int, int]] = {}

    for i in range(1, 8):
        table[(i, i)] = (-1, 0)  # eᵢ² = -1

    for i, j, k in FANO_TRIPLES:
        table[(i, j)] = (+1, k)
        table[(j, i)] = (-1, k)
        table[(j, k)] = (+1, i)
        table[(k, j)] = (-1, i)
        table[(k, i)] = (+1, j)
        table[(i, k)] = (-1, j)

    return table


_MULT_TABLE: Final[dict[Tuple[int, int], Tuple[int, int]]] = _build_multiplication_table()


@dataclass(frozen=True)
class Octonion:
    """Unit octonion representing an emotional state on S⁷.

    Notation: o = e0 + e1·i₁ + e2·i₂ + e3·i₃ + e4·i₄ + e5·i₅ + e6·i₆ + e7·i₇
    Components: [e0, e1, e2, e3, e4, e5, e6, e7] (scalar-first convention)

    Immutability:
        This class is frozen (immutable). All operations return new instances.
    """

    e0: float  # Scalar (total emotional intensity)
    e1: float  # Valence
    e2: float  # Arousal
    e3: float  # Connection
    e4: float  # Depth
    e5: float  # Coping
    e6: float  # Velocity
    e7: float  # Novelty

    @classmethod
    def identity(cls) -> "Octonion":
        """Identity octonion (neutral state)."""
        return cls(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    def components(self) -> Tuple[float, ...]:
        """All 8 components as tuple."""
        return (self.e0, self.e1, self.e2, self.e3, self.e4, self.e5, self.e6, self.e7)

    def imaginary(self) -> Tuple[float, ...]:
        """7 imaginary components as tuple."""
        return (self.e1, self.e2, self.e3, self.e4, self.e5, self.e6, self.e7)

    def magnitude(self) -> float:
        """Euclidean norm ‖o‖ = √(e0² + e1² + ... + e7²)."""
        return math.sqrt(sum(c * c for c in self.components()))

    def is_unit(self, epsilon: float = EPSILON) -> bool:
        """Check if this is a unit octonion (‖o‖ ≈ 1.0)."""
        return abs(self.magnitude() - 1.0) < epsilon

    def normalize(self) -> "Octonion":
        """Return unit-norm octonion."""
        mag = self.magnitude()
        if mag < EPSILON:
            return Octonion.identity()
        inv = 1.0 / mag
        return Octonion(*(c * inv for c in self.components()))

    def dot(self, other: "Octonion") -> float:
        """Inner product in ℝ⁸."""
        return sum(a * b for a, b in zip(self.components(), other.components()))

    def negate(self) -> "Octonion":
        """Return -o."""
        return Octonion(*(-c for c in self.components()))

    def conjugate(self) -> "Octonion":
        """Octonion conjugate: o* = e0 - e1·i₁ - ... - e7·i₇."""
        return Octonion(
            self.e0, -self.e1, -self.e2, -self.e3, -self.e4, -self.e5, -self.e6, -self.e7
        )

    def to_dict(self) -> dict[str, float]:
        """Serialize to dict for API responses."""
        return {
            "e0": self.e0,
            "e1": self.e1,
            "e2": self.e2,
            "e3": self.e3,
            "e4": self.e4,
            "e5": self.e5,
            "e6": self.e6,
            "e7": self.e7,
        }

    @classmethod
    def from_dict(cls, data: dict[str, float]) -> "Octonion":
        """Deserialize from dict."""
        return cls(
            e0=data["e0"],
            e1=data["e1"],
            e2=data["e2"],
            e3=data["e3"],
            e4=data["e4"],
            e5=data["e5"],
            e6=data["e6"],
            e7=data["e7"],
        )


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

    Generalizes the VAC→Quaternion conversion:
        Quaternion: angle = π × mag / √3  (3 inputs → 4D)
        Octonion:   angle = π × mag / √7  (7 inputs → 8D)

    Args:
        valence:    [-1, 1] Pleasure ↔ Displeasure
        arousal:    [-1, 1] Energy ↔ Lethargy
        connection: [-1, 1] Connected ↔ Isolated
        depth:      [-1, 1] Profound ↔ Superficial
        coping:     [-1, 1] Empowered ↔ Helpless
        velocity:   [-1, 1] Rapid change ↔ Stillness
        novelty:    [-1, 1] Novel ↔ Familiar

    Returns:
        Octonion: Unit octonion on S⁷
    """
    dims = [
        max(-1.0, min(1.0, valence)),
        max(-1.0, min(1.0, arousal)),
        max(-1.0, min(1.0, connection)),
        max(-1.0, min(1.0, depth)),
        max(-1.0, min(1.0, coping)),
        max(-1.0, min(1.0, velocity)),
        max(-1.0, min(1.0, novelty)),
    ]

    mag = math.sqrt(sum(d * d for d in dims))

    if mag < EPSILON:
        return Octonion.identity()

    max_magnitude = math.sqrt(7)
    angle = math.pi * (mag / max_magnitude)

    half_angle = angle / 2
    cos_half = math.cos(half_angle)
    sin_half = math.sin(half_angle)
    scale = sin_half / mag

    result = Octonion(
        e0=cos_half,
        e1=dims[0] * scale,
        e2=dims[1] * scale,
        e3=dims[2] * scale,
        e4=dims[3] * scale,
        e5=dims[4] * scale,
        e6=dims[5] * scale,
        e7=dims[6] * scale,
    )

    if __debug__:
        assert result.is_unit(), f"Octonion not unit: ‖o‖ = {result.magnitude()}"

    return result


def octonion_multiply(a: Octonion, b: Octonion) -> Octonion:
    """Full octonion multiplication using Cayley-Dickson / Fano plane rules.

    Non-commutative and non-associative, but alternative.
    Uses the pre-computed multiplication table for efficiency.
    """
    a_c = a.components()
    b_c = b.components()
    result = [0.0] * 8

    for i in range(8):
        for j in range(8):
            if i == 0 and j == 0:
                result[0] += a_c[0] * b_c[0]
            elif i == 0:
                result[j] += a_c[0] * b_c[j]
            elif j == 0:
                result[i] += a_c[i] * b_c[0]
            else:
                sign, idx = _MULT_TABLE[(i, j)]
                result[idx] += sign * a_c[i] * b_c[j]

    return Octonion(*result)


def octonion_angular_distance(o1: Octonion, o2: Octonion) -> float:
    """Angular distance between two unit octonions on S⁷.

    Uses: θ = arccos(|o₁·o₂|)
    Absolute value handles double-cover property.
    """
    dot = o1.dot(o2)
    dot_clamped = max(-1.0, min(1.0, abs(dot)))
    return math.acos(dot_clamped)


def detect_dominant_octonion_axis(o: Octonion) -> str:
    """Detect which imaginary dimension has the largest absolute value.

    Returns the insight code for the dominant axis.
    """
    imag = list(o.imaginary())
    abs_vals = [abs(v) for v in imag]
    max_idx = abs_vals.index(max(abs_vals))

    axis_codes = [
        "VALENCE_SHIFT",
        "AROUSAL_SHIFT",
        "CONNECTION_SHIFT",
        "DEPTH_SHIFT",
        "COPING_SHIFT",
        "VELOCITY_SHIFT",
        "NOVELTY_SHIFT",
    ]
    return axis_codes[max_idx]


def generate_octonion_insight(axis_code: str) -> str:
    """Convert an axis code to a user-friendly insight message.

    Extends the existing quaternion insight system with 4 new axes.
    """
    insights = {
        "VALENCE_SHIFT": "Your overall mood is the primary focus of change.",
        "AROUSAL_SHIFT": "Your energy level is what's changing most right now.",
        "CONNECTION_SHIFT": "Your sense of social connection is shifting.",
        "DEPTH_SHIFT": "Your feelings are becoming more (or less) deeply held.",
        "COPING_SHIFT": "Your sense of control over this situation is shifting.",
        "VELOCITY_SHIFT": "The pace of your emotional change is itself changing.",
        "NOVELTY_SHIFT": "This feeling is becoming more (or less) familiar to you.",
    }
    return insights.get(axis_code, "Your emotional state is evolving.")
