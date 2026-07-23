# Life Journal: Life Event Ontology

## The Challenge

Categorizing "all possible life events" is a problem that's been tackled across multiple disciplines — psychology, public administration, knowledge engineering, and social computing. No single ontology is perfect for L.O.V.E.'s use case, but several provide excellent foundations.

## Existing Ontologies & Taxonomies

This section surveys the major established systems. Our goal is to pick the best elements from each and compose a classification system that is:
1. **Emotionally relevant** — prioritizing events known to impact mood
2. **Practically loggable** — things users will actually bother to record
3. **Computationally useful** — structured enough for statistical correlation
4. **Open-ended** — extensible via custom types and JSONB metadata

### 1. Holmes-Rahe Social Readjustment Rating Scale (SRRS)

**Origin**: Holmes & Rahe (1967), psychiatry/behavioral medicine
**Scope**: 43 life events ranked by "Life Change Units" (stress weight)

The grandfather of life event classification. Designed to measure cumulative stress burden and predict health outcomes. Events are scored from 11 (minor violation of law) to 100 (death of spouse).

**Strengths for L.O.V.E.**:
- Clinically validated — 60+ years of research
- Each event has a stress weight (maps naturally to emotional impact)
- Categories span relationships, work, health, finance, and daily life
- Well-suited to the therapeutic context

**Limitations**:
- Only 43 events — too coarse for daily tracking
- Oriented toward *major* life events, misses routine (diet, exercise, sleep)
- Culturally dated (mortgage thresholds, "trouble with in-laws")
- No positive/growth events beyond "outstanding achievement"

**Sample Events (with LCU scores)**:

| Score | Event | Our Mapping |
|-------|-------|-------------|
| 100 | Death of spouse | `loss.partner` |
| 73 | Divorce | `relationship.separation` |
| 50 | Marriage | `relationship.milestone` |
| 47 | Fired from work | `work.termination` |
| 40 | Pregnancy | `health.milestone` |
| 28 | Outstanding personal achievement | `personal.achievement` |
| 20 | Change in residence | `environment.relocation` |
| 16 | Change in sleeping habits | `wellness.sleep_change` |
| 15 | Change in eating habits | `wellness.diet_change` |
| 13 | Vacation | `leisure.vacation` |

---

### 2. Haimson Major Life Events Taxonomy

**Origin**: Haimson et al. (2021), JASIST — social computing / HCI research
**Scope**: 121 specific life events across 12 categories

A modern, research-validated taxonomy developed from surveying 554 US adults. Designed to study how life transitions impact behavior, technology use, and well-being.

**The 12 Categories**:

| Category | Example Events |
|----------|---------------|
| Relationship & Family | Marriage, divorce, new baby, breakup |
| Death & Loss | Death of loved one, miscarriage, pet loss |
| Health & Body | Diagnosis, surgery, recovery, pregnancy |
| Mental Health | Depression onset, therapy start, medication change |
| Education | Graduation, enrollment, dropout |
| Career & Employment | New job, promotion, layoff, retirement |
| Financial | Major purchase, debt, windfall, bankruptcy |
| Legal | Arrest, lawsuit, custody change |
| Housing & Living | Moving, renovation, roommate change |
| Identity & Beliefs | Coming out, religious conversion, name change |
| Social & Community | New friendship, falling out, community event |
| Travel & Environment | Relocation, travel, natural disaster |

**Strengths for L.O.V.E.**:
- Modern (2021), empirically derived from real populations
- 121 items gives much finer granularity than Holmes-Rahe
- Includes identity, mental health, and social dimensions
- Organized into 12 intuitive categories

**Limitations**:
- Still oriented toward *significant* life events, not daily routine
- No schema for recurring/routine events (meals, workouts)
- Academic — no machine-readable schema (OWL/RDF)

---

### 3. Simple Event Model (SEM)

**Origin**: VU Amsterdam (2009), semantic web research
**Scope**: Domain-independent event ontology (OWL/RDF)

A lightweight, four-class event model designed for linked data interoperability.

**Core Classes**:
- `sem:Event` — The event itself (what happened)
- `sem:Actor` — Participants (who was involved)
- `sem:Place` — Location (where it happened)
- `sem:Time` — Temporal context (when it happened)

