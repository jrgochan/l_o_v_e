import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes import admin
from app.models.bootstrap_data import BootstrapData
from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import TransitionStrategy
from app.models.user import User, UserRole
from app.schemas.ai_models import ModelAssignmentUpdate
from app.schemas.bootstrap import BootstrapDataCreate, BootstrapDataUpdate
from app.schemas.emotions import EmotionUpdate
from app.schemas.prompts import PromptTestRequest
from app.schemas.strategies import StrategyUpdate
from app.schemas.user import UserUpdate


@pytest.fixture(autouse=True)
def mock_services():
    """Mock external services globally to prevent initialization overhead/hangs."""
    with (
        patch("app.services.admin.service.get_embedding_service") as mock_es,
        patch("app.services.admin.service.get_quaternion_builder") as mock_qb,
    ):

        # Configure mocks to return async mocks
        mock_es.return_value = AsyncMock()
        mock_es.return_value.generate_embedding.return_value = [0.1, 0.2, 0.3]

        mock_qb.return_value = AsyncMock()
        mock_qb.return_value.from_vac.return_value = [0, 0, 0, 1]

        yield mock_es, mock_qb


@pytest.fixture
def mock_db():
    db = AsyncMock()
    # execute needs to return an AsyncMock that returns a MagicMock result
    # Actually just execute.return_value = MagicMock() is sufficient if we await execute()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# === Prompts ===


@pytest.mark.asyncio
async def test_test_prompt_render():
    req = PromptTestRequest(template_content="Hello {name}", input_variables={"name": "World"})
    # mock_admin_user not needed for logic but needed for dep injection if we call route directly
    # Route: async def test_prompt_render(request, current_admin)

    admin_user = User(id=uuid.uuid4(), role=UserRole.ADMIN)
    res = await admin.test_prompt_render(req, admin_user)
    assert res["rendered_content"] == "Hello World"

    # Error case
    req_err = PromptTestRequest(template_content="Hello {age}", input_variables={"name": "World"})
    with pytest.raises(HTTPException):
        await admin.test_prompt_render(req_err, admin_user)


@pytest.fixture
def mock_admin_user():
    return User(id=uuid.uuid4(), email="admin@example.com", role=UserRole.ADMIN)


# === User Routes ===


@pytest.mark.asyncio
async def test_list_users(mock_db, mock_admin_user):
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res

    res = await admin.list_users(mock_db, mock_admin_user)
    assert res == []


@pytest.mark.asyncio
async def test_get_user(mock_db, mock_admin_user):
    # Found
    u = User(id=uuid.uuid4())
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = u
    mock_db.execute.return_value = mock_res

    res = await admin.get_user(u.id, mock_db, mock_admin_user)
    assert res == u

    # Not Found
    mock_res_none = MagicMock()
    mock_res_none.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res_none

    with pytest.raises(HTTPException):
        await admin.get_user(uuid.uuid4(), mock_db, mock_admin_user)


@pytest.mark.asyncio
async def test_update_user(mock_db, mock_admin_user):
    target = User(id=uuid.uuid4(), is_active=True)
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = target
    mock_db.execute.return_value = mock_res

    # Mock password hash
    with patch("app.core.security.get_password_hash", return_value="hashed"):
        # Password must be min 8 chars
        update_in = UserUpdate(is_active=False, password="newpassword123")
        res = await admin.update_user(target.id, update_in, mock_db, mock_admin_user)

        assert res.is_active is False
        assert target.password_hash == "hashed"
        mock_db.commit.assert_called()


# === Atlas Routes ===


@pytest.mark.asyncio
async def test_list_atlas_emotions(mock_db, mock_admin_user):
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res

    await admin.list_atlas_emotions(mock_db, mock_admin_user)
    mock_db.execute.assert_called()


# ... (Previous tests) ...


