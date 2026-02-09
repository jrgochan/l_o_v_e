# MyPy Completion Plan - Tomorrow's Session

**Date Created:** January 4, 2026 12:11 AM
**Current Status:** 111 errors remaining (34% complete)
**Goal:** Reach 0 errors
**Estimated Time:** 6-8 hours

---

## 🎯 Quick Start Commands

**⚠️ IMPORTANT: All mypy commands MUST be run with .venv-dx activated!**

```bash
# Navigate and activate environment (REQUIRED!)
cd /Users/jrgochan/code/gitlab.com/l_o_v_e
source infra/.venv-dx/bin/activate  # ← MUST DO THIS FIRST
cd observer

# Verify you're in the right environment
which python  # Should show: .../infra/.venv-dx/bin/python
which mypy    # Should show: .../infra/.venv-dx/bin/mypy

# Check current error count
mypy app/ --strict --show-error-codes 2>&1 | grep "error:" | wc -l

# Get full error list
mypy app/ --strict --show-error-codes 2>&1 | grep "error:" > /tmp/mypy_errors.txt
cat /tmp/mypy_errors.txt
```

---

## 📊 What's Already Done (57 errors fixed)

✅ **Phase 1:** Type parameters - All Dict/List without type params fixed
✅ **Phase 2a:** Simple function signatures - 39 `-> None` annotations added
✅ **Documentation:** Complete progress tracking and error catalog

**Files Modified:**
- Services: recommendation_engine.py, waypoint_explainer.py, strategy_recommender.py, path_planner.py, path_matrix_service.py, atlas_mapper.py, ai_model_service.py
- Routes: chat_websocket.py, ai_settings.py
- WebSocket: connection_manager.py, routes.py
- Main: app/main.py

---

## 🎯 Remaining Work (111 Errors)

### Error Breakdown:
1. **no-untyped-def:** 37 errors - Missing function return types
2. **arg-type:** 15 errors - Argument type mismatches
3. **index:** 13 errors - Collection[str] not indexable
4. **assignment:** 11 errors - Type incompatibilities
5. **attr-defined:** 9 errors - Missing attributes
6. **return-value:** 5 errors - Return type mismatches
7. **no-any-return:** 5 errors - Returning Any
8. **var-annotated:** 4 errors - Missing variable types
9. **valid-type:** 3 errors - Invalid type usage
10. **Others:** 9 errors - Misc issues

---

## 🚀 Phase 2b: Collection Indexing Fixes (13 errors, ~30 minutes)

**Target:** `app/services/clinical_alert_service.py`
**Problem:** `Collection[str]` type cannot be indexed with [0] or [1]

### Error Lines:
```
475, 476, 500, 525, 526, 558, 559, 598, 599, 632, 633, 664, 665
```

### Fix Strategy:
Replace `collection_var[0]` with `list(collection_var)[0]`

### Step-by-Step:

```bash
# 1. Open the file
code app/services/clinical_alert_service.py

# 2. Search for lines with [0] or [1] indexing
# Look for pattern: emotions_list[0], emotions_list[1]

# 3. Replace with list() cast:
# Before: emotions_list[0]
# After:  list(emotions_list)[0]

# 4. Verify fix
mypy app/services/clinical_alert_service.py --strict --show-error-codes 2>&1 | grep "index"
# Should show 0 results

# Expected: 111 → 98 errors
```

### Automated Script Option:
```python
# Run this in observer directory:
python3 << 'EOF'
from pathlib import Path

file_path = Path("app/services/clinical_alert_service.py")
content = file_path.read_text()

# Replace all indexed access patterns
content = content.replace('emotions_list[0]', 'list(emotions_list)[0]')
content = content.replace('emotions_list[1]', 'list(emotions_list)[1]')

file_path.write_text(content)
print("✅ Fixed Collection indexing")
EOF
```

---

## 🚀 Phase 2c: FastAPI Route Return Types (37 errors, ~2-3 hours)

**Problem:** Route handlers missing return type annotations

### Files with Errors:
- `app/api/routes/transitions.py`: 9 errors (lines 251, 418, 464, 546, 592, 627, 689, 694, 748)
- `app/api/routes/atlas.py`: 10 errors
- `app/api/routes/bootstrap.py`: 7 errors
- `app/api/routes/ai_settings.py`: 4 errors
- Others: 7 errors

### Fix Strategy:
Most FastAPI routes return `Dict[str, Any]` (JSON responses)

### Step-by-Step for transitions.py:

```bash
# 1. Check specific errors
mypy app/api/routes/transitions.py --strict --show-error-codes 2>&1 | grep "no-untyped-def"

# 2. Open file
code app/api/routes/transitions.py

# 3. For each error line, add return type:
```

**Pattern 1: Multi-line function signature**
```python
# Before:
@router.post("/path")
async def generate_transition_path(
    request: TransitionPathRequest, db: AsyncSession = Depends(get_db)
):

# After:
@router.post("/path")
async def generate_transition_path(
    request: TransitionPathRequest, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
```

