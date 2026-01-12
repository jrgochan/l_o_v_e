# Observer Module - Completion Plan

**Goal:** Fix remaining bugs and implement missing endpoints to achieve 100% functionality

**Current Status:** 33/36 tests passing (92%)  
**Target:** 36/36 tests passing (100%)

---

## 🎯 Three Remaining Tasks

### 1. Fix State Recording Endpoint (HIGH PRIORITY)
### 2. Implement Historical Trajectory Endpoint (MEDIUM PRIORITY)
### 3. Implement Current State Endpoint (MEDIUM PRIORITY)

---

## Task 1: Fix State Recording Endpoint

**Current Issue:** 3 tests failing due to bugs

### Bug A: Timezone Datetime Mismatch ✅ FIXED
**Error:** `can't subtract offset-naive and offset-aware datetimes`  
**Location:** `state.py` line 103  
**Fix Applied:** Use `datetime.now(timezone.utc)` instead of `datetime.utcnow()`  
**Status:** Fixed, needs validation

### Bug B: Test Parsing (Suspected)
**Issue:** Critical test shows empty emotion names  
**Possible Cause:** Response parsing in test script  
**Fix:** Verify timezone fix resolves the cascade

### Steps:
1. ✅ Apply timezone fix (done)
2. [ ] Restart Observer API
3. [ ] Re-run test_setup.sh
4. [ ] Verify 36/36 tests pass

**Estimated Time:** 5 minutes

---

## Task 2: Implement Historical Trajectory Endpoint

**Purpose:** Retrieve user's emotional journey over time for visualization

### Endpoint Spec:
```
GET /observer/history/{user_id}

Query Parameters:
- start_date (optional): ISO datetime
- end_date (optional): ISO datetime  
- limit (optional): max results (default 100)

Response:
{
  "user_id": "uuid",
  "data_points": 42,
  "trajectory": [
    {
      "timestamp": "2025-12-03T16:00:00Z",
      "vac": [0.9, 0.7, 0.8],
      "quaternion": [0.68, 0.50, 0.39, 0.45],
      "emotion": "Joy",
      "elasticity": 0.3
    },
    ...
  ]
}
```

### Implementation Plan:

**A. Create Pydantic Schemas** (`app/api/schemas/history.py`)
- `HistoryRequest` (query params)
- `TrajectoryPoint` (single data point)
- `HistoryResponse` (full trajectory)

**B. Create Route Handler** (`app/api/routes/history.py`)
- Query user_trajectory table
- Filter by date range
- Order by timestamp
- Limit results
- Transform to response format

**C. Register Router** (`app/main.py`)
- Add history router to app

**D. Add Tests**
- Integration test for history endpoint
- Test date filtering
- Test limit parameter

**Estimated Time:** 45 minutes

---

## Task 3: Implement Current State Endpoint

**Purpose:** Get user's most recent emotional state

### Endpoint Spec:
```
GET /observer/current/{user_id}

Response:
{
  "state_id": "uuid",
  "timestamp": "2025-12-03T16:00:00Z",
  "vac": [0.9, 0.7, 0.8],
  "quaternion": [0.68, 0.50, 0.39, 0.45],
  "emotion": "Joy",
  "category": "When Life Is Good",
  "elasticity": 0.3,
  "rigidity": 0.15,
  "time_in_state": "00:05:32"
}
```

### Implementation Plan:

**A. Create Pydantic Schema** (`app/api/schemas/current.py` or reuse existing)
- `CurrentStateResponse`

**B. Create Route Handler** (`app/api/routes/current.py`)
- Query latest user_trajectory entry
- Calculate time_in_state (now - timestamp)
- Transform to response

**C. Register Router** (`app/main.py`)
- Add current router to app

**D. Add Tests**
- Integration test for current state
- Test 404 when no states
- Test time_in_state calculation

**Estimated Time:** 30 minutes

---

## 📋 Implementation Order

### Session 1: Fix State Recording (15 min)
1. ✅ Timezone fix applied
2. [ ] Validate fix with test run
3. [ ] Debug any remaining issues
4. [ ] Achieve 36/36 tests (or identify remaining bugs)

### Session 2: Historical Trajectory (45 min)
1. [ ] Create history.py schemas
2. [ ] Implement history.py route
3. [ ] Register in main.py
4. [ ] Test manually with curl
5. [ ] Add integration test

### Session 3: Current State (30 min)
1. [ ] Create current state schema (or reuse)
2. [ ] Implement current.py route
3. [ ] Register in main.py
4. [ ] Test manually
5. [ ] Add integration test

### Session 4: Final Validation (15 min)
1. [ ] Run complete test suite (pytest)
2. [ ] Run test_setup.sh
3. [ ] Verify all endpoints in Swagger docs
4. [ ] Update OBSERVER_SESSION_SUMMARY.md

**Total Estimated Time:** ~1.5-2 hours

---

## 🎯 Success Criteria

✅ **State recording works** (no errors)  
✅ **Historical trajectory returns data**  
✅ **Current state returns latest entry**  
✅ **All 36 automated tests pass**  
✅ **Swagger docs show all endpoints**  
✅ **THE CRITICAL TEST passes** (Compassion ≠ Pity)

---

## 🚀 Ready to Execute

**Next Steps:**
1. Re-run test to validate timezone fix
2. Implement historical trajectory endpoint
3. Implement current state endpoint
4. Final validation

**This plan will take Observer from 92% → 100%!** 🎯
