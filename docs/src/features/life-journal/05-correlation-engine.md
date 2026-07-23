# Life Journal: Correlation Engine

## Purpose

The Correlation Engine discovers and maintains statistical relationships between life events and emotional states. It answers questions like:

- *"Does drinking coffee correlate with my anxiety?"*
- *"Does exercising in the morning improve my mood for the rest of the day?"*
- *"Why do I always feel dread on Monday mornings?"*

## Correlation Types

### 1. Temporal Proximity

**Question**: "Do emotional shifts happen near specific event types?"

**Method**: Window-based co-occurrence analysis

```
Timeline:
    ──────────────────────────────────────────────→ time

    Event:    ☕ Coffee          ☕ Coffee          ☕ Coffee
              │                 │                 │
              │  ┌─ window ─┐   │  ┌─ window ─┐   │  ┌─ window ─┐
              ▼  │          │   ▼  │          │   ▼  │          │
    Emotion:     😰 Anxiety     😰 Anxiety       😌 Calm
                 (hit)          (hit)             (miss)

    Co-occurrence rate: 2/3 = 67%
    Expected by chance: ~15%
    → Statistically significant correlation
```

**Algorithm**:
1. For each event type `E` and emotion `M`:
   - Count occurrences of `M` within `±window` of `E` events
   - Compare to baseline rate of `M` (how often does `M` occur generally?)
   - Compute chi-squared or Fisher's exact test for significance

2. **Window sizes**: Test multiple windows (30min, 2hr, 6hr, 24hr, 48hr)
   - Short windows: acute reactions (caffeine → anxiety)
   - Long windows: delayed effects (poor sleep → next-day irritability)

3. **Lag detection**: Measure the typical delay between event and emotional shift
   - `lag_seconds` in the correlation record captures this

**Output**:
```python
{
    "correlation_type": "temporal_proximity",
    "event_type": "wellness.substance",  # caffeine
    "emotion_name": "Anxiety",
    "strength": 0.67,
    "direction": "negative",  # caffeine → negative emotional shift
    "lag_seconds": 5400,      # ~90 minutes average
    "confidence": 0.92,
    "sample_size": 45,
    "evidence": {
        "p_value": 0.003,
        "chi_squared": 8.92,
        "baseline_rate": 0.15,
        "observed_rate": 0.67,
        "window_hours": 2,
    }
}
```

---

### 2. Pattern Recurrence

**Question**: "Are there periodic emotional patterns tied to time cycles?"

**Method**: Autocorrelation + calendar alignment

```
Weekly pattern detection:

    Mon  Tue  Wed  Thu  Fri  Sat  Sun
    😰   😐   😐   😐   😰   😊   😊    Week 1
    😰   😐   😐   😐   😰   😊   😊    Week 2  
    😰   😐   😐   😐   😰   😊   😊    Week 3
    ↑                   ↑    ↑    ↑
    Monday dread    Friday anxiety  Weekend relief

    → Detected: 7-day cycle with Monday/Friday low points
```

**Algorithm**:
1. Aggregate VAC values into time buckets (hourly, daily)
2. Compute autocorrelation at candidate periods:
   - **Daily**: 24-hour cycle (morning person vs night owl)
   - **Weekly**: 7-day cycle (weekend effect, Monday dread)
   - **Monthly**: ~30-day cycle (hormonal, financial)
   - **Seasonal**: ~90-day cycle (seasonal affective patterns)
3. Test significance of peaks in the autocorrelation function
4. Cross-reference with life event patterns at the same period

**Output**:
```python
{
    "correlation_type": "pattern_recurrence",
    "event_type": "work.meeting",  # Standup meetings on Mondays
    "emotion_name": "Dread",
    "strength": 0.73,
    "direction": "negative",
    "evidence": {
        "period_days": 7,
        "phase_day": "Monday",
        "phase_hour": 9,
        "autocorrelation_peak": 0.73,
        "p_value": 0.001,
        "weeks_observed": 12,
    }
}
```

---

### 3. Trajectory Shift

**Question**: "Did starting/stopping something change my emotional baseline?"

**Method**: Before/after analysis with change-point detection

