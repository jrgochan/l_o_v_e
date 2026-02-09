# Data-Driven Architecture Refactoring Plan
**Created:** 2026-01-03
**Goal:** Extract hardcoded data to JSON for better maintainability
**Status:** 🚀 Ready to Implement

---

## Executive Summary

Refactor the Observer seeding system from **hardcoded Python data structures** to **JSON-first architecture** where canonical data lives in versioned JSON files and scripts simply load and validate them.

### Current State

**Mixed Approach:**
- ✅ **Enhanced strategies:** Already use JSON (7 files) - GOOD PATTERN!
- ✅ **Demo data:** Already JSON (journeys, users, bootstrap)
- ❌ **Atlas emotions:** 640+ lines hardcoded in seed_atlas.py
- ❌ **Base transition data:** Hardcoded arrays (strategies, patterns, categories, matrix)

### Target State

**JSON-First:**
- 🎯 **All canonical data** in `observer/data/` as JSON
- 🎯 **Seed scripts** become simple loaders with validation
- 🎯 **Schema validation** ensures data quality
- 🎯 **Non-developers** can update emotion definitions, strategies, etc.

---

## Benefits Analysis

### 🎓 Knowledge Management
- **Single Source of Truth:** Data lives in one place, not embedded in code
- **Version Control:** Git shows exactly what changed ("Added Joy" vs "Modified line 234")
- **Code Review:** JSON diffs are human-readable
- **Documentation:** JSON is self-documenting with proper structure

### 👥 Collaboration
- **Non-Developer Edits:** Clinicians can update strategies without Python knowledge
- **Research Integration:** Import from academic papers, CSV exports, etc.
- **External Tools:** JSON editors, validators, converters
- **Quality Assurance:** Structured reviews of data changes

### 🔧 Maintainability
- **Separation of Concerns:** Data vs. Logic clearly separated
- **Reduced Code:** 640 lines → 50 line loader + JSON
- **Testing:** Multiple test datasets (minimal, full, clinical-only)
- **Debugging:** Easier to spot data errors in JSON than Python dict

### 🚀 Operations
- **Multi-Environment:** Different data for dev/staging/prod
- **A/B Testing:** Easy to test strategy variations
- **Hot Reload:** Update data without code deployment
- **Rollback:** Git revert data changes independently of code

### 📊 Data Quality
- **JSON Schema Validation:** Catch errors before database
- **Required Fields:** Enforce data completeness
- **Type Safety:** Validate VAC coordinates, difficulty levels, etc.
- **Consistency:** Automated checks across files

---

## Implementation Plan

### Phase 1: Atlas Emotions ⚡ (Highest Impact)
**Effort:** 2-3 hours
**Impact:** 640 lines of code → simple JSON loader
**Priority:** HIGH

#### Task 1.1: Create emotions.json
```json
{
  "version": "1.0",
  "source": "Brené Brown - Atlas of the Heart (2021)",
  "metadata": {
    "total_emotions": 87,
    "categories": 13,
    "coordinate_system": "VAC"
  },
  "emotions": [
    {
      "emotion_name": "Stress",
      "category": "When Things Are Uncertain or Too Much",
      "definition": "Physical and emotional tension...",
      "vac": [-0.4, 0.6, -0.2],
      "haptic_pattern_id": "TENSE_PULSE"
    },
    ... 87 total
  ]
}
```

**Files:**
- `observer/data/atlas/emotions.json` (NEW)
- `observer/data/atlas/README.md` (NEW - explains structure)

#### Task 1.2: Create JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "emotions"],
  "properties": {
    "emotions": {
      "type": "array",
      "minItems": 87,
      "maxItems": 87,
      "items": {
        "type": "object",
        "required": ["emotion_name", "category", "definition", "vac"],
        "properties": {
          "emotion_name": {"type": "string"},
          "vac": {
            "type": "array",
            "items": {"type": "number", "minimum": -1, "maximum": 1},
            "minItems": 3,
            "maxItems": 3
          }
        }
      }
    }
  }
}
```

**File:** `observer/data/atlas/schemas/emotions.schema.json` (NEW)

#### Task 1.3: Refactor seed_atlas.py
```python
def load_atlas_emotions() -> List[Dict]:
    """Load Atlas emotions from JSON file."""
    json_path = Path(__file__).parent.parent / "data/atlas/emotions.json"
    with open(json_path, 'r') as f:
        data = json.load(f)
    return data['emotions']

