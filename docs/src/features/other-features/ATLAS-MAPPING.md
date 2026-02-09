# Atlas Emotion Mapping - Implementation Plan

**Created**: December 6, 2025, 6:50 PM MDT
**Purpose**: Map AI/LLM emotion names to Brené Brown's 87 Atlas emotions with user notification

---

## 🎯 Problem Statement

**Current Issue:**

- LLM returns emotion names like "Confusion", "Happiness", "Sadness"
- These might not exactly match the 87 emotions in Brené Brown's Atlas
- Relationships reference AI names, causing D3 graph "node not found" errors
- User has no visibility when mapping occurs

**Desired Behavior:**

- AI emotion names automatically mapped to Atlas emotions
- User notified of all mappings (original → mapped)
- UI displays both AI name and Atlas name
- Relationships work correctly with Atlas names
- Transparent logging of mapping process

```bash
# Example: Run the mapping script
python -m scripts.map_atlas_emotions
```

---

## 💡 Solution Architecture

### **Three-Tier Mapping Strategy**

1. **Exact Match** (100% confidence)
   - Case-insensitive comparison
   - Example: "joy" → "Joy"

2. **Fuzzy Match** (80%+ similarity)
   - String similarity using difflib
   - Example: "Happiness" → "Joy" (if high similarity)
   - Example: "Confusing" → "Confusion"

3. **VAC-Based Match** (<0.3 distance)
   - Semantic similarity in emotional space
   - Example: Unknown emotion at VAC (-0.5, 0.3, 0.2) → closest Atlas emotion

4. **No Match** (Flag as unmapped)
   - Show warning to user
   - Use AI name as-is
   - Log for review

---

## 🏗️ Implementation Plan

### **Phase 1: Backend Mapping Service** (30-45 min)

#### Task 1.1: Create AtlasMapper Service

**File**: `listener/app/services/atlas_mapper.py`

```python
# Create new AtlasMapper instance
mapper = AtlasMapper(use_db=True)
await mapper.initialize()
```

**Class**: `AtlasMapper`

- Load all 87 Atlas emotions on initialization
- Cache in memory for fast lookup
- Provide mapping methods

**Methods**:

```python
async def map_emotion(ai_name: str, vac: Optional[dict] = None) -> MappingResult
async def map_emotions_batch(emotions: List[dict]) -> List[MappingResult]
def get_category(emotion_name: str) -> str
```

**Response Structure**:

```python
class MappingResult:
    original_name: str      # AI emotion name
    atlas_name: str | None  # Matched Atlas name
    atlas_id: str | None    # Atlas UUID
    match_method: str       # exact|fuzzy|vac|none
    match_confidence: float # 0-1
    vac: List[float]        # Atlas VAC if mapped
    category: str | None    # Atlas category
```

```python
# Find nearest emotions to coordinates
vac = {'valence': 0.5, 'arousal': 0.5, 'dominance': 0.5}
neighbors = await mapper.get_nearest_neighbors(vac, limit=5)
for n in neighbors:
    print(n.name, n.distance)
```

#### Task 1.2: Integrate into Multi-Emotion Analyzer

**File**: `listener/app/services/multi_emotion_analyzer.py`

**Integration Point**: After LLM returns emotions, before validation

**Steps**:

1. Initialize AtlasMapper
2. For each emotion in LLM response:

    ```python
    # Map an emotion name to coordinates
    result = await mapper.map_emotion("Joy")
    print(result.coordinates) # {'valence': 0.8, 'arousal': 0.6, 'dominance': 0.7}
    ```

- Call `atlas_mapper.map_emotion(emotion_name, vac)`
- Store `original_name` if mapping occurred
- Replace `emotion_name` with `atlas_name`
- Add `match_method` and `match_confidence`
- Get category from Atlas

1. Update relationships to use Atlas names
2. Log all mappings

#### Task 1.3: Update Response Models

**File**: `listener/app/models/multi_emotion_response.py`

**Add Optional Fields**:

```python
class DetectedEmotionResponse(BaseModel):
    emotion_name: str              # Atlas name (mapped)
    original_name: Optional[str]   # AI name if different
    match_method: Optional[str]    # exact|fuzzy|vac|none
    match_confidence: Optional[float]  # 0-1
    category: str
    vac: VACVector
    confidence: float
    prominence: str
```

---

### **Phase 2: Frontend Notification UI** (30-45 min)

#### Task 2.1: Update TypeScript Types

**File**: `experience/web/types/chat.ts`

**Update DetectedEmotion**:

