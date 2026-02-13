# Component Architecture

**Last Updated:** February 2026
**Audience:** Frontend Developers

---

## Overview

The Experience module contains **35 top-level components** and **18 admin subdirectories** with 120+ admin components. Components are organized by domain: core visualization, navigation, admin dashboard, and clinical tools.

---

## Top-Level Components

### Core Visualization

| Component | Size | Purpose |
|-----------|------|---------|
| `SoulSphere.tsx` | 13KB | Core 3D emotional state visualization with custom GLSL shaders |
| `Scene.tsx` | 5KB | Three.js scene setup, camera, lighting |
| `TransitionPathRenderer.tsx` | 9KB | 3D rendering of A* transition paths through VAC space |
| `VACAnimator.tsx` | 2KB | SLERP-based animation between emotional states |
| `OrbitControls.tsx` | 2KB | Camera orbit controls for 3D scene |
| `VACAxisLabels3D.tsx` | 4KB | 3D axis labels in VAC space |
| `AxisLabels.tsx` | 3KB | 2D axis label overlay |
| `SimpleAxisLabels.tsx` | 2KB | Simplified axis labels |
| `VACDisplay.tsx` | 1KB | Current VAC coordinate readout |
| `CinematicOverlay.tsx` | 6KB | Cinematic camera mode overlay |
| `DebugBroadcaster.tsx` | 3KB | Debug information broadcaster |

### Navigation & Journeys

| Component | Size | Purpose |
|-----------|------|---------|
| `GoalSetting.tsx` | 14KB | Emotional goal selection interface |
| `JourneyProgress.tsx` | 9KB | Active journey progress tracking |
| `JourneyHistory.tsx` | 8KB | Historical journey timeline |
| `PathDetailsOverlay.tsx` | 21KB | Detailed path information overlay |
| `PathExplanationPanel.tsx` | 6KB | AI-generated path explanations |
| `PathComparisonView.tsx` | 5KB | Side-by-side path comparison |
| `ViewerPathFlyover.tsx` | 4KB | Animated flyover of transition paths |
| `WaypointArrivalOverlay.tsx` | 5KB | Overlay shown when reaching a waypoint |
| `WaypointTooltip.tsx` | 5KB | Hover tooltip for waypoints |
| `StepAlternativeSelector.tsx` | 4KB | Alternative path step selector |
| `PathfindingInsights.tsx` | 2KB | Insights from pathfinding results |

### Strategies

| Component | Size | Purpose |
|-----------|------|---------|
| `StrategyLibraryBrowser.tsx` | 7KB | Browse all regulation strategies |
| `StrategyDetailsModal.tsx` | 6KB | Strategy detail view |
| `StrategyFeedbackModal.tsx` | 11KB | Strategy effectiveness feedback |
| `PersonalStrategies.tsx` | 5KB | User's personal strategy collection |
| `ContextualRecommendations.tsx` | 11KB | Context-aware strategy recommendations |

### Input & Controls

| Component | Size | Purpose |
|-----------|------|---------|
| `Settings.tsx` | 26KB | Comprehensive settings panel (largest component) |
| `CommandPalette.tsx` | 15KB | Cmd+K command palette |
| `EmotionalInput.tsx` | 3KB | Text-based emotional input |
| `EmotionalControls.tsx` | 2KB | Emotion selection controls |
| `ViewerShortcuts.tsx` | 3KB | Keyboard shortcut display |
| `ConceptTooltip.tsx` | 2KB | Educational concept tooltips |
| `ZenSessionIndicator.tsx` | 2KB | Zen mode session indicator |
| `LoggerProvider.tsx` | <1KB | Logging context provider |

---

## Admin Dashboard (`components/admin/`)

The admin dashboard provides clinical tools, data management, and analytics. It's organized into 18 subdirectories with 120+ components.

### Directory Overview

| Directory | Files | Purpose |
|-----------|-------|---------|
| `panels/` | 16 | Admin panel containers and tab navigation |
| `visualizations/` | 13 | Data visualization charts and graphs |
| `settings/` | 12 | Admin-specific settings controls |
| `chat/` | 12 | Chat interface components (messages, input, sidebar) |
| `clinical/` | 11 | Clinical dashboard, risk assessment, alerts |
| `visualization/` | 10 | Emotion and path visualization tools |
| `shared/` | 7 | Shared admin components (modals, tables, buttons) |
| `emotion-display/` | 7 | Emotion detail display components |
| `data/` | 7 | Data import/export, bulk operations |
| `spheres/` | 6 | Admin sphere preview and configuration |
| `paths/` | 5 | Path browsing and management |
| `state-display/` | 4 | State inspector and debug tools |
| `layout/` | 4 | Admin layout (sidebar, header, footer) |
| `emotions/` | 2 | Emotion CRUD management |
| `users/` | 1 | User management |
| `particles/` | 1 | Particle effect settings |
| `modals/` | 1 | Modal dialogs |
| `debug/` | 1 | Debug tools |

### Key Admin Components

- **ChatPanel** — WebSocket-connected emotional check-in interface
- **ClinicalDashboard** — Clinical alerts, risk scores, session analytics
- **PathMatrix** — Visualization of all computed emotion-to-emotion paths
- **WaypointDetailModal** — Detailed waypoint view with on-demand strategy fetching
- **DataManagement** — Import/export emotions, strategies, bootstrap data

---

## Component Patterns

### State Access
Components access state via Zustand hooks:
```tsx
const { currentEmotion } = useVisualizationStore();
const { settings } = useSettingsStore();
```

### API Communication
Components use custom hooks for API calls:
```tsx
const { data, loading } = useEmotionData(emotionId);
const { sendMessage } = useWebSocketChat();
```

### 3D Rendering
3D components use React Three Fiber's declarative API:
```tsx
<Canvas>
  <Scene>
    <SoulSphere emotion={currentEmotion} />
    <TransitionPathRenderer path={activePath} />
  </Scene>
</Canvas>
```

---

## See Also

- [Hooks Reference](02-hooks-reference.md) — Custom hook documentation
- [State Management](03-state-management.md) — Zustand store documentation
- [Module Overview](../index.md) — Experience module overview
