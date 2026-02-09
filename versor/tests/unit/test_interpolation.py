"""
Unit tests for SLERP interpolation.

Critical tests:
- Endpoints match input quaternions
- All path quaternions are unit length
- Double-cover correction works
- Shortest path is taken
"""

import pytest

from app.core.interpolation import ensure_shortest_path, generate_slerp_path, smooth_transition
from app.core.quaternion import Quaternion
from app.core.vac_model import VACVector


class TestShortestPath:
    """Test double-cover correction"""

    def test_positive_dot_unchanged(self) -> None:
        """If dot > 0, quaternions should be unchanged"""
        q1 = Quaternion.identity()
        q2 = Quaternion(w=0.9, x=0.1, y=0.1, z=0.1).normalize()

        r1, r2 = ensure_shortest_path(q1, q2)

        assert r1 == q1
        assert r2 == q2  # Unchanged

    def test_negative_dot_negates_q2(self) -> None:
        """If dot < 0, q2 should be negated"""
        q1 = Quaternion.identity()
        q2 = Quaternion(w=-0.9, x=-0.1, y=-0.1, z=-0.1)

        r1, r2 = ensure_shortest_path(q1, q2)

        assert r1 == q1
        # q2 should be negated
        assert r2.w == -q2.w
        assert r2.x == -q2.x

    def test_corrected_dot_is_positive(self) -> None:
        """After correction, dot product should be positive"""
        q1 = Quaternion.identity()
        q2 = Quaternion(w=-0.7, x=-0.3, y=-0.3, z=-0.5)

        r1, r2 = ensure_shortest_path(q1, q2)

        assert r1.dot(r2) > 0


class TestSLERPPath:
    """Test SLERP path generation"""

    def test_slerp_endpoints_match(self) -> None:
        """First and last frames should match inputs"""
        q_start = Quaternion.identity()
        q_target = Quaternion(w=0.7071, x=0.7071, y=0, z=0)

        path = generate_slerp_path(q_start, q_target, steps=10)

        # First frame = start
        assert path[0].w == pytest.approx(q_start.w, abs=1e-4)
        assert path[0].x == pytest.approx(q_start.x, abs=1e-4)

        # Last frame = target (may be negated due to double-cover)
        assert abs(path[-1].w) == pytest.approx(abs(q_target.w), abs=1e-4)
        assert abs(path[-1].x) == pytest.approx(abs(q_target.x), abs=1e-4)

    def test_all_path_quaternions_unit(self) -> None:
        """Every quaternion in SLERP path must be unit length"""
        q1 = VACVector(0.5, 0.3, 0.6).to_quaternion()
        q2 = VACVector(-0.4, 0.7, -0.2).to_quaternion()

        path = generate_slerp_path(q1, q2, steps=100)

        for i, q in enumerate(path):
            mag = q.magnitude()
            assert abs(mag - 1.0) < 1e-4, f"Frame {i}: magnitude = {mag}"

    def test_path_length_correct(self) -> None:
        """Path should have exactly the requested number of steps"""
        q1 = Quaternion.identity()
        q2 = Quaternion(w=0.7071, x=0, y=0.7071, z=0)

        for steps in [10, 60, 120]:
            path = generate_slerp_path(q1, q2, steps=steps)
            assert len(path) == steps

    def test_identical_quaternions_constant_path(self) -> None:
        """SLERP between identical quaternions should be constant"""
        q = VACVector(0.5, 0.3, 0.6).to_quaternion()

        path = generate_slerp_path(q, q, steps=10)

        # All frames should be the same
        for frame in path:
            assert frame.w == pytest.approx(q.w, abs=1e-4)
            assert frame.x == pytest.approx(q.x, abs=1e-4)


class TestSLERPSemantics:
    """Test SLERP with emotional state transitions"""

    def test_joy_to_shame_smooth_path(self) -> None:
        """Major emotional transition should have smooth path"""
        joy = VACVector(0.9, 0.7, 0.8).to_quaternion()
        shame = VACVector(-0.9, -0.1, -1.0).to_quaternion()

        path = generate_slerp_path(joy, shame, steps=60)

        # Verify smooth progression (no sudden jumps)
        for i in range(len(path) - 1):
            # Angle between consecutive frames should be small
            q_trans = path[i + 1].multiply(path[i].conjugate())

            # Consecutive frames should be very close
            assert abs(q_trans.w) > 0.95, f"Frame {i} to {i+1} has large jump"

    def test_pity_to_compassion_path(self) -> None:
        """CRITICAL: Pity→Compassion path should be smooth"""
        pity = VACVector(-0.3, -0.2, -0.6).to_quaternion()
        compassion = VACVector(-0.3, -0.2, 0.8).to_quaternion()

        path = generate_slerp_path(pity, compassion, steps=60)

        assert len(path) == 60
        # All frames unit
        for q in path:
            assert q.is_unit()


class TestSmoothing:
    """Test smoothing filter"""

    def test_alpha_zero_returns_previous(self) -> None:
        """Alpha=0 should return previous quaternion"""
        q_prev = Quaternion.identity()
        q_new = Quaternion(w=0.5, x=0.5, y=0.5, z=0.5).normalize()

        result = smooth_transition(q_prev, q_new, alpha=0.0)

        assert result == q_prev

    def test_alpha_one_returns_new(self) -> None:
        """Alpha=1 should return new quaternion"""
        q_prev = Quaternion.identity()
        q_new = Quaternion(w=0.5, x=0.5, y=0.5, z=0.5).normalize()

        result = smooth_transition(q_prev, q_new, alpha=1.0)

        assert result == q_new

    def test_alpha_intermediate_blends(self) -> None:
        """Alpha=0.5 should blend quaternions"""
        q_prev = Quaternion.identity()
        q_new = Quaternion(w=0.7071, x=0.7071, y=0, z=0)

        result = smooth_transition(q_prev, q_new, alpha=0.5)

        # Result should be between prev and new
        # Check it's not equal to either
        assert result != q_prev
        assert result != q_new

        # Should still be unit
        assert result.is_unit()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
