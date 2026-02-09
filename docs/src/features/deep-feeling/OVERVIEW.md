# Deep Feeling Mode - Implementation Plan

## Overview

The "Deep Feeling" feature transforms the L.O.V.E. platform from single-emotion detection to a sophisticated multi-emotion intelligence system that analyzes emotional complexity, relationships between emotions, and provides goal-oriented pathfinding.

## Core Features

1. **Multi-Emotion Detection (n+1)**: Detect up to 3 concurrent emotions per analysis
2. **Emotion Relationship Analysis**: Understand how emotions interact (complementary, contradictory, masking, amplifying)
3. **Aggregate Emotional State**: Calculate weighted VAC composition and complexity scores
4. **Goal-Oriented Pathfinding**: Calculate paths from current multi-emotion state to user-defined goal emotions
5. **Toggle-Based UI**: Convert buttons to toggles for Warm/Clinical and add Deep Feeling toggle

## Implementation Timeline

**Total Duration**: 6 weeks
**Phases**: 7 major phases

---

## Phase 1: Backend Foundation (Week 1-2)

### 1.1 Database Schema (2-3 days)

#### New Tables

#### `multi_emotion_analyses`

```sql
CREATE TABLE multi_emotion_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    deep_feeling_enabled BOOLEAN DEFAULT TRUE,

    -- Aggregate state
    aggregate_vac FLOAT[3],  -- weighted VAC blend [valence, arousal, connection]
    complexity_score FLOAT,  -- 0-1, higher = more complex/mixed emotions
    emotional_clarity FLOAT,  -- 0-1, higher = clearer, lower = muddied

    -- Temporal pattern
    temporal_pattern VARCHAR(50),  -- 'concurrent', 'sequential', 'emerging'

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_multi_emotion_session (session_id),
    INDEX idx_multi_emotion_message (message_id)
);
```

#### `detected_emotions`

```sql
CREATE TABLE detected_emotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    emotion_id UUID REFERENCES atlas_definitions(id),

    -- Detection data
    confidence FLOAT NOT NULL,  -- 0-1
    prominence VARCHAR(20) NOT NULL,  -- 'primary', 'secondary', 'underlying'
    vac FLOAT[3] NOT NULL,  -- VAC coordinates for this emotion

    -- Voice-content alignment (from prosody)
    voice_alignment FLOAT,  -- 0-1, how well voice prosody matches this emotion
    voice_interpretation_vac FLOAT[3],  -- VAC from voice-only analysis

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_detected_emotion_analysis (analysis_id),
    INDEX idx_detected_emotion_emotion (emotion_id)
);
```

#### `emotion_relationships`

```sql
CREATE TABLE emotion_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    emotion_a_id UUID REFERENCES detected_emotions(id) ON DELETE CASCADE,
    emotion_b_id UUID REFERENCES detected_emotions(id) ON DELETE CASCADE,

    -- Relationship data
    relationship_type VARCHAR(50) NOT NULL,  -- 'complementary', 'contradictory', 'masking', 'amplifying', 'sequential'
    strength FLOAT,  -- 0-1, relationship strength
    description TEXT,  -- Human-readable explanation

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_relationship_analysis (analysis_id),

    -- Constraint: can't have relationship with self
    CHECK (emotion_a_id != emotion_b_id)
);
```

#### `emotion_goals` (for future use)

```sql
CREATE TABLE emotion_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Goal definition
    goal_emotion_id UUID REFERENCES atlas_definitions(id),
    priority INTEGER DEFAULT 1,  -- if multiple goals, which is most important
    target_date TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'achieved', 'abandoned'

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_emotion_goal_session (session_id),
    INDEX idx_emotion_goal_user (user_id),
    INDEX idx_emotion_goal_status (status)
);
```

#### Schema Updates

#### `chat_sessions` table - add deep_feeling_mode column

```sql
ALTER TABLE chat_sessions
ADD COLUMN deep_feeling_mode BOOLEAN DEFAULT FALSE;
```

### 1.2 Enhanced Semantic Analyzer (3-4 days)

**File**: `listener/app/services/multi_emotion_analyzer.py`

**Features**:

- Detect up to 3 emotions per analysis (primary, secondary, underlying)
- Classify emotion relationships
- Include confidence thresholds (>0.4 to be included)
- Enhanced LLM prompt for multi-emotion detection
- Timeout: 60 seconds

**Response Structure**:

