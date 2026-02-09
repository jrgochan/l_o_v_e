# Heartbeat Analyzer - Implementation Guide

**For Implementation Session**
**Estimated Time**: 3.5-4.5 hours
**Difficulty**: Medium
**Priority**: HIGH (UX Enhancement)

---

## 🎯 Quick Start

This guide provides step-by-step instructions for implementing the Heartbeat Analyzer feature. Follow the phases in order for best results.

---

## 📋 Prerequisites

- ✅ Voice-Content 3-Way Analysis complete (provides context)
- ✅ Deep Feeling Mode working
- ✅ WebSocket communication functional
- ✅ Familiarity with ChatPanel.tsx and chat_websocket.py

---

## 🔧 Phase 1: Backend Progress Streaming (1-1.5 hours)

### **File to Modify**: `observer/app/api/routes/chat_websocket.py`

### **Step 1.1: Add Time Import** (if needed)

```python
import time  # Add to imports at top of file
```

### **Step 1.2: Add Progress Helper Function**

Add this helper function near the top of the file (after imports):

```python
async def send_progress(session_id: str, stage: str, status: str, percentage: int, elapsed_ms: int = None):
    """Helper to send progress updates."""
    message = {
        "type": "progress_update",
        "stage": stage,
        "status": status,
        "message": f"{stage} {status}",
        "percentage": percentage
    }
    if elapsed_ms is not None:
        message["elapsed_ms"] = elapsed_ms
    await manager.send_message(session_id, message)
```

### **Step 1.3: Instrument process_audio_message()**

**Find line ~375** (start of function):

```python
async def process_audio_message(
    session_id: str,
    audio_data: str,
    original_text: Optional[str],
    tone_preference: str,
    deep_feeling_enabled: bool,
    websocket: WebSocket
):
    """Process an audio message with transcription and prosody analysis."""
    logger.info(f"Processing audio message for session {session_id} (deep_feeling={deep_feeling_enabled})")
```

**Add immediately after**:

```python
    # Track overall start time
    overall_start = time.time()

    # Send initial progress
    await send_progress(session_id, "started", "started", 0)
```

**Find line ~385** (after transcription):

```python
    transcription = transcription_service.transcribe(audio_path)
    input_text = transcription.text

    logger.info(f"Transcription: {input_text}")
```

**Add after**:

```python
    # Progress: Transcription complete
    transcription_time = int((time.time() - overall_start) * 1000)
    await send_progress(session_id, "transcription", "complete", 20, transcription_time)
```

**Find line ~392** (after transcription WebSocket message, before prosody):

```python
    # Stream transcription
    transcription = result.get('transcription')
    if transcription:
        await manager.send_message(session_id, {
            "type": "transcription",
            "text": transcription
        })

    # Stream prosody data
    prosody_data = result.get('prosody')
```

**Add before prosody stream**:

```python
    # Progress: Prosody started (optional)
    await send_progress(session_id, "prosody", "in_progress", 25)
```

**Add after prosody stream**:

```python
    if prosody_data:
        await manager.send_message(session_id, {
            "type": "prosody",
            "data": prosody_data
        })

        # Progress: Prosody complete
        prosody_time = int((time.time() - overall_start) * 1000)
        await send_progress(session_id, "prosody", "complete", 35, prosody_time)
```

**Find line ~400** (before multi-emotion handling):

```python
    # Handle response based on mode
    if deep_feeling_enabled:
        # Multi-emotion response
```

**Add before**:

```python
    # Progress: Emotion detection started
    await send_progress(session_id, "emotions", "in_progress", 40)
```

**Find line ~416** (after handle_multi_emotion_result call):

```python
        await handle_multi_emotion_result(
            session_id=session_id,
            db_session_id=db_session_id,
            user_msg_id=user_msg.id,
            analysis_result=result,
            tone_preference=tone_preference,
            websocket=websocket
        )
```

**Add after**:

```python
        # Progress: Insights starting
        await send_progress(session_id, "insights", "in_progress", 95)
```

### **Step 1.4: Update handle_multi_emotion_result()**

**Find line ~720** (after streaming aggregate_state):

```python
    # Stream aggregate state
    await manager.send_message(session_id, {
        "type": "aggregate_state",
        "aggregate_vac": aggregate_vac,
        "complexity_score": analysis_result.get("complexity_score"),
        "emotional_clarity": analysis_result.get("emotional_clarity"),
        "temporal_pattern": analysis_result.get("temporal_pattern")
    })
```

**Add after**:

```python
    # Progress updates for Deep Feeling stages
    await send_progress(session_id, "emotions", "complete", 70)

    if relationships:
        await send_progress(session_id, "relationships", "in_progress", 75)
        # (relationships already streamed above)
        await send_progress(session_id, "relationships", "complete", 80)

    await send_progress(session_id, "aggregate", "complete", 85)

    # Check for 3-way analysis
    if three_way_data:
        await send_progress(session_id, "three_way", "complete", 90)
```

---

## 🎨 Phase 2: Frontend Component (2-2.5 hours)

### **Step 2.1: Create AnalysisProgressIndicator.tsx**

