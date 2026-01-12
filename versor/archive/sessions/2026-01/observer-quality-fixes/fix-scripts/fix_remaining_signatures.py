#!/usr/bin/env python3
"""Fix all remaining function signatures in one go"""

from pathlib import Path

fixes = [
    # transitions.py helper functions - need parameter types
    ("app/api/routes/transitions.py", 690, "def _to_python_list(vac_vector: Any)", "def _to_python_list(vac_vector)"),
    ("app/api/routes/transitions.py", 695, "async def _get_strategies_for_waypoint(\n    db: AsyncSession, from_emotion: Any, to_emotion: Any, user_id: str", "async def _get_strategies_for_waypoint(\n    db: AsyncSession, from_emotion, to_emotion, user_id: str"),
    ("app/api/routes/transitions.py", 749, "def _generate_waypoint_reasoning(waypoint_emotion: Any, path: Any)", "def _generate_waypoint_reasoning(waypoint_emotion, path)"),
    
    # Other files with multi-line signatures
    ("app/api/routes/history.py", 267, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/chat_websocket.py", 757, ") -> None:", "):"),
    ("app/api/routes/bootstrap.py", 275, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/bootstrap.py", 341, "modifier: Any, modifier_type_name", "modifier, modifier_type_name"),
    ("app/api/routes/bootstrap.py", 367, "db_rows: Any", "db_rows"),
    ("app/api/routes/bootstrap.py", 401, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/bootstrap.py", 472, ") -> Dict[str, Any]:", "):"),
    ("app/websocket/routes.py", 192, ") -> None:", "):"),
    ("app/api/routes/state.py", 263, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/atlas.py", 288, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/atlas.py", 411, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/atlas.py", 458, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/atlas.py", 520, ") -> Dict[str, Any]:", "):"),
    ("app/api/routes/atlas.py", 604, ") -> Dict[str, Any]:", "):"),
]

for filepath, line_num, new_text, old_text in fixes:
    path = Path(filepath)
    content = path.read_text()
    lines = content.split('\n')
    
    if line_num - 1 < len(lines):
        line = lines[line_num - 1]
        if old_text in line:
            lines[line_num - 1] = line.replace(old_text, new_text)
            path.write_text('\n'.join(lines))
            print(f"✅ Fixed {filepath}:{line_num}")
        else:
            print(f"⚠️ Pattern not found in {filepath}:{line_num}")

print("\n✅ Batch fix complete!")
