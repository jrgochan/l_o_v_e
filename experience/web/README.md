# L.O.V.E. Experience - Web Version

**3D Emotional Visualization using Next.js + React Three Fiber**

---

## 🎯 Overview

This is the web implementation of the L.O.V.E. Experience module, providing a 3D visualization of emotional states based on the VAC (Valence-Arousal-Connection) model.

**Tech Stack:**

- Next.js 16 (App Router, Turbopack)
- React 19
- React Three Fiber v8
- Three.js r170
- Zustand 5 (state management)
- Tailwind CSS 4
- TypeScript 5

**Shared Code:**

- Imports from `@love/experience-shared` package
- Reuses quaternion math, easing functions, VAC types
- Shares Observer/Listener API clients

---

## 🚀 Quick Start

### Installation

From the web directory:

```bash
cd experience/web
npm install
```

Or from the root experience directory:

```bash
cd experience
npm install  # Installs all workspaces
```

### Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### Build for Production

```bash
npm run build
npm start
```

---

## 📁 Directory Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with Soul Sphere
│   └── globals.css         # Tailwind + custom styles
├── components/
│   ├── SoulSphere.tsx      # 3D Soul Sphere (R3F)
│   ├── Scene.tsx           # Three.js scene setup
│   ├── EmotionalControls.tsx  # Emotion selector UI
│   └── VACDisplay.tsx      # Real-time VAC values
├── stores/
│   └── useExperienceStore.ts  # Zustand state (uses shared types)
├── shaders/
│   ├── vertex.glsl         # Vertex shader (Arousal → displacement)
│   └── fragment.glsl       # Fragment shader (Valence → color, Connection → glow)
├── types/
│   ├── glsl.d.ts           # GLSL module declarations
│   └── react-three-fiber.d.ts  # R3F JSX types
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

## 🎨 Visual Language

The Soul Sphere maps emotional states to visual properties:

### Valence → Color

- **Negative (-1.0)**: Deep Crimson (#8B0000)
- **Neutral (0.0)**: Gray blend
- **Positive (+1.0)**: Bright Cyan (#00FFFF)

### Arousal → Geometry

- **Low (-1.0)**: Smooth, calm sphere
- **Medium (0.0)**: Subtle waviness
- **High (+1.0)**: Chaotic, spiky surface

### Connection → Glow

- **Low (-1.0)**: Opaque, solid, heavy
- **Medium (0.0)**: Semi-transparent
- **High (+1.0)**: Ethereal, radiant glow

---

## 🧪 Testing Emotions

The app includes 9 canonical emotions for testing:

| Emotion    | Valence | Arousal | Connection | Expected Visual                 |
| ---------- | ------- | ------- | ---------- | ------------------------------- |
| Neutral    | 0.0     | 0.0     | 0.0        | Gray, smooth, semi-opaque       |
| Joy        | 0.9     | 0.7     | 0.8        | Cyan, spiky, glowing ✨         |
| Shame      | -0.9    | -0.1    | -1.0       | Crimson, smooth, opaque         |
| Grief      | -0.9    | -0.4    | 0.5        | Crimson, smooth, subtle glow 💔 |
| Despair    | -0.9    | -0.4    | -0.8       | Crimson, smooth, dark           |
| Compassion | 0.3     | 0.2     | 0.9        | Light cyan, calm, glowing       |
| Pity       | 0.3     | 0.2     | -0.6       | Light cyan, calm, opaque        |
| Excitement | 0.8     | 0.9     | 0.6        | Cyan, very spiky, glow          |
| Calm       | 0.5     | -0.8    | 0.4        | Light cyan, smooth, subtle glow |

---

## 🔧 Development

### Running Tests

From root experience directory:

```bash
npm test
```

### Type Checking

```bash
npm run lint
```

### Building Shared Package

If you modify the shared package:

```bash
cd ../shared
npm run build
```

---

## 🌐 API Integration

### Observer API (Future)

The web version can poll the Observer API for real-time emotional state:

```typescript
import { getObserverClient } from "@love/experience-shared";

const client = getObserverClient({
  baseUrl: "http://localhost:8000",
});

const state = await client.getCurrentState("user-id");
// Use state.vac_vector to update Soul Sphere
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_OBSERVER_URL=http://localhost:8000
NEXT_PUBLIC_LISTENER_URL=http://localhost:8002
```

---

## 📊 Performance

**Target Metrics:**

- 60fps animation
- < 2s initial load
- Lighthouse score > 90
- Works on desktop and tablets

**Optimizations:**

- Direct uniform mutation in useFrame (no React re-renders)
- Memoized geometry and materials
- Efficient Zustand subscriptions
- Code splitting via Next.js

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Or connect your Git repository for automatic deployments.

### Docker (Alternative)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 🔍 Troubleshooting

### Issue: TypeScript Errors for R3F Elements

These are expected during development. R3F JSX types extend at runtime.

### Issue: Shaders Not Loading

Ensure `raw-loader` is installed and Next.js webpack config includes GLSL rules.

### Issue: Shared Package Not Resolving

Run from experience root:

```bash
npm install
cd shared && npm run build
```

---

## 📚 Documentation

See parent documentation:

- `../PLATFORM_MIGRATION_PLAN.md` - Overall migration strategy
- `../SHARED_CODE_EXTRACTION_PLAN.md` - Shared code details
- `../WEB_VERSION_IMPLEMENTATION_PLAN.md` - Full implementation plan

---

## ✨ Key Features

- ✅ Pure WebGL rendering (no compatibility shims)
- ✅ Same GLSL shaders as React Native
- ✅ Shared business logic via NPM workspace
- ✅ Real-time emotional state visualization
- ✅ Smooth VAC transitions with SLERP
- ✅ 9 canonical emotions for testing
- ✅ Responsive design (desktop + tablet)

---

**Built with ❤️ for the L.O.V.E. Project**
