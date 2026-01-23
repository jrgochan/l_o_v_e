# Atlas of the Heart - Canonical Data

This directory contains the **single source of truth** for emotional data from Brené Brown's "Atlas of the Heart" (2021).

## Files

### `emotions.json`
**Purpose:** Complete database of 87 emotions with VAC coordinates

**Structure:**
```json
{
  "version": "1.0",
  "source": "Brené Brown - Atlas of the Heart (2021)",
  "metadata": {
    "total_emotions": 87,
    "categories": 13,
    "coordinate_system": "VAC (Valence, Arousal, Connection)"
  },
  "emotions": [
    {
      "emotion_name": "Joy",
      "category": "When Life Is Good",
      "definition": "Intense, brief feeling of positive emotion...",
      "vac": [0.9, 0.7, 0.8],
      "haptic_pattern_id": "LIGHT_PULSE"
    }
  ]
}
```

**VAC Coordinates:**
- **Valence:** -1.0 (negative) to +1.0 (positive)
- **Arousal:** -1.0 (low activation) to +1.0 (high activation)  
- **Connection:** -1.0 (disconnection) to +1.0 (deep connection)

**Used By:** `scripts/seed_atlas.py`

## Editing Guidelines

### Adding a New Emotion

1. Edit `emotions.json`
2. Add to appropriate category
3. Assign VAC coordinates based on research
4. Choose appropriate haptic pattern
5. Run validation: `python scripts/validate_data.py` (coming soon)
6. Test: `python scripts/seed_atlas.py --dry-run`

### Modifying Existing Emotions

1. Find emotion by name in `emotions.json`
2. Update definition, VAC, or other fields
3. Document reason in commit message
4. Re-seed database: `python scripts/seed_atlas.py`

### VAC Coordinate Guidelines

**Valence Examples:**
- Joy: +0.9 (very positive)
- Contentment: +0.6 (moderately positive)
- Confusion: -0.2 (slightly negative)
- Despair: -0.9 (very negative)

**Arousal Examples:**
- Calm: -0.7 (low activation)
- Interest: +0.5 (moderate activation)
- Panic: +0.9 (high activation)

**Connection Examples:**
- Belonging: +1.0 (maximum connection)
- Compassion: +0.9 (high connection)
- Loneliness: -0.9 (high disconnection)
- Shame: -1.0 (maximum disconnection)

## Haptic Pattern IDs

Available patterns for emotional feedback:
- `HEARTBEAT` - Rhythmic, connective
- `GENTLE_PULSE` - Soft, calming
- `WARM_PULSE` - Comforting
- `LIGHT_PULSE` - Uplifting  
- `TENSE_PULSE` - Uncomfortable tension
- `RAPID_PULSE` - Anxious, quick
- `SHARP_STRIKE` - Sudden, jarring
- `HEAVY_THROB` - Weighty, difficult

## Version History

**v1.0 (2026-01-03):**
- Initial extraction from hardcoded Python to JSON
- 87 emotions across 13 categories
- Based on Atlas of the Heart research

## Research Citation

Brown, B. (2021). *Atlas of the Heart: Mapping Meaningful Connection and the Language of Human Experience*. Random House.
