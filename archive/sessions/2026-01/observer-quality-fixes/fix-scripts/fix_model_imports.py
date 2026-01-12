#!/usr/bin/env python3
"""
Quick script to add missing typing imports to all model files.
"""

import re
from pathlib import Path

MODELS_DIR = Path("app/models")

# Models that need typing imports added
MODELS_TO_FIX = [
    "user_trajectory.py",
    "chat_session.py", 
    "clinical_alert.py",
    "session_analytics.py",
    "model_assignment.py",
]

def fix_model_imports(filepath):
    """Add typing imports if missing."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if already has typing imports
    if re.search(r'^from typing import', content, re.MULTILINE):
        print(f"✓ {filepath.name} already has typing imports")
        return False
    
    # Find the first import line after the docstring
    lines = content.split('\n')
    insert_index = None
    in_docstring = False
    docstring_closed = False
    
    for i, line in enumerate(lines):
        # Track docstrings
        if '"""' in line:
            if not in_docstring:
                in_docstring = True
            elif line.count('"""') == 2 or docstring_closed:
                in_docstring = False
                docstring_closed = True
            else:
                docstring_closed = True
        
        # Find first import after docstring
        if docstring_closed and line.startswith('from ') or line.startswith('import '):
            insert_index = i
            break
    
    if insert_index is None:
        print(f"✗ {filepath.name}: Could not find insertion point")
        return False
    
    # Insert typing imports
    lines.insert(insert_index, "from typing import Any, Dict, Optional")
    
    # Write back
    with open(filepath, 'w') as f:
        f.write('\n'.join(lines))
    
    print(f"✓ {filepath.name}: Added typing imports")
    return True

def main():
    print("Adding missing typing imports to models...")
    fixed_count = 0
    
    for model_file in MODELS_TO_FIX:
        filepath = MODELS_DIR / model_file
        if filepath.exists():
            if fix_model_imports(filepath):
                fixed_count += 1
        else:
            print(f"✗ {model_file}: File not found")
    
    print(f"\nFixed {fixed_count} model files")

if __name__ == "__main__":
    main()