**Pattern 2: Single-line function**
```python
# Before:
async def get_strategy(strategy_id: str, db: AsyncSession = Depends(get_db)):

# After:
async def get_strategy(strategy_id: str, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
```

### Quick Fix Template:
For each error line in the file:
1. Find the function definition
2. Locate the closing `):`
3. Replace with `) -> Dict[str, Any]:`
4. Ensure `from typing import Dict, Any` is imported

### Verification:
```bash
# After fixing all routes in a file:
mypy app/api/routes/transitions.py --strict --show-error-codes 2>&1 | grep "no-untyped-def" | wc -l
# Should decrease

# Full check:
mypy app/ --strict --show-error-codes 2>&1 | grep "error:" | wc -l
# Expected: 98 → ~61 errors after all routes fixed
```

---

## 🚀 Phase 3: Argument Type Errors (15 errors, ~1-1.5 hours)

### Key Errors:

**1. recommendation_engine.py:742** - Sequence[str] → List[str]
```python
# Line 742: Fix argument type
# Before:
emotion_ids = await self._get_emotion_ids_by_names(journey["emotions"])

# After:
emotion_ids = await self._get_emotion_ids_by_names(list(journey["emotions"]))
```

**2. strategy_recommender.py:435** - Missing parameter type
```python
# Find the function at line 435 and add type to missing parameter:
# Before: def _get_user_strategy_data(self, strategy_id, user_id: str)
# After:  def _get_user_strategy_data(self, strategy_id: UUID, user_id: str) -> Dict[str, Any]:
```

**3. emotion_mapper.py:146** - min() key function type
```python
# Before: closest_id = min(distances.keys(), key=distances.get)
# After:  closest_id = min(distances.keys(), key=lambda k: distances[k])
```

**4. insight_generator.py:1011** - category type
```python
# Check what type category should be and add proper cast or fix
# Likely needs: str(category) or category type assertion
```

### Verification:
```bash
mypy app/ --strict --show-error-codes 2>&1 | grep "arg-type" | wc -l
# Should show 0 after fixes
```

---

## 🚀 Phase 4: Assignment Errors (11 errors, ~1 hour)

### Key Issues:

**1. embedding_service.py:295, 297** - Provider type mismatch
```python
# Lines 295-297: Fix provider assignment
# Likely needs union type or proper inheritance
# Check the class definitions and use proper type
```

**2. insight_generator.py:1280-1286** - Dict assignment
```python
# Lines 1280, 1282, 1284, 1286: String assigned to Dict
# Before: result["key"] = "value"
# Check if result should be Dict[str, str] instead of Dict[str, object]
# Or wrap: result["key"] = cast(Any, "value")
```

**3. path_matrix_service.py:769** - str → int
```python
# Line 769: Wrong type assignment
# Check if should be int() conversion or type is wrong
```

**4. chat_service.py:526** - Select type mismatch
```python
# Line 526: SQLAlchemy Select type issue
# May need to adjust query return type annotation
```

---

## 🚀 Phase 5: Return Value & No-Any-Return (10 errors, ~1 hour)

### Strategy:
Add `cast()` to return statements or fix return type annotation

**1. aggregate_emotion_service.py:420, 466** - Returning Any as float
```python
# Add cast import:
from typing import cast

# Fix returns:
# Before: return some_calculation
# After:  return cast(float, some_calculation)
```

**2. embedding_service.py:212, 217** - Returning Any as list[float]/int
```python
# Before: return result
# After:  return cast(List[float], result)  # or cast(int, result)
```

**3. waypoint_explainer.py:598** - Returning Any as dict
```python
# Before: return citations[0]
# After:  return cast(Dict[str, Any], citations[0]) if citations else None
```

**4. chat_service.py:290** - Sequence → List
```python
# Before: return sessions  # Returns Sequence[ChatSession]
# After:  return list(sessions)  # Returns List[ChatSession]
```

**5. path_matrix_service.py:694, 943** - Returning Any as bool/int
```python
# Add appropriate casts:
return cast(bool, result)
return cast(int, count)
```

---

## 🚀 Phase 6: Variable Annotations (4 errors, ~20 minutes)

**path_planner.py lines: 245, 256, 828**

```python
# Line 245:
# Before: open_set = set()
# After:  open_set: Set[UUID] = set()

# Line 256:
# Before: best_paths = {}
# After:  best_paths: Dict[UUID, List[AtlasDefinition]] = {}

# Line 828:
# Before: successful_transitions = {}
# After:  successful_transitions: Dict[str, int] = {}
```

---

## 🚀 Phase 7: Attribute Errors (9 errors, ~30 minutes)

### Strategy:
Most need `# type: ignore[attr-defined]` with explanatory comment

