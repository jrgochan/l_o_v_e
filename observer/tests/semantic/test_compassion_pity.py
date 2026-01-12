"""
THE CRITICAL TEST - Compassion vs Pity Distinction

This test verifies the core innovation of the VAC model:
the Connection axis successfully distinguishes between
Compassion (feeling WITH, positive Connection) and
Pity (feeling FOR, negative Connection).

If this test fails, the entire Observer module's purpose is compromised.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.emotion_mapper import EmotionMapper
from tests.test_data import COMPASSION_VAC, PITY_VAC, LONG_TEXTS


@pytest.mark.semantic
@pytest.mark.asyncio
async def test_compassion_positive_connection(test_db: AsyncSession, seeded_test_atlas):
    """
    Compassion should be detected when Connection is positive (+0.9).
    
    VAC: [0.5, 0.2, 0.9]
    - Moderate positive valence
    - Low arousal
    - HIGH POSITIVE Connection (feeling WITH)
    """
    mapper = EmotionMapper(test_db)
    
    # Find nearest emotion using VAC only
    nearest = await mapper.find_nearest_by_vac_only(COMPASSION_VAC)
    
    assert nearest.emotion_name == "Compassion", (
        f"Expected 'Compassion' for VAC {COMPASSION_VAC}, "
        f"got '{nearest.emotion_name}'"
    )
    
    # Verify VAC coordinates match
    vac_list = list(nearest.vac_vector)
    assert vac_list == pytest.approx(COMPASSION_VAC), (
        f"Compassion VAC mismatch: expected {COMPASSION_VAC}, got {vac_list}"
    )
    
    # Verify Connection is positive
    assert vac_list[2] > 0, (
        f"Compassion must have positive Connection, got {vac_list[2]}"
    )


@pytest.mark.semantic
@pytest.mark.asyncio
async def test_pity_negative_connection(test_db: AsyncSession, seeded_test_atlas):
    """
    Pity should be detected when Connection is negative (-0.7).
    
    VAC: [-0.3, -0.1, -0.7]
    - Slight negative valence
    - Low arousal  
    - HIGH NEGATIVE Connection (feeling FOR, separation)
    """
    mapper = EmotionMapper(test_db)
    
    # Find nearest emotion using VAC only
    nearest = await mapper.find_nearest_by_vac_only(PITY_VAC)
    
    assert nearest.emotion_name == "Pity", (
        f"Expected 'Pity' for VAC {PITY_VAC}, "
        f"got '{nearest.emotion_name}'"
    )
    
    # Verify VAC coordinates match
    vac_list = list(nearest.vac_vector)
    assert vac_list == pytest.approx(PITY_VAC), (
        f"Pity VAC mismatch: expected {PITY_VAC}, got {vac_list}"
    )
    
    # Verify Connection is negative
    assert vac_list[2] < 0, (
        f"Pity must have negative Connection, got {vac_list[2]}"
    )


@pytest.mark.semantic
@pytest.mark.asyncio
async def test_compassion_pity_distinction(test_db: AsyncSession, seeded_test_atlas):
    """
    THE CRITICAL TEST: Compassion and Pity MUST be distinguished.
    
    This test validates the entire purpose of the VAC model.
    The Connection axis (Z) is what separates L.O.V.E. from traditional VAD models.
    
    Key insight:
    - Traditional models confuse these (similar Valence/Arousal)
    - VAC model distinguishes them based on Connection axis
    - Compassion: +0.9 Connection (shared humanity)
    - Pity: -0.7 Connection (separation, condescension)
    
    IF THIS TEST FAILS, THE OBSERVER IS NOT READY.
    """
    mapper = EmotionMapper(test_db)
    
    # Find emotions
    compassion_emotion = await mapper.find_nearest_by_vac_only(COMPASSION_VAC)
    pity_emotion = await mapper.find_nearest_by_vac_only(PITY_VAC)
    
    # THE CRITICAL ASSERTION
    assert compassion_emotion.emotion_name != pity_emotion.emotion_name, (
        "CRITICAL FAILURE: Compassion and Pity must be different emotions! "
        f"Both detected as: {compassion_emotion.emotion_name}"
    )
    
    # Verify correct mapping
    assert compassion_emotion.emotion_name == "Compassion", (
        f"Compassion VAC mapped to '{compassion_emotion.emotion_name}'"
    )
    assert pity_emotion.emotion_name == "Pity", (
        f"Pity VAC mapped to '{pity_emotion.emotion_name}'"
    )
    
    # Verify Connection axis values are opposite
    compassion_connection = list(compassion_emotion.vac_vector)[2]
    pity_connection = list(pity_emotion.vac_vector)[2]
    
    assert compassion_connection > 0, "Compassion must have positive Connection"
    assert pity_connection < 0, "Pity must have negative Connection"
    
    # Connection values should be significantly different
    connection_difference = abs(compassion_connection - pity_connection)
    assert connection_difference > 1.0, (
        f"Connection axis must clearly distinguish (diff={connection_difference})"
    )


@pytest.mark.semantic
@pytest.mark.asyncio
async def test_compassion_pity_with_text(test_db: AsyncSession, seeded_test_atlas, mock_embedding):
    """
    Test Compassion vs Pity distinction with semantic text.
    
    Even with text, the Connection axis should dominate the classification.
    """
    mapper = EmotionMapper(test_db)
    
    # Compassion with text
    compassion_emotion = await mapper.find_nearest(
        vac_values=COMPASSION_VAC,
        text_embedding=mock_embedding,
        word_count=len(LONG_TEXTS["compassion"].split())
    )
    
    # Pity with text
    pity_emotion = await mapper.find_nearest(
        vac_values=PITY_VAC,
        text_embedding=mock_embedding,
        word_count=len(LONG_TEXTS["pity"].split())
    )
    
    # Still must be different even with text
    assert compassion_emotion.emotion_name != pity_emotion.emotion_name, (
        "Compassion and Pity must remain distinct with text input"
    )
    
    assert compassion_emotion.emotion_name == "Compassion"
    assert pity_emotion.emotion_name == "Pity"
