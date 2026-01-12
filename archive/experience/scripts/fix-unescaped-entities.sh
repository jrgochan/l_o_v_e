#!/bin/bash
# Fix unescaped entities in JSX files

files=(
  "components/JourneyProgress.tsx"
  "components/admin/modals/HelpModal/index.tsx"
  "components/admin/panels/InfoPanel/PathComparison.tsx"
  "components/admin/panels/StatisticsPanel.tsx"
  "components/admin/settings/BehaviorSettings.tsx"
  "components/admin/settings/ChatSettings.tsx"
  "components/admin/shared/RelationshipIndicator.tsx"
  "components/admin/state-display/EmotionHistoryCard.tsx"
  "components/admin/visualizations/PathMatrix/MatrixLegend.tsx"
  "components/admin/visualizations/PathMatrix/MatrixTooltip.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace unescaped quotes with HTML entities in JSX context
    # This is a simple sed replacement - only works for straightforward cases
    sed -i '' \
      -e 's/>\([^<]*\)"\([^<]*\)</>\1\&quot;\2</g' \
      -e "s/>\([^<]*\)'\([^<]*\)</>\1\&apos;\2</g" \
      "$file"
  fi
done

echo "Done! Run 'npm run lint' to verify."
