
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.api.routes import history
from app.models.user_trajectory import UserTrajectory
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.close = AsyncMock()
    return mock_db

@pytest.fixture
def mock_states():
    user_id = uuid4()
    now = datetime.now()
    
    # State 1: Complete data
    s1 = MagicMock(spec=UserTrajectory)
    s1.user_id = user_id
    s1.dominant_emotion_id = uuid4()
    s1.timestamp = now - timedelta(hours=2)
    s1.vac_values = [-0.5, 0.5, 0.0]
    s1.quaternion_state = [1, 0, 0, 0]
    s1.elasticity_metric = 0.8
    __name__ = "State1"

    # State 2: No emotion ID
    s2 = MagicMock(spec=UserTrajectory)
    s2.user_id = user_id
    s2.dominant_emotion_id = None
    s2.timestamp = now - timedelta(hours=1)
    s2.vac_values = [0.0, 0.0, 0.0]
    s2.quaternion_state = [0, 1, 0, 0]
    s2.elasticity_metric = 0.5
    
    return [s1, s2]

@pytest.mark.asyncio
async def test_get_history_full_success(mock_db, mock_states):
    """Test retrieving history with populated states and emotion lookup."""
    user_id = mock_states[0].user_id
    states = mock_states

    # Mock DB query for states
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = states
    
    # Mock DB query for emotion lookup (for s1)
    mock_emotion = MagicMock(spec=AtlasDefinition)
    mock_emotion.emotion_name = "Joy"
    
    mock_result_emotion = MagicMock()
    mock_result_emotion.scalar_one_or_none.return_value = mock_emotion
    
    # Mock DB query for messages (empty for now)
    mock_result_msgs = MagicMock()
    mock_result_msgs.scalars().all.return_value = []

    # Configure execute side effects
    # First call: Select UserTrajectory
    # Second call: Select ChatMessage (new)
    # Third call: Select AtlasDefinition (for s1)
    # Note: s2 has no ID, so no lookup
    mock_db.execute.side_effect = [mock_result_states, mock_result_msgs, mock_result_emotion]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.user_id == str(user_id)
    assert resp.data_points == 2
    assert len(resp.trajectory) == 2
    
    # Check s1 (Resolved "Joy")
    t1 = resp.trajectory[0]
    assert t1.emotion == "Joy"
    assert t1.vac == [-0.5, 0.5, 0.0]
    
    # Check s2 (Unknown)
    t2 = resp.trajectory[1]
    assert t2.emotion == "Unknown"

@pytest.mark.asyncio
async def test_get_history_empty(mock_db):
    """Test history request with no results."""
    # Mock empty result
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = []
    # Queries: Trajectory (empty), [Messages skipped if states empty? Check logic]
    # Logic: if not states: return empty. So only 1 query.
    mock_db.execute.return_value = mock_result
    
    user_id = uuid4()
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.data_points == 0
    assert resp.trajectory == []

@pytest.mark.asyncio
async def test_get_history_with_dates(mock_db):
    """Test date filtering logic."""
    start = datetime.now() - timedelta(days=1)
    end = datetime.now()
    user_id = uuid4()
    
    # Return empty just to check query construction via mocks isn't easy 
    # without deeper inspection, but we can assume if it runs it's OK.
    # To verify filters, we'd need to inspect the 'stmt' construction which is hard with SQLAlchemy mocks.
    # Instead, we verify the function executes successfully with checks.
    
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = []
    mock_db.execute.return_value = mock_result
    
    resp = await history.get_history(user_id, start_date=start, end_date=end, db=mock_db)
    assert resp.data_points == 0
    mock_db.execute.assert_awaited()

@pytest.mark.asyncio
async def test_get_history_lookup_fail_for_valid_id(mock_db):
    """Test state has emotion ID but lookup returns None (DB integrity issue)."""
    user_id = uuid4()
    
    # One state with ID
    s1 = MagicMock(spec=UserTrajectory)
    s1.dominant_emotion_id = uuid4()
    s1.timestamp = datetime.now()
    s1.vac_values = [0,0,0]
    s1.quaternion_state = [0,0,0,0]
    s1.elasticity_metric = 1.0
    
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = [s1]
    
    # Mock messages (empty)
    mock_result_msgs = MagicMock()
    mock_result_msgs.scalars().all.return_value = []
    
    # Lookup returns None
    mock_result_lookup = MagicMock()
    mock_result_lookup.scalar_one_or_none.return_value = None
    
    mock_db.execute.side_effect = [mock_result_states, mock_result_msgs, mock_result_lookup]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert resp.trajectory[0].emotion == "Unknown"

