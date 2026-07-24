"""Unit tests for the integration adapter framework."""

from uuid import uuid4

import pytest

from app.core.crypto import decrypt_dict, encrypt_dict
from app.services.integrations.adapters.daylight import DaylightAdapter
from app.services.integrations.adapters.ical import ICalAdapter, infer_event_type
from app.services.integrations.adapters.weather import OpenWeatherMapAdapter
from app.services.integrations.base import AdapterMetadata, SyncResult
from app.services.integrations.registry import AdapterRegistry

# ---------------------------------------------------------------------------
# Crypto round-trip
# ---------------------------------------------------------------------------


class TestCrypto:
    """Test AES-256-GCM encryption/decryption."""

    def test_round_trip(self) -> None:
        """Encrypt then decrypt should return the original dict."""
        original = {"api_key": "sk-test-12345", "refresh_token": "rt_abc"}
        encrypted = encrypt_dict(original)
        decrypted = decrypt_dict(encrypted)
        assert decrypted == original

    def test_different_encryptions(self) -> None:
        """Two encryptions of the same data should produce different ciphertexts."""
        data = {"key": "value"}
        enc1 = encrypt_dict(data)
        enc2 = encrypt_dict(data)
        assert enc1 != enc2  # Random salt + nonce

    def test_decrypt_tampered_fails(self) -> None:
        """Tampered ciphertext should fail decryption."""
        data = {"key": "value"}
        encrypted = encrypt_dict(data)
        # Tamper with the ciphertext
        tampered = encrypted[:-4] + "XXXX"
        with pytest.raises(ValueError, match="Failed to decrypt"):
            decrypt_dict(tampered)

    def test_empty_dict(self) -> None:
        """Empty dict round-trips correctly."""
        original: dict = {}
        assert decrypt_dict(encrypt_dict(original)) == original

    def test_nested_data(self) -> None:
        """Nested dicts and lists round-trip correctly."""
        original = {
            "oauth": {
                "access_token": "at_123",
                "refresh_token": "rt_456",
                "expires_in": 3600,
            },
            "scopes": ["read", "write"],
        }
        assert decrypt_dict(encrypt_dict(original)) == original


# ---------------------------------------------------------------------------
# Adapter Registry
# ---------------------------------------------------------------------------


class TestAdapterRegistry:
    """Test the adapter registry."""

    def test_register_and_get(self) -> None:
        """Register an adapter and retrieve it."""
        registry = AdapterRegistry()
        adapter = ICalAdapter()
        registry.register(adapter)
        assert registry.get("ical_import") is adapter

    def test_get_unknown_returns_none(self) -> None:
        """Getting an unregistered adapter returns None."""
        registry = AdapterRegistry()
        assert registry.get("nonexistent") is None

    def test_list_all(self) -> None:
        """List all registered adapters."""
        registry = AdapterRegistry()
        registry.register(ICalAdapter())
        registry.register(DaylightAdapter())
        all_adapters = registry.list_all()
        assert len(all_adapters) == 2
        assert all(isinstance(a, AdapterMetadata) for a in all_adapters)

    def test_list_by_category(self) -> None:
        """Filter adapters by category."""
        registry = AdapterRegistry()
        registry.register(ICalAdapter())
        registry.register(DaylightAdapter())
        registry.register(OpenWeatherMapAdapter())

        env = registry.list_by_category("environment")
        cal = registry.list_by_category("calendar")
        assert len(env) == 2
        assert len(cal) == 1

    def test_adapter_ids(self) -> None:
        """Get list of all adapter IDs."""
        registry = AdapterRegistry()
        registry.register(ICalAdapter())
        registry.register(DaylightAdapter())
        assert sorted(registry.adapter_ids) == ["daylight", "ical_import"]

    def test_empty_adapter_id_raises(self) -> None:
        """Adapter with empty adapter_id should raise ValueError."""
        from app.services.integrations.base import IntegrationAdapter

        class BadAdapter(IntegrationAdapter):
            adapter_id = ""

            async def validate_credential(self, auth_data):
                return True

            async def sync(self, user_id, credentials, since=None, settings=None):
                return SyncResult()

            async def disconnect(self, user_id):
                pass

        registry = AdapterRegistry()
        with pytest.raises(ValueError, match="no adapter_id"):
            registry.register(BadAdapter())


