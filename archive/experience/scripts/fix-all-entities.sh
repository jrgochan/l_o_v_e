#!/bin/bash
# Comprehensive fix for all unescaped entities in non-test files

cd "$(dirname "$0")"

echo "🔧 Fixing unescaped entities..."

# Fix all remaining apostrophes and quotes in JSX content across identified files
FILES=(
  "components/JourneyProgress.tsx"
  "components/admin/modals/HelpModal/index.tsx"
  "components/admin/panels/InfoPanel/PathComparison.tsx"
  "components/admin/panels/StatisticsPanel.tsx"
  "components/admin/settings/BehaviorSettings.tsx"
  "components/admin/settings/ChatSettings.tsx"
  "components/admin/settings/VisualSettings.tsx"
  "components/admin/shared/RelationshipIndicator.tsx"
  "components/admin/shared/VoiceRecorder.tsx"
  "components/admin/shared/WaypointDetailModal.tsx"
  "components/admin/state-display/EmotionHistoryCard.tsx"
  "components/admin/visualizations/PathMatrix/MatrixTooltip.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Use perl for more sophisticated text replacement within JSX tags
    perl -pi -e '
      # Only replace quotes and apostrophes in JSX text content (between > and <)
      s/>\K([^<]*?)\s*'\''([^<]*?)</>&apos;$2</g;
      s/>\K([^<]*?)'\''([^<]*?)</]$1&apos;$2</g;
      s/>\K([^<]*?)"([^<]*?)</>$1&quot;$2</g;
    ' "$file"
    echo "✅ Fixed $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "✨ Done! Run 'npm run lint' to verify."
