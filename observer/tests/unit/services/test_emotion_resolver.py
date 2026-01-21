import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.services.emotion_resolver import EmotionResolver
from app.models.emotion_definition import EmotionDefinition

@pytest.fixture
def mock_session():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock())
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def resolver(mock_session):
    return EmotionResolver(mock_session)

@pytest.fixture
def mock_emotions():
    e1 = EmotionDefinition(id=uuid4(), emotion_name="Joy", category="Cat1", vac_vector=[0.8, 0.6, 0.7])
    e2 = EmotionDefinition(id=uuid4(), emotion_name="Sadness", category="Cat2", vac_vector=[-0.8, -0.2, -0.5])
    return [e1, e2]

@pytest.mark.asyncio
async def test_ensure_loaded(resolver, mock_session, mock_emotions):
    # Setup mock
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    await resolver.ensure_loaded()
    
    assert resolver._loaded
    assert "joy" in resolver.emotions_cache
    assert "sadness" in resolver.emotions_cache
    
    # Verify exact match structure
    joy = resolver.emotions_cache["joy"]
    assert joy["name"] == "Joy"
    assert joy["vac"] == [0.8, 0.6, 0.7]

@pytest.mark.asyncio
async def test_resolve_emotion_empty(resolver):
    res = await resolver.resolve_emotion("")
    assert res.match_method == "none"
    assert res.emotion_name is None
    
    res = await resolver.resolve_emotion(None)
    assert res.match_method == "none"

@pytest.mark.asyncio
async def test_resolve_emotion_exact(resolver, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # Exact match
    res = await resolver.resolve_emotion("Joy")
    assert res.match_method == "exact"
    assert res.emotion_name == "Joy"
    assert res.match_confidence == 1.0
    
    # Case insensitive
    res = await resolver.resolve_emotion("joy")
    assert res.match_method == "exact"

@pytest.mark.asyncio
async def test_ensure_loaded_vac_parsing_variants():
    """Test ensure_loaded handles both string (JSON) and list VAC vectors."""
    mock_db = AsyncMock()
    resolver = EmotionResolver(mock_db)
    
    mock_emotion_str = MagicMock()
    mock_emotion_str.emotion_name = "Joy"
    mock_emotion_str.vac_vector = "[0.8, 0.6, 0.7]" 
    mock_emotion_str.id = uuid4()
    
    mock_emotion_list = MagicMock()
    mock_emotion_list.emotion_name = "Sadness" 
    mock_emotion_list.vac_vector = [0.1, 0.2, 0.3] 
    mock_emotion_list.id = uuid4()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion_str, mock_emotion_list]
    mock_db.execute.return_value = mock_result # This is what await returns
    
    await resolver.ensure_loaded()
    
    assert resolver.emotions_cache["joy"]["vac"] == [0.8, 0.6, 0.7] # Verify parsing
    assert resolver.emotions_cache["sadness"]["vac"] == [0.1, 0.2, 0.3]

@pytest.mark.asyncio
async def test_vac_match_parsing_and_success():
    """Test _vac_match success path with string VAC parsing."""
    mock_db = AsyncMock()
    resolver = EmotionResolver(mock_db)
    resolver._collection_uuid = uuid4()
    
    row = (
        uuid4(), 
        "Excitement", 
        "High Energy", 
        "[0.9, 0.8, 0.7]", 
        0.1 
    )
    
    mock_result = MagicMock()
    mock_result.first.return_value = row
    mock_db.execute.return_value = mock_result # This is what await returns
    
    vac_input = {"valence": 0.9, "arousal": 0.8, "connection": 0.7}
    
    result = await resolver._vac_match(vac_input)
    
    assert result is not None
    assert result["name"] == "Excitement"
    assert result["vac"] == [0.9, 0.8, 0.7]

