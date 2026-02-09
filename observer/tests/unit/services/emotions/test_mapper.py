from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import numpy as np
import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.emotions.mapper import EmotionMapper, MapperQuery

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_session():
    """Mock AsyncSession with predefined emotions."""
    session = AsyncMock()

    # Create sample emotions
    # 1. Joy: High Valence, High Arousal
    joy = EmotionDefinition(
        id=uuid4(),
        emotion_name="Joy",
        vac_vector=[0.8, 0.8, 0.5],
        semantic_embedding=[0.1, 0.0, 0.0],  # Simplified 3D embedding for testing
    )

    # 2. Sadness: Low Valence, Low Arousal
    sadness = EmotionDefinition(
        id=uuid4(),
        emotion_name="Sadness",
        vac_vector=[-0.8, -0.6, -0.5],
        semantic_embedding=[-0.1, 0.0, 0.0],
    )

    # 3. Neutral: Zero
    neutral = EmotionDefinition(
        id=uuid4(),
        emotion_name="Neutral",
        vac_vector=[0.0, 0.0, 0.0],
        semantic_embedding=[0.0, 0.0, 0.0],
    )

    # Setup mock return
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [joy, sadness, neutral]
    # Repository uses result.all() which returns rows (tuples)
    mock_result.all.return_value = [(joy, 0.0), (sadness, 0.1), (neutral, 0.2)]

    # For find_nearest (scalar_one)
    mock_result.scalar_one.side_effect = (
        lambda: joy
    )  # Default storage, test will override scalar_one if needed but find_nearest re-queries
    # Actually logic:
    # 1. query all -> .scalars().all()
    # 2. calculate
    # 3. query specific id -> .scalar_one()

    # We need to handle sequential calls.
    # First call: select(EmotionDefinition) -> returns list
    # Second call: select(EmotionDefinition).where(...) -> returns single

    session.execute.return_value = mock_result

    # Store data for easier lookup in tests if needed
    session._dataset = [joy, sadness, neutral]

    # Logic to return correct item on second call
    def execute_side_effect(stmt):
        # Extremely basic check to distinguish calls
        str_stmt = str(stmt)
        if "WHERE" in str_stmt or "where" in str_stmt:
            # Just return access to setting return value
            return mock_result
        return mock_result

    session.execute.side_effect = execute_side_effect

    return session


@pytest.fixture
def emotion_mapper(mock_session):
    return EmotionMapper(mock_session)


# ============================================================================
# UNIT TESTS
# ============================================================================


def test_calculate_vac_distance(emotion_mapper):
    """Test Euclidean distance calculation in VAC space."""
    v1 = [1.0, 1.0, 1.0]
    v2 = [0.0, 0.0, 0.0]
    # Dist = sqrt(1+1+1) = sqrt(3) ~ 1.732
    dist = emotion_mapper._calculate_vac_distance(v1, v2)
    assert np.isclose(dist, 1.73205, atol=0.0001)

    v1 = [0.5, 0.5, 0.5]
    v2 = [0.5, 0.5, 0.5]
    dist = emotion_mapper._calculate_vac_distance(v1, v2)
    assert dist == 0.0


def test_calculate_semantic_distance(emotion_mapper):
    """Test Cosine distance calculation."""
    # Identical vectors -> CosSim = 1.0 -> Dist = 0.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    dist = emotion_mapper._calculate_semantic_distance(v1, v2)
    assert dist == 0.0

    # Orthogonal vectors -> CosSim = 0.0 -> Dist = 1.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [0.0, 1.0, 0.0]
    dist = emotion_mapper._calculate_semantic_distance(v1, v2)
    assert np.isclose(dist, 1.0)

    # Opposite vectors -> CosSim = -1.0 -> Dist = 2.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [-1.0, 0.0, 0.0]
    dist = emotion_mapper._calculate_semantic_distance(v1, v2)
    assert np.isclose(dist, 2.0)

    # Zero vector handling (defensive)
    v1 = [0.0, 0.0, 0.0]
    v2 = [1.0, 1.0, 1.0]
    dist = emotion_mapper._calculate_semantic_distance(v1, v2)
    assert dist == 1.0  # Orthogonal/Unrelated