**File**: `experience/web/components/admin/AnalysisProgressIndicator.tsx`

**Copy the complete component code from the specification document.**

**Key sections to implement:**

1. Main AnalysisProgressIndicator component
2. PulsingOrb sub-component
3. ProgressBar sub-component
4. CurrentStage sub-component
5. StageChecklist sub-component
6. AdaptiveMessage sub-component

#### Total: ~250-300 lines

### **Step 2.2: Add CSS Animations**

**File**: `experience/web/app/globals.css`

**Add at the bottom of the file:**

- pulse-slow, pulse-medium, pulse-fast animations
- ping-slow animation
- fade-in animation
- gradient-shift animation (optional)

**All animation code provided in spec document.**

### **Step 2.3: Update TypeScript Types**

**File**: `experience/web/types/chat.ts`

**Add to DeepFeelingServerMessage union:**

```typescript
| {
    type: 'progress_update';
    stage: string;
    status: 'started' | 'in_progress' | 'complete';
    message: string;
    percentage: number;
    elapsed_ms?: number;
    metadata?: Record<string, any>;
  }
```

**Add new interface:**

```typescript
export interface ProgressStage {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'complete';
  percentage: number;
  elapsed_ms?: number;
}
```

### **Step 2.4: Update useWebSocketChat.ts**

**Add to UseWebSocketChatOptions:**

```typescript
onProgressUpdate?: (stage: string, status: string, message: string, percentage: number, elapsed_ms?: number) => void;
```

**Add to destructuring:**

```typescript
const {
  sessionId,
  // ... existing
  onProgressUpdate,  // ADD THIS
  autoReconnect = true
} = options;
```

**Add to switch statement (after three_way_analysis case):**

```typescript
case 'progress_update':
  const progressMsg = message as any;
  if (progressMsg.stage && progressMsg.status) {
    console.log('[WebSocket] Progress:', progressMsg.stage, progressMsg.percentage + '%');
    onProgressUpdate?.(
      progressMsg.stage,
      progressMsg.status,
      progressMsg.message,
      progressMsg.percentage,
      progressMsg.elapsed_ms
    );
  }
  break;
```

**Add to dependency array:**

```typescript
}, [sessionId, onMessage, ..., onProgressUpdate, autoReconnect]);
```

### **Step 2.5: Update ChatPanel.tsx**

**Add progress state** (near other useState declarations):

```typescript
const [progressState, setProgressState] = useState({
  stages: [] as ProgressStage[],
  currentStage: '',
  overallPercentage: 0,
  currentMessage: ''
});
const [showProgress, setShowProgress] = useState(false);
```

**Add stage initialization function:**

```typescript
const initializeProgressStages = useCallback((deepFeeling: boolean): ProgressStage[] => {
  // Use code from specification
}, []);
```

**Add message selection function:**

```typescript
const getAdaptiveMessage = (stage: string, status: string, tone: ToneMode, deepFeeling: boolean): string => {
  // Implement message selection logic based on spec
  const messages = {
    transcription: {
      warm: "Listening carefully to your words...",
      clinical: "Processing audio transcription..."
    },
    prosody: {
      warm: "Understanding how you're expressing yourself...",
      clinical: "Analyzing prosody features..."
    },
    emotions: {
      warm: deepFeeling
        ? "Exploring the layers of what you're feeling..."
        : "Identifying your emotional state...",
      clinical: deepFeeling
        ? "Executing multi-emotion detection..."
        : "Running semantic emotion analysis..."
    },
    // ... etc
  };

  return messages[stage]?.[tone] || "Processing...";
};
```

**Add to WebSocket options:**

```typescript
onProgressUpdate: (stage, status, message, percentage, elapsed_ms) => {
  setProgressState(prev => ({
    ...prev,
    stages: prev.stages.map(s =>
      s.id === stage
        ? { ...s, status, percentage, elapsed_ms }
        : s
    ),
    currentStage: stage,
    overallPercentage: percentage,
    currentMessage: getAdaptiveMessage(stage, status, toneMode, deepFeelingMode)
  }));

  if (status === 'started') {
    setShowProgress(true);
    setProgressState(prev => ({
      ...prev,
      stages: initializeProgressStages(deepFeelingMode)
    }));
  } else if (status === 'complete' && percentage === 100) {
    setTimeout(() => setShowProgress(false), 1500);
  }
},
```

**Replace static spinner** (find the isProcessing block):

```typescript
{showProgress && (
  <div className="flex justify-start max-w-md">
    <AnalysisProgressIndicator
      stages={progressState.stages}
      currentStage={progressState.currentStage}
      overallPercentage={progressState.overallPercentage}
      currentMessage={progressState.currentMessage}
      toneMode={toneMode}
      deepFeelingMode={deepFeelingMode}
    />
  </div>
)}
```

**Add import at top:**

```typescript
import { AnalysisProgressIndicator } from './AnalysisProgressIndicator';
```

---

## 🧪 Testing Checklist

### **Manual Testing:**

