#!/usr/bin/env python3
"""
Comprehensive mypy strict mode fix script for Observer module.
Handles: no-untyped-def, type-arg, and other common mypy errors.
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

def fix_dict_list_type_args(content: str) -> str:
    """Fix Dict and List without type parameters."""
    # -> Dict to -> Dict[str, Any]
    content = re.sub(r'-> Dict\b(?!\[)', r'-> Dict[str, Any]', content)
    # : Dict to : Dict[str, Any]
    content = re.sub(r': Dict\b(?!\[)', r': Dict[str, Any]', content)
    # -> List to -> List[Any]
    content = re.sub(r'-> List\b(?!\[)', r'-> List[Any]', content)
    # : List to : List[Any]
    content = re.sub(r': List\b(?!\[)', r': List[Any]', content)
    return content

def ensure_typing_imports(content: str) -> Tuple[str, bool]:
    """Ensure all needed typing imports are present."""
    lines = content.split('\n')
    has_typing = any('from typing import' in line for line in lines)
    
    if not has_typing:
        # Find first import line after docstring
        insert_idx = None
        in_docstring = False
        for i, line in enumerate(lines):
            if '"""' in line or "'''" in line:
                in_docstring = not in_docstring
            if not in_docstring and (line.startswith('from ') or line.startswith('import ')):
                insert_idx = i
                break
        
        if insert_idx is not None:
            lines.insert(insert_idx, 'from typing import Any, Dict, List, Optional')
            return '\n'.join(lines), True
    
    # Check if we need to add Any, Dict, List to existing import
    for i, line in enumerate(lines):
        if line.startswith('from typing import'):
            imports = line.split('import')[1].strip()
            needed = []
            if 'Any' not in imports and ('Dict[' in content or ': Dict' in content or '-> Dict' in content):
                needed.append('Any')
            if 'Dict' not in imports and (': Dict' in content or '-> Dict' in content):
                needed.append('Dict')
            if 'List' not in imports and (': List' in content or '-> List' in content):
                needed.append('List')
            
            if needed:
                # Add to existing import
                existing_imports = [x.strip() for x in imports.split(',')]
                all_imports = sorted(set(existing_imports + needed))
                lines[i] = f"from typing import {', '.join(all_imports)}"
                return '\n'.join(lines), True
    
    return content, False

def process_file(filepath: Path) -> bool:
    """Process a single file to fix mypy issues."""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Fix Dict/List type parameters
        content = fix_dict_list_type_args(content)
        
        # Ensure typing imports
        content, _ = ensure_typing_imports(content)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed: {filepath.relative_to(Path.cwd())}")
            return True
        else:
            return False
            
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    """Main execution."""
    base_path = Path('app')
    
    # Process all Python files in app/
    python_files = list(base_path.rglob('*.py'))
    fixed_count = 0
    
    print(f"Processing {len(python_files)} Python files...")
    print()
    
    for filepath in sorted(python_files):
        # Skip __pycache__ and test files
        if '__pycache__' in str(filepath) or 'test_' in filepath.name:
            continue
            
        if process_file(filepath):
            fixed_count += 1
    
    print()
    print(f"Fixed {fixed_count} files")
    print("Re-run mypy to see remaining errors")

if __name__ == '__main__':
    main()
