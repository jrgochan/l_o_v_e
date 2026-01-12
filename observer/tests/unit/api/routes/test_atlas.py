import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi import BackgroundTasks, HTTPException
from app.api.routes.atlas import (
    get_all_emotions,
    get_categories,
    get_emotion_by_id,
    search_emotions,
    compute_all_paths_batch,
    get_computation_status,
    get_all_cached_paths,
    get_atlas_statistics,
    clear_path_cache,
    get_smart_recommendations
)
from app.models.atlas_definition import AtlasDefinition

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_emotion():
    return AtlasDefinition(
        id=uuid4(),
        emotion_name="Test Emotion",
        category="Test Category",
        definition="Test Definition",
        vac_vector=[0.1, 0.2, 0.3],
        q_constant=[1.0, 0.0, 0.0, 0.0],
        color_hint="#123456"
    )

# -----------------------------------------------------------------------------
# GET /atlas/emotions
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_all_emotions_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result
    
    # 1. No filter
    response = await get_all_emotions(category=None, db=mock_db)
    assert response["total_count"] == 1
    assert response["emotions"][0]["name"] == "Test Emotion"
    
    # 2. With filter
    await get_all_emotions(category="Test Category", db=mock_db)
    # Verification of call args would confirm filtering logic

@pytest.mark.asyncio
async def test_get_all_emotions_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_all_emotions(db=mock_db)
    assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/categories
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_categories_success(mock_db):
    mock_result = MagicMock()
    # Mock return of [(category, count)]
    mock_result.all.return_value = [("Cat1", 10), ("Cat2", 5)]
    mock_db.execute.return_value = mock_result
    
    response = await get_categories(db=mock_db)
    assert response["total_categories"] == 2
    assert response["categories"][0]["name"] == "Cat1"
    assert response["categories"][0]["emotion_count"] == 10

@pytest.mark.asyncio
async def test_get_categories_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_categories(db=mock_db)
    assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/emotions/{id}
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_emotion_by_id_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_emotion
    mock_db.execute.return_value = mock_result
    
    response = await get_emotion_by_id(str(mock_emotion.id), db=mock_db)
    assert response["name"] == "Test Emotion"

@pytest.mark.asyncio
async def test_get_emotion_by_id_not_found(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await get_emotion_by_id(str(uuid4()), db=mock_db)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_get_emotion_by_id_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await get_emotion_by_id(str(uuid4()), db=mock_db)
    assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/search
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_emotions_success(mock_db, mock_emotion):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_emotion]
    mock_db.execute.return_value = mock_result
    
    response = await search_emotions(query="test", db=mock_db)
    assert response["result_count"] == 1
    assert response["emotions"][0]["name"] == "Test Emotion"