```
Baseline before exercise habit:

    Valence: ────────────────┐
                             │  ← Started exercising (change point)
                             └──────────────────────────

    Before avg: -0.15            After avg: +0.18
    Shift: +0.33 (significant, p < 0.01)

    → "Since you started exercising daily, your average valence
       improved by 0.33 over 6 weeks"
```

**Algorithm**:
1. Identify "onset events" — first occurrence of a new recurring event type
2. Compute VAC statistics for `N` days before and after onset
3. Test for significant mean shift (Welch's t-test or Mann-Whitney U)
4. Compute effect size (Cohen's d)
5. Track whether the shift persists over time

**Output**:
```python
{
    "correlation_type": "trajectory_shift",
    "event_type": "wellness.exercise",
    "emotion_name": None,  # Affects overall baseline, not specific emotion
    "strength": 0.65,
    "direction": "positive",
    "evidence": {
        "before_mean_valence": -0.15,
        "after_mean_valence": 0.18,
        "shift": 0.33,
        "effect_size_cohens_d": 0.65,
        "p_value": 0.008,
        "before_days": 30,
        "after_days": 42,
        "onset_date": "2026-06-01",
    }
}
```

---

### 4. Semantic Clustering

**Question**: "Do certain types of events group with certain emotional states?"

**Method**: Embedding-based clustering + VAC aggregation

```
Cluster analysis:

    Cluster A: "Work stress"               Cluster B: "Social connection"
    ┌──────────────────────┐               ┌──────────────────────┐
    │ Events:              │               │ Events:              │
    │   work.deadline      │               │   relationship.      │
    │   work.conflict      │               │     quality_time     │
    │   work.meeting       │               │   relationship.      │
    │                      │               │     social_event     │
    │ Emotions:            │               │                      │
    │   Anxiety (82%)      │               │ Emotions:            │
    │   Frustration (11%)  │               │   Joy (65%)          │
    │   Overwhelm (7%)     │               │   Contentment (28%)  │
    │                      │               │   Gratitude (7%)     │
    │ Avg VAC:             │               │                      │
    │   [-0.5, 0.7, -0.3]  │               │ Avg VAC:             │
    └──────────────────────┘               │   [0.6, 0.4, 0.7]   │
                                           └──────────────────────┘
```

**Algorithm**:
1. Gather all life events and emotional states for a user
2. Embed event descriptions using the same model as chat messages
3. Cluster events by embedding similarity (DBSCAN or HDBSCAN)
4. For each cluster, compute aggregate VAC of associated emotional states
5. Identify which clusters correlate with positive vs. negative emotional profiles

---

## Engine Architecture

```python
class CorrelationEngine:
    """Discovers and maintains emotion-event correlations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analyzers = [
            TemporalProximityAnalyzer(db),
            PatternRecurrenceAnalyzer(db),
            TrajectoryShiftAnalyzer(db),
            SemanticClusterAnalyzer(db),
        ]

    async def analyze_new_event(self, user_id: UUID, event: LifeEvent):
        """Run correlation analysis triggered by a new life event."""
        for analyzer in self.analyzers:
            correlations = await analyzer.analyze(user_id, event)
            for corr in correlations:
                await self._persist_or_update(corr)

    async def full_reanalysis(self, user_id: UUID):
        """Recompute all correlations for a user (batch job)."""
        ...

    async def get_active_correlations(self, user_id: UUID) -> List[Correlation]:
        """Get all active correlations for insight generation."""
        ...

    async def validate_existing(self, user_id: UUID):
        """Re-validate existing correlations with latest data."""
        ...
```

## Thresholds & Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `min_sample_size` | 5 | Minimum observations before reporting a correlation |
| `significance_level` | 0.05 | p-value threshold for statistical significance |
| `min_strength` | 0.3 | Minimum correlation strength to report |
| `revalidation_interval` | 7 days | How often to re-check existing correlations |
| `window_sizes` | [0.5, 2, 6, 24, 48] hours | Temporal proximity windows to test |
| `recurrence_periods` | [1, 7, 14, 30, 90] days | Candidate periods for pattern detection |

## Privacy Considerations

- All correlation analysis runs **per-user only** — never cross-user correlation
- Correlation evidence stores aggregate statistics, not raw event content
- Users can dismiss/delete any discovered correlation
- The engine respects the user's consent level and data retention preferences
- See [Privacy & Ethics](./07-privacy-ethics.md) for full details
