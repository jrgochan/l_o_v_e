#!/usr/bin/env python3
"""Fix missing type imports for mypy."""

import re
from pathlib import Path


def ensure_typing_imports(filepath: Path) -> int:
    """Ensure all needed typing imports are present."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Check what's being used but might not be imported
    needs_any = 'Any' in content and 'from typing import' in content
    needs_dict = ('Dict[' in content or ': Dict' in content or '-> Dict' in content) and 'from typing import' in content
    needs_list = ('List[' in content or ': List' in content or '-> List' in content) and 'from typing import' in content
    needs_optional = 'Optional[' in content and 'from typing import' in content

    # Find existing typing import line
    typing_import_match = re.search(r'^from typing import ([^\n]+)', content, re.MULTILINE)

    if typing_import_match:
        existing_imports = typing_import_match.group(1)
        new_imports = []

        if needs_any and 'Any' not in existing_imports:
            new_imports.append('Any')
        if needs_dict and 'Dict' not in existing_imports:
            new_imports.append('Dict')
        if needs_list and 'List' not in existing_imports:
            new_imports.append('List')
        if needs_optional and 'Optional' not in existing_imports:
            new_imports.append('Optional')

        if new_imports:
            # Add the new imports
            updated_imports = existing_imports.rstrip() + ', ' + ', '.join(new_imports)
            content = content.replace(
                f'from typing import {existing_imports}',
                f'from typing import {updated_imports}'
            )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1

    return 0


def add_route_return_types(filepath: Path) -> int:
    """Add return types to FastAPI route functions."""
    if 'routes' not in str(filepath):
        return 0

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Pattern: @router.get/post/etc followed by async def func(...):
    # Most routes return Dict[str, Any] unless otherwise specified
    pattern = r'(@router\.(get|post|put|delete|patch)\([^)]+\)\s*\nasync def \w+\([^)]+\)):\s*\n(\s*""")'
    
    def add_return_type(match):
        decorator_and_sig = match.group(1)
        docstring_start = match.group(3)
        return f"{decorator_and_sig}:\n{docstring_start}"

    # This is too complex for regex - skip for now
    # We'll handle it manually

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1

    return 0


def main():
    """Fix missing typing imports."""
    print("🔧 Fixing Missing Type Imports")
    print("=" * 60)

    app_dir = Path('app')
    total_fixes = 0

    print("\n📦 Ensuring typing imports are complete...")
    for py_file in app_dir.rglob('*.py'):
        fixes = ensure_typing_imports(py_file)
        if fixes > 0:
            total_fixes += fixes
            print(f"  ✓ {py_file}: Updated typing imports")

    print(f"\n{'=' * 60}")
    print(f"Total files fixed: {total_fixes}")
    print(f"{'=' * 60}")
    print("\n✨ Typing imports should now be complete!")


if __name__ == '__main__':
    main()
