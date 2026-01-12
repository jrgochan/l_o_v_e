#!/usr/bin/env python3
"""Comprehensive mypy type fixes for Observer module."""

import re
from pathlib import Path
from typing import Dict, List, Tuple


def fix_implicit_optional(filepath: Path) -> int:
    """Fix implicit Optional parameters (PEP 484 compliance)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = 0

    # Pattern: param: Type = None should be param: Optional[Type] = None
    # Find all function signatures with Type = None
    patterns = [
        (r'(\w+):\s*str\s*=\s*None', r'\1: Optional[str] = None'),
        (r'(\w+):\s*int\s*=\s*None', r'\1: Optional[int] = None'),
        (r'(\w+):\s*float\s*=\s*None', r'\1: Optional[float] = None'),
        (r'(\w+):\s*bool\s*=\s*None', r'\1: Optional[bool] = None'),
        (r'(\w+):\s*dict\s*=\s*None', r'\1: Optional[dict] = None'),
        (r'(\w+):\s*Dict\s*=\s*None', r'\1: Optional[Dict] = None'),
        (r'(\w+):\s*EmbeddingProvider\s*=\s*None', r'\1: Optional[EmbeddingProvider] = None'),
        (r'(\w+):\s*AsyncSession\s*=\s*None', r'\1: Optional[AsyncSession] = None'),
    ]

    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            fixes += 1
            content = new_content

    # Ensure Optional is imported
    if fixes > 0 and 'from typing import' in content:
        if 'Optional' not in content:
            content = re.sub(
                r'from typing import ([^\n]+)',
                r'from typing import Optional, \1',
                content
            )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return fixes

    return 0


def fix_generic_type_parameters(filepath: Path) -> int:
    """Fix missing generic type parameters."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = 0

    # Pattern: -> Dict should be -> Dict[str, Any]
    replacements = [
        (r'-> Dict\b(?!\[)', r'-> Dict[str, Any]'),
        (r'-> dict\b(?!\[)', r'-> dict[str, Any]'),
        (r'-> List\b(?!\[)', r'-> List[Any]'),
        (r'-> list\b(?!\[)', r'-> list[Any]'),
        (r': Dict\b(?!\[)', r': Dict[str, Any]'),
        (r': dict\b(?!\[)', r': dict[str, Any]'),
        (r': List\b(?!\[)', r': List[Any]'),
    ]

    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            fixes += 1
            content = new_content

    # Ensure Any is imported
    if fixes > 0 and 'from typing import' in content:
        if ', Any' not in content and 'Any,' not in content:
            content = re.sub(
                r'from typing import ([^\n]+)',
                r'from typing import \1, Any',
                content
            )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return fixes

    return 0


def add_type_ignore_to_base_classes(filepath: Path) -> int:
    """Add type: ignore to all SQLAlchemy Base subclasses."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixes = 0

    for i, line in enumerate(lines):
        # Find class definitions that inherit from Base
        if re.match(r'^class \w+\(Base\):', line) and '# type: ignore' not in line:
            # Add type ignore comment
            lines[i] = line.rstrip() + '  # type: ignore[misc]\n'
            fixes += 1

    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)

    return fixes


def add_missing_return_types(filepath: Path) -> int:
    """Add -> None to functions missing return type annotations."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = 0

    # Pattern: def funcname(params): without -> should have -> None if no return
    # This is complex - we'll handle specific known patterns

    # __repr__ methods
    content = re.sub(
        r'(\s+def __repr__\(self\):)',
        r'\1 -> str:',
        content
    )

    # __init__ methods without return type
    content = re.sub(
        r'(\s+def __init__\([^)]+\)):(\s*\n\s*""")',
        r'\1 -> None:\2',
        content
    )

    # to_dict methods
    content = re.sub(
        r'(\s+def to_dict\(self[^)]*\)):',
        r'\1 -> Dict[str, Any]:',
        content
    )

    if content != original:
        fixes = 1
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    return fixes


def fix_config_return_type(filepath: Path) -> int:
    """Fix config.py ALLOWED_ORIGINS_LIST return type."""
    if 'config.py' not in str(filepath):
        return 0

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix the ALLOWED_ORIGINS_LIST property
    content = re.sub(
        r'def ALLOWED_ORIGINS_LIST\(self\) -> list\[str\]:',
        r'def ALLOWED_ORIGINS_LIST(self) -> List[str]:',
        content
    )

    # Ensure List is imported
    if 'from typing import' in content and 'List' not in content:
        content = re.sub(
            r'from typing import',
            r'from typing import List,',
            content,
            count=1
        )

    # Add cast to the return statement
    content = re.sub(
        r'return self\.ALLOWED_ORIGINS\.split\(","\)',
        r'return list(self.ALLOWED_ORIGINS.split(","))',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1

    return 0


def main():
    """Fix all mypy type issues."""
    print("🔧 Fixing Mypy Type Issues")
    print("=" * 60)

    app_dir = Path('app')
    total_fixes = 0

    # Fix implicit Optional
    print("\n📍 Fixing implicit Optional parameters...")
    for py_file in app_dir.rglob('*.py'):
        fixes = fix_implicit_optional(py_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ {py_file}: {fixes} Optional fixes")

    # Fix generic type parameters
    print("\n📦 Adding generic type parameters...")
    for py_file in app_dir.rglob('*.py'):
        fixes = fix_generic_type_parameters(py_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ {py_file}: {fixes} generic type fixes")

    # Fix Base class issues
    print("\n🏗️  Adding type ignores to Base subclasses...")
    for py_file in (app_dir / 'models').rglob('*.py'):
        fixes = add_type_ignore_to_base_classes(py_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ {py_file}: {fixes} Base class fixes")

    # Fix missing return types
    print("\n🔤 Adding missing return types...")
    for py_file in app_dir.rglob('*.py'):
        fixes = add_missing_return_types(py_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ {py_file}: return type annotations added")

    # Fix config.py specifically
    print("\n⚙️  Fixing config.py...")
    config_file = app_dir / 'config.py'
    if config_file.exists():
        fixes = fix_config_return_type(config_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ config.py: Fixed ALLOWED_ORIGINS_LIST")

    print(f"\n{'=' * 60}")
    print(f"Total fixes: {total_fixes}")
    print(f"{'=' * 60}")
    print("\n⚠️  Note: Some mypy errors will need manual fixing:")
    print("  - SQLAlchemy Column assignment types")
    print("  - Complex generic parameters")
    print("  - Return type inference issues")
    print("\n✨ Run quality check to see remaining issues!")


if __name__ == '__main__':
    main()
