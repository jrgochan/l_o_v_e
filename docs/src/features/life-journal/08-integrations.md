# Life Journal: Integrations & External Data Sources

## Overview

The Life Journal is designed to accept data from multiple sources beyond manual entry. This document describes the integration architecture, supported sources, and the consent/security model for external data.

## Alignment with Paper Research Directions

The paper's Section 10.4.3 (*Wearables Integration*) outlines the hypothesis that biometric signals correlate with the Connection axis:

> **Positive Connection correlates with**: ↑ Heart rate variability (HRV), ↑ vagal tone, ↓ cortisol, synchronized breathing/heart rate (when with others)
>
> **Negative Connection correlates with**: ↑ Cortisol, ↑ sympathetic activation, defensive posture (accelerometer)

The Life Journal integration layer is where this research direction becomes *implementable* — wearable data flows into the event stream as `context.*` signals, and the correlation engine discovers these biometric-emotion relationships automatically.

## Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Integration Gateway                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Adapter  │  │ Adapter  │  │ Adapter          │  │
│  │ Registry │  │ Auth     │  │ Transform Engine │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
┌──────────┐   ┌──────────┐    ┌──────────────┐
│ Calendar │   │ Wearable │    │ Environment  │
│ Adapters │   │ Adapters │    │ Adapters     │
├──────────┤   ├──────────┤    ├──────────────┤
│ Google   │   │ Apple    │    │ OpenWeather  │
│ Calendar │   │ Health   │    │ API          │
│          │   │          │    │              │
│ Outlook  │   │ Garmin   │    │ Sunrise/     │
│ 365      │   │ Connect  │    │ Sunset API   │
│          │   │          │    │              │
│ iCal     │   │ Fitbit   │    │ Air Quality  │
│ Import   │   │ Web API  │    │ Index        │
│          │   │          │    │              │
│ CalDAV   │   │ Oura     │    │ Location     │
│          │   │ Ring     │    │ (optional)   │
└──────────┘   │          │    └──────────────┘
               │ Withings │
               │          │
               │ Whoop    │
               └──────────┘
```

### Design Principles

1. **Adapter Pattern**: Each integration implements a common `IntegrationAdapter` interface
2. **Pull, not Push**: The system polls external sources on a schedule (respects API rate limits)
3. **Transform to LifeEvent**: All external data is normalized into `LifeEvent` records
4. **Per-Integration Consent**: Each integration requires its own consent grant
5. **Credential Isolation**: OAuth tokens stored encrypted, scoped per-user per-integration

## Integration Adapter Interface

```python
class IntegrationAdapter(ABC):
    """Base class for all external data source integrations."""

    # Metadata
    adapter_id: str              # "google_calendar", "apple_health", etc.
    display_name: str            # "Google Calendar"
    category: str                # "calendar", "wearable", "environment"
    consent_policy_key: str      # Links to ConsentPolicy for this integration

    # Required scopes (what data we request from the external service)
    required_scopes: List[str]

    @abstractmethod
    async def authenticate(self, user_id: UUID, auth_data: Dict) -> AuthResult:
        """Initiate OAuth flow or accept API key."""
        ...

    @abstractmethod
    async def sync(self, user_id: UUID, since: datetime) -> List[LifeEvent]:
        """Pull new data since last sync, return as LifeEvent records."""
        ...

    @abstractmethod
    async def disconnect(self, user_id: UUID) -> None:
        """Revoke access and delete stored credentials."""
        ...

    @abstractmethod
    def transform(self, raw_data: Dict) -> LifeEvent:
        """Transform external API response into a LifeEvent."""
        ...