# OLD: ATLAS_EMOTIONS = [640 lines...]
# NEW: ATLAS_EMOTIONS = load_atlas_emotions()  # 1 line!
```

**Result:** Seed script becomes 50% smaller, data easy to edit

---

### Phase 2: Category System 📊
**Effort:** 1-2 hours
**Impact:** Matrix visualization, easier updates
**Priority:** HIGH

#### Task 2.1: Create categories.json
```json
{
  "version": "1.0",
  "categories": [
    {
      "id": 1,
      "name": "When Things Are Uncertain or Too Much",
      "short_name": "Uncertain",
      "description": "Emotions arising from...",
      "color_hex": "#FF6B6B",
      "typical_vac_range": {
        "valence": [-0.7, -0.2],
        "arousal": [0.3, 0.9],
        "connection": [-0.5, 0.3]
      },
      "emotion_count": 9
    },
    ... 13 total
  ]
}
```

**File:** `observer/data/atlas/categories.json` (NEW)

#### Task 2.2: Create category_transitions.json
```json
{
  "version": "1.0",
  "matrix": {
    "from_categories": ["Uncertain", "Compare", ...],
    "to_categories": ["Uncertain", "Compare", ...],
    "difficulty_matrix": [
      [0.0, 0.7, 0.4, ...],  // Row 1
      [0.6, 0.0, 0.3, ...],  // Row 2
      ... 13 rows total
    ]
  },
  "difficulty_interpretation": {
    "0.0-0.3": "Easy - natural progression",
    "0.3-0.6": "Moderate - achievable with work",
    "0.6-0.9": "Difficult - requires support",
    "0.9-1.0": "Prohibited - needs bridge emotions"
  }
}
```

**File:** `observer/data/atlas/category_transitions.json` (NEW)

**Benefits:**
- Matrix easier to visualize and edit
- Can generate heatmap visualizations
- Researchers can update difficulty scores

---

### Phase 3: Base Strategies & Patterns 📋
**Effort:** 1-2 hours
**Impact:** Consistency with enhanced strategies
**Priority:** MEDIUM

#### Task 3.1: Extract core strategies
Move 20 hardcoded strategies from `seed_transition_data.py` to:

**File:** `observer/data/strategies/base/core_strategies.json`

Format matches existing enhanced strategies:
```json
{
  "category": "Core Emotion Regulation",
  "source": "Research-based fundamentals",
  "strategies": [
    {
      "name": "4-7-8 Breathing Technique",
      "type": "response_modulation",
      "description": "...",
      "steps": [...],
      "time_required": "5-10 minutes",
      "difficulty": 1,
      "evidence": "meta_analysis",
      "citations": [...]
    },
    ... 20 total
  ]
}
```

#### Task 3.2: Extract base patterns
Move 5 hardcoded patterns from `seed_transition_data.py` to:

**File:** `observer/data/patterns/base/core_patterns.json`

Format matches existing expanded patterns.

#### Task 3.3: Extract pattern-strategy mappings
Move hardcoded mappings to:

**File:** `observer/data/mappings/pattern_strategy_mappings.json`

```json
{
  "version": "1.0",
  "mappings": [
    {
      "pattern_name": "High Arousal to Low Arousal",
      "strategies": [
        {
          "strategy_name": "4-7-8 Breathing Technique",
          "recommendation_order": 1,
          "effectiveness_rating": 4.5,
          "applicability_conditions": {...}
        },
        ...
      ]
    },
    ...
  ]
}
```

**Benefits:** Clear which strategies work for which patterns

---

### Phase 4: Validation & Tooling 🛡️
**Effort:** 2-3 hours
**Impact:** Data quality assurance
**Priority:** MEDIUM

#### Task 4.1: JSON Schema Definitions
Create schemas for all data types:
- `data/atlas/schemas/emotions.schema.json`
- `data/atlas/schemas/categories.schema.json`
- `data/atlas/schemas/category_transitions.schema.json`
- `data/strategies/schemas/strategy.schema.json`
- `data/patterns/schemas/pattern.schema.json`

#### Task 4.2: Validation Script
**File:** `observer/scripts/validate_data.py`

```python
"""
Validate all JSON data files against their schemas.

Usage:
    python scripts/validate_data.py
    python scripts/validate_data.py --file data/atlas/emotions.json
"""

