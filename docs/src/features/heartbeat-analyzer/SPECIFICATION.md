# The Heartbeat Analyzer - Complete Specification

**Created**: December 6, 2025, 9:45 PM MDT  
**Purpose**: Transform static spinner into delightful, adaptive progress indicator  
**Estimated Implementation**: 3-4 hours  
**Priority**: HIGH (UX Enhancement)

---

## 🎯 Vision

Transform the boring "Analyzing your emotions..." spinner into a **beautiful, breathing, emotionally resonant progress indicator** that makes waiting feel like part of the therapeutic experience.

---

## 🎨 Visual Design

### **The Heartbeat Analyzer Card**

```text
┌─────────────────────────────────────────────────────┐
│  🌊 Deep Feeling Analysis                           │
│                                                     │
│              [Pulsing Gradient Orb]                 │
│          (breathing: 1.0 → 1.05 → 1.0)              │
│      Colors shift: Cyan → Purple → Pink             │
│                                                     │
│  🧠 Detecting emotional complexity...               │
│  [████████████████░░░░░░░░] 70%                   │
│                                                     │
│  ✅ Voice transcribed (3.2s)                        │
│  ✅ Voice patterns analyzed (2.1s)                  │
│  ⏳ Exploring multiple emotions...                  │
│  ⬜ Finding relationships                           │
│  ⬜ Calculating aggregate state                     │
│  ⬜ Generating insights                             │
│                                                     │
│  💜 "Taking time to understand the full depth      │
│     of what you're experiencing..."                │
└─────────────────────────────────────────────────────┘
```

### **Design Elements**

### 1. Pulsing Gradient Orb (Heart)beat)**

- **Size**: 96px × 96px
- **Animation**: Scale 1.0 → 1.05 → 1.0 (2s cycle)
- **Base Gradient**: `from-cyan-500 via-purple-500 to-pink-500`
- **Secondary Ring**: Ping animation (opacity 0.5, 3s cycle)
- **Percentage Overlay**: White text, bold, centered
- **Color Evolution**:
  - 0-33%: Cyan dominant (early stages)
  - 34-66%: Purple dominant (emotion detection)
  - 67-100%: Pink dominant (completion)

### 2. Progress Bar

- **Height**: 8px (thicker than standard for prominence)
- **Background**: `bg-gray-700`
- **Fill**: Gradient `from-cyan-500 via-purple-500 to-pink-500`
- **Transition**: `duration-500 ease-out` (smooth updates)
- **Glow Effect**: Subtle shadow on active portion
- **Percentage Display**: Above bar, right-aligned, mono font

### 3. Stage Checklist

- **Icons**:
  - ⬜ Pending (gray-600, opacity 0.5)
  - ⏳ In Progress (cyan-400, spinning animation)
  - ✅ Complete (green-400, fade-in + scale)
- **Label Colors**:
  - Pending: gray-600
  - In Progress: white (bold)
  - Complete: gray-400 (faded)
- **Elapsed Time**: Shown for completed stages (e.g., "3.2s")
- **Layout**: Vertical list, left-aligned with icons

### 4. Contextual Message

- **Font**: Italic, text-sm
- **Color**:
  - Warm mode: cyan-300
  - Clinical mode: blue-300
- **Background**:
  - Warm: `bg-cyan-500/10`
  - Clinical: `bg-blue-500/10`
- **Padding**: px-4 py-3
- **Border Radius**: rounded-lg
- **Changes**: Smoothly fades between messages (opacity transition)

---

## 📡 Backend Progress Streaming

```typescript
interface HeartbeatState {
  stage: 'idle' | 'detecting' | 'analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  heartRate: number; // BPM
  confidence: number; // 0-1
  lastBeat: number; // timestamp
}
```

### **New WebSocket Message Type**

```typescript
{
  type: 'progress_update',
  stage: 'transcription' | 'prosody' | 'emotions' | 'relationships' | 'aggregate' | 'three_way' | 'insights',
  status: 'started' | 'in_progress' | 'complete',
  message: string,  // Human-readable description
  percentage: number,  // 0-100
  elapsed_ms?: number,  // Time taken for completed stage
  metadata?: {  // Optional contextual data
    emotion_count?: number,
    complexity?: number,
    discrepancy?: number,
    // ...
  }
}
```

### **Injection Points in `chat_websocket.py`**

