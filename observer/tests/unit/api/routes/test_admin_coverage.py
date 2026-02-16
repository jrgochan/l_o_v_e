from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes import admin
from app.models.transition_strategy import TransitionStrategy
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def mock_admin_user():
    return User(id=uuid4(), email="admin@example.com", role=UserRole.ADMIN)


@pytest.mark.asyncio
async def test_import_visualization_data_generic_exception(mock_db, mock_admin_user):
    """Test generic 500 error when AdminService.import_atlas_emotions fails."""
    with patch("app.api.routes.admin.visualization.AdminService") as MockService:
        service_instance = MockService.return_value
        service_instance.import_atlas_emotions.side_effect = Exception("Unexpected Failure")

        with pytest.raises(HTTPException) as exc:
            await admin.import_visualization_data({}, mock_db, mock_admin_user)

        assert exc.value.status_code == 500
        assert "Import process failed" in exc.value.detail


@pytest.mark.asyncio
async def test_import_strategies_name_normalization(mock_db, mock_admin_user):
    """Test that 'strategy_name' is mapped to 'name'."""
    data = {
        "strategies": [
            {
                "strategy_name": "Test Strategy",
                "type": "cognitive",
                "description": "Desc",
                "difficulty": 1,
                "evidence": "E",
            }
        ]
    }

    # We mock _process_strategy_import to verify it receives the normalized data
    with patch("app.api.routes.admin._process_strategy_import") as mock_process:
        mock_process.return_value = True  # Pretend it updated

        await admin.import_strategies(data, mock_db, mock_admin_user)

        # Verify call args
        call_args = mock_process.call_args[0]
        # args: (db, strategy_data)
        passed_data = call_args[1]

        assert passed_data["name"] == "Test Strategy"
        assert passed_data["strategy_name"] == "Test Strategy"


@pytest.mark.asyncio
async def test_process_strategy_import_update_existing(mock_db):
    """Test _process_strategy_import updating an existing strategy."""
    # Data to import
    strategy_data = {
        "name": "Existing Strategy",
        "type": "new_type",
        "description": "New Desc",
        "difficulty": 5,
        "evidence": "meta-analysis",
        "steps": ["Step 1"],
        "contraindications": ["None"],
    }

    # Mock existing strategy in DB
    existing = MagicMock(spec=TransitionStrategy)
    existing.strategy_name = "Existing Strategy"

    # DB returning the existing strategy
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_res

    # Call private method directly since we want to test its logic
    # and avoiding the complexity of mocking AdminService imports if called via route
    # Although calling route is also fine if we don't mock the helper.
    # Let's call the helper directly as it is an async function in the module

    is_updated = await admin._process_strategy_import(mock_db, strategy_data)

    assert is_updated is True
    assert existing.strategy_type == "new_type"
    assert existing.description == "New Desc"
    assert existing.difficulty_level == 5
    assert existing.evidence_level == "meta-analysis"
    assert existing.detailed_steps == ["Step 1"]
