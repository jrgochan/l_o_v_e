# Experience Module - Comprehensive Testing Plan

**Version:** 1.0  
**Date:** 2025-12-04  
**Target Coverage:** 80%  
**Status:** In Progress

## Overview

This document outlines the complete testing strategy for the Experience module, covering unit tests, component tests, shader validation, integration tests, and E2E tests.

## Requirements Summary

✅ **Functional tests** (no pixel-perfect visual regression)  
✅ **80% code coverage** minimum  
✅ **Separate .glsl files** (with inline backup)  
✅ **E2E tests** required  
✅ **Soul Sphere centering verification**

---

## Test Structure

```
experience/__tests__/
├── unit/                          # Pure function/utility tests
│   ├── quaternion.test.ts        # Quaternion math operations
│   ├── easing.test.ts            # Easing functions
│   ├── logger.test.ts            # Logging utilities
│   ├── useExperienceStore.test.ts # Zustand store
│   ├── listenerApi.test.ts       # Listener API client
│   └── observerApi.test.ts       # Observer API client
├── components/                    # React component tests
│   ├── EmotionalInput.test.tsx   # Text input UI
│   ├── App.test.tsx              # Main app component
│   ├── SoulSphere.test.tsx       # 3D Soul Sphere
│   └── GLCanvas.test.tsx         # GL rendering (CENTERING!)
├── shaders/                       # Shader compilation/validation
│   └── shaderValidation.test.ts  # GLSL validation
├── integration/                   # Multi-component flows
│   ├── api-integration.test.ts   # (EXISTS) API connectivity
│   └── stateFlow.test.ts         # State update flows
└── e2e/                          # End-to-end user flows
    └── userFlow.test.e2e.ts      # Complete user journeys
```

---

## Phase 1: Foundation Tests (HIGH PRIORITY)

### ✅ Status: Not Started

### 1.1 Quaternion Utilities (`quaternion.test.ts`)

**Purpose:** Ensure mathematical accuracy for emotional state rotations

**Test Cases:**
- ✅ `vacToQuaternion()` converts VAC correctly
- ✅ `slerp()` interpolates smoothly between quaternions
- ✅ `angularDistance()` calculates rotation angles
- ✅ `normalize()` maintains unit length
- ✅ `multiply()` combines rotations correctly
- ✅ `conjugate()` inverts rotations
- ✅ `angularVelocity()` computes rotation speed
- ✅ `isValid()` detects invalid quaternions
- ✅ Edge cases: zero vectors, identity quaternions, near-identical values
- ✅ Numerical precision edge cases

**Dependencies:** None (pure functions)

### 1.2 Easing Functions (`easing.test.ts`)

**Purpose:** Verify smooth animation transitions

**Test Cases:**
- ✅ All easing functions return values in [0, 1] range
- ✅ All functions start at 0 when t=0
- ✅ All functions end at 1 when t=1
- ✅ No discontinuities (smoothness)
- ✅ `easedLerp()` applies easing correctly
- ✅ Emotional easing presets work as expected
- ✅ `getEasingByName()` returns correct function
- ✅ Special functions (smoothStep, smootherStep, bounce, elastic)

**Dependencies:** None (pure functions)

### 1.3 Logger Utilities (`logger.test.ts`)

**Purpose:** Verify logging system works correctly

**Test Cases:**
- ✅ Logger outputs at correct levels (info, debug, error)
- ✅ Shader logger logs shader compilation events
- ✅ Log grouping works correctly
- ✅ FPS monitor tracks frame rates (if implemented)
- ✅ Logger can be silenced/configured

**Dependencies:** None

### 1.4 State Management (`useExperienceStore.test.ts`)

**Purpose:** Ensure Zustand store manages state correctly

**Test Cases:**
- ✅ Initial state is neutral (VAC=[0,0,0], Q=[1,0,0,0])
- ✅ `setTarget()` updates targetVAC and targetQuaternion
- ✅ `updateCurrent()` updates currentVAC and currentQuaternion
- ✅ `setAngularVelocity()` updates velocity and elasticity
- ✅ `setIsAnimating()` toggles animation flag
- ✅ `setHapticMode()` switches haptic modes
- ✅ `setColorblindMode()` toggles colorblind palette
- ✅ `setReducedMotion()` enables/disables reduced motion
- ✅ `reset()` returns to neutral state
- ✅ Selectors return correct values
- ✅ CANONICAL_EMOTIONS contains all expected emotions

**Dependencies:** `zustand`

### 1.5 Listener API Client (`listenerApi.test.ts`)

**Purpose:** Test API client and data transformations

**Test Cases:**
- ✅ `getListenerClient()` creates client with correct baseUrl
- ✅ `analyzeText()` sends request with correct parameters
- ✅ `analyzeText()` returns expected response structure
- ✅ `convertListenerVAC()` converts {v,a,c} to [v,a,c]
- ✅ Error handling for network failures
- ✅ Error handling for invalid responses
- ✅ Timeout handling

**Dependencies:** Mock fetch API

