#!/usr/bin/env python3
"""Fix all remaining function signatures - comprehensive approach"""

import re
from pathlib import Path

# Read each file and add annotations
files_to_fix = {
    "app/api/routes/history.py": {
        267: ("async def get_history", ") -> Dict[str, Any]:")
    },
    "app/api/routes/chat_websocket.py": {
        757: ("async def generate_insights", ") -> None:")
    },
    "app/api/routes/bootstrap.py": {
        275: ("async def get_path_templates", ") -> Dict[str, Any]:"),
        341: ("def _apply_context_filter(\n    modifier,", "def _apply_context_filter(\n    modifier: Any,"),
        367: ("def _fetch_context_modifiers(db_rows)", "def _fetch_context_modifiers(db_rows: Any)"),
        401: ("async def get_context_recommendations", ") -> Dict[str, Any]:"),
        472: ("async def get_challenge_patterns", ") -> Dict[str, Any]:")
    },
    "app/websocket/routes.py": {
        192: ("async def websocket_endpoint", ") -> None:")
    },
    "app/api/routes/state.py": {
        263: ("async def record_state", ") -> Dict[str, Any]:")
    },
    "app/api/routes/atlas.py": {
        288: ("async def get_all_emotions", ") -> Dict[str, Any]:"),
        411: ("async def search_emotions", ") -> Dict[str, Any]:"),
        458: ("async def compute_all_paths_batch", ") -> Dict[str, Any]:"),
        520: ("async def get_all_cached_paths", ") -> Dict[str, Any]:"),
        604: ("async def get_smart_recommendations", ") -> Dict[str, Any]:")
    }
}

for filepath, fixes in files_to_fix.items():
    path = Path(filepath)
    if not path.exists():
        print(f"⚠️  File not found: {filepath}")
        continue
        
    content = path.read_text()
    lines = content.split('\n')
    
    for line_num, (search_pattern, replacement) in fixes.items():
        if line_num - 1 < len(lines):
            line = lines[line_num - 1]
            
            # For return type additions
            if replacement.startswith(")"):
                if "):" in line and replacement not in line:
                    lines[line_num - 1] = line.replace("):", replacement)
                    print(f"✅ Fixed {filepath}:{line_num} - added return type")
                elif line.strip().endswith(")") and replacement not in line:
                    lines[line_num - 1] = line.rstrip() + replacement
                    # Check if next line is just ":"
                    if line_num < len(lines) and lines[line_num].strip() == ":":
                        lines[line_num] = ""
                    print(f"✅ Fixed {filepath}:{line_num} - added return type to multi-line")
            # For parameter type additions  
            elif "def " in replacement:
                lines[line_num - 1] = replacement
                print(f"✅ Fixed {filepath}:{line_num} - added parameter types")
    
    path.write_text('\n'.join(lines))

print("\n🎉 All signatures fixed!")
