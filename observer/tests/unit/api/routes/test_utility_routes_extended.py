
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.api.routes import health, prompts, users
from app.schemas.prompts import PromptTemplateResponse
from app.models.user import User

@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    return session

# --- Health API Tests ---

@pytest.mark.asyncio
async def test_health_check_service_unavailable(mock_db):
    """Test 503 error when database check fails."""
    mock_db.execute.side_effect = Exception("Connection Failed")
    
    with pytest.raises(HTTPException) as exc:
        await health.health_check(db=mock_db)
        
    assert exc.value.status_code == 503
    assert "Service unavailable" in exc.value.detail

@pytest.mark.asyncio
async def test_health_check_degraded(mock_db):
    """Test 'degraded' status when Atlas emotion count is between 50 and 86."""
    # 1. DB ping success
    # 2. pgvector success
    # 3. Emotion count: 60 (Degraded range)
    mock_db.execute.side_effect = [
        MagicMock(), # SELECT 1
        MagicMock(scalar=lambda: "0.6.0"), # pgvector
        MagicMock(scalar=lambda: 60) # count
    ]
    
    response = await health.health_check(db=mock_db)
    
    assert response.status == "degraded"
    assert response.atlas_emotions_count == 60

@pytest.mark.asyncio
async def test_health_check_initializing(mock_db):
    """Test 'initializing' status when Atlas emotion count is low."""
    # 1. DB ping success
    # 2. pgvector success
    # 3. Emotion count: 10 (Initializing range)
    mock_db.execute.side_effect = [
        MagicMock(), # SELECT 1
        MagicMock(scalar=lambda: "0.6.0"), # pgvector
        MagicMock(scalar=lambda: 10) # count
    ]
    
    response = await health.health_check(db=mock_db)
    
    assert response.status == "initializing"

@pytest.mark.asyncio
async def test_health_check_missing_extension(mock_db):
    """Test 'degraded' status when pgvector is missing but Atlas is full."""
    # 1. DB ping success
    # 2. pgvector missing (returns None)
    # 3. Emotion count: 87 (Full)
    mock_db.execute.side_effect = [
        MagicMock(), # SELECT 1
        MagicMock(scalar=lambda: None), # pgvector
        MagicMock(scalar=lambda: 87) # count
    ]
    
    response = await health.health_check(db=mock_db)
    
    assert response.pgvector_version == "not installed"
    # Logic: if count=87 AND installed -> healthy. Else if count >= 50 -> degraded.
    # So 87 >= 50 -> degraded.
    assert response.status == "degraded" 

# --- Prompts API Tests ---

@pytest.mark.asyncio
async def test_get_active_prompts_missing_function_name():
    """Test 400 error when function_name is not provided."""
    service = AsyncMock()
    
    with pytest.raises(HTTPException) as exc:
        await prompts.get_active_prompts(function_name=None, prompt_service=service)
        
    assert exc.value.status_code == 400
    assert "function_name required" in exc.value.detail

@pytest.mark.asyncio
async def test_get_active_prompts_not_found():
    """Test response when prompt is not found."""
    service = AsyncMock()
    service.get_active_prompt.return_value = None
    
    response = await prompts.get_active_prompts(function_name="unknown", prompt_service=service)
    
    assert response == {"found": False}

@pytest.mark.asyncio
async def test_get_active_prompts_found():
    """Test success response when prompt is found."""
    service = AsyncMock()
    mock_prompt = MagicMock()
    # Pydantic model validation mock
    mock_prompt.model_dump.return_value = {"id": "123", "content": "foo"}
    
    # We need to mock the PromptTemplateResponse.model_validate call or ensure the object is valid
    # Easier to patch the response model
    with patch("app.api.routes.prompts.PromptTemplateResponse") as MockModel:
        service.get_active_prompt.return_value = mock_prompt
        MockModel.model_validate.return_value = "serialized_prompt"
        
        response = await prompts.get_active_prompts(function_name="chat", prompt_service=service)
        
        assert response["found"] is True
        assert response["prompt"] == "serialized_prompt"

# --- Users API Tests ---

@pytest.mark.asyncio
async def test_read_users_me():
    """Test getting current user profile."""
    current_user = User(email="test@example.com", is_active=True)
    response = await users.read_users_me(current_user=current_user)
    assert response == current_user

@pytest.mark.asyncio
async def test_read_own_sessions(mock_db):
    """Test retrieval of own chat sessions."""
    # Mock current user
    current_user = User(id="user-uuid", email="test@example.com")
    
    # Mock ChatService
    with patch("app.api.routes.users.ChatService") as MockService:
        service_instance = AsyncMock()
        MockService.return_value = service_instance
        service_instance.get_user_sessions.return_value = ["session1", "session2"]
        
        response = await users.read_own_sessions(
            current_user=current_user,
            db=mock_db,
            limit=10,
            offset=5
        )
        
        # Verify ChatService initialized with db
        MockService.assert_called_with(mock_db)
        
        # Verify get_user_sessions called with correct args
        service_instance.get_user_sessions.assert_called_with(
            user_id="user-uuid",
            limit=10,
            offset=5
        )
        
        assert response == ["session1", "session2"]
