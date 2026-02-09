import re
import os

def fix_broken_docstrings(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    new_lines = []
    pending_docstring = None
    
    # Regex to detect the misplaced docstring
    # It looks like: whitespace + """Docstring."""
    docstring_pattern = re.compile(r"^(\s+)\"\"\"Docstring\.\"\"\"\s*$")
    
    # Regex to detect end of function definition
    # It usually ends with ): or ) -> ...:
    # We'll look for lines ending with : that are not empty or comments
    # And specifically resemble end of def
    def_end_pattern = re.compile(r".*:\s*$")

    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this is the misplaced docstring
        match = docstring_pattern.match(line)
        if match:
            # Check context: assumes misplaced if inside parens? 
            # Or just brute force for this specific file structure we know is broken.
            # The previous script blindly inserted it.
            # If we are "inside" a def (which we can't easily track without state), 
            # but we know the file integrity is slightly compromised.
            
            # Heuristic: If we capture a docstring, we hold it.
            # We assume it belongs to the function being defined.
            # We look forward for the end of the definition.
            indent = match.group(1)
            pending_docstring = line
            # Skip adding this line to new_lines yet
        else:
            new_lines.append(line)
            
            # If we have a pending docstring, checks if this line ends the definition
            if pending_docstring:
                if def_end_pattern.match(line):
                    # This line ends the definition.
                    # Insert the docstring after this line.
                    new_lines.append(pending_docstring)
                    pending_docstring = None
                    
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print(f"Fixed {file_path}")

if __name__ == "__main__":
    file_path = "observer/app/services/chat/service.py"
    if os.path.exists(file_path):
        fix_broken_docstrings(file_path)
    else:
        print(f"File not found: {file_path}")