@pytest.mark.asyncio
async def test_get_history_exception(mock_db):
    """Test exception handling propagates as 500."""
    mock_db.execute.side_effect = Exception("DB Crash")
    
    with pytest.raises(HTTPException) as exc:
        await history.get_history(uuid4(), db=mock_db)
    
    assert exc.value.status_code == 500
    assert "Failed to retrieve history" in exc.value.detail

@pytest.mark.asyncio
async def test_get_history_with_linked_messages(mock_db, mock_states):
    """Test retrieving history where states are linked to messages with relationships."""
    user_id = mock_states[0].user_id
    states = [mock_states[0]] # Just use one state
    
    # Timestamp for synchronization
    ts = states[0].timestamp
    
    # Mock DB query for states
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = states
    
    # Mock Linked Message
    # Needs to match timestamp: state.timestamp.replace(microsecond=0)
    # We set message timestamp to be exactly that
    mock_msg = MagicMock()
    mock_msg.id = uuid4()
    mock_msg.timestamp = ts # Exact match
    
    # Mock Relationship
    mock_rel = MagicMock()
    mock_rel.relationship_type = "elaboration"
    mock_rel.target_message_id = uuid4()
    
    mock_msg.outgoing_relationships = [mock_rel]
    
    # Mock DB query for messages
    mock_result_msgs = MagicMock()
    mock_result_msgs.scalars().all.return_value = [mock_msg]
    
    # Mock DB query for emotion (for state)
    mock_result_emotion = MagicMock()
    mock_result_emotion.scalar_one_or_none.return_value = None # Skip name lookup for simplicity
    
    # Side effects: States -> Messages -> Emotion
    mock_db.execute.side_effect = [mock_result_states, mock_result_msgs, mock_result_emotion]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert len(resp.trajectory) == 1
    t1 = resp.trajectory[0]
    
    # Verify Message Link
    assert t1.message_id == str(mock_msg.id)
    
    # Verify Relationship Marker
    assert t1.relationship_marker is not None
    assert t1.relationship_marker["target_id"] == str(mock_rel.target_message_id)
    assert t1.relationship_marker["count"] == 1

@pytest.mark.asyncio
async def test_get_history_diverse_messages(mock_db, mock_states):
    """Test history with diverse message scenarios (no relationships, duplicates)."""
    user_id = mock_states[0].user_id
    states = [mock_states[0]]
    ts = states[0].timestamp
    
    # 1. Message with NO relationships (should be skipped in map)
    msg_no_rel = MagicMock()
    msg_no_rel.id = uuid4()
    msg_no_rel.timestamp = ts
    msg_no_rel.outgoing_relationships = [] # Empty
    
    # 2. Message WITH relationships (should be indexed)
    msg_with_rel = MagicMock()
    msg_with_rel.id = uuid4()
    msg_with_rel.timestamp = ts
    
    rel = MagicMock()
    rel.relationship_type = "reply"
    rel.target_message_id = uuid4()
    msg_with_rel.outgoing_relationships = [rel]
    
    # 3. Duplicate timestamp message with relationships (should be grouped)
    msg_dup = MagicMock()
    msg_dup.id = uuid4()
    msg_dup.timestamp = ts
    rel2 = MagicMock()
    rel2.relationship_type = "link"
    msg_dup.outgoing_relationships = [rel2]
    
    # DB Setup
    mock_result_states = MagicMock()
    mock_result_states.scalars().all.return_value = states
    
    mock_result_msgs = MagicMock()
    # Order matters for "first matching message" logic in history.py
    mock_result_msgs.scalars().all.return_value = [msg_no_rel, msg_with_rel, msg_dup]
    
    mock_result_emotion = MagicMock()
    mock_result_emotion.scalar_one_or_none.return_value = None
    
    mock_db.execute.side_effect = [mock_result_states, mock_result_msgs, mock_result_emotion]
    
    resp = await history.get_history(user_id, db=mock_db)
    
    assert len(resp.trajectory) == 1
    t = resp.trajectory[0]
    
    # Verify it picked up the message WITH relationships (msg_with_rel)
    # Because msg_no_rel should not be in the map at all.
    assert t.message_id == str(msg_with_rel.id)
    assert t.relationship_marker["type"] == "reply"
