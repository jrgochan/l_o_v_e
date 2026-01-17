import pytest
import json
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.api.routes.bootstrap import (
    get_strategy_effectiveness,
    get_path_templates,
    get_context_recommendations,
    get_challenge_patterns,
    get_all_bootstrap_data,
    _fetch_context_modifiers
)

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.mark.asyncio
async def test_get_strategy_effectiveness_success(mock_db):
    """Test retrieving strategy effectiveness data."""
    mock_content = {"ratings": [{"name": "Deep Breathing", "score": 4.5}]}
    mock_row = [json.dumps(mock_content)]
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_result
    
    response = await get_strategy_effectiveness(mock_db)
    
    assert response["success"] is True
    assert response["ratings"][0]["name"] == "Deep Breathing"

@pytest.mark.asyncio
async def test_get_strategy_effectiveness_dict_content(mock_db):
    """Test when content is already a dict (not string)."""
    mock_content = {"ratings": []}
    mock_row = [mock_content]
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_result
    
    response = await get_strategy_effectiveness(mock_db)
    assert response["success"] is True

@pytest.mark.asyncio
async def test_get_strategy_effectiveness_not_found(mock_db):
    """Test 404 response."""
    mock_result = MagicMock()
    mock_result.fetchone.return_value = None
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await get_strategy_effectiveness(mock_db)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_get_path_templates_filtering(mock_db):
    """Test path templates with filters."""
    templates = [
        {"from_emotion": "Anxiety", "to_emotion": "Calm", "difficulty": 0.5},
        {"from_emotion": "Anger", "to_emotion": "Calm", "difficulty": 0.8},
    ]
    mock_rows = [[json.dumps(t)] for t in templates]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    # Test filter by from_emotion
    resp = await get_path_templates(
        from_emotion="Anxiety", 
        to_emotion=None, 
        max_difficulty=None, 
        db=mock_db
    )
    assert resp["filtered_count"] == 1
    assert resp["templates"][0]["from_emotion"] == "Anxiety"
    
    # Test filter by max_difficulty
    resp = await get_path_templates(
        from_emotion=None,
        to_emotion=None,
        max_difficulty=0.6, 
        db=mock_db
    )
    assert resp["filtered_count"] == 1
    assert resp["templates"][0]["difficulty"] == 0.5

@pytest.mark.asyncio
async def test_get_context_recommendations_logic(mock_db):
    """Test context recommendation filtering."""
    modifiers = [
        {
            "modifier_type": "time_of_day",
            "modifier_value": {
                "morning": {
                    "recommended_strategies": ["Yoga"],
                    "avoid_strategies": ["Sleep"]
                }
            }
        },
        {
            "modifier_type": "energy_level",
            "modifier_value": {
                "high": {
                    "recommended_strategies": ["Running"],
                    "avoid_strategies": ["Meditation"]
                }
            }
        }
    ]
    mock_rows = [[json.dumps(m)] for m in modifiers]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    # Test combined context
    resp = await get_context_recommendations(
        time_of_day="morning",
        energy_level="high",
        location=None,
        available_time=None,
        experience_level=None,
        db=mock_db
    )
    
    recs = resp["recommendations"]["recommended_strategies"]
    assert "Yoga" in recs
    assert "Running" in recs
    assert "Sleep" in resp["recommendations"]["avoid_strategies"]

@pytest.mark.asyncio
async def test_get_challenge_patterns(mock_db):
    """Test challenge patterns retrieval."""
    patterns = [
        {"challenge_name": "Anxiety"},
        {"challenge_name": "Shame"}
    ]
    mock_rows = [[json.dumps(p)] for p in patterns]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    # Filter by name
    resp = await get_challenge_patterns(challenge_name="Anxiety", db=mock_db)
    assert len(resp["patterns"]) == 1
    assert resp["patterns"][0]["challenge_name"] == "Anxiety"

