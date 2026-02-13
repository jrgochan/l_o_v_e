# Wibbly Paths: Implementation Guide

## Overview

Step-by-step implementation guide for the Wibbly Paths feature, covering all 5 phases from interaction removal through polish.

## Phase 1: Remove Pointer Interactions (~15 min)

### PathNetwork.tsx

1. Remove `onClick`, `onPointerOver`, `onPointerOut` from path meshes
2. Remove `hoveredPathId` state
3. Remove cursor styling changes
4. Verify paths still render correctly

```diff
-onClick={(e) => setSelectedPath(path.id)}
-onPointerOver={(e) => setHoveredPath(path.id)}
-onPointerOut={() => setHoveredPath(null)}
```

## Phase 2: Keyboard Navigation (~30 min)

See [Keyboard Navigation](04-KEYBOARD-NAVIGATION.md) for detailed controls.

1. Add arrow key handlers to `useKeyboardShortcuts.ts`
2. Implement path cycling logic
3. Add visual selection highlight
4. Update InfoPanel to reflect keyboard selection

## Phase 3: Animation Modes (~2-3 hours)

### Mode A: Subtle Elegant (Default)

See [Subtle & Elegant](01-SUBTLE-ELEGANT.md) for the full specification.

- Simple `useFrame` with gentle oscillation
- Breathing cycle: 0.8s
- Minimal undulation

### Mode B: Dynamic Playful

See [Dynamic & Playful](02-DYNAMIC-PLAYFUL.md) for the full specification.

- Enhanced `useFrame` with pronounced wave motion
- Color gradient shifts
- Faster particle flow

### Mode C: Mystical Ethereal

See [Mystical & Ethereal](03-MYSTICAL-ETHEREAL.md) for the full specification.

- Custom `ShaderMaterial` with GLSL
- Multi-frequency wave composition
- Quantum shimmer effect

## Phase 4: Settings Panel (~30 min)

See [Settings Panel](05-SETTINGS-PANEL.md) for UI design.

1. Add animation mode dropdown to ControlPanel
2. Store preference in `AtlasAdminStore`
3. Persist to `localStorage`
4. Implement smooth mode transition (300ms fade)

## Phase 5: Polish & Testing (~30 min)

### Performance Targets

| Mode | Target FPS | GPU Load |
|------|-----------|----------|
| Subtle | 60 FPS | Low |
| Dynamic | 60 FPS | Medium |
| Mystical | 45+ FPS | Higher |

### Test Checklist

- [ ] All 3 modes render without errors
- [ ] Mode switching is smooth (no flicker)
- [ ] Keyboard navigation works in all modes
- [ ] Settings persist across page reloads
- [ ] No hover interactions remain
- [ ] Performance stays above FPS targets

## Total Estimated Time: 4–5 hours

## Related Docs

- [Wibbly Paths Overview](00-OVERVIEW.md)
- [Data Visualization Mode](04-DATA-VISUALIZATION-MODE.md)
