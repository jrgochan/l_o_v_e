"""
Unit tests for VACVector class and VAC to Quaternion conversion.

Critical tests verify:
- Neutral state returns identity quaternion
- All conversions produce unit quaternions
- Worked examples match documentation
- Out-of-range values are clamped
"""

import pytest
import math
from app.core.vac_model import VACVector
from app.core.quaternion import Quaternion


class TestVACBasics:
    """Test basic VAC vector properties"""
    
    def test_neutral_state_is_zero(self):
        """Neutral VAC [0,0,0] should have zero magnitude"""
        vac = VACVector(valence=0.0, arousal=0.0, connection=0.0)
        assert vac.is_zero() is True
    
    def test_joy_has_nonzero_magnitude(self):
        """Joy VAC should have significant magnitude"""
        vac = VACVector(valence=0.9, arousal=0.7, connection=0.8)
        mag = vac.magnitude()
        
        # Expected: sqrt(0.81 + 0.49 + 0.64) = sqrt(1.94) ≈ 1.393
        assert mag == pytest.approx(1.393, abs=0.01)
    
    def test_clamping_positive_overflow(self):
        """Values > 1.0 should be clamped to 1.0"""
        vac = VACVector(valence=1.5, arousal=0.5, connection=0.5)
        clamped = vac._validate_and_clamp()
        
        assert clamped[0] == 1.0  # Valence clamped
        assert clamped[1] == 0.5  # Arousal unchanged
    
    def test_clamping_negative_overflow(self):
        """Values < -1.0 should be clamped to -1.0"""
        vac = VACVector(valence=-2.0, arousal=-0.5, connection=0.0)
        clamped = vac._validate_and_clamp()
        
        assert clamped[0] == -1.0  # Valence clamped


class TestVACToQuaternion:
    """Test VAC → Quaternion conversion algorithm"""
    
    def test_neutral_returns_identity(self):
        """VAC [0,0,0] must return identity quaternion"""
        vac = VACVector(valence=0.0, arousal=0.0, connection=0.0)
        q = vac.to_quaternion()
        
        assert q.w == 1.0
        assert q.x == 0.0
        assert q.y == 0.0
        assert q.z == 0.0
    
    def test_joy_conversion_matches_doc_example(self):
        """Joy [0.9, 0.7, 0.8] should match doc 03 worked example"""
        vac = VACVector(valence=0.9, arousal=0.7, connection=0.8)
        q = vac.to_quaternion()
        
        # From docs/03-vac-to-quaternion.md:
        # Expected: [0.306, 0.615, 0.478, 0.546]
        assert q.w == pytest.approx(0.306, abs=0.01)
        assert q.x == pytest.approx(0.615, abs=0.01)
        assert q.y == pytest.approx(0.478, abs=0.01)
        assert q.z == pytest.approx(0.546, abs=0.01)
        
        # Must be unit quaternion
        assert q.is_unit()
    
    def test_shame_conversion_matches_doc_example(self):
        """Shame [-0.9, -0.1, -1.0] should match documentation"""
        vac = VACVector(valence=-0.9, arousal=-0.1, connection=-1.0)
        q = vac.to_quaternion()
        
        # From docs: [0.342, -0.627, -0.070, -0.697]
        assert q.w == pytest.approx(0.342, abs=0.01)
        assert q.x == pytest.approx(-0.627, abs=0.01)
        assert q.y == pytest.approx(-0.070, abs=0.01)
        assert q.z == pytest.approx(-0.697, abs=0.01)
        
        assert q.is_unit()
    
    def test_all_conversions_produce_unit_quaternions(self):
        """Every VAC conversion must produce unit quaternion"""
        test_cases = [
            [0.9, 0.7, 0.8],     # Joy
            [-0.9, -0.1, -1.0],  # Shame
            [0.5, -0.7, 0.4],    # Calm
            [-0.5, 0.8, -0.2],   # Anger
            [0.0, 0.0, 0.0],     # Neutral
            [1.0, 1.0, 1.0],     # Maximum
            [-1.0, -1.0, -1.0],  # Minimum
            [0.3, 0.0, 0.0],     # Pure valence
            [0.0, 0.5, 0.0],     # Pure arousal
            [0.0, 0.0, 0.7],     # Pure connection
        ]
        
        for vac_values in test_cases:
            vac = VACVector(*vac_values)
            q = vac.to_quaternion()
            
            mag = q.magnitude()
            assert abs(mag - 1.0) < 1e-6, f"Failed for VAC {vac_values}: magnitude = {mag}"
    
    def test_out_of_range_still_produces_valid_quaternion(self):
        """Even invalid VAC values should clamp and produce valid quaternion"""
        vac = VACVector(valence=10.0, arousal=-10.0, connection=5.0)
        q = vac.to_quaternion()
        
        # Should clamp to [1.0, -1.0, 1.0] and still work
        assert q.is_unit()


class TestVACSemantics:
    """Test semantic meaning of VAC vectors"""
    
    def test_opposite_vacs_produce_different_quaternions(self):
        """Opposite emotional states should have different quaternions"""
        joy = VACVector(0.9, 0.7, 0.8).to_quaternion()
        despair = VACVector(-0.9, -0.7, -0.8).to_quaternion()
        
        # Dot product should indicate they're far apart
        dot = joy.dot(despair)
        assert dot < 0.5, "Joy and Despair should be distant in quaternion space"
    
    def test_similar_vacs_produce_similar_quaternions(self):
        """Similar emotional states should have similar quaternions"""
        joy = VACVector(0.9, 0.7, 0.8).to_quaternion()
        happiness = VACVector(0.7, 0.5, 0.6).to_quaternion()
        
        # Dot product should indicate similarity
        dot = joy.dot(happiness)
        assert dot > 0.7, "Joy and Happiness should be close in quaternion space"


# Property-based tests using Hypothesis
from hypothesis import given, strategies as st

class TestVACProperties:
    """Property-based tests for VAC conversion"""
    
    @given(
        valence=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False),
        arousal=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False),
        connection=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False)
    )
    def test_any_valid_vac_produces_unit_quaternion(self, valence, arousal, connection):
        """Property: ANY valid VAC must produce a unit quaternion"""
        vac = VACVector(valence=valence, arousal=arousal, connection=connection)
        q = vac.to_quaternion()
        
        mag = q.magnitude()
        assert abs(mag - 1.0) < 1e-5, f"VAC {[valence, arousal, connection]} produced non-unit quaternion: {mag}"
    
    @given(
        valence=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False),
        arousal=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False),
        connection=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False)
    )
    def test_any_vac_even_invalid_produces_unit_quaternion(self, valence, arousal, connection):
        """Property: Even out-of-range VAC should clamp and produce unit quaternion"""
        vac = VACVector(valence=valence, arousal=arousal, connection=connection)
        q = vac.to_quaternion()
        
        mag = q.magnitude()
        assert abs(mag - 1.0) < 1e-5


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
