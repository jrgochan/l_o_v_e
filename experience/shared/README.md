# @love/experience-shared

**Shared utilities and business logic for the L.O.V.E. Experience module**

This package contains platform-agnostic code that can be used across web, iOS, and Android versions of the Experience module. It provides ~40% code reuse through shared TypeScript utilities.

---

## 📦 What's Included

### Core Utilities

- **VAC Types** - Valence-Arousal-Connection vector types
- **Quaternion Math** - SLERP, angular distance, conversions
- **Easing Functions** - Animation curves for emotional transitions
- **Canonical Emotions** - 9 reference emotional states

### API Clients

- **Observer API** - Fetch current emotional state
- **Listener API** - Submit audio for emotional analysis

### Types

- Shared TypeScript interfaces and types
- Platform-agnostic type definitions

---

## 🚀 Usage

### Installation

This package is part of an NPM workspace. From the root:

```bash
cd experience
npm install
```

### Importing

```typescript
// Import core utilities
import {
  VACVector,
  Quaternion,
  CANONICAL_EMOTIONS,
  slerp,
  angularDistance,
  vacToQuaternion,
} from "@love/experience-shared";

// Import easing functions
import { smootherStep, easeOutCubic, emotionalEasings } from "@love/experience-shared";

// Import API clients
import {
  getObserverClient,
  createPollingManager,
  fetchCurrentState,
} from "@love/experience-shared";
```

---

## 📚 Examples

### Working with VAC Vectors

```typescript
import { VACVector, CANONICAL_EMOTIONS } from "@love/experience-shared";

// Use canonical emotions
const joy: VACVector = CANONICAL_EMOTIONS.joy.vac;
console.log(joy); // [0.9, 0.7, 0.8]

// Create custom VAC
const customEmotion: VACVector = [0.5, -0.3, 0.6];
```

### Quaternion Interpolation

```typescript
import { slerp, vacToQuaternion, angularDistance } from "@love/experience-shared";

const startVAC: VACVector = [0, 0, 0]; // Neutral
const endVAC: VACVector = [0.9, 0.7, 0.8]; // Joy

// Convert to quaternions
const q1 = vacToQuaternion(startVAC);
const q2 = vacToQuaternion(endVAC);

// Interpolate (t = 0.5 is halfway)
const interpolated = slerp(q1, q2, 0.5);

// Calculate distance
const distance = angularDistance(q1, q2);
console.log(`Angular distance: ${distance} radians`);
```

### Observer API Client

```typescript
import { getObserverClient } from "@love/experience-shared";

const client = getObserverClient({
  baseUrl: "http://localhost:8000",
  pollingInterval: 5000,
});

// Fetch current emotional state
const state = await client.getCurrentState("user-123");
console.log(state.vac_vector); // [0.9, 0.7, 0.8]
console.log(state.dominant_emotion.name); // "Joy"

// Check health
const isHealthy = await client.healthCheck();
```

### Polling Manager

```typescript
import { createPollingManager } from "@love/experience-shared";

const manager = createPollingManager();

manager.start(
  "user-123",
  (data) => {
    console.log("New emotional state:", data.vac_vector);
    // Update your UI here
  },
  (error) => {
    console.error("Polling error:", error);
  },
  5000 // Poll every 5 seconds
);

// Later...
manager.stop();
```

---

## 🏗️ Package Structure

```
shared/
├── src/
│   ├── core/
│   │   ├── vac.ts              # VAC types and canonical emotions
│   │   ├── quaternion.ts       # Quaternion math utilities
│   │   └── easing.ts           # Animation easing functions
│   ├── api/
│   │   ├── observer.ts         # Observer API client
│   │   └── listener.ts         # Listener API client
│   ├── types/
│   │   └── index.ts            # Shared type definitions
│   └── index.ts                # Public barrel exports
├── dist/                       # Compiled JavaScript (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Development

### Build

Compile TypeScript to JavaScript:

```bash
cd shared
npm run build
```

Output will be in `dist/` directory.

### Watch Mode

Auto-rebuild on changes:

```bash
npm run watch
```

### Type Check

Check types without building:

```bash
npm run type-check
```

---

## 🌐 Platform Usage

### Web (Next.js + React Three Fiber)

```typescript
import { VACVector, slerp } from "@love/experience-shared";

function SoulSphere() {
  const [currentVAC, setCurrentVAC] = useState<VACVector>([0, 0, 0]);
  // ... rest of component
}
```

### React Native (Current)

```typescript
import { CANONICAL_EMOTIONS } from "@love/experience-shared";

export function EmotionalInput() {
  const emotions = Object.values(CANONICAL_EMOTIONS);
  // ... rest of component
}
```

### iOS (Swift) - Future

Swift can consume the types via a JSON bridge or TypeScript-to-Swift code generation.

### Android (Kotlin) - Future

Similar to iOS, Kotlin can use JSON or code generation to match these types.

---

## 📋 API Reference

### Core Types

#### `VACVector`

```typescript
type VACVector = [number, number, number];
// [valence, arousal, connection]
// Each value ranges from -1.0 to 1.0
```

#### `Quaternion`

```typescript
type Quaternion = [number, number, number, number];
// [w, x, y, z]
// Represents 3D rotation
```

### Functions

#### `slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion`

Spherical linear interpolation between two quaternions.

- `t` ranges from 0 (start) to 1 (end)

#### `angularDistance(q1: Quaternion, q2: Quaternion): number`

Calculate angular distance between quaternions in radians.

#### `vacToQuaternion(vac: VACVector): Quaternion`

Convert VAC vector to quaternion representation.

---

## 🧪 Testing

The shared package is tested through the parent Experience module's test suite. All utilities maintain 100% test coverage.

Run tests from the root experience directory:

```bash
cd experience
npm test
```

---

## 📄 License

UNLICENSED - Internal L.O.V.E. Project use only

---

## 🤝 Contributing

This is a private package for the L.O.V.E. Experience module. When adding new utilities:

1. Ensure they are **platform-agnostic** (no React Native/iOS/Android specific code)
2. Use only standard JavaScript/TypeScript features
3. Export via `src/index.ts` for public API
4. Maintain TypeScript strict mode compliance

---

**Built with ❤️ for the L.O.V.E. Project**