import json
import jsonschema
from pathlib import Path

def validate_all_data():
    """Validate all JSON files against schemas."""

    validations = [
        ("data/atlas/emotions.json", "data/atlas/schemas/emotions.schema.json"),
        ("data/atlas/categories.json", "data/atlas/schemas/categories.schema.json"),
        # ... etc
    ]

    errors = []
    for data_file, schema_file in validations:
        try:
            with open(data_file) as f:
                data = json.load(f)
            with open(schema_file) as f:
                schema = json.load(f)

            jsonschema.validate(data, schema)
            print(f"✅ {data_file} - Valid")
        except Exception as e:
            errors.append((data_file, str(e)))
            print(f"❌ {data_file} - {e}")

    return len(errors) == 0
```

#### Task 4.3: Pre-commit Hook
**File:** `.pre-commit-config.yaml` (update)

Add JSON validation hook:
```yaml
- repo: local
  hooks:
    - id: validate-observer-data
      name: Validate Observer JSON Data
      entry: python observer/scripts/validate_data.py
      language: python
      pass_filenames: false
      files: 'observer/data/.*\.json$'
```

**Benefits:** Catch data errors before commit

---

### Phase 5: Documentation & Testing 📚
**Effort:** 1-2 hours
**Impact:** Team onboarding, data quality
**Priority:** LOW

#### Task 5.1: Data Documentation
**File:** `observer/data/README.md`

```markdown
# Observer Canonical Data

This directory contains the single source of truth for all Observer data.

## Structure

- `atlas/` - Emotion definitions and category system
- `strategies/` - Evidence-based emotion regulation strategies
- `patterns/` - Transition patterns and relationships
- `mappings/` - Pattern-strategy mappings
- `demo_*.json` - Demo/test data

## Editing Data

1. Edit the appropriate JSON file
2. Run validation: `python scripts/validate_data.py`
3. Test: `python scripts/seed_all.py --dry-run`
4. Commit with clear message: "Added Contentment emotion"

## JSON Schemas

All data files have corresponding `.schema.json` files in `schemas/`
directories. These define required fields, types, and constraints.

## Adding New Emotions