@pytest.mark.asyncio
async def test_get_all_bootstrap_data(mock_db):
    """Test bulk retrieval."""
    # Columns: data_type, data_category, content, created_at
    mock_rows = [
        ("strategy_effectiveness", "general", "{}", None),
        ("path_template", "transition", "{}", None),
        ("context_modifier", "time", "{}", None),
        ("challenge_pattern", "clinical", "{}", None),
    ]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_all_bootstrap_data(mock_db)
    
    data = resp["data"]
    assert len(data["strategy_effectiveness"]) == 1
    assert len(data["path_templates"]) == 1
    assert len(data["context_modifiers"]) == 1
    assert len(data["challenge_patterns"]) == 1

@pytest.mark.asyncio
async def test_bootstrap_strategy_effectiveness_dict_content(mock_db):
    content = {"ratings": [{"strategy_name": "Test", "avg_rating": 5.0}]}
    mock_result = MagicMock()
    mock_result.fetchone.return_value = [content]
    mock_db.execute.return_value = mock_result
    response = await get_strategy_effectiveness(db=mock_db)
    assert response["ratings"][0]["avg_rating"] == 5.0

@pytest.mark.asyncio
async def test_bootstrap_challenge_patterns_no_arg(mock_db):
    content = {"challenge_name": "anxiety", "strategies": []}
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [[json.dumps(content)]]
    mock_db.execute.return_value = mock_result
    # We don't need to patch json.loads here as the service handles it
    response = await get_challenge_patterns(challenge_name=None, db=mock_db)
    assert response["total_count"] == 1

@pytest.mark.asyncio
async def test_fetch_context_modifiers_dict_content():
    rows = [[{"modifier_type": "time_of_day", "value": {}}]]
    modifiers = _fetch_context_modifiers(rows)
    assert modifiers[0]["modifier_type"] == "time_of_day"

@pytest.mark.asyncio
async def test_all_bootstrap_data_json_parsing(mock_db):
    """Test JSON parsing specifically for get_all_bootstrap_data."""
    json_str = json.dumps({"key": "value"})
    rows = [
        ("path_template", "cat", json_str, None),
        ("context_modifier", "cat", json_str, None),
        ("challenge_pattern", "cat", json_str, None)
    ]
    m3 = MagicMock()
    m3.fetchall.return_value = rows
    mock_db.execute.return_value = m3
    resp = await get_all_bootstrap_data(db=mock_db)
    assert resp["data"]["path_templates"][0]["content"] == {"key": "value"}
    assert resp["data"]["context_modifiers"][0]["content"] == {"key": "value"}
    assert resp["data"]["challenge_patterns"][0]["content"] == {"key": "value"}


@pytest.mark.asyncio
async def test_get_path_templates_string_parsing(mock_db):
    """
    Test that get_path_templates correctly parses JSON string content.
    Covering line 303->305: if isinstance(content, str): content = json.loads(content)
    """
    # Create content as a JSON string
    template_data = {
        "from_emotion": "Anxiety",
        "to_emotion": "Calm",
        "difficulty": 0.5
    }
    json_content = json.dumps(template_data)
    
    # Mock return value as a single-element list (row) containing the string
    mock_rows = [[json_content]]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_path_templates(
        from_emotion=None, 
        to_emotion=None, 
        max_difficulty=None, 
        db=mock_db
    )
    
    assert resp["success"] is True
    assert len(resp["templates"]) == 1
    assert resp["templates"][0]["from_emotion"] == "Anxiety"

@pytest.mark.asyncio
async def test_context_filter_missing_value(mock_db):
    """
    Test _apply_context_filter when modifier type matches but value for specific context is missing.
    Covering line 359->exit: if context_data: ... (else branch implicitly covered)
    """
    # Modifier matches "time_of_day" but doesn't have "morning" key
    modifier_data = {
        "modifier_type": "time_of_day",
        "modifier_value": {
            "evening": { # Only evening defined
                "recommended_strategies": ["Sleep"],
                "avoid_strategies": ["Coffee"]
            }
        }
    }
    mock_rows = [[modifier_data]] # Content as dict (already parsed or natively dict)
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    # Request "morning" context
    resp = await get_context_recommendations(
        time_of_day="morning",
        energy_level=None,
        location=None,
        available_time=None,
        experience_level=None,
        db=mock_db
    )
    
    # Should get no recommendations because "morning" key is missing in modifier
    assert resp["success"] is True
    assert len(resp["recommendations"]["recommended_strategies"]) == 0

