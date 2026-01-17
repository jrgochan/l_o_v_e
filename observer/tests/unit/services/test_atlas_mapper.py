import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.services.atlas_mapper import AtlasMapper
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_session():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock())
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def mapper(mock_session):
    return AtlasMapper(mock_session)

@pytest.fixture
def mock_emotions():
    e1 = AtlasDefinition(id=uuid4(), emotion_name="Joy", category="Cat1", vac_vector=[0.8, 0.6, 0.7])
    e2 = AtlasDefinition(id=uuid4(), emotion_name="Sadness", category="Cat2", vac_vector=[-0.8, -0.2, -0.5])
    return [e1, e2]

@pytest.mark.asyncio
async def test_ensure_loaded(mapper, mock_session, mock_emotions):
    # Setup mock
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    await mapper.ensure_loaded()
    
    assert mapper._loaded
    assert "joy" in mapper.atlas_emotions
    assert "sadness" in mapper.atlas_emotions
    
    # Verify exact match structure
    joy = mapper.atlas_emotions["joy"]
    assert joy["name"] == "Joy"
    assert joy["vac"] == [0.8, 0.6, 0.7]

@pytest.mark.asyncio
async def test_map_emotion_empty(mapper):
    res = await mapper.map_emotion("")
    assert res.match_method == "none"
    assert res.atlas_name is None
    
    res = await mapper.map_emotion(None)
    assert res.match_method == "none"

