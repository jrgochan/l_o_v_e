#!/usr/bin/env python3
"""Remove specific unused imports identified by flake8."""

from pathlib import Path


# Map of file -> list of (line_num, import_to_remove)
UNUSED_IMPORTS = {
    "app/api/routes/ai_settings.py": [(245, "Dict")],
    "app/api/routes/atlas.py": [(270, "List")],
    "app/api/routes/bootstrap.py": [(218, "List"), (221, "select")],
    "app/api/routes/chat_websocket.py": [
        (224, "json"),
        (231, "Depends"),
        (231, "HTTPException"),
        (232, "AsyncSession"),
        (235, "get_db"),
        (921, "AggregateEmotionService"),
        (922, "EmotionRelationshipService"),
    ],
    "app/api/routes/current.py": [(207, "datetime"), (207, "timezone")],
    "app/api/routes/state.py": [(237, "json"), (240, "UUID")],
    "app/api/routes/transitions.py": [(234, "TransitionStrategy")],
    "app/api/schemas/history.py": [(69, "UUID")],
    "app/database.py": [
        (14, "NullPool"),
        (78, "atlas_definition"),
        (78, "chat_message"),
        (78, "chat_session"),
        (78, "clinical_alert"),
        (78, "session_analytics"),
        (78, "user_trajectory"),
    ],
    "app/models/atlas_definition.py": [(368, "ARRAY")],
    "app/models/chat_message.py": [(446, "List"), (446, "Optional")],
    "app/models/chat_session.py": [(418, "func")],
    "app/models/clinical_alert.py": [(368, "SQLEnum")],
    "app/models/user_trajectory.py": [(404, "String")],
    "app/services/aggregate_emotion_service.py": [(159, "Tuple")],
    "app/services/chat_service.py": [(221, "AtlasDefinition")],
    "app/services/embedding_service.py": [(155, "ABC"), (155, "abstractmethod"), (158, "np")],
    "app/services/path_matrix_service.py": [
        (431, "asyncio"),
        (436, "Tuple"),
        (439, "and_"),
        (439, "func"),
        (445, "WaypointExplainer"),
    ],
    "app/services/quaternion_builder.py": [(96, "Tuple")],
    "app/services/strategy_recommender.py": [(182, "Tuple")],
    "app/services/waypoint_explainer.py": [(207, "Tuple")],
}


def remove_import_from_line(line: str, import_name: str) -> str:
    """Remove a specific import from a line.
    
    Args:
        line: The import line.
        import_name: The import name to remove.
        
    Returns:
        Modified line, or empty string if entire line should be removed.
    """
    # Case 1: Single import on line - remove entire line
    if f"import {import_name}" in line and "," not in line:
        return ""
    
    # Case 2: Multiple imports - remove just this one
    if f", {import_name}" in line:
        return line.replace(f", {import_name}", "")
    if f"{import_name}," in line:
        return line.replace(f"{import_name},", "")
    
    # Case 3: Part of "from X import Y as Z"
    if f"{import_name} as" in line:
        # More complex - need to handle aliases
        parts = line.split("import")[1].strip().split(",")
        new_parts = [p.strip() for p in parts if not p.strip().startswith(import_name)]
        if new_parts:
            return line.split("import")[0] + "import " + ", ".join(new_parts) + "\n"
        return ""
    
    return line


def fix_file(filepath: Path, imports_to_remove: list) -> int:
    """Fix unused imports in a file.
    
    Args:
        filepath: Path to the file.
        imports_to_remove: List of (line_num, import_name) tuples.
        
    Returns:
        Number of imports removed.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Group by line number
    by_line = {}
    for line_num, import_name in imports_to_remove:
        if line_num not in by_line:
            by_line[line_num] = []
        by_line[line_num].append(import_name)
    
    # Process lines
    removed_count = 0
    new_lines = []
    
    for i, line in enumerate(lines, start=1):
        if i in by_line:
            # Remove imports from this line
            modified_line = line
            for import_name in by_line[i]:
                modified_line = remove_import_from_line(modified_line, import_name)
                if modified_line != line:
                    removed_count += 1
            
            if modified_line:  # Only add if line not empty
                new_lines.append(modified_line)
        else:
            new_lines.append(line)
    
    # Write back
    if removed_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    
    return removed_count


def main():
    """Remove all unused imports."""
    print("🧹 Removing Unused Imports")
    print("=" * 60)
    
    total_removed = 0
    files_fixed = 0
    
    for filepath_str, imports in UNUSED_IMPORTS.items():
        filepath = Path(filepath_str)
        if not filepath.exists():
            print(f"⚠️  {filepath_str}: File not found")
            continue
        
        removed = fix_file(filepath, imports)
        if removed > 0:
            files_fixed += 1
            total_removed += removed
            print(f"✓ {filepath}: {removed} imports removed")
    
    print(f"\n{'=' * 60}")
    print(f"Summary:")
    print(f"  Files fixed: {files_fixed}")
    print(f"  Total imports removed: {total_removed}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