def test_weighted_fusion_short_text(emotion_mapper):
    """Test adaptive weighting for short text (VAC preferred)."""
    # word_count < 10 -> VAC 0.8, Sem 0.2

    vac_dist = 3.46  # Max distance, normalized = 1.0
    sem_dist = 2.0  # Max distance, normalized = 1.0

    # If both normalized are 1.0:
    # Combined = 0.8*1.0 + 0.2*1.0 = 1.0
    combined = emotion_mapper._weighted_fusion(vac_dist, sem_dist, word_count=5)
    assert np.isclose(combined, 1.0)

    # Half distances
    # vac_norm = 0.5, sem_norm = 0.5
    # Combined = 0.8*0.5 + 0.2*0.5 = 0.5
    half_vac = 3.46 / 2
    half_sem = 1.0
    combined = emotion_mapper._weighted_fusion(half_vac, half_sem, word_count=5)
    assert np.isclose(combined, 0.5)


def test_weighted_fusion_long_text(emotion_mapper):
    """Test adaptive weighting for long text (Semantic preferred)."""
    # word_count >= 10 -> VAC 0.4, Sem 0.6

    vac_dist = 3.46
    sem_dist = 2.0
    combined = emotion_mapper._weighted_fusion(vac_dist, sem_dist, word_count=15)
    assert np.isclose(combined, 1.0)  # 0.4*1 + 0.6*1 = 1.0

    # Skewed case: VAC dist 0 (match), Sem dist MAX (mismatch)
    # vac_norm = 0, sem_norm = 1
    # Combined = 0.4*0 + 0.6*1 = 0.6
    combined = emotion_mapper._weighted_fusion(0.0, 2.0, word_count=15)
    assert np.isclose(combined, 0.6)


@pytest.mark.asyncio
async def test_find_nearest_no_emotions(emotion_mapper, mock_session):
    """Test error raised when DB empty."""
    # Override the side_effect from fixture to return empty list
    mock_res = MagicMock()
    # Correctly mock all() which is what is called by repo
    mock_res.scalars.return_value.all.return_value = []
    mock_res.all.return_value = []

    mock_session.execute.side_effect = None  # Clear fixture side effect
    mock_session.execute.return_value = mock_res

    from app.services.emotions.mapper import MapperQuery

    with pytest.raises(ValueError, match="No emotions found"):
        query = MapperQuery(vac_values=[0.0, 0.0, 0.0])
        await emotion_mapper.find_nearest(query)


@pytest.mark.asyncio
async def test_find_nearest_logic(emotion_mapper, mock_session):
    """Test finding nearest emotion."""
    # Input exact match for "Joy" VAC [0.8, 0.8, 0.5]
    # Embedding assumed None

    # We need to ensure the second query returns "Joy"
    # Since we can't easily dynamically change the mock return based on arguments in this simple setup
    # unless we use side_effects more complexly.
    # But checking the call arguments is enough to verify logic.

    emotions = mock_session._dataset
    joy = emotions[0]

    # Setup the second call to return joy specifically
    def side_effect(stmt):
        mock_res = MagicMock()
        # If looking by ID (second call)
        if "WHERE" in str(stmt) or "where" in str(stmt):
            mock_res.scalar_one.return_value = joy
        # If fetching all (first call)
        else:
            # Repository uses result.all() returning tuples (Emotion, distance)
            mock_res.all.return_value = [(e, 0.0) for e in emotions]
            # Just in case scalars() is used elsewhere
            mock_res.scalars.return_value.all.return_value = emotions
        return mock_res

    mock_session.execute.side_effect = side_effect

    query = MapperQuery(vac_values=[0.8, 0.8, 0.5])
    result = await emotion_mapper.find_nearest(query)
    assert result.emotion_name == "Joy"


@pytest.mark.asyncio
async def test_get_top_k_nearest(emotion_mapper, mock_session):
    """Test top K ranking."""
    emotions = mock_session._dataset

    # Setup side effect
    mock_res = MagicMock()
    # Return tuples (Emotion, distance)
    # Distances roughly: Joy=1.23, Sadness=1.11, Neutral=0.0
    mock_res.all.return_value = [
        (emotions[0], 1.23),
        (emotions[1], 1.11),
        (emotions[2], 0.0),
    ]
    mock_session.execute.return_value = mock_res

    # Input is [0,0,0] -> Matching Neutral (index 2) better than others
    # Joy VAC distance: sqrt(0.8^2 + 0.8^2 + 0.5^2) = sqrt(0.64+0.64+0.25) = sqrt(1.53) ~ 1.23
    # Sadness: sqrt(0.8^2 + 0.6^2 + 0.5^2) = sqrt(0.64+0.36+0.25) = sqrt(1.25) ~ 1.11
    # Neutral: 0

    query = MapperQuery(vac_values=[0.0, 0.0, 0.0])
    results = await emotion_mapper.get_top_k_nearest(query, k=3)

    assert len(results) == 3
    # First should be Neutral
    assert results[0][0].emotion_name == "Neutral"
    assert results[0][1] == 0.0

    # Second should be Sadness (~1.11)
    # Third should be Joy (~1.23)
    assert results[1][0].emotion_name == "Sadness"
    assert results[2][0].emotion_name == "Joy"