```typescript
export interface DetectedEmotion {
  id: string;
  emotion_name: string;          // Atlas name
  original_name?: string;         // AI name if mapped
  match_method?: 'exact' | 'fuzzy' | 'vac' | 'none';
  match_confidence?: number;      // 0-1
  category: string;
  vac: VAC;
  confidence: number;
  prominence: EmotionProminence;
  voice_alignment?: number;
  voice_interpretation_vac?: VAC;
}
```

#### Task 2.2: Create Mapping Badge Component

**File**: `experience/web/components/admin/EmotionMappingBadge.tsx`

**Features**:

- Small badge showing mapping
- Color-coded by method:
  - Exact: No badge (or green checkmark)
  - Fuzzy: Yellow/amber
  - VAC: Orange
  - None: Red warning
- Tooltip with full details
- Match confidence percentage

**Design**:

```typescript
<div className="inline-flex items-center gap-1 text-xs bg-yellow-900/30 border border-yellow-500/30 rounded px-2 py-1">
  <span className="text-yellow-400">≈</span>
  <span className="text-gray-300">AI:</span>
  <span className="text-white font-medium">{original_name}</span>
  <span className="text-gray-400">→</span>
  <span className="text-green-400 font-medium">{atlas_name}</span>
  <span className="text-gray-400">({(confidence * 100).toFixed(0)}%)</span>
</div>
```

#### Task 2.3: Integrate into MultiEmotionCard

**File**: `experience/web/components/admin/MultiEmotionCard.tsx`

**Display Location**:

- Below emotion name in primary card
- Below emotion name in secondary cards
- In underlying emotion display

**Implementation**:

```typescript
{emotion.original_name && (
  <EmotionMappingBadge
    originalName={emotion.original_name}
    atlasName={emotion.emotion_name}
    matchMethod={emotion.match_method}
    matchConfidence={emotion.match_confidence}
  />
)}
```

#### Task 2.4: Update EmotionBadge Component

**File**: `experience/web/components/admin/EmotionBadge.tsx`

**Add Indicator**:

- Small asterisk (*) or ≈ icon for mapped emotions
- Tooltip shows mapping details
- Subtle visual distinction

---

### **Phase 3: Relationship Consistency** (20-30 min)

#### Task 3.1: Update Relationship Mapping

**In Multi-Emotion Analyzer**:

After mapping emotions:

```python
# Build mapping dict: AI name → Atlas name
name_mapping = {
    emotion.get('original_name', emotion['emotion_name']): emotion['emotion_name']
    for emotion in result_dict['emotions']
}

# Update relationships
for rel in result_dict['relationships']:
    rel['emotion_a'] = name_mapping.get(rel['emotion_a'], rel['emotion_a'])
    rel['emotion_b'] = name_mapping.get(rel['emotion_b'], rel['emotion_b'])
```

#### Task 3.2: Add Logging

Log all mapping decisions:

```python
logger.info(f"Emotion mapping: '{original}' → '{atlas}' (method={method}, confidence={conf:.2f})")
```

---

## 🔧 Technical Implementation Details

### **Fuzzy Matching with difflib**

```python
import difflib

def fuzzy_match(ai_name: str, atlas_emotions: List[str], threshold: float = 0.8) -> Optional[dict]:
    # Get close matches
    matches = difflib.get_close_matches(
        ai_name,
        atlas_emotions,
        n=1,  # Return best match only
        cutoff=threshold  # 80% similarity minimum
    )

    if matches:
        match = matches[0]
        # Calculate exact similarity score
        ratio = difflib.SequenceMatcher(None, ai_name.lower(), match.lower()).ratio()
        return {
            "name": match,
            "confidence": ratio
        }

    return None
```

### **VAC-Based Matching**

Already implemented in `insight_generator.py`:

```python
# Use pgvector for efficient nearest neighbor search
query = text("""
    SELECT emotion_name, vac_vector,
           vac_vector <-> CAST(:vac AS vector) as distance
    FROM atlas_definitions
    WHERE vac_vector IS NOT NULL
    ORDER BY distance ASC
    LIMIT 1
""")

result = await db.execute(query, {"vac": f'[{v},{a},{c}]'})
row = result.first()

if row and row.distance < 0.3:  # Reasonable threshold
    return row
```

---

## 🎨 UX Design Specifications

### **Mapping Badge Variants**

**Exact Match** ✅

- No badge (perfect match)
- Optional green checkmark in tooltip

**Fuzzy Match** (≈)

```text
[≈ AI: Happiness → Atlas: Joy (85%)]
Color: Yellow/Amber
Icon: ≈
```

**VAC Match** (📍)

