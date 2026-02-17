from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.core.security import get_password_hash
from app.models.user import User
from app.services.user_service import UserService


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def user_service(mock_db):
    return UserService(mock_db)


@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    user.full_name = "Original Name"
    user.password_hash = get_password_hash("OldPassword123!")
    user.is_active = True
    user.deleted_at = None
    user.role = "user"
    user.created_at = datetime.now(timezone.utc)
    user.preferences = {}
    return user


@pytest.mark.asyncio
async def test_update_profile_success(user_service, mock_db, mock_user):
    """Test successful profile update (name and email)."""
    # Mock uniqueness check returning None (no conflict)
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    with patch("app.services.user_service.event_bus") as mock_bus:
        mock_bus.emit = AsyncMock()
        await user_service.update_profile(
            mock_user, full_name="New Name", email="new@example.com"
        )

        assert mock_user.full_name == "New Name"
        assert mock_user.email == "new@example.com"
        mock_db.add.assert_called_with(mock_user)
        mock_db.commit.assert_awaited()
        mock_bus.emit.assert_awaited()


@pytest.mark.asyncio
async def test_update_profile_email_conflict(user_service, mock_db, mock_user):
    """Test email update failing due to existing user."""
    # Mock uniqueness check returning an existing user
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = MagicMock()
    mock_db.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Email already in use"):
        await user_service.update_profile(mock_user, email="taken@example.com")


@pytest.mark.asyncio
async def test_update_profile_no_changes(user_service, mock_db, mock_user):
    """Test update with no changes triggers no DB write."""
    with patch("app.services.user_service.event_bus") as mock_bus:
        await user_service.update_profile(mock_user)
        mock_db.add.assert_not_called()
        mock_bus.emit.assert_not_called()


@pytest.mark.asyncio
async def test_change_password_success(user_service, mock_db, mock_user):
    """Test successful password change."""
    with patch("app.services.user_service.verify_password") as mock_verify:
        with patch("app.services.user_service.get_password_hash") as mock_hash:
            # First verification passes (old password correct)
            # Second verification fails (new password diff from old) - actually logic is:
            # if verify(new, old_hash): raise error. So we want verify to return False for new password.

            # verify_password side effects:
            # 1. current_password vs hash -> True
            # 2. new_password vs hash -> False
            mock_verify.side_effect = [True, False]
            mock_hash.return_value = "new_hashed_secret"

            with patch("app.services.user_service.event_bus") as mock_bus:
                mock_bus.emit = AsyncMock()
                await user_service.change_password(
                    mock_user,
                    current_password="OldPassword123!",
                    new_password="NewPassword123!",
                )

                assert mock_user.password_hash == "new_hashed_secret"
                mock_db.add.assert_called_with(mock_user)
                mock_bus.emit.assert_awaited()


@pytest.mark.asyncio
async def test_change_password_incorrect_current(user_service, mock_user):
    """Test fail when current password is wrong."""
    with patch("app.services.user_service.verify_password", return_value=False):
        with pytest.raises(ValueError, match="Current password is incorrect"):
            await user_service.change_password(
                mock_user, current_password="Wrong", new_password="New"
            )


@pytest.mark.asyncio
async def test_change_password_same_as_old(user_service, mock_user):
    """Test fail when new password is same as old."""
    with patch("app.services.user_service.verify_password", side_effect=[True, True]):
        with pytest.raises(ValueError, match="New password must be different"):
            await user_service.change_password(
                mock_user, current_password="Old", new_password="Old"
            )


@pytest.mark.asyncio
async def test_soft_delete_account(user_service, mock_db, mock_user):
    """Test soft delete logic."""
    with patch("app.services.user_service.event_bus") as mock_bus:
        mock_bus.emit = AsyncMock()
        await user_service.soft_delete_account(mock_user)

        assert mock_user.is_active is False
        assert mock_user.deleted_at is not None
        mock_db.add.assert_called_with(mock_user)
        mock_bus.emit.assert_awaited()