```python
class DetectedEmotion(BaseModel):
    emotion_name: str
    category: str
    vac: VAC
    confidence: float
    prominence: str  # 'primary', 'secondary', 'underlying'

class EmotionRelationship(BaseModel):
    emotion_a: str
    emotion_b: str
    type: str  # 'complementary', 'contradictory', 'masking', 'amplifying'
    strength: float
    description: str

class MultiEmotionAnalysis(BaseModel):
    emotions: List[DetectedEmotion]  # 1-3 emotions
    relationships: List[EmotionRelationship]
    aggregate_vac: VAC
    complexity_score: float
    emotional_clarity: float
    temporal_pattern: str
    reasoning: str
```

### 1.3 Emotion Services (3-4 days)

#### `observer/app/services/emotion_relationship_service.py`

- Classify relationship types
- Calculate relationship strength
- Generate human-readable descriptions

#### `observer/app/services/aggregate_emotion_service.py`

- Calculate weighted VAC from multiple emotions
- Compute complexity score (0-1)
- Compute emotional clarity (0-1)
- Determine temporal patterns

#### Enhanced `observer/app/services/path_matrix_service.py`

- Multi-emotion to single-goal pathfinding
- Generate multiple path options (direct, gradual, alchemical)
- Strategy recommendations per path

### 1.4 WebSocket Updates (2 days)

**File**: `observer/app/api/routes/chat_websocket.py`

**Changes**:

- Accept `deep_feeling_mode` parameter in messages
- Route to multi-emotion analyzer when enabled
- Stream emotions progressively as detected
- Stream relationships
- Stream aggregate state
- Maintain 120s timeout for audio (already sufficient)

### 1.5 Chat Service Updates (2 days)

**File**: `observer/app/services/chat_service.py`

**New Methods**:

- `save_multi_emotion_analysis()`
- `get_multi_emotion_analysis()`
- `get_session_emotion_history()`

---

## Phase 2: Frontend Foundation (Week 2-3)

### 2.1 TypeScript Types (1 day)

**File**: `experience/web/types/chat.ts`

**New Types**:

```typescript
export type EmotionProminence = 'primary' | 'secondary' | 'underlying';

export type RelationshipType =
  | 'complementary'
  | 'contradictory'
  | 'masking'
  | 'amplifying'
  | 'sequential';

export interface DetectedEmotion {
  id: string;
  emotion_name: string;
  category: string;
  vac: VAC;
  confidence: number;
  prominence: EmotionProminence;
  voice_alignment?: number;
}

export interface EmotionRelationship {
  id: string;
  emotion_a: DetectedEmotion;
  emotion_b: DetectedEmotion;
  type: RelationshipType;
  strength: number;
  description: string;
}

export interface AggregateState {
  vac: VAC;
  complexity_score: number;
  emotional_clarity: number;
  temporal_pattern: string;
}

export interface MultiEmotionAnalysis {
  id: string;
  emotions: DetectedEmotion[];
  relationships: EmotionRelationship[];
  aggregate: AggregateState;
  reasoning: string;
  timestamp: Date;
}

export interface EmotionPath {
  id: string;
  type: 'direct' | 'gradual' | 'alchemical';
  steps: string[];  // emotion names
  description: string;
  strategy: string;
}
```

### 2.2 Toggle Component (1-2 days)

**File**: `experience/web/components/ui/Toggle.tsx`

**Features**:

- Smooth animation (200ms ease-in-out)
- Left/right label support
- Tooltip support
- Keyboard accessible
- Consistent with existing UI design

### 2.3 Update ChatPanel (1 day)

**Changes**:

- Replace tone button with toggle
- Add Deep Feeling toggle
- Add state management for `deepFeelingMode`
- Session-persist in state
- Send mode to WebSocket

### 2.4 Update useWebSocketChat Hook (1 day)

**New Parameters**:

- `deepFeelingMode: boolean`

**New Callbacks**:

- `onMultiEmotion: (analysis: MultiEmotionAnalysis) => void`
- `onRelationships: (relationships: EmotionRelationship[]) => void`
- `onAggregateState: (state: AggregateState) => void`

---

## Phase 3: Multi-Emotion Display Components (Week 3-4)

### 3.1 Basic Components (2-3 days)

#### `EmotionBadge.tsx`

Single emotion chip with:

- Size variants (small, medium, large)
- Color based on VAC valence
- Confidence display
- Prominence styling

#### `EmotionChipCluster.tsx`

Horizontal layout for chat messages:

- Primary emotion: Large
- Secondary emotions: Medium
- Underlying emotions: Small, semi-transparent
- Flex wrap layout

#### `EmotionCard.tsx`

Detailed card showing:

- Emotion name and icon
- Confidence percentage
- VAC coordinates
- Mini VAC sphere
- Prominence indicator

#### `MultiEmotionAnalysis.tsx`

Full detailed view with:

- Primary emotion card
- Secondary emotion cards (stacked)
- Underlying emotions (collapsible)
- Relationships section
- Aggregate state display

### 3.2 Relationship Components (2-3 days)

