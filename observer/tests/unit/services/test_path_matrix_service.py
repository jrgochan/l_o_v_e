import pytest
import json
import uuid
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError

from app.services.path_matrix_service import PathMatrixService
from app.models.emotion_definition import EmotionDefinition

@pytest.fixture
def mock_session():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db

@pytest.fixture
def mock_planner():
    planner = AsyncMock()
    path = MagicMock()
    path.waypoints = []
    path.total_distance = 1.5
    path.estimated_time = "10 mins"
    path.difficulty = "easy"
    planner.find_transition_path.return_value = path
    return planner

@pytest.fixture
def service(mock_session, mock_planner):
    svc = PathMatrixService(mock_session)
    svc.path_planner = mock_planner 
    return svc

@pytest.mark.asyncio
async def test_compute_all_paths_batch_success(service, mock_session):
    """Test full batch computation success."""
    # Mock emotions
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", category="C1", vac_vector=[0.1, 0.2, 0.3])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", category="C2", vac_vector=[0.4, 0.5, 0.6])
    
    # Mock Result for emotions query
    emotion_result = MagicMock()
    emotion_result.scalars.return_value.all.return_value = [e1, e2]
    
    # We have multiple execute calls (get emotions, check cache, update job, commit ignored)
    # The first one returns emotions. Subsequent ones (update job) don't need returns
    # But check_cache is inside patch.
    
    # Simple strategy: satisfy the first call which is the emotions query
    # Subsequent calls to execute (like update triggers) returns simple MagicMocks
    mock_session.execute.return_value = emotion_result
    
    with patch.object(service, '_is_cached', new_callable=AsyncMock) as mock_is_cached:
        mock_is_cached.return_value = False
        
        job_id = uuid.uuid4()
        res = await service.compute_all_paths_batch(job_id)
        
        assert res["status"] == "completed"
        assert res["completed"] == 2
        
        # Verify job status updates
        # Should be called at start, during (maybe), and end
        assert service.session.execute.call_count >= 1

@pytest.mark.asyncio
async def test_compute_all_paths_batch_cached(service, mock_session):
    """Test skip cached paths."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", category="C1", vac_vector=[0.1, 0.2, 0.3])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", category="C2", vac_vector=[0.4, 0.5, 0.6])
    
    emotion_result = MagicMock()
    emotion_result.scalars.return_value.all.return_value = [e1, e2]
    mock_session.execute.return_value = emotion_result

    with patch.object(service, '_is_cached', new_callable=AsyncMock) as mock_is_cached:
        mock_is_cached.return_value = True 
        
        job_id = uuid.uuid4()
        res = await service.compute_all_paths_batch(job_id)
        
        assert res["completed"] == 2
        service.path_planner.find_transition_path.assert_not_called()

@pytest.mark.asyncio
async def test_compute_all_paths_batch_error(service, mock_session):
    """Test error handling in batch."""
    # Force error on first execute
    mock_session.execute.side_effect = Exception("DB Error")
    
    with pytest.raises(Exception):
        await service.compute_all_paths_batch(uuid.uuid4())

@pytest.mark.asyncio
async def test_compute_single_path(service):
    """Test single path data construction."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", category="C1", vac_vector=[0.1, 0.2, 0.3])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", category="C2", vac_vector=[0.4, 0.5, 0.6])
    
    wp = MagicMock()
    wp.emotion_name = "Bridge"
    wp.vac_vector = [0.1, 0.1, 0.1]
    wp.category = "Cat"
    
    path_res = MagicMock()
    path_res.waypoints = [wp]
    path_res.total_distance = 1.0
    path_res.estimated_time = "5m"
    path_res.difficulty = "easy"
    
    service.path_planner.find_transition_path.return_value = path_res
    
    data = await service._compute_single_path(e1, e2, None)
    
    assert data["from_emotion"]["name"] == "E1"
    assert data["distance"] == 1.0

