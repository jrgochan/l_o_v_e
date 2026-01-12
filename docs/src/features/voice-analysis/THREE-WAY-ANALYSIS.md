# Voice-Content 3-Way Analysis - Technical Specifications

**Date**: December 6, 2025  
**Phase**: Phase 1, Task 1.2  
**Priority**: Medium-High (Clinical Enhancement)  
**Complexity**: High  
**Estimated Effort**: 2-3 days (16-24 hours)

---

## 📋 Executive Summary

### What Is It?

A clinical analysis component that shows three separate emotion interpretations side-by-side:

1. **Content-Only**: Emotion detected from text/semantic content alone
2. **Voice-Only**: Emotion detected from vocal prosody features alone
3. **Blended**: Current approach combining both sources

### Why Is It Valuable?

- **Clinical Insight**: Reveals emotional incongruence (saying one thing, feeling another)
- **Diagnostic Tool**: Helps identify suppression, masking, or alexithymia
- **Research Data**: Provides rich data on emotion expression vs experience
- **Validation**: Shows when voice and content align (high reliability) or conflict (needs exploration)

### Current State

The system currently:

- ✅ Detects emotions using both text and voice together (blended approach)
- ✅ Calculates voice energy vs content arousal correlation
- ✅ Flags discrepancies >0.5
- ❌ Does NOT separate content-only vs voice-only interpretations

---

## 🎯 Clinical Use Cases

### Use Case 1: Emotional Suppression Detection

**Scenario**: Client says "I'm fine" (content suggests calm) but voice shows high stress.

**3-Way Analysis Shows:**

- Content-Only: "Contentment" (positive, low arousal)
- Voice-Only: "Anxiety" (negative, high arousal)
- Blended: "Ambivalence" (mixed signals)

**Clinical Value**: Clinician can explore what the client is suppressing or not acknowledging.

### Use Case 2: Alexithymia Assessment

**Scenario**: Client says emotionally charged words but voice is flat.

**3-Way Analysis Shows:**

- Content-Only: "Anger" (negative, high arousal)
- Voice-Only: "Apathy" (neutral, low arousal)
- Blended: "Confusion" (contradictory signals)

**Clinical Value**: May indicate alexithymia (difficulty identifying emotions) or dissociation.

### Use Case 3: Validation of Emotional Authenticity

**Scenario**: Client expresses sadness in both words and voice.

**3-Way Analysis Shows:**

- Content-Only: "Sadness" (negative, low arousal)
- Voice-Only: "Sadness" (negative, low arousal)
- Blended: "Sadness" (consistent)

**Clinical Value**: High alignment increases confidence in assessment.

---

## 🏗️ Technical Architecture

### Current Architecture

```text
User Input (text + audio)
    ↓
Listener Service
    ├─ Transcription
    ├─ Prosody Analysis
    └─ Multi-Emotion Analysis (LLM with text + prosody together)
    ↓
Observer Service
    ├─ Atlas Mapping
    ├─ Insight Generation
    └─ Clinical Alerts
    ↓
Frontend Display (single blended emotion)
```

### Required New Architecture

```text
User Input (text + audio)
    ↓
Listener Service
    ├─ Transcription
    ├─ Prosody Analysis
    └─ **THREE PARALLEL** Multi-Emotion Analyses:
        ├─ Content-Only Analysis (LLM with text only)
        ├─ Voice-Only Analysis (LLM with prosody only)
        └─ Blended Analysis (LLM with text + prosody)
    ↓
Observer Service
    ├─ Atlas Mapping (for all 3 interpretations)
    ├─ Discrepancy Calculation (Euclidean distance in VAC space)
    ├─ Clinical Interpretation (explain mismatches)
    └─ Store separate interpretations
    ↓
Frontend Display (3-column comparison)
```

---

## 🔧 Backend Changes Required

### 1. Listener Service Changes

#### File: `listener/app/services/multi_emotion_analyzer.py`

**Current Method:**

```python
async def analyze_multi_emotion(
    self,
    text: str,
    prosody_features: Optional[Dict] = None
) -> MultiEmotionResponse:
    # Single LLM call with both text and prosody
    ...
```

**New Method:**

