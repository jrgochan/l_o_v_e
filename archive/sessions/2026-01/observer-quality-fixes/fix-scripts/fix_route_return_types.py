#!/usr/bin/env python3
"""Fix missing return type annotations in route handlers and helper functions"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

# Map of file -> [(line_number, function_name, return_type)]
fixes: List[Tuple[Path, int, str]] = [
    # transitions.py - Route handlers (return Dict[str, Any])
    (Path("app/api/routes/transitions.py"), 251, " -> Dict[str, Any]"),
    (Path("app/api/routes/transitions.py"), 418, " -> Dict[str, Any]"),
    (Path("app/api/routes/transitions.py"), 464, " -> Dict[str, Any]"),
    (Path("app/api/routes/transitions.py"), 546, " -> Dict[str, Any]"),
    (Path("app/api/routes/transitions.py"), 592, " -> Dict[str, Any]"),
    (Path("app/api/routes/transitions.py"), 627, " -> Dict[str, Any]"),
    # transitions.py - Helper functions
    (Path("app/api/routes/transitions.py"), 690, ") -> List[float]"),
    (Path("app/api/routes/transitions.py"), 695, ") -> List[StrategyInfo]"),
    (Path("app/api/routes/transitions.py"), 749, ") -> str"),
    # history.py
    (Path("app/api/routes/history.py"), 267, " -> Dict[str, Any]"),
    # health.py
    (Path("app/api/routes/health.py"), 269, " -> Dict[str, Any]"),
    # current.py
    (Path("app/api/routes/current.py"), 226, " -> Dict[str, Any]"),
    # chat_websocket.py
    (Path("app/api/routes/chat_websocket.py"), 757, " -> None"),
    # bootstrap.py - Route handlers
    (Path("app/api/routes/bootstrap.py"), 232, " -> Dict[str, Any]"),
    (Path("app/api/routes/bootstrap.py"), 275, " -> Dict[str, Any]"),
    (Path("app/api/routes/bootstrap.py"), 401, " -> Dict[str, Any]"),
    (Path("app/api/routes/bootstrap.py"), 472, " -> Dict[str, Any]"),
    (Path("app/api/routes/bootstrap.py"), 526, " -> Dict[str, Any]"),
    # bootstrap.py - Helper functions
    (Path("app/api/routes/bootstrap.py"), 341, ") -> None"),
    (Path("app/api/routes/bootstrap.py"), 367, ") -> list[Any]"),
    # ai_settings.py
    (Path("app/api/routes/ai_settings.py"), 282, " -> Dict[str, Any]"),
    (Path("app/api/routes/ai_settings.py"), 304, " -> Dict[str, Any]"),
    (Path("app/api/routes/ai_settings.py"), 332, " -> Dict[str, Any]"),
    (Path("app/api/routes/ai_settings.py"), 358, " -> Dict[str, Any]"),
    # websocket/routes.py
    (Path("app/websocket/routes.py"), 192, " -> None"),
    # state.py
    (Path("app/api/routes/state.py"), 263, " -> Dict[str, Any]"),
    # atlas.py - 10 route handlers
    (Path("app/api/routes/atlas.py"), 288, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 341, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 368, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 411, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 458, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 497, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 520, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 561, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 580, " -> Dict[str, Any]"),
    (Path("app/api/routes/atlas.py"), 604, " -> Dict[str, Any]"),
    # strategy_recommender.py - Service function
    (Path("app/services/strategy_recommender.py"), 435, ", strategy_id: str, user_id: str)"),
]


def fix_return_type(file_path: Path, line_num: int, type_annotation: str) -> bool:
    """Add return type annotation to a function."""
    content = file_path.read_text()
    lines = content.split("\n")

    # Get the line (0-indexed)
    if line_num - 1 >= len(lines):
        print(f"⚠️  Line {line_num} not found in {file_path}")
        return False

    line = lines[line_num - 1]

    # Check if it ends with ):
    if type_annotation.startswith(" -> "):
        # Route handler return type
        if "):" in line:
            # Simple single-line def
            lines[line_num - 1] = line.replace("):", f"){type_annotation}:")
            print(f"✅ Fixed line {line_num}: Added {type_annotation}")
        elif line.strip().endswith(")"):
            # Multi-line def, closing on this line
            lines[line_num - 1] = line + type_annotation + ":"
            # Remove colon from next line if it exists
            if line_num < len(lines) and lines[line_num].strip() == ":":
                lines[line_num] = ""
            print(f"✅ Fixed line {line_num}: Added {type_annotation}")
        else:
            print(f"⚠️  Unexpected format at line {line_num}: {line}")
            return False
    else:
        # Function argument annotation - replace closing paren
        lines[line_num - 1] = line.replace(")", type_annotation)
        print(f"✅ Fixed line {line_num}: Added parameter type")

    file_path.write_text("\n".join(lines))
    return True


# Process all fixes
total = len(fixes)
success = 0

for file_path, line_num, annotation in fixes:
    if fix_return_type(file_path, line_num, annotation):
        success += 1

print(f"\n{'='*60}")
print(f"✅ Fixed {success}/{total} functions")
print(f"{'='*60}")