**Function**: `process_audio_message()`

**Timeline**:

```text
0%   → START message sent
20%  → Transcription complete
35%  → Prosody complete
40%  → Emotion detection starts
70%  → Emotions detected
75%  → Relationships started (Deep Feeling only)
80%  → Relationships complete
85%  → Aggregate complete
90%  → 3-way complete (if enabled)
95%  → Insights started
100% → Insights complete
```

**Code Insertions**:

```python
# At function start
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "started",
    "status": "started",
    "message": "Processing your message",
    "percentage": 0
})

# After transcription (line ~385)
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "transcription",
    "status": "complete",
    "message": "Transcription complete",
    "percentage": 20,
    "elapsed_ms": int((time.time() - transcription_start) * 1000)
})

# After prosody (line ~392)
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "prosody",
    "status": "complete",
    "message": "Voice patterns analyzed",
    "percentage": 35,
    "elapsed_ms": int((time.time() - prosody_start) * 1000)
})

# Before Listener HTTP call (line ~396)
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "emotions",
    "status": "in_progress",
    "message": "Detecting emotions...",
    "percentage": 40
})

# After handle_multi_emotion_result (line ~416)
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "insights",
    "status": "in_progress",
    "message": "Generating insights...",
    "percentage": 95
})

# At very end (after insights)
await manager.send_message(session_id, {
    "type": "progress_update",
    "stage": "insights",
    "status": "complete",
    "message": "Analysis complete!",
    "percentage": 100
})
```

---

## 🎭 Adaptive Messaging Strategy

### **Message Library by Stage**

#### **Transcription (0-20%)**

**Warm Mode:**

- "Listening carefully to your words..."
- "Converting your voice to text..."
- "Hearing what you have to say..."
- "Capturing your message..."

**Clinical Mode:**

- "Executing speech-to-text conversion..."
- "Processing audio transcription..."
- "Extracting linguistic content..."
- "Running transcription engine..."

#### **Prosody (20-35%)**

**Warm Mode:**

- "Understanding how you're expressing yourself..."
- "Analyzing the tone and rhythm of your voice..."
- "Feeling the emotion in your voice..."
- "Listening to what your voice reveals..."

**Clinical Mode:**

- "Analyzing prosody features..."
- "Extracting vocal biomarkers..."
- "Processing pitch, energy, and rate patterns..."
- "Measuring voice quality indicators..."

#### **Emotions - Single Mode (35-70%)**

**Warm Mode:**

- "Identifying your emotional state..."
- "Mapping your feelings to our emotional atlas..."
- "Understanding what you're experiencing..."
- "Almost there..."

**Clinical Mode:**

- "Running semantic emotion analysis..."
- "Mapping to Atlas emotional taxonomy..."
- "Calculating VAC coordinates..."
- "Executing emotion detection algorithm..."

#### **Emotions - Deep Feeling Mode (35-70%)**

**Warm Mode:**

- "Exploring the layers of what you're feeling..."
- "Detecting emotional complexity and nuance..."
- "This takes a moment - we're being thorough..."
- "Understanding the depth of your experience..."
- "Uncovering hidden emotions..."

**Clinical Mode:**

- "Executing multi-emotion detection..."
- "Running 3 parallel LLM analyses..."
- "Analyzing content-only interpretation..."
- "Analyzing voice-only interpretation..."
- "Synthesizing blended interpretation..."

#### **Relationships (70-80%)**  

#### Deep Feeling only (Aggregate)

**Warm Mode:**

- "Understanding how your emotions interact..."
- "Finding connections between feelings..."
- "Seeing the relationships emerge..."
- "Discovering emotional patterns..."

**Clinical Mode:**

- "Classifying emotion relationships..."
- "Detecting complementary, contradictory, and masking patterns..."
- "Calculating relationship strength metrics..."
- "Analyzing emotional interaction dynamics..."

#### **Aggregate (80-90%)**  

#### Deep Feeling only (Aggregate Phase)

**Warm Mode:**

- "Bringing it all together..."
- "Synthesizing your emotional landscape..."
- "Creating the big picture..."

**Clinical Mode:**

- "Computing aggregate emotional state..."
- "Calculating complexity and clarity scores..."
- "Determining temporal pattern classification..."
- "Synthesizing weighted VAC coordinates..."

