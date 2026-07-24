"""Consent Policy Registry — Config-driven consent definitions.

Defines the available consent policies for L.O.V.E.  Each policy has a key,
human-readable title, description, current version, required flag, and category.

To evolve a policy:
  1. Edit the description / title as needed.
  2. Bump the ``version`` string (e.g. "1.0" → "1.1").
  3. Users who consented to the old version will be prompted to re-consent.

To add a new policy:
  1. Add a new ``ConsentPolicy`` entry to ``CONSENT_POLICIES``.
  2. If ``required=True``, existing users will be prompted on next login.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ConsentPolicy:
    """Definition of a single consent policy."""

    key: str
    title: str
    description: str
    version: str
    required: bool
    category: str  # "legal", "data", "clinical", "research"

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API responses."""
        return {
            "key": self.key,
            "title": self.title,
            "description": self.description,
            "version": self.version,
            "required": self.required,
            "category": self.category,
        }


# ---------------------------------------------------------------------------
# Default Consent Policies for L.O.V.E.
# ---------------------------------------------------------------------------

CONSENT_POLICIES: dict[str, ConsentPolicy] = {}


def _register(policy: ConsentPolicy) -> ConsentPolicy:
    """Register a policy in the global registry."""
    CONSENT_POLICIES[policy.key] = policy
    return policy


# ── Legal ──────────────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="terms_of_service",
        title="Terms of Service Agreement",
        description=(
            "This summary constitutes the full Terms of Service for the L.O.V.E. platform. "
            "By using L.O.V.E., you agree to these terms which govern your use of the "
            "platform, acceptable conduct, intellectual property rights, limitation of "
            "liability, and dispute resolution. This is a therapeutic wellness tool and "
            "does not replace professional medical advice, diagnosis, or treatment."
        ),
        version="1.1",  # Bump version to force re-consent
        required=True,
        category="legal",
    )
)

# ── Data Processing ───────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="emotional_data_processing",
        title="Emotional Data Processing",
        description=(
            "L.O.V.E. analyzes your text input to detect emotional states using "
            "the Valence-Arousal-Control (VAC) model. This includes: classifying "
            "emotions, tracking emotional trajectory over time, and generating "
            "therapeutic insights. Your data is stored securely and access is strictly "
            "controlled. You may export or delete your data at any time via your "
            "profile settings."
        ),
        version="1.0",
        required=True,
        category="data",
    )
)

# ── Clinical ──────────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="clinical_sharing",
        title="Clinical Data Sharing",
        description=(
            "If you are assigned to a clinician, they will be able to view your "
            "chat sessions, emotional trajectory, and clinical alerts generated "
            "during your sessions. This enables your clinician to monitor your "
            "emotional wellbeing and provide better care. You may revoke this "
            "consent at any time, which will prevent further clinician access to "
            "new session data."
        ),
        version="1.0",
        required=True,
        category="clinical",
    )
)

# ── Research ──────────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="research_participation",
        title="Research Participation",
        description=(
            "You may opt in to allow your de-identified, aggregated data to be "
            "used for emotional wellness research. All personally identifiable "
            "information is removed before any research use. Your participation "
            "is entirely voluntary, has no effect on your access to the platform, "
            "and can be withdrawn at any time."
        ),
        version="1.0",
        required=False,
        category="research",
    )
)

# ── Voice / Audio ─────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="voice_analysis",
        title="Voice & Audio Analysis",
        description=(
            "When the Listener module is active, L.O.V.E. can analyze acoustic "
            "features of your voice (pitch, energy, harmonics-to-noise ratio) to "
            "enhance emotional detection. This is NOT speech-to-text transcription "
            "— we analyze acoustic properties only. Audio is processed in "
            "real-time and is not stored after analysis unless you explicitly "
            "enable session recording."
        ),
        version="1.0",
        required=False,
        category="data",
    )
)

# ── Life Journal ──────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="life_journal",
        title="Life Journal & Event Tracking",
        description=(
            "L.O.V.E.'s Life Journal allows you to log life events — such as "
            "activities, sleep, meals, work, and social interactions — alongside "
            "your emotional data. Events you log are stored securely in your "
            "account and used to provide richer context for your emotional "
            "journey. You may export or delete any or all life events at any "
            "time. This consent covers manual event logging only; each "
            "integration (calendars, wearables) requires its own separate consent."
        ),
        version="1.0",
        required=False,
        category="data",
    )
)

_register(
    ConsentPolicy(
        key="life_journal_correlations",
        title="Emotion-Event Correlation Analysis",
        description=(
            "When enabled, L.O.V.E. will analyze patterns between your life "
            "events and emotional states to discover correlations. For example: "
            "'Your anxiety tends to increase within 90 minutes of caffeine intake.' "
            "Correlations are computed using statistical methods and are always "
            "shown with their evidence (sample size, confidence). You can confirm "
            "or dismiss any discovered correlation, and you may disable this "
            "analysis at any time."
        ),
        version="1.0",
        required=False,
        category="data",
    )
)

# ── Integrations ──────────────────────────────────────────────────────────

_register(
    ConsentPolicy(
        key="integration_ical",
        title="iCal Calendar Import",
        description=(
            "L.O.V.E. will import events from your uploaded .ics calendar "
            "file (titles, times, and duration) to correlate scheduled "
            "activities with your emotional states. Imported events are "
            "stored in your account and can be deleted at any time."
        ),
        version="1.0",
        required=False,
        category="integration",
    )
)

_register(
    ConsentPolicy(
        key="integration_weather",
        title="Weather Data Integration",
        description=(
            "L.O.V.E. will fetch current weather conditions for your "
            "configured city (temperature, humidity, conditions, daylight "
            "hours) to discover how environmental factors affect your mood. "
            "Only city-level location is used — no GPS coordinates are "
            "stored or transmitted."
        ),
        version="1.0",
        required=False,
        category="integration",
    )
)

_register(
    ConsentPolicy(
        key="integration_daylight",
        title="Daylight & Seasonal Tracking",
        description=(
            "L.O.V.E. will track daily sunrise, sunset, and daylight hours "
            "for your configured location. This helps discover seasonal "
            "patterns in your emotional wellbeing (e.g., Seasonal Affective "
            "Disorder). Uses approximate coordinates only."
        ),
        version="1.0",
        required=False,
        category="integration",
    )
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_policy(key: str) -> ConsentPolicy | None:
    """Look up a policy by key."""
    return CONSENT_POLICIES.get(key)


def get_required_policies() -> list[ConsentPolicy]:
    """Return all policies that are required."""
    return [p for p in CONSENT_POLICIES.values() if p.required]


def get_optional_policies() -> list[ConsentPolicy]:
    """Return all policies that are optional."""
    return [p for p in CONSENT_POLICIES.values() if not p.required]
