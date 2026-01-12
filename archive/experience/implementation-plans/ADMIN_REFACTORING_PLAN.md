# Experience Module Admin Interface - Comprehensive Refactoring Plan

**Status:** Approved for implementation  
**Priority:** High - ChatPanel.tsx (1,010 lines) is critical  
**Timeline:** 4 weeks  
**Scope:** All phases  
**Date Created:** 2025-12-23

---

## 🔍 Analysis Summary

### Critical Issues Found

**1. ChatPanel.tsx - CRITICAL (1,010 lines)**
This is the #1 priority. Single file responsible for:
- Chat UI rendering
- WebSocket connection management  
- Message state management
- Progress tracking (Heartbeat Analyzer)
- Voice recording integration
- Multi-emotion analysis
- Session metrics tracking
- VAC history management
- Three-way analysis coordination
- Analysis panel state

**2. Other Oversized Components:**
- InfoPanel.tsx - 599 lines
- PathMatrixGrid.tsx - 560 lines  
- AIModelsSettings.tsx - 555 lines
- ControlPanel.tsx - 527 lines
- HelpModal.tsx - 512 lines
- MultiEmotionTable.tsx - 506 lines
- ClinicalDashboard.tsx - 493 lines

### Code Duplication

**3. Multiple Sphere Components with Overlapping Logic:**
- `EmotionSphere` (in EmotionCloud.tsx)
- `AggregateEmotionSphere.tsx` - 263 lines
- `EmotionCharacterSphere.tsx` - 218 lines
- `MiniSoulSphere.tsx` - 118 lines
- `EmotionSpherePreview.tsx` - 122 lines

All implement similar 3D sphere rendering with different features. Need unified base component.

**4. Duplicate Chat Components:**
- `ChatPanel.tsx` - 1,010 lines (fixed panel)
- `ChatDrawer.tsx` - 350 lines (drawer version)

Both handle chat UI with similar patterns and state management.

**5. Multiple Emotion Display Patterns:**
- EmotionBadge, EmotionChipCluster, EmotionCard, MultiEmotionCard
- Similar prop patterns, rendering logic, and styling
- Need unified base component with variants

### Directory Structure Issues

**6. Flat Root Structure**
39 .tsx files at components/admin/ root level makes navigation difficult. Subdirectories exist (clinical/, emotions/, paths/, settings/) but underutilized.

---

## 📋 Comprehensive Refactoring Plan

### Phase 1: Break Down ChatPanel.tsx (HIGHEST PRIORITY)

**Goal:** Reduce ChatPanel from 1,010 lines to ~200-300 lines  
**Timeline:** Week 1 (5 days)

#### Day 1-2: Extract Custom Hooks

**1. Extract Message Management** → `web/hooks/chat/useChatMessages.ts`
- Message state management
- Message adding/clearing
- DisplayMessage type handling
- Auto-scroll logic

**2. Extract Progress Tracking** → `web/hooks/chat/useHeartbeatProgress.ts`
- Progress state (stages, percentage, current message)
- Stage initialization based on deep feeling mode
- Progress simulation (fills gaps between backend updates)
- Adaptive message generation
- Stage status updates
- Cleanup on unmount

**3. Extract Session Metrics** → `web/hooks/chat/useSessionMetrics.ts`
- Session metrics state (start time, elapsed, emotion count, etc.)
- Timer management (update every second)
- Alert counting logic
- Average confidence calculation
- Dominant category tracking

**4. Extract Analysis State** → `web/hooks/chat/useAnalysisState.ts`
- Current analysis state (transcription, prosody, emotion, vac, etc.)
- Multi-emotion analysis state
- Three-way analysis state
- Analysis clearing
- State updates from WebSocket events

**5. Extract Layout State** → `web/hooks/chat/useChatLayout.ts`
- Expansion state (collapsed/expanded/fullscreen)
- Height management
- Resize handling
- Previous height tracking for fullscreen toggle

#### Day 3-4: Create Sub-Components

**1. ChatHeader.tsx**
- Expand/collapse button
- Title and connection status
- Fullscreen toggle
- Toggle group (Tone, Atlas, Deep Feeling)

