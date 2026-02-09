#!/usr/bin/env python3
"""
Comprehensive quality fix script for Observer module.

Fixes:
- W293: Blank lines containing whitespace
- W291: Trailing whitespace
- F401: Unused imports
- F841: Unused local variables
- F541: f-strings without placeholders
"""

import ast
import re
import sys
from pathlib import Path
from typing import Set, Tuple


class UnusedImportRemover(ast.NodeVisitor):
    """Find unused imports in Python files."""

    def __init__(self):
        self.imports = {}  # name -> node
        self.used_names = set()

    def visit_Import(self, node):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = node
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = node
        self.generic_visit(node)

    def visit_Name(self, node):
        self.used_names.add(node.id)
        self.generic_visit(node)

    def visit_Attribute(self, node):
        # Handle module.attribute usage
        if isinstance(node.value, ast.Name):
            self.used_names.add(node.value.id)
        self.generic_visit(node)


def fix_whitespace_issues(filepath: Path) -> int:
    """Fix W293 and W291 whitespace issues.

    Returns:
        Number of lines fixed.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    fixed_count = 0
    new_lines = []

    for line in lines:
        # Remove all trailing whitespace, preserve newline
        cleaned = line.rstrip()
        if cleaned != line.rstrip("\n\r"):
            fixed_count += 1

        # Add back newline if original had one
        if line.endswith("\n"):
            new_lines.append(cleaned + "\n")
        else:
            new_lines.append(cleaned)

    if fixed_count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

    return fixed_count


def fix_f_strings_without_placeholders(filepath: Path) -> int:
    """Convert f-strings without {} to regular strings.

    Returns:
        Number of f-strings converted.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Pattern: f"..." or f'...' without any {}
    # Be careful not to match f-strings that have placeholders
    patterns = [
        (r'f"([^"{}]*)"', r'"\1"'),  # f"text" -> "text"
        (r"f'([^'{}]*)'", r"'\1'"),  # f'text' -> 'text'
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    fixed_count = 0
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        # Count how many were fixed
        fixed_count = len(re.findall(r'f["\']', original)) - len(re.findall(r'f["\']', content))

    return fixed_count


def get_unused_imports(filepath: Path) -> Set[str]:
    """Find unused imports in a file.

    Returns:
        Set of unused import names.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(filepath))

        visitor = UnusedImportRemover()
        visitor.visit(tree)

        # Find imports that weren't used
        unused = set()
        for name in visitor.imports:
            if name not in visitor.used_names:
                # Special cases - these might be used in type annotations or docstrings
                if name not in ["TYPE_CHECKING", "Optional", "List", "Dict", "Any", "Tuple"]:
                    unused.add(name)

        return unused
    except SyntaxError:
        return set()


def remove_unused_imports(filepath: Path, unused: Set[str]) -> int:
    """Remove unused imports from file.

    Returns:
        Number of imports removed.
    """
    if not unused:
        return 0

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    removed_count = 0

    for line in lines:
        # Check if line imports any unused names
        skip_line = False
        for name in unused:
            # Patterns for different import styles
            patterns = [
                f"from .* import {name}\\b",
                f"from .* import .*, {name}\\b",
                f"from .* import {name},",
                f"import {name}\\b",
            ]
            if any(re.search(pattern, line) for pattern in patterns):
                skip_line = True
                removed_count += 1
                break

        if not skip_line:
            new_lines.append(line)

    if removed_count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

    return removed_count


def fix_unused_variables(filepath: Path) -> int:
    """Add _ prefix to unused variables or remove them.

    Returns:
        Number of variables fixed.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Common patterns for unused variables
    # except Exception as e: -> except Exception:
    content = re.sub(r"except\s+(\w+)\s+as\s+e:", r"except \1:", content)
    content = re.sub(r"except\s+(\w+)\s+as\s+\w+:", r"except \1:", content)

    # for i in range(...): when i is unused -> for _ in range(...):
    # This is risky, so we'll skip it

    fixed_count = 0
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        fixed_count = 1

    return fixed_count


def process_file(filepath: Path) -> Tuple[int, int, int, int]:
    """Process a single Python file.

    Returns:
        Tuple of (whitespace_fixed, fstrings_fixed, imports_removed, variables_fixed)
    """
    whitespace = fix_whitespace_issues(filepath)
    fstrings = fix_f_strings_without_placeholders(filepath)

    # For imports, we need to be more careful
    # unused = get_unused_imports(filepath)
    # imports = remove_unused_imports(filepath, unused)
    imports = 0  # Skip for now, too risky

    variables = fix_unused_variables(filepath)

    return whitespace, fstrings, imports, variables


def main():
    """Fix quality issues in observer module."""
    app_dir = Path("app")

    if not app_dir.exists():
        print("Error: app/ directory not found. Run from observer/ directory.")
        sys.exit(1)

    print("🔧 Fixing Observer Quality Issues")
    print("=" * 60)

    total_whitespace = 0
    total_fstrings = 0
    total_imports = 0
    total_variables = 0
    files_processed = 0

    for py_file in app_dir.rglob("*.py"):
        whitespace, fstrings, imports, variables = process_file(py_file)

        if any([whitespace, fstrings, imports, variables]):
            files_processed += 1
            total_whitespace += whitespace
            total_fstrings += fstrings
            total_imports += imports
            total_variables += variables

            fixes = []
            if whitespace:
                fixes.append(f"{whitespace} whitespace")
            if fstrings:
                fixes.append(f"{fstrings} f-strings")
            if imports:
                fixes.append(f"{imports} imports")
            if variables:
                fixes.append(f"{variables} variables")

            print(f"✓ {py_file}: {', '.join(fixes)}")

    print(f"\n{'=' * 60}")
    print("Summary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Whitespace issues fixed: {total_whitespace}")
    print(f"  F-strings converted: {total_fstrings}")
    print(f"  Unused imports removed: {total_imports}")
    print(f"  Variables fixed: {total_variables}")
    print(f"  Total fixes: {total_whitespace + total_fstrings + total_imports + total_variables}")
    print(f"{'=' * 60}")
    print("\n✨ Run quality check again to verify fixes!")


if __name__ == "__main__":
    main()
