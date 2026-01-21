
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY
from uuid import uuid4
from fastapi import HTTPException
from app.api.routes import admin
from app.models.user import User
from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import TransitionStrategy
from app.schemas.user import UserUpdate
from app.schemas.emotions import EmotionUpdate
from app.schemas.strategies import StrategyUpdate
from app.schemas.bootstrap import BootstrapDataUpdate

@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock())
    session.delete = MagicMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session

@pytest.fixture
def mock_admin():
    # User model uses role='admin', not is_superuser in init mostly
    user = User(id=uuid4(), email="admin@example.com", is_active=True, role="admin")
    return user

@pytest.fixture
def mock_user_obj():
    return User(id=uuid4(), email="user@example.com", is_active=True)

@pytest.mark.asyncio
async def test_update_user_password_hashing(mock_db, mock_admin, mock_user_obj):
    """Test that updating a user with a password triggers hashing."""
    user_id = mock_user_obj.id
    
    # Mock finding the user
    result = MagicMock()
    result.scalars.return_value.first.return_value = mock_user_obj
    mock_db.execute.return_value = result
    
    user_update = UserUpdate(password="new_secret_password")
    
    # Patch where it is DEFINED because it is imported locally inside the function
    with patch("app.core.security.get_password_hash") as mock_hash:
        mock_hash.return_value = "hashed_secret"
        
        await admin.update_user(user_id, user_update, mock_db, mock_admin)
        
        mock_hash.assert_called_with("new_secret_password")
        assert mock_user_obj.password_hash == "hashed_secret"
        mock_db.commit.assert_awaited()

@pytest.mark.asyncio
async def test_update_user_not_found(mock_db, mock_admin):
    """Test 404 when updating non-existent user."""
    user_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    user_update = UserUpdate(email="new@example.com")
    
    with pytest.raises(HTTPException) as exc:
        await admin.update_user(user_id, user_update, mock_db, mock_admin)
    
    assert exc.value.status_code == 404
    assert "User not found" in exc.value.detail

@pytest.mark.asyncio
async def test_import_atlas_data_service_failure(mock_db, mock_admin):
    """Test partial failure handling during atlas import when services fail."""
    import_data = {
        "emotions": [
            {
                "emotion_name": "TestJoy",
                "definition": "A new definition",
                "vac": [0.8, 0.8, 0.8]
            }
        ]
    }
    
    # Mock existing emotion to trigger update logic
    existing_emotion = EmotionDefinition(
        id=uuid4(), 
        emotion_name="TestJoy", 
        definition="Old def",
        vac_vector=[0.1, 0.1, 0.1]
    )
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = existing_emotion
    mock_db.execute.return_value = result
    
    # Patch app.services because local import in admin uses that source
    with patch("app.services.get_embedding_service") as mock_get_es, \
         patch("app.services.get_quaternion_builder") as mock_get_qb:
        
        es = AsyncMock()
        mock_get_es.return_value = es
        # Simulate embedding generation failure
        es.generate_embedding.side_effect = Exception("Embedding Service Down")
        
        qb = AsyncMock()
        mock_get_qb.return_value = qb
        
        response = await admin.import_atlas_data(import_data, mock_db, mock_admin)
        
        # Verify it didn't crash but reported error
        assert response["status"] == "success"
        assert len(response["errors"]) == 1
        assert "Failed to update TestJoy" in response["errors"][0]
        assert "Embedding Service Down" in response["errors"][0]

