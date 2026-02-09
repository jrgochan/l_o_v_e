# Observer Services/API Mypy Strict Compliance Plan

**Goal:** Fix remaining 168 mypy strict errors in services, API routes, and websocket layers

**Context:** Model layer is 100% complete with 0 mypy errors. This plan addresses the remaining application layers.

**Current Status:** 7/9 quality checks passing, 2 remaining (mypy services/API, pydocstyle)

---

## Error Analysis

### Total Errors: 168

**By File (Top 15):**
```
25 errors - app/api/routes/chat_websocket.py (15% of total)
24 errors - app/api/routes/transitions.py (14%)
13 errors - app/services/clinical_alert_service.py (8%)
10 errors - app/api/routes/atlas.py (6%)
 9 errors - app/websocket/connection_manager.py (5%)
 9 errors - app/api/routes/ai_settings.py (5%)
 8 errors - app/services/recommendation_engine.py (5%)
 8 errors - app/services/path_planner.py (5%)
 8 errors - app/api/routes/bootstrap.py (5%)
 7 errors - app/services/path_matrix_service.py (4%)
 6 errors - app/services/waypoint_explainer.py (4%)
 6 errors - app/services/strategy_recommender.py (4%)
 6 errors - app/services/insight_generator.py (4%)
 6 errors - app/services/ai_model_service.py (4%)
 4 errors - app/services/embedding_service.py (2%)
```

**By Error Type:**
```
71 errors - no-untyped-def (42%) - Missing function type annotations
21 errors - type-arg (13%) - Dict/List missing type parameters
15 errors - arg-type (9%) - Wrong argument types
13 errors - index (8%) - Dict/List indexing issues
11 errors - assignment (7%) - Type mismatches
 9 errors - attr-defined (5%) - Attribute access issues
 5 errors - no-any-return (3%) - Returning Any
23 errors - Other types (14%)
```

---

## Phase-Based Remediation Strategy

### Phase 1: Type Parameter Fixes (Quick Win - 21 errors)
**Time Estimate:** 30-45 minutes
**Impact:** 13% error reduction

**Pattern:**
```python
# Before
def get_data() -> Dict:
    return {}

def process_items() -> List:
    return []

# After
def get_data() -> Dict[str, Any]:
    return {}

def process_items() -> List[Any]:
    return []
```

**Files to Fix:**
- app/services/recommendation_engine.py (8 instances)
- app/services/waypoint_explainer.py (6 instances)
- Others (7 instances)

**Approach:**
1. Find all `-> Dict` and `-> List` without `[`
2. Add appropriate type parameters
3. Ensure `from typing import Any` exists

---

### Phase 2: Function Signature Annotations (Major Impact - 71 errors)
**Time Estimate:** 2-3 hours
**Impact:** 42% error reduction

**Pattern:**
```python
# Before
def process_emotion(vac_data):
    return calculate_distance(vac_data)

async def handle_message(data):
    result = await analyze(data)
    return result

# After
def process_emotion(vac_data: List[float]) -> float:
    return calculate_distance(vac_data)

async def handle_message(data: Dict[str, Any]) -> Optional[AnalysisResult]:
    result = await analyze(data)
    return result
```

**Strategy:**
- Start with files having most errors (chat_websocket, transitions)
- Add parameter types based on usage/context
- Add return types based on what's returned
- Use `Any` when type is truly dynamic

**Files Priority:**
1. chat_websocket.py (25 errors) - WebSocket handlers
2. transitions.py (24 errors) - Transition API
3. clinical_alert_service.py (13 errors) - Alert logic
4. atlas.py (10 errors) - Atlas API

---

### Phase 3: Argument Type Mismatches (15 errors)
**Time Estimate:** 45-60 minutes
**Impact:** 9% error reduction

**Common Issues:**
```python
# Issue: Sequence[str] vs List[str]
# Fix: Convert Sequence to List or vice versa

# Issue: Optional parameter not handled
# Fix: Add Optional[] wrapper

# Issue: Wrong type passed
# Fix: Cast or convert to correct type
```

**Files:**
- recommendation_engine.py
- path_planner.py
- Various API routes

---

### Phase 4: Index & Assignment Errors (24 errors)
**Time Estimate:** 1-1.5 hours
**Impact:** 14% error reduction

**Common Patterns:**
```python
# Index errors - accessing dict/list
data["key"]  # Mypy doesn't know if key exists
items[0]  # Mypy doesn't know if list has items

# Fix with proper typing and guards
if "key" in data:
    value = data["key"]

if items:
    first = items[0]
```

---

### Phase 5: Attribute & Return Issues (17 errors)
**Time Estimate:** 1 hour
**Impact:** 10% error reduction

**attr-defined (9 errors):**
- Accessing attributes mypy doesn't know about
- Usually from dynamic objects or external libraries
- Fix: Add `# type: ignore[attr-defined]` with comment

**no-any-return (5 errors):**
- Functions returning Any when specific type expected
- Fix: Add explicit type cast or assertion

**return-value (3 errors):**
- Return type doesn't match annotation
- Fix: Correct the return type or cast

---

### Phase 6: Remaining Edge Cases (20 errors)
**Time Estimate:** 1 hour
**Impact:** 12% error reduction

**Various Issues:**
- call-overload: Wrong overload selected
- unused-coroutine: Async function not awaited
- valid-type: Type validation issues
- operator: Type doesn't support operator

**Approach:** Case-by-case fixes

---

## Execution Checklist

### Pre-Work
- [ ] Verify current mypy error count: 168
- [ ] Create feature branch for mypy fixes
- [ ] Ensure all tests pass before starting