**Strengths for L.O.V.E.**:
- Minimal semantic commitment — extensible in any direction
- Well-suited as a structural backbone
- Subject-based typing via `sem:Type` avoids rigid class hierarchies
- Proven in healthcare and historical record-keeping

**Limitations**:
- No life-event specific content — it's a meta-model
- Requires domain overlays (which is what we'd build)

---

### 4. BIO Vocabulary

**Origin**: Biographical ontology for RDF/linked data
**Scope**: Person-centric life event modeling

Models a person's life as a sequence of biographical events (birth, marriage, employment, death). Event-centric rather than attribute-centric.

**Strengths for L.O.V.E.**:
- Person-centric (matches our user-oriented model)
- Event timeline approach aligns with trajectory tracking
- Properties for linking events to people, roles, and outcomes

**Limitations**:
- Focused on "big" biographical events, not daily life
- More suited to genealogy than emotional wellness

---

### 5. Schema.org `Person.lifeEvent`

**Origin**: Schema.org collaborative vocabulary
**Scope**: Web-standard structured data

Schema.org defines `Person` and `Event` types with a `lifeEvent` property that links them. Widely adopted for web discoverability.

**Strengths for L.O.V.E.**:
- Industry-standard, broadly understood
- JSON-LD support for interoperability
- `lifeEvent` property is exactly the right semantic

**Limitations**:
- Very shallow — no event taxonomy
- Designed for SEO, not analytical depth

---

### 6. SUMO (Suggested Upper Merged Ontology)

**Origin**: IEEE standard upper ontology
**Scope**: Formal logic framework for defining event types

Used in e-government to map citizen life events to public services. Provides rigorous formal definitions.

**Strengths for L.O.V.E.**:
- Extremely rigorous formal definitions
- Good for reasoning about event relationships

**Limitations**:
- Heavyweight — overkill for a wellness application
- Academic, not practical for user-facing features

---

## Our Approach: The L.O.V.E. Life Event Ontology

Rather than adopting any single ontology wholesale, we compose a **pragmatic hybrid**:

### Design Principles

1. **Two-level hierarchy**: `domain.type` (e.g., `wellness.exercise`, `work.meeting`)
2. **Emotionally weighted**: Every event type carries a default emotional impact estimate (inspired by Holmes-Rahe LCU)
3. **Routine-aware**: First-class support for recurring events (daily exercise, meals, sleep), not just milestones
4. **JSONB-extensible**: Structured fields for the common case, `event_data` JSONB for everything else
5. **Embedding-searchable**: Every event gets a semantic embedding for "find events like..."

### Event Domains & Types

```
life_event_type = "{domain}.{type}"
```

#### 🫀 `wellness.*` — Body & Health Routines

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `wellness.exercise` | Physical activity | +0.3 valence | Daily |
| `wellness.sleep` | Sleep quality/duration report | ±0.4 valence | Daily |
| `wellness.meal` | Diet/nutrition log | ±0.1 valence | Daily |
| `wellness.medication` | Medication taken/skipped | ±0.2 valence | Daily |
| `wellness.substance` | Alcohol, caffeine, etc. | ±0.3 valence | Variable |
| `wellness.symptom` | Physical symptom report | -0.3 valence | Variable |
| `wellness.diagnosis` | Medical diagnosis | -0.5 valence | One-time |
| `wellness.recovery` | Health improvement milestone | +0.5 valence | One-time |

#### 💼 `work.*` — Career & Professional

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `work.meeting` | Work meeting (routine or significant) | ±0.1 valence | Daily |
| `work.deadline` | Project deadline or deliverable | -0.2 valence | Variable |
| `work.achievement` | Promotion, award, project completion | +0.6 valence | One-time |
| `work.conflict` | Workplace conflict or tension | -0.4 valence | Variable |
| `work.termination` | Firing or layoff | -0.7 valence | One-time |
| `work.new_role` | Starting new job or position | ±0.3 valence | One-time |
| `work.commute` | Commute quality/duration | ±0.1 valence | Daily |

#### 💕 `relationship.*` — Social & Interpersonal

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `relationship.quality_time` | Meaningful time with loved ones | +0.5 valence | Variable |
| `relationship.conflict` | Argument or interpersonal tension | -0.5 valence | Variable |
| `relationship.milestone` | Marriage, engagement, anniversary | +0.7 valence | One-time |
| `relationship.separation` | Breakup, divorce, distancing | -0.7 valence | One-time |
| `relationship.social_event` | Party, gathering, community event | +0.3 valence | Variable |
| `relationship.isolation` | Loneliness, social withdrawal | -0.4 valence | Variable |
| `relationship.new_connection` | New friendship or relationship | +0.4 valence | One-time |

#### 🧠 `mental.*` — Mental Health & Inner Life

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `mental.therapy_session` | Therapy or counseling session | +0.2 valence | Weekly |
| `mental.meditation` | Meditation or mindfulness practice | +0.3 valence | Daily |
| `mental.journaling` | Reflective writing (separate from chat) | +0.2 valence | Daily |
| `mental.crisis` | Mental health crisis event | -0.8 valence | Variable |
| `mental.insight` | Personal breakthrough or realization | +0.5 valence | Variable |
| `mental.trigger` | Known trigger encountered | -0.4 valence | Variable |

#### 🏠 `environment.*` — Living Conditions & Surroundings

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `environment.relocation` | Moving home | ±0.3 valence | One-time |
| `environment.weather` | Notable weather event | ±0.1 valence | Daily |
| `environment.travel` | Travel or vacation | +0.4 valence | Variable |
| `environment.nature` | Time outdoors / nature exposure | +0.3 valence | Variable |
| `environment.disruption` | Noise, construction, disaster | -0.3 valence | Variable |

#### 📚 `growth.*` — Learning & Personal Development

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `growth.learning` | Course, book, skill development | +0.3 valence | Variable |
| `growth.creative` | Creative expression (art, music, writing) | +0.4 valence | Variable |
| `growth.achievement` | Personal milestone or goal completion | +0.6 valence | One-time |
| `growth.setback` | Failed attempt or disappointment | -0.4 valence | Variable |
| `growth.spiritual` | Spiritual or religious practice | +0.3 valence | Variable |

#### 💰 `financial.*` — Money & Resources

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `financial.expense` | Significant unexpected expense | -0.3 valence | Variable |
| `financial.income` | Bonus, raise, windfall | +0.4 valence | Variable |
| `financial.stress` | Financial worry or pressure | -0.5 valence | Variable |
| `financial.milestone` | Debt paid off, savings goal reached | +0.5 valence | One-time |

#### 🎭 `custom.*` — User-Defined

| Type | Description | Default Impact | Recurrence |
|------|-------------|----------------|------------|
| `custom.*` | Any user-defined event type | User-set | User-set |

Users can create custom event types that fit their specific tracking needs. The system learns their emotional impact over time from actual correlation data.

### Dimensional Properties

Inspired by the research on dimensional event classification (Luhmann et al., 2020), every event also carries these computed/reported dimensions:

| Dimension | Range | Description |
|-----------|-------|-------------|
| **Valence** | [-1, 1] | How positive or negative the event felt |
| **Impact** | [0, 1] | How significant the event was |
| **Predictability** | [0, 1] | How expected vs. surprising |
| **Controllability** | [0, 1] | How much agency the person felt |
| **Social** | [0, 1] | How social vs. solitary |
| **Duration** | minutes | How long the event lasted |

These map naturally to the VAC model:
- Event **Valence** → direct comparison with emotional Valence
- Event **Impact** → correlation strength with Arousal shifts
- Event **Social** → correlation with Connection dimension

## References

1. Holmes, T. H., & Rahe, R. H. (1967). The social readjustment rating scale. *Journal of Psychosomatic Research*, 11(2), 213-218.
2. Haimson, O. L., et al. (2021). The major life events taxonomy: Social readjustment, social media information sharing, and online network separation during times of life transition. *JASIST*, 72(2), 234-258.
3. van Hage, W. R., et al. (2011). Design and use of the Simple Event Model (SEM). *Journal of Web Semantics*, 9(2), 128-136.
4. Davis, I., & Vitiello, D. (2004). BIO: A vocabulary for biographical information. http://purl.org/vocab/bio/0.1/
5. Luhmann, M., et al. (2020). A dimensional taxonomy of perceived characteristics of major life events. *Journal of Personality and Social Psychology*.
6. Schema.org. (2024). Person type with lifeEvent property. https://schema.org/Person