@pytest.mark.asyncio
async def test_resolve_emotion_fuzzy(resolver, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # "Joyy" -> "Joy" (typo) - Ratio: 2*3 / (4+3) = 6/7 = 0.857 > 0.8
    res = await resolver.resolve_emotion("Joyy")
    assert res.match_method == "fuzzy"
    assert res.emotion_name == "Joy"
    assert res.match_confidence > 0.8

@pytest.mark.asyncio
async def test_resolve_emotion_vac(resolver, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # Input has NO textual match (e.g. "BlahBlah") but has valid VAC
    vac_input = {"valence": 0.8, "arousal": 0.6, "connection": 0.7}
    
    # Mock the SQL execution for _vac_match
    # The first execute is for loading emotions (already done or mocked)
    # The second execute is for pgvector query
    
    await resolver.ensure_loaded()
    
    # Reset mock to handle the specific SQL query for VAC
    mock_row = MagicMock()
    # id, emotion_name, category, vac_vector, distance
    mock_row = (uuid4(), "Joy", "Cat1", [0.8, 0.6, 0.7], 0.05)
    
    mock_res_vac = MagicMock()
    mock_res_vac.first.return_value = mock_row
    mock_session.execute.return_value = mock_res_vac
    
    res = await resolver.resolve_emotion("BlahBlah", vac=vac_input)
    assert res.match_method == "vac"
    assert res.emotion_name == "Joy"
    # Confidence calc: 1.0 - (0.05 / 0.3) = 1 - 0.166 = 0.833
    assert res.match_confidence > 0.8

@pytest.mark.asyncio
async def test_resolve_emotion_none(resolver, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    # Ensure loaded
    await resolver.ensure_loaded()
    
    # Reset for VAC check (fail)
    mock_res_vac = MagicMock()
    mock_res_vac.first.return_value = None
    mock_session.execute.return_value = mock_res_vac
    
    res = await resolver.resolve_emotion("CompletelyRandomString", vac={"valence": 0, "arousal": 0, "connection": 0})
    
    assert res.match_method == "none"
    assert res.emotion_name is None

@pytest.mark.asyncio
async def test_ensure_loaded_collection_not_found(resolver, mock_session):
    """Test ensure_loaded when collection lookup fails."""
    # Mock collection query returning None
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    
    await resolver.ensure_loaded()
    
    assert resolver._loaded is True # Should mark as loaded empty
    assert len(resolver.emotions_cache) == 0

@pytest.mark.asyncio
async def test_ensure_loaded_with_explicit_collection_id(mock_session):
    """Test ensure_loaded with explicitly provided collection ID."""
    cid = str(uuid4())
    resolver = EmotionResolver(mock_session, collection_id=cid)
    
    # Mock emotions query directly (skips collection name lookup)
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_res
    
    await resolver.ensure_loaded()
    
    assert resolver._collection_uuid == cid
    # Should only have executed one query (emotions), not two (collection + emotions)
    assert mock_session.execute.call_count == 1

@pytest.mark.asyncio
async def test_vac_match_missing_collection_id(resolver):
    """Test _vac_match returns None if collection ID missing."""
    # Don't call ensure_loaded, so _collection_uuid is None
    res = await resolver._vac_match({"valence": 0, "arousal": 0, "connection": 0})
    assert res is None

@pytest.mark.asyncio
async def test_vac_match_exception_handling(resolver):
    """Test _vac_match handles DB exceptions gracefull."""
    resolver._collection_uuid = uuid4()
    resolver.db.execute.side_effect = Exception("DB Error")
    
    # Should catch error and log it, returning None
    res = await resolver._vac_match({"valence": 0, "arousal": 0, "connection": 0})
    assert res is None

@pytest.mark.asyncio
async def test_fuzzy_match_cache_miss_edge_case(resolver):
    """Test branch where fuzzy match works but cache lookup fails (defensive coding)."""
    # Manually setup partial state
    resolver.emotion_names = ["Ghost"]
    resolver.emotions_cache = {} # Empty cache
    
    # "Ghost" is in names, so close match finds it
    # But cache lookup returns None
    match = resolver._fuzzy_match("Ghost")
    assert match is None

@pytest.mark.asyncio
async def test_ensure_loaded_none_vac_vector(resolver, mock_session):
    """Test loading an emotion that has no VAC vector (None)."""
    e_none = MagicMock()
    e_none.emotion_name = "NullVAC"
    e_none.vac_vector = None
    e_none.id = uuid4()
    e_none.category = "Void"
    e_none.semantic_embedding = None
    
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e_none]
    mock_session.execute.return_value = mock_res
    
    await resolver.ensure_loaded()
    
    cached = resolver.emotions_cache["nullvac"]
    assert cached["vac"] is None

@pytest.mark.asyncio
async def test_vac_match_distance_too_high(resolver, mock_session):
    """Test _vac_match finds a candidate but distance exceeds threshold."""
    resolver._collection_uuid = uuid4()
    
    # Threshold is 0.3. Mock distance 0.5
    row = (uuid4(), "FarAway", "Cat", [0,0,0], 0.5)
    
    mock_res = MagicMock()
    mock_res.first.return_value = row
    mock_session.execute.return_value = mock_res
    
    res = await resolver._vac_match({"valence": 0, "arousal": 0, "connection": 0})
    assert res is None

@pytest.mark.asyncio
async def test_vac_match_none_vac_vector_in_result(resolver, mock_session):
    """Test _vac_match when returned row has None vac_vector (defensive check)."""
    resolver._collection_uuid = uuid4()
    
    # Row with None VAC vector
    row = (uuid4(), "Ghost", "Cat", None, 0.1)
    
    mock_res = MagicMock()
    mock_res.first.return_value = row
    mock_session.execute.return_value = mock_res
    
    res = await resolver._vac_match({"valence": 0, "arousal": 0, "connection": 0})
    
    # Should return match object but with vac=None
    assert res is not None
    assert res["name"] == "Ghost"
    assert res["vac"] is None