**1. metrics_calculator.py:537** - object has no attribute "append"
```python
# Check the type and either:
# - Cast to proper type: cast(List[float], obj).append(...)
# - Add type: ignore if external library
```

**2. insight_generator.py:842** - SessionAnalyticsService.get_or_create
```python
# If method doesn't exist:
# Option A: Add the method
# Option B: Use different method
# Option C: # type: ignore[attr-defined]  # Method added in future version
```

**3. chat_service.py:601** - ChatSession.deep_feeling_mode
```python
# If attribute doesn't exist in model:
# Option A: Add to model
# Option B: Remove usage
# Option C: # type: ignore[attr-defined]  # Legacy attribute
```

---

## 🚀 Phase 8: Edge Cases (9 errors, ~30 minutes)

**1. ai_model_service.py:324, 435, 460** - `any` not valid as type
```python
# Before: def func() -> any:
# After:  def func() -> Any:  # Capital A
```

**2. ai_model_service.py:373** - Unused coroutine
```python
# Before: update_metrics(...)  # async function not awaited
# After:  await update_metrics(...)
```

**3. ai_model_service.py:505** - next() overload issue
```python
# AsyncGenerator issue - may need anext() instead of next()
# Before: next(generator)
# After:  await anext(generator)
```

**4. transitions.py:319** - Unexpected keyword "explanation"
```python
# Check WaypointInfo model - either:
# - Remove explanation parameter
# - Add explanation field to model
```

**5. waypoint_explainer.py:600** - Unreachable code
```python
# Remove the unreachable line or fix logic flow
```

---

## 📋 Recommended Order of Execution

### Session 1 (2-3 hours):
1. ✅ **Phase 2b:** Collection indexing (13 errors) → 98 remaining
2. ✅ **Phase 3:** Argument types (15 errors) → 83 remaining
3. ✅ **Phase 6:** Variable annotations (4 errors) → 79 remaining

**Break Point:** ~79 errors remaining

### Session 2 (2-3 hours):
4. ✅ **Phase 2c:** FastAPI routes (37 errors) → 42 remaining
5. ✅ **Phase 5:** Return values (10 errors) → 32 remaining

**Break Point:** ~32 errors remaining

### Session 3 (2 hours):
6. ✅ **Phase 4:** Assignments (11 errors) → 21 remaining
7. ✅ **Phase 7:** Attributes (9 errors) → 12 remaining
8. ✅ **Phase 8:** Edge cases (9 errors) → 3 remaining
9. ✅ **Final cleanup:** Last 3 errors → 0 remaining! 🎉

---

## 🧪 Testing After Each Phase

```bash
# Run mypy
mypy app/ --strict --show-error-codes 2>&1 | grep "error:" | wc -l

# Check specific error type is gone
mypy app/ --strict --show-error-codes 2>&1 | grep "index" | wc -l
mypy app/ --strict --show-error-codes 2>&1 | grep "no-untyped-def" | wc -l

# Run tests to ensure nothing broke
pytest tests/ -v

# Quick smoke test
python -c "from app.main import app; print('✅ App imports successfully')"
```

---

## 🎯 Success Criteria

✅ MyPy reports 0 errors with `--strict` flag
✅ All tests pass
✅ No new type: ignore comments without explanation
✅ Code still runs and functions correctly

---

## 📝 Helpful Commands Reference

```bash
# Get error count by type
mypy app/ --strict --show-error-codes 2>&1 | grep "error:" | sed 's/.*\[\(.*\)\]/\1/' | sort | uniq -c | sort -rn

# Get errors for specific file
mypy app/services/clinical_alert_service.py --strict --show-error-codes

# Get all errors of specific type
mypy app/ --strict --show-error-codes 2>&1 | grep "\[index\]"

# Check progress
echo "Errors remaining: $(mypy app/ --strict --show-error-codes 2>&1 | grep "error:" | wc -l)"
```

---

## 🛠️ Files Modified So Far

- app/services/recommendation_engine.py
- app/services/waypoint_explainer.py
- app/services/strategy_recommender.py
- app/services/path_planner.py
- app/services/path_matrix_service.py
- app/services/atlas_mapper.py
- app/services/ai_model_service.py
- app/api/routes/chat_websocket.py
- app/api/routes/ai_settings.py
- app/websocket/connection_manager.py
- app/websocket/routes.py
- app/main.py

---

## 💡 Tips for Success

1. **Work in phases** - Complete one error type before moving to next
2. **Test frequently** - Run mypy after each few fixes
3. **Commit often** - Commit after each completed phase
4. **Take breaks** - 25-minute work blocks with 5-minute breaks
5. **Use automation** - Scripts for mechanical fixes
6. **Stay focused** - One error at a time, don't rush

---

## 🎉 Motivation

You've already crushed 34% of the errors in one session!
The remaining work is methodical and achievable.
Every error fixed makes the codebase more maintainable.
You've got this! 💪

---

**Good night! Tomorrow you'll knock out the rest!** 🌙✨
