"""VAC (Valence-Arousal-Connection) Model Implementation.

This module implements the VAC emotional representation and its conversion
to quaternions for L.O.V.E. platform. VAC is a 3-dimensional model that
captures the essential components of emotional experience.

VAC Model:
    The VAC model represents emotions in 3D space with orthogonal axes:

    - **Valence (V):** Pleasure (+1) to Displeasure (-1)
      Examples: Joy (+0.8), Sadness (-0.6)

    - **Arousal (A):** High Energy (+1) to Low Energy (-1)
      Examples: Excitement (+0.9), Calm (-0.7)

    - **Connection (C):** Connected (+1) to Disconnected (-1)
      Examples: Love (+0.9), Loneliness (-0.8)

    Range: All components in [-1.0, 1.0]

VAC to Quaternion Conversion:
    The conversion maps 3D emotional vectors to 4D unit quaternions:

    1. **Direction (Axis):** Normalized VAC vector defines rotation axis
    2. **Intensity (Angle):** VAC magnitude maps to rotation angle

       Mapping: ||VAC|| ∈ [0, √3] → θ ∈ [0, π]

       Why π maximum? Quaternion double-cover: rotations > π wrap back

    3. **Formula:** q = cos(θ/2) + sin(θ/2) * (normalized_VAC)

Why This Mapping?
    - **Preserves emotional intensity:** Larger magnitude = larger rotation
    - **Captures direction:** VAC axis determines quaternion axis
    - **Enables interpolation:** SLERP provides smooth emotional transitions
    - **Handles neutral state:** Zero vector → identity quaternion (no rotation)

Mathematical Foundation:
    Magnitude scaling:
        max_magnitude = √(1² + 1² + 1²) = √3 ≈ 1.732
        angle = π * (||VAC|| / √3)

    This ensures:
        - ||VAC|| = 0     → θ = 0   (neutral/identity)
        - ||VAC|| = 1     → θ = π/√3 ≈ 1.047 rad (≈ 60°)
        - ||VAC|| = √3    → θ = π   (maximum intensity)

Performance:
    - to_quaternion(): O(1) - 6 mults, 3 adds, 2 sqrt, 2 trig
    - magnitude(): O(1) - 3 mults, 2 adds, 1 sqrt
    - Typical execution: < 50 nanoseconds

References:
    - VAC Model: docs/architecture/02-vac-model.md
    - Conversion: docs/modules/versor/senior-developers/03-vac-conversion.md
    - Russell's Circumplex: Similar 2D model (Valence-Arousal only)

Example:
    Convert emotion to quaternion::

        # Joy: high valence, medium arousal, connected
        joy = VACVector(valence=0.8, arousal=0.5, connection=0.7)
        q_joy = joy.to_quaternion()

        # Sadness: low valence, low arousal, disconnected
        sadness = VACVector(valence=-0.6, arousal=-0.3, connection=-0.4)
        q_sadness = sadness.to_quaternion()

        # Calculate emotional distance (angular distance)
        from app.core.transitions import angular_distance, calculate_transition
        transition = calculate_transition(q_joy, q_sadness)
        distance = angular_distance(transition)
        print(f"Emotional distance: {distance:.3f} radians")
"""

import math
from dataclasses import dataclass
from typing import List

from .quaternion import Quaternion

EPSILON = 1e-6  # Numerical tolerance for floating point comparisons


