# pylint: disable=redefined-outer-name, protected-access

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.consent_policies import get_policy
from app.models.consent_record import ConsentRecord
from app.models.user import User
from app.services.consent_service import ConsentService


# Mock dependencies
@pytest.fixture
def mock_db():
    session = AsyncMock()
    return session


@pytest.fixture
def mock_user():
    return User(id=uuid4(), email="test@test.com")


@pytest.fixture
def mock_event_bus():
    # Helper to mock the global event_bus instance
    with patch("app.services.consent_service.event_bus") as mock:
        # Important: emit must be an AsyncMock to be awaitable
        mock.emit = AsyncMock()
        yield mock


@pytest.fixture
def service(mock_db):
    return ConsentService(mock_db)


@pytest.mark.unit
class TestConsentService:

    async def test_grant_consent_new(self, service, mock_db, mock_user, mock_event_bus):
        """Test granting consent when no record exists."""
        # Setup: no existing consent
        service._get_active_consent = AsyncMock(return_value=None)

        # Action
        record = await service.grant_consent(mock_user, "terms_of_service", ip_address="1.2.3.4")

        # Verify
        assert record.consent_type == "terms_of_service"
        assert record.user_id == mock_user.id
        assert record.ip_address == "1.2.3.4"
        assert record.revoked_at is None

        # Check DB calls
        mock_db.add.assert_called_once()
        mock_db.flush.assert_called_once()

        # Check Event
        mock_event_bus.emit.assert_called_once()
        event = mock_event_bus.emit.call_args[0][0]
        assert event.event_type == "consent.granted"
        assert event.actor_id == mock_user.id

    async def test_grant_consent_idempotent(self, service, mock_db, mock_user, mock_event_bus):
        """Test granting consent when already granted at current version."""
        policy = get_policy("terms_of_service")
        existing = ConsentRecord(
            user_id=mock_user.id,
            consent_type="terms_of_service",
            version=policy.version,
            granted_at=datetime.now(timezone.utc),
        )

        service._get_active_consent = AsyncMock(return_value=existing)

        # Action
        record = await service.grant_consent(mock_user, "terms_of_service")

        # Verify
        assert record == existing
        mock_db.add.assert_not_called()
        mock_event_bus.emit.assert_not_called()

    async def test_grant_consent_version_upgrade(self, service, mock_db, mock_user, mock_event_bus):
        """Test granting consent when older version exists."""
        existing = ConsentRecord(
            user_id=mock_user.id,
            consent_type="terms_of_service",
            version="0.1",  # Old version
            granted_at=datetime.now(timezone.utc),
        )
        service._get_active_consent = AsyncMock(return_value=existing)

        # Action
        record = await service.grant_consent(mock_user, "terms_of_service")

        # Verify old revoked
        assert existing.revoked_at is not None
        assert "Superseded" in existing.notes

        # Verify new created
        assert record != existing
        assert record.version == get_policy("terms_of_service").version

        mock_db.add.assert_called_once()
        mock_event_bus.emit.assert_called_once()

    async def test_revoke_consent(self, service, mock_user, mock_event_bus):
        """Test revoking an active consent."""
        existing = ConsentRecord(
            user_id=mock_user.id,
            consent_type="research_participation",
            version="1.0",
        )
        service._get_active_consent = AsyncMock(return_value=existing)

        # Action
        result = await service.revoke_consent(mock_user, "research_participation")

        # Verify
        assert result == existing
        assert existing.revoked_at is not None
        mock_event_bus.emit.assert_called_once()
        event = mock_event_bus.emit.call_args[0][0]
        assert event.event_type == "consent.revoked"

    async def test_get_missing_required(self, service, mock_user):
        """Test identification of missing required policies."""
        terms = get_policy("terms_of_service")
        existing = ConsentRecord(consent_type="terms_of_service", version=terms.version)

        service.get_user_consents = AsyncMock(return_value=[existing])

        # Action
        missing = await service.get_missing_required(mock_user.id)

        # Verify
        missing_keys = {p.key for p in missing}
        assert "terms_of_service" not in missing_keys
        assert "emotional_data_processing" in missing_keys  # Required
        assert "research_participation" not in missing_keys  # Optional

    async def test_check_all_required_fail(self, service, mock_user):
        """Check boolean helper fail state."""
        service.get_missing_required = AsyncMock(return_value=[get_policy("terms_of_service")])
        assert await service.check_all_required(mock_user.id) is False

    async def test_check_all_required_pass(self, service, mock_user):
        """Check boolean helper pass state."""
        service.get_missing_required = AsyncMock(return_value=[])
        assert await service.check_all_required(mock_user.id) is True

    # --- New Tests for 100% Coverage ---

    async def test_grant_consent_unknown_policy(self, service, mock_user):
        """Test error when granting unknown policy."""
        with pytest.raises(ValueError, match="Unknown consent policy"):
            await service.grant_consent(mock_user, "fake_policy")

    async def test_revoke_consent_unknown_policy(self, service, mock_user):
        """Test error when revoking unknown policy."""
        with pytest.raises(ValueError, match="Unknown consent policy"):
            await service.revoke_consent(mock_user, "fake_policy")

    async def test_revoke_consent_none_active(self, service, mock_user):
        """Test revoke returns None when no active consent."""
        service._get_active_consent = AsyncMock(return_value=None)
        result = await service.revoke_consent(mock_user, "terms_of_service")
        assert result is None

    async def test_grant_bulk(self, service, mock_user):
        """Test bulk grant."""
        # Mock grant_consent to return a dummy record
        mock_record = MagicMock()
        service.grant_consent = AsyncMock(return_value=mock_record)

        keys = ["terms_of_service", "privacy_policy"]
        records = await service.grant_bulk(mock_user, keys, ip_address="1.1.1.1")

        assert len(records) == 2
        assert service.grant_consent.await_count == 2
        service.grant_consent.assert_awaited_with(mock_user, "privacy_policy", ip_address="1.1.1.1")

    async def test_get_active_consent_db_call(self, mock_db):
        """Test the actual _get_active_consent method (unmocked)."""
        # Create a real service instance without internal mocks
        real_service = ConsentService(mock_db)

        # Mock DB result
        mock_record = ConsentRecord(id=uuid4())
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_record
        mock_db.execute.return_value = mock_res

        result = await real_service._get_active_consent(uuid4(), "terms_of_service")

        assert result == mock_record
        mock_db.execute.assert_called_once()  # Verifies we called DB

    async def test_get_consent_status_full_logic(self, service, mock_user):
        """Test get_consent_status with granted, missing, and outdated policies."""

        # 1. Terms: Granted (Current)
        terms_policy = get_policy("terms_of_service")
        r_terms = ConsentRecord(
            consent_type="terms_of_service",
            version=terms_policy.version,
            granted_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        )

        # 2. Emotional: Outdated
        # emotional_policy = get_policy("emotional_data_processing")
        r_emotional = ConsentRecord(
            consent_type="emotional_data_processing",
            version="0.0.1",  # Assuming current is newer
        )

        # 3. Research: Missing (Optional) - No record

        service.get_user_consents = AsyncMock(return_value=[r_terms, r_emotional])

        status = await service.get_consent_status(mock_user.id)

        # Check Granted
        assert len(status["granted"]) == 1
        assert status["granted"][0]["key"] == "terms_of_service"

        # Check Outdated
        assert len(status["outdated"]) == 1
        assert status["outdated"][0]["key"] == "emotional_data_processing"

        # Check Missing (Research is optional, so it might show up
        # in missing if logic includes optional?
        # Code says: "if record is None: if policy.required: missing.append")
        # Research is optional usually. Let's check required policies.
        # "voice_processing" is also required usually.

        # Let's see what's required and missing.
        # If we didn't consent to voice_processing (required), it should be in missing.
        # terms_of_service is required (granted)
        # emotional_data_processing is required (outdated)

        missing_keys = {m["key"] for m in status["missing"]}

        # Ensure at least one required policy is missing if strictly not in list
        # But wait, emotional is in outdated, checks:
        # if record is None: if required: missing.append
        # else: ...
        # So emotional is NOT in missing, it is in outdated.

        assert "emotional_data_processing" in {o["key"] for o in status["outdated"]}
        assert "emotional_data_processing" not in missing_keys

        # Check all_required_met
        # Should be False because emotional is outdated (so not met?) or because missing has items?
        # Logic: all_required_met = len(missing) == 0
        # and all(p.key not in outdated for p in required)

        assert status["all_required_met"] is False

    async def test_get_user_consents_db_call(self, mock_db):
        """Test the actual get_user_consents method (unmocked)."""
        real_service = ConsentService(mock_db)

        mock_record = ConsentRecord(id=uuid4())
        mock_res = MagicMock()
        mock_res.scalars.return_value.all.return_value = [mock_record]
        mock_db.execute.return_value = mock_res

        result = await real_service.get_user_consents(uuid4())

        assert len(result) == 1
        assert result[0] == mock_record
        mock_db.execute.assert_called_once()
