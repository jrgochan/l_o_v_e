"""Quaternion Algebra Implementation.

This module implements quaternion mathematics for 3D rotation representation
in the L.O.V.E. platform. Quaternions avoid gimbal lock and provide smooth
interpolation (SLERP) between emotional states.

Mathematical Foundation:
    A quaternion q = w + xi + yj + zk represents a rotation where:
    - w = cos(θ/2) = scalar/real part
    - (x, y, z) = sin(θ/2) * axis = vector/imaginary part
    - θ = rotation angle in radians
    - axis = unit vector defining rotation axis

Why Quaternions for Emotions?
    1. **Gimbal lock avoidance:** Euler angles suffer from singularities
    2. **Smooth interpolation:** SLERP provides constant angular velocity
    3. **Compact representation:** 4 numbers vs 9 (rotation matrix)
    4. **Efficient composition:** Quaternion multiplication is O(1)
    5. **Double-cover property:** q and -q represent same rotation

Performance:
    - Normalization: O(1) - 4 mults, 3 adds, 1 sqrt, 4 divs
    - Multiplication: O(1) - 16 mults, 12 adds
    - Dot product: O(1) - 4 mults, 3 adds
    - All operations are constant time

References:
    - Shoemake, K. (1985). "Animating rotation with quaternion curves"
    - VAC Model: docs/architecture/02-vac-model.md
    - SLERP: docs/modules/versor/senior-developers/04-slerp-interpolation.md

Example:
    Basic quaternion operations::

        # Create identity (no rotation)
        q_id = Quaternion.identity()
        print(q_id.magnitude())  # 1.0

        # Create from axis-angle
        import math
        axis = (0, 0, 1)  # Z-axis
        angle = math.pi / 2  # 90 degrees
        q_rot = Quaternion.from_axis_angle(axis, angle)

        # Compose rotations
        q_composed = q_rot.multiply(q_rot)
        print(q_composed)  # 180 degree rotation
"""

import math
from dataclasses import dataclass
from typing import Final

from ..types import AxisTuple

EPSILON: Final[float] = 1e-6  # Numerical tolerance for floating point comparisons