@pytest.mark.asyncio
async def test_search_emotions_exception(mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    with pytest.raises(HTTPException) as exc:
        await search_emotions(query="test", db=mock_db)
    assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# POST /atlas/compute-all-paths
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_compute_all_paths_batch_success(mock_db):
    background_tasks = MagicMock(spec=BackgroundTasks)
    
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.create_computation_job = AsyncMock(return_value=uuid4())
        service_instance.compute_all_paths_batch = AsyncMock() 
        
        response = await compute_all_paths_batch(
            background_tasks=background_tasks,
            user_id="user1",
            db=mock_db
        )
        
        assert response["status"] == "pending"
        assert "job_id" in response
        background_tasks.add_task.assert_called_once()

@pytest.mark.asyncio
async def test_compute_all_paths_batch_exception(mock_db):
    background_tasks = MagicMock(spec=BackgroundTasks)
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.create_computation_job.side_effect = Exception("Service Error")
        
        with pytest.raises(HTTPException) as exc:
            await compute_all_paths_batch(background_tasks, db=mock_db)
        assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/computation-status/{job_id}
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_computation_status_success(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status = AsyncMock(return_value={"status": "running"})
        
        response = await get_computation_status(job_id, db=mock_db)
        assert response["status"] == "running"

@pytest.mark.asyncio
async def test_get_computation_status_not_found(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status = AsyncMock(return_value=None)
        
        with pytest.raises(HTTPException) as exc:
            await get_computation_status(job_id, db=mock_db)
        assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_get_computation_status_exception(mock_db):
    job_id = uuid4()
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_computation_job_status.side_effect = Exception("Service Error")
        
        with pytest.raises(HTTPException) as exc:
            await get_computation_status(job_id, db=mock_db)
        assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/paths/all
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_all_cached_paths_success(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_all_cached_paths = AsyncMock(return_value=[{"id": 1}])
        service_instance.get_cache_statistics = AsyncMock(return_value={"total": 1})
        
        response = await get_all_cached_paths(db=mock_db)
        assert response["results"] == 1
        assert response["paths"][0]["id"] == 1

@pytest.mark.asyncio
async def test_get_all_cached_paths_exception(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_all_cached_paths.side_effect = Exception("Service Error")
        
        with pytest.raises(HTTPException) as exc:
            await get_all_cached_paths(db=mock_db)
        assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/statistics
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_atlas_statistics_success(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_cache_statistics = AsyncMock(return_value={"stat": "val"})
        
        response = await get_atlas_statistics(db=mock_db)
        assert response["stat"] == "val"

@pytest.mark.asyncio
async def test_get_atlas_statistics_exception(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_cache_statistics.side_effect = Exception("Service Error")
        
        with pytest.raises(HTTPException) as exc:
            await get_atlas_statistics(db=mock_db)
        assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# DELETE /atlas/paths/cache
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_clear_path_cache_success(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.clear_cache = AsyncMock(return_value=5)
        
        response = await clear_path_cache(db=mock_db)
        assert response["deleted_count"] == 5

@pytest.mark.asyncio
async def test_clear_path_cache_exception(mock_db):
    with patch("app.api.routes.atlas.PathMatrixService") as MockService:
        service_instance = MockService.return_value
        service_instance.clear_cache.side_effect = Exception("Service Error")
        
        with pytest.raises(HTTPException) as exc:
            await clear_path_cache(db=mock_db)
        assert exc.value.status_code == 500

# -----------------------------------------------------------------------------
# GET /atlas/recommendations
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_smart_recommendations_success(mock_db):
    with patch("app.api.routes.atlas.RecommendationEngine") as MockEngine:
        engine_instance = MockEngine.return_value
        engine_instance.get_recommendations = AsyncMock(return_value={"recs": []})
        
        response = await get_smart_recommendations(
            context="exploration",
            emotion_id=None,
            selected_ids=None,
            limit=5,
            db=mock_db
        )
        assert response["recommendations"]["recs"] == []

@pytest.mark.asyncio
async def test_get_smart_recommendations_invalid_emotion_id(mock_db):
    # Patch RecommendationEngine to prevent side effects
    with patch("app.api.routes.atlas.RecommendationEngine") as MockEngine:
        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(
                context="exploration",
                emotion_id="invalid-uuid",
                db=mock_db
            )
        assert exc.value.status_code == 400
        assert "Invalid emotion_id UUID" in exc.value.detail

@pytest.mark.asyncio
async def test_get_smart_recommendations_invalid_selected_ids(mock_db):
    # Patch RecommendationEngine to prevent side effects
    with patch("app.api.routes.atlas.RecommendationEngine") as MockEngine:
        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(
                context="exploration",
                emotion_id=None,
                selected_ids="valid-uuid,invalid-uuid",
                db=mock_db
            )
        assert exc.value.status_code == 400
        assert "Invalid selected_ids format" in exc.value.detail

@pytest.mark.asyncio
async def test_get_smart_recommendations_exception(mock_db):
    with patch("app.api.routes.atlas.RecommendationEngine") as MockEngine:
        engine_instance = MockEngine.return_value
        engine_instance.get_recommendations.side_effect = Exception("Engine Error")
        
        with pytest.raises(HTTPException) as exc:
            await get_smart_recommendations(db=mock_db)
        assert exc.value.status_code == 500
