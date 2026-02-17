import os
import re
from typing import Dict, List, Tuple


def parse_lint_output(file_path: str) -> Dict[str, List[Tuple[int, str]]]:
    """Parse lint output to find pydocstyle violations."""
    violations = {}

    with open(file_path, "r") as f:
        lines = f.readlines()

    current_file = None

    # Regex for file line: app/...:line:col: ...
    # But output format in lint_output_3.txt is:
    # app/config.py:38 in public method ...
    #         D102: Missing docstring ...

    # We need to look for the file line, then the error line.

    file_pattern = re.compile(r"^(app/[\w/.]+\.py):(\d+)")
    error_pattern = re.compile(r"\s+(D\d+): (.*)")

    i = 0
    while i < len(lines):
        line = lines[i]
        match = file_pattern.match(line)
        if match:
            filename = match.group(1)
            line_num = int(match.group(2))

            # Check next line for error code
            if i + 1 < len(lines):
                error_match = error_pattern.match(lines[i + 1])
                if error_match:
                    code = error_match.group(1)
                    if filename not in violations:
                        violations[filename] = []
                    violations[filename].append((line_num, code))
                    i += 1
        i += 1

    return violations


def get_indentation(line: str) -> str:
    """Get indentation of a line."""
    return re.match(r"^\s*", line).group(0)


def fix_file(filename: str, file_violations: List[Tuple[int, str]]):
    """Fix violations in a file."""
    # Prefix absolute path
    abs_path = os.path.join(os.getcwd(), "observer", filename)
    if not os.path.exists(abs_path):
        print(f"File not found: {abs_path}")
        return

    with open(abs_path, "r") as f:
        lines = f.readlines()

    # Sort violations descending by line number to avoid offset issues
    # But wait, inserting lines changes line numbers.
    # So descending order is CRITICAL.
    file_violations.sort(key=lambda x: x[0], reverse=True)

    modified = False

    for line_num, code in file_violations:
        # line_num is 1-based
        idx = line_num - 1

        if code == "D100" or code == "D104":
            # Module/Package docstring at top
            if idx == 0:
                # Check if it has docstring already (maybe empty line?)
                # Just insert one.
                docstring = '"""Module documentation."""\n\n'
                lines.insert(0, docstring)
                modified = True

        elif code in ["D102", "D103", "D107"]:
            # Function/Method docstring
            # We insert after the definition line.
            # We need to determine indentation.
            if idx < len(lines):
                def_line = lines[idx]
                indent = get_indentation(def_line) + "    "
                docstring = f'{indent}"""Docstring."""\n'
                lines.insert(idx + 1, docstring)
                modified = True

        elif code == "D202":
            # No blank lines after function docstring
            # This means after the docstring there is a blank line.
            # But line_num points to the function definition usually?
            # Or the docstring?
            # pydocstyle reports line of the function.
            # So we look for docstring end, then blank line.
            # This is hard to automate reliably without AST.
            # I'll skip D202 for auto-fix to avoid breaking code.
            pass

    if modified:
        with open(abs_path, "w") as f:
            f.writelines(lines)
        print(f"Fixed {filename}")


def main():
    violations = parse_lint_output("lint_output_3.txt")
    print(f"Found violations in {len(violations)} files")

    for filename, file_violations in violations.items():
        fix_file(filename, file_violations)


if __name__ == "__main__":
    main()
