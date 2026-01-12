# Path Computation UX Enhancement - Implementation Guide

**Status:** Ready for Implementation  
**Created:** January 4, 2026  
**Feature:** Three-mode path computation with cache-first intelligence

## Overview

This document provides a complete, step-by-step implementation guide for enhancing the path computation UX with:

- ✅ Three-mode toggle (Always / Cache First / Manual)
- ✅ Smart cache-first with backend fallback
- ✅ Multiple feedback types (banner, toast, InfoPanel status)
- ✅ Auto-loading cache when needed
- ✅ Individual path fetching from backend

---

## Phase 1: Foundation (Types & Store)

### ✅ COMPLETED: Update Types

**File:** `web/types/atlas-admin.ts`

Changes made:

- Added `PathComputeMode` type: `'always' | 'cache-first' | 'manual'`
- Added `CacheStatus` interface for tracking cache state
- Changed `autoComputePaths: boolean` → `computeMode: PathComputeMode`
- Updated `DEFAULT_SETTINGS` to use `computeMode: 'cache-first'`

### Step 1.2: Add Cache Status to Store

**File:** `web/stores/useAtlasAdminStore.ts`

Add to state interface:

```typescript
interface AtlasAdminState {
  // ... existing fields ...

  // Cache tracking
  cacheStatus: CacheStatus;

  // ... existing fields ...

  // New actions
  updateCacheStatus: (status: Partial<CacheStatus>) => void;
  getCachedPath: (fromId: string, toId: string) => EmotionPath | null;
  fetchPathFromBackend: (
    fromId: string,
    toId: string,
  ) => Promise<EmotionPath | null>;
  loadCacheIfNeeded: () => Promise<void>;
}
```

Add to initial state:

```typescript
cacheStatus: {
  loaded: false,
  count: 0,
  lastLoadTime: null
},
```

Add implementations:

```typescript
updateCacheStatus: (status) => {
  set((state) => ({
    cacheStatus: { ...state.cacheStatus, ...status }
  }));
},

getCachedPath: (fromId, toId) => {
  const state = get();
  const pathId = `${fromId}-${toId}`;
  return state.computedPaths.get(pathId) || null;
},

fetchPathFromBackend: async (fromId, toId) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OBSERVER_API_URL}/observer/atlas/paths/${fromId}/${toId}`
    );

    if (!response.ok) return null;

    const pathData = await response.json();
    const state = get();

    // Transform and return
    const fromEmotion = state.allEmotions.find(e => e.id === fromId);
    const toEmotion = state.allEmotions.find(e => e.id === toId);

    if (!fromEmotion || !toEmotion) return null;

    const path: EmotionPath = {
      id: `${fromId}-${toId}`,
      from: fromEmotion,
      to: toEmotion,
      waypoints: pathData.waypoints || [],
      total_distance: pathData.distance,
      estimated_time: pathData.estimated_time,
      difficulty: pathData.difficulty,
      requires_bridge: pathData.requires_bridge,
      bridge_emotions: pathData.bridge_emotions || []
    };

    // Add to local cache
    get().addComputedPath(path);

    return path;
  } catch (err) {
    console.error('Failed to fetch path from backend:', err);
    return null;
  }
},