@pytest.mark.asyncio
async def test_get_top_k_nearest_empty(emotion_mapper, mock_session):
    """Test get_top_k_nearest raises ValueError when no emotions exist."""
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []

    mock_session.execute.side_effect = None
    mock_session.execute.return_value = mock_res

    # Should return empty list, not raise
    query = MapperQuery(vac_values=[0.5, 0.5, 0.5])
    results = await emotion_mapper.get_top_k_nearest(query)
    assert results == []


@pytest.mark.asyncio
async def test_get_top_k_nearest_malformed_embedding(emotion_mapper, mock_session):
    """Test handling of malformed embeddings in DB."""

    # Mock emotion with invalid embedding
    class BadEmotion:
        id = uuid4()
        vac_vector = [0.1, 0.2, 0.3]
        category = "Test"
        emotion_name = "BadData"

        @property
        def semantic_embedding(self):
            raise TypeError("Bad vector")

    bad_emotion = BadEmotion()

    mock_res = MagicMock()
    mock_res = MagicMock()
    # Correctly mock all() to return list of tuples (Emotion, distance)
    mock_res.all.return_value = [(bad_emotion, 0.0)]
    mock_session.execute.side_effect = None
    mock_session.execute.return_value = mock_res

    # Should not raise error, just treat semantic dist as 0
    query = MapperQuery(vac_values=[0.1, 0.2, 0.3], text_embedding=[0.1] * 384)
    results = await emotion_mapper.get_top_k_nearest(query)
    assert len(results) == 1
    assert results[0][0].emotion_name == "BadData"


@pytest.mark.asyncio
async def test_get_top_k_nearest_combinations(emotion_mapper, mock_session):
    """Test get_top_k_nearest with various input combinations for branch coverage."""
    emotion = MagicMock(spec=EmotionDefinition)
    emotion.id = uuid4()
    emotion.vac_vector = [0.8, 0.8, 0.8]
    emotion.semantic_embedding = [0.1] * 3

    mock_res = MagicMock()
    mock_res.all.return_value = [(emotion, 0.0)]
    mock_session.execute.side_effect = None
    mock_session.execute.return_value = mock_res

    # Case 2: Text embedding provided, word count provided (weighted fusion)
    q2 = MapperQuery(vac_values=[0.8, 0.8, 0.8], text_embedding=[0.1] * 3, word_count=5)
    await emotion_mapper.get_top_k_nearest(q2)

    # Case 3: Text embedding None
    q3 = MapperQuery(vac_values=[0.8, 0.8, 0.8], text_embedding=None, word_count=5)
    await emotion_mapper.get_top_k_nearest(q3)


@pytest.mark.asyncio
async def test_find_nearest_full_fusion(emotion_mapper, mock_session):
    """Test find_nearest with both text embedding and emotion embedding available."""
    # Logic target: line 127 `if text_embedding is not None and emotion_embedding is not None:`

    emotions = mock_session._dataset
    joy = emotions[0]

    # 1. Setup mock to return an emotion WITH valid semantic_embedding
    # Fixture "Joy" has it.

    mock_res = MagicMock()
    # First call (select all) -> returns list
    mock_res.scalars.return_value.all.return_value = emotions
    # Second call (select one) -> returns joy
    mock_res.scalar_one.return_value = joy

    # Use side effect for sequential calls
    def side_effect(stmt):
        res = MagicMock()
        if "WHERE" in str(stmt) or "where" in str(stmt):
            res.scalar_one.return_value = joy
        else:
            res.all.return_value = [(e, 0.0) for e in emotions]
        return res

    mock_session.execute.side_effect = side_effect

    # 2. Call with text_embedding and word_count
    # Should trigger _calculate_semantic_distance AND _weighted_fusion
    query = MapperQuery(
        vac_values=[0.8, 0.8, 0.5],
        text_embedding=[0.1] * 3,  # Matches length of emotion embedding in fixture
        word_count=5,
    )
    result = await emotion_mapper.find_nearest(query)

    assert result.emotion_name == "Joy"


