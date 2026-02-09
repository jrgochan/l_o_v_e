# L.O.V.E. Experience Module

**3D Emotional Visualization - Web & Multi-Platform**

---

## 🎯 Overview

The Experience module visualizes emotional states as a living 3D "Soul Sphere" using the VAC (Valence-Arousal-Connection) model. The sphere's color, geometry, and glow dynamically respond to emotional data from the Observer API.

**Current Implementation:** Next.js Web Application
**Architecture:** Monorepo with shared code foundation
**Status:** ✅ Production Ready

---

## 📁 Project Structure

```
experience/
├── shared/                          # Platform-agnostic code (~40% reuse)
│   ├── src/core/                   # VAC types, quaternion math, easing
│   ├── src/api/                    # Observer & Listener API clients
│   └── README.md                   # Shared package documentation
│
├── web/                             # Next.js 16 Web Application
│   ├── app/                        # Next.js app router
│   ├── components/                 # Soul Sphere, UI controls
│   ├── shaders/                    # GLSL vertex & fragment shaders
│   ├── stores/                     # Zustand state management
│   └── README.md                   # Web setup guide
│
├── docs/                            # Technical specifications
│   └── [13 detailed spec documents]
│
├── archive/                         # Legacy React Native code (reference only)
│   ├── react-native/               # Original Expo/RN implementation
│   └── legacy-docs/                # Old documentation
│
└── [Migration documentation]        # Platform migration guides
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.9+
- npm or pnpm
- L.O.V.E. backend APIs running (Observer, Listener, Versor)

### Installation

```bash
# From the experience directory
npm install

# This installs the shared package automatically
```

### Run Web Version

```bash
# Option 1: From experience/ root
npm run dev:web

# Option 2: From experience/web/
cd web && npm run dev
```

Visit **http://localhost:3000**

### Run Full L.O.V.E. Stack

```bash
# From project root
./infra/run-love-stack.sh
```

This starts all backend APIs + Experience web UI

---

## 🎨 Features

### 3D Visualization

- **Soul Sphere** with custom GLSL shaders
- **VAC Mapping:**
  - Valence → Color (crimson to cyan)
  - Arousal → Geometry displacement (calm to chaotic)
  - Connection → Glow/transparency (disconnected to connected)
- **60fps Animation** with smooth SLERP transitions
- **Interactive Camera** (rotate, zoom)

### UI Components

- **9 Canonical Emotions** for testing (Joy, Grief, Calm, etc.)
- **Real-time VAC Display** with progress bars
- **Emotional Input** (text analysis via Listener API)
- **Observer Polling** (real-time emotional state)
- **Responsive Design** (desktop + tablet)

### Integration

- **Observer API** - Fetch current emotional state
- **Listener API** - Analyze text for VAC coordinates
- **Versor API** - Quaternion conversions (via Observer)

---

## 🧪 Testing

### Continuous Integration & Quality

We enforce strict quality standards:

- **100% Test Coverage** required (branches, functions, lines, statements)
- **Zero Linting Errors** (ESLint + Prettier)
- **Zero TypeScript Errors**

Run the full quality check suite:

```bash
# Run from project root
./infra/scripts/check-typescript-quality.sh
```

### Run Tests Manually

```bash
# Test shared package
cd shared && npm test

# Test web package
cd web && npm test
```

**Current Status:**

- ✅ 100% Coverage enforced
- ✅ All utilities validated

---

## 📦 Packages

### @love/experience-shared

Platform-agnostic utilities and business logic:

- VAC types & CANONICAL_EMOTIONS (9 reference emotions)
- Quaternion math (slerp, angular distance, conversions)
- 24 easing functions for animations
- Observer & Listener API clients with retry logic

See `shared/README.md` for API documentation.

### web

Next.js 16 web application:

- React 19.2 + React Three Fiber alpha (cutting edge!)
- Three.js r170 + Zustand 5
- Tailwind CSS 4 + TypeScript 5
- Custom GLSL shaders

See `web/README.md` for setup and deployment.

---

## 🏗️ Architecture

### Monorepo Benefits

- **Shared Code:** Single source of truth for VAC model
- **Type Safety:** Shared TypeScript types across platforms
- **Easy Testing:** Portable test suite
- **Future Ready:** Foundation for iOS/Android versions

### Tech Stack

**Web:**

- Next.js 16 (Turbopack)
- React 19.2
- React Three Fiber 9.0.0-alpha
- Three.js r170
- Zustand 5
- Tailwind CSS 4

**Shared:**

- TypeScript 5.3
- Platform-agnostic JavaScript
- Standard fetch API

---

## 📚 Documentation

### Migration Guides

- `PLATFORM_MIGRATION_PLAN.md` - Overall strategy
- `SHARED_CODE_EXTRACTION_PLAN.md` - How shared package was built
- `WEB_VERSION_IMPLEMENTATION_PLAN.md` - How web version was built
- `MIGRATION_HANDOFF.md` - Complete handoff guide
- `SESSION_SUMMARY_2025-12-04_MIGRATION.md` - Migration session notes

### Technical Specs

- `docs/` - 13 detailed specification documents
- `shared/README.md` - Shared package API
- `web/README.md` - Web setup & deployment

---

## 🎯 Visual Language

The Soul Sphere uses VAC to create a unique emotional fingerprint:

| Axis           | Visual Property | Range                                       |
| -------------- | --------------- | ------------------------------------------- |
| **Valence**    | Color           | Crimson (negative) → Cyan (positive)        |
| **Arousal**    | Geometry        | Smooth (calm) → Spiky (chaotic)             |
| **Connection** | Glow            | Opaque (disconnected) → Glowing (connected) |

**Critical Innovation:** The Connection axis distinguishes:

- Grief (connected) vs Despair (disconnected)
- Compassion (connected) vs Pity (disconnected)

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
cd web
vercel deploy
```

### Docker

```bash
cd web
docker build -t love-experience-web .
docker run -p 3000:3000 love-experience-web
```

### L.O.V.E. Stack Integration

The Experience web UI is integrated into `infra/run-love-stack.sh` and starts automatically after backend API health checks.

---

## 🔧 Development

### Build Commands

```bash
# Build shared package
npm run build:shared

# Build web version
npm run build:web

# Build everything
npm run build:all

# Clean and reinstall
npm run reinstall
```

### Troubleshooting

**Issue: TypeScript errors in IDE**

- Expected - R3F JSX types extend at runtime
- Code will work despite IDE warnings

**Issue: GLSL shader loading**

- See `web/TURBOPACK_GLSL_ISSUE.md` for solutions
- Current: Using Turbopack with custom config

**Issue: Port 3000 occupied**

- `run-love-stack.sh` handles this automatically
- Uses port 3001 as fallback

---

## ✨ What Makes This Special

This is the **first interactive 3D visualization** using the VAC model with the Connection axis - allowing nuanced distinction between similar emotions that differ in relational quality.

**Not a mood tracker. A mathematical instrument for mapping the human soul.** ✨

---

## 📊 Project Stats

- **28 files** implementing complete functionality
- **~1,400 lines** of clean, documented code
- **43/43 tests** passing in shared package
- **React 19 + R3F alpha** - cutting edge web tech
- **~1 hour** migration from React Native to web

---

## 🤝 Contributing

1. **Shared Package:** Add utilities to `shared/src/`
2. **Web Components:** Add to `web/components/`
3. **Documentation:** Update relevant README files
4. **Testing:** Ensure tests pass before committing

---

## 📄 License

UNLICENSED - Internal L.O.V.E. Project use only

---

**Built with ❤️ using Next.js, React Three Fiber, and custom GLSL shaders**
