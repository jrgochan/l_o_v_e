#!/usr/bin/env python3
"""
Comprehensive MyPy error fixer - targets all remaining 111 errors.
"""

import re
from pathlib import Path
from typing import List, Tuple


def fix_no_any_return(file_path: Path, line_num: int) -> bool:
    """Fix no-any-return by adding cast."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    if line_num > len(lines):
        return False
    
    line = lines[line_num - 1]
    if 'return ' in line and 'cast(' not in line:
        # Add cast import if not present
        has_cast = any('from typing import' in l and 'cast' in l for l in lines[:50])
        if not has_cast:
            # Find typing import and add cast
            for i, l in enumerate(lines[:50]):
                if 'from typing import' in l and not l.strip().endswith('\\'):
                    lines[i] = l.rstrip() + ', cast\n'
                    break
        
        # Add cast to return statement
        indent = len(line) - len(line.lstrip())
        return_val = line.strip()[7:]  # Remove 'return '
        
        # Detect return type from function signature
        func_line = line_num - 1
        while func_line >= 0 and 'def ' not in lines[func_line]:
            func_line -= 1
        
        if func_line >= 0:
            func_sig = lines[func_line]
            if '-> float' in func_sig:
                lines[line_num - 1] = ' ' * indent + f'return cast(float, {return_val})\n'
            elif '-> int' in func_sig:
                lines[line_num - 1] = ' ' * indent + f'return cast(int, {return_val})\n'
            elif '-> list[float]' in func_sig or '-> List[float]' in func_sig:
                lines[line_num - 1] = ' ' * indent + f'return cast(List[float], {return_val})\n'
            
            with open(file_path, 'w') as f:
                f.writelines(lines)
            return True
    
    return False


def fix_collection_index(file_path: Path) -> int:
    """Fix Collection[str] indexing by casting to List."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    original = content
    fixes = 0
    
    # Pattern: variable that's Collection[str] being indexed
    # Fix: cast to list first
    # Look for patterns like: emotions_list[0]
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        if '[0]' in line or '[1]' in line:
            # Check if previous lines define this as Collection
            var_name = line.split('[')[0].strip().split()[-1] if '[' in line else ''
            if var_name:
                # Replace indexing with list() cast
                lines[i] = line.replace(f'{var_name}[', f'list({var_name})[')
                fixes += 1
    
    if fixes > 0:
        with open(file_path, 'w') as f:
            f.write('\n'.join(lines))
    
    return fixes


def fix_var_annotated(file_path: Path, line_num: int, hint: str) -> bool:
    """Add type annotation to variable."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    if line_num > len(lines):
        return False
    
    line = lines[line_num - 1]
    
    # Extract variable name and add annotation
    if '=' in line:
        parts = line.split('=', 1)
        var_part = parts[0].strip()
        val_part = parts[1].strip()
        
        # Infer type from value
        if val_part.startswith('{'):
            type_hint = ': Dict[str, Any]'
        elif val_part.startswith('['):
            type_hint = ': List[Any]'
        elif val_part.startswith('set('):
            type_hint = ': Set[Any]'
        else:
            return False
        
        indent = len(line) - len(line.lstrip())
        lines[line_num - 1] = ' ' * indent + var_part + type_hint + ' = ' + val_part + '\n'
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True
    
    return False


def fix_sequence_to_list(file_path: Path, line_num: int) -> bool:
    """Fix Sequence[str] to List[str] argument type."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    if line_num > len(lines):
        return False
    
    line = lines[line_num - 1]
    
    # Look for the function signature that needs fixing
    # Typically journey["emotions"] which is Sequence[str]
    if 'journey[' in line and 'emotions' in line:
        # Wrap with list()
        lines[line_num - 1] = line.replace('journey["emotions"]', 'list(journey["emotions"])')
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True
    
    return False


def main():
    """Apply targeted fixes based on error analysis."""
    
    print("🚀 Starting comprehensive MyPy error fixes...\n")
    
    fixes_applied = 0
    
    # Fix 1: Collection[str] indexing in clinical_alert_service.py
    print("Fixing Collection[str] indexing in clinical_alert_service.py...")
    fixes = fix_collection_index(Path("app/services/clinical_alert_service.py"))
    if fixes > 0:
        print(f"  ✅ Fixed {fixes} indexing errors")
        fixes_applied += fixes
    
    # Fix 2: Sequence[str] to List[str] in recommendation_engine.py
    print("Fixing Sequence[str] argument in recommendation_engine.py...")
    if fix_sequence_to_list(Path("app/services/recommendation_engine.py"), 742):
        print("  ✅ Fixed Sequence[str] argument")
        fixes_applied += 1
    
    # Fix 3: Variable annotations in path_planner.py
    print("Fixing variable annotations in path_planner.py...")
    for line_num in [245, 256, 828]:
        if fix_var_annotated(Path("app/services/path_planner.py"), line_num, ""):
            print(f"  ✅ Fixed variable annotation at line {line_num}")
            fixes_applied += 1
    
    print(f"\n🎉 Applied {fixes_applied} automated fixes!")
    print("\n📝 Remaining fixes require manual attention:")
    print("  - Function return types (no-untyped-def)")
    print("  - Attribute errors (attr-defined)")
    print("  - Complex type mismatches")
    print("\nRe-run mypy to see progress!")
    
    return 0


if __name__ == "__main__":
    exit(main())