```python
async def analyze_multi_emotion_three_way(
    self,
    text: str,
    prosody_features: Optional[Dict] = None
) -> ThreeWayAnalysisResponse:
    # Three parallel LLM calls
    content_only = await self._analyze_content_only(text)
    voice_only = await self._analyze_voice_only(prosody_features) if prosody_features else None
    blended = await self._analyze_blended(text, prosody_features)
    
    return ThreeWayAnalysisResponse(
        content_only=content_only,
        voice_only=voice_only,
        blended=blended,
        discrepancy_score=self._calculate_discrepancy(content_only, voice_only, blended)
    )
```

**New LLM Prompts Needed:**

1. **Content-Only Prompt:**

```python
"""Analyze ONLY the semantic content of this text.
Ignore any information about how it was said.
Focus solely on the words, their meaning, and linguistic patterns.

Text: "{text}"

Detect 1-3 emotions present in the content..."""
```

1. **Voice-Only Prompt:**

```python
"""Analyze ONLY the vocal characteristics.
Ignore the actual words - focus only on HOW it was said.
Consider: pitch, energy, rate, rhythm, voice quality.

Prosody Features:
- Pitch: {pitch_mean} Hz (range: {pitch_range}, std: {pitch_std})
- Energy: {energy} (max: {energy_max})
- Rate: {rate} syllables/sec
- Voice Quality: jitter={jitter}%, shimmer={shimmer}%, HNR={hnr}dB

Based ONLY on these vocal patterns, what emotions does the voice express?"""
```

**Performance Consideration:**

- Running 3 LLM calls instead of 1 = **3x API cost**
- Each call takes ~10s = **30s total** (can be parallelized to ~10-12s)
- **Optimization**: Only run 3-way when explicitly requested (add flag)

**New Pydantic Models:**

```python
class ThreeWayAnalysisResponse(BaseModel):
    content_only: MultiEmotionResponse
    voice_only: Optional[MultiEmotionResponse]
    blended: MultiEmotionResponse
    discrepancy_score: float  # 0-1, Euclidean distance between interpretations
    clinical_flags: List[str]  # ["suppression", "incongruence", "masking"]
```

#### File: `listener/app/api/routes/ingest.py`

**New Endpoint:**

```python
@router.post("/analyze-audio-three-way")
async def analyze_audio_three_way(
    file: UploadFile = File(...),
    enable_three_way: bool = Form(True)
):
    """Analyze ```mermaid
graph TD
    A[Text] -->|Valence -0.8| D[Negative]
    B[Audio] -->|Valence +0.2| D
    C[Hume] -->|Anxiety 0.9| E[High Arousal]
    
    D --> F{Conflict?}
    E --> F
    F -->|Yes| G[Detect Irony/Masking]
