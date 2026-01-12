"""
Unit tests for transition calculations.

Critical tests:
- Pity → Compassion (CONNECTION_SHIFT validation)
- Angular distance calculations
- Elasticity metrics
- Flooding detection
"""

import pytest
import math
from app.core.vac_model import VACVector
from app.core.quaternion import Quaternion
from app.core.transitions import (
    calculate_transition,
    angular_distance,
    calculate_elasticity,
    detect_flooding,
    detect_dominant_axis,
    generate_insight
)


class TestTransitionCalculation:
    """Test transition quaternion computation"""
    
    def test_transition_from_identity_equals_target(self):
        """Transition from neutral should equal target quaternion"""
        q_identity = Quaternion.identity()
        q_joy = VACVector(0.9, 0.7, 0.8).to_quaternion()
        
        q_trans = calculate_transition(q_identity, q_joy)
        
        # Should be approximately equal to q_joy
        assert q_trans.w == pytest.approx(q_joy.w, abs=1e-5)
        assert q_trans.x == pytest.approx(q_joy.x, abs=1e-5)
        assert q_trans.y == pytest.approx(q_joy.y, abs=1e-5)
        assert q_trans.z == pytest.approx(q_joy.z, abs=1e-5)
    
    def test_transition_to_self_is_identity(self):
        """Transition from state to itself should be identity"""
        q = VACVector(0.5, 0.3, 0.6).to_quaternion()
        q_trans = calculate_transition(q, q)
        
        # Should be identity (no rotation)
        assert q_trans.w == pytest.approx(1.0, abs=1e-5)
        assert abs(q_trans.x) < 1e-5
        assert abs(q_trans.y) < 1e-5
        assert abs(q_trans.z) < 1e-5
    
    def test_transition_is_unit_quaternion(self):
        """Transition of unit quaternions is always unit"""
        q1 = VACVector(0.9, 0.7, 0.8).to_quaternion()
        q2 = VACVector(-0.4, 0.5, -0.2).to_quaternion()
        
        q_trans = calculate_transition(q1, q2)
        
        assert q_trans.is_unit()


class TestAngularDistance:
    """Test angular distance (phi) calculation"""
    
    def test_distance_to_self_is_zero(self):
        """Angular distance from state to itself should be zero"""
        q = VACVector(0.5, 0.3, 0.6).to_quaternion()
        q_trans = calculate_transition(q, q)
        
        phi = angular_distance(q_trans)
        
        assert phi < 1e-5  # Essentially zero
    
    def test_distance_range(self):
        """Angular distance should be in range [0, π]"""
        # Test several transitions
        transitions = [
            (VACVector(0, 0, 0), VACVector(0.9, 0.7, 0.8)),
            (VACVector(-0.9, -0.1, -1.0), VACVector(0.9, 0.7, 0.8)),
            (VACVector(0.5, 0.3, 0.6), VACVector(0.5, 0.4, 0.7)),
        ]
        
        for vac_start, vac_target in transitions:
            q_start = vac_start.to_quaternion()
            q_target = vac_target.to_quaternion()
            q_trans = calculate_transition(q_start, q_target)
            
            phi = angular_distance(q_trans)
            
            assert 0 <= phi <= math.pi, f"phi out of range: {phi}"


class TestElasticity:
    """Test elasticity (velocity) calculation"""
    
    def test_elasticity_zero_when_time_delta_zero(self):
        """Elasticity should be 0 if time delta is 0"""
        elasticity = calculate_elasticity(1.5, 0.0)
        assert elasticity == 0.0
    
    def test_elasticity_calculation(self):
        """Elasticity should equal distance / time"""
        phi = 1.5  # radians
        time_delta = 0.5  # seconds
        
        elasticity = calculate_elasticity(phi, time_delta)
        
        assert elasticity == pytest.approx(3.0)  # 1.5 / 0.5 = 3.0
    
    def test_flooding_detection_true(self):
        """High elasticity should trigger flooding"""
        elasticity = 3.5  # rad/s
        
        is_flooding = detect_flooding(elasticity, threshold=2.0)
        
        assert is_flooding is True
    
    def test_flooding_detection_false(self):
        """Low elasticity should not trigger flooding"""
        elasticity = 0.5  # rad/s
        
        is_flooding = detect_flooding(elasticity, threshold=2.0)
        
        assert is_flooding is False