**2. ChatMessageList.tsx**
- Message rendering loop
- InsightCard integration
- Multi-emotion display
- Progress indicator
- Auto-scroll ref management

**3. ChatInputBar.tsx**
- Text input
- Voice recording button
- Send button
- Keyboard shortcuts (Enter to send)
- Disabled states

**4. ChatLayout.tsx**
- Handles collapsed/expanded/fullscreen states
- Resize handle
- Height styling
- Click-to-expand collapsed state

#### Day 5: Integration & Testing

- Reassemble ChatPanel with new hooks and components
- Test all WebSocket integrations
- Verify state management
- Test all user interactions
- Performance testing

**Resulting Structure:**
```
web/
├── components/admin/
│   └── chat/
│       ├── ChatPanel.tsx (200 lines) - Main orchestration
│       ├── ChatHeader.tsx
│       ├── ChatMessageList.tsx
│       ├── ChatInputBar.tsx
│       └── ChatLayout.tsx
└── hooks/
    └── chat/
        ├── useChatMessages.ts
        ├── useHeartbeatProgress.ts
        ├── useSessionMetrics.ts
        ├── useAnalysisState.ts
        └── useChatLayout.ts
```

---

### Phase 2: Create Shared Component Library

**Goal:** Eliminate duplication by creating reusable primitives  
**Timeline:** Week 2 (5 days)

#### Day 1-2: Unified Sphere System

**Create** `web/components/admin/spheres/` directory:

**1. BaseSphere.tsx** (Core 3D sphere component)
- Common Three.js setup
- Shared animation logic
- Hover/click handling
- Size configuration
- Color management
- Particle effects foundation

**2. EmotionSphere.tsx** (Single emotion display)
- Extends BaseSphere
- VAC-based positioning
- Category coloring
- Bridge emotion indicators
- Selection state visuals

**3. AggregateSphere.tsx** (Multi-emotion display)
- Extends BaseSphere
- Blended emotion colors
- Complexity-based opacity
- Particle system for arousal
- Aggregate VAC positioning

**4. CharacterSphere.tsx** (Animated character display)
- Extends BaseSphere
- Animation mode support (subtle/dynamic/mystical)
- Motion indicators
- Character representation

**5. PreviewSphere.tsx** (Static preview)
- Extends BaseSphere
- Simplified rendering
- No interactions
- Optimized for small sizes

**Benefits:**
- Single source of truth for sphere rendering
- Consistent behavior across all spheres
- Easy to add new variants
- Better performance through shared code

#### Day 3-4: Emotion Display Components

**Create** `web/components/admin/emotion-display/` directory:

**1. BaseEmotionChip.tsx** (Foundation)
- Shared styling
- Click handling
- Hover effects
- Size variants

**2. EmotionBadge.tsx** (Compact badge)
- Uses BaseEmotionChip
- Category color dot
- Bridge indicator
- Confidence display

**3. EmotionCard.tsx** (Detailed card)
- Full emotion information
- VAC coordinates
- Definition text
- Sphere preview

**4. EmotionCluster.tsx** (Multi-emotion group)
- Grid or flow layout
- Relationship indicators
- Aggregate information

#### Day 5: Modal & Panel Base Components

**Create** `web/components/admin/layout/` directory:

**1. BaseModal.tsx**
- Consistent modal wrapper
- Backdrop
- Close button
- Escape key handling
- Animation

**2. BasePanel.tsx**
- Shared panel wrapper
- Border styling
- Padding consistency
- Header/content/footer sections

**3. PanelHeader.tsx**
- Title
- Action buttons
- Tab switcher support
- Consistent spacing

**4. PanelSection.tsx**
- Section title
- Collapsible support
- Consistent margins

---

### Phase 3: Refactor Large Panels

**Goal:** Break down 500+ line components into manageable pieces  
**Timeline:** Week 3 (5 days)

#### Day 1-2: InfoPanel Decomposition (599 → ~150 lines)

**Create** `web/components/admin/panels/InfoPanel/` directory:

**1. index.tsx** (150 lines)
- Main layout and tab switching
- Component orchestration
- Store connections

**2. EmotionDetails.tsx**
- Single emotion view
- Dual sphere display (character + VAC)
- Definition and coordinates
- Bridge emotion indicators

