# Chat Split-Panel Layout - Remaining Work

**Date:** 2025-12-05  
**Status:** 95% Complete - Final UI Integration Needed

---

## ✅ What's Complete

### Backend (100%)
- Chat WebSocket with real-time streaming
- Text message processing
- Voice recording upload
- Audio transcription (OpenAI Whisper)
- Prosody analysis (librosa)
- Emotion detection (Llama 3.1)
- AI insights generation
- Message persistence to database

### Frontend Components (95%)
- ChatPanel component (needs layout update)
- AnalysisPanel component (✅ created)
- VoiceRecorder modal
- AudioVisualizer waveform
- useVoiceRecording hook
- useWebSocketChat hook (with prosody handler)

---

## 📋 Remaining Tasks

### **Task 1: Update WebSocket Handlers in ChatPanel** (15 min)

**File:** `experience/web/components/admin/ChatPanel.tsx`

**Current handlers:**
```typescript
onTranscription: (text) => addMessage({...})
onProsody: (data) => console.log(...)  // Only logs!
onAnalysis: (emotion, category, vac, confidence) => addMessage({...})
onInsight: (insights) => addMessage({...})
```

**Update to:**
```typescript
onTranscription: (text) => {
  setCurrentAnalysis(prev => ({...prev, transcription: text}));
  addMessage({
    id: Date.now().toString(),
    type: 'transcription',
    content: `Transcription: ${text}`,
    timestamp: new Date()
  });
},

onProsody: (data) => {
  setCurrentAnalysis(prev => ({...prev, prosody: data}));
  console.log('[Chat] Prosody data:', data);
},

onAnalysis: (emotion, category, vac, confidence) => {
  setCurrentAnalysis(prev => ({
    ...prev,
    emotion,
    category,
    vac,
    confidence
  }));
  addMessage({
    id: Date.now().toString(),
    type: 'analysis',
    content: `Detected: ${emotion}`,
    emotion,
    category,
    vac,
    confidence,
    timestamp: new Date()
  });
},

onInsight: (insights) => {
  setCurrentAnalysis(prev => ({...prev, insights}));
  addMessage({
    id: Date.now().toString(),
    type: 'insight',
    content: insights.summary,
    insights,
    timestamp: new Date()
  });
  setIsProcessing(false);
}
```

---

### **Task 2: Change Messages Area to Split-Panel Layout** (20 min)

**File:** `experience/web/components/admin/ChatPanel.tsx`

**Find this section:**
```tsx
{/* Expanded State - Show full chat */}
{isExpanded && (
  <>
    {/* Messages Area */}
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
```

**Replace with split layout:**
```tsx
{/* Expanded State - Show split-panel chat */}
{isExpanded && (
  <>
    {/* Split Panel Content */}
    <div className="flex-1 flex gap-4 px-6 py-4 overflow-hidden">
      {/* Left: Chat Messages */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">👋 How are you feeling?</p>
              <p className="text-sm">Type or record a message to start</p>
            </div>
          )}

          {messages.map((msg) => (
            // ... existing message rendering code ...
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-300">Analyzing your emotions...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Right: Analysis Panel */}
      <div className="w-96 flex-shrink-0">
        <AnalysisPanel
          transcription={currentAnalysis.transcription}
          prosody={currentAnalysis.prosody}
          emotion={currentAnalysis.emotion}
          category={currentAnalysis.category}
          vac={currentAnalysis.vac}
          confidence={currentAnalysis.confidence}
          insights={currentAnalysis.insights}
        />
      </div>
    </div>
```

---

### **Task 3: Add CSS Animation** (5 min)

**File:** `experience/web/app/globals.css`

Add fade-in animation:
```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

---

### **Task 4: Clear Analysis on New Message** (5 min)

**File:** `experience/web/components/admin/ChatPanel.tsx`

**In `handleSend` and `handleSendAudio`:**
```typescript
const handleSend = () => {
  if (!inputText.trim() || !isConnected) return;

  // Clear previous analysis
  setCurrentAnalysis({
    transcription: null,
    prosody: null,
    emotion: null,
    category: null,
    vac: null,
    confidence: null,
    insights: null
  });

  // Add user message...
  // Send via WebSocket...
};
```

---

## 🧪 Testing Checklist

After implementing:
- [ ] Text message shows in left panel
- [ ] Analysis appears in right panel
- [ ] Voice recording works
- [ ] Transcription appears in right panel
- [ ] Prosody metrics appear in right panel
- [ ] Emotion analysis appears in right panel
- [ ] Insights appear in right panel
- [ ] New message clears previous analysis
- [ ] Split-panel resizes properly
- [ ] Mobile responsiveness (optional)

---

## 🎯 Expected Result

**Left Panel:**
- User messages (cyan bubbles, right-aligned)
- System messages (gray bubbles, left-aligned)
- Input field + mic button at bottom
- Scrollable message history

**Right Panel:**
- Transcription card (cyan border)
- Prosody card (purple border)
- Emotion card (pink border)
- Insights card (amber border)
- Each fades in when data arrives
- Checkmarks show completion

---

## 📖 Reference Files

- Current implementation: `experience/web/components/admin/ChatPanel.tsx`
- Analysis panel: `experience/web/components/admin/AnalysisPanel.tsx`
- WebSocket hook: `experience/web/hooks/useWebSocketChat.ts`

---

## ⏱️ Estimated Time

- Task 1: 15 minutes
- Task 2: 20 minutes  
- Task 3: 5 minutes
- Task 4: 5 minutes

**Total: ~45 minutes to complete split-panel layout**

---

**Current Status:** Voice recording working, transcription working, prosody extracted, insights generated. Just needs UI layout changes to display analysis data in split-panel format!
