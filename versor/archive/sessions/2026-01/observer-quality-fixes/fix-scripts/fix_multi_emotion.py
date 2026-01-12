#!/usr/bin/env python3
"""Quick fix for multi_emotion_analysis.py errors"""

from pathlib import Path

file_path = Path("app/models/multi_emotion_analysis.py")
content = file_path.read_text()

# Remove unused type: ignore comments
lines_to_fix = [518, 524, 726, 728, 824]
print("Removing unused type:ignore comments...")
for line_num in sorted(lines_to_fix, reverse=True):
    lines = content.split('\n')
    if line_num - 1 < len(lines):
        lines[line_num - 1] = lines[line_num - 1].replace('  # type: ignore[misc]', '')
        lines[line_num - 1] = lines[line_num - 1].replace('  # type: ignore[assignment]', '')
    content = '\n'.join(lines)

file_path.write_text(content)
print("✅ Removed 5 unused type:ignore comments")

# Now add casts for the return statements
print("\nAdding type casts to return statements...")

# The returns are from .get() calls which return Any
# We need to add cast() wrappers
replacements = [
    # Line 535, 537 - DetectedEmotion returns
    ('return self.emotions[0]', 'return cast(DetectedEmotion, self.emotions[0])'),
    ('return next((e for e in self.emotions if e.prominence', 'return cast(Optional[DetectedEmotion], next((e for e in self.emotions if e.prominence'),
    
    # Bool returns - wrap in bool()
    ('return self.emotions and len(self.emotions) >= 2', 'return bool(self.emotions and len(self.emotions) >= 2)'),
    ('return self.emotions and len(self.emotions) >= 3', 'return bool(self.emotions and len(self.emotions) >= 3)'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"✅ Fixed: {old[:50]}...")

file_path.write_text(content)
print("\n✅ All fixes applied to multi_emotion_analysis.py!")
