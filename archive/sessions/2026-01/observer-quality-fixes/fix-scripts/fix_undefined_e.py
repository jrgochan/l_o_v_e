#!/usr/bin/env python3
"""Fix F821 undefined name 'e' errors by restoring exception variables."""

import re
from pathlib import Path


def fix_file(filepath: Path) -> int:
    """Fix undefined 'e' errors in a file.

    Returns:
        Number of fixes applied.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern: except Exception: followed by lines that use 'e'
    # We need to add 'as e' back to the except line

    # Find all except blocks and check if they use 'e' in the body
    lines = content.split("\n")
    fixes = 0

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if this is an except line without 'as e'
        if re.match(r"\s*except\s+\w+:", line) and " as " not in line:
            # Look ahead to see if 'e' is used in this block
            indent = len(line) - len(line.lstrip())
            j = i + 1
            uses_e = False

            while j < len(lines):
                next_line = lines[j]
                if next_line.strip() == "":
                    j += 1
                    continue

                next_indent = len(next_line) - len(next_line.lstrip())
                if next_indent <= indent and next_line.strip():
                    # End of except block
                    break

                # Check if this line uses 'e'
                if re.search(r"\be\b", next_line):
                    uses_e = True
                    break

                j += 1

            # If 'e' is used, add 'as e' to the except line
            if uses_e:
                # Replace "except SomeException:" with "except SomeException as e:"
                lines[i] = re.sub(r"(except\s+\w+):", r"\1 as e:", line)
                fixes += 1

        i += 1

    if fixes > 0:
        content = "\n".join(lines)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    return fixes


def main():
    """Fix all files with F821 errors."""
    print("🔧 Fixing Undefined 'e' Errors")
    print("=" * 60)

    # Files with F821 errors from flake8 output
    files_to_fix = [
        "app/api/routes/ai_settings.py",
        "app/api/routes/atlas.py",
        "app/api/routes/bootstrap.py",
        "app/api/routes/chat_websocket.py",
        "app/api/routes/current.py",
        "app/api/routes/health.py",
        "app/api/routes/history.py",
        "app/api/routes/state.py",
        "app/api/routes/transitions.py",
    ]

    total_fixes = 0

    for filepath_str in files_to_fix:
        filepath = Path(filepath_str)
        if not filepath.exists():
            continue

        fixes = fix_file(filepath)
        if fixes > 0:
            total_fixes += fixes
            print(f"✓ {filepath}: {fixes} exception handlers fixed")

    print(f"\n{'=' * 60}")
    print(f"Total fixes: {total_fixes}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
