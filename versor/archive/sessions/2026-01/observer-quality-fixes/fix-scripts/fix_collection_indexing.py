#!/usr/bin/env python3
"""Fix Collection[str] indexing errors in clinical_alert_service.py"""

from pathlib import Path

file_path = Path("app/services/clinical_alert_service.py")

# Read the file
content = file_path.read_text()
lines = content.split("\n")

# Lines with indexing errors (0-indexed)
error_lines = [474, 475, 499, 524, 525, 557, 558, 597, 598, 631, 632, 663, 664]

# Fix each line by searching for patterns and adding list() wrapper
modified = False
for line_num in error_lines:
    if line_num >= len(lines):
        continue

    line = lines[line_num]
    original = line

    # Pattern: variable_name[0] or variable_name[1]
    # We need to find the pattern and wrap the variable in list()
    import re

    # Find patterns like: word[0] or word[1]
    pattern = r"(\w+)\[([01])\]"

    def replace_with_list(match):
        var_name = match.group(1)
        index = match.group(2)
        return f"list({var_name})[{index}]"

    new_line = re.sub(pattern, replace_with_list, line)

    if new_line != original:
        lines[line_num] = new_line
        print(f"Line {line_num + 1}: Fixed indexing")
        print(f"  Before: {original.strip()}")
        print(f"  After:  {new_line.strip()}")
        modified = True

if modified:
    # Write back
    file_path.write_text("\n".join(lines))
    print(f"\n✅ Fixed Collection indexing in {file_path}")
else:
    print("No changes needed")
