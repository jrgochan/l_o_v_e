# Type System Documentation

**L.O.V.E. Experience - TypeScript Type System**

---

## 📚 Overview

The type system is organized into focused modules, each handling a specific domain of the application.

---

## 📦 Type Files

### `chat.ts` - Emotional Chat Types

**Size:** ~470 lines
**Purpose:** Complete type system for emotional analysis chat

**Main Categories:**

- **Base Types:** ToneMode, MessageType, VAC, ProsodyData
- **Insights:** InsightData, Recommendation, VoiceContentCorrelation
- **Chat & Session:** ChatMessage, ChatSession, SessionMetrics
- **WebSocket:** ServerMessage, ClientMessage (union types)
- **Deep Feeling:** Multi-emotion analysis types
- **Progress:** Heartbeat Analyzer types

**When to use:**

- Building chat features
- WebSocket message handling
- Emotion analysis display
- Session metrics tracking

---

### `atlas-admin.ts` - Soul Sphere Atlas Types

**Size:** ~267 lines
**Purpose:** Types for the 87-emotion atlas visualization

**Main Categories:**

- **Emotions:** AtlasEmotion, EmotionPath, PathWaypoint
- **Visualization:** CategoryFilter, LayerVisibility, PathAnimationMode
- **Settings:** AtlasAdminSettings
- **Constants:** DIFFICULTY_COLORS, BRIDGE_EMOTIONS, CATEGORY_COLORS

**When to use:**

- Building atlas visualization features
- Path computation
- Emotion selection/filtering
- 3D sphere rendering

---

### `utils.ts` - TypeScript Utilities

**Size:** ~140 lines
**Purpose:** Reusable type transformations

**Utilities Available:**

- `RequireOnly<T, K>` - Make specific props required
- `Optional<T, K>` - Make specific props optional
- `DeepReadonly<T>` - Deep readonly transformation
- `DeepPartial<T>` - Deep partial transformation
- `KeysOfType<T, V>` - Extract keys by value type
- `Replace<T, K, V>` - Replace property types
- `RequireAtLeastOne<T, K>` - Ensure at least one prop
- `RequireExactlyOne<T, K>` - Ensure exactly one prop
- `Callback<T>`, `AsyncCallback<T>` - Function types
- `StyleProps`, `ChildrenProps`, `BaseComponentProps` - Component props

**When to use:**

- Creating variations of existing types
- Component prop interfaces
- Form validation types
- Complex type transformations

---

### `command-palette.ts` - Command Palette Types

**Size:** Small
**Purpose:** Command palette command definitions

---

### Type Declaration Files

- `glsl.d.ts` - GLSL shader module declarations
- `react-three-fiber.d.ts` - Three.js React extensions

---

## 🎯 Best Practices

### 1. Use Existing Types First

Before creating new types, check if an existing type or utility type can be used.

```typescript
// ✅ Good - reuse existing
import type { VAC } from "@/types/chat";

// ❌ Avoid - duplicating types
interface MyVAC {
  valence: number;
  arousal: number;
  connection: number;
}
```

### 2. Use Type Utilities

Leverage `types/utils.ts` for common transformations:

```typescript
import type { Optional, RequireOnly } from "@/types/utils";

// Make email optional in User type
type PartialUser = Optional<User, "email">;

// Make email required in User type
type RequiredUser = RequireOnly<User, "email">;
```

### 3. Document Complex Types

Add JSDoc comments to complex or non-obvious types:

```typescript
/**
 * Represents a multi-emotion analysis result
 *
 * @property emotions - Array of detected emotions with prominence levels
 * @property relationships - How emotions interact with each other
 * @property aggregate - Combined emotional state
 */
export interface MultiEmotionAnalysis {
  // ...
}
```

### 4. Use Discriminated Unions

For union types, use discriminated unions with `type` field:

```typescript
export type ServerMessage =
  | { type: "analysis"; emotion: string; vac: VAC }
  | { type: "error"; message: string }
  | { type: "insight"; insights: InsightData };
```

---

## 🔍 Finding Types

### By Feature:

- **Chat Messages** → `chat.ts`
- **Emotion Visualization** → `atlas-admin.ts`
- **Type Utilities** → `utils.ts`
- **Commands** → `command-palette.ts`

### By IDE:

1. Hover over any variable to see its type
2. Cmd/Ctrl + Click to jump to type definition
3. Use "Find All References" to see type usage

---

## 🚀 When to Add New Types

### Add to `chat.ts` if:

- Related to emotional analysis chat
- WebSocket message types
- Session or metrics data
- Progress tracking

### Add to `atlas-admin.ts` if:

- Related to 87-emotion atlas
- Path computation
- Sphere visualization
- Admin interface settings

### Add to `utils.ts` if:

- Generic type transformation
- Reusable across multiple features
- Common component prop pattern

### Create New File if:

- New major feature domain
- Exceeds 500 lines
- Clear logical separation
- Team requests it

---

## 📊 Type System Health

**Current Status:** ✅ Excellent

- ✅ Well-organized
- ✅ Clear documentation
- ✅ No duplication
- ✅ Good separation of concerns
- ✅ TypeScript strict mode passing
- ✅ IDE navigation works well

---

## 🔮 Future Considerations

**When to Split chat.ts:**

- Team grows beyond 3-4 developers
- File exceeds 800-1000 lines
- Circular dependencies appear
- Types get duplicated
- Import confusion occurs

**Proposed Structure** (if needed):

```
types/chat/
├── index.ts       // Re-exports
├── base.ts        // Base types
├── analysis.ts    // Analysis types
├── websocket.ts   // WebSocket messages
├── multi-emotion.ts // Deep Feeling
└── session.ts     // Session/metrics
```

---

## 💡 Tips

1. **Use type index** at top of chat.ts to find types quickly
2. **Leverage utils.ts** for common transformations
3. **Add JSDoc** to complex types for better IDE tooltips
4. **Keep types close** to feature when possible
5. **Refactor when needed** - don't prematurely optimize

---

**Last Updated:** 2025-12-23
**Version:** 1.0 (Post Phase 6 Consolidation)