**3. PathDetails.tsx**
- Path information display
- Journey visualization (start → waypoints → goal)
- Difficulty and metrics
- Bridge requirements
- Waypoint click handling

**4. PathComparison.tsx**
- Multi-path comparison metrics
- Shortest/longest/easiest analysis
- Trade-off explanations

**5. PathSummaryList.tsx**
- Sorted path list
- Special badges (shortest, easiest, no bridge, fewest steps)
- Clickable waypoints
- Full journey display

#### Day 3: ControlPanel Decomposition (527 → ~150 lines)

**Create** `web/components/admin/panels/ControlPanel/` directory:

**1. index.tsx** (150 lines)
- Main layout
- Section orchestration

**2. EmotionSearch.tsx**
- Search input
- Filter logic
- Results display

**3. CategoryBrowser.tsx**
- Category expansion
- Emotion selection by category
- Selection state indicators (all/some/none)
- Category toggle buttons

**4. LayerControls.tsx**
- Layer visibility toggles
- Show/hide all
- Checkbox styling

**5. AnimationModeSelector.tsx**
- Mode selection buttons
- Mode descriptions
- Visual feedback

**6. QuickActions.tsx**
- Bridge emotion selection
- Clear all button
- Smart recommendations toggle

#### Day 4-5: Other Large Components

**1. ClinicalDashboard.tsx (493 → ~100 lines)**
Create `web/components/admin/clinical/ClinicalDashboard/`:
- index.tsx - Layout
- ProsodySection.tsx - Voice analysis
- EmotionSection.tsx - Emotion display
- VACSection.tsx - VAC visualization
- TimelineSection.tsx - Timeline display

**2. PathMatrixGrid.tsx (560 lines)**
Extract to subdirectory with:
- MatrixGrid component (grid rendering)
- MatrixCell component (individual cells)
- MatrixControls component (filters)
- useMatrixData hook (data processing)

**3. Settings Components**
Consolidate patterns across AIModelsSettings, NetworkSettings, etc.:
- Extract common form patterns to hooks
- Share validation logic
- Unify styling approach with base components

---

### Phase 4: Reorganize Directory Structure

**Goal:** Improve discoverability and maintainability  
**Timeline:** Week 4, Days 1-2

**Current Structure:**
```
components/admin/
├── 39 .tsx files at root level
├── clinical/ (9 files)
├── emotions/ (1 file)
├── paths/ (3 files)
└── settings/ (9 files)
```

