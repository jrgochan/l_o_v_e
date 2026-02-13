# Wibbly Paths: Settings Panel

## Overview

The Settings Panel integration allows users to switch between animation modes and configure path rendering preferences, persisted to localStorage.

## Settings UI

### Path Animation Mode Selector

A toggle group added to the Experience settings panel:

| Mode | Label | Icon | Default |
|------|-------|------|---------|
| `subtle` | Subtle & Elegant | 😌 | ✅ |
| `dynamic` | Dynamic & Playful | 😊 | |
| `mystical` | Mystical & Ethereal | 🔮 | |

### Additional Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Path Visibility | Toggle | On | Show/hide all transition paths |
| Path Opacity | Slider (0–1) | 0.7 | Base opacity for all paths |
| Particle Density | Slider (0–1) | 0.5 | Density of flowing particles |

## State Management

Settings are stored in the `AtlasAdminStore` (Zustand):

```typescript
interface PathSettings {
  pathAnimationMode: 'subtle' | 'dynamic' | 'mystical';
  pathsVisible: boolean;
  pathOpacity: number;
  particleDensity: number;
}
```

All settings are persisted to `localStorage` and restored on page load.

## Mode Transitions

When the user switches modes, the transition is animated:

1. Current animation fades out over 300ms
2. New animation parameters are applied
3. New animation fades in over 300ms

This prevents jarring visual jumps between modes.

## Related Docs

- [Wibbly Paths Overview](00-OVERVIEW.md)
- [State Management](../../modules/experience/03-state-management.md)
