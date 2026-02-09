import sys


def dedupe_file(filepath):
    with open(filepath, "r") as f:
        lines = f.readlines()

    new_lines = []
    seen_assignments = set()
    last_indent = -1

    # We only want to dedupe consecutive assignments within the same block
    # Actually, simpler logic:
    # If line matches "mock_db.add = MagicMock" and the previous NON-EMPTY line matched it too, skip.

    prev_line_stripped = ""

    for line in lines:
        stripped = line.strip()

        # Check for target patterns
        is_target = (
            "mock_db.add = MagicMock" in stripped
            or "mock_db.delete = MagicMock" in stripped
        )

        if is_target:
            if stripped == prev_line_stripped:
                # Duplicate! Skip using this line.
                continue
            prev_line_stripped = stripped
        else:
            if stripped:
                prev_line_stripped = stripped
            # Reset if we hit other code (optional, but safer to just tracking consecutive dupes)
            # Actually, "mock_db.add = ..." followed by "mock_db.add = ..." is definitely duplicate.
            # But "add = ...", "delete = ...", "add = ..." is also bad.
            # So I should track a set of assignments within a "block".
            # How to define a block? Indentation level.

    # The previous logic is too weak for "add, delete, add, delete".
    # Better logic:
    # Iterate lines. Identify indentation.
    # If we are in a function (def ...):
    #   Keep track of seen assignments for `mock_db` at this indentation level.
    #   If we see one again, generic assignment, skip?
    #   No, maybe there is logic.
    #   But here the duplicates are adjacent or close.

    # Let's simple check:
    # Read strict duplicates blocks?

    # "mock_db.add = MagicMock()"
    # "mock_db.delete = MagicMock()"
    # "mock_db.add = MagicMock()"   <-- Duplicate Set 1
    # "mock_db.delete = MagicMock()"

    clean_lines = []

    # Sliding window or buffer?
    # Let's just process the file content string.

    content = "".join(lines)

    # Remove specific duplicate block patterns
    # Pattern: (indent)mock_db.add = MagicMock()\n(indent)mock_db.delete = MagicMock()\n(indent)mock_db.add = MagicMock()\n(indent)mock_db.delete = MagicMock()

    # Regex replacement for 2 or more repetitions of the pair
    # pair = r"(\s+)mock_db.add = MagicMock\(\)\n\1mock_db.delete = MagicMock\(\)\n"

    # Let's try to remove exact duplicate lines first.

    final_lines = []
    for line in lines:
        s = line.strip()
        if s == "mock_db.add = MagicMock()" or s == "mock_db.delete = MagicMock()":
            # Check if this exact line exists in the last 4 lines?
            # To catch "add, delete, add, delete"
            is_dupe = False
            for prev in reversed(final_lines[-4:]):
                if prev.strip() == s:
                    is_dupe = True
                    break
            if is_dupe:
                continue
        final_lines.append(line)

    with open(filepath, "w") as f:
        f.writelines(final_lines)
    print(f"Deduped {filepath}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        dedupe_file(sys.argv[1])