@pytest.mark.asyncio
async def test_cache_path(service, mock_session):
    """Test SQL execution for caching."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", category="C1", vac_vector=[0.1, 0.2, 0.3])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", category="C2", vac_vector=[0.4, 0.5, 0.6])
    path_data = {
        "distance": 1.0, "difficulty": "easy", "waypoint_count": 0,
        "requires_bridge": False, "estimated_time": "5m"
    }
    
    await service._cache_path(e1, e2, path_data)
    mock_session.execute.assert_called()

@pytest.mark.asyncio
async def test_get_all_cached_paths(service, mock_session):
    """Test retrieval."""
    mock_result = MagicMock()
    # row[0] is path_data dict
    row_data = [{"id": "p1"}, 1.0, "easy", 2, False, datetime.utcnow()]
    mock_result.fetchall.return_value = [row_data]
    mock_session.execute.return_value = mock_result
    
    res = await service.get_all_cached_paths(limit=10)
    assert len(res) == 1
    assert res[0]["id"] == "p1"
    assert "distance" in res[0]["meta"]

@pytest.mark.asyncio
async def test_is_cached(service, mock_session):
    """Test cache check."""
    mock_result = MagicMock()
    mock_result.scalar.return_value = True
    mock_session.execute.return_value = mock_result
    
    assert await service._is_cached(uuid.uuid4(), uuid.uuid4()) is True

@pytest.mark.asyncio
async def test_update_job_status(service, mock_session):
    """Test status update."""
    await service._update_job_status(uuid.uuid4(), "running", 10, 5, 0)
    mock_session.execute.assert_called()

def test_calculate_vac_hash(service):
    """Test deterministic hash generation."""
    v1 = [0.1, 0.2, 0.3]
    v2 = [0.4, 0.5, 0.6]
    
    h1 = service._calculate_vac_hash(v1, v2)
    h2 = service._calculate_vac_hash(v1, v2)
    h3 = service._calculate_vac_hash(v2, v1)  # Order matters
    
    assert h1 == h2  # Deterministic
    assert h1 != h3  # Direction sensitive
    assert isinstance(h1, str)
    assert len(h1) == 64  # SHA256

@pytest.mark.asyncio
async def test_compute_single_path_bridge_logic(service):
    """Test bridge detection logic."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="A", vac_vector=[0,0,0], category="C")
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="B", vac_vector=[0,0,0], category="C")
    
    # Case 1: No bridge
    wp1 = MagicMock()
    wp1.emotion_name = "Normal"
    wp1.vac_vector = [0,0,0]
    
    path_res = MagicMock()
    path_res.waypoints = [wp1]
    path_res.total_distance = 1.0
    path_res.estimated_time = "5m"
    path_res.difficulty = "easy"
    service.path_planner.find_transition_path.return_value = path_res
    
    data = await service._compute_single_path(e1, e2, None)
    assert data["requires_bridge"] is False
    
    # Case 2: With Bridge (Vulnerability)
    wp2 = MagicMock()
    wp2.emotion_name = "Vulnerability"
    wp2.vac_vector = [0,0,0]
    
    path_res.waypoints = [wp1, wp2]
    service.path_planner.find_transition_path.return_value = path_res
    
    data = await service._compute_single_path(e1, e2, None)
    assert data["requires_bridge"] is True

@pytest.mark.asyncio
async def test_create_computation_job(service, mock_session):
    """Test job creation."""
    job_id = await service.create_computation_job(100, "admin")
    assert isinstance(job_id, uuid.UUID)
    mock_session.execute.assert_called()
    mock_session.commit.assert_called()

