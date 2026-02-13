import json
import uuid
from unittest.mock import ANY, AsyncMock, MagicMock

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.matrix.batch import BatchProcessor
from app.services.matrix.cache import CacheManager
from app.services.matrix.service import PathMatrixService

# ==============================================================================
# BatchProcessor Tests
# ==============================================================================


@pytest.fixture
def mock_session():
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    return db


@pytest.fixture
def batch_processor(mock_session):
    processor = BatchProcessor(mock_session)
    processor.path_planner = AsyncMock()
    processor.cache_manager = AsyncMock()
    processor.job_manager = AsyncMock()
    return processor


@pytest.mark.asyncio
async def test_batch_execute_success(batch_processor, mock_session):
    """Test successful batch execution."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0, 0, 0])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", vac_vector=[1, 1, 1])

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1, e2]
    mock_session.execute.return_value = mock_res

    # dependencies return valid stuff
    batch_processor.cache_manager.is_cached.return_value = False
    batch_processor.path_planner.find_transition_path.return_value = MagicMock(
        total_distance=1.0, waypoints=[], estimated_time="5m", difficulty="easy"
    )

    res = await batch_processor.execute_batch(uuid.uuid4(), "user")

    assert res["status"] == "completed"
    assert res["total_paths"] == 2  # 2 emotions = 2 pairs (no self)
    assert res["completed"] == 2

    # Verification
    assert batch_processor.job_manager.update_job_status.call_count >= 2
    assert batch_processor.cache_manager.cache_path.call_count == 2


@pytest.mark.asyncio
async def test_batch_execute_cached(batch_processor, mock_session):
    """Test skipping cached items."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0, 0, 0])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", vac_vector=[1, 1, 1])

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1, e2]
    mock_session.execute.return_value = mock_res

    batch_processor.cache_manager.is_cached.return_value = True

    res = await batch_processor.execute_batch(uuid.uuid4(), "user")

    assert res["completed"] == 2
    batch_processor.path_planner.find_transition_path.assert_not_called()


@pytest.mark.asyncio
async def test_batch_execute_with_collection(batch_processor, mock_session):
    """Test batch execution with collection_id filter (Line 39)."""
    # Mock return values
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []  # Return empty to skip loop logic
    mock_session.execute.return_value = mock_res

    coll_id = uuid.uuid4()
    await batch_processor.execute_batch(uuid.uuid4(), "user", str(coll_id))

    # Verify query was filtered
    call_args = mock_session.execute.call_args
    assert call_args
    query = call_args[0][0]
    # In newer sqlalchemy, we might check stringified query or compiled params
    # But usually verifying the call occured is enough if we trust the library.
    # We can check if 'WHERE' clause was seemingly added or check the construct.
    assert "collection_id" in str(query)


@pytest.mark.asyncio
async def test_batch_execute_progress_update(batch_processor, mock_session):
    """Test progress update logic (Lines 90-103)."""
    # We need enough emotions to trigger % 10.
    # Let's mock 5 emotions. 5*4 = 20 pairs.
    emotions = [
        EmotionDefinition(id=uuid.uuid4(), emotion_name=f"E{i}", vac_vector=[0, 0, 0])
        for i in range(5)
    ]
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = emotions
    mock_session.execute.return_value = mock_res

    batch_processor.cache_manager.is_cached.return_value = False
    batch_processor.path_planner.find_transition_path.return_value = MagicMock(
        total_distance=1.0, waypoints=[], estimated_time="5m", difficulty="easy"
    )

    await batch_processor.execute_batch(uuid.uuid4(), "user")

    # We expect update_job_status to be called:
    # 1. Start (0,0)
    # 2. At 10 completed
    # 3. At 20 completed
    # 4. Final completion
    assert batch_processor.job_manager.update_job_status.call_count >= 4