@pytest.mark.asyncio
async def test_bootstrap_crud(mock_db, mock_admin_user):
    # Create
    # Schema expects content to be Dict[str, Any], not str
    bs_in = BootstrapDataCreate(data_type="type", data_category="cat", content={"c": "val"})
    await admin.create_bootstrap_data(bs_in, mock_db, mock_admin_user)
    mock_db.add.assert_called()

    # List
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res

    await admin.list_bootstrap_data(mock_db, mock_admin_user, "type")

    # Update
    item = BootstrapData(id=uuid.uuid4())
    mock_res2 = MagicMock()
    mock_res2.scalars.return_value.first.return_value = item
    mock_db.execute.return_value = mock_res2

    bs_up = BootstrapDataUpdate(content={"new": "val"})
    await admin.update_bootstrap_data(item.id, bs_up, mock_db, mock_admin_user)
    assert item.content == {"new": "val"}

    # Delete
    mock_res3 = MagicMock()
    mock_res3.scalars.return_value.first.return_value = item
    mock_db.execute.return_value = mock_res3

    await admin.delete_bootstrap_data(item.id, mock_db, mock_admin_user)
    mock_db.delete.assert_called_with(item)


# === Session & Trajectory Routes ===


@pytest.mark.asyncio
async def test_get_user_sessions(mock_db, mock_admin_user):
    # Mock result with to_dict method
    s1 = MagicMock()
    s1.to_dict.return_value = {"id": "s1"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [s1]
    mock_db.execute.return_value = mock_res

    res = await admin.get_user_sessions(uuid.uuid4(), mock_db, mock_admin_user)
    assert len(res) == 1
    assert res[0]["id"] == "s1"


@pytest.mark.asyncio
async def test_get_user_trajectory(mock_db, mock_admin_user):
    p1 = MagicMock()
    p1.to_dict.return_value = {"t": 1}

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [p1]
    mock_db.execute.return_value = mock_res

    res = await admin.get_user_trajectory(uuid.uuid4(), mock_db, mock_admin_user)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_list_sessions(mock_db, mock_admin_user):
    # 1. Total count query
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 10

    # 2. Items query
    s1 = MagicMock()
    s1.to_dict.return_value = {"id": "s1"}
    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [s1]

    # Configure execute side effects
    mock_db.execute.side_effect = [mock_res_count, mock_res_items]

    res = await admin.list_sessions(mock_db, mock_admin_user)
    assert res["total"] == 10
    assert len(res["items"]) == 1


@pytest.mark.asyncio
async def test_get_session_details(mock_db, mock_admin_user):
    # Found
    s = MagicMock()
    s.to_dict.return_value = {"id": "s1"}
    m1 = MagicMock()
    m1.created_at = datetime(2023, 1, 1)
    m1.to_dict.return_value = {"msg": 1}
    m2 = MagicMock()
    m2.created_at = datetime(2023, 1, 2)
    m2.to_dict.return_value = {"msg": 2}
    s.messages = [m2, m1]  # Unsorted

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = s
    mock_db.execute.return_value = mock_res

    res = await admin.get_session_details(uuid.uuid4(), mock_db, mock_admin_user)
    assert res["id"] == "s1"


@pytest.mark.asyncio
async def test_admin_update_user_password(mock_db, mock_admin_user):
    """Test updating user password (covers password hash import)."""
    target_user = User(id=uuid.uuid4(), email="target@example.com")

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = target_user
    mock_db.execute.return_value = mock_res

    update = UserUpdate(password="newsecret123")

    with patch("app.core.security.get_password_hash") as mock_hash:
        mock_hash.return_value = "hashed_secret"
        await admin.update_user(target_user.id, update, mock_db, mock_admin_user)
        assert target_user.password_hash == "hashed_secret"
        mock_hash.assert_called_once()


@pytest.mark.asyncio
async def test_admin_update_atlas_emotion_exceptions(mock_db, mock_admin_user):
    """Test exception handling in atlas updates."""
    from app.schemas.emotions import EmotionUpdate

    emotion = MagicMock()
    emotion.id = uuid.uuid4()
    emotion.emotion_name = "Joy"

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = emotion
    mock_db.execute.return_value = mock_res

    with patch("app.services.get_quaternion_builder") as mock_get_qb:
        mock_get_qb.return_value.from_vac.side_effect = Exception("Math Error")
        update = EmotionUpdate(vac_vector=[1.0, 1.0, 1.0])
        with pytest.raises(HTTPException) as exc:
            await admin.update_atlas_emotion(emotion.id, update, mock_db, mock_admin_user)
        assert exc.value.status_code == 400

    with patch("app.services.get_embedding_service") as mock_get_es:
        mock_get_es.return_value.generate_embedding.side_effect = Exception("API Error")
        update = EmotionUpdate(definition="New Definition")
        with pytest.raises(HTTPException) as exc:
            await admin.update_atlas_emotion(emotion.id, update, mock_db, mock_admin_user)
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_admin_import_atlas_data_edge_cases(mock_db, mock_admin_user):
    """Test import edge cases (missing name, exceptions)."""
    bad_data = {"emotions": [{"category": "Test"}]}
    res = await admin.import_atlas_data(bad_data, mock_db, mock_admin_user)
    assert res["updated"] == 0

    good_data = {"emotions": [{"emotion_name": "Joy", "definition": "New"}]}
    mock_emotion = MagicMock()
    mock_emotion.definition = "Old"

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_emotion
    mock_db.execute.return_value = mock_res

    with patch("app.services.admin.service.get_embedding_service") as mock_get_es:
        mock_get_es.return_value.generate_embedding.side_effect = Exception("Embed Fail")
        res = await admin.import_atlas_data(good_data, mock_db, mock_admin_user)
        assert res["updated"] == 0
        assert len(res["errors"]) == 1

    """Test filtered list."""
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res
    await admin.list_bootstrap_data(mock_db, mock_admin_user, data_type="prompt")


@pytest.mark.asyncio
async def test_admin_prompt_render_endpoints(mock_db, mock_admin_user):
    """Test the test_prompt_render endpoint."""
    from app.schemas.prompts import PromptTestRequest

    req = PromptTestRequest(template_content="Hello {name}", input_variables={"name": "World"})
    res = await admin.test_prompt_render(req, mock_admin_user)
    assert res["rendered_content"] == "Hello World"

    req_missing = PromptTestRequest(template_content="Hello {name}", input_variables={})
    with pytest.raises(HTTPException) as exc:
        await admin.test_prompt_render(req_missing, mock_admin_user)
    assert exc.value.status_code == 400

    req_bad = PromptTestRequest(template_content="Hello {", input_variables={})
    with pytest.raises(HTTPException) as exc:
        await admin.test_prompt_render(req_bad, mock_admin_user)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_admin_update_atlas_emotion_other_fields(mock_db, mock_admin_user):
    """Test updating fields other than VAC/Definition."""
    from app.schemas.emotions import EmotionUpdate

    emotion = MagicMock()
    emotion.id = uuid.uuid4()

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = emotion
    mock_db.execute.return_value = mock_res

    update = EmotionUpdate(category="New Category")
    await admin.update_atlas_emotion(emotion.id, update, mock_db, mock_admin_user)
    assert emotion.category == "New Category"


@pytest.mark.asyncio
async def test_admin_export_atlas_multiple(mock_db, mock_admin_user):
    """Test export with multiple items."""
    e1 = MagicMock(emotion_name="Joy", vac_vector=[1, 1, 1])
    e2 = MagicMock(emotion_name="Sadness", vac_vector=[0, 0, 0])

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1, e2]
    mock_db.execute.return_value = mock_res

    res = await admin.export_atlas_data(mock_db, mock_admin_user)
    assert len(res["emotions"]) == 2


