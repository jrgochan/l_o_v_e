"""OpenWeatherMap Adapter — Weather context for emotion correlation.

Fetches current weather conditions for a user's configured location and
creates ``context.weather`` LifeEvent records.  Environmental factors
like temperature, humidity, UV index, and daylight hours are known to
affect mood — the correlation engine can discover these patterns
automatically.

API docs: https://openweathermap.org/current
Free tier: 1,000 calls/day (60 calls/hour)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

import httpx

from app.core.settings import settings
from app.services.integrations.base import IntegrationAdapter, SyncResult

logger = logging.getLogger(__name__)

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


class OpenWeatherMapAdapter(IntegrationAdapter):
    """OpenWeatherMap integration — weather context signals."""

    adapter_id = "openweathermap"
    display_name = "OpenWeatherMap"
    category = "environment"
    auth_type = "api_key"
    consent_policy_key = "integration_weather"
    description = (
        "Track weather conditions at your location to discover how "
        "temperature, humidity, and weather patterns affect your mood."
    )

    async def validate_credential(self, auth_data: Dict[str, Any]) -> bool:
        """Validate an OpenWeatherMap API key by making a test request."""
        api_key = auth_data.get("api_key", "")
        if not api_key:
            return False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    OPENWEATHER_URL,
                    params={"q": "London", "appid": api_key, "units": "metric"},
                )
                return resp.status_code == 200
        except Exception:
            logger.exception("Failed to validate OpenWeatherMap API key")
            return False

    async def sync(
        self,
        user_id: UUID,
        credentials: Dict[str, Any],
        since: Optional[datetime] = None,
        settings_data: Optional[Dict[str, Any]] = None,
    ) -> SyncResult:
        """Fetch current weather and create a context.weather event."""
        api_key = credentials.get("api_key", "")
        city = (settings_data or {}).get("city", settings.DEFAULT_LOCATION_CITY)

        if not api_key:
            return SyncResult(errors=["No API key configured"])
        if not city:
            return SyncResult(errors=["No city configured"])

        try:
            weather_data = await self._fetch_weather(api_key, city)
            self._transform_weather(weather_data, user_id)
            return SyncResult(events_imported=1)
        except Exception as exc:
            logger.exception("Failed to fetch weather for user %s, city %s", user_id, city)
            return SyncResult(errors=[str(exc)])

    async def disconnect(self, user_id: UUID) -> None:
        """No external state to clean up."""

    async def _fetch_weather(self, api_key: str, city: str) -> Dict[str, Any]:
        """Fetch current weather from OpenWeatherMap API."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                OPENWEATHER_URL,
                params={"q": city, "appid": api_key, "units": "metric"},
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def _transform_weather(data: Dict[str, Any], user_id: UUID) -> Dict[str, Any]:
        """Transform OpenWeatherMap response into a LifeEvent dict."""
        main = data.get("main", {})
        weather = data.get("weather", [{}])[0]
        wind = data.get("wind", {})
        sys = data.get("sys", {})

        # Compute daylight hours from sunrise/sunset
        daylight_hours = None
        sunrise = sys.get("sunrise")
        sunset = sys.get("sunset")
        if sunrise and sunset:
            daylight_hours = round((sunset - sunrise) / 3600, 2)

        return {
            "user_id": str(user_id),
            "event_type": "context.weather",
            "title": f"Weather: {weather.get('description', 'unknown')}",
            "timestamp": datetime.now(timezone.utc),
            "source": "openweathermap",
            "event_data": {
                "temperature_c": main.get("temp"),
                "feels_like_c": main.get("feels_like"),
                "humidity_pct": main.get("humidity"),
                "pressure_hpa": main.get("pressure"),
                "conditions": weather.get("description"),
                "conditions_id": weather.get("id"),
                "clouds_pct": data.get("clouds", {}).get("all"),
                "wind_speed_ms": wind.get("speed"),
                "visibility_m": data.get("visibility"),
                "sunrise_utc": (
                    datetime.fromtimestamp(sunrise, tz=timezone.utc).isoformat()
                    if sunrise
                    else None
                ),
                "sunset_utc": (
                    datetime.fromtimestamp(sunset, tz=timezone.utc).isoformat() if sunset else None
                ),
                "daylight_hours": daylight_hours,
                "city": data.get("name"),
                "country": sys.get("country"),
            },
            "tags": ["weather", "context", "environment"],
        }
