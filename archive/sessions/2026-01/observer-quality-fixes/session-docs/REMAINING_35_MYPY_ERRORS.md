# Remaining 35 MyPy Errors - Final Push to 0

**Date:** January 4, 2026  
**Current Status:** 35 errors (76 fixed, 68% complete)  
**Estimated Time to Complete:** 45-60 minutes  
**Goal:** 0 errors! 🎯

---

## Error Breakdown

- **10 assignment**: Type compatibility issues
- **10 arg-type**: Type casts and conversions needed
- **6 attr-defined**: Missing model attributes
- **5 return-value**: Return type mismatches
- **2 operator**: Unsupported operator types
- **2 misc**: Generator type issues

---

## Complete Error List with Fixes

### 1. embedding_service.py (2 assignment errors)

**Lines 295, 297:** Provider type mismatches

```python
# Current (WRONG):
self.provider = OpenAIEmbeddingProvider()  # Line 295
self.provider = LocalEmbeddingProvider()   # Line 297

# Fix: Change provider type to Union
from typing import Union

class EmbeddingService:
    def __init__(self, provider: Optional[Union[LocalEmbeddingProvider, OpenAIEmbeddingProvider]] = None):
        ...
        if settings.EMBEDDING_PROVIDER.lower() == "openai":
            self.provider: Union[LocalEmbeddingProvider, OpenAIEmbeddingProvider] = OpenAIEmbeddingProvider()
        else:
            self.provider = LocalEmbeddingProvider()
```

---

### 2. metrics_calculator.py (2 arg-type + attr-defined errors)

**Line 536:** Argument type is object, expected float  
**Line 537:** object has no append attribute

```python
# Lines 535-537 context needed
# Fix: Add type annotation to elasticity variable
elasticity: float = self.calculate_elasticity(...)
if self.detect_flooding(elasticity):  # Now properly typed
    alerts.append("flooding")  # alerts is List, not object
```

---

### 3. insight_generator.py (5 assignment + attr-defined errors)

**Lines 1280, 1282, 1284, 1286:** Assigning str to dict[str, object]

```python
# Current (WRONG):
result["summary"] = summary_text  # str assigned to dict[str, object]

# Fix Option 1: Change result type
result: Dict[str, Any] = {}

# Fix Option 2: Use cast
result["summary"] = cast(Any, summary_text)
```

**Line 842:** SessionAnalyticsService has no get_or_create

```python
# Current (WRONG):
analytics = await analytics_service.get_or_create(session_id)

# Fix: Use correct method or add type: ignore
# analytics = await analytics_service.get_or_create(session_id)  # type: ignore[attr-defined]
# OR find the actual method name
```

**Line 1011:** category is object | Any, expected str

```python
# Fix: Cast to str
category = cast(str, emotion.get("category", "Unknown"))
await analytics_service.update_metrics(session_id=session_id, category=category, ...)
```

---

### 4. chat_service.py (2 assignment + attr-defined errors)

**Line 526:** Select type mismatch

```python
# Current (WRONG):
stmt = select(...).group_by(...)  # Returns Select[tuple[UUID | None]]

# Fix: Use proper type annotation or separate variable
count_stmt = select(ChatMessage.message_type, func.count(...))
```

**Line 601:** ChatSession has no deep_feeling_mode attribute

```python
# Fix Option 1: Add column to model
# In app/models/chat_session.py:
# deep_feeling_mode = Column(Boolean, default=False)

# Fix Option 2: Type ignore if attribute exists but not in type
session.deep_feeling_mode = enabled  # type: ignore[attr-defined]
```

---

### 5. path_matrix_service.py (3 return-value + assignment errors)

**Line 694:** Returns Any | None, expected bool

```python
# Current:
return some_value  # Any | None

# Fix:
return cast(bool, some_value) if some_value is not None else False
```

**Line 769:** Assigning str to int

```python
# Current (WRONG):
waypoint_count = str(count)  # str assigned to int

# Fix:
waypoint_count = int(count)  # or count directly
```

**Line 943:** Returns Any | None, expected int

```python
# Fix:
return cast(int, some_value) if some_value is not None else 0
```

---