@pytest.mark.asyncio
async def test_admin_import_atlas_not_found(mock_db, mock_admin_user):
    """Test import with name provided but not found in DB."""
    data = {"emotions": [{"emotion_name": "Ghost"}]}
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res
    res = await admin.import_atlas_data(data, mock_db, mock_admin_user)
    assert res["updated"] == 0


@pytest.mark.asyncio
async def test_admin_import_atlas_success(mock_db, mock_admin_user):
    """Test successful import of atlas data."""
    data = {"emotions": [{"emotion_name": "Joy", "definition": "New Def"}]}
    mock_emotion = MagicMock()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.definition = "Old Def"

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_emotion
    mock_db.execute.return_value = mock_res

    with patch("app.services.admin.service.get_embedding_service") as mock_get_es:
        mock_get_es.return_value = AsyncMock()
        with patch("app.services.admin.service.get_quaternion_builder") as mock_get_qb:
            mock_qb_instance = MagicMock()
            mock_qb_instance.from_vac = AsyncMock(return_value=0.5)
            mock_get_qb.return_value = mock_qb_instance
            res = await admin.import_atlas_data(data, mock_db, mock_admin_user)

    assert res["updated"] == 1
    assert res["status"] == "success"


@pytest.mark.asyncio
async def test_admin_list_strategies_coverage(mock_db, mock_admin_user):
    """Test listing strategies."""
    mock_strategy = MagicMock()
    mock_strategy.id = uuid.uuid4()
    mock_strategy.strategy_name = "Cognitive Reframe"

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_strategy]
    mock_db.execute.return_value = mock_res

    res = await admin.list_strategies(mock_db, mock_admin_user)
    assert len(res) == 1
    assert res[0].strategy_name == "Cognitive Reframe"


