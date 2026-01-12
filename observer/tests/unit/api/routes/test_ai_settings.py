
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException
from app.api.routes.ai_settings import (
    get_model_assignments,
    assign_model,
    get_model_recommendations,
    get_performance_stats,
    list_ai_functions,
    AssignModelRequest
)

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.mark.asyncio
async def test_get_model_assignments(mock_db):
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_model_assignments = AsyncMock(return_value={"func": "model"})
        
        response = await get_model_assignments(mock_db)
        assert response["assignments"] == {"func": "model"}
        assert "default_model" in response

@pytest.mark.asyncio
async def test_assign_model(mock_db):
    request = AssignModelRequest(function="func", ai_model_name="model", assigned_by="user")
    
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = MockService.return_value
        service_instance.assign_model = AsyncMock(return_value={"status": "success"})
        
        response = await assign_model(request, mock_db)
        assert response["status"] == "success"
        
        # Test ValueError (bad function)
        service_instance.assign_model.side_effect = ValueError("Bad func")
        with pytest.raises(HTTPException) as exc:
            await assign_model(request, mock_db)
        assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_get_model_recommendations(mock_db):
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_recommendations = AsyncMock(return_value={"rec": "val"})
        
        response = await get_model_recommendations(mock_db)
        assert response["recommendations"]["rec"] == "val"
        
        # Error handling
        service_instance.get_recommendations.side_effect = Exception("error")
        with pytest.raises(HTTPException) as exc:
            await get_model_recommendations(mock_db)
        assert exc.value.status_code == 500

@pytest.mark.asyncio
async def test_get_performance_stats(mock_db):
    with patch("app.api.routes.ai_settings.AIModelService") as MockService:
        service_instance = MockService.return_value
        service_instance.get_performance_stats = AsyncMock(return_value={"stats": "val"})
        
        response = await get_performance_stats(mock_db)
        assert response["performance"]["stats"] == "val"

@pytest.mark.asyncio
async def test_list_ai_functions():
    response = await list_ai_functions()
    assert len(response["functions"]) == 4
    assert response["functions"][0]["name"] == "semantic_vac"