#### `RelationshipIndicator.tsx`

Single relationship display with:

- Type-based icon
- Color coding
- Strength indicator
- Description

#### `RelationshipList.tsx`

List all relationships with grouping by type

#### `EmotionRelationshipGraph.tsx`

D3.js force-directed graph:

- Nodes: Emotions (sized by confidence)
- Edges: Relationships (colored by type)
- Interactive (hover, click, drag)
- Zoom/pan support

### 3.3 Aggregate State Components (2-3 days)

#### `AggregateStateCard.tsx`

Summary showing:

- Weighted VAC
- Complexity score (visual bar)
- Temporal pattern
- Emotional clarity

#### `AggregateEmotionSphere.tsx`

Three.js 3D visualization:

- Color blending from component emotions
- Opacity based on complexity
- Particle effects for arousal
- Smooth transitions

---

## Phase 4: Clinical Dashboard Integration (Week 4)

### 4.1 Clinical Components (2-3 days)

#### `clinical/MultiEmotionTable.tsx`

Table showing:

- Emotion name
- Confidence
- VAC coordinates
- Voice alignment score

#### `clinical/VoiceContentAnalysis.tsx`

Three-way comparison:

1. Content-only interpretation
2. Voice-only interpretation
3. Blended interpretation

- Show discrepancies clearly
- Clinical alerts for significant mismatches

#### `clinical/RelationshipGraphClinical.tsx`

Clinical-styled relationship graph

### 4.2 Voice-Content Discrepancy (2 days)

**Backend**: Enhance `insight_generator.py` to return 3 interpretations
**Frontend**: Display all three clearly in clinical dashboard
**Alerts**: Flag discrepancies > 0.5 as clinical alerts

---

## Phase 5: Goal Emotion System (Week 5)

### 5.1 Goal Backend (2 days)

**Model**: `observer/app/models/emotion_goal.py`
**Service**: `observer/app/services/goal_emotion_service.py`

**Features**:

- CRUD operations for goals
- Calculate distance from current to goal
- Integration with path calculator

### 5.2 Goal Frontend (3 days)

#### `GoalEmotionPanel.tsx`

Two-column layout:

- Left: Current state
- Right: Goal selection
- Bottom: Path options (when goal set)

#### `GoalSelector.tsx`

Searchable dropdown for atlas emotions

#### `EmotionPathCard.tsx`

Display single path option:

- Path type (direct/gradual/alchemical)
- Step-by-step emotions
- Strategy description
- Selection action

---

## Phase 6: Integration & Testing (Week 5-6)

### 6.1 End-to-End Testing (2 days)

- Text input → multi-emotion → display
- Audio input → transcription → prosody → multi-emotion
- Voice-content discrepancy detection
- Goal path calculation
- All visualization contexts

### 6.2 Performance Optimization (1-2 days)

- LLM analysis time (target: <30s)
- Database query optimization
- 3D rendering optimization
- Graph rendering optimization

### 6.3 Polish & UX (1-2 days)

- Loading states
- Error handling
- Smooth mode transitions
- Tooltips and help text
- Accessibility audit

---

## Phase 7: Documentation (Week 6)

### 7.1 Technical Documentation (1 day)

- Architecture document
- Multi-emotion algorithm documentation
- Relationship classification docs
- API documentation

### 7.2 User Guide (1 day)

- When to use Deep Feeling mode
- Understanding emotion relationships
- Using goal emotion system
- Screenshots and examples

---

## Success Metrics

- **Accuracy**: Multi-emotion confidence >70% average
- **Performance**: <45s audio, <20s text analysis
- **UX**: Smooth transitions, no lag
- **Clinical**: 80%+ voice-content discrepancy detection
- **Utility**: Positive user feedback on path recommendations

---

## Dependencies

```json
{
  "dependencies": {
    "d3": "^7.8.5",
    "@types/d3": "^7.4.0"
  }
}
```

---

## Rollout Strategy

1. **Week 1-2**: Backend complete, Postman testable
2. **Week 3**: Basic UI working, single emotion in new format
3. **Week 4**: Multi-emotion display complete, clinical updated
4. **Week 5**: Goal system complete, full feature ready
5. **Week 6**: Polished, tested, documented, production-ready

---

## Configuration

### Session Settings

- `deep_feeling_mode`: Session-persistent (remembered during session)
- Default: `false` (single emotion mode)
- Can be toggled any time during session

### Analysis Timeouts

- Text analysis: 60 seconds
- Audio analysis: 120 seconds (already configured)

### Confidence Thresholds

- Minimum to include: 0.4
- Primary emotion: Highest confidence
- Secondary: 0.5-0.8 range
- Underlying: May have high confidence but "hidden" in expression
