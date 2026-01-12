#!/bin/bash
# Batch fix script for remaining any types in admin components
# This script uses sed to replace common any type patterns

cd "$(dirname "$0")"

# Fix event handlers with (e: any)
echo "Fixing event handlers..."
find components/admin -type f -name "*.tsx" -exec sed -i '' 's/(e: any)/(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>)/g' {} \;

# Fix sort functions with (a: any, b: any)
echo "Fixing sort functions..."
find components/admin -type f -name "*.tsx" -exec sed -i '' 's/\.sort((a: any, b: any)/\.sort((a, b)/g' {} \;

# Fix map functions with proper types (AtlasEmotion)
echo "Fixing map/filter iterations..."
find components/admin -type f -name "*.tsx" -exec sed -i '' 's/\.map((item: any)/\.map((item)/g' {} \;
find components/admin -type f -name "*.tsx" -exec sed -i '' 's/\.filter((item: any)/\.filter((item)/g' {} \;

echo "Done! Re-run lint to check progress."
