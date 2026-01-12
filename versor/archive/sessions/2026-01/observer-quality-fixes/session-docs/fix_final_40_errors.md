# Final 40 MyPy Errors - Comprehensive Fix Plan

## Summary
40 errors remaining across 7 files. Can complete in ~1 hour.

## Error Breakdown by File

### transitions.py (12 errors) - Variable Naming Issues
Lines 484, 517, 557: Using `journey` variable instead of `waypoint` 
Fix: The code queries waypoint but assigns to `journey` variable name

Lines 495, 496, 497, 521, 561: Accessing waypoint attributes on journey object
Fix: Use `waypoint.reached`, `waypoint.reached_at`, `waypoint.self_assessment`

Lines 658, 659, 664, 666: `stats` dict typing as object
Fix: Add type annotations to strategy_stats dict

### ai_settings.py (6 errors) - Session Type Mismatch
Lines 290, 315, 345, 371: Passing Session instead of AsyncSession
Fix: Use get_db() properly or cast

Line 322: Returning AssignModelResponse but declared Dict[str, Any]
Fix: Change return type to AssignModelResponse

Line 388: Unexpected return value
Fix: Remove return statement or change function signature

### insight_generator.py (6 errors) - Dict Assignment & Missing Attrs
Lines 1280, 1282, 1284, 1286: Assigning str to dict[str, object]
Fix: Change result dict type or use cast

Line 842: SessionAnalyticsService.get_or_create doesn't exist
Fix: Use different method or type: ignore

Line 1011: category type is object
Fix: Cast to str

### Other Files (16 errors)
- embedding_service.py (2): Provider type mismatches - use Union type
- metrics_calculator.py (2): Object type issues - add casts
- chat_service.py (2): Assignment + attr-defined - fix types
- path_matrix_service.py (3): Return types - add casts
- main.py (1): Unexpected return - remove it

## Execution Plan

1. Fix transitions.py variable names (12 errors) → ~28 errors
2. Fix ai_settings.py types (6 errors) → ~22 errors  
3. Fix insight_generator.py (6 errors) → ~16 errors
4. Fix remaining service errors (16 errors) → 0 errors!

Estimated time: 45-60 minutes to 0 errors!