```

## Supported Integrations

### 📅 Calendar Integrations

Calendars provide structured life events with timestamps, durations, and descriptions — the perfect complement to emotional tracking.

#### Google Calendar

| Property | Value |
|----------|-------|
| **Adapter ID** | `google_calendar` |
| **Auth Method** | OAuth 2.0 (Google API) |
| **Scopes** | `calendar.events.readonly` |
| **Sync Frequency** | Every 15 minutes |
| **Privacy** | Event titles only; descriptions optional (user-configurable) |

**Transformation Rules**:
```python
# Google Calendar Event → LifeEvent
{
    "event_type": infer_type(event.summary),  # "work.meeting", "social.*", etc.
    "title": event.summary,
    "timestamp": event.start.dateTime,
    "duration_minutes": (event.end - event.start).minutes,
    "event_data": {
        "calendar_name": event.calendar_id,
        "attendee_count": len(event.attendees),  # Count only, no names
        "is_recurring": event.recurrence is not None,
    },
    "source": "google_calendar",
    "tags": extract_tags(event.summary),
}
```

**Event Type Inference**: The adapter uses keyword matching + optional LLM classification to infer `event_type` from calendar event titles:
- "Standup", "Sprint Review", "1:1" → `work.meeting`
- "Gym", "Run", "Yoga" → `wellness.exercise`
- "Dinner with...", "Party", "Movie" → `relationship.social_event`
- "Dr. Appointment", "Therapy" → `mental.therapy_session` / `wellness.*`

#### Microsoft Outlook / Office 365

| Property | Value |
|----------|-------|
| **Adapter ID** | `outlook_calendar` |
| **Auth Method** | OAuth 2.0 (Microsoft Graph API) |
| **Scopes** | `Calendars.Read` |
| **Sync Frequency** | Every 15 minutes |

Same transformation logic as Google Calendar.

#### iCal File Import

| Property | Value |
|----------|-------|
| **Adapter ID** | `ical_import` |
| **Auth Method** | File upload (no OAuth) |
| **Format** | `.ics` files |
| **Sync** | One-time import |

For users who prefer not to connect a live calendar. Upload an `.ics` export and bulk-import events.

#### CalDAV (Self-Hosted)

| Property | Value |
|----------|-------|
| **Adapter ID** | `caldav` |
| **Auth Method** | Username/password or API key |
| **Compatibility** | Nextcloud, Radicale, Baikal, etc. |

For privacy-conscious users running their own calendar server.

---

### ⌚ Wearable Integrations

Wearable data provides objective physiological signals that complement self-reported events. As noted in the paper (§10.4.3), these signals may correlate with the VAC Connection axis.

#### Apple Health (via HealthKit Export)

| Property | Value |
|----------|-------|
| **Adapter ID** | `apple_health` |
| **Auth Method** | XML/JSON export import |
| **Data Types** | Heart rate, HRV, sleep, steps, workouts, mindfulness minutes |
| **Sync** | Manual export/import (Apple doesn't allow direct API access) |

**Transformation Rules**:
```python
# Workout Record → LifeEvent
{
    "event_type": "wellness.exercise",
    "title": f"{workout.activity_type} workout",
    "duration_minutes": workout.duration,
    "event_data": {
        "activity_type": workout.activity_type,  # "running", "cycling", etc.
        "calories": workout.total_energy_burned,
        "avg_heart_rate": workout.avg_heart_rate,
        "distance_km": workout.total_distance,
    },
    "source": "apple_health",
}

# Sleep Analysis → LifeEvent
{
    "event_type": "wellness.sleep",
    "title": "Sleep",
    "duration_minutes": sleep.duration_minutes,
    "event_data": {
        "in_bed_minutes": sleep.in_bed_duration,
        "asleep_minutes": sleep.asleep_duration,
        "deep_sleep_minutes": sleep.deep_sleep,
        "rem_minutes": sleep.rem_sleep,
        "awakenings": sleep.awakenings,
        "sleep_quality": compute_quality(sleep),  # 0.0-1.0
    },
    "source": "apple_health",
}

