#!/usr/bin/env node

/**
 * Script to fix unescaped entities in JSX/TSX files
 * Replaces quotes and apostrophes with HTML entities
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Files with unescaped entities based on lint output
const filesToFix = [
  'components/admin/modals/HelpModal/index.tsx',
  'components/admin/panels/InfoPanel/PathComparison.tsx',
  'components/admin/panels/StatisticsPanel.tsx',
  'components/admin/settings/BehaviorSettings.tsx',
  'components/admin/settings/ChatSettings.tsx',
  'components/admin/settings/VisualSettings.tsx',
  'components/admin/shared/RelationshipIndicator.tsx',
  'components/admin/state-display/EmotionHistoryCard.tsx',
  'components/admin/visualizations/PathMatrix/MatrixLegend.tsx',
  'components/admin/visualizations/PathMatrix/MatrixTooltip.tsx',
  'components/admin/shared/VoiceRecorder.tsx',
  'components/admin/shared/WaypointDetailModal.tsx'
];

function fixEntitiesInFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Fix unescaped quotes and apostrophes in JSX content
  // This regex looks for text between > and < (JSX text content)
  content = content.replace(/>([^<]*)</g, (match, text) => {
    // Replace quotes with &quot; (but not in attributes)
    let fixed = text.replace(/"/g, '&quot;');
    // Replace apostrophes with &apos;
    fixed = fixed.replace(/'/g, '&apos;');
    return `>${fixed}<`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

console.log('🔧 Fixing unescaped entities in JSX/TSX files...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  if (fixEntitiesInFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} file(s)`);