### 1.6 Observer API Client (`observerApi.test.ts`)

**Purpose:** Test Observer integration and polling

**Test Cases:**
- ✅ `getObserverClient()` creates client correctly
- ✅ `getCurrentState()` fetches user state
- ✅ `healthCheck()` verifies API availability
- ✅ `convertVAC()` transforms data correctly
- ✅ Error handling for disconnected API
- ✅ `useObserverPolling` hook polls at correct interval
- ✅ Mock mode returns expected data
- ✅ Polling can be enabled/disabled

**Dependencies:** Mock fetch API, React Testing Library

---

## Phase 2: Component Tests (MEDIUM PRIORITY)

### ✅ Status: Not Started

### 2.1 Emotional Input Component (`EmotionalInput.test.tsx`)

**Purpose:** Verify user input UI works correctly

**Test Cases:**
- ✅ Renders text input and button
- ✅ Text input accepts user input
- ✅ Analyze button triggers API call
- ✅ Loading state shows spinner
- ✅ Success shows emotion result
- ✅ Result displays emotion name, category, confidence, VAC
- ✅ Example buttons populate input field
- ✅ Error handling shows error message
- ✅ Callbacks (onAnalysisComplete, onError) fire correctly
- ✅ Empty input shows validation error

**Dependencies:** `@testing-library/react-native`, mock API

### 2.2 Main App Component (`App.test.tsx`)

**Purpose:** Verify main app UI and state interactions

**Test Cases:**
- ✅ App renders without crashing
- ✅ Soul Sphere canvas is visible
- ✅ Emotion buttons render
- ✅ Clicking emotion button updates VAC display
- ✅ Polling toggle enables/disables Observer polling
- ✅ Mock/Real API toggle switches modes
- ✅ Text input toggle shows/hides EmotionalInput
- ✅ Connection status displays correctly
- ✅ VAC display updates when state changes

**Dependencies:** `@testing-library/react-native`, mock components

### 2.3 Soul Sphere Component (`SoulSphere.test.tsx`)

**Purpose:** Test 3D visualization component

**Test Cases:**
- ✅ Renders without errors
- ✅ Creates IcosahedronGeometry with correct detail level
- ✅ Initializes ShaderMaterial with correct uniforms
- ✅ Uniforms match targetVAC from store
- ✅ Animation loop updates uniforms over time
- ✅ Easing function is applied during transitions
- ✅ Colorblind mode switches colors (crimson/cyan vs blue/orange)
- ✅ Different detail levels (10, 15, 20) render
- ✅ Transition duration is respected
- ✅ Gentle rotation is applied

**Dependencies:** `@react-three/fiber`, `@react-three/test-renderer`, mock Three.js

### 2.4 GL Canvas Component (`GLCanvas.test.tsx`)

**Purpose:** Verify GL rendering and **SOUL SPHERE CENTERING** ⭐

**Test Cases:**
- ✅ GL context is created successfully
- ✅ Renderer is initialized with correct dimensions
- ✅ Camera position is set to [0, 0, 5]
- ✅ **Camera lookAt(0, 0, 0) - looks at origin** ⭐
- ✅ **Soul Sphere is positioned at [0, 0, 0] - origin** ⭐
- ✅ **Viewport is centered on sphere** ⭐
- ✅ Scene contains Soul Sphere mesh
- ✅ Lights are added to scene
- ✅ Render loop starts
- ✅ Frame counter increments
- ✅ Store updates propagate to uniforms
- ✅ Error handling for GL context failure

**Dependencies:** Mock `expo-gl`, Three.js

---

## Phase 3: Shader Tests (MEDIUM PRIORITY)

### ✅ Status: Not Started

### 3.1 Shader Validation (`shaderValidation.test.ts`)

**Purpose:** Ensure GLSL shaders compile and have correct uniforms

**Test Cases:**
- ✅ Inline vertex shader is a valid string
- ✅ Inline fragment shader is a valid string
- ✅ Separate .glsl vertex shader loads correctly
- ✅ Separate .glsl fragment shader loads correctly
- ✅ Shaders compile without errors in Three.js
- ✅ Vertex shader declares required uniforms (uTime, uArousal, etc.)
- ✅ Fragment shader declares required uniforms (uValence, uConnection, etc.)
- ✅ Varyings are passed correctly (vNormal, vWorldPosition)
- ✅ Simplex noise function is defined
- ✅ No GLSL syntax errors

**Dependencies:** Three.js, mock GL context

---

## Phase 4: Integration Tests (LOWER PRIORITY)

### ✅ Status: Partially Complete (api-integration.test.ts exists)

### 4.1 API Integration (`api-integration.test.ts`)

**Status:** ✅ Already exists, may need enhancements

**Test Cases:**
- ✅ Listener API analyzes text and returns VAC
- ✅ Observer API fetches current state
- ✅ VAC format consistency across modules
- ✅ End-to-end flow: Listener → Observer → State
- ✅ Edge cases for VAC values

### 4.2 State Flow Integration (`stateFlow.test.ts`)

**Purpose:** Test complete data flow through the app