@pytest.mark.asyncio
async def test_get_computation_job_status(service, mock_session):
    """Test status retrieval."""
    # Case 1: Job found
    start = datetime.now(timezone.utc)
    mock_row = MagicMock()
    # status, total, completed, failed, started_at, completed_at, error
    mock_row.return_value = ("running", 100, 50, 0, start, None, None)
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = ("running", 100, 50, 0, start, None, None)
    mock_session.execute.return_value = mock_result
    
    status = await service.get_computation_job_status(uuid.uuid4())
    assert status["status"] == "running"
    assert status["percentage"] == 50.0
    assert "estimated_time_remaining" in status

    # Case 2: Not found
    mock_result.fetchone.return_value = None
    status = await service.get_computation_job_status(uuid.uuid4())
    assert status is None

@pytest.mark.asyncio
async def test_get_cache_statistics(service, mock_session):
    """Test statistics retrieval."""
    # Case 1: Data exists
    # total, easy, mod, diff, bridge, avg_dist, min, max, avg_wp, last
    mock_row = (100, 20, 50, 30, 10, 2.5, 1.0, 5.0, 3.0, datetime.now(timezone.utc))
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row
    mock_session.execute.return_value = mock_result
    
    stats = await service.get_cache_statistics()
    assert stats["total_cached"] == 100
    assert stats["difficulty_distribution"]["easy"] == 20
    
    # Case 2: Empty
    mock_result.fetchone.return_value = (0, 0, 0, 0, 0, None, None, None, None, None)
    stats = await service.get_cache_statistics()
    assert stats["total_cached"] == 0
    assert stats["completion_percentage"] == 0.0

@pytest.mark.asyncio
async def test_clear_cache(service, mock_session):
    """Test clearing cache."""
    # Mock count query
    mock_result = MagicMock()
    mock_result.scalar.return_value = 500
    mock_session.execute.return_value = mock_result
    
    deleted = await service.clear_cache()
    
    assert deleted == 500
    assert mock_session.execute.call_count >= 2 # Count and delete
    mock_session.commit.assert_called()

@pytest.mark.asyncio
async def test_get_all_cached_paths_filters(service, mock_session):
    """Test retrieval with filters."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    mock_session.execute.return_value = mock_result
    
    # Test with filters
    await service.get_all_cached_paths(
        difficulty_filter="hard", 
        requires_bridge_filter=True,
        limit=5
    )
    
    # Verify SQL generation implicitly via call args if we want, 
    # or just trust coverage that branches trigger.
    # The coverage report showed lines 763 etc missed, so this call should hit them.
    # We can inspect the SQL string bound to the call to be sure.
    call_args = mock_session.execute.call_args
    sql = str(call_args[0][0])
    assert "difficulty = :difficulty" in sql
    assert "requires_bridge = :requires_bridge" in sql
    assert "LIMIT :limit" in sql

@pytest.mark.asyncio
async def test_compute_all_paths_batch_partial_failure(service, mock_session):
    """Test batch continuing after single failure."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0,0,0], category="C")
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", vac_vector=[0,0,0], category="C")
    e3 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E3", vac_vector=[0,0,0], category="C")
    
    emotion_result = MagicMock()
    emotion_result.scalars.return_value.all.return_value = [e1, e2, e3]
    mock_session.execute.return_value = emotion_result
    
    # Setup _is_cached to return False
    with patch.object(service, '_is_cached', new_callable=AsyncMock) as mock_cached:
        mock_cached.return_value = False
        
        # Setup _compute_single_path to fail for E2->E1 but succeed for others
        async def side_effect(from_e, to_e, uid, collection_id=None):
            if from_e.emotion_name == "E1" and to_e.emotion_name == "E2":
                raise ValueError("Fail path")
            return {
                "distance": 1.0, "difficulty": "easy", "waypoint_count": 0,
                "requires_bridge": False, "estimated_time": "5m"
            }
            
        with patch.object(service, '_compute_single_path', side_effect=side_effect):
            res = await service.compute_all_paths_batch(uuid.uuid4())
            
            # Total pairs: 3 emotions * 2 = 6 pairs.
            # One failure (E1->E2).
            # Successes: 5. 
            assert res["status"] == "completed" 
            assert res["failed"] == 1
            assert res["completed"] == 5