loadCacheIfNeeded: async () => {
  const state = get();

  // Only load if not already loaded
  if (state.cacheStatus.loaded && state.cacheStatus.count > 0) {
    return;
  }

  // Use existing useLoadCachedPaths logic
  // This will be called automatically based on computeMode
}
```

### Step 1.3: Update Settings Store

**File:** `web/stores/useSettingsStore.ts`

Find and replace:

- `autoComputePaths: boolean` → `computeMode: PathComputeMode`
- All references to `autoComputePaths` → `computeMode`
- Update default to `'cache-first'`

---

## Phase 2: Core Logic Enhancement

### Step 2.1: Enhanced usePathCalculator

**File:** `web/hooks/usePathCalculator.ts`

Replace the core computation logic:

```typescript
const computeAllPaths = useCallback(async () => {
  const selectedEmotions = allEmotions.filter((e) =>
    selectedEmotionIds.has(e.id),
  );

  if (selectedEmotions.length < 2) {
    return;
  }

  const { computeMode } = settings;

  // === MANUAL MODE ===
  if (computeMode === "manual") {
    // Show notification
    showToast(
      "info",
      'Auto-compute is set to Manual. Click "Compute Paths" to calculate.',
    );
    return;
  }

  setComputingPaths(true);
  setError(null);

  try {
    const pathPromises: Promise<void>[] = [];
    let cachedCount = 0;
    let backendCount = 0;
    let computedCount = 0;

    // Compute all pairwise paths
    for (let i = 0; i < selectedEmotions.length; i++) {
      for (let j = 0; j < selectedEmotions.length; j++) {
        if (i === j) continue;

        const from = selectedEmotions[i];
        const to = selectedEmotions[j];
        const pathId = `${from.id}-${to.id}`;

        // === ALWAYS MODE ===
        if (computeMode === "always") {
          pathPromises.push(computePath(from, to));
          computedCount++;
          continue;
        }

        // === CACHE-FIRST MODE ===
        if (computeMode === "cache-first") {
          // 1. Check local cache
          const cached = getCachedPath(from.id, to.id);
          if (cached) {
            cachedCount++;
            continue;
          }

          // 2. Try backend
          const backendPath = await fetchPathFromBackend(from.id, to.id);
          if (backendPath) {
            backendCount++;
            continue;
          }

          // 3. Compute fresh
          pathPromises.push(computePath(from, to));
          computedCount++;
        }
      }
    }

    await Promise.all(pathPromises);

    // Show comprehensive feedback
    if (computeMode === "cache-first") {
      const total = cachedCount + backendCount + computedCount;
      const parts = [];
      if (cachedCount > 0) parts.push(`${cachedCount} from cache`);
      if (backendCount > 0) parts.push(`${backendCount} from backend`);
      if (computedCount > 0) parts.push(`${computedCount} computed fresh`);

      showToast("success", `✓ Loaded ${total} paths: ${parts.join(", ")}`);
    }

    logger.info(
      "hooks",
      `Path computation complete: ${cachedCount} cached, ${backendCount} backend, ${computedCount} computed`,
    );
  } catch (err) {
    // ... error handling ...
  } finally {
    setComputingPaths(false);
  }
}, [selectedEmotionIds, allEmotions, computedPaths, settings.computeMode]);
```

### Step 2.2: Toast Notification System

**File:** `web/utils/toast.ts` (create if doesn't exist)

```typescript
type ToastType = "info" | "success" | "warning" | "error";

export function showToast(
  type: ToastType,
  message: string,
  duration: number = 3000,
) {
  // Use react-hot-toast or similar
  // For now, can use alert as placeholder
  console.log(`[${type.toUpperCase()}] ${message}`);

  // TODO: Implement proper toast UI
}
```

---

## Phase 3: Three-Mode Toggle UI

### Step 3.1: Update Behavior Settings

**File:** `web/components/admin/settings/BehaviorSettings.tsx`

Replace the autoComputePaths toggle with:

```tsx
<div className="space-y-2">
  <label className="text-sm font-semibold text-gray-300">
    Path Computation Mode
  </label>
  <div className="flex gap-2">
    {[
      {
        value: "always" as const,
        label: "🟢 Always Compute",
        desc: "Fresh calculations every time",
      },
      {
        value: "cache-first" as const,
        label: "🟡 Cache First",
        desc: "Fast & efficient (recommended)",
      },
      {
        value: "manual" as const,
        label: "🔴 Manual Only",
        desc: "No automatic computation",
      },
    ].map((option) => (
      <button
        key={option.value}
        onClick={() =>
          settings.updateBehaviorSetting("computeMode", option.value)
        }
        className={`flex-1 p-3 rounded-lg border-2 transition ${
          settings.computeMode === option.value
            ? "border-cyan-500 bg-cyan-500/10 text-white"
            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
        }`}
      >
        <div className="text-left">
          <div className="font-semibold text-sm">{option.label}</div>
          <div className="text-xs opacity-70 mt-1">{option.desc}</div>
        </div>
      </button>
    ))}
  </div>

  {/* Help text */}
  <div className="text-xs text-gray-500 mt-2 space-y-1">
    <p>
      <strong className="text-green-400">Always Compute:</strong> Freshly
      calculates every path (slower but always current)
    </p>
    <p>
      <strong className="text-yellow-400">Cache First:</strong> Uses cached
      paths when available, fetches from backend if needed (recommended - fast!)
    </p>
    <p>
      <strong className="text-red-400">Manual Only:</strong> No automatic
      computation (use Compute button manually)
    </p>
  </div>