```text
[📍 AI: Unknown → Atlas: Anxiety (VAC match)]
Color: Orange
Icon: 📍
Note: "Mapped by emotional coordinates"
```

**No Match** (⚠️)

```text
[⚠️ Unmapped: XYZ]
Color: Red
Icon: ⚠️
Action: Show warning, use AI name
```

### **Placement**

**In MultiEmotionCard:**

- Below emotion name
- Subtle, not distracting
- Expandable for details

**In Chat Bubbles:**

- Small icon indicator
- Full details in tooltip

**In Clinical Dashboard:**

- Full mapping details visible
- Sortable/filterable by match method

---

## 📊 Data Flow

```text
LLM Output:
{
  "emotions": [
    {"emotion_name": "Happiness", "vac": {...}, "confidence": 0.85}
  ]
}
  ↓
AtlasMapper.map_emotion("Happiness", vac={...})
  ↓
Try Exact: "Happiness" vs 87 emotions → No match
Try Fuzzy: "Happiness" vs 87 emotions → "Joy" (85% similarity)
Return: {"original_name": "Happiness", "atlas_name": "Joy", "method": "fuzzy", "confidence": 0.85}
  ↓
Update Emotion:
{
  "emotion_name": "Joy",           # Now Atlas name
  "original_name": "Happiness",    # AI name preserved
  "match_method": "fuzzy",
  "match_confidence": 0.85,
  "category": "When Life Is Good",  # From Atlas
  "vac": {...},
  "confidence": 0.85
}
  ↓
Frontend Display:
[Primary Emotion: Joy]
[≈ AI: Happiness → Atlas: Joy (85%)]
```

---

## ⚠️ Edge Cases

### **Multiple Good Matches**

- Take highest confidence match
- Log alternatives for review

### **No Good Match**

- Threshold too low (<80% similarity)
- VAC distance too large (>0.3)
- **Action**: Flag as unmapped, show warning, use AI name

### **Category Mismatch**

- Fuzzy match name but VAC suggests different category
- **Action**: Log warning, prefer fuzzy match, note discrepancy

### **Relationship with Unmapped Emotion**

- If emotion_a or emotion_b unmapped
- **Action**: Still create relationship, show warning badge

---

## 🎯 Success Criteria

### Functionality

- [ ] All AI emotions mapped to Atlas (or flagged)
- [ ] Fuzzy matching working with >80% threshold
- [ ] VAC fallback working for unknown emotions
- [ ] Relationships use Atlas names consistently
- [ ] No "node not found" errors in graph

### UX

- [ ] User sees mapping badges
- [ ] Tooltips show full mapping details
- [ ] Color-coding clear and intuitive
- [ ] Warnings visible for unmapped emotions
- [ ] Doesn't clutter UI

### Logging

- [ ] All mappings logged to console
- [ ] Match methods and confidences recorded
- [ ] Unmapped emotions flagged
- [ ] Available for debugging

---

## 📋 Implementation Checklist

### Backend

- [ ] Create AtlasMapper service with difflib fuzzy matching
- [ ] Add VAC-based fallback
- [ ] Integrate into multi_emotion_analyzer.py
- [ ] Update Pydantic models with optional fields
- [ ] Update relationships to use Atlas names
- [ ] Add comprehensive logging

### Frontend

- [ ] Update TypeScript DetectedEmotion interface
- [ ] Create EmotionMappingBadge component
- [ ] Integrate into MultiEmotionCard (primary, secondary, underlying)
- [ ] Add tooltip with full mapping details
- [ ] Update EmotionBadge with mapping indicator
- [ ] Test with mapped and unmapped emotions

### Testing

- [ ] Test exact match (case variations)
- [ ] Test fuzzy match (similar names)
- [ ] Test VAC match (unknown emotions)
- [ ] Test unmapped emotions (gibberish)
- [ ] Test relationship graph with mapped emotions
- [ ] Verify UI badges display correctly

---

## 🚀 Benefits

1. **Consistency**: All emotions standardized to Atlas
2. **Transparency**: User sees when/how mapping occurs
3. **Trust**: User can verify mappings are reasonable
4. **Robustness**: No more graph errors
5. **Data Quality**: Better analytics with standardized names
6. **Flexibility**: LLM can use natural language, we normalize

---

## 📝 Notes

- Use Python's built-in `difflib` (no new dependencies)
- Reuse VAC matching logic from `insight_generator.py`
- Keep original names for transparency
- Default threshold: 80% for fuzzy, 0.3 for VAC distance
- Make thresholds configurable for tuning

---

**Next Step**: Create AtlasMapper service in Listener