@pytest.mark.asyncio
async def test_export_data(user_service, mock_db, mock_user):
    """Test data export structure."""

    # Mock chained queries
    # 1. Sessions
    # 2. Messages
    # 3. Trajectory
    # 4. Alerts

    mock_session = MagicMock()
    mock_session.id = uuid4()
    mock_session.started_at = datetime(2023, 1, 1, tzinfo=timezone.utc)
    mock_session.ended_at = None
    mock_session.tone_preference = "warm"
    mock_session.message_count = 5

    mock_msg = MagicMock()
    mock_msg.session_id = mock_session.id
    mock_msg.role = "user"
    mock_msg.content = "hello"
    mock_msg.created_at = datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc)

    mock_traj = MagicMock()
    mock_traj.timestamp = datetime(2023, 1, 1, 10, 5, tzinfo=timezone.utc)
    mock_traj.valence = 0.5
    mock_traj.arousal = 0.6
    mock_traj.control = 0.7
    mock_traj.emotion_label = "Joy"
    mock_traj.elasticity = 0.8

    mock_alert = MagicMock()
    mock_alert.session_id = mock_session.id
    mock_alert.alert_type = "visual"
    mock_alert.severity = "high"
    mock_alert.description = "Test alert"
    mock_alert.timestamp = datetime(2023, 1, 1, 10, 10, tzinfo=timezone.utc)

    # Setup mock results
    def execute_side_effect(stmt):
        mock_res = MagicMock()
        # Very crude mock routing based on string, but adequate for simple sequential calls if we know order
        # Or better: just sequentially return results
        return mock_res

    # Order of execution in service:
    # 1. Sessions
    # 2. Messages (if sessions exist)
    # 3. Trajectory
    # 4. Alerts (if sessions exist)

    res1 = MagicMock()
    res1.scalars.return_value.all.return_value = [mock_session]

    res2 = MagicMock()
    res2.scalars.return_value.all.return_value = [mock_msg]

    res3 = MagicMock()
    res3.scalars.return_value.all.return_value = [mock_traj]

    res4 = MagicMock()
    res4.scalars.return_value.all.return_value = [mock_alert]

    mock_db.execute.side_effect = [res1, res2, res3, res4]

    # Mock ConsentLinkService inside the method
    # It imports ConsentService inside the method: from app.services.consent_service import ConsentService
    # We need to patch where it's imported
    with patch("app.services.consent_service.ConsentService") as MockConsentService:
        mock_consent_instance = MockConsentService.return_value
        mock_consent = MagicMock()
        mock_consent.consent_type = "terms"
        mock_consent.version = "1.0"
        mock_consent.granted_at = datetime(2023, 1, 1, tzinfo=timezone.utc)
        mock_consent.revoked_at = None
        mock_consent.ip_address = "127.0.0.1"

        mock_consent_instance.get_user_consents = AsyncMock(return_value=[mock_consent])

        with patch("app.services.user_service.event_bus") as mock_bus:
            mock_bus.emit = AsyncMock()  # Fix: Make emit awaitable
            data = await user_service.export_data(mock_user)

            assert data["export_version"] == "1.0"
            assert data["profile"]["email"] == "test@example.com"
            assert len(data["sessions"]) == 1
            assert len(data["messages"]) == 1
            assert len(data["emotional_trajectory"]) == 1
            assert len(data["clinical_alerts"]) == 1
            assert len(data["consents"]) == 1
            assert data["messages"][0]["content"] == "hello"

            mock_bus.emit.assert_awaited()


@pytest.mark.asyncio
async def test_export_data_no_sessions(user_service, mock_db, mock_user):
    """Test data export when user has no sessions."""

    # 1. Sessions -> Empty
    res1 = MagicMock()
    res1.scalars.return_value.all.return_value = []

    # 2. Trajectory -> Empty
    res2 = MagicMock()
    res2.scalars.return_value.all.return_value = []

    # DB execute called twice: sessions, then trajectory.
    mock_db.execute.side_effect = [res1, res2]

    with patch("app.services.consent_service.ConsentService") as MockConsentService:
        MockConsentService.return_value.get_user_consents = AsyncMock(return_value=[])

        with patch("app.services.user_service.event_bus") as mock_bus:
            mock_bus.emit = AsyncMock()
            data = await user_service.export_data(mock_user)

            assert data["sessions"] == []
            assert data["messages"] == []
            assert data["clinical_alerts"] == []
            assert data["emotional_trajectory"] == []

            # Verify we didn't try to query messages or alerts
            # We expect exactly 2 DB calls + consents (which is mocked out)
            assert mock_db.execute.call_count == 2
            mock_bus.emit.assert_awaited()
