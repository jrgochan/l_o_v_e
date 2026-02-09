# Experience Module - Implementation Plan

## Status Overview

**Current Phase**: Phase 1 - Foundation & Proof of Concept (IN PROGRESS)
**Started**: December 3, 2025
**Target Completion**: 4 weeks (Phases 1-4)

---

## Phase 1: Foundation & Proof of Concept ⏳

### Status: 80% Complete

**Goal**: Validate that React Three Fiber works on mobile with correct configuration

### Completed ✅
- [x] Created package.json with locked React 18.2.0
- [x] Configured app.json with New Architecture disabled
- [x] Set up TypeScript with path aliases
- [x] Configured Babel with module-resolver
- [x] Set up Metro bundler for GLSL shader loading
- [x] Created GLSL transformer for Metro
- [x] Created rotating cube test in App.tsx
- [x] Created comprehensive SETUP.md guide
- [x] Set up .gitignore

### Remaining ⏳
- [ ] Run `npm install` to install dependencies
- [ ] Test app on iOS Simulator
- [ ] Verify 60fps rendering
- [ ] Confirm no New Architecture errors
- [ ] Document any issues encountered

### Next Actions

1. **Install Dependencies**:
   ```bash
   cd /Users/jrgochan/code/gitlab.com/l_o_v_e/experience
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Run on iOS**:
   ```bash
   npm run ios
   ```

4. **Verify Success Criteria**:
   - [ ] Rotating cyan cube visible
   - [ ] ~60fps frame rate
   - [ ] No console errors
   - [ ] Status bar shows green checks

### Risk Assessment
- **Low Risk**: Project structure is standard Expo/React Native
- **Medium Risk**: Version conflicts (React 18 vs 19)
- **Mitigation**: All versions locked in package.json

---

## Phase 2: Soul Sphere Core Visualization 📋

### Status: Not Started

**Goal**: Implement the Soul Sphere with all VAC visual mappings

### Tasks to Complete

#### 2.1 Create Directory Structure
```bash
mkdir -p src/features/experience/components/SoulSphere
mkdir -p src/features/experience/shaders
mkdir -p src/features/experience/store
mkdir -p src/features/experience/hooks
mkdir -p src/types
mkdir -p src/utils
```

#### 2.2 Implement Soul Sphere Geometry
- [ ] Create `src/features/experience/components/SoulSphere/index.tsx`
- [ ] Implement IcosahedronGeometry with detail=20
- [ ] Add device performance detection
- [ ] Implement adaptive detail levels (10/15/20)

#### 2.3 Create Shaders
- [ ] Create `src/features/experience/shaders/vertex.glsl`
  - Simplex 3D noise function
  - Arousal → displacement mapping
  - Time-based "breathing" animation
- [ ] Create `src/features/experience/shaders/fragment.glsl`
  - Valence → color gradient (crimson to cyan)
  - Connection → Fresnel glow effect
  - Alpha blending for translucency

#### 2.4 Implement Material System
- [ ] Create ShaderMaterial with custom uniforms
- [ ] Wire VAC values to shader uniforms
- [ ] Implement color interpolation
- [ ] Add Fresnel effect for connection glow

#### 2.5 Create Debug Interface
- [ ] Create debug UI with sliders for V/A/C
- [ ] Add real-time FPS display
- [ ] Add VAC value display
- [ ] Add performance metrics

#### 2.6 Test Canonical Emotions
- [ ] Joy [0.9, 0.7, 0.8] → Cyan, spiky, glowing
- [ ] Shame [-0.9, -0.1, -1.0] → Crimson, smooth, opaque
- [ ] Grief [-0.9, -0.4, 0.5] → Crimson, smooth, subtle glow ✨
- [ ] Document visual appearance of each

### Success Criteria
- [ ] All three VAC axes visually distinguishable
- [ ] Smooth transitions between states
- [ ] Maintains 60fps with detail=20 on iPhone 11
- [ ] Shaders compile without errors on iOS/Android

### Estimated Duration: 1 week

---

## Phase 3: Animation & State Management 📋

### Status: Not Started

**Goal**: Implement quaternion-based rotation and smooth transitions

### Tasks to Complete

#### 3.1 Quaternion Utilities
- [ ] Create `src/utils/quaternion.ts`
  - VAC → Quaternion conversion
  - Angular distance calculation
  - SLERP interpolation
  - Unit tests for quaternion math

#### 3.2 Zustand Store
- [ ] Create `src/features/experience/store/useExperienceStore.ts`
- [ ] Define store interface:
  ```typescript
  interface ExperienceStore {
    targetVAC: [number, number, number];
    targetQuaternion: [number, number, number, number];
    currentVAC: [number, number, number];
    currentQuaternion: [number, number, number, number];
    angularVelocity: number;
    elasticity: number;
    hapticMode: 'normal' | 'quiet';
    setTarget: (vac, quaternion) => void;
    setHapticMode: (mode) => void;
  }
  ```

#### 3.3 Animation Loop
- [ ] Implement SLERP in useFrame hook
- [ ] Add easing functions for natural feel
- [ ] Implement constant angular velocity
- [ ] Add animation completion detection

#### 3.4 Observer API Integration
- [ ] Create `src/features/experience/services/observerApi.ts`
- [ ] Implement GET `/observer/current/{user_id}`
- [ ] Add polling mechanism (every 5 seconds)
- [ ] Add error handling and retry logic
- [ ] Create mock API for testing

#### 3.5 Haptic Feedback
- [ ] Install react-native-haptics
- [ ] Create `src/features/experience/components/HapticManager.tsx`
- [ ] Implement three patterns:
  - Thud (high angular velocity)
  - Heartbeat (stable state)
  - Flooding (chaos detection)
- [ ] Sync haptics to SLERP midpoint

#### 3.6 Offline Support
- [ ] Implement state caching with AsyncStorage
- [ ] Handle offline mode gracefully
- [ ] Add connection status indicator

### Success Criteria
- [ ] Sphere rotates smoothly between emotional states
- [ ] No gimbal lock (quaternion advantage proven)
- [ ] Real data from Observer API renders correctly
- [ ] Haptic feedback feels natural
- [ ] Works offline with cached state

### Estimated Duration: 1 week

---

## Phase 4: Polish, Accessibility & Optimization 📋

### Status: Not Started

**Goal**: Production-ready app with accessibility features

### Tasks to Complete

#### 4.1 Accessibility Features
- [ ] Implement colorblind mode (blue-orange palette)
- [ ] Add reduced motion mode
- [ ] Implement haptic intensity controls
- [ ] Test with accessibility tools

#### 4.2 Performance Optimization
- [ ] Implement on-demand rendering (frameloop="demand")
- [ ] Add idle detection to pause frame loop
- [ ] Fix Three.js memory leaks (proper disposal)
- [ ] Profile battery usage
- [ ] Optimize for low-end devices

#### 4.3 Error Handling
- [ ] Add friendly error messages
- [ ] Implement error boundaries
- [ ] Add crash reporting (optional)
- [ ] Create fallback UI for errors

#### 4.4 User Experience
- [ ] Add loading states
- [ ] Create connection status indicator
- [ ] Implement settings screen
- [ ] Add dark mode (already default)
- [ ] Polish animations and transitions

#### 4.5 Testing
- [ ] Write unit tests for quaternion utils
- [ ] Write integration tests with mock API
- [ ] Test on multiple iOS devices
- [ ] Test on multiple Android devices
- [ ] Create testing documentation

### Success Criteria
- [ ] Accessible to users with disabilities
- [ ] 60fps maintained over extended sessions
- [ ] Battery drain < 10% per hour
- [ ] Comprehensive error handling
- [ ] Ready for beta testing

### Estimated Duration: 1 week

---

## Integration Points

### With Observer Module
- **Endpoint**: `GET http://localhost:8000/observer/current/{user_id}`
- **Response**:
  ```json
  {
    "user_id": "test-user",
    "timestamp": "2025-12-03T18:00:00Z",
    "vac_vector": [0.9, 0.7, 0.8],
    "quaternion": {"w": 0.68, "x": 0.50, "y": 0.39, "z": 0.45},
    "dominant_emotion": {"name": "Joy", "vac": [0.9, 0.7, 0.8]},
    "metrics": {"elasticity": 0.3, "rigidity": 0.15}
  }
  ```