- [ ] Send text message → verify no progress (text doesn't trigger it)
- [ ] Send audio in Single mode → verify 4 stages (transcription, prosody, emotions, insights)
- [ ] Send audio in Deep Feeling mode → verify 6 stages (adds relationships, aggregate)
- [ ] Toggle between Warm/Clinical → verify messages change
- [ ] Watch orb color change from cyan → purple → pink
- [ ] Verify checkmarks appear as stages complete
- [ ] Verify elapsed times show correctly
- [ ] Check progress hides after completion
- [ ] Test with 3-way enabled → verify 7 stages

### **Visual Testing:**

- [ ] Orb pulses smoothly (no jank)
- [ ] Progress bar animates smoothly
- [ ] Checkmarks fade in nicely
- [ ] Message transitions are smooth
- [ ] Colors match design spec

### **Edge Cases:**

- [ ] Very fast analysis (<5s) → progress still shows
- [ ] Error during analysis → progress clears
- [ ] User sends new message mid-analysis → progress resets

---

## 📝 Common Issues & Solutions

### **Issue 1: Progress not appearing**

- Check `onProgressUpdate` is in WebSocket options
- Verify `showProgress` state is being set to true
- Check console for progress_update messages

### **Issue 2: Stages not updating**

- Verify stage IDs match between backend and frontend
- Check status values ('complete' vs 'completed')
- Log progressState to see what's being set

### **Issue 3: Animations choppy**

- Check for CSS conflicts
- Verify no other components re-rendering excessively
- Use React.memo if needed

### **Issue 4: Messages not adaptive**

- Check toneMode is being passed correctly
- Verify message selection function has all cases
- Log to see which branch is being taken

---

## 🎨 Polish Suggestions

### **Nice-to-Have Additions:**

**1. Completion Celebration**
When progress hits 100%, add a brief celebratory animation:

```typescript
if (percentage === 100) {
  // Trigger confetti or sparkle effect
  // Scale bump animation on orb
  // Play subtle success sound (if audio enabled)
}
```

**2. Elapsed Time Display**
Show total analysis time when complete:

```typescript
<div className="text-xs text-gray-400 text-center mt-2">
  Completed in {totalElapsedTime.toFixed(1)}s
</div>
```

### 3. Reduced Motion Support

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// If reduced motion, disable pulsing/ping, just show static orb with color change
```

### 4. Micro-interactions

- Gentle bounce when checkmarks appear
- Subtle glow on current stage
- Message text fades in/out when changing

---

## 📊 Performance Considerations

### **Optimization Tips:**

**1. Debounce Progress Updates**
If backend sends updates very rapidly:

```typescript
const debouncedProgressUpdate = useMemo(
  () => debounce((stage, status, ...) => {
    // Update logic
  }, 100),
  []
);
```

### 2. Memoize Sub-Components

```typescript
const PulsingOrb = React.memo(({ percentage }) => { ... });
const StageChecklist = React.memo(({ stages }) => { ... });
```

**3. Lazy Load**
Only render when `showProgress` is true to avoid unnecessary renders.

---

## 🎯 Success Criteria

### **Functional Requirements:**

✅ Progress updates stream from backend in real-time
✅ All 6-7 stages tracked correctly
✅ Percentage reflects actual progress (0-100%)
✅ Messages adapt to tone mode (warm vs clinical)
✅ Elapsed times display for completed stages

### **UX Requirements:**

✅ Orb pulses smoothly with gradient evolution
✅ Progress bar animates fluidly
✅ Checkmarks appear with satisfying animation
✅ Messages are contextual and reassuring
✅ Overall experience feels delightful

### **Technical Requirements:**

✅ No performance degradation
✅ Accessible (ARIA labels, screen reader support)
✅ Works in all modes (single, deep feeling, 3-way)
✅ Handles errors gracefully
✅ Mobile responsive

---

## 🚀 Deployment Checklist

Before marking complete:

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices
- [ ] Verify with screen reader (VoiceOver/NVDA)
- [ ] Check reduced motion preference
- [ ] Verify no console errors
- [ ] Get user feedback on messages
- [ ] Adjust timing if stages feel off
- [ ] Polish any janky animations

---

## 📚 Reference Files

**Specification**: `HEARTBEAT_ANALYZER_SPECIFICATION.md`
**Backend**: `observer/app/api/routes/chat_websocket.py`
**Component**: `experience/web/components/admin/AnalysisProgressIndicator.tsx` (to be created)
**Integration**: `experience/web/components/admin/ChatPanel.tsx`
**WebSocket**: `experience/web/hooks/useWebSocketChat.ts`
**Types**: `experience/web/types/chat.ts`
**Styles**: `experience/web/app/globals.css`

---

## 💡 Tips for Implementation

1. **Start with backend** - Get progress messages streaming first
2. **Build component incrementally** - Start with static layout, add animations later
3. **Test frequently** - Check after each sub-component
4. **Use console logging** - Log progress updates to debug
5. **Iterate on messages** - Fine-tune wording based on feel
6. **Get feedback** - Show someone mid-implementation for UX validation

---

**Created**: December 6, 2025, 9:47 PM MDT
**Ready for**: Fresh implementation session
**Estimated Duration**: One focused 4-hour session
**Expected Result**: Delightful, therapeutic progress experience