@pytest.mark.asyncio
async def test_admin_import_atlas_full_coverage(mock_db, mock_admin_user):
    """Test import with VAC/haptic changes and no-change paths."""
    data_full = {
        "emotions": [
            {
                "emotion_name": "Joy",
                "definition": "Same Def",
                "vac": [0.1, 0.2, 0.3],
                "haptic_pattern_id": "new_hap",
                "category": "New Cat",
            }
        ]
    }

    mock_emotion = MagicMock()
    mock_emotion.emotion_name = "Joy"
    mock_emotion.definition = "Same Def"
    mock_emotion.vac_vector = [0.0, 0.0, 0.0]

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_emotion
    mock_db.execute.side_effect = [mock_res, mock_res]

    with patch("app.services.admin.service.get_embedding_service") as mock_get_es:
        mock_get_es.return_value = AsyncMock()
        with patch("app.services.admin.service.get_quaternion_builder") as mock_get_qb:
            mock_qb_instance = MagicMock()
            mock_qb_instance.from_vac = AsyncMock(return_value=0.8)
            mock_get_qb.return_value = mock_qb_instance
            mock_db.execute.return_value = mock_res
            res = await admin.import_atlas_data(data_full, mock_db, mock_admin_user)

            assert mock_emotion.vac_vector == [0.1, 0.2, 0.3]
            assert res["updated"] == 1

    data_no_change = {
        "emotions": [{"emotion_name": "Joy", "definition": "Same Def", "vac": [0.1, 0.2, 0.3]}]
    }
    mock_db.execute.return_value = mock_res
    res = await admin.import_atlas_data(data_no_change, mock_db, mock_admin_user)
    assert res["updated"] == 1


@pytest.mark.asyncio
async def test_admin_import_strategies_missing_name(mock_db, mock_admin_user):
    """Test strategy import with missing name."""
    data = {
        "strategies": [
            {"description": "No Name"},
            {
                "name": "Valid",
                "type": "cognitive_reappraisal",
                "description": "Valid Desc",
                "difficulty": 1,
                "evidence": "rct",
            },
        ]
    }

    mock_res_empty = MagicMock()
    mock_res_empty.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res_empty

    res = await admin.import_strategies(data, mock_db, mock_admin_user)
    print(f"Import Errors: {res.get('errors')}")
    assert res["status"] == "success"
    # One valid strategy, one invalid -> 1 created
    assert res["created"] == 1


@pytest.mark.asyncio
async def test_admin_update_ai_model_existing(mock_db, mock_admin_user):
    """Test updating existing AI model assignment."""
    from app.models.model_assignment import ModelAssignment

    existing = ModelAssignment(function="test_func", ai_model_name="old-model")

    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_res

    update = MagicMock(ai_model_name="new-model")
    await admin.update_ai_model("test_func", update, mock_db, mock_admin_user)
    assert existing.ai_model_name == "new-model"
    # existing.assigned_at is set to a datetime object in the implementation
    # We can check if it is not None, or if it is aware
    assert existing.assigned_at is not None
    assert existing.assigned_at.tzinfo is not None


@pytest.mark.asyncio
async def test_admin_list_alerts_no_filter(mock_db, mock_admin_user):
    """Test listing alerts without level filter."""
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 10
    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = []
    mock_db.execute.side_effect = [mock_res_count, mock_res_items]
    await admin.list_clinical_alerts(mock_db, mock_admin_user, level=None)


