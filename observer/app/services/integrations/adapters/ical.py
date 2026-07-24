"""iCal Import Adapter — File-based calendar event import.

Parses standard ``.ics`` (iCalendar RFC 5545) files and transforms
``VEVENT`` components into ``LifeEvent`` records.  Supports:
- Single and recurring events
- All-day events
- Timezone-aware timestamps
- Event type inference from summary text

This is the simplest calendar adapter — no OAuth, no API calls, just
file upload.  Ideal for privacy-conscious users who want to import
calendar data without granting API access.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.services.integrations.base import IntegrationAdapter, SyncResult

logger = logging.getLogger(__name__)

# Keyword → event_type mapping for inference
EVENT_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "work.meeting": [
        "standup",
        "sprint",
        "retro",
        "1:1",
        "meeting",
        "sync",
        "review",
        "planning",
        "scrum",
        "demo",
        "kickoff",
    ],
    "wellness.exercise": [
        "gym",
        "run",
        "yoga",
        "swim",
        "hike",
        "bike",
        "workout",
        "pilates",
        "crossfit",
        "tennis",
        "basketball",
        "walk",
    ],
    "relationship.social_event": [
        "party",
        "dinner with",
        "movie",
        "concert",
        "game night",
        "birthday",
        "anniversary",
        "date",
    ],
    "wellness.meal": [
        "lunch",
        "dinner",
        "breakfast",
        "brunch",
        "meal",
    ],
    "mental.therapy_session": [
        "therapy",
        "counseling",
        "psychiatrist",
        "psychologist",
    ],
    "wellness.appointment": [
        "doctor",
        "dentist",
        "appointment",
        "checkup",
        "physical",
    ],
    "work.deadline": [
        "deadline",
        "due date",
        "submission",
    ],
    "growth.learning": [
        "class",
        "lecture",
        "course",
        "workshop",
        "seminar",
        "study",
    ],
}


def infer_event_type(summary: str) -> str:
    """Infer a domain.type event classification from a calendar event summary.

    Uses keyword matching against the summary text. Falls back to
    ``calendar.event`` for unrecognized summaries.
    """
    lower = summary.lower()
    for event_type, keywords in EVENT_TYPE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return event_type
    return "calendar.event"


class ICalAdapter(IntegrationAdapter):
    """iCal (.ics) file import adapter.

    Auth type: ``file`` — no credentials needed, just a file upload.
    """

    adapter_id = "ical_import"
    display_name = "iCal File Import"
    category = "calendar"
    auth_type = "file"
    consent_policy_key = "integration_ical"
    description = (
        "Import calendar events from an .ics file (Google Calendar, "
        "Apple Calendar, Outlook export). One-time import — no live sync."
    )

    async def validate_credential(self, auth_data: Dict[str, Any]) -> bool:
        """File-based adapter doesn't need credentials."""
        return True

    async def sync(
        self,
        user_id: UUID,
        credentials: Dict[str, Any],
        since: Optional[datetime] = None,
        settings: Optional[Dict[str, Any]] = None,
    ) -> SyncResult:
        """Parse an iCal file and return a SyncResult.

        Expects ``credentials["ical_content"]`` to contain the raw
        iCal string content.
        """
        ical_content = credentials.get("ical_content", "")
        if not ical_content:
            return SyncResult(errors=["No iCal content provided"])

        try:
            events = self.parse_ical(ical_content, user_id, since)
            return SyncResult(
                events_imported=len(events),
            )
        except Exception as exc:
            logger.exception("Failed to parse iCal file for user %s", user_id)
            return SyncResult(errors=[str(exc)])

    async def disconnect(self, user_id: UUID) -> None:
        """Nothing to disconnect for file imports."""

    def parse_ical(
        self,
        ical_content: str,
        user_id: UUID,
        since: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Parse an iCal string into LifeEvent-compatible dicts.

        Args:
            ical_content: Raw .ics file content
            user_id: Owner of the events
            since: Only include events after this timestamp

        Returns:
            List of LifeEvent-compatible dicts.
        """
        try:
            from icalendar import Calendar
        except ImportError as exc:
            raise ImportError(
                "icalendar package required for iCal import. " "Install with: pip install icalendar"
            ) from exc

        cal = Calendar.from_ical(ical_content)
        events: List[Dict[str, Any]] = []

        for component in cal.walk():
            if component.name != "VEVENT":
                continue

            event = self._transform_vevent(component, user_id)
            if event is None:
                continue

            # Filter by since timestamp
            if since and event.get("timestamp"):
                event_ts = event["timestamp"]
                if isinstance(event_ts, datetime) and event_ts < since:
                    continue

            events.append(event)

        logger.info(
            "Parsed %d events from iCal file for user %s",
            len(events),
            user_id,
        )
        return events

    def _transform_vevent(self, component: Any, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Transform a single VEVENT into a LifeEvent dict."""
        summary = str(component.get("SUMMARY", "Untitled Event"))
        dtstart = component.get("DTSTART")

        if dtstart is None:
            return None

        dt_value = dtstart.dt
        # Handle date vs datetime
        if isinstance(dt_value, datetime):
            timestamp = dt_value.astimezone(timezone.utc) if dt_value.tzinfo else dt_value
        else:
            # All-day event — use midnight
            timestamp = datetime.combine(dt_value, datetime.min.time())

        # Calculate duration
        duration_minutes = None
        dtend = component.get("DTEND")
        if dtend:
            end_dt = dtend.dt
            if isinstance(end_dt, datetime) and isinstance(dt_value, datetime):
                delta = end_dt - dt_value
                duration_minutes = int(delta.total_seconds() / 60)

        # Detect recurring
        is_recurring = component.get("RRULE") is not None

        # Build tags from categories
        tags: List[str] = []
        categories = component.get("CATEGORIES")
        if categories:
            if hasattr(categories, "to_ical"):
                cat_str = categories.to_ical().decode("utf-8", errors="replace")
                tags = [t.strip() for t in cat_str.split(",") if t.strip()]

        description = str(component.get("DESCRIPTION", "")) or None

        return {
            "user_id": str(user_id),
            "event_type": infer_event_type(summary),
            "title": summary[:255],
            "description": description[:2000] if description else None,
            "timestamp": timestamp,
            "duration_minutes": duration_minutes,
            "is_recurring": is_recurring,
            "source": "ical_import",
            "tags": tags,
            "event_data": {
                "calendar_uid": str(component.get("UID", "")),
                "location": str(component.get("LOCATION", "")) or None,
            },
        }
