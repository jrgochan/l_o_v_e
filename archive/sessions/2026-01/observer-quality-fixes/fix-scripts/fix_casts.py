#!/usr/bin/env python3
"""Fix no-any-return and simple arg-type errors with casts"""

from pathlib import Path
from typing import List, Tuple

# (file, line, old_pattern, new_pattern)
fixes: List[Tuple[str, int, str, str]] = [
    # no-any-return fixes - add cast()
    (
        "app/services/aggregate_emotion_service.py",
        420,
        "return round(min(complexity, 1.0), 3)",
        "return cast(float, round(min(complexity, 1.0), 3))",
    ),
    (
        "app/services/aggregate_emotion_service.py",
        466,
        "return round(min(clarity, 1.0), 3)",
        "return cast(float, round(min(clarity, 1.0), 3))",
    ),
    # arg-type fixes - simple conversions
    (
        "app/services/recommendation_engine.py",
        742,
        'journey["emotions"]',
        'list(journey["emotions"])',
    ),
    ("app/services/emotion_mapper.py", 146, "key=distances.get", "key=lambda k: distances[k]"),
    # Check if cast import exists, add if not
]

# First, ensure cast is imported where needed
files_needing_cast = {
    "app/services/aggregate_emotion_service.py",
    "app/services/embedding_service.py",
    "app/services/waypoint_explainer.py",
}

for filepath in files_needing_cast:
    path = Path(filepath)
    if path.exists():
        content = path.read_text()
        if "from typing import" in content and "cast" not in content:
            # Add cast to existing typing import
            content = content.replace("from typing import", "from typing import cast,")
            path.write_text(content)
            print(f"✅ Added cast import to {filepath}")

# Apply fixes
for filepath, line_num, old, new in fixes:
    path = Path(filepath)
    if path.exists():
        lines = path.read_text().split("\n")
        if line_num - 1 < len(lines) and old in lines[line_num - 1]:
            lines[line_num - 1] = lines[line_num - 1].replace(old, new)
            path.write_text("\n".join(lines))
            print(f"✅ Fixed {filepath}:{line_num}")

print("\n🎉 Cast fixes complete!")
