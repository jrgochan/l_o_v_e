#!/usr/bin/env python3
"""
Fix missing return type annotations in FastAPI route handlers.

Handles multiline function signatures common in FastAPI routes.
"""

import re
from pathlib import Path
from typing import Any, Dict


def fix_route_return_types(file_path: Path) -> int:
    """
    Add return type annotations to route handlers.

    Returns:
        Number of fixes applied
    """
    with open(file_path, "r") as f:
        lines = f.readlines()

    fixes = 0
    i = 0

    while i < len(lines):
        line = lines[i]

        # Look for async def without return type on same line
        if "async def " in line and "-> " not in line and line.rstrip().endswith(":"):
            # Single-line function definition - already has return type, skip
            i += 1
            continue

        # Multi-line function: async def on one line, ) on another
        if "async def " in line and "-> " not in line and not line.rstrip().endswith(":"):
            # Found start of function, scan forward for closing paren
            j = i + 1
            while j < len(lines) and ")" not in lines[j]:
                j += 1

            # Found closing paren
            if j < len(lines):
                paren_line = lines[j]
                # Check if it has return type
                if "-> " not in paren_line and paren_line.strip().startswith(")"):
                    # Add return type
                    lines[j] = paren_line.replace("):", ") -> Dict[str, Any]:")
                    fixes += 1
                    print(f"Fixed line {j + 1}: {lines[i].strip()}")

            i = j + 1
        else:
            i += 1

    if fixes > 0:
        with open(file_path, "w") as f:
            f.writelines(lines)

    return fixes


def main():
    """Fix route return types in all API route files."""

    files_to_fix = [
        "app/api/routes/atlas.py",
        "app/api/routes/transitions.py",
        "app/api/routes/bootstrap.py",
        "app/api/routes/ai_settings.py",
        "app/api/routes/history.py",
        "app/api/routes/health.py",
        "app/api/routes/current.py",
        "app/api/routes/state.py",
        "app/api/routes/chat_websocket.py",
        "app/websocket/routes.py",
    ]

    total_fixes = 0

    for file_rel in files_to_fix:
        file_path = Path(file_rel)
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue

        fixes = fix_route_return_types(file_path)
        if fixes > 0:
            total_fixes += fixes
            print(f"✅ {file_path}: {fixes} fixes")

    print(f"\n🎉 Total: {total_fixes} route signatures fixed")

    # Also need to add Dict import if not present
    print("\n📝 Note: Ensure 'from typing import Dict, Any' is imported in fixed files")

    return 0


if __name__ == "__main__":
    exit(main())
