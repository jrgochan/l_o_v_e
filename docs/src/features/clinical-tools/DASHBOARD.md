# Clinical Dashboard Implementation Plan

**Created**: December 5, 2025  
**Purpose**: Add expandable Clinical Dashboard to Chat Panel for therapists and psychiatrists  
**Status**: 🚧 In Progress

---

## Overview

Enhance the Chat Panel's Analysis Panel with:

1. Expandable layout (normal → expanded → fullscreen)
2. Clinical Dashboard showing priority information at-a-glance
3. Rich visualizations for clinical assessment
4. Session metrics and tracking

---

## Phase 1: Foundation (Expansion Mechanics) ✅ COMPLETE

**Goal**: Implement core expansion mechanics and layout transitions

### Tasks

- [x] Add expansion state management to ChatPanel
- [x] Implement layout transitions and animations
- [x] Update AnalysisPanel to support expansion states
- [x] Add expand/collapse toggle button
- [x] Implement keyboard shortcut (Ctrl+Shift+A)
- [x] Handle responsive behavior

### Files to Modify

- `experience/web/components/admin/ChatPanel.tsx`
- `experience/web/components/admin/AnalysisPanel.tsx`

### Technical Details

- **States**: 'normal' | 'expanded' | 'fullscreen'
- **Widths**:
  - Normal: `w-96` (384px)
  - Expanded: `w-[calc(100%-18rem)]` (covers chat, keeps history)
  - Fullscreen: `w-full` (covers everything)
- **Animation**: 300ms cubic-bezier transition

---

## Phase 2: Dashboard Core ✅ COMPLETE

**Goal**: Create Clinical Dashboard with essential clinical information

### Tasks

```typescript
// Example usage
<ClinicalDashboard 
  emotion={currentEmotion}
  vac={vacMetrics}
  prosody={audioAnalysis}
/>
```

- [x] Create ClinicalDashboard component
- [x] Implement AlertBadge system
- [x] Build SessionMetrics tracker
- [x] Add VAC Quadrant visualization (basic)
- [x] Create Voice-Content Correlation display
- [x] Add type definitions for clinical data

### New Files to Create

- `experience/web/components/admin/ClinicalDashboard.tsx`
- `experience/web/components/admin/clinical/AlertBadge.tsx`
- `experience/web/components/admin/clinical/SessionMetrics.tsx`
- `experience/web/components/admin/clinical/VACQuadrantViz.tsx`
- `experience/web/components/admin/clinical/VoiceContentCorrelation.tsx`

### Type Extensions Needed

```typescript
export type AnalysisExpandState = 'normal' | 'expanded' | 'fullscreen';

interface DashboardProps {
  emotion: EmotionData;
  category: CategoryData;
  vac: VACData;
  confidence: number;
  prosody: ProsodyData;
  insights: InsightsData;
}

export interface SessionMetrics {
  startTime: Date;
  elapsedSeconds: number;
  emotionCount: number;
  averageConfidence: number;
  dominantCategory: string | null;
  alertCount: {
    critical: number;
    warning: number;
    attention: number;
  };
}

export interface ClinicalAlert {
  level: 'critical' | 'warning' | 'attention' | 'stable';
  type: 'high_arousal' | 'voice_mismatch' | 'low_confidence' | 'pattern_concern';
  message: string;
  timestamp: Date;
  actionable: boolean;
  suggestion?: string;
}
```

```typescript
const [isClinicalMode, setIsClinicalMode] = useState(false);

const toggleMode = () => {
  setIsClinicalMode(!isClinicalMode);
  // Optional: Play transition sound
};
```

---

## Phase 3: Enhanced Visualizations ✅ COMPLETE

**Goal**: Add rich clinical data visualizations

### Tasks

- [x] Implement VAC trajectory plot (historical movement)
- [x] Create session timeline graph
- [x] Add historical tracking (VAC history & timeline events)
- [x] Add Prosody waveform visualization with Web Audio API
- [ ] Build advanced risk indicator system (Future enhancement)
- [ ] Implement comparative analysis views (Future enhancement)

### New Files to Create

- `experience/web/components/admin/clinical/ProsodyVisualization.tsx`
- `experience/web/components/admin/clinical/VACTrajectoryPlot.tsx`
- `experience/web/components/admin/clinical/SessionTimeline.tsx`
- `experience/web/components/admin/clinical/RiskIndicator.tsx`

---

## Phase 4: Polish & Optimization ⏸️ PENDING

**Goal**: UX refinement and performance optimization

### Tasks

- [ ] Smooth animations and transitions
- [ ] Responsive design for all screen sizes
- [ ] Accessibility improvements (keyboard nav, ARIA labels, screen readers)
- [ ] Performance optimization (lazy loading, memoization)
- [ ] User preference persistence (localStorage)
- [ ] Error boundaries and fallback states
- [ ] Loading states and skeletons
- [ ] Cross-browser testing