@pytest.mark.asyncio
async def test_import_strategies_invalid_format(mock_db, mock_admin):
    """Test strategy import with missing root key."""
    data = {"wrong_key": []}
    
    with pytest.raises(HTTPException) as exc:
        await admin.import_strategies(data, mock_db, mock_admin)
    
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_update_atlas_emotion_not_found(mock_db, mock_admin):
    """Test 404 when updating non-existent atlas emotion."""
    emotion_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await admin.update_atlas_emotion(emotion_id, EmotionUpdate(category="Joy"), mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_update_atlas_emotion_service_failure(mock_db, mock_admin):
    """Test 400 when calculation service fails during update."""
    emotion_id = uuid4()
    emotion = EmotionDefinition(id=emotion_id, emotion_name="Joy")
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = emotion
    mock_db.execute.return_value = result
    
    # Update that triggers VAC recalc
    update = EmotionUpdate(vac_vector=[1.0, 0.5, 0.5])
    
    # Patch app.services because local import
    with patch("app.services.get_quaternion_builder") as mock_get_qb:
        qb = AsyncMock()
        mock_get_qb.return_value = qb
        qb.from_vac.side_effect = Exception("Math Error")
        
        with pytest.raises(HTTPException) as exc:
            await admin.update_atlas_emotion(emotion_id, update, mock_db, mock_admin)
            
        assert exc.value.status_code == 400
        assert "Failed to calculate quaternion" in exc.value.detail

@pytest.mark.asyncio
async def test_delete_bootstrap_data_not_found(mock_db, mock_admin):
    """Test 404 when deleting non-existent bootstrap data."""
    item_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await admin.delete_bootstrap_data(item_id, mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_update_prompt_not_found(mock_db, mock_admin):
    """Test 404 when prompt service returns None for update."""
    prompt_id = uuid4()
    
    mock_ps = AsyncMock()
    mock_ps.update_prompt.return_value = None
    
    with pytest.raises(HTTPException) as exc:
        await admin.update_prompt(prompt_id, MagicMock(), mock_ps, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_update_strategy_not_found(mock_db, mock_admin):
    """Test 404 when updating non-existent strategy."""
    strategy_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await admin.update_strategy(strategy_id, StrategyUpdate(description="New"), mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_get_user_not_found(mock_db, mock_admin):
    """Test 404 when getting non-existent user."""
    user_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await admin.get_user(user_id, mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_get_session_details_not_found(mock_db, mock_admin):
    """Test 404 when getting non-existent session."""
    session_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    with pytest.raises(HTTPException) as exc:
        await admin.get_session_details(session_id, mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_update_bootstrap_data_not_found(mock_db, mock_admin):
    """Test 404 when updating non-existent bootstrap data."""
    item_id = uuid4()
    
    result = MagicMock()
    result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = result
    
    # Use Dict for content to satisfy Pydantic
    update = BootstrapDataUpdate(content={"some": "data"})
    
    with pytest.raises(HTTPException) as exc:
        await admin.update_bootstrap_data(item_id, update, mock_db, mock_admin)
        
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_import_atlas_invalid_format(mock_db, mock_admin):
    """Test 400 when atlas import format is invalid."""
    data = {"wrong_key": []}
    
    with pytest.raises(HTTPException) as exc:
        await admin.import_atlas_data(data, mock_db, mock_admin)
        
    assert exc.value.status_code == 400
    assert "Invalid format" in exc.value.detail

@pytest.mark.asyncio
async def test_prompt_routes_delegation(mock_db, mock_admin):
    """Test that prompt routes correctly delegate to PromptService."""
    mock_ps = AsyncMock()
    
    # List
    await admin.list_prompts(None, mock_ps, mock_admin)
    mock_ps.list_prompts.assert_awaited()
    
    # Create
    from app.schemas.prompts import PromptTemplateCreate
    create_in = PromptTemplateCreate(
        function_name="test", 
        version="1.0", 
        template_content="test", 
        input_variables=[], 
        description="desc"
    )
    await admin.create_prompt(create_in, mock_ps, mock_admin)
    mock_ps.create_prompt.assert_called() 
    
    # Update success
    mock_ps.update_prompt.return_value = MagicMock()
    from app.schemas.prompts import PromptTemplateUpdate
    await admin.update_prompt(uuid4(), PromptTemplateUpdate(description="new"), mock_ps, mock_admin)
    mock_ps.update_prompt.assert_awaited()
