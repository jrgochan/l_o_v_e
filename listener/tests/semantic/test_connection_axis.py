"""
Listener Module - Connection Axis Validation Tests

THE MOST CRITICAL TESTS IN THE ENTIRE SYSTEM.

These tests validate that the system can correctly extract the Connection axis,
which is the novel dimension not found in standard sentiment analysis.

If these tests fail, the entire VAC model approach is invalidated.
"""
import pytest

from app.services.semantic_analyzer import SemanticAnalyzer


@pytest.mark.semantic
@pytest.mark.requires_ollama
class TestConnectionAxis:
    """
    Critical tests for Connection axis extraction.
    
    The Connection axis differentiates emotions that standard sentiment
    analysis conflates. This is the key innovation of the VAC model.
    """
    
    @pytest.mark.asyncio
    async def test_pity_vs_compassion(self, pity_text, compassion_text):
        """
        THE CRITICAL TEST: Pity vs. Compassion distinction.
        
        This test MUST pass. It validates that the system can distinguish:
        - Pity: Feeling FOR someone (separation, condescension) → Connection < 0
        - Compassion: Feeling WITH someone (alignment, shared humanity) → Connection > 0.5
        
        If this test fails, iterate on the prompt until it passes.
        """
        analyzer = SemanticAnalyzer()
        
        # Test Pity (negative Connection)
        pity_result = await analyzer.analyze(pity_text)
        
        assert pity_result.primary_emotion in ["Pity", "Sympathy"], \
            f"Expected Pity/Sympathy, got {pity_result.primary_emotion}"
        
        assert pity_result.vac.connection < 0, \
            f"Pity must have NEGATIVE Connection (separation), got {pity_result.vac.connection:.2f}"
        
        assert pity_result.confidence > 0.7, \
            f"Low confidence in classification: {pity_result.confidence:.2f}"
        
        print(f"\n✅ Pity detected correctly:")
        print(f"   Connection: {pity_result.vac.connection:.2f} (expected < 0)")
        print(f"   Reasoning: {pity_result.reasoning}")
        
        # Test Compassion (positive Connection)
        compassion_result = await analyzer.analyze(compassion_text)
        
        assert compassion_result.primary_emotion == "Compassion", \
            f"Expected Compassion, got {compassion_result.primary_emotion}"
        
        assert compassion_result.vac.connection > 0.5, \
            f"Compassion must have POSITIVE Connection (>0.5), got {compassion_result.vac.connection:.2f}"
        
        assert compassion_result.confidence > 0.7, \
            f"Low confidence in classification: {compassion_result.confidence:.2f}"
        
        print(f"\n✅ Compassion detected correctly:")
        print(f"   Connection: {compassion_result.vac.connection:.2f} (expected > 0.5)")
        print(f"   Reasoning: {compassion_result.reasoning}")
        
        # Validate the distinction is clear
        connection_difference = compassion_result.vac.connection - pity_result.vac.connection
        assert connection_difference > 1.0, \
            f"Connection difference too small: {connection_difference:.2f} (should be > 1.0)"
        
        print(f"\n🎯 Connection axis distinction validated!")
        print(f"   Pity→Compassion difference: {connection_difference:.2f}")
    
    @pytest.mark.asyncio
    async def test_grief_positive_connection(self, grief_text):
        """
        Test that Grief has POSITIVE Connection despite negative Valence.
        
        This validates that Connection is independent of Valence:
        - Grief is painful (negative Valence)
        - But love persists (positive Connection)
        """
        analyzer = SemanticAnalyzer()
        result = await analyzer.analyze(grief_text)
        
        assert result.primary_emotion == "Grief", \
            f"Expected Grief, got {result.primary_emotion}"
        
        # Grief should have negative Valence (pain)
        assert result.vac.valence < -0.5, \
            f"Grief should have negative Valence, got {result.vac.valence:.2f}"
        
        # But POSITIVE Connection (love endures)
        assert result.vac.connection > 0.0, \
            f"Grief must have POSITIVE Connection (love persists), got {result.vac.connection:.2f}"
        
        print(f"\n✅ Grief validated:")
        print(f"   Valence: {result.vac.valence:.2f} (negative - pain)")
        print(f"   Connection: {result.vac.connection:.2f} (positive - love endures)")
        print(f"   Reasoning: {result.reasoning}")
    
    @pytest.mark.asyncio
    async def test_belonging_vs_fitting_in(self, belonging_text, fitting_in_text):
        """
        Test distinction between Belonging and Fitting In.
        
        - Belonging: Authentic self-expression (positive Connection)
        - Fitting In: Conformity, self-suppression (negative Connection)
        """
        analyzer = SemanticAnalyzer()
        
        # Test Belonging (positive Connection)
        belonging_result = await analyzer.analyze(belonging_text)
        
        assert belonging_result.vac.connection > 0.5, \
            f"Belonging should have positive Connection, got {belonging_result.vac.connection:.2f}"
        
        print(f"\n✅ Belonging validated:")
        print(f"   Connection: {belonging_result.vac.connection:.2f}")
        
        # Test Fitting In (negative Connection)
        fitting_result = await analyzer.analyze(fitting_in_text)
        
        assert fitting_result.vac.connection < 0.0, \
            f"Fitting In should have negative Connection, got {fitting_result.vac.connection:.2f}"
        
        print(f"\n✅ Fitting In validated:")
        print(f"   Connection: {fitting_result.vac.connection:.2f}")
        
        # Validate distinction
        connection_diff = belonging_result.vac.connection - fitting_result.vac.connection
        assert connection_diff > 0.5, \
            f"Connection difference too small: {connection_diff:.2f}"
    
    @pytest.mark.asyncio
    async def test_loneliness_negative_connection(self):
        """Test that Loneliness has very negative Connection"""
        analyzer = SemanticAnalyzer()
        
        text = "I feel so alone. Nobody gets me."
        result = await analyzer.analyze(text)
        
        assert result.vac.connection < -0.5, \
            f"Loneliness should have very negative Connection, got {result.vac.connection:.2f}"
        
        print(f"\n✅ Loneliness validated:")
        print(f"   Connection: {result.vac.connection:.2f} (deep isolation)")