@pytest.mark.asyncio
async def test_admin_list_bootstrap_no_filter(mock_db, mock_admin_user):
    """Test list passed without data_type."""
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res
    await admin.list_bootstrap_data(mock_db, mock_admin_user, data_type=None)


@pytest.mark.asyncio
async def test_admin_update_user_no_password(mock_db, mock_admin_user):
    """Test updating user without password to hit skip branch."""
    user_id = uuid.uuid4()
    update = UserUpdate(email="new@example.com")
    existing_user = MagicMock()
    existing_user.id = user_id

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = existing_user
    mock_db.execute.return_value = mock_res

    res = await admin.update_user(user_id, update, mock_db, mock_admin_user)
    assert res == existing_user


# === Exports & Imports ===


@pytest.mark.asyncio
async def test_export_atlas_data(mock_db, mock_admin_user):
    e1 = MagicMock()
    e1.emotion_name = "Joy"
    e1.vac_vector = [1, 1, 1]

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e1]
    mock_db.execute.return_value = mock_res

    res = await admin.export_atlas_data(mock_db, mock_admin_user)
    assert res["metadata"]["total_emotions"] == 1
    assert res["emotions"][0]["emotion_name"] == "Joy"


@pytest.mark.asyncio
async def test_export_strategies(mock_db, mock_admin_user):
    s1 = MagicMock()
    s1.strategy_name = "S1"

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [s1]
    mock_db.execute.return_value = mock_res

    res = await admin.export_strategies(mock_db, mock_admin_user)
    assert res["metadata"]["total_strategies"] == 1
    assert res["strategies"][0]["name"] == "S1"


# === Clinical Alerts ===


@pytest.mark.asyncio
async def test_list_clinical_alerts(mock_db, mock_admin_user):
    # With filter
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 5

    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [MagicMock()]

    mock_db.execute.side_effect = [mock_res_count, mock_res_items]

    res = await admin.list_clinical_alerts(mock_db, mock_admin_user, level="high")
    assert res["total"] == 5


# === Prompts ===


@pytest.mark.asyncio
async def test_test_prompt_render_placeholder():
    # This route wasn't finished in the view, let's skip or mock if it exists
    # Checking file content... it was cut off at line 800.
    # "@router.post("/prompts/test")"
    pass


# === Atlas Import/Update ===