Edit `atlas/emotions.json`, following this structure:
...
```

#### Task 5.2: Test Datasets
Create minimal test datasets:

**File:** `observer/data/test/minimal_emotions.json`
```json
{
  "version": "1.0-test",
  "emotions": [
    {"emotion_name": "Joy", "category": "When Life Is Good", ...},
    {"emotion_name": "Sadness", "category": "When We're Hurting", ...},
    {"emotion_name": "Anger", "category": "When We Feel Wronged", ...}
  ]
}
```

**Use:** Fast testing without seeding all 87 emotions

---

## Implementation Sequence

### Tonight (Phase 1 - Critical Path)
1. ✅ Extract Atlas emotions to JSON
2. ✅ Update seed_atlas.py to load from JSON
3. ✅ Test seeding works
4. ✅ Document in SEEDING_SYSTEM_README.md

**Result:** Biggest code reduction, immediate value

### Tomorrow (Phase 2 - Category System)
1. Extract categories to JSON
2. Extract difficulty matrix to JSON
3. Update seed_transition_data.py
4. Test transitions work

**Result:** Matrix easier to visualize and update

### Weekend (Phases 3-5 - Polish)
1. Extract base strategies and patterns
2. Add JSON Schema validation
3. Create validation script
4. Write comprehensive documentation
5. Add pre-commit hooks

**Result:** Production-grade data management

---

## File Structure (Target State)

```
observer/data/
├── README.md                        ← Documentation (NEW)
├── atlas/
│   ├── README.md                    ← Atlas-specific docs (NEW)
│   ├── emotions.json                ← 87 emotions (NEW)
│   ├── categories.json              ← 13 categories (NEW)
│   ├── category_transitions.json   ← 13×13 matrix (NEW)
│   └── schemas/
│       ├── emotions.schema.json    ← Validation (NEW)
│       ├── categories.schema.json  ← Validation (NEW)
│       └── transitions.schema.json ← Validation (NEW)
├── strategies/
│   ├── base/
│   │   └── core_strategies.json    ← 20 base strategies (NEW)
│   ├── enhanced/                    ← ✅ Already exists
│   │   ├── dbt_skills.json
│   │   ├── mindfulness.json
│   │   └── ... (7 files)
│   └── schemas/
│       └── strategy.schema.json    ← Validation (NEW)
├── patterns/
│   ├── base/
│   │   └── core_patterns.json      ← 5 base patterns (NEW)
│   ├── expanded/                    ← ✅ Already exists
│   │   ├── anxiety_regulation.json
│   │   └── ... (5 files)
│   └── schemas/
│       └── pattern.schema.json     ← Validation (NEW)
├── mappings/
│   ├── pattern_strategy_mappings.json  ← NEW
│   └── schemas/
│       └── mapping.schema.json     ← Validation (NEW)
├── test/                            ← Test datasets (NEW)
│   ├── minimal_emotions.json
│   ├── test_strategies.json
│   └── test_patterns.json
├── bootstrap_patterns.json          ← ✅ Already exists
├── demo_journeys.json               ← ✅ Already exists
└── demo_users.json                  ← ✅ Already exists
```

---

## Script Refactoring

### Before (seed_atlas.py)
```python
# 640 lines of hardcoded data
ATLAS_EMOTIONS = [
    {
        "emotion_name": "Stress",
        "category": "When Things Are Uncertain or Too Much",
        "definition": "Physical and emotional tension...",
        "vac": [-0.4, 0.6, -0.2],
        "haptic_pattern_id": "TENSE_PULSE"
    },
    ... 87 emotions hardcoded ...
]

async def seed_atlas():
    for emotion in ATLAS_EMOTIONS:
        # Process emotion
```

### After (seed_atlas.py)
```python
def load_atlas_emotions() -> Dict:
    """Load Atlas emotions from canonical JSON file."""
    data_path = Path(__file__).parent.parent / "data/atlas/emotions.json"

    with open(data_path, 'r') as f:
        data = json.load(f)

    # Optional: Validate against schema
    validate_emotions_data(data)

    return data

async def seed_atlas():
    data = load_atlas_emotions()
    for emotion in data['emotions']:
        # Process emotion (same logic as before)
```

**Impact:**
- 640 lines → 15 line loader
- Data lives in `data/atlas/emotions.json`
- Easy to update, review, version control

---

## JSON Schema Examples

### Emotion Schema (Strict Validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Atlas Emotion",
  "type": "object",
  "required": ["emotion_name", "category", "definition", "vac"],
  "properties": {
    "emotion_name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 100
    },
    "category": {
      "type": "string",
      "enum": [
        "When Things Are Uncertain or Too Much",
        "When We Compare",
        ... 13 categories
      ]
    },
    "definition": {
      "type": "string",
      "minLength": 10
    },
    "vac": {
      "type": "array",
      "description": "[valence, arousal, connection]",
      "items": {
        "type": "number",
        "minimum": -1.0,
        "maximum": 1.0
      },
      "minItems": 3,
      "maxItems": 3
    },
    "haptic_pattern_id": {
      "type": "string",
      "enum": ["HEARTBEAT", "TENSE_PULSE", "GENTLE_PULSE", "SHARP_STRIKE", "HEAVY_THROB", "LIGHT_PULSE", "WARM_PULSE", "RAPID_PULSE"]
    }
  }
}
```

**Benefits:**
- Prevents invalid VAC coordinates (e.g., [2.0, 0.5, 0.3])
- Enforces required fields
- Catches typos in category names
- Documents expected structure

---