**New Structure:**
```
components/admin/
├── README.md (updated)
├── ARCHITECTURE.md (new)
│
├── atlas/                           # Atlas visualization
│   ├── AtlasScene.tsx
│   ├── EmotionCloud.tsx
│   ├── PathNetwork.tsx
│   ├── LegendOverlay.tsx
│   └── EmotionLabelOverlay.tsx
│
├── chat/                            # Chat interface (Phase 1)
│   ├── ChatPanel.tsx (200 lines)
│   ├── ChatDrawer.tsx
│   ├── ChatHeader.tsx
│   ├── ChatMessageList.tsx
│   ├── ChatInputBar.tsx
│   ├── ChatLayout.tsx
│   └── VoiceRecorder.tsx
│
├── panels/                          # Major panel components (Phase 3)
│   ├── ControlPanel/
│   │   ├── index.tsx
│   │   ├── EmotionSearch.tsx
│   │   ├── CategoryBrowser.tsx
│   │   ├── LayerControls.tsx
│   │   ├── AnimationModeSelector.tsx
│   │   └── QuickActions.tsx
│   ├── InfoPanel/
│   │   ├── index.tsx
│   │   ├── EmotionDetails.tsx
│   │   ├── PathDetails.tsx
│   │   ├── PathComparison.tsx
│   │   └── PathSummaryList.tsx
│   ├── AnalysisPanel/
│   │   └── index.tsx
│   ├── EmotionHistoryPanel/
│   │   └── index.tsx
│   └── StatisticsPanel/
│       └── index.tsx
│
├── spheres/                         # Unified sphere system (Phase 2)
│   ├── BaseSphere.tsx
│   ├── EmotionSphere.tsx
│   ├── AggregateSphere.tsx
│   ├── CharacterSphere.tsx
│   └── PreviewSphere.tsx
│
├── emotion-display/                 # Emotion UI components (Phase 2)
│   ├── BaseEmotionChip.tsx
│   ├── EmotionBadge.tsx
│   ├── EmotionCard.tsx
│   ├── EmotionCluster.tsx
│   ├── MultiEmotionCard.tsx
│   └── EmotionMappingBadge.tsx
│
├── visualizations/                  # Data visualization
│   ├── EmotionRelationshipGraph.tsx
│   ├── PathMatrixGrid/
│   │   ├── index.tsx
│   │   ├── MatrixGrid.tsx
│   │   ├── MatrixCell.tsx
│   │   └── MatrixControls.tsx
│   ├── DataVisualizationOverlay.tsx
│   ├── EmotionTimeline.tsx
│   ├── AudioVisualizer.tsx
│   └── PathAnimator.tsx
│
├── clinical/                        # Clinical tools (already organized)
│   ├── ClinicalDashboard/
│   │   ├── index.tsx
│   │   ├── ProsodySection.tsx
│   │   ├── EmotionSection.tsx
│   │   ├── VACSection.tsx
│   │   └── TimelineSection.tsx
│   ├── AlertBadge.tsx
│   ├── MultiEmotionTable.tsx
│   ├── ProsodyVisualization.tsx
│   ├── SessionMetrics.tsx
│   ├── SessionTimeline.tsx
│   ├── VACQuadrantViz.tsx
│   ├── VACTrajectoryPlot.tsx
│   ├── VoiceContentCorrelation.tsx
│   └── VoiceContentThreeWay.tsx
│
├── settings/                        # Settings panels (already organized)
│   ├── AccessibilitySettings.tsx
│   ├── AIModelsSettings.tsx
│   ├── BehaviorSettings.tsx
│   ├── ChatSettings.tsx
│   ├── ConfirmDialog.tsx
│   ├── DevelopmentSettings.tsx
│   ├── ModelCard.tsx
│   ├── NetworkSettings.tsx
│   ├── PerformancePanel.tsx
│   ├── PullModelDialog.tsx
│   ├── RecommendationsPanel.tsx
│   └── VisualSettings.tsx
│
├── paths/                           # Path animation styles (already organized)
│   ├── PathCurveAnimated.tsx
│   ├── SubtleElegantPath.tsx
│   ├── DynamicPlayfulPath.tsx
│   └── MysticalEtherealPath.tsx
│
├── emotions/                        # Emotion-specific components
│   └── AnimatedEmotionNode.tsx
│
├── layout/                          # Layout primitives (Phase 2)
│   ├── BaseModal.tsx
│   ├── BasePanel.tsx
│   ├── PanelHeader.tsx
│   └── PanelSection.tsx
│
└── shared/                          # Truly shared utilities
    ├── ExportControls.tsx
    ├── HelpModal.tsx
    ├── SmartRecommendations.tsx
    ├── RelationshipIndicator.tsx
    ├── InsightCard.tsx
    ├── AnalysisProgressIndicator.tsx
    └── WaypointDetailModal.tsx
```

**Migration Strategy:**
1. Create new directories
2. Move files to new locations
3. Update imports throughout codebase
4. Test after each major move
5. Remove empty directories

---

### Phase 5: Extract Custom Hooks

**Goal:** Move complex logic out of components  
**Timeline:** Week 4, Day 3

**New Hooks Structure:**
```
hooks/
├── chat/                            # Chat-specific hooks (Phase 1)
│   ├── useChatMessages.ts
│   ├── useHeartbeatProgress.ts
│   ├── useSessionMetrics.ts
│   ├── useAnalysisState.ts
│   └── useChatLayout.ts
│
├── admin/                           # Admin panel hooks
│   ├── useEmotionSelection.ts      # Selection state management
│   ├── usePathFiltering.ts         # Path filtering logic
│   ├── useCategoryManagement.ts    # Category enable/disable
│   ├── useAdminKeyboardShortcuts.ts # Keyboard shortcuts
│   └── usePathComparison.ts        # Path comparison logic
│
├── visualization/                   # Visualization hooks
│   ├── useSphereAnimation.ts       # Sphere animation logic
│   ├── usePathAnimation.ts         # Path animation control
│   ├── use3DProjection.ts          # 3D to 2D projection
│   └── useMatrixData.ts            # Matrix grid data processing
│
└── existing hooks...
    ├── useAdminSphereSync.ts
    ├── useAnimationModeTransition.ts
    ├── useCommandPalette.ts
    ├── useComputeAllPaths.ts
    ├── useEmotionAtlas.ts
    ├── useEmotionNavigation.ts
    ├── useHistorySphereSync.ts
    └── ... (keep existing)
```

