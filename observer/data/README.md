# Observer Canonical Data

**Single source of truth** for all Observer emotional intelligence data.

## Philosophy

All canonical data lives in **version-controlled JSON files**, not hardcoded in Python scripts. This enables:

- 🎓 **Non-developer edits** - Clinicians can update without Python knowledge
- 📊 **Clear version control** - See exactly what changed
- ✅ **Validation** - JSON Schema ensures data quality
- 🔧 **Maintainability** - Separation of data and logic
- 🌍 **Multi-environment** - Different datasets for dev/staging/prod

## Directory Structure

```
data/
├── atlas/                    ← Emotional Atlas (87 emotions)
│   ├── emotions.json         ← 87 emotions with VAC coordinates
│   ├── categories.json       ← 13 categories with metadata
│   ├── category_transitions.json  ← 13×13 difficulty matrix
│   ├── README.md            ← Atlas documentation
│   └── schemas/             ← JSON Schema validation (future)
│
├── strategies/              ← Emotion Regulation Strategies
│   ├── base/
│   │   └── core_strategies.json  ← 19 fundamental strategies
│   └── enhanced/            ← 50+ advanced strategies (7 files)
│       ├── dbt_skills.json
│       ├── act_techniques.json
│       ├── mindfulness.json
│       ├── somatic.json
│       ├── social_connection.json
│       ├── creative_expression.json
│       └── meaning_making.json
│
├── patterns/                ← Transition Patterns
│   ├── base/
│   │   └── core_patterns.json    ← 5 fundamental patterns
│   └── expanded/            ← 13 specialized patterns (5 files)
│       ├── anxiety_regulation.json
│       ├── grief_integration.json
│       ├── joy_cultivation.json
│       ├── shame_resilience.json
│       └── trauma_processing.json
│
├── mappings/                ← Pattern-Strategy Relationships
│   └── pattern_strategy_mappings.json  ← Which strategies for which patterns
│
├── bootstrap_patterns.json  ← Cold-start patterns for new users
├── demo_journeys.json       ← Demo journey data (dev only)
└── demo_users.json          ← Demo user data (dev only)
```

## Data Files

### Atlas System
**`atlas/emotions.json`** (23 KB)
- 87 emotions from "Atlas of the Heart"
- VAC coordinates for each
- Categories, definitions, haptic patterns
- Used by: `scripts/seed_atlas.py`

**`atlas/categories.json`** (6 KB)
- 13 emotional categories
- Metadata, colors, VAC ranges
- Used by: `scripts/seed_transition_data.py`

**`atlas/category_transitions.json`** (3 KB)
- 13×13 difficulty matrix (169 transitions)
- Difficulty interpretations
- Bridge requirements
- Used by: `scripts/seed_transition_data.py`

### Strategy System
**`strategies/base/core_strategies.json`** (16 KB)
- 19 fundamental emotion regulation strategies
- Evidence levels, difficulty ratings
- Detailed steps, citations
- Used by: `scripts/seed_transition_data.py`

**`strategies/enhanced/*.json`** (7 files)
- 50+ advanced strategies
- Organized by therapeutic approach
- Used by: `scripts/seed_enhanced_strategies.py`

### Pattern System
**`patterns/base/core_patterns.json`** (3 KB)
- 5 fundamental transition patterns
- VAC change characteristics
- Difficulty scores, examples
- Used by: `scripts/seed_transition_data.py`

**`patterns/expanded/*.json`** (5 files)
- 13 specialized transition patterns
- Clinical-grade pattern definitions
- Used by: `scripts/seed_expanded_patterns.py`

### Mappings
**`mappings/pattern_strategy_mappings.json`** (4 KB)
- Maps which strategies work for which patterns
- Recommendation order, effectiveness ratings
- Used by: `scripts/seed_transition_data.py`

### Demo Data
**`demo_journeys.json`, `demo_users.json`, `bootstrap_patterns.json`**
- Development and testing data
- Bootstrap patterns for cold-start
- Used by: Optional seeding flags

## Editing Guidelines

### Update Emotion Definition
1. Edit `atlas/emotions.json`
2. Find emotion by name
3. Update definition or VAC
4. Commit: "Updated Joy definition based on research"
5. Re-seed: `cd observer && python scripts/seed_atlas.py`

### Add New Strategy
1. Choose file: `strategies/base/` or `strategies/enhanced/`
2. Add strategy following JSON structure
3. Include: name, type, steps, difficulty, evidence, citations
4. Re-seed: `python scripts/seed_all.py --level=enhanced`

### Modify Difficulty Matrix
1. Edit `atlas/category_transitions.json`
2. Update matrix values [0.0-1.0]
3. Visualize: Can generate heatmap from JSON
4. Re-seed transitions

## JSON Structure Standards

### Emotions
```json
{
  "emotion_name": "Joy",
  "category": "When Life Is Good",
  "definition": "Intense, brief feeling...",
  "vac": [0.9, 0.7, 0.8],
  "haptic_pattern_id": "LIGHT_PULSE"
}
```

### Strategies
```json
{
  "name": "Strategy Name",
  "type": "cognitive_reappraisal",
  "description": "...",
  "steps": ["Step 1", "Step 2", ...],
  "time_required": "10-20 minutes",
  "difficulty": 3,
  "evidence": "rct",
  "citations": [...]
}
```

### Patterns
```json
{
  "name": "Pattern Name",
  "from_cat": "Category A",
  "to_cat": "Category B",
  "vac_change": {...},
  "difficulty": 0.5,
  "reasoning": "...",
  "examples": [...]
}
```

## Code Reduction Achieved

**Before (Hardcoded):**
- seed_atlas.py: 811 lines
- seed_transition_data.py: 730 lines
- **Total: 1,541 lines**

**After (JSON-Driven):**
- seed_atlas.py: 180 lines
- seed_transition_data.py: 246 lines
- **Total: 426 lines**

**Result: 72% reduction** (1,115 lines eliminated!)

## Benefits Realized

✅ **Maintainability**: Data changes don't require Python edits
✅ **Collaboration**: Non-developers can contribute
✅ **Version Control**: Clear diffs ("Added Contentment")
✅ **Testing**: Easy to create test datasets
✅ **Documentation**: JSON is self-documenting
✅ **Tooling**: Can build editors, validators, visualizers

## Future Enhancements

### JSON Schema Validation (Phase 4)
```bash
python scripts/validate_data.py
# Validates all JSON against schemas
# Prevents invalid VAC coordinates, missing fields, etc.
```

### Web-Based Editor
- Visual VAC coordinate picker
- Strategy form with validation
- One-click publish to database

### Import/Export Tools
- CSV ↔ JSON converters
- Research paper → strategy extractor
- External tool integration

## Version History

**v1.0 (2026-01-03):**
- Extracted all hardcoded data to JSON
- 87 emotions, 13 categories, 169 transitions
- 19 base + 50 enhanced strategies
- 5 base + 13 expanded patterns
- Complete pattern-strategy mappings

## Research Citations

- Brown, B. (2021). *Atlas of the Heart*. Random House.
- Gross, J.J. (1998). Process Model of Emotion Regulation
- Linehan, M.M. (2015). DBT Skills Training Manual
- Hayes, S.C. (1999). Acceptance and Commitment Therapy
- Kabat-Zinn, J. (1990). Full Catastrophe Living

## Contributing

To update canonical data:
1. Edit appropriate JSON file
2. Follow existing structure
3. Run validation (when available)
4. Test with `--dry-run`
5. Commit with clear message
6. Re-seed database if needed

**Remember:** These JSON files are the single source of truth!
