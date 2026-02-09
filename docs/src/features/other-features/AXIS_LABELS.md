# Soul Sphere Axis Labels

## Overview

Added VAC axis labels to the Soul Sphere visualization to help users understand the 3D emotional coordinate system.

## Implementation Date

December 7, 2025

## Problem Solved

Users could see the beautiful morphing Soul Sphere but had no visual reference for which direction represented Valence, Arousal, and Connection in 3D space.

## Solution

### HTML Overlay Labels

Implemented clean, accessible HTML overlay labels positioned at the edges of the canvas showing the positive and negative ends of each VAC axis.

### Visual Design

**Label Placement:**

- **Valence (X-axis):**
  - V+ (Positive) - Right side, cyan
  - V− (Negative) - Left side, red

- **Arousal (Y-axis):**
  - A+ (Activated) - Top, yellow
  - A− (Calm) - Bottom, blue

- **Connection (Z-axis):**
  - C+ (Connected) - Bottom-right, purple
  - C− (Separated) - Top-left, gray

**Styling:**

- Semi-transparent colored badges
- Backdrop blur for readability
- Rounded pill shape
- Hover effect (scale 1.1x)
- Color-coded to match VAC semantics
- Tooltips with full descriptions

### Features

✅ **Accessible**: ARIA labels for screen readers
✅ **Non-intrusive**: pointer-events: none, doesn't block interaction
✅ **Responsive**: Positions relative to canvas edges
✅ **Toggleable**: Settings > Visual > Axis Labels On/Off
✅ **Persistent**: Saved to localStorage
✅ **Educational**: Hover tooltips explain each dimension

## Technical Implementation

### Files Created/Modified

1. **`experience/web/components/AxisLabels.tsx`** (new)
   - Main component with 6 labeled badges (V+/V−, A+/A−, C+/C−)
   - Reads `showAxisLabels` from settings store
   - Color-coded badges with tooltips

2. **`experience/web/stores/useSettingsStore.ts`**
   - Added `showAxisLabels: boolean` to state
   - Default value: `true`
   - Included in localStorage persistence
   - Added to export/import

3. **`experience/web/components/Scene.tsx`**
   - Wrapped Canvas in relative div
   - Added `<AxisLabels />` component
   - Positioned as absolute overlay

4. **`experience/web/components/admin/settings/VisualSettings.tsx`**
   - Added toggle switch for axis labels
   - Descriptive text explaining feature

## Usage

### For Users

1. Axis labels show by default
2. Toggle on/off in Settings > Visual Settings > "Axis Labels On"
3. Hover over labels for full descriptions
4. Labels remain visible as sphere rotates

### For Developers

```tsx
import { AxisLabels } from '@/components/AxisLabels';

// Labels automatically read from settings store
<AxisLabels />

// To toggle programmatically:
const { showAxisLabels, updateVisualSetting } = useSettingsStore();
updateVisualSetting('showAxisLabels', true);
```

## Design Decisions

### Why HTML Overlays vs 3D Text?

**Chose HTML Overlays because:**

- ✅ Always readable (no occlusion)
- ✅ Easy to style with CSS
- ✅ Better accessibility
- ✅ Better performance
- ✅ Easier to position precisely
- ✅ Native tooltip support

**3D Text would have:**

- ❌ Performance cost
- ❌ Occlusion issues
- ❌ Harder to read at angles
- ❌ More complex implementation

### Color Palette Rationale

| Axis | Positive Color | Negative Color | Rationale |
|------|----------------|----------------|-----------|
| **Valence** | Cyan | Red/Crimson | Matches sphere shader colors |
| **Arousal** | Yellow | Blue | Energy (warm) vs Calm (cool) |
| **Connection** | Purple | Gray | Aligned (vibrant) vs Separated (muted) |

## Future Enhancements

### Phase 2: Optional Axis Lines

- Add subtle 3D lines extending from sphere
- Lines fade based on camera angle
- Toggle in Visual Settings

### Phase 3: Educational Mode

- Expanded labels with full names
- "Valence (Positive/Negative)"
- "Arousal (Energy Level)"
- "Connection (Alignment)"

### Phase 4: Interactive Labels

- Click label to snap camera to that axis view
- Highlight corresponding axis on hover

## Accessibility

- **ARIA Labels**: Container has `aria-label="VAC Coordinate System Labels"`
- **Tooltips**: Each label has descriptive `title` attribute
- **Role**: Labels use `role="img"` for semantic meaning
- **Color Independence**: Text labels supplement colors
- **Pointer Events**: Labels don't block interactions

## Testing

### Manual Testing

- [x] Labels display in correct positions
- [x] Colors match VAC semantics
- [x] Toggle works in settings
- [x] Persistence across page reloads
- [x] Tooltips show on hover
- [x] No performance impact
- [x] Accessible via keyboard navigation

### Verified On

- macOS Chrome
- Visual Studio Code preview
- Multiple screen sizes

## Related Documentation

- [VAC Model](../../architecture/02-vac-model.md) - Explains the coordinate system
- [Visual Settings](../../architecture/04-settings-page-architecture.md) - Settings architecture
- [Soul Sphere Specification](../../modules/experience/04-soul-sphere-specification.md) - Sphere details

## User Feedback

> "Would it be possible to label the axes on the soul sphere visualization so users know which way is V, A, and C? Does this make sense, or am i bonkers?"

**Response:** Not bonkers at all! This was an essential UX improvement. Users now have clear visual reference for the 3D emotional space.
