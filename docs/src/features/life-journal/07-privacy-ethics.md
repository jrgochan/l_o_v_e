# Life Journal: Privacy & Ethics

## Context

The Life Journal extends L.O.V.E.'s data collection from emotional states during chat sessions to the **full breadth of a person's daily life**: diet, exercise, sleep, medications, social interactions, work events, health conditions, relationship details, and more. This is a significant expansion of the data surface area, and it demands an equally significant expansion of privacy protections.

This document builds on the principles established in [ETHICS.md](../../../../ETHICS.md) — *"Emotion software should be a commons, not a commodity"* — and extends them to life event data.

## Core Principles

### 1. User Sovereignty Over Life Data

> **The user owns their life data. Period.**

- Users can export 100% of their data at any time (JSON, CSV)
- Users can delete any or all life events permanently
- Users can dismiss any correlation the system discovers
- Users can pause/resume event tracking at any time
- Users can choose which event types to track and which to ignore
- No life data is ever used for advertising, profiling, or sold to third parties

### 2. Informed Consent for Each Data Layer

Life Journal introduces **progressive consent** — each layer of data collection requires separate, informed opt-in:

| Layer | What's Collected | Consent Required |
|-------|-----------------|-----------------|
| **Emotional Tracking** | VAC states from chat sessions | Existing consent (baseline) |
| **Manual Event Logging** | User-typed life events | Explicit opt-in to Life Journal |
| **Correlation Analysis** | Statistical patterns from combined data | Opt-in to correlation engine |
| **Integration Import** | Calendar, wearable, weather data | Per-integration opt-in |
| **AI Inference** | System-inferred events from patterns | Opt-in with transparency |

Each layer is independently toggleable. A user can log events without enabling correlation analysis. A user can enable correlations without allowing AI inference.

### 3. Data Minimization

> **Collect only what's needed, keep only what's useful.**

- Event `description` fields are optional — title and type are sufficient for correlation
- Audio is never stored in life events (text only)
- Embeddings can be regenerated; original text can be deleted
- Correlation evidence stores aggregate statistics, never raw content
- Location data is never collected unless the user explicitly includes it

### 4. Transparency of Inference

When the system infers something about the user's life patterns, it must be transparent:

```
✅ "We noticed your anxiety tends to increase after work.deadline events
    (67% correlation, 45 observations). Does this match your experience?"

❌ "You should reduce your caffeine intake." (prescriptive, unsourced)

✅ "Based on 3 months of data, your valence improved 0.33 points since
    you started daily exercise. Here's the statistical detail..."

❌ Silently adjusting recommendations based on inferred patterns.
```

**Every correlation**:
- Shows its statistical basis (sample size, confidence, p-value)
- Can be confirmed or dismissed by the user
- Explains how it was computed (correlation type, method)
- Never makes medical or prescriptive claims

## Field-Level RBAC (Role-Based Access Control)

### Existing RBAC Foundation