#### **3-Way Analysis (80-90%)**  

#### When 3-way enabled

**Warm Mode:**

- "Comparing what you said vs how you sounded..."
- "Understanding voice-content alignment..."
- "Looking for hidden feelings..."

**Clinical Mode:**

- "Executing 3-way discrepancy analysis..."
- "Calculating VAC distance metrics..."
- "Generating clinical interpretation..."
- "Detecting incongruence patterns..."

#### **Insights (90-100%)**

**Warm Mode:**

- "Crafting personalized guidance for you..."
- "Almost done - preparing your insights..."
- "Finishing up..."
- "Getting everything ready..."

**Clinical Mode:**

- "Generating AI-powered clinical insights..."
- "Synthesizing recommendations..."
- "Finalizing analysis report..."
- "Compiling clinical assessment..."

#### **Complete (100%)**

**Warm Mode:**

- "Analysis complete! ✨"
- "Ready to share what I've discovered..."
- "All done! Here's what I found..."

**Clinical Mode:**

- "Analysis complete."
- "Report ready for review."
- "Assessment finalized."

---

## 💻 Frontend Implementation

### **Component 1: AnalysisProgressIndicator.tsx**

**Location:** `experience/web/components/admin/AnalysisProgressIndicator.tsx`

**Props:**

```typescript
interface AnalysisProgressIndicatorProps {
  stages: ProgressStage[];
  currentStage: string;
  overallPercentage: number;
  currentMessage: string;
  toneMode: 'warm' | 'clinical';
  deepFeelingMode: boolean;
  className?: string;
}

interface ProgressStage {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'complete';
  percentage: number;
  elapsed_ms?: number;
}
```

**Component Structure** (~200 lines):

```typescript
// useHeartbeat.ts hook structure
const {
  startAnalysis,
  stopAnalysis,
  metrics: { bpm, quality },
  stage
} = useHeartbeat();
```

```tsx
export function AnalysisProgressIndicator({
  stages,
  currentStage,
  overallPercentage,
  currentMessage,
  toneMode,
  deepFeelingMode,
  className = ''
}: AnalysisProgressIndicatorProps) {
  return (
    <div className={`
      bg-gradient-to-br from-gray-800 to-gray-900 
      rounded-xl p-6 border border-cyan-500/30 shadow-2xl
      ${className}
    `}>
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-cyan-300 flex items-center justify-center gap-2">
          {deepFeelingMode ? (
            <><span>🌊</span><span>Deep Feeling Analysis</span></>
          ) : (
            <><span>💜</span><span>Emotional Analysis</span></>
          )}
        </h3>
      </div>

      {/* Pulsing Gradient Orb */}
      <PulsingOrb percentage={overallPercentage} />

      {/* Progress Bar */}
      <ProgressBar percentage={overallPercentage} />

      {/* Current Stage (prominent) */}
      <CurrentStage stage={currentStage} stages={stages} />

      {/* Stages Checklist */}
      <StageChecklist stages={stages} />

      {/* Contextual Message */}
      <AdaptiveMessage message={currentMessage} toneMode={toneMode} />
    </div>
  );
}
```

### **Component 2: PulsingOrb**

```tsx
function PulsingOrb({ percentage }: { percentage: number }) {
  // Color shifts based on progress
  const getGradientColors = () => {
    if (percentage < 33) return 'from-cyan-500 via-cyan-400 to-cyan-600';
    if (percentage < 67) return 'from-purple-500 via-purple-400 to-purple-600';
    return 'from-pink-500 via-pink-400 to-pink-600';
  };

  const getPulseSpeed = () => {
    // Pulse faster as we get closer to completion
    if (percentage < 50) return 'animate-pulse-slow'; // 2s
    if (percentage < 80) return 'animate-pulse-medium'; // 1.5s
    return 'animate-pulse-fast'; // 1s (excitement!)
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="relative w-24 h-24">
        {/* Main pulsing orb */}
        <div className={`
          absolute inset-0 rounded-full 
          bg-gradient-to-br ${getGradientColors()}
          ${getPulseSpeed()}
          shadow-lg
        `} />
        
        {/* Ping ring */}
        <div className={`
          absolute inset-0 rounded-full 
          bg-gradient-to-br ${getGradientColors()}
          opacity-50 animate-ping-slow
        `} />
        
        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xl drop-shadow-lg">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

### **Component 3: ProgressBar**

```tsx
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>Overall Progress</span>
        <span className="font-mono text-cyan-400">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
        <div 
          className="
            h-full 
            bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 
            transition-all duration-500 ease-out
            shadow-[0_0_10px_rgba(6,182,212,0.5)]
          "
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### **Component 4: CurrentStage**

