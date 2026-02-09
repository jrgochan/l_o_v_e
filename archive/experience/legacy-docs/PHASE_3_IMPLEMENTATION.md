# Phase 3 Implementation: Large Panel Refactoring

**Date Started:** 2025-12-23
**Status:** 🚧 IN PROGRESS
**Approach:** Option A - Complete all 5 components

---

## 🎯 Objectives

Refactor 5 large panel components (2,691 total lines) into well-organized, maintainable structures using:
- Proven patterns from Phase 1 (ChatPanel)
- Shared components from Phase 2 (spheres, emotion-display, layout)
- Custom hooks for logic extraction
- Sub-components for UI organization

---

## 📋 Component Targets

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| InfoPanel.tsx | 599 lines | ~150 lines | 🚧 In Progress |
| ControlPanel.tsx | 527 lines | ~150 lines | ⏳ Pending |
| ClinicalDashboard.tsx | 493 lines | ~100 lines | ⏳ Pending |
| PathMatrixGrid.tsx | 560 lines | ~100 lines | ⏳ Pending |
| HelpModal.tsx | 512 lines | ~200 lines | ⏳ Pending |
| **Total** | **2,691 lines** | **~700 lines** | **26% reduction** |

---

## 🔧 Implementation Order

### 1. InfoPanel (Priority 1) - CURRENT

**Complexity:** High (multiple responsibilities)
**Estimated Time:** 2-3 hours
**Impact:** Largest single reduction (599 → ~150 lines)

#### Extraction Plan:

**Custom Hooks (3):**
- `hooks/admin/useInfoPanelState.ts` - Tab state, waypoint selection, display logic
- `hooks/admin/usePathComparison.ts` - Path comparison metrics
- `hooks/admin/usePathSorting.ts` - Path sorting and badge calculation

**Sub-Components (6):**
- `panels/InfoPanel/index.tsx` - Main orchestration (~150 lines)
- `panels/InfoPanel/EmotionDetails.tsx` - Single emotion view (~120 lines)
- `panels/InfoPanel/EmotionList.tsx` - Multiple emotions list (~100 lines)
- `panels/InfoPanel/PathDetails.tsx` - Single path info (~140 lines)
- `panels/InfoPanel/PathComparison.tsx` - Multi-path metrics (~80 lines)
- `panels/InfoPanel/PathSummaryList.tsx` - Sorted path list (~150 lines)

**Benefits:**
- Reuses CharacterSphere and PreviewSphere from Phase 2
- Reuses EmotionCard for waypoint displays
- Clear separation of concerns
- Each component ~80-150 lines

---

### 2. ControlPanel (Priority 2)

**Complexity:** Medium (search, categories, layers)
**Estimated Time:** 2-3 hours
**Impact:** 527 → ~150 lines (71% reduction)

#### Extraction Plan:

**Custom Hooks (2):**
- `hooks/admin/useEmotionSearch.ts` - Search filtering logic
- `hooks/admin/useCategoryToggle.ts` - Category enable/disable

**Sub-Components (6):**
- `panels/ControlPanel/index.tsx` - Main orchestration
- `panels/ControlPanel/EmotionSearch.tsx` - Search UI
- `panels/ControlPanel/CategoryBrowser.tsx` - Category list with expand/collapse
- `panels/ControlPanel/LayerControls.tsx` - Layer visibility toggles
- `panels/ControlPanel/AnimationModeSelector.tsx` - Animation mode buttons
- `panels/ControlPanel/QuickActions.tsx` - Bridge selection, clear all

---

### 3. ClinicalDashboard (Priority 3)

**Complexity:** Medium (multiple sections)
**Estimated Time:** 1-2 hours
**Impact:** 493 → ~100 lines (80% reduction)

#### Extraction Plan:

**Sub-Components (5):**
- `clinical/ClinicalDashboard/index.tsx` - Layout with BasePanel
- `clinical/ClinicalDashboard/ProsodySection.tsx` - Voice analysis
- `clinical/ClinicalDashboard/EmotionSection.tsx` - Emotion display (uses EmotionCluster)
- `clinical/ClinicalDashboard/VACSection.tsx` - VAC visualization (uses AggregateSphere)
- `clinical/ClinicalDashboard/TimelineSection.tsx` - Timeline display

---

### 4. PathMatrixGrid (Priority 4)

**Complexity:** High (complex visualization)
**Estimated Time:** 2-3 hours
**Impact:** 560 → ~100 lines (82% reduction)

#### Extraction Plan:

**Custom Hook (1):**
- `hooks/visualization/useMatrixData.ts` - Data processing and filtering

**Sub-Components (4):**
- `visualizations/PathMatrixGrid/index.tsx` - Main component
- `visualizations/PathMatrixGrid/MatrixGrid.tsx` - Grid rendering
- `visualizations/PathMatrixGrid/MatrixCell.tsx` - Individual cell
- `visualizations/PathMatrixGrid/MatrixControls.tsx` - Filter controls

