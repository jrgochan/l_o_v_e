#!/usr/bin/env python3
"""Fix remaining flake8 issues comprehensively."""

import re
from pathlib import Path
from typing import List, Tuple


# Map of file -> list of (line_num, variable_name) for undefined names
UNDEFINED_VARS = {
    "app/api/routes/chat_websocket.py": [
        (521, "db_error"),
        (804, "save_error"),
        (900, "db_error"),
        (1033, "db_error"),
    ],
    "app/api/routes/state.py": [(432, "ws_error")],
    "app/database.py": [(57, "e"), (93, "e")],
    "app/main.py": [(72, "e"), (88, "e")],
    "app/services/ai_model_service.py": [
        (294, "e"),
        (319, "e"),
        (374, "e"),
        (375, "e"),
        (430, "e"),
        (457, "e"),
    ],
    "app/services/atlas_mapper.py": [(254, "e"), (492, "e")],
    "app/services/embedding_service.py": [(267, "e")],
    "app/services/insight_generator.py": [
        (845, "e"),
        (942, "e"),
        (988, "e"),
        (1022, "e"),
        (1102, "e"),
    ],
    "app/services/path_matrix_service.py": [(529, "e"), (560, "e"), (562, "e")],
    "app/services/quaternion_builder.py": [(136, "e")],
    "app/websocket/connection_manager.py": [(286, "e")],
    "app/websocket/routes.py": [(290, "e"), (294, "e"), (325, "e")],
}

# Unused imports to remove
UNUSED_IMPORTS = {
    "app/api/routes/current.py": [(207, "timezone")],
    "app/api/routes/transitions.py": [(234, "TransitionStrategy")],
    "app/database.py": [
        (77, "atlas_definition"),
        (77, "chat_message"),
        (77, "chat_session"),
        (77, "clinical_alert"),
        (77, "session_analytics"),
        (77, "user_trajectory"),
    ],
    "app/models/clinical_alert.py": [(368, "SQLEnum")],
    "app/services/embedding_service.py": [(155, "abstractmethod"), (158, "np")],
}

# Unused local variables
UNUSED_LOCALS = {
    "app/services/emotion_relationship_service.py": [(565, "connection_diff")],
    "app/services/insight_generator.py": [(1319, "content_valence")],
    "app/services/path_matrix_service.py": [
        (493, "BATCH_SIZE"),
        (772, "where_clause"),
        (773, "limit_clause"),
    ],
}


def fix_undefined_vars(filepath: Path, vars_list: List[Tuple[int, str]]) -> int:
    """Fix undefined variable errors by adding exception variable."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Group by line number
    by_line = {}
    for line_num, var_name in vars_list:
        if line_num not in by_line:
            by_line[line_num] = []
        by_line[line_num].append(var_name)
    
    fixes = 0
    
    # For each line with undefined vars, find the except block above it
    for line_num in by_line:
        var_names = by_line[line_num]
        
        # Search backwards for the except statement
        for i in range(line_num - 2, max(0, line_num - 50), -1):
            line = lines[i]
            if 'except' in line and ':' in line and ' as ' not in line:
                # Found an except without 'as'
                # Add the appropriate variable name
                var_name = var_names[0]  # Use first var name
                lines[i] = re.sub(r'(except\s+\w+):', rf'\1 as {var_name}:', line)
                fixes += 1
                break
    
    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    
    return fixes


def fix_unused_imports(filepath: Path, imports_list: List[Tuple[int, str]]) -> int:
    """Remove unused imports."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixes = 0
    new_lines = []
    
    # Group by line number
    by_line = {}
    for line_num, import_name in imports_list:
        if line_num not in by_line:
            by_line[line_num] = []
        by_line[line_num].append(import_name)
    
    for i, line in enumerate(lines, start=1):
        if i in by_line:
            # Remove imports from this line
            modified_line = line
            for import_name in by_line[i]:
                # Remove the import
                if f", {import_name}" in modified_line:
                    modified_line = modified_line.replace(f", {import_name}", "")
                    fixes += 1
                elif f"{import_name}," in modified_line:
                    modified_line = modified_line.replace(f"{import_name},", "")
                    fixes += 1
                elif f"import {import_name}" in modified_line and "," not in modified_line:
                    # Entire line is just this import - skip it
                    modified_line = ""
                    fixes += 1
            
            if modified_line:
                new_lines.append(modified_line)
        else:
            new_lines.append(line)
    
    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    
    return fixes


def fix_unused_locals(filepath: Path, locals_list: List[Tuple[int, str]]) -> int:
    """Fix unused local variables by prefixing with _."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixes = 0
    
    for line_num, var_name in locals_list:
        if line_num <= len(lines):
            line = lines[line_num - 1]
            # Replace var_name = with _var_name = or just comment it out
            if f"{var_name} =" in line:
                lines[line_num - 1] = line.replace(f"{var_name} =", f"_{var_name} =")
                fixes += 1
    
    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    
    return fixes


def main():
    """Fix all remaining flake8 issues."""
    print("🔧 Fixing Remaining Flake8 Issues")
    print("=" * 60)
    
    total_fixes = 0
    
    # Fix undefined variables
    print("\n📍 Fixing undefined variables...")
    for filepath_str, vars_list in UNDEFINED_VARS.items():
        filepath = Path(filepath_str)
        if filepath.exists():
            fixes = fix_undefined_vars(filepath, vars_list)
            if fixes > 0:
                total_fixes += fixes
                print(f"  ✓ {filepath}: {fixes} exception handlers fixed")
    
    # Fix unused imports
    print("\n📦 Removing unused imports...")
    for filepath_str, imports_list in UNUSED_IMPORTS.items():
        filepath = Path(filepath_str)
        if filepath.exists():
            fixes = fix_unused_imports(filepath, imports_list)
            if fixes > 0:
                total_fixes += fixes
                print(f"  ✓ {filepath}: {fixes} imports removed")
    
    # Fix unused locals
    print("\n🔤 Fixing unused local variables...")
    for filepath_str, locals_list in UNUSED_LOCALS.items():
        filepath = Path(filepath_str)
        if filepath.exists():
            fixes = fix_unused_locals(filepath, locals_list)
            if fixes > 0:
                total_fixes += fixes
                print(f"  ✓ {filepath}: {fixes} variables prefixed with _")
    
    print(f"\n{'=' * 60}")
    print(f"Total fixes: {total_fixes}")
    print(f"{'=' * 60}")
    print("\n⚠️  Note: C901 complexity warning for get_context_recommendations")
    print("   will need manual refactoring (coming next!)")


if __name__ == '__main__':
    main()