The stack already has role-based access control via the `UserRole` enum in [user.py](file:///Users/jrgochan/code/github.com/jrgochan/l_o_v_e/observer/app/models/user.py#L24-L29):

```python
class UserRole(str, Enum):
    ADMIN = "admin"
    CLINICIAN = "clinician"
    USER = "user"
```

Plus the `ConsentService` in [consent_service.py](file:///Users/jrgochan/code/github.com/jrgochan/l_o_v_e/observer/app/services/consent_service.py) which manages versioned consent grants with full audit trails and the clinician assignment model (`assigned_clinician_id`).

The Life Journal extends this with **field-level granularity** — users control not just *who* can see their data, but *which fields* of *which event types* each audience can access.

### Sharing Audiences

```python
class SharingAudience(str, Enum):
    """Who can access the data."""
    SELF = "self"                     # Only the user (default)
    CLINICIAN = "clinician"           # Assigned clinician
    CARE_TEAM = "care_team"           # Extended care team (future)
    RESEARCH = "research"             # De-identified for research
    EXPORT = "export"                 # Included in data export
```

### Field-Level Visibility Rules

Users configure visibility per event domain AND per field:

```python
class FieldVisibilityPolicy:
    """Per-user sharing configuration for life event data."""

    user_id: UUID

    # Domain-level defaults
    domain_policies: Dict[str, DomainPolicy]
    # e.g., {
    #   "wellness": {"visible_to": ["self", "clinician"]},
    #   "mental":   {"visible_to": ["self"]},
    #   "work":     {"visible_to": ["self", "clinician", "export"]},
    # }

    # Field-level overrides (more specific than domain)
    field_overrides: Dict[str, FieldPolicy]
    # e.g., {
    #   "wellness.medication.event_data.medication_name": {"visible_to": ["self"]},
    #   "wellness.exercise.event_data": {"visible_to": ["self", "clinician"]},
    #   "relationship.*.description": {"visible_to": ["self"]},
    # }
```

### How It Works

```
User creates a life event:
    event_type: "wellness.medication"
    title: "Morning meds"
    event_data: {"medication_name": "Sertraline", "dosage_mg": 50}

Access from different audiences:

    👤 User (SELF):
        ✅ Full access to all fields
        title: "Morning meds"
        event_data: {"medication_name": "Sertraline", "dosage_mg": 50}

    👩‍⚕️ Clinician:
        ✅ Sees event exists and type
        ✅ Sees title (if domain policy allows)
        ❌ event_data.medication_name REDACTED (field override)
        title: "Morning meds"
        event_data: {"medication_name": "[REDACTED]", "dosage_mg": 50}

    🔬 Research:
        ✅ Sees event type and timestamp (de-identified)
        ❌ All PII fields removed
        ❌ Description removed
        event_type: "wellness.medication"
        timestamp: "2026-07-23T08:00:00Z"  (date-shifted)
```

### Default Policies (Secure by Default)

Every event domain starts with the most restrictive defaults. Users must explicitly open access:

| Domain | Default Audience | Rationale |
|--------|-----------------|-----------|
| `wellness.*` | `self` only | Health data is inherently sensitive |
| `mental.*` | `self` only | Mental health requires maximum protection |
| `relationship.*` | `self` only | Interpersonal data involves third parties |
| `work.*` | `self` only | Career data is personally sensitive |
| `financial.*` | `self` only | Financial data is legally protected |
| `environment.*` | `self`, `clinician` | Low sensitivity, useful for clinical context |
| `growth.*` | `self`, `clinician` | Generally positive, useful for treatment |
| `custom.*` | `self` only | Unknown sensitivity, default to restricted |

### Clinician Access Model

Building on the existing `assigned_clinician_id` FK on the User model:

```python
async def get_visible_events(
    self,
    target_user_id: UUID,
    requesting_user: User,
) -> List[LifeEvent]:
    """Get life events visible to the requesting user."""

    if requesting_user.id == target_user_id:
        # Self-access: full visibility
        return await self._get_all_events(target_user_id)

    if requesting_user.role == UserRole.CLINICIAN:
        # Verify clinician assignment
        target_user = await self._get_user(target_user_id)
        if target_user.assigned_clinician_id != requesting_user.id:
            raise PermissionDeniedError("Not assigned to this user")

        # Check consent
        if not await self.consent_service.has_active_consent(
            target_user_id, "clinical_sharing"
        ):
            raise ConsentRequiredError("Clinical sharing consent not granted")

        # Apply field-level visibility policies
        events = await self._get_all_events(target_user_id)
        return [self._apply_visibility(e, SharingAudience.CLINICIAN) for e in events]

    raise PermissionDeniedError("Insufficient role")
```

### Correlation Visibility

Correlations inherit the visibility of their most restrictive source data:

```python
# If a correlation links "wellness.medication" (self-only)
# to "mental.crisis" (self-only):
# → The correlation is also self-only

# If a correlation links "wellness.exercise" (self + clinician)
# to "growth.achievement" (self + clinician):
# → The correlation is visible to self + clinician
```

### API for Managing Visibility

```
GET    /api/v1/journal/privacy/policies          # Get current policies
PUT    /api/v1/journal/privacy/policies           # Update policies
PUT    /api/v1/journal/privacy/domains/{domain}   # Update domain-level policy
PUT    /api/v1/journal/privacy/fields/{path}      # Update field-level override
POST   /api/v1/journal/privacy/preview            # Preview what audience X would see
DELETE /api/v1/journal/privacy/overrides           # Reset to defaults
```

### Audit Trail for Access

Every access to shared data is logged:

```python
await event_bus.emit(DomainEvent(
    event_type="journal.data_accessed",
    actor_id=requesting_user.id,
    target_id=target_user.id,
    metadata={
        "audience": "clinician",
        "event_count": len(events),
        "domains_accessed": ["wellness", "environment"],
        "fields_redacted": ["event_data.medication_name"],
    },
))
```

---

## Sensitive Event Types

Some event types require additional protections:

### Medication & Substance Tracking

- `wellness.medication` and `wellness.substance` data is **never** included in any aggregate or cross-user analysis, even anonymized
- Users are reminded at input time that this data is stored locally / in their encrypted account
- No auto-complete or suggestion for medication names (prevents inference of conditions)
- Field-level encryption recommended for production deployment

### Mental Health Events

- `mental.crisis` events trigger clinical alert protocols (existing alert system)
- Crisis data is segregated and subject to clinical data governance
- Therapist access requires explicit patient grant (existing consent model)

### Relationship Events

- `relationship.*` events involving other people never store identifying information about the other party
- The system never infers relationship status or suggests relationship-related correlations unless the user explicitly tracks relationship events

### Health & Diagnosis

- `wellness.diagnosis` events are treated as Protected Health Information (PHI)
- Recommended: field-level encryption in production
- Never included in any system-generated insights without explicit user consent

## Technical Safeguards

### Row-Level Security (RLS)

The existing Observer RLS policy extends to new tables:

```sql
-- Users can only access their own life events
CREATE POLICY life_events_user_isolation ON life_events
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Users can only access their own correlations
CREATE POLICY correlations_user_isolation ON emotion_event_correlations
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

### Audit Trail

All life event operations are logged via the existing `AuditLog` / `EventBus` system:

```python
await event_bus.emit(DomainEvent(
    event_type="journal.event_created",
    actor_id=user.id,
    target_id=life_event.id,
    metadata={"event_type": life_event.event_type},
))
```

### Data Retention

| Data Type | Hot Storage | Archive | Deletion |
|-----------|------------|---------|----------|
| Life events | 2 years | Encrypted cold storage | On user request |
| Correlations | Active only | Expired correlations archived | Cascade with events |
| Event embeddings | 2 years | Can be regenerated | With source event |
| Stream messages | 90 days | File backup | After archival |

### Encryption

| Layer | Current | Recommended with Life Journal |
|-------|---------|-------------------------------|
| In transit | TLS 1.3 | TLS 1.3 (no change) |
| At rest (DB) | PostgreSQL TDE | PostgreSQL TDE (no change) |
| Sensitive fields | — | AES-256-GCM for medication, diagnosis, substance |
| Stream messages | — | TLS to NATS, optional message-level encryption |
| Backups | — | Encrypted backup with separate key management |

## GDPR Compliance

The Life Journal extends existing GDPR compliance:

| Right | Implementation |
|-------|---------------|
| **Right to Access** | `GET /api/v1/journal/export` — full JSON export of all life data |
| **Right to Erasure** | `DELETE /api/v1/journal/all` — cascade delete of all life events, correlations, and associated embeddings |
| **Right to Rectification** | `PUT /api/v1/journal/events/{id}` — update any event |
| **Right to Portability** | Export includes standardized format (JSON-LD with Schema.org Person/Event types) |
| **Right to Restriction** | Pause tracking toggle: `POST /api/v1/journal/pause` |
| **Right to Object** | Dismiss any correlation: `POST /api/v1/journal/correlations/{id}/feedback` |

## What We Will Never Do

Drawing from [ETHICS.md](../../../../ETHICS.md):

1. **Never sell life event data** — not to advertisers, insurers, employers, or anyone
2. **Never use life data for profiling** — no behavioral prediction for third parties
3. **Never make medical claims** — correlations are observations, not diagnoses
4. **Never share cross-user patterns** without full anonymization and user consent
5. **Never require life event tracking** — it's always optional, always augmentative
6. **Never infer without transparency** — every inference is explainable and dismissable
7. **Never lock data in** — export is always available, in open formats

## References

- [ETHICS.md](../../../../ETHICS.md) — Project ethics statement
- GDPR Article 25 — Data Protection by Design and by Default
- HIPAA Privacy Rule — For users in healthcare contexts
- [Existing consent model](../../../modules/observer/consent_service.py) — `ConsentService`