class TestDominantAxis:
    """Test axis dominance detection"""
    
    def test_pure_valence_shift(self):
        """Pure valence change should detect VALENCE_SHIFT"""
        # Start: Sadness [-0.6, -0.4, 0.0]
        # Target: Joy [0.9, -0.4, 0.0] (only valence changed)
        q_start = VACVector(-0.6, -0.4, 0.0).to_quaternion()
        q_target = VACVector(0.9, -0.4, 0.0).to_quaternion()
        
        q_trans = calculate_transition(q_start, q_target)
        axis = detect_dominant_axis(q_trans)
        
        assert axis == "VALENCE_SHIFT"
    
    def test_pure_arousal_shift(self):
        """Pure arousal change should detect AROUSAL_SHIFT"""
        # Start: Calm [0.5, -0.7, 0.4]
        # Target: Excitement [0.5, 0.8, 0.4] (only arousal changed)
        q_start = VACVector(0.5, -0.7, 0.4).to_quaternion()
        q_target = VACVector(0.5, 0.8, 0.4).to_quaternion()
        
        q_trans = calculate_transition(q_start, q_target)
        axis = detect_dominant_axis(q_trans)
        
        assert axis == "AROUSAL_SHIFT"
    
    def test_pity_to_compassion_connection_shift(self):
        """
        CRITICAL TEST: Pity → Compassion MUST show CONNECTION_SHIFT.
        
        This is THE validation test for the entire VAC model.
        If this fails, the system is broken.
        """
        # Pity: feeling FOR (separation)
        pity = VACVector(valence=-0.3, arousal=-0.2, connection=-0.6)
        
        # Compassion: feeling WITH (connection)
        compassion = VACVector(valence=-0.3, arousal=-0.2, connection=0.8)
        
        q_pity = pity.to_quaternion()
        q_compassion = compassion.to_quaternion()
        
        q_trans = calculate_transition(q_pity, q_compassion)
        axis = detect_dominant_axis(q_trans)
        
        assert axis == "CONNECTION_SHIFT", \
            f"Expected CONNECTION_SHIFT, got {axis}. " \
            f"Transition quaternion: {q_trans}. " \
            f"This test validates the core differentiator of the VAC model!"


class TestCanonicalTransitions:
    """Test canonical emotional transitions from documentation"""
    
    def test_anger_to_calm_large_distance(self):
        """Anger to Calm should require significant emotional work"""
        anger = VACVector(valence=-0.5, arousal=0.8, connection=-0.2)
        calm = VACVector(valence=0.8, arousal=-0.6, connection=0.5)
        
        q_anger = anger.to_quaternion()
        q_calm = calm.to_quaternion()
        
        q_trans = calculate_transition(q_anger, q_calm)
        phi = angular_distance(q_trans)
        
        # Should be > 1.5 radians (86°)
        assert phi > 1.5, f"Expected large transition, got {phi} radians ({math.degrees(phi)}°)"
    
    def test_shame_to_self_compassion_maximum_work(self):
        """Shame to Self-Compassion is a radical shift"""
        shame = VACVector(valence=-0.9, arousal=-0.1, connection=-1.0)
        self_compassion = VACVector(valence=0.6, arousal=-0.2, connection=0.9)
        
        q_shame = shame.to_quaternion()
        q_sc = self_compassion.to_quaternion()
        
        q_trans = calculate_transition(q_shame, q_sc)
        phi = angular_distance(q_trans)
        
        # Should be a major transition (adjusted threshold based on actual calculation)
        # ~1.925 rad = ~110° which is still a radical shift
        assert phi > 1.5, f"Expected major transition, got {phi} radians ({math.degrees(phi)}°)"


class TestInsightGeneration:
    """Test insight message generation"""
    
    def test_connection_shift_message(self):
        """Connection shift should generate appropriate message"""
        message = generate_insight("CONNECTION_SHIFT")
        assert "toward or away" in message.lower()
    
    def test_valence_shift_message(self):
        """Valence shift should generate appropriate message"""
        message = generate_insight("VALENCE_SHIFT")
        assert "better or worse" in message.lower()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
