# Observer Backend Path Caching - Future Feature

**Status:** 🚧 Partially Implemented - Backend Endpoint Missing
**Date:** January 4, 2026
**Priority:** Medium - Enhancement for production deployment

---

## Overview

The Experience web app has **frontend code ready** to integrate with an Observer backend endpoint for pre-computed path caching. However, the backend endpoint (`/observer/atlas/paths/{from_id}/{to_id}`) doesn't exist yet, causing 404 errors in console.

**Current Behavior:**

1. Frontend tries to fetch pre-computed path from Observer
2. Gets 404 (endpoint doesn't exist)
3. ✅ Gracefully falls back to client-side path computation
4. Everything works, but with console noise

---

## Current Implementation

### Frontend Integration (✅ Complete)

**File:** `experience/web/stores/useAtlasAdminStore.ts`

```typescript
fetchPathFromBackend: async (fromId, toId) => {
  try {
    const OBSERVER_API_URL =
      process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000";
    const response = await fetch(
      `${OBSERVER_API_URL}/observer/atlas/paths/${fromId}/${toId}`,
    );

    if (!response.ok) return null;

    const pathData = await response.json();
    // Transform and cache...
    return path;
  } catch (err) {
    console.error("Failed to fetch path from backend:", err);
    return null; // Graceful fallback
  }
};
```

**File:** `experience/web/hooks/usePathCalculator.ts`

The hook implements **cache-first** mode:

1. Check local memory cache
2. Try backend API (🚧 returns 404 currently)
3. Compute fresh client-side (✅ fallback works)

---

## What Needs to Be Built

### Backend Endpoint (Observer Module)

**Endpoint:** `GET /observer/atlas/paths/{from_emotion_id}/{to_emotion_id}`

**Purpose:** Return pre-computed path between two emotions from database cache

**Response Format:**

```json
{
  "from_id": "uuid",
  "to_id": "uuid",
  "waypoints": [
    {
      "emotion_id": "uuid",
      "emotion_name": "Vulnerability",
      "vac": [0.0, 0.3, 0.6],
      "is_bridge": true
    }
  ],
  "distance": 1.65,
  "estimated_time": 8.2,
  "difficulty": "moderate",
  "requires_bridge": true,
  "bridge_emotions": ["Vulnerability"]
}
```

### Database Schema (Observer Module)

**Table:** `path_cache` (to be created)

```sql
CREATE TABLE path_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
    to_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
    path_data JSONB NOT NULL,  -- Waypoints, metrics, etc.
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    computation_time_ms INTEGER,
    UNIQUE(from_emotion_id, to_emotion_id)
);

CREATE INDEX idx_path_cache_lookup ON path_cache(from_emotion_id, to_emotion_id);
```

### Pre-computation Strategy

**Option A: Pre-compute All Paths (Recommended)**

- 87 emotions → 87 × 86 = 7,482 possible paths
- Run batch job to compute and cache all paths
- ~30 minutes one-time computation
- Instant retrieval thereafter

**Option B: Lazy Caching**

- Compute paths on-demand
- Cache successful computations
- Gradually builds cache over time
- Slower initial experience

---

## Benefits of Backend Path Caching

### Performance

- **Current:** ~150ms client-side A\* computation per path
- **With Cache:** <10ms database lookup
- **For 3 emotions:** 6 paths × 150ms = 900ms → 60ms (15x faster!)

### Consistency

- All users see same path for same emotion pair
- Clinical validation can be done once and cached
- Easier to review and improve paths systematically

### Scalability

- Frontend doesn't need full A\* implementation
- Reduces client-side CPU usage
- Better mobile experience

---

## Temporary Solution - Silence Console Errors

**Current:** 404 errors clutter console but don't break functionality

**Options:**

### Option 1: Disable Backend Fetch (Recommended for now)

**File:** `experience/web/hooks/usePathCalculator.ts`

```typescript
// CACHE-FIRST MODE - Try cache, then backend, then compute
if (computeMode === "cache-first") {
  // 1. Check local cache
  if (computedPaths.has(pathId)) {
    cachedCount++;
    continue;
  }

  // 2. Try backend API - DISABLED until endpoint exists
  // const backendPath = await useAtlasAdminStore.getState().fetchPathFromBackend(from.id, to.id);
  // if (backendPath) {
  //   backendCount++;
  //   continue;
  // }

  // 3. Compute fresh as fallback
  pathPromises.push(computePath(from, to));
  computedCount++;
}
```

### Option 2: Add Environment Flag

**File:** `.env.local`

```bash
NEXT_PUBLIC_ENABLE_BACKEND_PATH_CACHE=false
```

Then wrap backend calls:

```typescript
if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_PATH_CACHE === "true") {
  const backendPath = await fetchPathFromBackend(from.id, to.id);
  // ...
}
```

### Option 3: Change Default Compute Mode

**File:** `experience/web/types/atlas-admin.ts`

Change default from `cache-first` to `always`:

```typescript
export const DEFAULT_SETTINGS: AtlasAdminSettings = {
  // ...
  computeMode: "always", // Skip backend entirely
};
```

---

## Implementation Roadmap

### Phase 1: Backend Endpoint (Observer Module)

**Time:** 4-6 hours

1. Create `path_cache` database table
2. Implement GET `/observer/atlas/paths/{from}/{to}` endpoint
3. Add path caching logic
4. Test with frontend

### Phase 2: Pre-computation Job (Observer Module)

**Time:** 2-3 hours

1. Create batch computation script
2. Compute all 7,482 paths
3. Store in database
4. Verify completeness

### Phase 3: Frontend Integration (Experience Module)

**Time:** 1 hour

1. Remove `NEXT_PUBLIC_ENABLE_BACKEND_PATH_CACHE` flag (if using Option 2)
2. Re-enable backend fetch calls
3. Test cache-first mode end-to-end
4. Monitor performance improvements

---

## Current Workaround

**The system works perfectly without the backend endpoint!**

The 404 errors are cosmetic. The fallback to client-side computation means:

- ✅ All paths are computed correctly
- ✅ No functionality is lost
- ✅ Performance is acceptable (<1 second for typical use)
- ❌ Console shows 404s (annoying but harmless)

---

## Files Involved

### Frontend (Experience Module - Already Integrated)

- `experience/web/stores/useAtlasAdminStore.ts` - `fetchPathFromBackend()` method
- `experience/web/hooks/usePathCalculator.ts` - Cache-first logic
- `experience/web/hooks/useLoadCachedPaths.ts` - Batch loading
- `experience/web/types/atlas-admin.ts` - `ComputeMode` type

### Backend (Observer Module - TO BE BUILT)

- `observer/app/api/atlas.py` - New endpoint
- `observer/app/models/path_cache.py` - New model
- `observer/app/repositories/path_cache_repository.py` - Data access
- `observer/scripts/precompute_paths.py` - Batch job
- `observer/migrations/versions/xxx_add_path_cache.py` - Migration

---

## Testing Plan

### When Backend is Ready:

1. **Unit Tests** (Observer)

   ```python
   def test_path_cache_storage():
       # Store path
       # Retrieve path
       # Verify data integrity
   ```

2. **Integration Tests** (Experience)

   ```typescript
   test("fetches cached path from backend", async () => {
     // Mock backend response
     // Verify frontend uses cached path
     // Verify no client-side computation
   });
   ```

3. **Performance Tests**
   ```typescript
   test("backend cache is faster than client compute", async () => {
     // Time backend fetch: <10ms
     // Time client compute: ~150ms
     // Assert backend is 10x+ faster
   });
   ```

---

## Decision: Defer or Implement?

### Arguments FOR Implementing Now:

- ✅ Frontend code already written
- ✅ Clear performance benefit
- ✅ Better user experience
- ✅ Consistent paths across users

### Arguments FOR Deferring:

- ✅ Current fallback works perfectly
- ✅ Other priorities may be higher
- ✅ Can batch with other Observer enhancements
- ✅ No functional blocker

### Recommendation:

**DEFER to Phase 2** - Focus on core features first, optimize later

The animation enhancements we just completed provide more immediate user value than backend path caching.

---

## Notes for Future Implementation

When you're ready to build this:

1. **Start in Observer module** - Build endpoint + table first
2. **Test with Postman** - Verify endpoint works standalone
3. **Enable in Experience** - Remove temporary disabling
4. **Run pre-computation** - Populate cache
5. **Monitor logs** - Verify hits vs. misses

The frontend integration is **production-ready** - it just needs a backend to call!

---

**Last Updated:** January 4, 2026
**Status:** Documented for future implementation
**Owner:** To be assigned when prioritized