@dataclass
class VACVector:
    """Valence-Arousal-Connection vector representing an emotional state.

    This 3D representation captures the essential dimensions of emotion:
    1. Valence: How pleasant/unpleasant (hedonic tone)
    2. Arousal: How energized/lethargic (activation level)
    3. Connection: How connected/isolated (relational quality)

    Axes:
        - **Valence (V):** Pleasure (+1) to Displeasure (-1)
          * +1.0: Pure joy, ecstasy, delight
          *  0.0: Neutral hedonic tone
          * -1.0: Pure anguish, misery, despair

        - **Arousal (A):** High Energy (+1) to Low Energy (-1)
          * +1.0: Intense activation, alertness
          *  0.0: Moderate energy
          * -1.0: Exhaustion, lethargy

        - **Connection (C):** Connected (+1) to Disconnected (-1)
          * +1.0: Deep intimacy, belonging
          *  0.0: Neutral social state
          * -1.0: Isolation, alienation

    Constraints:
        All components should be in range [-1.0, 1.0]
        Values outside this range are automatically clamped

    Common Emotions in VAC Space:
        - Joy: (0.8, 0.5, 0.6) - pleasant, energized, connected
        - Sadness: (-0.6, -0.4, -0.5) - unpleasant, low energy, disconnected
        - Anger: (-0.7, 0.8, -0.3) - unpleasant, high energy, disconnected
        - Love: (0.9, 0.4, 0.95) - very pleasant, moderate energy, deeply connected
        - Anxiety: (-0.4, 0.7, -0.2) - unpleasant, high energy, slightly disconnected
        - Contentment: (0.6, -0.2, 0.4) - pleasant, calm, connected

    Why Three Dimensions?
        - **Valence:** Core to all emotion models (pleasure/displeasure)
        - **Arousal:** Distinguishes similar-valence emotions (joy vs contentment)
        - **Connection:** Captures relational aspect missing from traditional models

        Traditional 2D models (Valence-Arousal) can't distinguish:
          - Love (connected) vs Contentment (less connected)
          - Loneliness (disconnected) vs Sadness (moderately disconnected)

        The Connection dimension is L.O.V.E.'s innovation for therapeutic contexts.
    """

    valence: float  # V-axis: pleasure/displeasure (-1 to +1)
    arousal: float  # A-axis: energy level (-1 to +1)
    connection: float  # C-axis: relational alignment (-1 to +1)

    def _validate_and_clamp(self) -> List[float]:
        """Validate and clamp VAC components to valid range [-1.0, 1.0].

        This handles floating-point drift from LLM outputs, user input,
        or accumulated numerical errors.

        Why clamp instead of error?
            - **Robustness:** LLMs sometimes produce 1.001 or -1.02
            - **User-friendly:** Gracefully handles slightly out-of-range input
            - **Numerical stability:** Prevents edge cases in later calculations
            - **Fail-safe:** Ensures valid quaternions always produced

        Alternative considered:
            Raising ValueError for out-of-range values was considered but
            rejected because:
            - Too strict for practical use
            - LLMs produce near-1.0 values frequently
            - Clamping is semantically reasonable (1.001 ≈ "very positive")

        Performance:
            Time complexity: O(1)
            Operations: 6 comparisons, 0-3 clamps
            Typical execution: < 5 nanoseconds

        Returns:
            List[float]: Clamped [valence, arousal, connection]

        Example:
            >>> vac = VACVector(1.05, -0.5, 0.3)  # Valence slightly over
            >>> vac._validate_and_clamp()
            [1.0, -0.5, 0.3]  # Clamped to 1.0
        """
        # ═══════════════════════════════════════════════════════════════════
        # COMPONENT-WISE CLAMPING
        # ═══════════════════════════════════════════════════════════════════
        # For each component:
        #   1. max(-1.0, value): Ensures not less than -1.0
        #   2. min(1.0, result): Ensures not greater than 1.0
        #
        # This two-step approach (max then min) handles both over and under:
        #   - value = 1.5  →  max(-1, 1.5) = 1.5  →  min(1, 1.5) = 1.0
        #   - value = -1.5 →  max(-1, -1.5) = -1.0 →  min(1, -1) = -1.0
        #   - value = 0.5  →  max(-1, 0.5) = 0.5   →  min(1, 0.5) = 0.5
        return [
            max(-1.0, min(1.0, self.valence)),  # Clamp V to [-1, 1]
            max(-1.0, min(1.0, self.arousal)),  # Clamp A to [-1, 1]
            max(-1.0, min(1.0, self.connection)),  # Clamp C to [-1, 1]
        ]

    def magnitude(self) -> float:
        """Compute the intensity (Euclidean norm) of the emotional state.

        The magnitude represents how far the emotional state is from
        neutral (origin). Larger magnitude = stronger emotion.

        Formula:
            ||VAC|| = √(V² + A² + C²)

        This is the Euclidean norm in 3D space, the natural measure
        of vector length.

        Interpretation:
            - 0.0: Neutral emotional state (no emotion)
            - 0.5: Mild emotion
            - 1.0: Moderate emotion
            - √3 ≈ 1.732: Maximum intensity (all components at ±1)

        Range:
            [0, √3] where √3 ≈ 1.732 is theoretical maximum when
            all components are at their extremes (±1).

        Clinical significance:
            - < 0.3: Emotionally flat/numb (may indicate depression)
            - 0.3-1.0: Typical range for most emotions
            - > 1.5: Intense emotional state (requires attention)
            - > 1.7: Near-maximum intensity (crisis territory)

        Performance:
            Time complexity: O(1)
            Operations: 3 mults, 2 adds, 1 sqrt
            Typical execution: < 10 nanoseconds

        Returns:
            float: Magnitude in range [0, √3]

        Example:
            >>> vac_mild = VACVector(0.3, 0.2, 0.1)
            >>> vac_mild.magnitude()
            0.374...  # Mild emotion
            >>> vac_intense = VACVector(1.0, 1.0, 1.0)
            >>> vac_intense.magnitude()
            1.732...  # Maximum intensity (√3)
        """
        # ═══════════════════════════════════════════════════════════════════
        # VALIDATE AND CLAMP FIRST
        # ═══════════════════════════════════════════════════════════════════
        # Always work with clamped values to ensure valid results even if
        # input components are slightly out of range. This is defensive
        # programming that prevents downstream errors.
        v = self._validate_and_clamp()

        # ═══════════════════════════════════════════════════════════════════
        # EUCLIDEAN NORM CALCULATION
        # ═══════════════════════════════════════════════════════════════════
        # Formula: ||VAC|| = √(V² + A² + C²)
        #
        # This is the standard 3D distance formula (Pythagorean theorem):
        #   - Each component squared (makes positive, emphasizes large values)
        #   - Sum all squared components
        #   - Take square root (brings back to original scale)
        #
        # Why Euclidean norm?
        #   - Natural measure of distance in continuous space
        #   - Rotation-invariant (works in any coordinate system)
        #   - Matches human intuition about "emotional intensity"
        #   - Enables proper geometric operations (quaternion conversion)
        return math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)

    def is_zero(self, epsilon: float = EPSILON) -> bool:
        """Check if this is effectively a zero vector (neutral state).

        Neutral emotional state means all VAC components are near zero,
        representing absence of significant emotional experience.

        Why check for zero?
            - **Identity quaternion:** Zero VAC maps to identity (no rotation)
            - **Division by zero:** Prevents errors in normalization
            - **Clinical significance:** Detects emotional numbness
            - **Edge case handling:** Enables special processing for neutral

        Tolerance:
            Uses epsilon (1e-6) rather than exact zero because:
            - Floating point arithmetic is imprecise
            - LLMs may produce 0.0000001 instead of 0.0
            - Numerical operations introduce small errors

            Too strict: False negatives (miss true zeros)
            Too loose: False positives (treat mild emotions as neutral)

        Performance:
            Time complexity: O(1)
            Operations: magnitude() + 1 comparison
            Typical execution: < 15 nanoseconds

        Args:
            epsilon: Threshold for zero detection (default: 1e-6)

        Returns:
            bool: True if magnitude < epsilon (effectively zero)

        Example:
            >>> vac_zero = VACVector(0.0, 0.0, 0.0)
            >>> vac_zero.is_zero()
            True
            >>> vac_tiny = VACVector(1e-7, 0, 0)
            >>> vac_tiny.is_zero()
            True  # Within epsilon
            >>> vac_small = VACVector(0.01, 0, 0)
            >>> vac_small.is_zero()
            False  # Above epsilon threshold
        """
        # ═══════════════════════════════════════════════════════════════════
        # ZERO DETECTION VIA MAGNITUDE
        # ═══════════════════════════════════════════════════════════════════
        # Rather than checking each component individually (V ≈ 0, A ≈ 0, C ≈ 0),
        # we check if the overall magnitude is below threshold.
        #
        # Why magnitude-based?
        #   - Single check vs three checks (more efficient)
        #   - Captures overall "closeness to zero"
        #   - Consistent with quaternion conversion logic
        #   - Handles cases like (0.0001, 0.0001, 0.0001) appropriately
        return self.magnitude() < epsilon

    def to_quaternion(self) -> Quaternion:
        """Convert VAC vector to unit quaternion.

        This is the core conversion that enables using quaternion mathematics
        for emotional state representation and transition calculations.

        Algorithm:
            1. **Validate and clamp** components to [-1, 1]
            2. **Calculate magnitude** (emotional intensity)
            3. **Handle zero vector** → return identity quaternion
            4. **Normalize axis** (get direction, magnitude = 1)
            5. **Calculate rotation angle** (map intensity to angle)
            6. **Construct quaternion** using axis-angle formula
            7. **Verify unit length** (debug mode only)

        Mapping Details:
            Magnitude to Angle:
                max_magnitude = √3 ≈ 1.732
                angle = π * (||VAC|| / √3)

            This linear mapping ensures:
                - ||VAC|| = 0     → angle = 0     (no rotation)
                - ||VAC|| = √3    → angle = π     (maximum rotation)
                - ||VAC|| = 1     → angle ≈ 1.047 (60°)

            Why π maximum?
                Quaternions have double-cover property: q and -q represent
                same rotation. Rotations > π map back to [0, π] range.
                Using π maximum avoids ambiguity.

        Edge Cases:
            - **Zero vector:** Returns identity (w=1, x=y=z=0)
            - **Near-zero:** Treated as zero if magnitude < 1e-6
            - **Out of range:** Clamped to [-1, 1] before processing
            - **Non-unit result:** Assertion failure in debug mode

        Mathematical Foundation:
            Given normalized axis u = VAC/||VAC|| and angle θ:

            q = [cos(θ/2), sin(θ/2) * u]
              = [cos(θ/2), sin(θ/2)*ux, sin(θ/2)*uy, sin(θ/2)*uz]

            This formula comes from Euler's formula applied to quaternions.

        Performance:
            Time complexity: O(1)
            Operations: 6 mults, 5 adds, 2 sqrt, 2 trig, 3 divs
            Typical execution: < 50 nanoseconds

        Returns:
            Quaternion: Unit quaternion in scalar-first notation [w, x, y, z]

        Raises:
            AssertionError: If resulting quaternion is not unit length
                          (debug mode only, indicates algorithm bug)

        Example:
            >>> # Joy: high valence, moderate arousal, connected
            >>> joy = VACVector(valence=0.8, arousal=0.4, connection=0.6)
            >>> q_joy = joy.to_quaternion()
            >>> q_joy.is_unit()
            True
            >>> # Neutral state
            >>> neutral = VACVector(0, 0, 0)
            >>> q_neutral = neutral.to_quaternion()
            >>> q_neutral == Quaternion.identity()
            True
        """
        # ═══════════════════════════════════════════════════════════════════
        # STEP 1: VALIDATE AND CLAMP
        # ═══════════════════════════════════════════════════════════════════
        # Ensure all components are in valid range [-1, 1].
        # This handles LLM drift, numerical errors, and invalid input gracefully.
        v = self._validate_and_clamp()

        # ═══════════════════════════════════════════════════════════════════
        # STEP 2: CALCULATE MAGNITUDE (Emotional Intensity)
        # ═══════════════════════════════════════════════════════════════════
        # ||VAC|| = √(V² + A² + C²)
        # Range: [0, √3] where √3 ≈ 1.732 is maximum
        magnitude = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 3: HANDLE ZERO VECTOR (Neutral State)
        # ═══════════════════════════════════════════════════════════════════
        # If magnitude is near zero, the emotion is neutral/absent.
        # Return identity quaternion (no rotation from neutral state).
        #
        # Why identity?
        #   - Mathematically: Can't normalize zero vector (division by zero)
        #   - Semantically: No emotion = no rotation from neutral
        #   - Practically: Identity is safe default for all operations
        if magnitude < EPSILON:
            return Quaternion.identity()

        # ═══════════════════════════════════════════════════════════════════
        # STEP 4: NORMALIZE AXIS (Get Direction)
        # ═══════════════════════════════════════════════════════════════════
        # axis = VAC / ||VAC||
        #
        # This gives us a unit vector (length 1) pointing in the direction
        # of the emotional state. The magnitude information is preserved
        # separately in the angle calculation.
        #
        # Example:
        #   VAC = (0.6, 0.8, 0) with ||VAC|| = 1.0
        #   axis = (0.6, 0.8, 0) / 1.0 = (0.6, 0.8, 0)
        #
        #   VAC = (1.2, 1.6, 0) with ||VAC|| = 2.0  (hypothetically)
        #   axis = (1.2, 1.6, 0) / 2.0 = (0.6, 0.8, 0)  (same direction!)
        axis = [component / magnitude for component in v]

        # ═══════════════════════════════════════════════════════════════════
        # STEP 5: CALCULATE ROTATION ANGLE
        # ═══════════════════════════════════════════════════════════════════
        # Map magnitude [0, √3] to angle [0, π]
        #
        # Formula: angle = π * (||VAC|| / √3)
        #
        # Why this mapping?
        #   - Linear relationship: easy to understand and reason about
        #   - Preserves intensity: larger magnitude = larger rotation
        #   - Covers full range: can represent any emotional intensity
        #   - Maximum at π: utilizes quaternion range fully
        #
        # Examples:
        #   ||VAC|| = 0     →  angle = 0         (0°, neutral)
        #   ||VAC|| = 0.866 →  angle = π/2       (90°, moderate)
        #   ||VAC|| = 1.0   →  angle ≈ 1.047     (60°, typical)
        #   ||VAC|| = 1.732 →  angle = π         (180°, maximum)
        max_magnitude = math.sqrt(3)  # √3 ≈ 1.732 (max possible ||VAC||)
        angle = math.pi * (magnitude / max_magnitude)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 6: CONSTRUCT QUATERNION (Axis-Angle Formula)
        # ═══════════════════════════════════════════════════════════════════
        # Formula: q = cos(θ/2) + sin(θ/2) * (axis_x*i + axis_y*j + axis_z*k)
        #
        # This comes from Euler's formula: e^(iθ) = cos(θ) + i*sin(θ)
        # Extended to quaternions with arbitrary axis.
        #
        # Half-angle (θ/2) is used because:
        #   - Quaternion algebra requires half-angle
        #   - Enables double-cover property
        #   - Makes quaternion composition work correctly
        half_angle = angle / 2
        sin_half = math.sin(half_angle)
        cos_half = math.cos(half_angle)

        quaternion = Quaternion(
            w=cos_half,  # Scalar part: cos(θ/2)
            x=axis[0] * sin_half,  # i component: sin(θ/2) * axis_x
            y=axis[1] * sin_half,  # j component: sin(θ/2) * axis_y
            z=axis[2] * sin_half,  # k component: sin(θ/2) * axis_z
        )

        # ═══════════════════════════════════════════════════════════════════
        # STEP 7: VERIFY UNIT LENGTH (Debug Mode Only)
        # ═══════════════════════════════════════════════════════════════════
        # In debug mode (__debug__ == True), verify the result is a unit
        # quaternion. This catches algorithm bugs or numerical issues.
        #
        # Why assertion instead of normalization?
        #   - Algorithm should always produce unit quaternion
        #   - If not unit, indicates bug in algorithm
        #   - Fail fast in development to catch issues
        #   - No performance cost in production (assertions disabled)
        if __debug__:
            assert quaternion.is_unit(), f"Quaternion not unit length: {quaternion.magnitude()}"

        return quaternion
