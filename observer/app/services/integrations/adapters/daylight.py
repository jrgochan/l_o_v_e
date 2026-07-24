"""Sunrise/Sunset Adapter — Daylight tracking for SAD correlation.

Uses the free sunrise-sunset.org API to track daily daylight hours.
No API key required — just latitude/longitude.

This is particularly valuable for detecting Seasonal Affective Disorder
(SAD) patterns: "your valence drops 0.2 every November as daylight
falls below 10 hours".

API docs: https://sunrise-sunset.org/api
Rate limit: Reasonable use (no published limit, ~1 req/day per user)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

import httpx

from app.core.settings import settings
from app.services.integrations.base import IntegrationAdapter, SyncResult

logger = logging.getLogger(__name__)

SUNRISE_SUNSET_URL = "https://api.sunrise-sunset.org/json"


class DaylightAdapter(IntegrationAdapter):
    """Sunrise/Sunset daylight tracking — no auth needed."""

    adapter_id = "daylight"
    display_name = "Daylight Tracker"
    category = "environment"
    auth_type = "none"
    consent_policy_key = "integration_daylight"
    description = (
        "Track daily sunrise, sunset, and daylight hours for your location. "
        "Helps discover seasonal patterns in your mood (SAD correlation)."
    )

    async def validate_credential(self, auth_data: Dict[str, Any]) -> bool:
        """No credentials needed — always valid if location is set."""
        return True

    async def sync(
        self,
        user_id: UUID,
        credentials: Dict[str, Any],
        since: Optional[datetime] = None,
        settings_data: Optional[Dict[str, Any]] = None,
    ) -> SyncResult:
        """Fetch today's daylight data for the user's location."""
        cfg = settings_data or {}
        lat = cfg.get("latitude") or settings.DEFAULT_LOCATION_LAT
        lon = cfg.get("longitude") or settings.DEFAULT_LOCATION_LON

        if not lat or not lon:
            return SyncResult(errors=["No location configured (latitude/longitude required)"])

        try:
            data = await self._fetch_daylight(float(lat), float(lon))
            self._transform_daylight(data, user_id)
            return SyncResult(events_imported=1)
        except Exception as exc:
            logger.exception("Failed to fetch daylight for user %s", user_id)
            return SyncResult(errors=[str(exc)])

    async def disconnect(self, user_id: UUID) -> None:
        """Nothing to disconnect."""

    async def _fetch_daylight(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch sunrise/sunset data from the API."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                SUNRISE_SUNSET_URL,
                params={
                    "lat": lat,
                    "lng": lon,
                    "formatted": 0,  # ISO 8601 format
                },
            )
            resp.raise_for_status()
            result = resp.json()

            if result.get("status") != "OK":
                raise ValueError(f"Sunrise API error: {result.get('status')}")

            return result.get("results", {})

    @staticmethod
    def _transform_daylight(data: Dict[str, Any], user_id: UUID) -> Dict[str, Any]:
        """Transform API response into a context.daylight LifeEvent."""
        sunrise_str = data.get("sunrise", "")
        sunset_str = data.get("sunset", "")
        solar_noon_str = data.get("solar_noon", "")
        day_length_secs = data.get("day_length", 0)

        daylight_hours = round(day_length_secs / 3600, 2) if day_length_secs else None

        return {
            "user_id": str(user_id),
            "event_type": "context.daylight",
            "title": f"Daylight: {daylight_hours}h" if daylight_hours else "Daylight",
            "timestamp": datetime.now(timezone.utc),
            "source": "sunrise_sunset_api",
            "event_data": {
                "sunrise": sunrise_str,
                "sunset": sunset_str,
                "solar_noon": solar_noon_str,
                "day_length_seconds": day_length_secs,
                "daylight_hours": daylight_hours,
                "civil_twilight_begin": data.get("civil_twilight_begin"),
                "civil_twilight_end": data.get("civil_twilight_end"),
                "nautical_twilight_begin": data.get("nautical_twilight_begin"),
                "nautical_twilight_end": data.get("nautical_twilight_end"),
            },
            "tags": ["daylight", "context", "environment", "seasonal"],
        }