@pytest.mark.asyncio
async def test_map_emotion_exact(mapper, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # Exact match
    res = await mapper.map_emotion("Joy")
    assert res.match_method == "exact"
    assert res.atlas_name == "Joy"
    assert res.match_confidence == 1.0
    
    # Case insensitive
    res = await mapper.map_emotion("joy")
    assert res.match_method == "exact"

@pytest.mark.asyncio
async def test_ensure_loaded_vac_parsing_variants():
    """Test ensure_loaded handles both string (JSON) and list VAC vectors."""
    mock_db = AsyncMock()
    mapper = AtlasMapper(mock_db)
    
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
    
    await mapper.ensure_loaded()
    
    assert mapper.atlas_emotions["joy"]["vac"] == [0.8, 0.6, 0.7] # Verify parsing
    assert mapper.atlas_emotions["sadness"]["vac"] == [0.1, 0.2, 0.3]

@pytest.mark.asyncio
async def test_vac_match_parsing_and_success():
    """Test _vac_match success path with string VAC parsing."""
    mock_db = AsyncMock()
    mapper = AtlasMapper(mock_db)
    
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
    
    result = await mapper._vac_match(vac_input)
    
    assert result is not None
    assert result["name"] == "Excitement"
    assert result["vac"] == [0.9, 0.8, 0.7]

@pytest.mark.asyncio
async def test_vac_match_exception_handling():
    """Test _vac_match exception handling."""
    mock_db = AsyncMock()
    mapper = AtlasMapper(mock_db)
    
    mock_db.execute.side_effect = Exception("DB Error")
    
    vac_input = {"valence": 0.0, "arousal": 0.0, "connection": 0.0}
    result = await mapper._vac_match(vac_input)
    
    assert result is None

@pytest.mark.asyncio
async def test_fuzzy_match_lookup_failure():
    """Test fuzzy match where emotion is found in names but missing from dict."""
    mapper = AtlasMapper(AsyncMock())
    mapper.emotion_names = ["joy"]
    
    import difflib
    with pytest.MonkeyPatch.context() as m:
        m.setattr(difflib, "get_close_matches", lambda *args, **kwargs: ["joy"])
        result = mapper._fuzzy_match("joyful")
        
    assert result is None

@pytest.mark.asyncio
async def test_ensure_loaded_none_vac_vector():
    """Test ensuring loaded handles None vac_vector."""
    mock_db = AsyncMock()
    mapper = AtlasMapper(mock_db)
    
    mock_emotion = MagicMock()
    mock_emotion.emotion_name = "Apathy"
    mock_emotion.vac_vector = None 
    mock_emotion.category = "Neutral"
    mock_emotion.id = uuid4()
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result # This is what await returns
    
    await mapper.ensure_loaded()
    assert "apathy" in mapper.atlas_emotions
    assert mapper.atlas_emotions["apathy"]["vac"] is None

@pytest.mark.asyncio
async def test_vac_match_distance_threshold_exceeded():
    """Test _vac_match returns None when distance exceeds threshold."""
    mapper = AtlasMapper(AsyncMock())
    mapper.vac_threshold = 0.3
    
    row = (uuid4(), "FarAway", "Category", "[0,0,0]", 0.5)
    
    mock_result = MagicMock()
    mock_result.first.return_value = row
    mapper.db.execute.return_value = mock_result # This is what await returns
    
    result = await mapper._vac_match({"valence":0, "arousal":0, "connection":0})
    assert result is None

@pytest.mark.asyncio
async def test_vac_match_none_vac_vector_in_row():
    """Test _vac_match handles row with None vac_vector."""
    mapper = AtlasMapper(AsyncMock())
    mapper.vac_threshold = 1.0
    
    row = (uuid4(), "Ghost", "Cat", None, 0.1)
    
    mock_result = MagicMock()
    mock_result.first.return_value = row
    mapper.db.execute.return_value = mock_result # This is what await returns
    
    result = await mapper._vac_match({"valence":0, "arousal":0, "connection":0})
    
    assert result is not None
    assert result["vac"] is None
    assert result["name"] == "Ghost"

@pytest.mark.asyncio
async def test_vac_match_no_db_result():
    """Test _vac_match when DB returns no rows."""
    mapper = AtlasMapper(AsyncMock())
    mock_result = MagicMock()
    mock_result.first.return_value = None
    mapper.db.execute.return_value = mock_result
    
    result = await mapper._vac_match({"valence":0, "arousal":0, "connection":0})
    assert result is None

@pytest.mark.asyncio
async def test_map_emotion_fuzzy(mapper, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # "Joyy" -> "Joy" (typo) - Ratio: 2*3 / (4+3) = 6/7 = 0.857 > 0.8
    res = await mapper.map_emotion("Joyy")
    assert res.match_method == "fuzzy"
    assert res.atlas_name == "Joy"
    assert res.match_confidence > 0.8

@pytest.mark.asyncio
async def test_map_emotion_vac(mapper, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    
    # Input has NO textual match (e.g. "BlahBlah") but has valid VAC
    vac_input = {"valence": 0.8, "arousal": 0.6, "connection": 0.7}
    
    # Mock the SQL execution for _vac_match
    # The first execute is for loading emotions (already done or mocked)
    # The second execute is for pgvector query
    
    # We need to distinguish between calls or assume ensure_loaded is called first
    await mapper.ensure_loaded()
    
    # Reset mock to handle the specific SQL query for VAC
    mock_row = MagicMock()
    # id, emotion_name, category, vac_vector, distance
    mock_row = (uuid4(), "Joy", "Cat1", [0.8, 0.6, 0.7], 0.05)
    
    mock_res_vac = MagicMock()
    mock_res_vac.first.return_value = mock_row
    mock_session.execute.return_value = mock_res_vac
    
    res = await mapper.map_emotion("BlahBlah", vac=vac_input)
    assert res.match_method == "vac"
    assert res.atlas_name == "Joy"
    # Confidence calc: 1.0 - (0.05 / 0.3) = 1 - 0.166 = 0.833
    assert res.match_confidence > 0.8

@pytest.mark.asyncio
async def test_map_emotion_none(mapper, mock_session, mock_emotions):
    # Preload
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    # Ensure loaded
    await mapper.ensure_loaded()
    
    # Reset for VAC check (fail)
    mock_res_vac = MagicMock()
    mock_res_vac.first.return_value = None
    mock_session.execute.return_value = mock_res_vac
    
    res = await mapper.map_emotion("CompletelyRandomString", vac={"valence": 0, "arousal": 0, "connection": 0})
    
    assert res.match_method == "none"
    assert res.atlas_name is None

@pytest.mark.asyncio
async def test_ensure_loaded_error(mapper, mock_session):
    mock_session.execute.side_effect = Exception("DB Error")
    await mapper.ensure_loaded()
    assert not mapper._loaded
    await mapper.ensure_loaded()
    assert not mapper._loaded
    # Should not raise, just log error

@pytest.mark.asyncio
async def test_map_emotion_vac_mismatch_explicit(mapper, mock_session, mock_emotions):
    """Explicitly test map_emotion when VAC is provided but no match is found (distance too high)."""
    # 1. Ensure loaded
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_emotions
    mock_session.execute.return_value = mock_res
    await mapper.ensure_loaded()
    
    # 2. Setup _vac_match to return None (simulating distance > threshold)
    # We can mock _vac_match directly or just mock the DB result to be None
    # Let's mock DB result for _vac_match to be None
    mock_res_vac = MagicMock()
    mock_res_vac.first.return_value = None
    mock_session.execute.return_value = mock_res_vac
    
    # 3. Call map_emotion with unknown name and VAC
    res = await mapper.map_emotion("UnknownEmotion", vac={"valence": 0, "arousal": 0, "connection": 0})
    
    # 4. Verify fall-through to MappingResult with None
    assert res.match_method == "none"
    assert res.atlas_name is None


@pytest.mark.asyncio
async def test_atlas_mapper_vac_true_match_false(mock_session):
    """
    Explicitly cover branch 369->396: vac is True, but _vac_match returns None (no match).
    This forces the fall-through to the 'no match found' return.
    """
    mapper = AtlasMapper(mock_session)
    
    # 1. Bypass loading to ensure cleaner state
    mapper._loaded = True
    mapper.atlas_emotions = {} # No text matches
    mapper.emotion_names = []
    
    # 2. Mock _vac_match directly to guarantee it returns None even if vac is provided
    # This avoids any ambiguity with DB mocks
    with patch.object(mapper, '_vac_match', new_callable=AsyncMock) as mock_vac_match:
        mock_vac_match.return_value = None
        
        # 3. Call with VAC provided
        result = await mapper.map_emotion("Unknown", vac={"valence": 0, "arousal": 0, "connection": 0})
        
        # 4. Verify exact fall-through behavior
        assert result.match_method == "none"
        assert result.atlas_id is None
        mock_vac_match.assert_called_once()


@pytest.mark.asyncio
async def test_atlas_mapper_no_vac_explicit(mock_session):
    """
    Test AtlasMapper.map_emotion when no VAC coordinates are provided.
    Covers line 369 branch: checks behavior when `if vac:` is False.
    """
    mapper = AtlasMapper(mock_session)
    
    # Bypass loading, clear maps
    mapper._loaded = True
    mapper.atlas_emotions = {} 
    mapper.emotion_names = []
    
    # Call with valid name but NO VAC
    result = await mapper.map_emotion("UnknownEmotion", vac=None)
    
    # Should fall through to "none" match
    assert result.match_method == "none"
    assert result.atlas_name is None