### Phase 1: Type Parameters (30-45 min)
- [ ] Fix Dict without type params in recommendation_engine.py
- [ ] Fix Dict without type params in waypoint_explainer.py
- [ ] Fix List without type params across files
- [ ] Run mypy, verify ~21 errors fixed
- [ ] Commit: "fix: add type parameters to Dict/List"

### Phase 2: Function Signatures (2-3 hours)
- [ ] chat_websocket.py - Add all function type annotations
- [ ] transitions.py - Add all function type annotations
- [ ] clinical_alert_service.py - Add function types
- [ ] atlas.py - Add function types
- [ ] connection_manager.py - Add function types
- [ ] ai_settings.py - Add function types
- [ ] Run mypy, verify ~71 errors fixed
- [ ] Commit: "fix: add function type annotations to services/API"

### Phase 3: Argument Types (45-60 min)
- [ ] Fix Sequence vs List mismatches
- [ ] Add Optional wrappers where needed
- [ ] Fix type conversions
- [ ] Run mypy, verify ~15 errors fixed
- [ ] Commit: "fix: correct argument types"

### Phase 4: Index/Assignment (1-1.5 hours)
- [ ] Add guards for dict access
- [ ] Add guards for list indexing
- [ ] Fix assignment type mismatches
- [ ] Run mypy, verify ~24 errors fixed
- [ ] Commit: "fix: add type guards for index/assignment"

### Phase 5: Attribute/Return (1 hour)
- [ ] Fix attr-defined errors (add type: ignore with comments)
- [ ] Fix no-any-return (add casts)
- [ ] Fix return-value mismatches
- [ ] Run mypy, verify ~17 errors fixed
- [ ] Commit: "fix: resolve attribute and return type issues"

### Phase 6: Edge Cases (1 hour)
- [ ] Fix remaining 20 errors case-by-case
- [ ] Run mypy, verify 0 errors
- [ ] Commit: "fix: resolve final mypy strict issues"

### Post-Work
- [ ] Run full test suite
- [ ] Run quality check script
- [ ] Verify mypy: 0 errors
- [ ] Update SQLALCHEMY_2_MIGRATION_COMPLETE.md
- [ ] Final commit: "chore: complete mypy strict compliance"

---

## Quick Reference Commands

**Check mypy errors:**
```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e
source infra/.venv-dx/bin/activate
cd observer
mypy app/ --strict --show-error-codes | grep "error:" | wc -l
```

**Check specific file:**
```bash
mypy app/api/routes/chat_websocket.py --strict --show-error-codes
```

**Run quality check:**
```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e
source infra/.venv-dx/bin/activate
./infra/scripts/check-python-quality.sh --module=observer
```

---

## Common Fix Patterns

### Pattern 1: Untyped Function
```python
# Before
def calculate_distance(vac1, vac2):
    return sum((a - b) ** 2 for a, b in zip(vac1, vac2)) ** 0.5

# After
def calculate_distance(vac1: List[float], vac2: List[float]) -> float:
    return sum((a - b) ** 2 for a, b in zip(vac1, vac2)) ** 0.5
```

### Pattern 2: Dict Type Parameters
```python
# Before
def get_config() -> Dict:
    return {"key": "value"}

# After
def get_config() -> Dict[str, Any]:
    return {"key": "value"}
```

### Pattern 3: Optional Returns
```python
# Before
def find_emotion(name: str):
    emotion = db.query(Emotion).filter_by(name=name).first()
    return emotion

# After
def find_emotion(name: str) -> Optional[Emotion]:
    emotion = db.query(Emotion).filter_by(name=name).first()
    return emotion
```

### Pattern 4: Async Functions
```python
# Before
async def process_data(data):
    result = await analyze(data)
    return result

# After
async def process_data(data: Dict[str, Any]) -> Optional[AnalysisResult]:
    result = await analyze(data)
    return result
```

### Pattern 5: WebSocket Handlers
```python
# Before
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()
    await websocket.send_json({"status": "ok"})

# After
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    data: Dict[str, Any] = await websocket.receive_json()
    await websocket.send_json({"status": "ok"})
```

---

## File-Specific Notes

### chat_websocket.py (25 errors)
- WebSocket message handlers need full typing
- Connection state management
- JSON message types: Dict[str, Any]
- All async handlers need -> None or appropriate return

### transitions.py (24 errors)
- FastAPI route handlers
- Request/response models
- Database queries need result typing
- Path parameters and query parameters

### clinical_alert_service.py (13 errors)
- Alert evaluation logic
- Threshold comparisons
- Return types for alert generation

### WebSocket connection_manager.py (9 errors)
- Connection dict typing
- Broadcast methods
- State management

---

## Expected Timeline

**Optimistic:** 5-6 hours focused work
**Realistic:** 6-8 hours with testing
**Conservative:** 8-10 hours with documentation

**Recommendation:** Budget 6-8 hours for next session

---

## Success Criteria

✅ Mypy strict mode: 0 errors across entire app/
✅ All tests passing
✅ Quality check: 8/9 passing (mypy fixed)
✅ Documentation updated
✅ Clean git history with phase commits

---

## Notes

- Model layer is already perfect (this session's work)
- Services/API typing is straightforward but verbose
- Most errors are mechanical (missing annotations)
- Pattern-based fixes will handle ~60% of errors
- Remaining 40% need case-by-case attention
- Test after each phase to catch regressions

---

## Next Session Plan

1. Start fresh with current error count
2. Execute Phase 1 (type params) for quick win
3. Tackle Phase 2 (function signatures) file by file
4. Continue through phases systematically
5. Commit after each phase
6. Final verification and celebration!

**The foundation (models) is rock-solid. Now we finish the superstructure.**