**Hook Extraction Checklist:**
- [ ] useChatMessages - Message state management
- [ ] useHeartbeatProgress - Progress tracking
- [ ] useSessionMetrics - Session metrics
- [ ] useAnalysisState - Analysis state
- [ ] useChatLayout - Layout state
- [ ] useEmotionSelection - Emotion selection logic
- [ ] usePathFiltering - Path filtering
- [ ] useCategoryManagement - Category management
- [ ] useAdminKeyboardShortcuts - Keyboard shortcuts
- [ ] usePathComparison - Path comparison
- [ ] useSphereAnimation - Sphere animations
- [ ] usePathAnimation - Path animations
- [ ] use3DProjection - 3D projection
- [ ] useMatrixData - Matrix data

---

### Phase 6: Type System Consolidation

**Goal:** Centralize and organize TypeScript types  
**Timeline:** Week 4, Day 3

**Current Types:**
- `types/atlas-admin.ts` - Admin types
- `types/chat.ts` - Chat types (large file)
- `types/command-palette.ts`

**Proposed Structure:**
```
types/
├── atlas-admin.ts                   # Keep as-is (well organized)
│
├── chat/                            # Split large chat.ts file
│   ├── index.ts                     # Re-exports all
│   ├── messages.ts                  # DisplayMessage, ChatMessage types
│   ├── analysis.ts                  # AnalysisData, InsightData types
│   ├── websocket.ts                 # WebSocket message types
│   ├── progress.ts                  # Progress tracking types
│   ├── metrics.ts                   # Session metrics types
│   └── multi-emotion.ts             # Multi-emotion analysis types
│
├── components/                      # Shared component prop types
│   ├── sphere-props.ts              # Sphere component props
│   ├── panel-props.ts               # Panel component props
│   └── emotion-display-props.ts     # Emotion display props
│
└── existing types...
    ├── command-palette.ts
    ├── glsl.d.ts
    └── react-three-fiber.d.ts
```

**Type Consolidation Tasks:**
- [ ] Split chat.ts into submodules
- [ ] Extract shared prop types
- [ ] Add JSDoc comments to all types
- [ ] Ensure no duplicate type definitions
- [ ] Use type composition where appropriate

---

### Phase 7: Testing & Documentation

**Goal:** Ensure refactored code is reliable and maintainable  
**Timeline:** Week 4, Days 4-5

#### Day 4: Testing

**Component Tests to Add:**
```
__tests__/
├── components/
│   └── admin/
│       ├── chat/
│       │   ├── ChatPanel.test.tsx
│       │   ├── ChatHeader.test.tsx
│       │   ├── ChatMessageList.test.tsx
│       │   └── ChatInputBar.test.tsx
│       ├── spheres/
│       │   ├── BaseSphere.test.tsx
│       │   ├── EmotionSphere.test.tsx
│       │   └── AggregateSphere.test.tsx
│       ├── emotion-display/
│       │   ├── EmotionBadge.test.tsx
│       │   └── EmotionCard.test.tsx
│       └── panels/
│           ├── InfoPanel.test.tsx
│           └── ControlPanel.test.tsx
└── hooks/
    └── chat/
        ├── useChatMessages.test.ts
        ├── useHeartbeatProgress.test.ts
        └── useSessionMetrics.test.ts
```

**Testing Priorities:**
1. Critical path: ChatPanel and hooks
2. Sphere components (ensure no regression)
3. Panel components
4. Emotion display components

**Test Coverage Goals:**
- 80%+ for hooks
- 70%+ for components
- 100% for critical paths (chat, WebSocket)

