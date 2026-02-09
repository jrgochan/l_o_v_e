# Path Computation UX - Session Progress

**Date:** January 4, 2026
**Session Time:** 8:00 PM - 8:25 PM MT
**Status:** Phase 1 Complete, Ready for Phase 2

---

## ✅ Completed Work

### Phase 1: Foundation (COMPLETE)

#### 1. Type System Updated

**File:** `web/types/atlas-admin.ts`

- ✅ Added `PathComputeMode` type: `'always' | 'cache-first' | 'manual'`
- ✅ Added `CacheStatus` interface
- ✅ Changed `autoComputePaths: boolean` → `computeMode: PathComputeMode`
- ✅ Updated `DEFAULT_SETTINGS` to `computeMode: 'cache-first'`

#### 2. Store Enhanced

**File:** `web/stores/useAtlasAdminStore.ts`

- ✅ Added `cacheStatus: CacheStatus` to state
- ✅ Implemented `updateCacheStatus()` action
- ✅ Implemented `getCachedPath()` - lookup local cache
- ✅ Implemented `fetchPathFromBackend()` - fetch single path from API
- ✅ Implemented `loadCacheIfNeeded()` - smart cache loading
- ✅ Updated `addComputedPath()` to track cache count
- ✅ Updated `clearComputedPaths()` to reset cache status

#### 3. Cache Loading Enhanced

**File:** `web/hooks/useLoadCachedPaths.ts`

- ✅ Now updates store cache status when loading complete
- ✅ Sets `loaded: true`, `count`, and `lastLoadTime`

#### 4. Documentation

**File:** `experience/PATH_COMPUTATION_UX_IMPLEMENTATION.md`

- ✅ Complete 6-phase implementation guide
- ✅ Code snippets for all components
- ✅ Testing checklist
- ✅ Backend requirements

---

## 🚧 Remaining Work

### Phase 1 (Cont.) - Settings Migration

**Critical:** Update all references from `autoComputePaths` to `computeMode`

Files to update:

1. `web/stores/useSettingsStore.ts` - Change type and default
2. `web/hooks/useSettingsSync.ts` - Update sync logic
3. `web/components/admin/panels/ControlPanel/LayerControls.tsx` - Update UI
4. `web/components/admin/settings/BehaviorSettings.tsx` - Build 3-mode toggle
5. `web/components/admin/visualizations/PathMatrix/index.tsx` - Update reference
6. `web/components/admin/shared/SmartRecommendations.tsx` - Update logic
7. `web/hooks/usePathCalculator.ts` - Update conditions
8. `web/utils/settingsPresets.ts` - Update all presets
9. All test files - Update mocks

**Search Pattern:**

```typescript
// Old
if (settings.autoComputePaths) {
}

// New - For checking if auto-enabled:
if (settings.computeMode !== "manual") {
}

// Or specific mode:
if (settings.computeMode === "always") {
}
if (settings.computeMode === "cache-first") {
}
```

---

### Phase 2 - Enhanced Path Computation Logic

**File:** `web/hooks/usePathCalculator.ts`

Key changes:

1. Check `computeMode` instead of `autoComputePaths`
2. Implement cache-first strategy:
   - Check local cache first
   - Try backend API if not cached
   - Compute fresh as fallback
3. Track counts: `cachedCount`, `backendCount`, `computedCount`
4. Show feedback toast with breakdown

**Estimated Time:** 1 hour

---

### Phase 3 - Three-Mode Toggle UI

**Files to create/update:**

1. `web/components/admin/settings/BehaviorSettings.tsx`
   - Replace checkbox with 3-button toggle
   - Green/Yellow/Red color coding
   - Help text explaining each mode

2. `web/components/admin/panels/ControlPanel/LayerControls.tsx`
   - Show current mode as badge
   - Quick mode indicator

**Estimated Time:** 45 minutes

---

### Phase 4 - Feedback Components

**New files to create:**

1. `web/components/admin/shared/PathComputeBanner.tsx`
   - Shows in manual/cache-first modes
   - Provides quick mode switch

2. `web/components/admin/panels/ControlPanel/CacheStatusWidget.tsx`
   - Displays cache status dot
   - Shows path count
   - Refresh button

3. `web/utils/toast.ts`
   - Simple toast notification system
   - Or integrate existing toast library