### 6. transitions.py (7 transitions errors remaining)

**Line 495:** Assigning int to bool field

```python
# Current:
waypoint.reached = 1  # int assigned to bool

# Fix:
waypoint.reached = True  # or bool(1)
```

**Lines 517, 557:** stmt reuse - Select type mismatch

```python
# Current (WRONG):
stmt = select(JourneyWaypoint)...  # Reuses 'stmt' variable

# Fix: Use unique variable names (ALREADY partially fixed, need to finish)
waypoint_check_stmt = select(JourneyWaypoint)...
```

**Lines 521, 561:** UserJourney has no 'reached' attribute

```python
# This is from stmt variable reuse - will be fixed with above
```

**Lines 658, 659, 664, 666:** strategy_stats object typing

```python
# Current:
strategy_stats = {}  # Inferred as Dict[str, object]

# Fix: Add type annotation
strategy_stats: Dict[str, Dict[str, Any]] = {}
```

---

### 7. chat_websocket.py (3 arg-type errors)

**Line 377:** audio_data is Any | None, expected str

```python
# Fix:
if audio_data:
    await process_audio_message(session_id, str(audio_data), ...)
```

**Line 382:** content is Any | None, expected str

```python
# Fix:
if content:
    await process_text_message(session_id, str(content), ...)
```

**Line 733:** session_id is str, expected UUID

```python
# Current:
await generate_insights(session_id, ...)  # str passed

# Fix:
# This line should pass db_session_id (UUID), not session_id (str)
# Likely already correct in code - check actual parameters
```

---

### 8. ai_settings.py (6 errors) - Session vs AsyncSession

**Lines 290, 315, 345, 371:** Passing Session instead of AsyncSession

```python
# Current (WRONG):
service = AIModelService(db)  # db is Session

# Fix: Ensure db is AsyncSession from get_db()
# Check if using sync vs async database session
```

**Line 322:** Returning AssignModelResponse but type is Dict[str, Any]

```python
# Fix: Change return type annotation
async def assign_model_to_function(...) -> AssignModelResponse:
```

**Line 388:** No return value expected

```python
# Current:
async def update_performance_metrics(...) -> None:
    ...
    return  # This return should be removed

# Fix: Remove the return statement
```

---

### 9. main.py (1 return-value error)

**Line 110:** No return value expected

```python
# Current:
@app.on_event("shutdown")
async def shutdown_event():
    return  # Unexpected return

# Fix: Remove return statement
async def shutdown_event():
    # cleanup code
    # (no return)
```

---

## Quick Win Strategy

**Phase 1 (10 min):** Fix simple return-value errors (5 errors)
- main.py line 110: Remove return
- ai_settings.py line 388: Remove return  
- ai_settings.py line 322: Change return type
- path_matrix_service.py lines 694, 943: Add casts

**Phase 2 (15 min):** Fix transitions.py (7 errors)
- Line 495: Change 1 → True
- Lines 517, 557: Fix remaining stmt reuses
- Add type annotation to strategy_stats

**Phase 3 (10 min):** Fix ai_settings.py Session types (4 errors)
- Verify db parameter is AsyncSession
- Add type annotations if needed

**Phase 4 (15 min):** Fix insight_generator.py (5 errors)
- Add type annotations to result dict
- Cast category to str
- Handle get_or_create with type: ignore

**Phase 5 (10 min):** Fix remaining service errors (14 errors)
- Add Union type to embedding_service
- Add casts to metrics_calculator
- Fix chat_service types
- Add casts to chat_websocket

---

## Automation Opportunity

Could create a script for the simple cast additions:

```python
fixes = [
    ("app/main.py", 110, "return", "# Cleanup complete"),
    ("app/api/routes/ai_settings.py", 388, "return", "# Updated"),
    ("app/api/routes/transitions.py", 495, "waypoint.reached = 1", "waypoint.reached = True"),
    # etc.
]
```

---

## Success Criteria

✅ MyPy reports 0 errors with `--strict` flag  
✅ All tests pass  
✅ No runtime behavior changes  
✅ Code is more maintainable and type-safe

**You're 68% there - finish line in sight!** 💪