#### Day 5: Documentation

**1. Create ARCHITECTURE.md**
Location: `web/components/admin/ARCHITECTURE.md`

Contents:
- Component hierarchy diagram
- Data flow patterns (store → hooks → components)
- State management approach
- When to use which sphere variant
- When to use which emotion display variant
- Naming conventions
- File organization principles
- How to add new components

**2. Update README.md**
Location: `web/components/admin/README.md`

Add sections:
- New directory structure explanation
- Quick start for developers
- Component selection guide
- Import path examples
- Migration guide from old structure

**3. Component Documentation**
Add JSDoc comments to:
- All new hooks (params, return values, usage examples)
- All shared base components
- All complex props interfaces
- All non-obvious logic

**JSDoc Template:**
```typescript
/**
 * Custom hook for managing chat messages
 * 
 * Handles message state, adding/clearing messages, and auto-scroll behavior.
 * 
 * @example
 * ```tsx
 * const { messages, addMessage, clearMessages } = useChatMessages();
 * 
 * // Add a message
 * addMessage({
 *   id: '123',
 *   type: 'user',
 *   content: 'Hello',
 *   timestamp: new Date()
 * });
 * ```
 * 
 * @returns Object containing messages array and message management functions
 */
export function useChatMessages() {
  // ...
}
```

---

## 📊 Success Metrics

After completing all phases, we should achieve:

✅ **Component Size**
- No component over 400 lines (target: max 300)
- ChatPanel reduced from 1,010 → ~200 lines
- InfoPanel reduced from 599 → ~150 lines
- ControlPanel reduced from 527 → ~150 lines

✅ **Code Quality**
- No code duplication in sphere components
- No code duplication in emotion display components
- 80%+ logic in hooks rather than components
- Consistent patterns across similar components

✅ **Architecture**
- Clear directory structure with logical grouping
- 8 main categories vs. flat structure
- Easy to find components
- Obvious where new components belong

✅ **Maintainability**
- Well-documented architecture
- Comprehensive JSDoc comments
- Clear component selection guide
- Testing infrastructure in place

✅ **Performance**
- Better memoization through decomposition
- Reduced re-renders
- Smaller component trees
- Faster development builds

✅ **Developer Experience**
- Easier to understand codebase
- Faster to add new features
- Reduced merge conflicts
- Better IDE autocomplete

---

## 🎯 Implementation Checklist

### Week 1: ChatPanel Crisis ⚠️
- [ ] Day 1-2: Extract hooks
  - [ ] useChatMessages.ts
  - [ ] useHeartbeatProgress.ts
  - [ ] useSessionMetrics.ts
  - [ ] useAnalysisState.ts
  - [ ] useChatLayout.ts
- [ ] Day 3-4: Create sub-components
  - [ ] ChatHeader.tsx
  - [ ] ChatMessageList.tsx
  - [ ] ChatInputBar.tsx
  - [ ] ChatLayout.tsx
- [ ] Day 5: Integration & testing
  - [ ] Reassemble ChatPanel
  - [ ] Test WebSocket integration
  - [ ] Test state management
  - [ ] Test user interactions
  - [ ] Performance testing

### Week 2: Sphere Unification
- [ ] Day 1-2: Create sphere system
  - [ ] BaseSphere.tsx
  - [ ] EmotionSphere.tsx
  - [ ] AggregateSphere.tsx
  - [ ] CharacterSphere.tsx
  - [ ] PreviewSphere.tsx
- [ ] Day 3-4: Migrate usage
  - [ ] Update EmotionCloud
  - [ ] Update InfoPanel
  - [ ] Update ControlPanel
  - [ ] Update AnalysisPanel
  - [ ] Remove old implementations
- [ ] Day 5: Emotion display components
  - [ ] BaseEmotionChip.tsx
  - [ ] EmotionBadge.tsx
  - [ ] EmotionCard.tsx
  - [ ] EmotionCluster.tsx

### Week 3: Panel Refactoring
- [ ] Day 1-2: InfoPanel decomposition
  - [ ] Create panels/InfoPanel/
  - [ ] Extract EmotionDetails.tsx
  - [ ] Extract PathDetails.tsx
  - [ ] Extract PathComparison.tsx
  - [ ] Extract PathSummaryList.tsx
  - [ ] Reassemble index.tsx