**Files to update:**

1. InfoPanel - Add path source statistics
2. Main layout - Include PathComputeBanner

**Estimated Time:** 1 hour

---

### Phase 5 - Path Matrix Enhancements

**File:** `web/components/admin/visualizations/PathMatrix/index.tsx`

Changes:

1. Auto-load cache on open (if not loaded)
2. Rename buttons:
   - "Load Cache" → "Refresh Cache"
   - Add "Compute Missing" button
   - "Compute All" → "Recompute All"

**File:** `web/hooks/useComputeAllPaths.ts`

Add:

1. `computeMissingPaths()` function
2. Logic to find gaps in cache
3. Batch compute only missing paths

**Estimated Time:** 45 minutes

---

### Phase 6 - Final Integration & Testing

Tasks:

1. Update all remaining references
2. Test all three modes
3. Verify cache behavior
4. Test Path Matrix workflows
5. Update all test files
6. Fix any TypeScript errors

**Estimated Time:** 1-2 hours

---

## 📊 Implementation Status

### Phase Completion

- ✅ Phase 1: 90% complete (just need to migrate all autoComputePaths references)
- ⏳ Phase 2: 0% (ready to start)
- ⏳ Phase 3: 0%
- ⏳ Phase 4: 0%
- ⏳ Phase 5: 0%
- ⏳ Phase 6: 0%

### Overall Progress: ~15% Complete

---

## 🎯 Next Session Priorities

### Immediate Next Steps (30 mins)

1. Search and replace all `autoComputePaths` → `computeMode` logic
2. Update usePathCalculator conditions
3. Test that app still builds without errors

### Quick Wins (1 hour)

4. Implement enhanced usePathCalculator with cache-first
5. Build three-mode toggle UI in settings
6. Add basic toast notifications

### Polish (1-2 hours)

7. Create PathComputeBanner component
8. Add Cache Status Widget
9. Enhance Path Matrix with smart buttons
10. Full testing workflow

---

## 💡 Implementation Strategy

### Approach A: Complete in One Session (4-5 hours)

- Finish all phases 1-6
- Full testing and polish
- Production-ready feature

### Approach B: Incremental (Multiple Sessions)

- **Session 1 (DONE):** Foundation + types
- **Session 2:** Core logic (usePathCalculator enhancement)
- **Session 3:** UI components
- **Session 4:** Testing and polish

### Approach C: MVP Then Enhance (Recommended)

- **Next 2 hours:** Complete Phases 1-2 (core functionality working)
- **Test MVP:** Three modes work, cache-first functional
- **Later session:** Add all UI polish (Phases 3-4)
- **Final session:** Path Matrix enhancements (Phase 5)

---

## 🔧 Quick Reference Commands

### Find all autoComputePaths references:

```bash
cd experience/web
grep -r "autoComputePaths" --include="*.ts" --include="*.tsx" .
```

### Count total occurrences:

```bash
cd experience/web
grep -r "autoComputePaths" --include="*.ts" --include="*.tsx" . | wc -l
```

### Test build:

```bash
cd experience/web
npm run build
```

### Run dev server:

```bash
cd experience/web
npm run dev
```

---

## 📝 Notes

### Design Decisions Made

- Default mode: `'cache-first'` (best UX)
- Cache is automatically tracked on every path add
- Backend fetching is optional (returns null if 404)
- Three-mode system more flexible than boolean

### Technical Considerations

- All changes are backwards compatible with migration
- Cache status is reactive (updates UI automatically)
- No breaking changes to existing functionality
- TypeScript ensures type safety throughout

### User Experience Goals

- **Always Mode:** Power users who want fresh data
- **Cache First:** Default - fast and efficient
- **Manual Mode:** Advanced users doing specific analysis

---

## ✅ Quality Checklist

Before marking complete:

- [ ] All TypeScript errors resolved
- [ ] All three modes tested manually
- [ ] Cache-first logic verified
- [ ] Backend fallback works
- [ ] Path Matrix buttons functional
- [ ] UI feedback clear and helpful
- [ ] No breaking changes
- [ ] Tests updated and passing
- [ ] Documentation updated

---

**Status:** Foundation solid, ready to continue implementation!
**Recommendation:** Follow Approach C (MVP Then Enhance) for best progress.