# HRV Data → Context Signal (not a life event, but a physiological context)
# Published to: journal.{user}.context.hrv
{
    "event_type": "context.hrv",
    "timestamp": hrv.timestamp,
    "event_data": {
        "sdnn_ms": hrv.sdnn,
        "rmssd_ms": hrv.rmssd,
    },
    "source": "apple_health",
}
```

#### Garmin Connect

| Property | Value |
|----------|-------|
| **Adapter ID** | `garmin_connect` |
| **Auth Method** | OAuth 1.0a (Garmin API) |
| **Data Types** | Activities, sleep, stress, Body Battery, HRV |
| **Sync Frequency** | Every 30 minutes |

**Notable Garmin-specific data**:
- **Stress Level**: Garmin computes a 0-100 stress score from HRV — directly useful for correlation with emotional arousal
- **Body Battery**: Energy level estimate — maps to our `energy_level` context field
- **Respiration Rate**: Respiratory patterns during sleep and activity

#### Fitbit

| Property | Value |
|----------|-------|
| **Adapter ID** | `fitbit` |
| **Auth Method** | OAuth 2.0 (Fitbit Web API) |
| **Data Types** | Activities, sleep, heart rate, SpO2 |
| **Sync Frequency** | Every 30 minutes |

#### Oura Ring

| Property | Value |
|----------|-------|
| **Adapter ID** | `oura_ring` |
| **Auth Method** | OAuth 2.0 (Oura API v2) |
| **Data Types** | Sleep stages, readiness score, HRV, temperature, activity |
| **Sync Frequency** | Every 60 minutes |

**Notable Oura-specific data**:
- **Readiness Score**: Composite wellness metric
- **Temperature Deviation**: Body temp trends (useful for illness detection)
- **Sleep Score**: Computed quality metric

#### Whoop

| Property | Value |
|----------|-------|
| **Adapter ID** | `whoop` |
| **Auth Method** | OAuth 2.0 (Whoop API) |
| **Data Types** | Strain, recovery, sleep performance, HRV |
| **Sync Frequency** | Every 30 minutes |

#### Withings (Nokia Health)

| Property | Value |
|----------|-------|
| **Adapter ID** | `withings` |
| **Auth Method** | OAuth 2.0 (Withings API) |
| **Data Types** | Weight, blood pressure, sleep, activity |
| **Sync Frequency** | Every 60 minutes |

---

### 🌍 Environment Integrations

Environmental factors affect mood — the correlation engine can discover seasonal patterns, weather sensitivity, and more.

#### OpenWeatherMap

| Property | Value |
|----------|-------|
| **Adapter ID** | `openweathermap` |
| **Auth Method** | API Key |
| **Data Types** | Temperature, humidity, conditions, UV index |
| **Sync Frequency** | Every 60 minutes |
| **Privacy** | Requires approximate location (city-level, not GPS) |

**Transformation**:
```python
# Weather → Context Signal
{
    "event_type": "context.weather",
    "event_data": {
        "temperature_c": weather.temp,
        "conditions": weather.description,  # "clear sky", "light rain"
        "humidity_pct": weather.humidity,
        "uv_index": weather.uv_index,
        "daylight_hours": compute_daylight(weather.sunrise, weather.sunset),
    },
    "source": "openweathermap",
}
```

#### Sunrise/Sunset (Daylight Tracking)

Seasonal Affective Disorder (SAD) correlates with daylight hours. Track sunrise/sunset for the user's location:

```python
{
    "event_type": "context.daylight",
    "event_data": {
        "sunrise": "06:45",
        "sunset": "20:30",
        "daylight_hours": 13.75,
        "solar_noon": "13:37",
    },
    "source": "sunrise_sunset_api",
}
```

---

## Consent & Security Model for Integrations

### Per-Integration Consent Policies

Each integration registers its own `ConsentPolicy` in the existing consent framework:

```python
# Example: New consent policies for integrations
_register(ConsentPolicy(
    key="integration_google_calendar",
    title="Google Calendar Integration",
    description=(
        "L.O.V.E. will read your Google Calendar events (titles, times, "
        "and duration) to correlate scheduled activities with your emotional "
        "states. We do not read event descriptions or attendee details unless "
        "you explicitly enable it. You can disconnect at any time."
    ),
    version="1.0",
    required=False,
    category="integration",
))

