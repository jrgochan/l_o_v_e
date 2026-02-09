"""
Unit tests for Quaternion class.

Tests cover:
- Identity properties
- Conjugate operations
- Multiplication (Hamilton product)
- Unit norm verification
- Edge cases
"""

import math

import pytest

from app.core.quaternion import Quaternion


class TestQuaternionBasics:
    """Test basic quaternion properties and operations"""

    def test_identity_creation(self) -> None:
        """Identity quaternion should be [1, 0, 0, 0]"""
        q = Quaternion.identity()

        assert q.w == 1.0
        assert q.x == 0.0
        assert q.y == 0.0
        assert q.z == 0.0

    def test_identity_magnitude(self) -> None:
        """Identity quaternion should have magnitude 1"""
        q = Quaternion.identity()
        assert q.magnitude() == pytest.approx(1.0)

    def test_identity_is_unit(self) -> None:
        """Identity should pass unit test"""
        q = Quaternion.identity()
        assert q.is_unit() is True

    def test_magnitude_calculation(self) -> None:
        """Magnitude should be calculated correctly"""
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)

        # ||q|| = sqrt(0.5 + 0.5) = 1.0
        assert q.magnitude() == pytest.approx(1.0, abs=1e-4)

    def test_normalize(self) -> None:
        """Normalization should produce unit quaternion"""
        q = Quaternion(w=2.0, x=0.0, y=0.0, z=0.0)
        q_norm = q.normalize()

        assert q_norm.w == pytest.approx(1.0)
        assert q_norm.magnitude() == pytest.approx(1.0)


class TestQuaternionConjugate:
    """Test conjugate operation"""

    def test_conjugate_negates_vector_part(self) -> None:
        """Conjugate should negate x, y, z but keep w"""
        q = Quaternion(w=0.5, x=0.5, y=0.5, z=0.5)
        q_conj = q.conjugate()

        assert q_conj.w == q.w
        assert q_conj.x == -q.x
        assert q_conj.y == -q.y
        assert q_conj.z == -q.z

    def test_conjugate_of_identity(self) -> None:
        """Conjugate of identity is itself"""
        q_id = Quaternion.identity()
        q_conj = q_id.conjugate()

        assert q_conj == q_id

    def test_conjugate_is_inverse_for_unit_quaternions(self) -> None:
        """For unit quaternions: q × q* = identity"""
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q_conj = q.conjugate()

        result = q.multiply(q_conj)

        # Should be approximately identity
        # Relaxed tolerance due to floating-point precision
        assert result.w == pytest.approx(1.0, abs=1e-4)
        assert abs(result.x) < 1e-4
        assert abs(result.y) < 1e-4
        assert abs(result.z) < 1e-4


class TestQuaternionMultiplication:
    """Test Hamilton product"""

    def test_multiply_by_identity(self) -> None:
        """q × identity = q"""
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q_id = Quaternion.identity()

        result = q.multiply(q_id)

        assert result.w == pytest.approx(q.w)
        assert result.x == pytest.approx(q.x)
        assert result.y == pytest.approx(q.y)
        assert result.z == pytest.approx(q.z)

    def test_multiplication_preserves_unit_norm(self) -> None:
        """Product of unit quaternions is unit quaternion"""
        q1 = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q2 = Quaternion(w=0.7071, x=0, y=0.7071, z=0)

        result = q1.multiply(q2)

        # Relaxed tolerance for floating-point precision
        assert result.magnitude() == pytest.approx(1.0, abs=1e-4)

    def test_multiplication_non_commutative(self) -> None:
        """q1 × q2 ≠ q2 × q1 (generally)"""
        q1 = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q2 = Quaternion(w=0.7071, x=0, y=0.7071, z=0)

        r1 = q1.multiply(q2)
        r2 = q2.multiply(q1)

        # Check z component which should differ (y happens to be same for this case)
        assert r1.z != pytest.approx(r2.z, abs=1e-6)


class TestQuaternionDotProduct:
    """Test dot product operation"""

    def test_dot_with_self(self) -> None:
        """q · q = ||q||²"""
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)

        dot = q.dot(q)
        mag_squared = q.magnitude() ** 2

        assert dot == pytest.approx(mag_squared)

    def test_dot_with_identity(self) -> None:
        """For unit q: q · identity = w component"""
        q = Quaternion(w=0.8, x=0.6, y=0, z=0).normalize()
        q_id = Quaternion.identity()

        dot = q.dot(q_id)
        assert dot == pytest.approx(q.w)


class TestAxisAngleConstruction:
    """Test from_axis_angle factory method"""

    def test_90_degree_x_rotation(self) -> None:
        """90° rotation around X-axis"""
        axis = (1.0, 0.0, 0.0)
        angle = math.pi / 2  # 90 degrees

        q = Quaternion.from_axis_angle(axis, angle)

        # Expected: [cos(45°), sin(45°), 0, 0]
        assert q.w == pytest.approx(0.7071, abs=1e-4)
        assert q.x == pytest.approx(0.7071, abs=1e-4)
        assert q.y == pytest.approx(0, abs=1e-4)
        assert q.z == pytest.approx(0, abs=1e-4)

    def test_axis_angle_produces_unit_quaternion(self) -> None:
        """Axis-angle construction should produce unit quaternion"""
        # Properly normalize the axis vector
        axis_raw = (0.5774, 0.5774, 0.5774)
        mag = math.sqrt(sum(x**2 for x in axis_raw))
        axis = (axis_raw[0] / mag, axis_raw[1] / mag, axis_raw[2] / mag)
        angle = math.pi / 3

        q = Quaternion.from_axis_angle(axis, angle)

        assert q.is_unit()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