---

### 5. HelpModal (Priority 5)

**Complexity:** Low (mostly content)
**Estimated Time:** 1 hour
**Impact:** 512 → ~200 lines (61% reduction)

#### Extraction Plan:

**Strategy:**
- Use BaseModal from Phase 2
- Organize content into sections
- May extract help content to config

---

## 📝 Progress Tracking

### InfoPanel Implementation

- [x] Backup original file
- [ ] Create `useInfoPanelState.ts` hook
- [ ] Create `usePathComparison.ts` hook
- [ ] Create `usePathSorting.ts` hook
- [ ] Create `EmotionDetails.tsx` component
- [ ] Create `EmotionList.tsx` component
- [ ] Create `PathDetails.tsx` component
- [ ] Create `PathComparison.tsx` component
- [ ] Create `PathSummaryList.tsx` component
- [ ] Create `panels/InfoPanel/index.tsx` (main)
- [ ] Verify TypeScript compilation
- [ ] Verify Next.js build
- [ ] Visual verification
- [ ] Mark InfoPanel complete

### ControlPanel Implementation

- [ ] Backup original file
- [ ] Create hooks
- [ ] Create sub-components
- [ ] Verify & test
- [ ] Mark complete

### ClinicalDashboard Implementation

- [ ] Backup original file
- [ ] Create sub-components
- [ ] Verify & test
- [ ] Mark complete

### PathMatrixGrid Implementation

- [ ] Backup original file
- [ ] Create hook
- [ ] Create sub-components
- [ ] Verify & test
- [ ] Mark complete

### HelpModal Implementation

- [ ] Backup original file
- [ ] Refactor with BaseModal
- [ ] Verify & test
- [ ] Mark complete

---

## ✅ Success Criteria

Phase 3 will be complete when:

1. ✅ All 5 components refactored
2. ✅ All new files have JSDoc comments
3. ✅ TypeScript compilation successful
4. ✅ Next.js build passing
5. ✅ Visual verification in browser
6. ✅ All backups created
7. ✅ ~32 new files created
8. ✅ Total lines reduced by ~1,991 (74%)

---

## 🎓 Patterns & Principles

### Extraction Pattern (Proven from Phase 1 & 2)

1. **Backup** - Always create .backup file
2. **Extract Hooks** - Move logic first
3. **Create Components** - Break UI into logical sections
4. **Use Shared** - Leverage Phase 2 components
5. **Reassemble** - Clean main orchestration
6. **Verify** - TypeScript, build, visual check

### File Naming Convention

- **Hooks:** `use[Feature][Purpose].ts`
- **Components:** `[Feature][Type].tsx`
- **Directories:** Logical grouping by purpose

### Code Quality Standards

- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Clear JSDoc comments
- TypeScript strict mode
- Consistent naming
- Maximum 300 lines per file

---

## 📊 Expected Impact

### Before Phase 3
```
components/admin/
├── InfoPanel.tsx (599 lines)
├── ControlPanel.tsx (527 lines)
├── ClinicalDashboard.tsx (493 lines)
├── PathMatrixGrid.tsx (560 lines)
├── HelpModal.tsx (512 lines)
└── ... (39 root files total)
```

### After Phase 3
```
components/admin/
├── panels/
│   ├── InfoPanel/ (6 files, ~740 lines total)
│   └── ControlPanel/ (6 files, ~620 lines total)
├── clinical/
│   └── ClinicalDashboard/ (5 files, ~400 lines total)
├── visualizations/
│   └── PathMatrixGrid/ (4 files, ~390 lines total)
└── HelpModal.tsx (~200 lines, using BaseModal)
```

**Total New Files:** ~32 files
**Total Lines Saved:** ~1,991 lines
**Average File Size:** 80-150 lines (maintainable!)

---

## 🚀 Timeline

**Estimated Total:** 8-12 hours
**Started:** 2025-12-23, 6:20 PM

**Component Breakdown:**
- InfoPanel: 2-3 hours ⏱️ IN PROGRESS
- ControlPanel: 2-3 hours
- ClinicalDashboard: 1-2 hours
- PathMatrixGrid: 2-3 hours
- HelpModal: 1 hour

**Buffer:** 1-2 hours for testing and documentation

---

## 📝 Notes

- Following same proven pattern from Phase 1 (ChatPanel)
- Leveraging all shared components from Phase 2
- Each component is independent - can pause between components
- Backups allow safe rollback if needed
- TypeScript compilation catches errors early

---

**Status:** 🚧 IN PROGRESS - InfoPanel refactoring underway
**Next:** Complete InfoPanel hooks and components
**Last Updated:** 2025-12-23, 6:21 PM