- [ ] Day 3: ControlPanel decomposition
  - [ ] Create panels/ControlPanel/
  - [ ] Extract EmotionSearch.tsx
  - [ ] Extract CategoryBrowser.tsx
  - [ ] Extract LayerControls.tsx
  - [ ] Extract AnimationModeSelector.tsx
  - [ ] Extract QuickActions.tsx
  - [ ] Reassemble index.tsx
- [ ] Day 4-5: Other large components
  - [ ] ClinicalDashboard decomposition
  - [ ] PathMatrixGrid decomposition
  - [ ] Settings pattern consolidation

### Week 4: Structure & Polish
- [ ] Day 1-2: Directory reorganization
  - [ ] Create new directory structure
  - [ ] Move files systematically
  - [ ] Update all imports
  - [ ] Test after each major move
  - [ ] Remove empty directories
- [ ] Day 3: Custom hooks & types
  - [ ] Extract remaining hooks
  - [ ] Split chat.ts into submodules
  - [ ] Consolidate shared prop types
  - [ ] Add JSDoc to all new code
- [ ] Day 4: Testing
  - [ ] Write component tests
  - [ ] Write hook tests
  - [ ] Test critical paths
  - [ ] Performance testing
- [ ] Day 5: Documentation
  - [ ] Create ARCHITECTURE.md
  - [ ] Update README.md
  - [ ] Add component documentation
  - [ ] Create migration guide

---

## 🚨 Risk Management

**Potential Risks:**

1. **Breaking Changes**
   - Mitigation: Update imports systematically, test thoroughly
   - Keep old components temporarily until migration complete

2. **WebSocket Integration Issues**
   - Mitigation: Test WebSocket thoroughly after ChatPanel refactor
   - Maintain same hook interface

3. **Three.js Rendering Regressions**
   - Mitigation: Visual testing of all sphere variants
   - Keep BaseSphere interface compatible

4. **Performance Degradation**
   - Mitigation: Performance testing after each phase
   - Profile before and after changes

5. **Time Overruns**
   - Mitigation: Phase-based approach allows stopping at any phase
   - Week 1 (ChatPanel) is independent and highest value

**Rollback Plan:**
- Git branches for each phase
- Can rollback individual phases if needed
- Old components kept until verified working

---

## 📝 Notes & Context

**Why ChatPanel is Critical:**
- 1,010 lines makes it unmaintainable
- Single file responsibility violations
- Hard to test
- Hard to modify without breaking
- Performance issues from unnecessary re-renders
- Blocking other developers

**Why Sphere Unification Matters:**
- 5 different sphere implementations
- ~700 total lines of duplicated logic
- Inconsistent behavior across spheres
- Hard to add features to all variants
- Performance improvements from shared code

**Why Directory Structure Matters:**
- 39 files at root is cognitive overload
- Hard to find relevant components
- No clear organization principle
- Scales poorly as more components added
- Makes PR reviews harder

**Dependencies:**
- All changes are backward compatible initially
- Phase 1 is independent
- Phase 2 is independent
- Phase 3 depends on Phase 2 (uses new spheres)
- Phase 4 can happen anytime
- Phase 5 supports all other phases

---

## ✅ Approval & Sign-Off

**Approved By:** User  
**Date:** 2025-12-23  
**Priority:** ChatPanel.tsx is highest priority  
**Breaking Changes:** Approved (import paths will change)  
**Backward Compatibility:** Deprecate old components after migration  
**Timeline:** 4-week timeline approved  
**Scope:** All phases approved, top to bottom

---

## 📞 Support & Questions

If interrupted during implementation:
1. Check this file for current status
2. Review checklist to see what's completed
3. Each phase is independent - can resume at any phase
4. Git history will show progress

**Status Location:** Each phase has a dedicated branch:
- `refactor/phase1-chatpanel`
- `refactor/phase2-spheres`
- `refactor/phase3-panels`
- `refactor/phase4-structure`

---

**Last Updated:** 2025-12-23  
**Next Review:** After Week 1 completion