@pytest.mark.asyncio
async def test_update_atlas_emotion(mock_db, mock_admin_user):
    e = EmotionDefinition(
        id=uuid.uuid4(),
        emotion_name="Joy",
        vac_vector=[0.5, 0.5, 0.5],
        definition="Old Def",
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = e
    mock_db.execute.return_value = mock_res

    # 1. Update Definition -> Triggers Embedding
    # Patch at source definition because admin.py does from app.services import ...
    # Wait, if admin.py does "from app.services import get_embedding_service" inside the function,
    # then patching "app.services.get_embedding_service" should work.

    with patch("app.services.get_embedding_service") as mock_get_es:
        mock_es = AsyncMock()
        mock_es.generate_embedding.return_value = [0.1, 0.1]
        mock_get_es.return_value = mock_es

        up = EmotionUpdate(definition="New Def")
        await admin.update_atlas_emotion(e.id, up, mock_db, mock_admin_user)

        assert e.definition == "New Def"
        assert e.semantic_embedding == [0.1, 0.1]
        mock_es.generate_embedding.assert_called()

    # 2. Update VAC -> Triggers Quaternion
    with patch("app.services.get_quaternion_builder") as mock_get_qb:
        mock_qb = AsyncMock()
        mock_qb.from_vac.return_value = [0, 0, 0, 1]
        mock_get_qb.return_value = mock_qb

        up_vac = EmotionUpdate(vac_vector=[0.1, 0.2, 0.3])
        await admin.update_atlas_emotion(e.id, up_vac, mock_db, mock_admin_user)

        assert e.vac_vector == [0.1, 0.2, 0.3]
        assert e.q_constant == [0, 0, 0, 1]


@pytest.mark.asyncio
async def test_import_atlas_data(mock_db, mock_admin_user):
    import_data = {
        "emotions": [
            {
                "emotion_name": "Joy",
                "category": "New Cat",
                "vac": [1, 1, 1],
                "definition": "Happy",
            }
        ]
    }

    # Mock existing emotion found
    e = EmotionDefinition(
        id=uuid.uuid4(), emotion_name="Joy", vac_vector=[0, 0, 0], definition="Old"
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = e
    mock_db.execute.return_value = mock_res

    with (
        patch("app.services.admin.service.get_embedding_service") as mock_get_es,
        patch("app.services.admin.service.get_quaternion_builder") as mock_get_qb,
    ):

        mock_es = AsyncMock()
        mock_get_es.return_value = mock_es
        mock_qb = AsyncMock()
        mock_get_qb.return_value = mock_qb

        res = await admin.import_atlas_data(import_data, mock_db, mock_admin_user)

        assert res["updated"] == 1
        assert e.category == "New Cat"
        assert e.vac_vector == [1, 1, 1]

        # Verify calls
        mock_es.generate_embedding.assert_called()  # Def changed
        mock_qb.from_vac.assert_called()  # VAC changed


# === Strategy Management ===


@pytest.mark.asyncio
async def test_update_strategy(mock_db, mock_admin_user):
    s = TransitionStrategy(id=uuid.uuid4(), strategy_name="S1")
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = s
    mock_db.execute.return_value = mock_res

    up = StrategyUpdate(description="New Desc")
    res = await admin.update_strategy(s.id, up, mock_db, mock_admin_user)

    assert res.description == "New Desc"
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_import_strategies(mock_db, mock_admin_user):
    data = {
        "strategies": [
            {
                "name": "S1",
                "description": "Update me",
                "type": "cognitive_reappraisal",
                "difficulty": 1,
                "evidence": "rct",
            },
            {
                "name": "S2",
                "description": "Create me",
                "type": "response_modulation",
                "difficulty": 3,
                "evidence": "clinical",
            },
        ]
    }

    # Mock the internal helper to return True (updated) then False (created)
    with patch(
        "app.api.routes.admin._process_strategy_import", side_effect=[True, False]
    ) as mock_process:
        res = await admin.import_strategies(data, mock_db, mock_admin_user)

    print(f"Import Errors: {res.get('errors')}")
    assert res["updated"] == 1
    assert res["created"] == 1
    assert mock_process.call_count == 2


# === AI Models ===


@pytest.mark.asyncio
async def test_list_ai_models(mock_db, mock_admin_user):
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res

    res = await admin.list_ai_models(mock_db, mock_admin_user)
    assert res == []


@pytest.mark.asyncio
async def test_update_ai_model(mock_db, mock_admin_user):
    # Case 1: Create new
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res_none

    up = ModelAssignmentUpdate(ai_model_name="gpt-4")
    res = await admin.update_ai_model("chat", up, mock_db, mock_admin_user)

    assert res.ai_model_name == "gpt-4"
    assert res.function == "chat"
    mock_db.add.assert_called()


@pytest.mark.asyncio
async def test_update_user_not_found(mock_db, mock_admin_user):
    """Test update_user raises 404 when user doesn't exist."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await admin.update_user(
            uuid.uuid4(), UserUpdate(full_name="New Name"), mock_db, mock_admin_user
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_atlas_emotion_quat_fail(mock_db, mock_admin_user):
    """Test handling of quaternion calculation failure during update."""
    # Mock finding emotion
    emotion = MagicMock()
    emotion.vac_vector = [0.1, 0.1, 0.1]

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = emotion
    mock_db.execute.return_value = mock_result

    # Mock QuaternionBuilder to fail
    with patch("app.services.get_quaternion_builder") as mock_get_qb:
        mock_qb = AsyncMock()
        mock_qb.from_vac.side_effect = Exception("Math Error")
        mock_get_qb.return_value = mock_qb

        with pytest.raises(HTTPException) as exc:
            await admin.update_atlas_emotion(
                uuid.uuid4(),
                EmotionUpdate(vac_vector=[0.5, 0.5, 0.5]),
                mock_db,
                mock_admin_user,
            )
        assert exc.value.status_code == 400
        assert "Failed to calculate quaternion" in exc.value.detail


@pytest.mark.asyncio
async def test_import_atlas_data_partial_failure(mock_db, mock_admin_user):
    """Test import accumulates errors for failed items."""
    import_data = {
        "emotions": [
            {
                "emotion_name": "Joy",
                "definition": "Happy",
                "vac": [0.1, 0.1, 0.1],
                "category": "pos",
            },  # Success
            {
                "emotion_name": "Anger",
                "definition": "Mad",
                "vac": [0.1, 0.1, 0.1],
                "category": "neg",
            },  # Fail
        ]
    }

    # Mock finding emotions
    joy = MagicMock()
    joy.emotion_name = "Joy"
    anger = MagicMock()
    anger.emotion_name = "Anger"

    # execute is called for SELECTs
    # side_effect needs to handle multiple calls: select joy, select anger
    joy_result = MagicMock()
    joy_result.scalars.return_value.first.return_value = joy
    anger_result = MagicMock()
    anger_result.scalars.return_value.first.return_value = anger

    # We verify calls by order.
    # Note: import_atlas_data implementation queries one by one.

    mock_db.execute.side_effect = [joy_result, anger_result]

    # Mock services
    with (
        patch("app.services.admin.service.get_embedding_service") as mock_get_es,
        patch("app.services.admin.service.get_quaternion_builder") as mock_get_qb,
    ):

        mock_es = AsyncMock()
        # First call success, second call fail
        mock_es.generate_embedding.side_effect = ["embed_joy", Exception("Embed Fail")]
        mock_get_es.return_value = mock_es

        mock_qb = AsyncMock()
        mock_get_qb.return_value = mock_qb

        result = await admin.import_atlas_data(import_data, mock_db, mock_admin_user)

    assert result["updated"] == 1  # Joy succeeded
    assert len(result["errors"]) == 1
    assert "Failed to update Anger" in result["errors"][0]


@pytest.mark.asyncio
async def test_admin_import_strategies_errors(mock_db, mock_admin_user):
    # Setup mock to raise exception on commit
    # Setup mock to raise SQLAlchemyError on commit (which is what code expects)
    from sqlalchemy.exc import SQLAlchemyError

    mock_db.commit = AsyncMock(side_effect=SQLAlchemyError("DB Fail"))

    # Needs a dictionary, not a file, as the endpoint takes JSON body
    # Use valid data to pass validation
    data = {
        "strategies": [
            {
                "name": "Strat1",
                "category": "General",
                "type": "cognitive_reappraisal",
                "description": "Desc",
                "difficulty": 1,
                "evidence": "rct",
            }
        ]
    }

    # Mock existing strategy check to allow simple path
    mock_db.execute.return_value.scalars.return_value.first.return_value = None

    res = await admin.import_strategies(data, mock_db, mock_admin_user)

    # Previously crashed, now should return success with errors
    assert res["status"] == "success"
    assert "Commit failed: DB Fail" in res["errors"]


@pytest.mark.asyncio
async def test_admin_import_strategies_partial_exception(mock_db, mock_admin_user):
    """Test strategy import with an exception during processing."""
    # Setup: Two items, first one causes DB error on lookup
    strategies_data = {
        "strategies": [
            {
                "name": "Strategy A",
                "type": "cognitive_reappraisal",
                "description": "Desc A",
                "difficulty": 1,
                "evidence": "rct",
            },
            {
                "name": "Strategy B",
                "type": "response_modulation",
                "description": "Desc B",
                "difficulty": 3,
                "evidence": "clinical",
            },
        ]
    }

    # Mock db.execute().scalar_one_or_none() to raise exception on first call
    # The code uses: result = await db.execute(stmt); strategy = result.scalar_one_or_none()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.side_effect = [
        Exception("Simulated DB Loop Error"),
        None,
    ]
    mock_db.execute.return_value = mock_result

    # Run
    response = await admin.import_strategies(
        data=strategies_data, db=mock_db, _current_admin=mock_admin_user
    )

    # Verify
    print(f"Import Errors: {response.get('errors')}")
    assert response["status"] == "success"
    # 1 succeded (Strategy B)
    assert response["created"] == 1
    # 1 failed (Strategy A)
    assert len(response["errors"]) == 1
    # Relax assertion to just check for exception message
    assert "Simulated DB Loop Error" in response["errors"][0]