## Migration Strategy (Low Risk)

### Step 1: Create JSON Files (No Risk)
- Extract data from Python to JSON
- Keep Python code working (don't delete yet)
- Test JSON loads correctly

### Step 2: Update Loaders (Low Risk)
- Modify seed scripts to load from JSON
- Fall back to hardcoded if JSON missing (graceful degradation)
- Test both paths work

### Step 3: Remove Hardcoded (After Verification)
- Delete hardcoded arrays
- Remove fallback logic
- Clean, simple loaders remain

### Step 4: Add Validation (Progressive Enhancement)
- Add JSON Schema validation
- Create validation script
- Add to CI/CD

**Each step is independently deployable - no big-bang!**

---

## Testing Strategy

### Validation Testing
```bash
# Validate all JSON files
python scripts/validate_data.py

# Validate specific file
python scripts/validate_data.py --file data/atlas/emotions.json

# Expected output:
# ✅ data/atlas/emotions.json - Valid
# ✅ data/strategies/base/core_strategies.json - Valid
# ✅ All data files valid
```

### Seeding Testing
```bash
# Dry run (show what would be loaded)
python scripts/seed_atlas.py --dry-run

# Verify JSON loads correctly
python -c "import json; print(json.load(open('observer/data/atlas/emotions.json'))['metadata'])"

# Full seed test
python scripts/seed_all.py --level=enhanced --verify
```

### Integration Testing
```bash
# Test Observer API with new data
cd observer
uvicorn app.main:app --reload &

# Query emotions
curl http://localhost:8000/api/atlas/emotions

# Test path computation (original error case)
curl -X POST http://localhost:8000/observer/transition-path \
  -d '{"from_emotion": "Heartbreak", "to_emotion": "Curiosity"}'
```

---

## Success Criteria

### Phase 1 (Atlas) Complete When:
- [ ] `data/atlas/emotions.json` created with all 87 emotions
- [ ] `data/atlas/emotions.schema.json` validates the data
- [ ] `seed_atlas.py` loads from JSON successfully
- [ ] Seeding completes without errors
- [ ] Database contains all 87 emotions
- [ ] No regression in functionality

### All Phases Complete When:
- [ ] All canonical data in JSON files
- [ ] All seed scripts load from JSON
- [ ] JSON Schema validation passes
- [ ] Documentation complete
- [ ] Tests pass
- [ ] Fresh setup works perfectly

---

## Rollback Plan

If issues arise:

```bash
# Revert to previous commit
git revert HEAD

# Or revert specific file
git checkout HEAD~1 observer/scripts/seed_atlas.py

# Database is unaffected - migrations still work
```

**Safe because:** Migrations are separate from seeding!

---

## Timeline Estimate

**Phase 1 (Atlas):** Tonight (2-3 hours)
**Phase 2 (Categories):** Tomorrow (1-2 hours)
**Phase 3 (Strategies/Patterns):** Weekend (2-3 hours)
**Phase 4 (Validation):** Weekend (2-3 hours)
**Phase 5 (Docs):** Sunday (1-2 hours)

**Total:** 8-13 hours over 3 days
**Target:** Complete by Monday ✅

---

## Future Enhancements

Once JSON-first architecture is established:

### API-Based Updates
```python
@router.post("/admin/emotions")
async def update_emotion(emotion_id: UUID, data: EmotionUpdate):
    """Update emotion definition via API."""
    # Load JSON
    # Validate change
    # Update JSON file
    # Trigger re-seed (optional)
```

### Web-Based Editor
- Admin UI for editing emotions
- Form validation
- Visual VAC coordinate picker
- One-click publish

### Import Tools
- CSV → JSON converter
- Research paper → strategy extractor
- Bulk import from external sources

### Analytics
- Track which strategies are most effective
- Update effectiveness ratings in JSON
- Data-driven curation

---

## Immediate Next Steps

1. **Create** `data/atlas/emotions.json` (extract from seed_atlas.py)
2. **Create** JSON Schema for validation
3. **Update** seed_atlas.py to load from JSON
4. **Test** seeding works
5. **Commit** with clear message

Ready to start Phase 1?