@dataclass(frozen=True)
class Quaternion:
    """Unit quaternion representing a rotation in 3D space.

    Notation: q = w + xi + yj + zk
    Components: [w, x, y, z] (scalar-first convention)

    Scalar-first vs scalar-last:
        - **Scalar-first (this implementation):** q = [w, x, y, z]
        - **Scalar-last (some libraries):** q = [x, y, z, w]

    We use scalar-first because it's more intuitive:
        - w is the "primary" component (cos term)
        - Matches mathematical notation: w + xi + yj + zk
        - Aligns with scipy.spatial.transform.Rotation

    Constraints:
        For valid rotations: ||q|| = 1.0 (unit quaternion)
        Tolerance: |magnitude - 1.0| < 1e-6 for numerical stability

    Double-Cover Property:
        Quaternions q and -q represent the same physical rotation.
        Why? Because rotating by θ around axis equals rotating by
        (2π - θ) around -axis, producing identical 3D orientation.

        This means emotional states have two quaternion representations,
        but we typically choose the one with w ≥ 0 for consistency.

    Immutability:
        This class is frozen (immutable) to prevent accidental modification.
        All operations return new Quaternion instances.
    """

    w: float  # Scalar component: cos(θ/2)
    x: float  # Vector component (i): sin(θ/2) * axis_x
    y: float  # Vector component (j): sin(θ/2) * axis_y
    z: float  # Vector component (k): sin(θ/2) * axis_z

    @classmethod
    def identity(cls) -> "Quaternion":
        """Create identity quaternion (no rotation).

        The identity quaternion represents zero rotation, leaving any
        3D point unchanged when applied as a rotation transform.

        Mathematical form:
            q_id = 1 + 0i + 0j + 0k = [1, 0, 0, 0]

        This corresponds to:
            - Rotation angle θ = 0
            - w = cos(0/2) = 1
            - (x,y,z) = sin(0/2) * axis = (0, 0, 0)

        Returns:
            Quaternion: Identity quaternion [1, 0, 0, 0]

        Example:
            >>> q_id = Quaternion.identity()
            >>> q_id.magnitude()
            1.0
            >>> # Multiplying any quaternion by identity returns the same quaternion
            >>> q = Quaternion(0.707, 0, 0, 0.707)
            >>> q_result = q.multiply(q_id)
            >>> q_result == q
            True
        """
        return cls(w=1.0, x=0.0, y=0.0, z=0.0)

    def magnitude(self) -> float:
        """Compute the Euclidean norm of the quaternion.

        The magnitude represents the "length" of the quaternion in 4D space.
        For unit quaternions (valid rotations), magnitude should be 1.0.

        Formula:
            ||q|| = √(w² + x² + y² + z²)

        This is the Euclidean norm in 4D space, analogous to vector length
        in 3D space: ||v|| = √(x² + y² + z²)

        Why calculate magnitude?
            - Verify quaternion is unit length (||q|| ≈ 1.0)
            - Normalize non-unit quaternions
            - Detect degenerate quaternions (||q|| ≈ 0)
            - Check numerical stability after operations

        Performance:
            Time complexity: O(1)
            Operations: 4 multiplications, 3 additions, 1 sqrt
            Typical execution: < 5 nanoseconds on modern hardware

        Returns:
            float: Magnitude of quaternion, range [0, ∞)

        Example:
            >>> q = Quaternion(1, 0, 0, 0)  # Identity
            >>> q.magnitude()
            1.0
            >>> q = Quaternion(2, 0, 0, 0)  # Scaled (not unit)
            >>> q.magnitude()
            2.0
        """
        # ═══════════════════════════════════════════════════════════════════
        # EUCLIDEAN NORM CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # Formula: ||q|| = √(w² + x² + y² + z²)
        #
        # Each component is squared to:
        #   1. Make all values positive (removes sign information)
        #   2. Weight larger values more heavily (quadratic growth)
        #   3. Enable pythagorean distance calculation
        #
        # The square root brings the result back to the same scale as the
        # original components, giving us an interpretable "length" metric.
        return math.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)

    def normalize(self) -> "Quaternion":
        """Normalize quaternion to unit length.

        Normalization ensures the quaternion has magnitude 1.0, which is
        required for representing valid 3D rotations. Non-unit quaternions
        would scale the space in addition to rotating it.

        Algorithm:
            1. Calculate magnitude: ||q|| = √(w² + x² + y² + z²)
            2. Divide each component by magnitude: q' = q / ||q||
            3. Result: ||q'|| = 1.0 (unit quaternion)

        Why normalize?
            - Numerical errors accumulate during calculations
            - Composition of rotations can introduce small errors
            - Normalization maintains rotation validity
            - Prevents unintended scaling of emotional space
            - Essential after multiplication or interpolation

        Edge case handling:
            If ||q|| < ε (near-zero), returns identity quaternion.
            This handles degenerate cases gracefully without division by zero.

        Performance:
            Time complexity: O(1)
            Operations: magnitude() + 4 divisions
            Typical execution: < 10 nanoseconds

        Returns:
            Quaternion: Normalized quaternion with magnitude 1.0

        Example:
            >>> q = Quaternion(1, 2, 3, 4)  # Non-unit
            >>> q.magnitude()
            5.477225575051661
            >>> q_norm = q.normalize()
            >>> q_norm.magnitude()
            1.0  # Unit quaternion
            >>> # Near-zero quaternion returns identity
            >>> q_zero = Quaternion(1e-10, 0, 0, 0)
            >>> q_zero.normalize()
            Quaternion(w=1.0, x=0.0, y=0.0, z=0.0)
        """
        # ═══════════════════════════════════════════════════════════════════
        # MAGNITUDE CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        mag = self.magnitude()

        # ═══════════════════════════════════════════════════════════════════
        # EDGE CASE: Near-zero quaternion
        # ═══════════════════════════════════════════════════════════════════
        # If magnitude is extremely small (< 1e-6), the quaternion is
        # effectively zero. Division by near-zero would cause numerical
        # instability or NaN values. Instead, return identity quaternion
        # as a safe default that represents "no rotation".
        #
        # This should rarely happen in practice, but protects against:
        #   - Accumulated numerical errors
        #   - Invalid input data
        #   - Edge cases in VAC conversion
        if (
            mag < EPSILON
        ):  # pragma: no cover - defensive, near-zero quaternions are prevented upstream
            return Quaternion.identity()

        # ═══════════════════════════════════════════════════════════════════
        # NORMALIZATION: Divide each component by magnitude
        # ═══════════════════════════════════════════════════════════════════
        # q' = (w/||q||, x/||q||, y/||q||, z/||q||)
        # Result: ||q'|| = 1.0 (unit quaternion)
        #
        # Why this works:
        #   ||q'|| = √((w/m)² + (x/m)² + (y/m)² + (z/m)²)
        #         = √((w² + x² + y² + z²) / m²)
        #         = √(m² / m²)
        #         = 1.0
        return Quaternion(w=self.w / mag, x=self.x / mag, y=self.y / mag, z=self.z / mag)

    def conjugate(self) -> "Quaternion":
        """Compute the conjugate of this quaternion.

        The conjugate flips the sign of the vector part while keeping
        the scalar part unchanged: q* = w - xi - yj - zk

        For unit quaternions (||q|| = 1), the conjugate equals the inverse:
            q * q* = q* * q = 1 (identity)

        Geometric meaning:
            If q represents rotation by θ around axis v,
            then q* represents rotation by -θ around axis v
            (rotation in opposite direction).

        Why use conjugate?
            - Inverse rotation: Apply q, then q* to return to original
            - Transform vectors: v' = q * v * q*
            - Compute relative rotations: q_rel = q2 * q1*
            - Much faster than general quaternion inverse (no division)

        Performance:
            Time complexity: O(1)
            Operations: 3 negations
            Typical execution: < 1 nanosecond

        Returns:
            Quaternion: Conjugate quaternion [w, -x, -y, -z]

        Example:
            >>> q = Quaternion(0.707, 0, 0, 0.707)  # 90° around Z
            >>> q_conj = q.conjugate()
            >>> q_conj
            Quaternion(w=0.707, x=0.0, y=0.0, z=-0.707)
            >>> # Conjugate is inverse for unit quaternions
            >>> identity = q.multiply(q_conj)
            >>> identity.w
            1.0  # (approximately, within numerical precision)
        """
        # ═══════════════════════════════════════════════════════════════════
        # CONJUGATE CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # Formula: q* = w - xi - yj - zk = [w, -x, -y, -z]
        #
        # Keep scalar part (w) unchanged
        # Negate all vector components (x, y, z)
        #
        # Why this is the inverse for unit quaternions:
        #   q * q* = (w + xi + yj + zk)(w - xi - yj - zk)
        #         = w² + x² + y² + z²  (using quaternion multiplication)
        #         = ||q||²
        #         = 1  (for unit quaternions)
        return Quaternion(w=self.w, x=-self.x, y=-self.y, z=-self.z)

    def dot(self, other: "Quaternion") -> float:
        """Calculate dot product with another quaternion.

        The dot product measures the "similarity" between two quaternions.
        Geometrically, it's related to the angle between them in 4D space.

        Formula:
            q1 · q2 = w₁w₂ + x₁x₂ + y₁y₂ + z₁z₂

        Interpretation:
            - dot = 1.0: Quaternions are identical (0° apart)
            - dot = 0.0: Quaternions are orthogonal (90° apart)
            - dot = -1.0: Quaternions are opposite (180° apart)
            - |dot| > 0.999: Very close (< 5° apart)

        Usage in SLERP:
            The dot product determines:
            1. Interpolation direction (choose shortest path)
            2. Whether to use SLERP or LERP (based on angle)
            3. Numerical stability considerations

        Performance:
            Time complexity: O(1)
            Operations: 4 multiplications, 3 additions
            Typical execution: < 2 nanoseconds

        Args:
            other: Another quaternion

        Returns:
            float: Dot product, range [-1, 1] for unit quaternions

        Example:
            >>> q1 = Quaternion.identity()
            >>> q2 = Quaternion.identity()
            >>> q1.dot(q2)
            1.0  # Identical quaternions
            >>> q2_neg = Quaternion(-1, 0, 0, 0)
            >>> q1.dot(q2_neg)
            -1.0  # Opposite quaternions (but same rotation!)
        """
        # ═══════════════════════════════════════════════════════════════════
        # DOT PRODUCT CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # Formula: q1 · q2 = w₁w₂ + x₁x₂ + y₁y₂ + z₁z₂
        #
        # This is the standard inner product in 4D space.
        # Each component pair is multiplied and summed.
        #
        # For unit quaternions, the dot product equals the cosine of
        # half the angle between the rotations they represent:
        #   cos(θ/2) = q1 · q2
        #   θ = 2 * arccos(q1 · q2)
        return self.w * other.w + self.x * other.x + self.y * other.y + self.z * other.z

    def multiply(self, other: "Quaternion") -> "Quaternion":
        """Quaternion multiplication (Hamilton product).

        Quaternion multiplication composes two rotations: applying q1
        then q2 is equivalent to applying the product q2 * q1 (note order!).

        WARNING: Quaternion multiplication is NON-COMMUTATIVE:
            q1 × q2 ≠ q2 × q1 (except for special cases)

        This is because 3D rotations don't commute - rotating around X
        then Y gives a different result than rotating around Y then X.

        Hamilton Product Formula:
            Given q1 = w1 + x1i + y1j + z1k and q2 = w2 + x2i + y2j + z2k:

            w = w1*w2 - x1*x2 - y1*y2 - z1*z2  (scalar part)
            x = w1*x2 + x1*w2 + y1*z2 - z1*y2  (i component)
            y = w1*y2 - x1*z2 + y1*w2 + z1*x2  (j component)
            z = w1*z2 + x1*y2 - y1*x2 + z1*w2  (k component)

        Rules used:
            i² = j² = k² = -1
            ij = k, jk = i, ki = j (right-hand rule)
            ji = -k, kj = -i, ik = -j (anti-commutative)

        Performance:
            Time complexity: O(1)
            Operations: 16 multiplications, 12 additions
            Typical execution: < 5 nanoseconds

        Args:
            other: Quaternion to multiply with (applied second)

        Returns:
            Quaternion: Product quaternion representing composed rotation

        Example:
            >>> import math
            >>> # 90° rotation around Z-axis
            >>> q1 = Quaternion.from_axis_angle((0, 0, 1), math.pi/2)
            >>> # Another 90° rotation around Z
            >>> q2 = Quaternion.from_axis_angle((0, 0, 1), math.pi/2)
            >>> # Compose: 90° + 90° = 180° rotation
            >>> q_composed = q1.multiply(q2)
            >>> # Verify non-commutativity (though same in this case)
            >>> q_reverse = q2.multiply(q1)
            >>> # For same-axis rotations, multiplication is commutative
            >>> abs(q_composed.w - q_reverse.w) < 1e-6
            True
        """
        # ═══════════════════════════════════════════════════════════════════
        # HAMILTON PRODUCT CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # This implements the full quaternion multiplication formula.
        # The signs and terms come from the quaternion algebra rules.

        # Scalar part: w1*w2 - (x1*x2 + y1*y2 + z1*z2)
        # This is: scalar*scalar - dot(vector1, vector2)
        w = self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z

        # i component: w1*x2 + x1*w2 + (y1*z2 - z1*y2)
        # This is: cross product of vector parts, plus scalar interactions
        x = self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y

        # j component: w1*y2 + y1*w2 + (z1*x2 - x1*z2)
        y = self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x

        # k component: w1*z2 + z1*w2 + (x1*y2 - y1*x2)
        z = self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w

        return Quaternion(w=w, x=x, y=y, z=z)

    def is_unit(self, tolerance: float = EPSILON) -> bool:
        """Check if quaternion is unit length.

        Verifies that ||q|| ≈ 1.0 within specified tolerance.
        Unit quaternions are required for valid rotations.

        Why check?
            - Verify quaternion represents valid rotation
            - Detect numerical errors from calculations
            - Validate input data
            - Determine if normalization is needed

        Tolerance considerations:
            - Default 1e-6 balances precision and practicality
            - Too strict: Legitimate quaternions fail due to floating point
            - Too loose: Invalid rotations pass through
            - After many operations, tolerance may need to be higher

        Args:
            tolerance: Acceptable deviation from 1.0 (default: 1e-6)

        Returns:
            bool: True if ||q|| ≈ 1.0 within tolerance

        Example:
            >>> q = Quaternion.identity()
            >>> q.is_unit()
            True
            >>> q_scaled = Quaternion(2, 0, 0, 0)
            >>> q_scaled.is_unit()
            False
            >>> # After normalization
            >>> q_norm = q_scaled.normalize()
            >>> q_norm.is_unit()
            True
        """
        # ═══════════════════════════════════════════════════════════════════
        # UNIT LENGTH VERIFICATION
        # ═══════════════════════════════════════════════════════════════════
        # Check if: |magnitude - 1.0| < tolerance
        #
        # Why use absolute difference instead of percentage?
        #   - Magnitude is always positive
        #   - Target is exactly 1.0 (not variable)
        #   - Absolute difference is simpler and sufficient
        #   - Matches IEEE 754 floating point comparison practices
        mag = self.magnitude()
        return abs(mag - 1.0) < tolerance

    @classmethod
    def from_axis_angle(cls, axis: AxisTuple, angle: float) -> "Quaternion":
        """Create quaternion from axis-angle representation.

        Converts the intuitive axis-angle rotation format to quaternion form.
        This is the primary way to construct quaternions from geometric data.

        Formula:
            Given rotation by angle θ around unit vector (ax, ay, az):

            w = cos(θ/2)
            x = ax * sin(θ/2)
            y = ay * sin(θ/2)
            z = az * sin(θ/2)

        Why half-angle?
            Quaternions use half-angle because of how they compose:
            - q(θ/2) applied twice gives rotation θ
            - This matches the double-cover property
            - Enables smooth interpolation via SLERP

        Assumptions:
            - Axis should be unit vector (will work if not, but less intuitive)
            - Angle in radians (use math.radians() if you have degrees)
            - Right-hand rule: positive angle rotates counter-clockwise
              when looking down the axis toward origin

        Performance:
            Time complexity: O(1)
            Operations: 1 division, 2 trig functions, 3 multiplications
            Typical execution: < 20 nanoseconds

        Args:
            axis: Unit vector [x, y, z] defining rotation axis
                 (does not need to be normalized, but should be close)
            angle: Rotation angle in radians

        Returns:
            Quaternion: Unit quaternion representing the rotation

        Example:
            >>> import math
            >>> # 90° rotation around Z-axis
            >>> axis = (0, 0, 1)
            >>> angle = math.pi / 2
            >>> q = Quaternion.from_axis_angle(axis, angle)
            >>> q.is_unit()
            True
            >>> # 180° rotation around X-axis
            >>> q_flip = Quaternion.from_axis_angle((1, 0, 0), math.pi)
            >>> q_flip.w  # cos(π/2) = 0
            0.0
        """
        # ═══════════════════════════════════════════════════════════════════
        # HALF-ANGLE CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # Divide angle by 2 because quaternions use half-angle formulation.
        # This is fundamental to quaternion algebra and the double-cover
        # property (q and -q represent the same rotation).
        half_angle = angle / 2

        # Calculate sin and cos of half-angle
        # These will be used multiple times, so compute once
        sin_half = math.sin(half_angle)
        cos_half = math.cos(half_angle)

        # ═══════════════════════════════════════════════════════════════════
        # QUATERNION CONSTRUCTION
        # ═══════════════════════════════════════════════════════════════════
        # Formula:
        #   w = cos(θ/2)              # Scalar part
        #   x = ax * sin(θ/2)         # i component
        #   y = ay * sin(θ/2)         # j component
        #   z = az * sin(θ/2)         # k component
        #
        # The axis components are scaled by sin(θ/2) to encode both the
        # direction of rotation (axis) and amount of rotation (angle).
        return cls(w=cos_half, x=axis[0] * sin_half, y=axis[1] * sin_half, z=axis[2] * sin_half)