# ---------------------------------------------------------------------------
# SyncResult
# ---------------------------------------------------------------------------


class TestSyncResult:
    """Test the SyncResult data class."""

    def test_success_when_no_errors(self) -> None:
        result = SyncResult(events_imported=5)
        assert result.success is True

    def test_failure_with_errors(self) -> None:
        result = SyncResult(errors=["API timeout"])
        assert result.success is False

    def test_to_dict(self) -> None:
        result = SyncResult(events_imported=3, events_skipped=1)
        d = result.to_dict()
        assert d["events_imported"] == 3
        assert d["events_skipped"] == 1
        assert d["success"] is True


# ---------------------------------------------------------------------------
# iCal Adapter
# ---------------------------------------------------------------------------


SAMPLE_ICAL = """\
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DTSTART:20240115T090000Z
DTEND:20240115T100000Z
SUMMARY:Morning Run
UID:event-1@test
END:VEVENT
BEGIN:VEVENT
DTSTART:20240115T140000Z
DTEND:20240115T150000Z
SUMMARY:Team Standup
UID:event-2@test
END:VEVENT
BEGIN:VEVENT
DTSTART:20240115T180000Z
DTEND:20240115T200000Z
SUMMARY:Dinner with Sarah
UID:event-3@test
END:VEVENT
END:VCALENDAR"""


class TestICalAdapter:
    """Test the iCal file import adapter."""

    def test_metadata(self) -> None:
        adapter = ICalAdapter()
        meta = adapter.get_metadata()
        assert meta.adapter_id == "ical_import"
        assert meta.category == "calendar"
        assert meta.auth_type == "file"

    def test_parse_events(self) -> None:
        """Parse a valid iCal file."""
        adapter = ICalAdapter()
        events = adapter.parse_ical(SAMPLE_ICAL, uuid4())
        assert len(events) == 3

    def test_event_type_inference(self) -> None:
        """Events should have inferred types."""
        adapter = ICalAdapter()
        events = adapter.parse_ical(SAMPLE_ICAL, uuid4())

        types = {e["title"]: e["event_type"] for e in events}
        assert types["Morning Run"] == "wellness.exercise"
        assert types["Team Standup"] == "work.meeting"
        assert types["Dinner with Sarah"] == "relationship.social_event"

    def test_duration_computed(self) -> None:
        """Duration should be computed from DTSTART/DTEND."""
        adapter = ICalAdapter()
        events = adapter.parse_ical(SAMPLE_ICAL, uuid4())
        # Morning Run: 9:00 - 10:00 = 60 minutes
        run = next(e for e in events if e["title"] == "Morning Run")
        assert run["duration_minutes"] == 60

    def test_source_is_ical(self) -> None:
        """Source should be 'ical_import'."""
        adapter = ICalAdapter()
        events = adapter.parse_ical(SAMPLE_ICAL, uuid4())
        assert all(e["source"] == "ical_import" for e in events)

    def test_empty_calendar(self) -> None:
        """Empty calendar should return no events."""
        empty_ical = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR"
        adapter = ICalAdapter()
        events = adapter.parse_ical(empty_ical, uuid4())
        assert events == []

    @pytest.mark.asyncio
    async def test_validate_always_true(self) -> None:
        """File-based adapter doesn't need credentials."""
        adapter = ICalAdapter()
        assert await adapter.validate_credential({}) is True

    @pytest.mark.asyncio
    async def test_sync_empty_content(self) -> None:
        """Empty content should return an error."""
        adapter = ICalAdapter()
        result = await adapter.sync(uuid4(), {})
        assert not result.success


