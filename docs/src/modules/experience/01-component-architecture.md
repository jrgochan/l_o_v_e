# Component Architecture

**Last Updated:** February 2026
**Audience:** Frontend Developers

---

## Overview

The Experience module contains **36 top-level components** and **18 admin subdirectories** with 120+ admin components. Components are organized by domain: core visualization, navigation, admin dashboard, and clinical tools.

---

## Top-Level Components

### Core Visualization

| Component | Size | Purpose |
|-----------|------|---------|
| `SoulSphere.ts` | 13KB | Core 3D emotional state visualization with custom GLSL shaders |
| `Scene.ts` | 5KB | Three.js scene setup, camera, lighting |
| `TransitionPathRenderer.ts` | 9KB | 3D rendering of A* transition paths through VAC space |
| `VACAnimator.ts` | 2KB | SLERP-based animation between emotional states |
| `OrbitControls.ts` | 2KB | Camera orbit controls for 3D scene |
| `VACAxisLabels3D.ts` | 4KB | 3D axis labels in VAC space |
| `AxisLabels.ts` | 3KB | 2D axis label overlay |
| `SimpleAxisLabels.ts` | 2KB | Simplified axis labels |
| `VACDisplay.ts` | 1KB | Current VAC coordinate readout |
| `CinematicOverlay.ts` | 6KB | Cinematic camera mode overlay |
| `DebugBroadcaster.ts` | 3KB | Debug information broadcaster |

### Navigation & Journeys

| Component | Size | Purpose |
|-----------|------|---------|
| `GoalSetting.ts` | 14KB | Emotional goal selection interface |
| `GoalSettingLogic.ts` | 3KB | Goal setting business logic (separated from UI) |
| `JourneyProgress.ts` | 9KB | Active journey progress tracking |
| `JourneyHistory.ts` | 8KB | Historical journey timeline |
| `PathDetailsOverlay.ts` | 21KB | Detailed path information overlay |
| `PathExplanationPanel.ts` | 6KB | AI-generated path explanations |
| `PathComparisonView.ts` | 5KB | Side-by-side path comparison |
| `ViewerPathFlyover.ts` | 4KB | Animated flyover of transition paths |
| `WaypointArrivalOverlay.ts` | 5KB | Overlay shown when reaching a waypoint |
| `WaypointTooltip.ts` | 5KB | Hover tooltip for waypoints |
| `StepAlternativeSelector.ts` | 4KB | Alternative path step selector |
| `PathfindingInsights.ts` | 2KB | Insights from pathfinding results |

### Strategies

| Component | Size | Purpose |
|-----------|------|---------|
| `StrategyLibraryBrowser.ts` | 7KB | Browse all regulation strategies |
| `StrategyDetailsModal.ts` | 6KB | Strategy detail view |
| `StrategyFeedbackModal.ts` | 11KB | Strategy effectiveness feedback |
| `PersonalStrategies.ts` | 5KB | User's personal strategy collection |
| `ContextualRecommendations.ts` | 11KB | Context-aware strategy recommendations |

### Input & Controls

| Component | Size | Purpose |
|-----------|------|---------|
| `Settings.ts` | 26KB | Comprehensive settings panel (largest component) |
| `CommandPalette.ts` | 15KB | Cmd+K command palette |
| `EmotionalInput.ts` | 3KB | Text-based emotional input |
| `EmotionalControls.ts` | 2KB | Emotion selection controls |
| `ViewerShortcuts.ts` | 3KB | Keyboard shortcut display |
| `ConceptTooltip.ts` | 2KB | Educational concept tooltips |
| `ConsentGate.ts` | 2KB | Consent gate for data collection |
| `ZenSessionIndicator.ts` | 2KB | Zen mode session indicator |
| `LoggerProvider.ts` | <1KB | Logging context provider |

---

## Component Subdirectories

In addition to top-level components, there are 4 subdirectories:

| Directory | Purpose |
|-----------|---------|
| `admin/` | Admin dashboard (18 subdirectories, 120+ components) |
| `auth/` | Authentication and login components |
| `command-palette/` | Modular command palette system |
| `input/` | Specialized input components |

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