@pytest.mark.asyncio
async def test_get_computation_job_status_eta_branches(service, mock_session):
    """Test ETA calculation branches."""
    # 1. Running but 0 completed (no div by zero)
    mock_result = MagicMock()
    # status, total, completed, failed, start, completed_at, error
    mock_result.fetchone.return_value = ("running", 100, 0, 0, datetime.now(timezone.utc), None, None)
    mock_session.execute.return_value = mock_result
    
    status = await service.get_computation_job_status(uuid.uuid4())
    assert status["estimated_time_remaining"] is None

@pytest.mark.asyncio
async def test_path_matrix_computation_failure():
    mock_db = AsyncMock()
    service_fail = PathMatrixService(mock_db)
    
    call_tracker = {"count": 0}
    async def execute_side_effect(stmt, *args, **kwargs):
        call_tracker["count"] += 1
        count = call_tracker["count"]
        
        # 1. Mystery SELECT -> Success
        # 2. Update (Processing) -> Success
        # 3. Select (Emotions) -> FAIL (This is the one we want to fail)
        # 4. Update (Failed) -> Success (Recovery)
        
        if count == 3:
            raise SQLAlchemyError("Emotion Fetch Failed")
            
        return MagicMock()
        
    mock_db.execute.side_effect = execute_side_effect
    
    try:
        await service_fail.compute_all_paths_batch(uuid.uuid4())
        assert False, "Should have raised Exception"
    except SQLAlchemyError as e:
        assert "Emotion Fetch Failed" in str(e)
        
    # Verify commit was called
    mock_db.commit.assert_awaited()

@pytest.mark.asyncio
async def test_get_all_cached_paths_no_limit(service, mock_session):
    """Test getting cached paths without a limit (coverage for empty limit clause)."""
    mock_result = MagicMock()
    # Return empty list
    mock_result.fetchall.return_value = []
    mock_session.execute.return_value = mock_result
    
    await service.get_all_cached_paths(limit=None)
    
    # Check that SQL was constructed without LIMIT
    call_args = mock_session.execute.call_args
    call_args = mock_session.execute.call_args
    query = call_args[0][0].text
    assert "LIMIT" not in query

@pytest.mark.asyncio
async def test_compute_batch_progress(service, mock_session):
    """Test batch computation progress updates (every 10 items)."""
    # Need 4 emotions => 4*3 = 12 paths (> 10)
    emotions = []
    for i in range(4):
        emotions.append(EmotionDefinition(
            id=uuid.uuid4(), 
            emotion_name=f"E{i}", 
            vac_vector=[0,0,0], 
            category="C"
        ))
        
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = emotions
    mock_session.execute.return_value = mock_res
    
    with patch.object(service, '_is_cached', new_callable=AsyncMock) as mock_cached:
        mock_cached.return_value = False
        
        # Run batch
        res = await service.compute_all_paths_batch(uuid.uuid4())
        
        assert res["total_paths"] == 12
        assert res["completed"] == 12
        
        # Verify execute called enough times implicitly
        # (1 initial + 1 update at 10 + 1 final update + N inserts)
        # We can also check specific call args if we really want, but 
        # hitting the branch execution is the main goal for coverage.
        
        # Check that we called execute with "running" status update at least once
        # besides the initial one.
        # Initial: 0 completed
        # Update: 10 completed
        # Final: 12 completed, status "completed"
        
        # Let's inspect call args for the update at 10
        found_intermediate_update = False
        for call in mock_session.execute.call_args_list:
            # call.args[0] is statement, call.args[1] is params
            if len(call.args) > 1:
                params = call.args[1]
                if params.get("completed") == 10 and params.get("status") == "running":
                    found_intermediate_update = True
                    break
        
        assert found_intermediate_update, "Should have triggered intermediate progress update at 10 completions"