class TestInferEventType:
    """Test the event type inference function."""

    def test_exercise_keywords(self) -> None:
        assert infer_event_type("Morning Run") == "wellness.exercise"
        assert infer_event_type("Yoga Class") == "wellness.exercise"
        assert infer_event_type("Gym Session") == "wellness.exercise"

    def test_meeting_keywords(self) -> None:
        assert infer_event_type("Sprint Review") == "work.meeting"
        assert infer_event_type("1:1 with Manager") == "work.meeting"

    def test_social_keywords(self) -> None:
        assert infer_event_type("Movie with friends") == "relationship.social_event"
        assert infer_event_type("Birthday Party") == "relationship.social_event"

    def test_therapy_keywords(self) -> None:
        assert infer_event_type("Therapy Session") == "mental.therapy_session"

    def test_unknown_falls_back(self) -> None:
        assert infer_event_type("Random Event XYZ") == "calendar.event"


# ---------------------------------------------------------------------------
# Weather Adapter
# ---------------------------------------------------------------------------


class TestWeatherAdapter:
    """Test the OpenWeatherMap adapter."""

    def test_metadata(self) -> None:
        adapter = OpenWeatherMapAdapter()
        meta = adapter.get_metadata()
        assert meta.adapter_id == "openweathermap"
        assert meta.category == "environment"
        assert meta.auth_type == "api_key"

    def test_transform_weather(self) -> None:
        """Test weather data transformation."""
        sample_data = {
            "main": {"temp": 22.5, "feels_like": 21.0, "humidity": 65, "pressure": 1013},
            "weather": [{"description": "clear sky", "id": 800}],
            "wind": {"speed": 3.2},
            "clouds": {"all": 10},
            "visibility": 10000,
            "sys": {"sunrise": 1705305600, "sunset": 1705339200, "country": "US"},
            "name": "Boulder",
        }

        event = OpenWeatherMapAdapter._transform_weather(sample_data, uuid4())
        assert event["event_type"] == "context.weather"
        assert event["source"] == "openweathermap"
        assert event["event_data"]["temperature_c"] == 22.5
        assert event["event_data"]["conditions"] == "clear sky"
        assert event["event_data"]["city"] == "Boulder"
        assert event["event_data"]["daylight_hours"] is not None


# ---------------------------------------------------------------------------
# Daylight Adapter
# ---------------------------------------------------------------------------


class TestDaylightAdapter:
    """Test the Daylight tracking adapter."""

    def test_metadata(self) -> None:
        adapter = DaylightAdapter()
        meta = adapter.get_metadata()
        assert meta.adapter_id == "daylight"
        assert meta.category == "environment"
        assert meta.auth_type == "none"

    def test_transform_daylight(self) -> None:
        """Test daylight data transformation."""
        sample_data = {
            "sunrise": "2024-01-15T14:15:00+00:00",
            "sunset": "2024-01-16T00:30:00+00:00",
            "solar_noon": "2024-01-15T19:22:30+00:00",
            "day_length": 36900,  # ~10.25 hours
            "civil_twilight_begin": "2024-01-15T13:45:00+00:00",
            "civil_twilight_end": "2024-01-16T01:00:00+00:00",
        }

        event = DaylightAdapter._transform_daylight(sample_data, uuid4())
        assert event["event_type"] == "context.daylight"
        assert event["source"] == "sunrise_sunset_api"
        assert event["event_data"]["daylight_hours"] == 10.25
        assert "seasonal" in event["tags"]

    @pytest.mark.asyncio
    async def test_validate_always_true(self) -> None:
        """No-auth adapter always validates."""
        adapter = DaylightAdapter()
        assert await adapter.validate_credential({}) is True

    @pytest.mark.asyncio
    async def test_sync_no_location(self) -> None:
        """Sync without location returns an error."""
        adapter = DaylightAdapter()
        result = await adapter.sync(uuid4(), {}, settings_data={})
        assert not result.success
        assert "location" in result.errors[0].lower()