**Test Cases:**
- ✅ User enters text → Listener API → Store updates → Soul Sphere updates
- ✅ Observer polling → State updates → Visualization changes
- ✅ Manual emotion selection → Store updates → Sphere responds
- ✅ Transitions between emotional states are smooth
- ✅ Multiple rapid state changes don't break animation
- ✅ Colorblind mode affects entire pipeline
- ✅ Reduced motion slows transitions

**Dependencies:** Multiple components, mocked APIs

---

## Phase 5: E2E Tests (REQUIRED)

### ✅ Status: Not Started

### 5.1 User Flow E2E (`userFlow.test.e2e.ts`)

**Purpose:** Test complete user journeys in real environment

**Test Cases:**
- ✅ App launches successfully
- ✅ Soul Sphere is visible and centered on screen
- ✅ User can select preset emotions
- ✅ Soul Sphere changes color/shape when emotion changes
- ✅ User can toggle text input
- ✅ User can enter text and analyze emotion
- ✅ Result displays correctly
- ✅ User can toggle polling modes
- ✅ User can switch between mock and real API
- ✅ App handles API errors gracefully
- ✅ App works on different screen sizes (phone, tablet)

**Tools:** Detox or Expo's built-in E2E testing

**Dependencies:** Full app environment, may need real or mocked APIs

---

## Shader Refactoring Plan

### Current State
- ✅ Shaders are inline in `inlineShaders.ts`
- ✅ Working and stable

### Proposed State
- ✅ Extract to `vertex.glsl` and `fragment.glsl`
- ✅ Load via Metro transformer (fix `glsl-transformer.js`)
- ✅ Keep `inlineShaders.ts` as backup
- ✅ Add conditional loading: try .glsl files, fallback to inline

### Files to Create/Modify
1. Fix `experience/glsl-transformer.js` transformer
2. Add proper TypeScript declarations for .glsl imports
3. Update `metro.config.js` if needed
4. Create separate shader files (move from inline)
5. Update SoulSphere and GLCanvas to use new imports
6. Add tests to verify both loading methods work

---

## Dependencies to Install

```bash
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  @react-three/test-renderer \
  detox \
  detox-expo-helpers
```

---

## Progress Tracking

### Phase 1: Foundation Tests ✅ COMPLETE (230 tests)
- [x] quaternion.test.ts (44 tests passing)
- [x] easing.test.ts (47 tests passing)
- [x] logger.test.ts (18 tests passing)
- [x] useExperienceStore.test.ts (33 tests passing)
- [x] listenerApi.test.ts (44 tests passing)
- [x] observerApi.test.ts (44 tests passing)
  - Fixed infinite loop issue with `jest.advanceTimersToNextTimerAsync()`

### Phase 2: Component Tests (IN PROGRESS - 68/~120 tests)
- [x] App.test.tsx (33 tests passing) ✅
  - Rendering verification
  - State toggles (polling, mock data, camera controls)
  - Emotion selection and VAC display
  - Text input integration
  - Connection status
- [x] EmotionalInput.test.tsx (35 tests passing) ✅
  - Text input handling
  - Example button population
  - API integration and analysis flow
  - Result display with VAC coordinates
  - Error handling and retry logic
  - Props and configuration
- [ ] SoulSphere.test.tsx
- [ ] GLCanvas.test.tsx (with centering tests!)

### Phase 3: Shader Tests
- [ ] shaderValidation.test.ts
- [ ] Separate .glsl files
- [ ] Fallback loading mechanism

### Phase 4: Integration Tests
- [x] api-integration.test.ts (exists)
- [ ] stateFlow.test.ts

### Phase 5: E2E Tests
- [ ] userFlow.test.e2e.ts
- [ ] Detox setup

---

## Coverage Goals

| Category | Target | Priority |
|----------|--------|----------|
| Utilities | 90%+ | High |
| State Management | 85%+ | High |
| Components | 80%+ | Medium |
| Shaders | 70%+ | Medium |
| Integration | 75%+ | Medium |
| E2E | N/A (functional) | High |
| **Overall** | **80%+** | **Required** |

---

## Next Steps

1. ✅ Install testing dependencies
2. ✅ Start with Phase 1 (Foundation Tests)
3. ✅ Move to Phase 2 (Component Tests) - includes centering verification
4. ✅ Implement shader refactoring and tests
5. ✅ Enhance integration tests
6. ✅ Set up and run E2E tests
7. ✅ Verify 80% coverage achieved
8. ✅ Document testing procedures

---

## Notes

- **Soul Sphere Centering:** This is a critical test requirement. GLCanvas.test.tsx will specifically verify the sphere is positioned at [0,0,0] and camera is looking at origin.
- **Inline vs Separate GLSL:** We'll support both methods with automatic fallback.
- **E2E Environment:** May need to run tests against a local dev environment with mocked or real APIs.
- **Coverage Exclusions:** May exclude test files, type definitions, and generated code from coverage calculations.

---

**Last Updated:** 2025-12-04  
**Status:** Ready to begin implementation