```tsx
function CurrentStage({ stage, stages }: { stage: string; stages: ProgressStage[] }) {
  const current = stages.find(s => s.id === stage);
  if (!current || current.status === 'complete') return null;

  return (
    <div className="text-center my-4 py-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
      <div className="text-white font-medium flex items-center justify-center gap-2">
        <span>{current.icon}</span>
        <span>{current.label}</span>
        {current.status === 'in_progress' && (
          <div className="animate-spin text-cyan-400">⏳</div>
        )}
      </div>
    </div>
  );
}
```

### **Component 5: StageChecklist**

```tsx
function StageChecklist({ stages }: { stages: ProgressStage[] }) {
  return (
    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
      {stages.map(stage => (
        <div 
          key={stage.id}
          className={`
            flex items-center gap-3 px-3 py-2 rounded
            transition-all duration-300
            ${stage.status === 'in_progress' ? 'bg-cyan-500/10 border border-cyan-500/30' : ''}
            ${stage.status === 'complete' ? 'opacity-60' : ''}
          `}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0 w-6 flex justify-center">
            {stage.status === 'complete' && (
              <span className="text-green-400 animate-fade-in">✅</span>
            )}
            {stage.status === 'in_progress' && (
              <div className="animate-spin text-cyan-400">⏳</div>
            )}
            {stage.status === 'pending' && (
              <span className="text-gray-600">⬜</span>
            )}
          </div>

          {/* Stage Info */}
          <div className="flex-1 flex items-center justify-between">
            <span className={`
              flex items-center gap-2
              ${stage.status === 'complete' ? 'text-gray-400' : 'text-white'}
              ${stage.status === 'in_progress' ? 'font-semibold' : ''}
            `}>
              <span>{stage.icon}</span>
              <span>{stage.label}</span>
            </span>

            {/* Elapsed Time (if complete) */}
            {stage.elapsed_ms && stage.status === 'complete' && (
              <span className="text-xs text-gray-500 font-mono">
                {(stage.elapsed_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### **Component 6: AdaptiveMessage**

```tsx
function AdaptiveMessage({ 
  message, 
  toneMode 
}: { 
  message: string; 
  toneMode: 'warm' | 'clinical' 
}) {
  return (
    <div className={`
      text-center text-sm italic px-4 py-3 rounded-lg
      transition-all duration-500
      ${toneMode === 'warm' 
        ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20' 
        : 'text-blue-300 bg-blue-500/10 border border-blue-500/20'}
    `}>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
```

---

## 🔄 State Management

### **In ChatPanel.tsx**

**Add Progress State:**

```typescript
const [progressState, setProgressState] = useState<{
  stages: ProgressStage[];
  currentStage: string;
  overallPercentage: number;
  currentMessage: string;
}>({
  stages: [],
  currentStage: '',
  overallPercentage: 0,
  currentMessage: ''
});

const [showProgress, setShowProgress] = useState(false);
```

**Initialize Stages:**

```typescript
const initializeProgressStages = (deepFeeling: boolean): ProgressStage[] => {
  const baseStages = [
    {
      id: 'transcription',
      label: 'Transcription',
      icon: '🎙️',
      status: 'pending' as const,
      percentage: 0
    },
    {
      id: 'prosody',
      label: 'Voice Analysis',
      icon: '🎵',
      status: 'pending' as const,
      percentage: 0
    },
    {
      id: 'emotions',
      label: deepFeeling ? 'Multi-Emotion Detection' : 'Emotion Detection',
      icon: '🧠',
      status: 'pending' as const,
      percentage: 0
    }
  ];

  if (deepFeeling) {
    baseStages.push(
      {
        id: 'relationships',
        label: 'Relationships',
        icon: '🔗',
        status: 'pending' as const,
        percentage: 0
      },
      {
        id: 'aggregate',
        label: 'Aggregate State',
        icon: '📊',
        status: 'pending' as const,
        percentage: 0
      }
    );
  }

  baseStages.push({
    id: 'insights',
    label: 'Insights',
    icon: '💡',
    status: 'pending' as const,
    percentage: 0
  });

  return baseStages;
};
```

**Handle Progress Updates:**

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
  } else if (status === 'complete' && percentage === 100) {
    // Hide progress after brief delay
    setTimeout(() => setShowProgress(false), 1500);
  }
}
```

**Replace Static Spinner:**

```tsx
{/* OLD: */}
{isProcessing && (
  <div className="flex justify-start">
    <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
      <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
      <span className="text-sm text-gray-300">Analyzing your emotions...</span>
    </div>
  </div>
)}

{/* NEW: */}
{showProgress && (
  <div className="flex justify-start">
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

---

## 🎨 CSS Animations

### **Add to `experience/web/app/globals.css`:**

```css
@keyframes pulse-slow {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.95;
  }
}

@keyframes pulse-medium {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes pulse-fast {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.85;
  }
}

@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-pulse-medium {
  animation: pulse-medium 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-pulse-fast {
  animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-ping-slow {
  animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}
```

---

## 📋 Implementation Checklist

### **Backend (1-1.5 hours)**

- [ ] Add `import time` to chat_websocket.py (if not present)
- [ ] Add progress_update message after transcription complete
- [ ] Add progress_update message after prosody complete
- [ ] Add progress_update message before emotion detection
- [ ] Add progress_update message after emotion detection
- [ ] Add progress_update messages for Deep Feeling stages (relationships, aggregate)
- [ ] Add progress_update messages for 3-way analysis (if present)
- [ ] Add progress_update message before insights
- [ ] Add progress_update message after insights (100%)
- [ ] Test messages stream correctly

### **Frontend (2-2.5 hours)**

- [ ] Create `AnalysisProgressIndicator.tsx` component
- [ ] Create PulsingOrb sub-component
- [ ] Create ProgressBar sub-component
- [ ] Create CurrentStage sub-component
- [ ] Create StageChecklist sub-component
- [ ] Create AdaptiveMessage sub-component
- [ ] Add CSS animations to globals.css
- [ ] Update TypeScript types (add progress_update to ServerMessage)
- [ ] Update useWebSocketChat.ts (add onProgressUpdate callback)
- [ ] Update ChatPanel.tsx (add progress state + handler)
- [ ] Replace static spinner with AnalysisProgressIndicator
- [ ] Test with real audio messages
- [ ] Test in both warm and clinical modes
- [ ] Test with Deep Feeling on/off
- [ ] Polish animations and transitions

---

## 🧪 Testing Scenarios

### **Test 1: Single Emotion, Warm Mode**

- Send audio "I'm feeling happy"
- Verify: Warm messages appear
- Verify: Cyan-dominant orb
- Verify: Stages: Transcription → Prosody → Emotions → Insights
- Verify: No relationships/aggregate stages

### **Test 2: Deep Feeling, Clinical Mode**

- Enable Deep Feeling + Clinical mode
- Send complex audio
- Verify: Technical messages appear
- Verify: All 6 stages present
- Verify: Progress goes through all stages

### **Test 3: 3-Way Analysis**

- Enable Deep Feeling + 3-Way
- Send audio
- Verify: 7 stages total (includes 3-way)
- Verify: Discrepancy messages appear

### **Test 4: Performance**

- Check progress updates don't slow down analysis
- Verify smooth animations (60 FPS)
- Test with reduced motion preference

---

## 🎯 Success Metrics

✅ Users understand what's happening at each stage  
✅ Perceived wait time feels shorter  
✅ Animations are smooth and delightful  
✅ Messages adapt to tone mode correctly  
✅ Progress percentage accurately reflects actual progress  
✅ Component is accessible (ARIA, reduced motion)  
✅ Fits L.O.V.E. emotional design language  

---

## 📊 Estimated Timeline

| Task | Time |
|------|------|
| Backend progress streaming | 1-1.5h |
| Create base component | 1h |
| Create sub-components | 1h |
| CSS animations | 30m |
| Integration + state management | 1h |
| Testing + polish | 30m |
| **TOTAL** | **3.5-4.5h** |

---

**Created**: December 6, 2025, 9:45 PM MDT  
**Status**: Specification Complete  
**Ready for**: Implementation in fresh session  
**Next Step**: Toggle to Act Mode when ready to build