- **Polling**: Every 5 seconds (Phase 3)
- **WebSocket**: Optional upgrade in Phase 4

### With Versor Module
- **Direct Use**: Not required (Observer already calls Versor)
- **Optional**: Could call directly for local quaternion calculation
- **Endpoint**: `POST http://localhost:8001/versor/calculate`

---

## Technical Decisions Made

### ✅ React Version
- **Decision**: React 18.2.0 (NOT React 19)
- **Rationale**: R3F v8 requires React 18; React 19 not stable
- **Status**: Locked in package.json

### ✅ R3F Version
- **Decision**: @react-three/fiber v8.17.0 (NOT v9)
- **Rationale**: v9 requires React 19 which is unstable
- **Status**: Locked in package.json

### ✅ New Architecture
- **Decision**: Disabled (Legacy Bridge mode)
- **Rationale**: expo-gl incompatible with Fabric renderer
- **Status**: Configured in app.json with explicit disable

### ✅ GLSL Loading
- **Decision**: Custom Metro transformer
- **Rationale**: React Native doesn't natively support .glsl imports
- **Status**: Implemented in glsl-transformer.js

### ✅ State Management
- **Decision**: Zustand (not Redux/Context)
- **Rationale**: Transient updates without React re-renders
- **Status**: Dependency added, implementation pending

