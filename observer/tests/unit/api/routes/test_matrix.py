from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api.routes.matrix import (
    clear_path_cache,
    compute_all_paths_batch,
    get_all_cached_paths,
    get_computation_status,
    get_path_statistics,
)


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.execute.return_value = MagicMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.scalar = AsyncMock()
    return mock_db


# -----------------------------------------------------------------------------
# POST /compute-all-paths
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compute_all_paths_batch_success(mock_db):
    background_tasks = MagicMock(spec=BackgroundTasks)

    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.create_computation_job = AsyncMock(return_value=uuid4())
        service_instance.compute_all_paths_batch = AsyncMock()

        response = await compute_all_paths_batch(
            background_tasks=background_tasks, user_id="user1", db=mock_db
        )

        assert response["status"] == "pending"
        assert "job_id" in response
        background_tasks.add_task.assert_called_once()


@pytest.mark.asyncio
async def test_compute_all_paths_batch_exception(mock_db):
    background_tasks = MagicMock(spec=BackgroundTasks)
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.create_computation_job.side_effect = Exception("Service Error")

        with pytest.raises(HTTPException) as exc:
            await compute_all_paths_batch(background_tasks, db=mock_db)
        assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /computation-status/{job_id}
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_computation_status_success(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status = AsyncMock(return_value={"status": "running"})

        response = await get_computation_status(job_id, db=mock_db)
        assert response["status"] == "running"


@pytest.mark.asyncio
async def test_get_computation_status_not_found(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc:
            await get_computation_status(job_id, db=mock_db)
        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_computation_status_exception(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status.side_effect = Exception("Service Error")

        with pytest.raises(HTTPException) as exc:
            await get_computation_status(job_id, db=mock_db)
        assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /paths/all
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_all_cached_paths_success(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_all_cached_paths = AsyncMock(return_value=[{"id": 1}])
        service_instance.get_cache_statistics = AsyncMock(return_value={"total": 1})

        response = await get_all_cached_paths(db=mock_db)
        assert response["results"] == 1
        assert response["paths"][0]["id"] == 1


@pytest.mark.asyncio
async def test_get_all_cached_paths_exception(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_all_cached_paths.side_effect = Exception("Service Error")

        with pytest.raises(HTTPException) as exc:
            await get_all_cached_paths(db=mock_db)
        assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# GET /statistics
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_path_statistics_success(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_cache_statistics = AsyncMock(return_value={"stat": "val"})

        response = await get_path_statistics(db=mock_db)
        assert response["stat"] == "val"


@pytest.mark.asyncio
async def test_get_path_statistics_exception(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_cache_statistics.side_effect = Exception("Service Error")

        with pytest.raises(HTTPException) as exc:
            await get_path_statistics(db=mock_db)
        assert exc.value.status_code == 500


# -----------------------------------------------------------------------------
# DELETE /paths/cache
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clear_path_cache_success(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.clear_cache = AsyncMock(return_value=5)

        response = await clear_path_cache(db=mock_db)
        assert response["deleted_count"] == 5


@pytest.mark.asyncio
async def test_clear_path_cache_exception(mock_db):
    with patch("app.api.routes.matrix.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.clear_cache.side_effect = Exception("Service Error")

        with pytest.raises(HTTPException) as exc:
            await clear_path_cache(db=mock_db)
        assert exc.value.status_code == 500