```

---

### 2. Observer Service Changes

#### File: `observer/app/services/insight_generator.py`

**New Method:**

```python
async def generate_three_way_insights(
    self,
    content_only: MultiEmotionResponse,
    voice_only: Optional[MultiEmotionResponse],
    blended: MultiEmotionResponse,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Generate insights comparing all 3 interpretations."""
    
    # Map all emotions to Atlas
    content_emotions = await self._map_emotions(content_only.emotions)
    voice_emotions = await self._map_emotions(voice_only.emotions) if voice_only else None
    blended_emotions = await self._map_emotions(blended.emotions)
    
    # Calculate discrepancies
    content_voice_distance = self._calculate_vac_distance(
        content_emotions[0].vac, 
        voice_emotions[0].vac
    ) if voice_emotions else 0
    
    # Generate clinical interpretation
    interpretation = self._interpret_discrepancy(
        content_voice_distance,
        content_emotions,
        voice_emotions
    )
    
    # Flag clinical concerns
    flags = []
    if content_voice_distance > 0.5:
        flags.append("significant_incongruence")
    if content_emotions[0].vac.valence > 0 and voice_emotions and voice_emotions[0].vac.valence < 0:
        flags.append("emotional_suppression")
    # ... more rules
    
    return {
        "content_only": content_emotions,
        "voice_only": voice_emotions,
        "blended": blended_emotions,
        "discrepancy": {
            "content_voice_distance": content_voice_distance,
            "flags": flags,
            "interpretation": interpretation
        }
    }
```

**Clinical Interpretation Logic:**

```python
def _interpret_discrepancy(self, distance, content, voice):
    if distance < 0.3:
        return "Voice and content are well aligned, suggesting authentic emotional expression."```python
# Pseudocode logic
if text_valence < -0.5 and audio_valence > 0.0:
    return "Possible Sarcasm/Masking"
if hume_anxiety > 0.8 and text_valence > 0.0:
    return "Anxious Positivity (Nervous Laughter)"
```    else:
        if content.valence > voice.valence:
            return "Content is more positive than voice suggests. Possible emotional suppression or 'putting on a brave face'."
        else:
            return "Voice is more positive than content suggests. May indicate sarcasm, irony, or minimization of distress."
```

---

### 3. Database Changes (Optional but Recommended)

**New Table: `three_way_analyses`**

```sql
CREATE TABLE three_way_analyses (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Content-Only Interpretation
    content_emotion_id UUID REFERENCES atlas_definitions(id),
    content_vac FLOAT[3],
    content_confidence FLOAT,
    
    -- Voice-Only Interpretation
    voice_emotion_id UUID REFERENCES atlas_definitions(id),
    voice_vac FLOAT[3],
    voice_confidence FLOAT,
    
    -- Blended Interpretation (current approach)
    blended_emotion_id UUID REFERENCES atlas_definitions(id),
    blended_vac FLOAT[3],
    blended_confidence FLOAT,
    
    -- Discrepancy Metrics
    content_voice_distance FLOAT,  -- Euclidean distance in VAC space
    content_blended_distance FLOAT,
    voice_blended_distance FLOAT,
    
    -- Clinical Flags
    flags TEXT[],  -- ['suppression', 'incongruence', 'masking']
    clinical_interpretation TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_three_way_session ON three_way_analyses(session_id);
CREATE INDEX idx_three_way_flags ON three_way_analyses USING GIN(flags);
```

**Alternative (Simpler):**
Just extend `multi_emotion_analyses` table:

```sql
ALTER TABLE multi_emotion_analyses
ADD COLUMN three_way_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN content_only_data JSONB,
ADD COLUMN voice_only_data JSONB,
ADD COLUMN discrepancy_metrics JSONB;
```

---

## 🎨 Frontend Changes Required

### 1. New Component: `VoiceContentThreeWay.tsx`

**File**: `experience/web/components/admin/clinical/VoiceContentThreeWay.tsx`

**Layout**: Three-column comparison

```typescript
interface ThreeWayAnalysisProps {
  contentOnly: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
  };
  voiceOnly?: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
  };
  blended: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
  };
  discrepancy: {
    contentVoiceDistance: number;
    flags: string[];
    interpretation: string;
  };
}

export function VoiceContentThreeWay({ ... }: ThreeWayAnalysisProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Column 1: Content-Only */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-3">
          📝 Content-Only
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          From text semantic analysis
        </p>
        
        <div className="text-2xl font-bold text-white mb-2">
          {contentOnly.emotion}
        </div>
        <div className="text-sm text-gray-400 mb-3">
          {contentOnly.category}
        </div>
        
        {/* VAC Coordinates */}
        <div className="space-y-1 text-sm font-mono">
          <div>V: {contentOnly.vac.valence.toFixed(3)}</div>
          <div>A: {contentOnly.vac.arousal.toFixed(3)}</div>
          <div>C: {contentOnly.vac.connection.toFixed(3)}</div>
        </div>
        
        {/* Confidence */}
        <div className="mt-3 text-xs text-gray-400">
          Confidence: {(contentOnly.confidence * 100).toFixed(0)}%
        </div>
      </div>
      
      {/* Column 2: Voice-Only */}
      {voiceOnly && (
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-purple-300 font-semibold mb-3">
            🎤 Voice-Only
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            From vocal prosody features
          </p>
          
          {/* Same structure as content-only */}
          ...
        </div>
      )}
      
      {/* Column 3: Blended */}
      <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-4">
        <h3 className="text-cyan-300 font-semibold mb-3">
          🔗 Blended
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Combined interpretation
        </p>
        
        {/* Same structure */}
        ...
      </div>
    </div>
    
    {/* Discrepancy Alert Row */}
    {discrepancy.contentVoiceDistance > 0.5 && (
      <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-orange-300 mb-2">
              Significant Discrepancy Detected
            </div>
            <div className="text-sm text-gray-300">
              {discrepancy.interpretation}
            </div>
            {discrepancy.flags.length > 0 && (
              <div className="mt-2 flex gap-2">
                {discrepancy.flags.map(flag => (
                  <span key={flag} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  );
}
```

### 2. TypeScript Types

**File**: `experience/web/types/chat.ts`

```typescript
export interface ThreeWayAnalysis {
  contentOnly: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
    originalName?: string;
    matchMethod?: string;
  };
  voiceOnly?: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
    originalName?: string;
    matchMethod?: string;
  };
  blended: {
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
    originalName?: string;
    matchMethod?: string;
  };
  discrepancy: {
    contentVoiceDistance: number;
    contentBlendedDistance: number;
    voiceBlendedDistance: number;
    flags: string[];
    interpretation: string;
  };
}
```

### 3. Integration with ClinicalDashboard

**File**: `experience/web/components/admin/ClinicalDashboard.tsx`

```typescript
interface ClinicalDashboardProps {
  // ... existing props
  threeWayAnalysis?: ThreeWayAnalysis | null;
}

// In render:
{threeWayAnalysis && (
  <VoiceContentThreeWay
    contentOnly={threeWayAnalysis.contentOnly}
    voiceOnly={threeWayAnalysis.voiceOnly}
    blended={threeWayAnalysis.blended}
    discrepancy={threeWayAnalysis.discrepancy}
  />
)}
```

---

## 📅 Implementation Timeline

### Day 1: Backend Foundation (8 hours)

**Morning (4h):**

- [ ] Create new LLM prompts (content-only, voice-only)
- [ ] Implement `_analyze_content_only()` method
- [ ] Implement `_analyze_voice_only()` method
- [ ] Test each method individually

**Afternoon (4h):**

- [ ] Create `ThreeWayAnalysisResponse` Pydantic model
- [ ] Implement `analyze_multi_emotion_three_way()` orchestration
- [ ] Add parallelization for 3 LLM calls
- [ ] Test end-to-end with sample data

### Day 2: Backend Integration & Frontend (8 hours)

**Morning (4h):**

- [ ] Add new `/analyze-audio-three-way` endpoint
- [ ] Implement discrepancy calculation logic
- [ ] Add clinical interpretation rules
- [ ] Update Observer insight_generator.py
- [ ] Add Atlas mapping for all 3 interpretations

**Afternoon (4h):**

- [ ] Create `VoiceContentThreeWay.tsx` component
- [ ] Add TypeScript types
- [ ] Implement 3-column layout
- [ ] Add discrepancy alerts and flags
- [ ] Style with clinical theme

### Day 3: Integration, Testing & Polish (8 hours)

**Morning (4h):**

- [ ] Integrate component with ClinicalDashboard
- [ ] Add WebSocket message handling for 3-way data
- [ ] Update ChatPanel to request 3-way when enabled
- [ ] Database schema updates (if doing dedicated table)
- [ ] Migration scripts

**Afternoon (4h):**

- [ ] End-to-end testing with real audio samples
- [ ] Test various discrepancy scenarios
- [ ] Performance optimization (caching, parallel calls)
- [ ] Documentation and clinical guide
- [ ] Bug fixes and polish

**Total**: 24 hours (3 full days)

---

## 💰 Cost Considerations

### LLM API Costs

**Current (Single Analysis):**

- 1 LLM call per message
- ~1000 tokens per call
- Cost: ~$0.01 per message (OpenAI GPT-4)

**With 3-Way Analysis:**

- 3 LLM calls per message
- ~3000 tokens total
- Cost: ~$0.03 per message (3x increase)

**At Scale:**

- 1000 messages/day = $30/day vs $10/day (+ $20/day)
- 30,000 messages/month = $900/month vs $300/month (+ $600/month)

**Mitigation:**

- Only enable 3-way for clinical users (flag in session)
- Only run when clinician explicitly requests it (button click)
- Cache results (don't reanalyze same audio)

---

## ⚠️ Risks & Challenges

### 1. LLM Consistency

**Risk**: Voice-only prompt may produce less accurate results (no context from words)  
**Mitigation**: Extensive prompt engineering and testing, may need fine-tuning

### 2. Performance Impact

**Risk**: 3x API calls = 3x latency and cost  
**Mitigation**: Parallelize calls, make feature optional, add caching

### 3. Clinical Interpretation Complexity

**Risk**: Discrepancy interpretation rules may be oversimplified  
**Mitigation**: Collaborate with clinical team, iterative refinement

### 4. Database Growth

**Risk**: Storing 3x emotion data increases storage needs  
**Mitigation**: Use JSONB for flexibility, add data retention policies

### 5. User Experience

**Risk**: 3-column layout may be overwhelming on smaller screens  
**Mitigation**: Make expandable/collapsible, show simplified view by default

---

## 🔄 Alternative Approaches

### Alternative 1: Heuristic Voice-Only Interpretation

**Instead of LLM**, map prosody features directly to emotions:

- High pitch + high energy + fast rate = Excitement/Anxiety
- Low pitch + low energy + slow rate = Sadness/Depression
- Stable pitch + moderate energy = Contentment/Calm

**Pros:** No additional LLM costs, faster  
**Cons:** Less nuanced, less accurate

### Alternative 2: Post-Hoc Separation

**Don't run 3 analyses**. Instead:

1. Run current blended analysis
2. Re-weight VAC coordinates to simulate content-only (discount prosody influence)
3. Re-weight VAC coordinates to simulate voice-only (discount semantic influence)

**Pros:** No additional API calls, much simpler  
**Cons:** Not true separation, less clinically valid

### Alternative 3: Opt-In "Deep Analysis" Mode

Only run 3-way when:

- Clinician clicks "Deep Analysis" button
- Cost is tracked and limited
- Results are cached for 24 hours

**Pros:** Reduces routine costs, maintains clinical value  
**Cons:** Requires UI for mode switching

---

## 📊 Clinical Value Assessment

### High Value Scenarios

- **Trauma therapy**: Detecting emotional suppression
- **Couples therapy**: Identifying communication incongruence
- **Depression treatment**: Monitoring emotional blunting
- **Anxiety treatment**: Revealing hidden distress

### Medium Value Scenarios

- **General therapy**: Understanding client emotional awareness
- **Research**: Data collection on emotion expression

### Low Value Scenarios

- **Text-only sessions**: Voice-only column is N/A
- **Highly aligned cases**: All 3 show same emotion (common)

**Recommendation**: Make it an **opt-in feature** for clinical power users rather than default.

---

## ✅ Acceptance Criteria

Task 1.2 is complete when:

- [x] Backend can analyze emotions in 3 ways (content, voice, blended)
- [x] All 3 interpretations are mapped to Atlas emotions
- [x] Discrepancy calculation works correctly (Euclidean distance in VAC space)
- [x] Clinical interpretation rules generate helpful guidance
- [x] Frontend displays 3-column comparison
- [x] Discrepancy alerts trigger for distance >0.5
- [x] Component integrates with ClinicalDashboard
- [x] WebSocket messages support 3-way data structure
- [x] Performance is acceptable (<15s total for 3 analyses)
- [x] Clinical team validates usefulness
- [x] Documentation explains clinical interpretation

---

## 🎯 Recommendation

**DEFER to Phase 2** because:

1. ✅ Current voice-content correlation already provides significant clinical value
2. ⚠️ 3-way analysis requires 24 hours of focused development
3. 💰 Triples LLM API costs (can be mitigated but adds complexity)
4. 🔬 Needs clinical validation to ensure voice-only prompts are accurate
5. 📊 Phase 1 Tasks 1.3 and 1.4 can be completed much faster (6-7 hours combined)

**Better Approach**:

1. Complete Tasks 1.1, 1.3, 1.4 first (get Phase 1 to 75% complete)
2. Gather clinical feedback on existing voice-content correlation
3. If clinicians strongly request more granular separation, tackle 1.2 in Phase 2
4. Consider Alternative 3 (opt-in mode) to control costs

---

**Document Created**: December 6, 2025, 7:37 PM MDT  
**Status**: Specification Complete  
**Next Decision**: Defer to Phase 2 or Implement Now?