@pytest.mark.semantic
@pytest.mark.requires_ollama
class TestVACExtraction:
    """Test general VAC extraction accuracy"""
    
    @pytest.mark.asyncio
    async def test_joy_high_valence_arousal(self, joy_text):
        """Test Joy has high Valence and Arousal"""
        analyzer = SemanticAnalyzer()
        result = await analyzer.analyze(joy_text)
        
        assert result.vac.valence > 0.7, \
            f"Joy should have high positive Valence, got {result.vac.valence:.2f}"
        
        assert result.vac.arousal > 0.5, \
            f"Joy should have elevated Arousal, got {result.vac.arousal:.2f}"
        
        print(f"\n✅ Joy validated:")
        print(f"   Valence: {result.vac.valence:.2f}")
        print(f"   Arousal: {result.vac.arousal:.2f}")
        print(f"   Connection: {result.vac.connection:.2f}")
    
    @pytest.mark.asyncio
    async def test_overwhelm_high_arousal(self, sample_text):
        """Test Overwhelm has high Arousal despite negative Valence"""
        analyzer = SemanticAnalyzer()
        result = await analyzer.analyze(sample_text)
        
        # Overwhelm should have high arousal
        assert result.vac.arousal > 0.5, \
            f"Overwhelm should have high Arousal, got {result.vac.arousal:.2f}"
        
        # And negative valence
        assert result.vac.valence < 0.0, \
            f"Overwhelm should have negative Valence, got {result.vac.valence:.2f}"
        
        print(f"\n✅ Overwhelm validated:")
        print(f"   Arousal: {result.vac.arousal:.2f} (high energy)")
        print(f"   Valence: {result.vac.valence:.2f} (negative)")
    
    @pytest.mark.asyncio
    async def test_vac_values_in_range(self, sample_text):
        """Test that all VAC values are within [-1, 1] range"""
        analyzer = SemanticAnalyzer()
        result = await analyzer.analyze(sample_text)
        
        assert -1.0 <= result.vac.valence <= 1.0, \
            f"Valence out of range: {result.vac.valence}"
        
        assert -1.0 <= result.vac.arousal <= 1.0, \
            f"Arousal out of range: {result.vac.arousal}"
        
        assert -1.0 <= result.vac.connection <= 1.0, \
            f"Connection out of range: {result.vac.connection}"
        
        assert 0.0 <= result.confidence <= 1.0, \
            f"Confidence out of range: {result.confidence}"
        
        print(f"\n✅ VAC values validated within bounds")


# Running these tests:
#
# 1. Ensure Ollama is running:
#    ollama serve
#
# 2. Ensure model is pulled:
#    ollama pull llama3.1:8b-instruct-q4_0
#
# 3. Run critical test:
#    pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s
#
# 4. Run all semantic tests:
#    pytest tests/semantic/ -v -m semantic
#
# 5. If tests fail:
#    - Check Ollama is running: curl http://localhost:11434/api/tags
#    - Review prompt in semantic_analyzer.py
#    - Iterate on few-shot examples
#    - Adjust temperature if needed
