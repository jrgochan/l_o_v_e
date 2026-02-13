# Wibbly Paths: Keyboard Navigation

## Overview

Keyboard-based path navigation replaces mouse hover interactions for the Soul Sphere's emotional transition paths. This eliminates wonky 3D hover detection while enabling precise, accessible path selection.

## Keyboard Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Cycle through available paths |
| `1`–`5` | Jump to specific path by index |
| `Enter` | Show path details modal |
| `P` | Toggle all paths visible/hidden |
| `Escape` | Deselect current path |

## Visual Feedback

- **Selected path:** Brighter emission, slightly increased thickness
- **Unselected paths:** Standard flowing animation (based on current mode)
- **InfoPanel:** Highlights the currently selected path in the list

## Implementation

### useKeyboardShortcuts.ts

Add path navigation handlers alongside existing shortcuts:

```typescript
// Path navigation
case 'ArrowUp':
  selectPreviousPath();
  break;
case 'ArrowDown':
  selectNextPath();
  break;
case 'Enter':
  showPathDetails(selectedPathId);
  break;
```

### AtlasAdminStore Changes

- Remove `hoveredPathId` (no longer needed — no mouse hover)
- Keep `selectedPathId` for keyboard-driven selection
- Add `pathNavigationIndex` for cycling

## Related Docs

- [Wibbly Paths Overview](00-OVERVIEW.md)
- [Data Visualization Mode](04-DATA-VISUALIZATION-MODE.md)