_register(ConsentPolicy(
    key="integration_apple_health",
    title="Apple Health Import",
    description=(
        "L.O.V.E. will import your Apple Health data (workouts, sleep, "
        "heart rate, HRV) to discover how physical activity and sleep "
        "patterns relate to your emotional wellbeing. Data is processed "
        "locally and stored in your encrypted account."
    ),
    version="1.0",
    required=False,
    category="integration",
))
```

### Credential Storage

```
┌─────────────────────────────────────────────┐
│ Integration Credentials (per user)          │
│                                             │
│  user_id: UUID                              │
│  adapter_id: str                            │
│  credentials: encrypted(JSONB)              │
│    → OAuth tokens (AES-256-GCM encrypted)   │
│    → API keys (AES-256-GCM encrypted)       │
│  scopes_granted: List[str]                  │
│  last_sync_at: datetime                     │
│  sync_status: str                           │
│  created_at, updated_at                     │
└─────────────────────────────────────────────┘
```

- All OAuth tokens encrypted at rest with per-user encryption keys
- Tokens auto-refreshed before expiry
- Revoking consent deletes credentials and all imported data
- No credentials ever leave the server (frontend never sees tokens)

### Data Minimization per Integration

| Integration | What We Import | What We DON'T Import |
|-------------|---------------|---------------------|
| Calendar | Event titles, times, duration | Descriptions, attendee names/emails, locations, attachments |
| Wearables | Aggregate metrics (avg HR, sleep duration) | Raw second-by-second sensor data, GPS tracks |
| Weather | City-level conditions | Precise GPS coordinates |

Users can customize what's imported per integration via privacy settings.

## Sync Architecture

### Sync Scheduler

```python
class IntegrationSyncScheduler:
    """Manages periodic sync for all active integrations."""

    async def run_sync_cycle(self):
        """Run one sync cycle for all due integrations."""
        due_integrations = await self.get_due_syncs()

        for integration in due_integrations:
            try:
                adapter = self.registry.get(integration.adapter_id)
                events = await adapter.sync(
                    user_id=integration.user_id,
                    since=integration.last_sync_at,
                )

                for event in events:
                    # Publish to event stream
                    await self.publisher.publish(
                        subject=f"journal.{integration.user_id}.event.{event.event_type}",
                        data=event.to_stream_message(),
                    )

                integration.last_sync_at = datetime.now(timezone.utc)
                integration.sync_status = "success"

            except RateLimitError:
                integration.sync_status = "rate_limited"
                # Exponential backoff
            except AuthExpiredError:
                integration.sync_status = "auth_expired"
                # Notify user to re-authenticate
```

### API Endpoints

```
POST   /api/v1/journal/integrations/{adapter_id}/connect     # Start OAuth flow
DELETE /api/v1/journal/integrations/{adapter_id}/disconnect   # Revoke & delete
GET    /api/v1/journal/integrations                           # List active integrations
POST   /api/v1/journal/integrations/{adapter_id}/sync         # Force manual sync
GET    /api/v1/journal/integrations/{adapter_id}/status       # Sync status & health
PUT    /api/v1/journal/integrations/{adapter_id}/settings     # Configure import prefs
POST   /api/v1/journal/integrations/import                    # Import file (iCal, Health export)
```

## Future Integration Candidates

| Integration | Category | Potential Value |
|-------------|----------|----------------|
| Spotify / Apple Music | Media | Correlate music listening patterns with mood |
| Todoist / Things | Productivity | Track task completion → accomplishment events |
| Strava | Fitness | Detailed athletic activity data |
| Headspace / Calm | Meditation | Mindfulness session tracking |
| Sleep Cycle | Sleep | Detailed sleep analysis beyond wearables |
| Cronometer | Nutrition | Detailed dietary tracking |
| IFTTT / Zapier | Meta | User-defined integration recipes |