@pytest.mark.asyncio
async def test_batch_execute_inner_failure(batch_processor, mock_session):
    """Test inner loop exception handling (Lines 95-103)."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0, 0, 0])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", vac_vector=[1, 1, 1])

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1, e2]
    mock_session.execute.return_value = mock_res

    batch_processor.cache_manager.is_cached.return_value = False
    # Raise exception for first path, succeed for second
    batch_processor.path_planner.find_transition_path.side_effect = [
        Exception("Boom"),
        MagicMock(total_distance=1.0, waypoints=[], estimated_time="5m", difficulty="easy"),
    ]

    res = await batch_processor.execute_batch(uuid.uuid4(), "user")

    # 1 failed, 1 succeeded (since 2 pairs total: E1->E2, E2->E1)
    # Actually wait - pairs are (E1->E2) and (E2->E1).
    # side_effect has 2 elements.
    assert res["completed"] == 1
    assert res["failed"] == 1


@pytest.mark.asyncio
async def test_batch_execute_top_level_failure(batch_processor, mock_session):
    """Test top level failure (Lines 138-144)."""
    # We need execute to succeed so total_pairs is calc'd
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0, 0, 0])
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1]
    mock_session.execute.return_value = mock_res

    # Fail at commit (which happens at end of loop or after)
    # We use an iterator so the first commit fails (triggering except),
    # but the cleanup commit in the except block succeeds, allowing us to hit 'raise'
    mock_session.commit.side_effect = [Exception("Commit Error"), None]

    with pytest.raises(Exception, match="Commit Error"):
        await batch_processor.execute_batch(uuid.uuid4(), "user")

    batch_processor.job_manager.update_job_status.assert_called_with(
        ANY, "failed", ANY, ANY, ANY, error_message="Commit Error"
    )


# ==============================================================================
# CacheManager Tests
# ==============================================================================


@pytest.fixture
def cache_manager(mock_session):
    return CacheManager(mock_session)


@pytest.mark.asyncio
async def test_is_cached(cache_manager, mock_session):
    """Test is_cached check."""
    mock_res = MagicMock()
    mock_res.scalar.return_value = True
    mock_session.execute.return_value = mock_res

    assert await cache_manager.is_cached(uuid.uuid4(), uuid.uuid4()) is True


@pytest.mark.asyncio
async def test_cache_path(cache_manager, mock_session):
    """Test caching a path."""
    e1 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E1", vac_vector=[0, 0, 0])
    e2 = EmotionDefinition(id=uuid.uuid4(), emotion_name="E2", vac_vector=[1, 1, 1])
    data = {
        "distance": 1.0,
        "difficulty": "easy",
        "waypoint_count": 0,
        "requires_bridge": False,
        "estimated_time": "5m",
    }

    await cache_manager.cache_path(e1, e2, data)
    mock_session.execute.assert_called()


@pytest.mark.asyncio
async def test_get_all_cached_paths(cache_manager, mock_session):
    """Test retrieving cached paths."""
    path_data = {
        "from_emotion": {"id": "abc", "name": "Joy"},
        "to_emotion": {"id": "def", "name": "Sadness"},
        "waypoints": [],
        "distance": 1.0,
        "difficulty": "easy",
        "estimated_time": "5m",
        "requires_bridge": False,
    }
    mock_res = MagicMock()
    # row = (from_id, to_id, path_data, distance, diff, wpc, bridge, time)
    mock_res.fetchall.return_value = [
        (
            uuid.uuid4(),
            uuid.uuid4(),
            json.dumps(path_data),
            1.0,
            "easy",
            0,
            False,
            "5m",
        )
    ]
    mock_session.execute.return_value = mock_res

    res = await cache_manager.get_all_cached_paths(limit=10)
    assert len(res) == 1
    # Flattened response: path_data fields are at top level
    assert res[0]["distance"] == 1.0
    assert res[0]["from_emotion"]["id"] == "abc"


@pytest.mark.asyncio
async def test_get_all_cached_paths_filters(cache_manager, mock_session):
    """Test retrieving cached paths with filters (Lines 126-139)."""
    mock_res = MagicMock()
    mock_res.fetchall.return_value = []
    mock_session.execute.return_value = mock_res

    # Test with filters
    await cache_manager.get_all_cached_paths(
        difficulty_filter="hard", requires_bridge_filter=True, limit=5
    )

    # Verify query construction via call args
    call_args = mock_session.execute.call_args
    assert call_args
    query_text = str(call_args[0][0])  # sql text
    params = call_args[0][1]

    assert "difficulty = :difficulty" in query_text
    assert "requires_bridge = :bridge" in query_text
    assert "LIMIT :limit" in query_text
    assert params["difficulty"] == "hard"
    assert params["bridge"] is True
    assert params["limit"] == 5


@pytest.mark.asyncio
async def test_get_all_cached_paths_no_limit(cache_manager, mock_session):
    """Test retrieving cached paths without limit (Line 135->139)."""
    mock_res = MagicMock()
    mock_res.fetchall.return_value = []
    mock_session.execute.return_value = mock_res

    await cache_manager.get_all_cached_paths(limit=None)

    call_args = mock_session.execute.call_args
    assert call_args
    query_text = str(call_args[0][0])

    # Assert LIMIT is NOT present
    assert "LIMIT" not in query_text


@pytest.mark.asyncio
async def test_get_cache_statistics(cache_manager, mock_session):
    """Test get_cache_statistics (Lines 161-184)."""
    # 3 execute calls: Total, Distribution, Bridges

    # 1. Total
    res_total = MagicMock()
    res_total.scalar.return_value = 100

    # 2. Distribution
    res_dist = MagicMock()
    res_dist.fetchall.return_value = [("easy", 50), ("hard", 50)]

    # 3. Bridges
    res_bridges = MagicMock()
    res_bridges.scalar.return_value = 10

    mock_session.execute.side_effect = [res_total, res_dist, res_bridges]

    stats = await cache_manager.get_cache_statistics()

    assert stats["total_cached"] == 100
    assert stats["difficulty_distribution"] == {"easy": 50, "hard": 50}
    assert stats["bridge_paths"] == 10


# ==============================================================================
# Service Facade Tests
# ==============================================================================


@pytest.fixture
def matrix_service(mock_session):
    svc = PathMatrixService(mock_session)
    svc.batch_processor = AsyncMock()
    svc.cache_manager = AsyncMock()
    svc.job_manager = AsyncMock()
    return svc


@pytest.mark.asyncio
async def test_create_computation_job_delegation(matrix_service):
    """Test that create_computation_job delegates to job_manager."""
    await matrix_service.create_computation_job(100, "user")
    matrix_service.job_manager.create_job.assert_called_with(100, "user")


@pytest.mark.asyncio
async def test_get_job_status_delegation(matrix_service):
    """Test delegation."""
    await matrix_service.get_computation_job_status(uuid.uuid4())
    matrix_service.job_manager.get_job_status.assert_called()


@pytest.mark.asyncio
async def test_compute_all_paths_batch_delegation(matrix_service):
    """Test compute_all_paths_batch delegates to batch_processor."""
    job_id = uuid.uuid4()
    await matrix_service.compute_all_paths_batch(job_id, "user", "coll")
    matrix_service.batch_processor.execute_batch.assert_called_with(job_id, "user", "coll")


@pytest.mark.asyncio
async def test_get_all_cached_paths_delegation(matrix_service):
    """Test get_all_cached_paths delegates to cache_manager."""
    await matrix_service.get_all_cached_paths("easy", True, 10)
    matrix_service.cache_manager.get_all_cached_paths.assert_called_with("easy", True, 10, 0)


@pytest.mark.asyncio
async def test_get_cache_statistics_delegation(matrix_service):
    """Test get_cache_statistics delegates to cache_manager."""
    await matrix_service.get_cache_statistics()
    matrix_service.cache_manager.get_cache_statistics.assert_called_once()


@pytest.mark.asyncio
async def test_clear_cache_delegation(matrix_service):
    """Test clear_cache delegates to cache_manager."""
    await matrix_service.clear_cache()
    matrix_service.cache_manager.clear_cache.assert_called_once()


@pytest.mark.asyncio
async def test_get_all_cached_paths_offset(cache_manager, mock_session):
    """Test retrieving cached paths with offset."""
    mock_res = MagicMock()
    mock_res.fetchall.return_value = []
    mock_session.execute.return_value = mock_res

    await cache_manager.get_all_cached_paths(limit=10, offset=5)

    call_args = mock_session.execute.call_args
    assert call_args
    query_text = str(call_args[0][0])
    params = call_args[0][1]

    assert "OFFSET :offset" in query_text
    assert params["offset"] == 5


@pytest.mark.asyncio
async def test_clear_cache(cache_manager, mock_session):
    """Test clearing the cache."""
    mock_res = MagicMock()
    mock_res.rowcount = 10
    mock_session.execute.return_value = mock_res

    deleted_count = await cache_manager.clear_cache()

    assert deleted_count == 10
    assert "DELETE FROM path_matrix_cache" in str(mock_session.execute.call_args[0][0])
    mock_session.commit.assert_awaited_once()
