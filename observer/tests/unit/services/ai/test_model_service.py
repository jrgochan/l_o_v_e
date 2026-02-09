from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai.models import AIModelService, get_ai_model_service


@pytest.fixture
def mock_db():
    db = AsyncMock()
    # Ensure execute returns a MagicMock (the Result object) when awaited
    db.execute = AsyncMock()
    # FIX: db.execute(...) returns a coroutine, which returns a Result object (MagicMock)
    db.execute.return_value = MagicMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db


@pytest.fixture
def service(mock_db):
    return AIModelService(mock_db)


@pytest.mark.asyncio
async def test_get_model_assignments_empty(service, mock_db):
    """Test defaults when no DB entries."""
    # Setup mock result
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    assignments = await service.get_model_assignments()

    assert assignments["semantic_vac"] == service.DEFAULT_MODEL
    assert len(assignments) == 4  # All functions covered


@pytest.mark.asyncio
async def test_get_model_assignments_populated(service, mock_db):
    """Test retrieving existing assignments."""
    assign = MagicMock()
    assign.function = "semantic_vac"
    assign.ai_model_name = "test-model"

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [assign]
    mock_db.execute.return_value = mock_result

    assignments = await service.get_model_assignments()
    assert assignments["semantic_vac"] == "test-model"
    assert assignments["multi_emotion"] == service.DEFAULT_MODEL  # Default for missing


@pytest.mark.asyncio
async def test_get_assignment_for_function(service, mock_db):
    """Test single function lookup."""
    assign = MagicMock()
    assign.ai_model_name = "test-model"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = assign
    mock_db.execute.return_value = mock_result

    model = await service.get_assignment_for_function("semantic_vac")
    assert model == "test-model"

    # Test unknown function
    # Reset mock for default case if needed or rely on different call structure
    mock_result_none = MagicMock()
    mock_result_none.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result_none

    model_unknown = await service.get_assignment_for_function("fake_func")
    assert model_unknown == service.DEFAULT_MODEL