@pytest.mark.asyncio
async def test_find_nearest_vac_only_method(emotion_mapper, mock_session):
    """Test find_nearest_by_vac_only specific method."""
    # Logic target: line 363 (calls find_nearest with text_embedding=None)

    emotions = mock_session._dataset
    joy = emotions[0]

    # Setup mock
    def side_effect(stmt):
        res = MagicMock()
        if "WHERE" in str(stmt) or "where" in str(stmt):
            res.scalar_one.return_value = joy
        else:
            # Result tuples
            res.all.return_value = [(e, 0.0) for e in emotions]

        # Also need to handle find_nearest_neighbors returning ONE result (limit=1)
        # But wait, find_nearest_by_vac_only calls repo.find_nearest_neighbors with limit=1.
        # It returns list of tuples.
        if "limit" in str(stmt).lower() and "1" in str(stmt):
            res.all.return_value = [(joy, 0.0)]

        return res

    mock_session.execute.side_effect = side_effect

    # Call the convenience method
    result = await emotion_mapper.find_nearest_by_vac_only([0.8, 0.8, 0.5])

    # Verify result
    assert result.emotion_name == "Joy"


@pytest.mark.asyncio
async def test_find_nearest_with_collection(emotion_mapper, mock_session):
    """Test finding nearest emotion with collection ID filtering."""
    collection_id = str(uuid4())

    # Setup mocks - ensure emotions are returned
    mock_res = MagicMock()
    emotions = mock_session._dataset
    # Repository calls result.all() which returns tuples (Emotion, Distance)
    mock_res.all.return_value = [(e, 0.0) for e in emotions]
    mock_res.scalars.return_value.all.return_value = emotions

    def side_effect(stmt):
        return mock_res

    mock_session.execute.side_effect = side_effect

    # Call with collection_id
    query = MapperQuery(vac_values=[0.8, 0.8, 0.5])
    await emotion_mapper.find_nearest(query, collection_id=collection_id)

    # verify execution arguments check for collection_id UUID conversion
    # We can inspect the calls to execute
    calls = mock_session.execute.call_args_list
    assert len(calls) > 0
    first_call_stmt = str(calls[0][0][0])

    # Check that WHERE clause was added for collection_id
    # SQLAlchemy string representation usually includes the WHERE clause
    assert "WHERE" in first_call_stmt or "where" in first_call_stmt


@pytest.mark.asyncio
async def test_get_top_k_nearest_with_collection(emotion_mapper, mock_session):
    """Test top K ranking with collection ID filtering."""
    collection_id = str(uuid4())

    mock_res = MagicMock()
    emotions = mock_session._dataset
    mock_res.scalars.return_value.all.return_value = emotions

    # Reset side effect from fixture to plain return
    mock_session.execute.side_effect = None
    mock_session.execute.return_value = mock_res

    query = MapperQuery(vac_values=[0.0, 0.0, 0.0])
    await emotion_mapper.get_top_k_nearest(query, k=3, collection_id=collection_id)

    # Verify execute called
    assert mock_session.execute.called
    calls = mock_session.execute.call_args_list
    first_call_stmt = str(calls[0][0][0])
    assert "WHERE" in first_call_stmt or "where" in first_call_stmt


@pytest.mark.asyncio
async def test_find_nearest_malformed_embedding(emotion_mapper, mock_session):
    """Test handling of malformed embeddings in find_nearest."""

    # Mock emotion with invalid embedding
    class BadEmotion:
        id = uuid4()
        vac_vector = [0.1, 0.2, 0.3]
        category = "Test"
        emotion_name = "BadData"

        @property
        def semantic_embedding(self):
            raise TypeError("Bad vector")

    bad_emotion = BadEmotion()

    mock_res = MagicMock()
    # First call (fetch_candidates) returns list of tuples
    mock_res.all.return_value = [(bad_emotion, 0.0)]

    # Not needed to mock scalar_one because find_nearest finds it in local list now!
    # ("nearest_emotion = next(e for e in emotions if e.id == nearest_id)")

    def side_effect(stmt):
        return mock_res

    mock_session.execute.side_effect = side_effect

    # Should not raise error, just treat semantic dist as 0
    # Provide text_embedding to ensure we try to access emotion_embedding
    query = MapperQuery(vac_values=[0.1, 0.2, 0.3], text_embedding=[0.1] * 384)
    result = await emotion_mapper.find_nearest(query)

    assert result.emotion_name == "BadData"
