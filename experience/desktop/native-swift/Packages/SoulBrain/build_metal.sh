#!/bin/bash
set -e

# Create output dir
mkdir -p Sources/SoulBrain/Resources

echo "Compiling Metal sources..."

# Find all metal files
find Sources/SoulBrain/Metal -name "*.metal" | while read file; do
    filename=$(basename "$file")
    name="${filename%.*}"
    echo "Compiling $filename..."
    xcrun -sdk macosx metal -c "$file" -o "${name}.air" -I Sources/SoulBrain/Metal
done

echo "Linking metallib..."
xcrun -sdk macosx metallib *.air -o Sources/SoulBrain/Resources/default.metallib

echo "Cleaning up..."
rm *.air

echo "Done! Created Sources/SoulBrain/Resources/default.metallib"