@pytest.mark.asyncio
async def test_assign_model_new(service, mock_db):
    """Test creating new assignment."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    # Refresh side effect to simulate DB default
    async def side_effect_refresh(obj):
        obj.assigned_at = datetime.now(timezone.utc)

    mock_db.refresh.side_effect = side_effect_refresh

    res = await service.assign_model("semantic_vac", "new-model")

    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    assert res["status"] == "success"


@pytest.mark.asyncio
async def test_assign_model_update(service, mock_db):
    """Test updating existing assignment."""
    existing = MagicMock()
    existing.assigned_at = datetime.now(timezone.utc)  # Needs a value for return

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_result

    _ = await service.assign_model("semantic_vac", "updated-model")

    assert existing.ai_model_name == "updated-model"
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_performance_metrics_first(service, mock_db):
    """Test first metric update."""
    assignment = MagicMock()
    assignment.ai_model_name = "model-a"
    assignment.avg_latency_ms = None
    assignment.total_invocations = 0

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = assignment
    mock_db.execute.return_value = mock_result

    await service.update_performance_metrics("semantic_vac", "model-a", 100.0)

    assert assignment.avg_latency_ms == 100.0
    assert assignment.total_invocations == 1


@pytest.mark.asyncio
async def test_update_performance_metrics_ema(service, mock_db):
    """Test EMA calculation."""
    assignment = MagicMock()
    assignment.ai_model_name = "model-a"
    assignment.avg_latency_ms = 100.0

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = assignment
    mock_db.execute.return_value = mock_result

    # New: 200. Avg: 100*0.9 + 200*0.1 = 90 + 20 = 110
    await service.update_performance_metrics("semantic_vac", "model-a", 200.0)

    assert assignment.avg_latency_ms == 110.0


@pytest.mark.asyncio
async def test_get_performance_stats(service, mock_db):
    """Test stats retrieval."""
    assign = MagicMock()
    assign.function = "func1"
    assign.ai_model_name = "model1"
    assign.avg_latency_ms = 150.0
    assign.total_invocations = 5
    assign.last_used_at = datetime.now(timezone.utc)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [assign]
    mock_db.execute.return_value = mock_result

    stats = await service.get_performance_stats()
    assert stats["func1"]["avg_latency_ms"] == 150.0


@pytest.mark.asyncio
async def test_get_recommendations(service):
    """Test static recommendations."""
    recs = await service.get_recommendations()
    assert "semantic_vac" in recs
    assert "reasoning" in recs["semantic_vac"]


@pytest.mark.asyncio
async def test_dependency_helper():
    """Test get_ai_model_service helper."""
    # Mock get_db
    mock_db_sess = AsyncMock()

    # Case 1: Provided DB
    svc = await get_ai_model_service(mock_db_sess)
    assert svc.db == mock_db_sess

    # Case 2: No DB (mocks anext behavior?)
    with patch("app.services.ai.models.get_db") as mock_get_db:
        # Mock async generator
        mock_db_instance = AsyncMock()

        # Async generator mock setup is tricky, but we can mock anext directly?
        # No, anext(gen) calls gen.__anext__().

        mock_gen = MagicMock()
        mock_gen.__anext__ = AsyncMock(return_value=mock_db_instance)
        mock_get_db.return_value = mock_gen

        svc = await get_ai_model_service(None)
        assert svc.db == mock_db_instance


@pytest.mark.asyncio
async def test_error_handling_get_assignments(service, mock_db):
    """Test error handling in get_model_assignments."""
    mock_db.execute.side_effect = Exception("DB Fail")
    result = await service.get_model_assignments()
    assert result["semantic_vac"] == service.DEFAULT_MODEL


@pytest.mark.asyncio
async def test_error_handling_get_assignment_for_function(service, mock_db):
    """Test error handling in get_assignment_for_function."""
    mock_db.execute.side_effect = Exception("DB Fail")
    result = await service.get_assignment_for_function("semantic_vac")
    assert result == service.DEFAULT_MODEL


@pytest.mark.asyncio
async def test_error_handling_assign_model(service, mock_db):
    """Test error handling in assign_model."""
    mock_db.execute.side_effect = Exception("Commit Fail")
    with pytest.raises(RuntimeError, match="Failed to assign"):
        await service.assign_model("semantic_vac", "new-model")
    mock_db.rollback.assert_called_once()


@pytest.mark.asyncio
async def test_error_handling_update_metrics(service, mock_db):
    """Test error handling in update_performance_metrics."""
    mock_db.execute.side_effect = Exception("DB Fail")
    # Should not raise
    await service.update_performance_metrics("semantic_vac", "model", 100)


@pytest.mark.asyncio
async def test_error_handling_get_stats(service, mock_db):
    """Test error handling in get_performance_stats."""
    # Force an exception to test the error handler (lines 455-457)
    mock_db.execute.side_effect = Exception("Stats Fail")
    stats = await service.get_performance_stats()
    assert stats == {}


@pytest.mark.asyncio
async def test_assign_model_unknown_function(service, mock_db):
    """Test assign_model raises ValueError for unknown function."""
    with pytest.raises(ValueError, match="Unknown function"):
        await service.assign_model("invalid_func", "model1")


@pytest.mark.asyncio
async def test_update_performance_metrics_mismatch(service, mock_db):
    """Test update_performance_metrics does nothing if model doesn't match."""
    # Setup existing assignment
    assignment = MagicMock()
    assignment.function = "semantic_vac"
    assignment.ai_model_name = "model_A"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = assignment
    mock_db.execute.return_value = mock_result

    # Try to update metrics for "model_B"
    await service.update_performance_metrics("semantic_vac", "model_B", 100.0)


@pytest.mark.asyncio
async def test_get_assignment_missing(service, mock_db):
    """Test when assignment is missing in DB (returns None)."""
    # Setup mock to return None when queried
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    # Logic in service: if assignment: ... else: logger.info(...); return DEFAULT

    model = await service.get_assignment_for_function("semantic_vac")
    assert model == service.DEFAULT_MODEL
