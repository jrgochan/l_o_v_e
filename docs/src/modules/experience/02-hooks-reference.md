# Hooks Reference

**Last Updated:** February 2026
**Audience:** Frontend Developers

---

## Overview

The Experience module uses **21 root-level hooks** and **16 hook subdirectories** (80+ hook files) to encapsulate data fetching, state synchronization, and user interaction logic.

---

## Root-Level Hooks

### Data & API

| Hook | Size | Purpose |
|------|------|---------|
| `useEmotionData.ts` | 5KB | Fetch emotion details from Observer API |
| `useLoadCachedPaths.ts` | 4KB | Load pre-computed paths from path cache |
| `useComputeAllPaths.ts` | 4KB | Trigger and track batch path computation |
| `useObserverPolling.ts` | 2KB | Poll Observer API for state updates |
| `useModelAssignments.ts` | 3KB | Manage AI model-function assignments |
| `useOllamaModels.ts` | 1KB | Fetch available Ollama models |
| `usePathCalculator.ts` | 2KB | Calculate transition paths on demand |

### Real-time Communication

| Hook | Size | Purpose |
|------|------|---------|
| `useWebSocketChat.ts` | 4KB | WebSocket connection for chat sessions |
| `usePersonaPlexVoice.ts` | 10KB | Voice interaction with PersonaPlex AI (largest hook) |
| `useVoiceRecording.ts` | 2KB | Browser audio recording via MediaRecorder API |
| `useTokenRefresh.ts` | 2KB | JWT token refresh and auth state management |

### Visualization & Animation

| Hook | Size | Purpose |
|------|------|---------|
| `useHistorySphereSync.ts` | 4KB | Sync emotion history with sphere visualization |
| `useSphereSync.ts` | 2KB | Sync sphere state with store updates |
| `useAdminSphereSync.ts` | 1KB | Sync sphere for admin preview mode |
| `useAnimationModeTransition.ts` | 3KB | Smooth transitions between animation modes |
| `useAmbientAudio.ts` | 1KB | Ambient audio tied to emotional state |

### Navigation & UI

| Hook | Size | Purpose |
|------|------|---------|
| `useCommandPalette.ts` | 3KB | Command palette logic (Cmd+K) |
| `useEmotionNavigation.ts` | 1KB | Navigate between emotions in the atlas |
| `useKeyboardShortcuts.ts` | 1KB | Global keyboard shortcut registration |
| `useSettingsSync.ts` | 2KB | Sync settings between store and localStorage |
| `useLoggerInit.ts` | 1KB | Initialize structured logging |

---

## Hook Subdirectories

### `chat/` (16 files)
Chat-specific hooks for message handling, typing indicators, session management, and AI response processing.

**Key hooks:**
- `useChatMessages` — Message CRUD and pagination
- `useChatSession` — Session lifecycle (start, end, resume)
- `useChatAnalysis` — Real-time emotional analysis of chat messages
- `useTypingIndicator` — Typing state management

### `command-palette/` (13 files)
Modular command palette system with command registration, search, and execution.

**Key hooks:**
- `useCommandRegistry` — Register/unregister commands
- `useCommandSearch` — Fuzzy search across commands
- `useCommandExecution` — Execute commands with undo support
- `useRecentCommands` — Track recently used commands

### `admin/` (7 files)
Admin dashboard data fetching and management hooks.

**Key hooks:**
- `useAdminData` — Fetch admin dashboard bootstrap data
- `useStrategyManagement` — Strategy CRUD operations
- `useUserManagement` — User listing and management

### `websocket/` (6 files)
WebSocket connection management and message routing.

**Key hooks:**
- `useWebSocketConnection` — Low-level WebSocket lifecycle
- `useWebSocketReconnect` — Auto-reconnect with backoff
- `useMessageRouter` — Route incoming messages by type

### `sync/` (6 files)
Cross-component state synchronization hooks.

### `shortcuts/` (6 files)
Keyboard shortcut management per context.

### `voice/` (5 files)
Voice recording, processing, and transcription hooks.

### `navigation/` (5 files)
Emotion atlas navigation and browsing hooks.

### `visualization/` (3 files)
Visualization parameter adjustment hooks.

### `pathfinding/` (3 files)
Path calculation and exploration hooks.

### `ollama/` (3 files)
Ollama model management hooks.

### `audio/` (3 files)
Audio playback and ambient sound hooks.

### `visualizations/` (2 files)
Chart and data visualization hooks.

### `performance/` (1 file)
Performance monitoring and metrics hooks.

### `interaction/` (1 file)
User interaction tracking hooks.

### `utils/` (utility files)
Shared hook utility functions and helpers.

---

## Patterns

### Data Fetching Pattern
```tsx
function useEmotionData(emotionId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/observer/emotions/${emotionId}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [emotionId]);

  return { data, loading };
}
```

### Store Integration Pattern
```tsx
function useSphereSync() {
  const { currentEmotion } = useVisualizationStore();
  const { animationSpeed } = useSettingsStore();
  // Sync logic between stores and Three.js scene
}
```

---

## See Also

- [Component Architecture](01-component-architecture.md) — Component documentation
- [State Management](03-state-management.md) — Zustand store documentation