### ✅ Haptics Library
- **Decision**: react-native-haptics (not expo-haptics)
- **Rationale**: 2.13x faster, better iOS integration
- **Status**: Dependency added, implementation pending

---

## Files Created (Phase 1)

```
experience/
├── package.json              ✅ React 18.2.0 locked
├── app.json                  ✅ New Architecture disabled
├── tsconfig.json             ✅ Path aliases configured
├── babel.config.js           ✅ Module resolver added
├── metro.config.js           ✅ GLSL support configured
├── glsl-transformer.js       ✅ GLSL → string transformer
├── .gitignore                ✅ Standard patterns
├── App.tsx                   ✅ Rotating cube test
├── SETUP.md                  ✅ Setup instructions
└── IMPLEMENTATION_PLAN.md    ✅ This file
```

---

## Files to Create (Phases 2-4)

```
src/
├── features/
│   └── experience/
│       ├── components/
│       │   ├── SoulSphere/
│       │   │   └── index.tsx              (Phase 2)
│       │   └── HapticManager.tsx          (Phase 3)
│       ├── shaders/
│       │   ├── vertex.glsl                (Phase 2)
│       │   └── fragment.glsl              (Phase 2)
│       ├── store/
│       │   └── useExperienceStore.ts      (Phase 3)
│       ├── services/
│       │   └── observerApi.ts             (Phase 3)
│       └── hooks/
│           └── useEmotionalState.ts       (Phase 3)
├── types/
│   └── experience.d.ts                    (Phase 2)
└── utils/
    └── quaternion.ts                      (Phase 3)
```

---

## Critical Tests

### Semantic Validation Tests
1. **Joy Test**: [0.9, 0.7, 0.8] → Cyan, spiky, glowing
2. **Shame Test**: [-0.9, -0.1, -1.0] → Crimson, smooth, opaque
3. **Grief vs Despair**: Grief has subtle glow (positive connection)
4. **Compassion vs Pity**: Visual distinction via connection axis

### Performance Tests
1. **60fps Test**: Maintain on iPhone 11 with detail=20
2. **Battery Test**: < 10% drain per hour active use
3. **Long-Running Test**: No memory leaks over 10+ minutes
4. **Idle Test**: Frame loop pauses correctly

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| React 19 auto-install | Medium | High | Locked versions, --save-exact |
| New Architecture enabled | Low | High | Explicit disable in multiple places |
| 60fps not achievable | Medium | Medium | Adaptive detail levels |
| Shader compilation failure | Low | High | Test early on real devices |
| Battery drain excessive | Medium | Medium | On-demand rendering |

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] App builds and runs
- [ ] Rotating cube at 60fps
- [ ] No New Architecture errors

### Phase 2 (Soul Sphere)
- [ ] All VAC axes visually distinct
- [ ] Canonical emotions render correctly
- [ ] 60fps maintained

### Phase 3 (Animation)
- [ ] Smooth SLERP transitions
- [ ] Observer API integration working
- [ ] Haptics feel natural

### Phase 4 (Production)
- [ ] Accessible to all users
- [ ] Performance targets met
- [ ] Ready for beta testing

---

## Next Immediate Steps

1. **Run npm install** (see SETUP.md)
2. **Test rotating cube** on iOS Simulator
3. **Verify 60fps** rendering
4. **Document results** in a new HANDOFF.md
5. **Begin Phase 2** (Soul Sphere implementation)

---

**Status**: Foundation complete, ready for npm install and testing! 🚀