</div>
```

### Step 3.2: Update Control Panel Toggle

**File:** `web/components/admin/panels/ControlPanel/LayerControls.tsx`

Replace autoComputePaths checkbox with mode indicator:

```tsx
<div className="flex items-center justify-between">
  <span className="text-sm text-gray-400">Path Compute</span>
  <span
    className={`text-xs px-2 py-1 rounded ${
      settings.computeMode === "always"
        ? "bg-green-500/20 text-green-400"
        : settings.computeMode === "cache-first"
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-red-500/20 text-red-400"
    }`}
  >
    {settings.computeMode === "always"
      ? "🟢 Always"
      : settings.computeMode === "cache-first"
        ? "🟡 Cache"
        : "🔴 Manual"}
  </span>
</div>
```

---

## Phase 4: Feedback Components

### Step 4.1: Path Compute Banner

**New File:** `web/components/admin/shared/PathComputeBanner.tsx`

```tsx
"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

export function PathComputeBanner() {
  const { settings, cacheStatus, updateSetting } = useAtlasAdminStore();

  // Only show in cache-first or manual mode
  if (settings.computeMode === "always") return null;

  const isManual = settings.computeMode === "manual";

  return (
    <div
      className={`px-4 py-2 border-l-4 ${
        isManual
          ? "bg-red-900/20 border-red-500"
          : "bg-blue-900/20 border-blue-500"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {isManual ? "⚠️" : "ℹ️"} Auto-compute:
            <strong className="ml-1">
              {isManual ? "Manual" : "Cache First"}
            </strong>
          </span>
          {!isManual && cacheStatus.loaded && (
            <span className="text-xs text-gray-400">
              • {cacheStatus.count} paths cached
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {!cacheStatus.loaded && !isManual && (
            <button
              onClick={() => {
                /* Load cache */
              }}
              className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded"
            >
              Load Cache
            </button>
          )}
          <button
            onClick={() => updateSetting("computeMode", "always")}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Switch to Always
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 4.2: Update InfoPanel with Status

**File:** `web/components/admin/panels/InfoPanel/index.tsx`

Add at top of paths section:

```tsx
{
  /* Path Status Bar */
}
<div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
  <div className="flex items-center justify-between">
    <div className="text-sm">
      📊 Showing {paths.length} paths
      {pathStats && (
        <span className="text-gray-400 text-xs ml-2">
          ({pathStats.cached} cached, {pathStats.computed} computed)
        </span>
      )}
    </div>

    <div className="flex items-center gap-2 text-xs">
      <span
        className={`px-2 py-1 rounded ${
          settings.computeMode === "always"
            ? "bg-green-500/20 text-green-400"
            : settings.computeMode === "cache-first"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
        }`}
      >
        {settings.computeMode === "always"
          ? "Always"
          : settings.computeMode === "cache-first"
            ? "Cache First"
            : "Manual"}
      </span>

      {cacheStatus.loaded && (
        <span className="text-gray-400">Cache: {cacheStatus.count} paths</span>
      )}
    </div>
  </div>
</div>;
```

### Step 4.3: Cache Status Widget

**New File:** `web/components/admin/panels/ControlPanel/CacheStatusWidget.tsx`

```tsx
"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

export function CacheStatusWidget() {
  const { cacheStatus, loadCacheIfNeeded } = useAtlasAdminStore();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
      <div
        className={`w-2 h-2 rounded-full ${
          cacheStatus.loaded ? "bg-green-500" : "bg-gray-500"
        }`}
      />

      <div className="flex-1">
        <div className="text-xs font-semibold text-white">
          Cache:{" "}
          {cacheStatus.loaded
            ? `${(cacheStatus.count / 1000).toFixed(1)}K`
            : "Not loaded"}
        </div>
        {cacheStatus.lastLoadTime && (
          <div className="text-[10px] text-gray-400">
            {Math.round((Date.now() - cacheStatus.lastLoadTime) / 1000)}s ago
          </div>
        )}
      </div>

      <button
        onClick={loadCacheIfNeeded}
        className="text-cyan-400 hover:text-cyan-300 text-xs"
        title="Refresh cache"
      >
        ↻
      </button>
    </div>
  );
}
```

---

## Phase 5: Path Matrix Enhancements

### Step 5.1: Auto-Load Cache

**File:** `web/components/admin/visualizations/PathMatrix/index.tsx`

Add to component:

```tsx
useEffect(() => {
  // Auto-load cache if not loaded and mode requires it
  const { computeMode, cacheStatus } = useAtlasAdminStore.getState();

  if (computeMode !== "manual" && !cacheStatus.loaded) {
    loadCachedPaths();
  }
}, []);
```

### Step 5.2: Rename Buttons

**File:** `web/components/admin/visualizations/PathMatrix/MatrixHeader.tsx`

Update button labels:

```tsx
{
  /* Cache button */
}
<button
  onClick={onLoadCache}
  disabled={isLoadingCache}
  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
>
  {isLoadingCache ? "⏳ Loading..." : "🔄 Refresh Cache"}
</button>;

{
  /* Compute missing button */
}
<button
  onClick={onComputeMissing}
  disabled={isComputing}
  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition"
>
  ⚡ Compute Missing
</button>;

{
  /* Recompute all button */
}
<button
  onClick={onComputeAll}
  disabled={isComputing}
  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
>
  {isComputing ? `⏳ ${progress.percentage}%` : "🚀 Recompute All"}
</button>;
```

### Step 5.3: Add Compute Missing Logic

**File:** `web/hooks/useComputeAllPaths.ts`

Add new function:

```typescript
const computeMissingPaths = useCallback(async () => {
  // Similar to computeAllPaths but only computes what's not in cache
  const state = useAtlasAdminStore.getState();
  const missing: Array<[AtlasEmotion, AtlasEmotion]> = [];

  // Find all missing paths
  allEmotions.forEach((from) => {
    allEmotions.forEach((to) => {
      if (from.id === to.id) return;
      const pathId = `${from.id}-${to.id}`;
      if (!state.computedPaths.has(pathId)) {
        missing.push([from, to]);
      }
    });
  });

  if (missing.length === 0) {
    alert("All paths are already computed!");
    return;
  }

  const confirmed = confirm(
    `Found ${missing.length} missing paths.\n\nCompute them now?`,
  );

  if (!confirmed) return;

  // Compute missing paths via backend batch API
  // ... implementation similar to computeAllPaths
}, [allEmotions]);

return {
  computeAllPaths,
  computeMissingPaths, // NEW
  isComputing,
  progress,
  estimatedTimeRemaining,
};
```

---

## Phase 6: Update All References

### Files to Update

1. **useSettingsSync.ts** - Change `autoComputePaths` → `computeMode`
2. **usePathCalculator.ts** - Update condition checks
3. **SmartRecommendations.tsx** - Update toggle logic
4. **All test files** - Update mocks and assertions
5. **settingsPresets.ts** - Update all presets

### Search & Replace Pattern

Find: `autoComputePaths`
Replace with logic for: `computeMode`

Example transformations:

```typescript
// Old
if (settings.autoComputePaths) {
}

// New
if (
  settings.computeMode === "always" ||
  settings.computeMode === "cache-first"
) {
}

// Or for just checking if auto-enabled:
if (settings.computeMode !== "manual") {
}
```

---

## Testing Checklist

### Manual Testing

- [ ] **Always Mode**: Select emotions → Paths compute fresh every time
- [ ] **Cache First Mode**:
  - [ ] With cache: Paths load instantly from cache
  - [ ] Without cache: Fetches from backend, then computes if needed
  - [ ] Shows correct toast notifications for each source
- [ ] **Manual Mode**:
  - [ ] No computation on selection
  - [ ] Shows banner notification
  - [ ] Manual compute button works
- [ ] **Path Matrix**:
  - [ ] Auto-loads cache on open (cache-first/always mode)
  - [ ] "Refresh Cache" loads from backend
  - [ ] "Compute Missing" only computes gaps
  - [ ] "Recompute All" forces fresh computation
- [ ] **UI Feedback**:
  - [ ] Banner shows in manual/cache-first modes
  - [ ] Toast notifications appear for all operations
  - [ ] InfoPanel shows path source stats
  - [ ] Cache status widget updates correctly

### Automated Testing

Update test files:

- `__tests__/stores/useAtlasAdminStore.test.ts`
- `__tests__/hooks/usePathCalculator.test.ts`
- `__tests__/utils/settingsPresets.test.ts`

---

## Migration Notes

### For Existing Users

The `autoComputePaths` boolean setting will be migrated to `computeMode`:

- `autoComputePaths: true` → `computeMode: 'cache-first'` (recommended default)
- `autoComputePaths: false` → `computeMode: 'manual'`

Add migration logic in store initialization if needed.

---

## Backend Requirements

### New Endpoint Needed

```python
@router.get("/atlas/paths/{from_emotion_id}/{to_emotion_id}")
async def get_specific_cached_path(
    from_emotion_id: str,
    to_emotion_id: str,
    db: Session = Depends(get_db)
):
    """
    Fetch a specific cached path if it exists.
    Returns 404 if path hasn't been computed yet.
    """
    path = db.query(TransitionPath).filter(
        TransitionPath.from_emotion_id == from_emotion_id,
        TransitionPath.to_emotion_id == to_emotion_id
    ).first()

    if not path:
        raise HTTPException(status_code=404, detail="Path not computed yet")

    return {
        "from_emotion": {"id": path.from_emotion_id},
        "to_emotion": {"id": path.to_emotion_id},
        "waypoints": path.waypoints,
        "distance": path.distance,
        "estimated_time": path.estimated_time,
        "difficulty": path.difficulty,
        "requires_bridge": path.requires_bridge,
        "bridge_emotions": path.bridge_emotions
    }
```

---

## Implementation Order

### Recommended Sequence

1. ✅ **Phase 1** - Foundation (types, store) - STARTED
2. **Phase 2** - Core logic (usePathCalculator enhancement)
3. **Phase 3** - UI toggles (settings, control panel)
4. **Phase 4** - Feedback (banner, toast, InfoPanel)
5. **Phase 5** - Path Matrix (auto-load, renamed buttons)
6. **Phase 6** - Update all references
7. **Testing** - Manual and automated

### Time Estimates

- Phase 1: 30 minutes ✅ (IN PROGRESS)
- Phase 2: 1 hour
- Phase 3: 45 minutes
- Phase 4: 1 hour
- Phase 5: 45 minutes
- Phase 6: 30 minutes
- Testing: 1 hour

**Total: ~5-6 hours**

---

## Success Criteria

- ✅ Users can choose between 3 compute modes
- ✅ Cache-first mode provides instant path loading
- ✅ Backend fallback works seamlessly
- ✅ All three feedback types implemented
- ✅ Path Matrix is intelligent about cache usage
- ✅ No breaking changes to existing functionality
- ✅ Performance improved for cached paths

---

## Next Steps

1. Complete Phase 1 (add cache status and methods to store)
2. Implement Phase 2 (enhance usePathCalculator)
3. Build UI components (Phases 3-4)
4. Enhance Path Matrix (Phase 5)
5. Test thoroughly
6. Deploy with documentation

---

**Status:** Phase 1 in progress - Types updated, store modifications next.