---

## Design System

### Color Coding

- 🔴 **Red** (#EF4444): Critical alerts, high negative arousal
- 🟡 **Yellow** (#F59E0B): Warnings, attention needed
- 🟢 **Green** (#10B981): Positive states, stable
- 🔵 **Blue** (#3B82F6): Low arousal, calm states
- 🟣 **Purple** (#8B5CF6): Analysis data, VAC markers
- 🟠 **Orange** (#F97316): Voice-content discrepancies

### Alert Levels

- 🔴 **Critical**: Arousal > 0.7 AND Valence < -0.5 (crisis indicators)
- ⚠️ **Warning**: Voice-content mismatch > 0.5 (emotional suppression)
- 🟡 **Attention**: Low confidence < 0.6 (needs verification)
- 🟢 **Stable**: Positive quadrants or therapeutic progress

### VAC Quadrants

- **Quadrant I**: Positive Valence, Negative Arousal (calm, content)
- **Quadrant II**: Negative Valence, Negative Arousal (sad, depressed)
- **Quadrant III**: Negative Valence, Positive Arousal (anxious, angry)
- **Quadrant IV**: Positive Valence, Positive Arousal (excited, joyful)

---

## Layout States

### Normal State (Default)

```text
┌──────────────────────────────────────────────────────────────────┐
│ [History Panel - 18rem] [Chat Messages] [Analysis Panel - 24rem] │
│  📊 Emotion History     💬 Chat            📈 Clinical Dashboard  │
│  - Timeline             - User messages    - Alerts              │
│  - Cards                - Analysis         - Metrics             │
│                         - Transcripts      - VAC Viz             │
└──────────────────────────────────────────────────────────────────┘
```

### Expanded State

```text
┌──────────────────────────────────────────────────────────────────┐
│ [History Panel - 18rem] [Analysis Panel Expanded - Rest]         │
│  📊 Emotion History     📈 Clinical Dashboard (Detailed)          │
│  - Timeline             ┌────────────────────────────────────┐   │
│  - Cards                │ Priority Alerts                    │   │
│                         │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│                         │ [Emotion] [VAC Viz] [Voice]       │   │
│                         │ Detailed Analysis...               │   │
│                         └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Fullscreen State

```text
┌──────────────────────────────────────────────────────────────────┐
│                   📈 Clinical Dashboard (Full)                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Priority Alerts & Session Metrics                          │  │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ [Emotion State] [VAC Analysis] [Voice Profile]            │  │
│ │ [Session Timeline] [Risk Indicators] [Recommendations]    │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

- **Ctrl/Cmd + Shift + A**: Toggle Analysis Panel expansion
- **Ctrl/Cmd + Shift + F**: Toggle fullscreen mode
- **Escape**: Return to normal state (from expanded/fullscreen)

---

## Progress Tracking

### Completed ✅

- [x] Research and analysis phase
- [x] UX recommendations
- [x] Implementation plan created
- [x] Phase 1: Expansion mechanics
- [x] Phase 2: Dashboard core
- [x] Phase 3: Enhanced visualizations

### In Progress 🚧

- None (Phases 1, 2 & 3 Complete!)

### Next Up 🔜

- [ ] Phase 4: Polish & optimization

### Future 📅

- [ ] Phase 3: Enhanced visualizations
- [ ] Phase 4: Polish & optimization

---

## Notes & Decisions

### December 5, 2025 (Initial Planning)

- Decided on expandable layout to maximize screen real estate for clinical data
- Analysis panel expands leftward to cover chat while keeping history visible
- Three-state expansion: normal → expanded → fullscreen
- Clinical Dashboard prioritizes at-a-glance information with progressive disclosure

### December 5, 2025 (Phase 1 & 2 Implementation)

#### Phase 1 Complete

- ✅ Added `AnalysisExpandState` type ('normal' | 'expanded' | 'fullscreen')
- ✅ Implemented expansion state management in ChatPanel
- ✅ Added keyboard shortcuts: Ctrl/Cmd+Shift+A (toggle), Escape (return to normal)
- ✅ Implemented smooth CSS transitions (300ms cubic-bezier)
- ✅ Updated layout to conditionally hide chat/history based on expansion state
- ✅ Added session metrics tracking with real-time timer
- ✅ Integrated alert counting system in session metrics

#### Phase 2 Complete

- ✅ Created ClinicalDashboard main component with adaptive layouts
- ✅ Built AlertBadge component with 4 alert levels (critical, warning, attention, stable)
- ✅ Built SessionMetricsDisplay with compact and expanded views
- ✅ Built VACQuadrantViz with 2D plot visualization
- ✅ Built VoiceContentCorrelation component with discrepancy detection
- ✅ Integrated dashboard into AnalysisPanel as primary display
- ✅ Added clinical alert detection logic:
  - Critical: High negative arousal (arousal > 0.7 && valence < -0.5)
  - Warning: Voice-content mismatch (discrepancy > 0.5)
  - Attention: Low confidence (< 0.6)

**Components Created:**

- `experience/web/components/admin/ClinicalDashboard.tsx`
- `experience/web/components/admin/clinical/AlertBadge.tsx`
- `experience/web/components/admin/clinical/SessionMetrics.tsx`
- `experience/web/components/admin/clinical/VACQuadrantViz.tsx`
- `experience/web/components/admin/clinical/VoiceContentCorrelation.tsx`

**Files Modified:**

- `experience/web/types/chat.ts` - Added new types
- `experience/web/components/admin/ChatPanel.tsx` - Added expansion logic
- `experience/web/components/admin/AnalysisPanel.tsx` - Integrated dashboard

### December 5, 2025 (Phase 3 Implementation)

#### Phase 3 Complete

- ✅ Added historical tracking types (VACHistoryPoint, EmotionTimelineEvent)
- ✅ Implemented VAC history tracking in ChatPanel
- ✅ Implemented emotion timeline tracking with alert levels
- ✅ Created VACTrajectoryPlot - shows emotional journey through VAC space
  - SVG path rendering with gradient
  - Start, path, and current position markers
  - Valence and arousal change calculations
- ✅ Created SessionTimeline - chronological event list
  - Color-coded timeline markers by alert level
  - Relative timestamps from session start
  - VAC preview for each event
  - Scrollable with custom styling
  - Highlights current (latest) event
- ✅ Integrated Phase 3 visualizations into dashboard (only shown in expanded state with 2+ data points)

#### Components Created

- `experience/web/components/admin/clinical/VACTrajectoryPlot.tsx`
- `experience/web/components/admin/clinical/SessionTimeline.tsx`
- `experience/web/components/admin/clinical/ProsodyVisualization.tsx`

#### Files Modified

- `experience/web/types/chat.ts` - Added VACHistoryPoint and EmotionTimelineEvent types
- `experience/web/components/admin/ChatPanel.tsx` - Added tracking arrays and logic, audioBlob tracking
- `experience/web/components/admin/AnalysisPanel.tsx` - Pass history and audioBlob to dashboard
- `experience/web/components/admin/ClinicalDashboard.tsx` - Conditional rendering of Phase 3 components
- `experience/web/components/admin/VoiceRecorder.tsx` - Pass audioBlob to parent
- `experience/web/components/admin/clinical/ProsodyVisualization.tsx` - Web Audio API integration

### December 5, 2025 (Real Audio Waveform Enhancement)

#### Prosody Waveform with Web Audio API

- ✅ Added audioBlob prop through component tree (ChatPanel → AnalysisPanel → Dashboard → ProsodyViz)
- ✅ Implemented Web Audio API waveform extraction
  - Decodes audio blob using AudioContext
  - Extracts 40 amplitude samples (RMS calculation)
  - Normalizes to 0-100 range for visualization
- ✅ Hybrid approach: Real waveform when audio available, synthetic fallback otherwise
- ✅ Visual distinction: Green bars for real audio, cyan for synthetic
- ✅ Loading state while processing audio
- ✅ Error handling with graceful fallback
- ✅ Accuracy badge shows when using real audio

#### Clinical Benefits

- Shows actual speech pauses and patterns
- Reveals true intensity variations
- Displays voice breaks and tremors
- More accurate clinical assessment
- Better correlation with prosody metrics

---

## Testing Checklist

### Functionality

- [ ] Expansion transitions work smoothly
- [ ] Keyboard shortcuts function correctly
- [ ] State persistence across panel collapse/expand
- [ ] All visualizations render correctly in each state
- [ ] Alert system triggers appropriately
- [ ] Session metrics track accurately

### UX/Accessibility

- [ ] Responsive on various screen sizes
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces state changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus management during expansion
- [ ] No layout shift/jank during transitions

### Performance

- [ ] Smooth 60fps animations
- [ ] No memory leaks
- [ ] Efficient re-renders (React.memo where appropriate)
- [ ] Large datasets handled gracefully

---

## Future Enhancements (Post-MVP)

- [ ] Export clinical reports (PDF)
- [ ] Multi-session comparison views
- [ ] Pattern recognition alerts
- [ ] Integration with EMR systems
- [ ] Custom alert thresholds per clinician
- [ ] Session note-taking inline
- [ ] Voice memo attachments
- [ ] DSM-5 category mapping
- [ ] Treatment progress tracking
- [ ] Longitudinal VAC trajectory visualization