@pytest.mark.asyncio
async def test_get_challenge_patterns_string_parsing(mock_db):
    """
    Test that get_challenge_patterns correctly parses JSON string content.
    Covering line 499->501: if isinstance(content, str): content = json.loads(content)
    """
    pattern_data = {
        "challenge_name": "Anxiety",
        "description": "Test Pattern"
    }
    json_content = json.dumps(pattern_data)
    mock_rows = [[json_content]]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_challenge_patterns(challenge_name=None, db=mock_db)
    
    assert resp["success"] is True
    assert len(resp["patterns"]) == 1
    assert resp["patterns"][0]["challenge_name"] == "Anxiety"

@pytest.mark.asyncio
async def test_get_all_bootstrap_data_branches(mock_db):
    """
    Test get_all_bootstrap_data with string content and verifying all type branches.
    Covering:
    - 554->557: string parsing
    - 570->551: challenge_pattern branch
    """
    # Create one of each type, all as JSON strings to force parsing
    rows = [
        ("strategy_effectiveness", "general", json.dumps({"ratings": []}), None),
        ("path_template", "transition", json.dumps({"waypoints": []}), None),
        ("context_modifier", "time", json.dumps({"modifier_type": "time"}), None),
        ("challenge_pattern", "clinical", json.dumps({"challenge_name": "test"}), None),
    ]
    
    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_all_bootstrap_data(db=mock_db)
    
    assert resp["success"] is True
    data = resp["data"]
    
    # Verify each list has 1 item and content was parsed from string
    assert len(data["strategy_effectiveness"]) == 1
    assert isinstance(data["strategy_effectiveness"][0]["content"], dict)
    
    assert len(data["path_templates"]) == 1
    assert isinstance(data["path_templates"][0]["content"], dict)
    
    assert len(data["context_modifiers"]) == 1
    assert isinstance(data["context_modifiers"][0]["content"], dict)
    
    assert len(data["challenge_patterns"]) == 1 # Covers line 570
    assert isinstance(data["challenge_patterns"][0]["content"], dict)
    assert data["challenge_patterns"][0]["content"]["challenge_name"] == "test"

@pytest.mark.asyncio
async def test_get_path_templates_dict_content(mock_db):
    """Test get_path_templates when content is already a dict."""
    template_data = {"from_emotion": "Joy", "to_emotion": "Sadness"}
    mock_rows = [[template_data]]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_path_templates(db=mock_db, from_emotion=None, to_emotion=None, max_difficulty=None)
    assert resp["success"] is True
    assert resp["templates"][0]["from_emotion"] == "Joy"

@pytest.mark.asyncio
async def test_get_challenge_patterns_dict_content(mock_db):
    """Test get_challenge_patterns when content is already a dict."""
    pattern_data = {"challenge_name": "Grief"}
    mock_rows = [[pattern_data]]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_challenge_patterns(db=mock_db, challenge_name=None)
    assert resp["success"] is True
    assert resp["patterns"][0]["challenge_name"] == "Grief"

@pytest.mark.asyncio
async def test_get_all_bootstrap_data_dict_content(mock_db):
    """Test get_all_bootstrap_data when content is already a dict."""
    rows = [
        ("strategy_effectiveness", "gen", {"rating": 5}, None)
    ]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_all_bootstrap_data(db=mock_db)
    assert resp["success"] is True
    assert resp["data"]["strategy_effectiveness"][0]["content"]["rating"] == 5

@pytest.mark.asyncio
async def test_get_all_bootstrap_data_unknown_type(mock_db):
    """Test get_all_bootstrap_data with an unknown data type (coverage for last elif)."""
    rows = [
        ("unknown_type", "gen", {}, None)
    ]
    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows
    mock_db.execute.return_value = mock_result
    
    resp = await get_all_bootstrap_data(db=mock_db)
    assert resp["success"] is True
    # Should be empty lists for known types
    assert len(resp["data"]["strategy_effectiveness"]) == 0

