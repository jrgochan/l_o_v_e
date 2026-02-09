# Settings Import/Export Guide

**Created**: December 7, 2025
**Feature**: Settings Import/Export & Presets
**Purpose**: Enable settings sharing and configuration management

---

## Overview

The L.O.V.E. platform provides robust import/export functionality for all user settings. This enables:

- **Configuration Backup**: Save your settings before experimenting
- **Team Sharing**: Share optimal configurations with colleagues
- **Multi-Device Sync**: Use same settings across devices
- **Quick Presets**: Load pre-configured profiles for specific use cases

---

## Table of Contents

1. [Exporting Settings](#exporting-settings)
2. [Importing Settings](#importing-settings)
3. [Using Presets](#using-presets)
4. [File Format Specification](#file-format-specification)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Exporting Settings

### How to Export

1. Navigate to **Settings Page** (`Cmd/Ctrl + ,` or click ⚙️ in header)
2. Click the **📥 Export** button in the top-right
3. A JSON file will download: `love-settings-YYYY-MM-DD.json`

### What Gets Exported

All 31 user-configurable settings across 7 categories:

**Visual Settings** (8 settings)

- Path animation mode
- Emotion display mode
- Motion indicators visibility
- Color scheme
- Path opacity
- Emotion size
- Animations enabled/disabled
- Data visualization mode

**Behavior Settings** (3 settings)

- Auto-compute paths
- Show all paths
- Focus mode

**Layer Visibility** (7 settings)

- Soul sphere
- Emotion points
- Emotion labels
- Transition paths
- Waypoints
- Bridge highlights
- Legend

**Network Configuration** (4 settings)

- Mode (local/network)
- Custom endpoints toggle
- Observer endpoint URL
- Listener endpoint URL
- Versor endpoint URL

**Chat Preferences** (3 settings)

- Default tone mode (warm/clinical)
- Deep feeling default
- Auto-focus emotions

**Keyboard Shortcuts** (2 settings)

- Shortcuts enabled/disabled
- Custom key bindings

**Accessibility** (3 settings)

- Reduced motion
- High contrast
- Font size

### Export File Example

```json
{
  "version": "1.0",
  "timestamp": "2025-12-07T09:17:00.000Z",
  "settings": {
    "visual": {
      "pathAnimationMode": "dynamic",
      "emotionDisplayMode": "simple",
      "showMotionIndicators": true,
      "colorScheme": "category",
      "pathOpacity": 0.8,
      "emotionSize": 1.2,
      "enableAnimations": true,
      "dataVisualizationMode": false
    },
    "behavior": {
      "autoComputePaths": true,
      "showAllPaths": true,
      "focusMode": false
    },
    "layers": {
      "soulSphere": true,
      "emotionPoints": true,
      "emotionLabels": true,
      "transitionPaths": true,
      "waypoints": true,
      "bridgeHighlight": true,
      "legend": true
    },
    "network": {
      "mode": "local",
      "customEndpoints": false,
      "endpoints": {
        "observer": "http://localhost:8000",
        "listener": "http://localhost:8002",
        "versor": "http://localhost:8001"
      }
    },
    "chat": {
      "defaultToneMode": "warm",
      "defaultDeepFeeling": false,
      "autoFocusEmotions": true
    },
    "keyboard": {
      "enableKeyboardShortcuts": true,
      "customKeyBindings": {}
    },
    "accessibility": {
      "reducedMotion": false,
      "highContrast": false,
      "fontSize": "medium"
    }
  }
}
```

---

## Importing Settings

### How to Import

1. Navigate to **Settings Page**
2. Click the **📤 Import** button
3. Select a `.json` settings file
4. System validates and applies settings
5. Success notification appears

### Import Validation

The system performs comprehensive validation:

### Structure Validation

- ✅ File must be valid JSON
- ✅ Must contain `version` and `settings` fields
- ✅ All 7 setting sections must be present

### Version Compatibility

- ✅ Current version: `1.0`
- ⚠️ Warning shown if version mismatch
- ✅ Graceful handling of future versions

### Data Type Validation

- ✅ `pathOpacity` must be number between 0 and 1
- ✅ `emotionSize` must be number between 0.5 and 2.0
- ✅ Enum values validated (e.g., pathAnimationMode)
- ✅ Boolean values checked
- ✅ URLs validated for network endpoints

### What Happens on Import

1. **File is read** and parsed as JSON
2. **Validation runs** - errors reject the import
3. **Settings applied** to localStorage
4. **Sync triggered** - Atlas UI updates immediately
5. **Notification shown** - success or error message

---

## Using Presets

### Available Presets

The platform includes 4 pre-configured presets:

#### ⚡ **Performance Mode**

**Purpose**: Maximum FPS and battery life
**Best For**: Low-power devices, extended sessions

**Characteristics:**

- Subtle animations only
- Reduced path complexity
- Minimal visual effects
- Focus mode enabled
- Lower opacity settings

**Use When:**

- Running on older hardware
- Battery conservation needed
- Performance issues experienced
- Minimal distraction desired

---

#### 🏥 **Clinical Mode**

**Purpose**: Professional therapeutic contexts
**Best For**: Therapists, clinical researchers

**Characteristics:**

- High contrast enabled
- Clinical tone default
- Deep feeling mode active
- Valence-based coloring
- Large font size
- All analysis features visible

**Use When:**

- Conducting therapy sessions
- Clinical research
- Professional documentation
- Need for clarity over aesthetics

---

#### ✨ **Demo Mode**

**Purpose**: Presentations and demonstrations
**Best For**: Public demos, marketing, training

**Characteristics:**

- Mystical animation mode
- Maximum visual impact
- All layers visible
- Enhanced emotion size
- High opacity paths
- Warm, welcoming tone

**Use When:**

- Presenting to stakeholders
- Training new users
- Marketing demonstrations
- Showcasing capabilities

---

#### ♿ **Accessibility Mode**

**Purpose**: Maximum accessibility
**Best For**: Users with visual or motor impairments

**Characteristics:**

- Reduced motion enabled
- High contrast enabled
- Large font size
- Subtle animations only
- No motion indicators
- Keyboard shortcuts enabled
- Focus mode active

**Use When:**

- Motion sensitivity
- Visual impairments
- Screen reader usage
- Keyboard-only navigation
- Need maximum clarity

---

### How to Load a Preset

1. Navigate to **Settings Page**
2. Click **⚙️ Presets** button
3. Browse the 4 available presets
4. Read the description
5. Click desired preset card
6. Confirmation - settings applied
7. Review changes in Settings UI
8. Navigate to Atlas to see effect

### Preset vs Custom Settings

| Feature | Preset | Custom Export |
|---------|--------|---------------|
| Predefined | ✅ Yes | ❌ No |
| Optimized for use case | ✅ Yes | Depends |
| Can modify after loading | ✅ Yes | ✅ Yes |
| Shareable | ✅ Built-in | ✅ Via file |
| Timestamped | ❌ No | ✅ Yes |

**Pro Tip**: Load a preset as starting point, customize, then export your own!

---

## File Format Specification

### Schema Version 1.0

```typescript
interface SettingsExport {
  version: string;              // Format version (currently "1.0")
  timestamp: string;            // ISO 8601 timestamp
  settings: {
    visual: VisualSettings;
    behavior: BehaviorSettings;
    layers: LayerVisibility;
    network: NetworkConfig;
    chat: ChatSettings;
    keyboard: KeyboardSettings;
    accessibility: AccessibilitySettings;
  };
}

interface VisualSettings {
  pathAnimationMode: 'subtle' | 'dynamic' | 'mystical';
  emotionDisplayMode: 'simple' | 'data';
  showMotionIndicators: boolean;
  colorScheme: 'category' | 'valence' | 'arousal' | 'connection';
  pathOpacity: number;          // 0.0 - 1.0
  emotionSize: number;          // 0.5 - 2.0
  enableAnimations: boolean;
  dataVisualizationMode: boolean;
}

interface BehaviorSettings {
  autoComputePaths: boolean;
  showAllPaths: boolean;
  focusMode: boolean;
}

interface LayerVisibility {
  soulSphere: boolean;
  emotionPoints: boolean;
  emotionLabels: boolean;
  transitionPaths: boolean;
  waypoints: boolean;
  bridgeHighlight: boolean;
  legend: boolean;
}

interface NetworkConfig {
  mode: 'local' | 'network';
  customEndpoints: boolean;
  endpoints: {
    observer: string;           // URL
    listener: string;           // URL
    versor: string;             // URL
  };
}

interface ChatSettings {
  defaultToneMode: 'warm' | 'clinical';
  defaultDeepFeeling: boolean;
  autoFocusEmotions: boolean;
}

interface KeyboardSettings {
  enableKeyboardShortcuts: boolean;
  customKeyBindings: Record<string, string>;
}

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
```

### Required Fields

All fields are **required**. Missing fields will cause import rejection.

### Extensibility

Future versions may add:

- Optional fields (backward compatible)
- New setting sections
- Additional enum values
- Nested configurations

The system will handle version mismatches gracefully.

---

## Troubleshooting

### Common Issues

#### ❌ "Invalid settings format"

**Cause**: Missing required fields
**Solution**:

- Ensure file has `version` and `settings` fields
- Verify all 7 sections present
- Check file wasn't corrupted

**Example Fix**:

```json
{
  "version": "1.0",           // ← Must be present
  "timestamp": "...",
  "settings": {               // ← Must be present
    "visual": { ... },        // ← All 7 sections required
    "behavior": { ... },
    "layers": { ... },
    "network": { ... },
    "chat": { ... },
    "keyboard": { ... },
    "accessibility": { ... }
  }
}
```

---

#### ❌ "Invalid pathOpacity value"

**Cause**: Value outside 0.0-1.0 range
**Solution**:

- Set between 0.0 (invisible) and 1.0 (opaque)
- Use decimal notation

**Example Fix**:

```json
{
  "pathOpacity": 0.6  // ✅ Valid (was: 1.5)
}
```

---

#### ❌ "Invalid emotionSize value"

**Cause**: Value outside 0.5-2.0 range
**Solution**:

- Set between 0.5 (tiny) and 2.0 (huge)

**Example Fix**:

```json
{
  "emotionSize": 1.2  // ✅ Valid (was: 3.0)
}
```

---

#### ⚠️ "Settings version mismatch"

**Cause**: File from different version
**Result**: Warning logged, import proceeds
**Action**: Usually safe, but review settings afterward

---

#### ❌ File won't open / No import dialog

**Cause**: Browser security or file type issue
**Solution**:

- Ensure file has `.json` extension
- Try different browser
- Check file isn't corrupted
- Verify file size < 1MB

---

### Validation Errors

The system logs detailed errors to browser console:

```javascript
// Open DevTools Console (F12)
// Look for messages like:

"Invalid settings format: missing section 'visual'"
"Invalid pathOpacity value"
"Failed to import settings: SyntaxError: Unexpected token"
```

---

## Best Practices

### 🎯 For Individual Users

### 1. Regular Backups

- Export settings monthly
- Store in cloud (Dropbox, Drive, etc.)
- Name descriptively: `love-settings-clinical-2025-12.json`

### 2. Experimentation Safety

- Export before trying new settings
- Easy rollback if issues arise

### 3. Device Sync

- Export on primary device
- Import on secondary devices
- Consistent experience everywhere

### 4. Progressive Customization

- Start with preset closest to needs
- Customize gradually
- Export when satisfied

---

### 👥 For Teams

### 1. Standardize Configurations

- Clinical teams: Use Clinical Mode preset
- Research teams: Create custom research config
- Training teams: Use Demo Mode

### 2. Version Control Settings

- Store in Git repository
- Document changes in commit messages
- Easy reversion if needed

### 3. Onboarding

- Provide team preset to new members
- Include in onboarding documentation
- Ensure consistency across team

### 4. Environment-Specific Configs

- **Development**: Performance mode for testing
- **Staging**: Demo mode for stakeholders
- **Production**: Clinical mode for therapy

---

### 🏢 For Organizations

### 1. Configuration Library

- Maintain preset library
- Document use cases
- Share via internal wiki

### 2. Compliance & Audit

- Export settings used in studies
- Attach to research documentation
- Ensure reproducibility

### 3. Training Materials

- Include preset files in training
- Demonstrate import process
- Provide troubleshooting guide

### 4. Support Workflow

```text
User reports issue
  ↓
User exports settings
  ↓
Send settings file to support
  ↓
Support reproduces issue
  ↓
Fix identified
```

---

## Advanced Usage

### Creating Custom Presets

**Scenario**: You want to create a "Research Mode" preset

1. Start with Clinical Mode preset
2. Customize settings:
   - Disable animations (consistency)
   - Enable all layers (visibility)
   - Use valence coloring (analysis)
3. Export settings
4. Rename file: `love-preset-research.json`
5. Share with research team

### Programmatic Generation

For advanced users, settings can be generated programmatically:

```javascript
const researchPreset = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  settings: {
    visual: {
      pathAnimationMode: 'subtle',
      emotionDisplayMode: 'data',
      showMotionIndicators: false,
      colorScheme: 'valence',
      pathOpacity: 0.9,
      emotionSize: 1.0,
      enableAnimations: false,
      dataVisualizationMode: true
    },
    // ... rest of settings
  }
};

// Download
const blob = new Blob([JSON.stringify(researchPreset, null, 2)],
                      { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'love-preset-research.json';
a.click();
```

### Batch Configuration Updates

Organizations can distribute settings via:

- Email attachment
- Shared network drive
- Configuration management system
- Internal tools portal

---

## Future Enhancements

### Planned Features (v1.1+)

- **URL-based sharing**: Share via link instead of file
- **Cloud sync**: Automatic cross-device synchronization
- **Preset categories**: User-created preset collections
- **Diff viewer**: Compare two configurations
- **Merge tool**: Combine settings from multiple sources
- **History**: Undo/redo settings changes
- **Profiles**: Multiple named configurations per user

---

## FAQ

**Q: Can I edit the JSON file manually?**
A: Yes! It's plain JSON. Edit with any text editor, just maintain the schema.

**Q: Are settings encrypted?**
A: No, they're plain JSON. Don't include sensitive data (though current schema has none).

**Q: What happens if I import invalid JSON?**
A: Import fails gracefully with error message. Current settings unchanged.

**Q: Can I import a file from an older version?**
A: Usually yes, with a warning. Future versions aim for backward compatibility.

**Q: Do presets overwrite my custom shortcuts?**
A: Yes. Export first if you've customized shortcuts.

**Q: Can I share settings publicly?**
A: Yes! Network endpoints are configurable, no personal data included.

**Q: What if a setting is missing from imported file?**
A: Import fails. All settings required for data integrity.

**Q: Can I import during active session?**
A: Yes! Atlas updates immediately. 3D scene re-renders with new settings.

---

## Support

**Issues or Questions?**

- Check browser console for detailed errors
- Review this guide's Troubleshooting section
- Contact support with exported settings file
- Report bugs via `/reportbug` command

---

**Last Updated**: December 7, 2025
**Version**: 1.0
**Author**: L.O.V.E. Platform Team
