#!/usr/bin/env python3
"""
Automatically fix missing function return type annotations for mypy strict mode.

Adds `-> None:` to async functions missing return type annotations.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def fix_function_signatures(file_path: Path) -> Tuple[int, List[str]]:
    """
    Fix missing return type annotations in a file.
    
    Returns:
        Tuple of (num_fixes, list of fixed function names)
    """
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    fixes = []
    
    # Pattern 1: async def function_name(...):  -> async def function_name(...) -> None:
    # Match async functions without return type annotation
    pattern1 = re.compile(
        r'(async def \w+\([^)]*\))(\s*):',
        re.MULTILINE
    )
    
    def replace_async(match):
        func_sig = match.group(1)
        whitespace = match.group(2)
        # Only add -> None if not already present
        if '->' not in func_sig:
            fixes.append(f"Added -> None to {func_sig}")
            return f"{func_sig} -> None:"
        return match.group(0)
    
    content = pattern1.sub(replace_async, content)
    
    # Pattern 2: def function_name(...):  -> def function_name(...) -> None:
    # Match regular functions without return type annotation
    pattern2 = re.compile(
        r'(\n    def \w+\([^)]*\))(\s*):',
        re.MULTILINE
    )
    
    def replace_sync(match):
        func_sig = match.group(1)
        whitespace = match.group(2)
        # Only add -> None if not already present
        if '->' not in func_sig:
            fixes.append(f"Added -> None to {func_sig}")
            return f"{func_sig} -> None:"
        return match.group(0)
    
    content = pattern2.sub(replace_sync, content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        return len(fixes), fixes
    
    return 0, []


def main():
    """Fix function signatures in specified files."""
    
    # Files with no-untyped-def errors (sorted by error count)
    files_to_fix = [
        "app/api/routes/chat_websocket.py",  # 17
        "app/api/routes/atlas.py",  # 10
        "app/api/routes/transitions.py",  # 9
        "app/websocket/connection_manager.py",  # 8
        "app/api/routes/bootstrap.py",  # 7
        "app/api/routes/ai_settings.py",  # 5
        "app/main.py",  # 3
        "app/websocket/routes.py",  # 2
        "app/services/path_matrix_service.py",  # 2
        "app/services/strategy_recommender.py",  # 1
        "app/services/path_planner.py",  # 1
        "app/services/atlas_mapper.py",  # 1
        "app/services/ai_model_service.py",  # 1
        "app/api/routes/state.py",  # 1
        "app/api/routes/history.py",  # 1
    ]
    
    total_fixes = 0
    files_modified = 0
    
    for file_rel in files_to_fix:
        file_path = Path(file_rel)
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue
        
        num_fixes, fix_list = fix_function_signatures(file_path)
        if num_fixes > 0:
            files_modified += 1
            total_fixes += num_fixes
            print(f"✅ {file_path}: {num_fixes} fixes")
            for fix in fix_list[:3]:  # Show first 3 fixes
                print(f"   - {fix}")
            if len(fix_list) > 3:
                print(f"   ... and {len(fix_list) - 3} more")
    
    print(f"\n🎉 Total: {total_fixes} fixes across {files_modified} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
