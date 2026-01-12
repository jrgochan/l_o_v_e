# Experience Module - Platform Migration Plan

**Status:** PROPOSED  
**Date:** December 4, 2025  
**Objective:** Migrate from React Native to platform-specific applications  
**Timeline:** 8-12 weeks for complete migration

---

## 🎯 Executive Summary

This plan proposes splitting the Experience module from a single React Native codebase into three platform-specific applications:

- **Web**: Next.js 15 + React Three Fiber v9
- **iOS**: SwiftUI + RealityKit
- **Android**: Jetpack Compose + Filament

**Benefits:**
- ✅ Eliminates React Native rendering limitations
- ✅ Native performance (60-120fps guaranteed)
- ✅ Best-in-class developer experience per platform
- ✅ Access to latest platform features
- ✅ Future-proof for AR/VR/spatial computing

**Trade-offs:**
- ❌ 3x codebases to maintain
- ❌ ~40% code reuse (shared TypeScript core)
- ❌ Longer initial development time

---

## 📁 Proposed Directory Structure

```
experience/
├── shared/                      # Shared TypeScript code (~40% reuse)
│   ├── core/                   
│   │   ├── vac.ts              # VAC model, CANONICAL_EMOTIONS
│   │   ├── quaternion.ts       # Math utilities (slerp, angular distance)
│   │   └── easing.ts           # Animation easing functions
│   ├── api/
│   │   ├── observer.ts         # Observer API client
│   │   └── listener.ts         # Listener API client
│   ├── types/
│   │   └── index.ts            # Shared type definitions
│   └── package.json            # Shared as npm workspace
│
├── web/                         # Next.js 15 Web Application
│   ├── app/                    # Next.js App Router
│   ├── components/
│   │   └── SoulSphere.tsx      # R3F component
│   ├── shaders/
│   │   ├── vertex.glsl
│   │   └── fragment.glsl
│   ├── package.json
│   └── README.md
│
├── ios/                         # Native iOS Application
│   ├── LOVEExperience.xcodeproj/
│   ├── LOVEExperience/
│   │   ├── Views/
│   │   │   └── SoulSphereView.swift
│   │   ├── Models/
│   │   │   └── VAC.swift
│   │   ├── Shaders/
│   │   │   └── SoulSphere.metal
│   │   └── LOVEExperienceApp.swift
│   ├── Package.swift           # Swift Package Manager
│   └── README.md
│
├── android/                     # Native Android Application
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── kotlin/
│   │   │   │   ├── ui/
│   │   │   │   │   └── SoulSphereView.kt
│   │   │   │   ├── models/
│   │   │   │   │   └── VAC.kt
│   │   │   │   └── MainActivity.kt
│   │   │   └── res/
│   │   │       └── raw/
│   │   │           └── soul_sphere_shader.mat
│   ├── build.gradle.kts
│   └── README.md
│
└── docs/
    ├── MIGRATION_GUIDE.md      # This document
    ├── PLATFORM_COMPARISON.md  # Feature parity matrix
    └── SHADER_TRANSLATION.md   # GLSL→Metal→SPIR-V guide
```

---

## 🌐 Web Application (experience/web/)

### Tech Stack

**Framework:** Next.js 15.0+ (App Router)
- React 19 support
- Server Components for API calls
- Built-in TypeScript
- Excellent DX with Fast Refresh

**3D Engine:** React Three Fiber v9 + Three.js r170+
- Pure WebGL, no compatibility shims
- Your existing GLSL shaders work as-is
- Mature ecosystem (drei, postprocessing, cannon)

**State Management:** Zustand 5.0+
- Share store definition from `../shared/core/`
- Transient updates for 60fps animation
- DevTools support

**Styling:** Tailwind CSS 4.0
- Utility-first CSS
- Dark mode built-in
- Responsive design

**Testing:** Vitest + React Testing Library
- Faster than Jest
- Native ESM support
- Component testing

### Project Setup

```bash
cd experience
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd web
npm install three @react-three/fiber @react-three/drei zustand
npm install -D @types/three vitest @testing-library/react
```

### Key Files to Create

**1. Soul Sphere Component** (`web/components/SoulSphere.tsx`)
```typescript
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVACStore } from '@/stores/vacStore';
import vertexShader from '../shaders/vertex.glsl';
import fragmentShader from '../shaders/fragment.glsl';

export function SoulSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const targetVAC = useVACStore(state => state.targetVAC);
  
  useFrame((state, delta) => {
    if (!materialRef.current) return;
    
    // Your existing animation logic
    materialRef.current.uniforms.uTime.value += delta;
    // ... lerp uniforms toward targetVAC
  });
  
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 20]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
        uniforms={{ /* your uniforms */ }}
      />
    </mesh>
  );
}
```

**2. Main Page** (`web/app/page.tsx`)
```typescript
'use client';

import { Canvas } from '@react-three/fiber';
import { SoulSphere } from '@/components/SoulSphere';

export default function Home() {
  return (
    <main className="h-screen bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <SoulSphere />
      </Canvas>
    </main>
  );
}
```

### Migration Steps

1. **Week 1**: Setup Next.js project, migrate shared utilities
2. **Week 2**: Port Soul Sphere component, test rendering
3. **Week 3**: Add UI controls, API integration
4. **Week 4**: Testing, optimization, deployment

### Deployment

**Vercel** (recommended):
```bash
vercel deploy
```

**Alternative:** Docker + self-hosted

---

## 📱 iOS Application (experience/ios/)

### Tech Stack

**Language:** Swift 6.0
- Modern concurrency (async/await)
- Observation framework
- Macro system
- Strict concurrency checking

**UI Framework:** SwiftUI 5.0
- Declarative UI
- Native animations
- State management via @Observable
- Combine integration

**3D Engine:** RealityKit 2.0 (Primary) or SceneKit (Fallback)

**Why RealityKit?**
- ✅ Metal-optimized (Apple's GPU API)
- ✅ Shader Graph for visual shader editing
- ✅ ARKit integration (future spatial computing)
- ✅ Haptic Engine integration
- ✅ 120fps on ProMotion displays

**State:** Swift Concurrency + Observation Framework

**Testing:** XCTest + Swift Testing (new in Swift 6)

### Project Setup

```bash
# Using Xcode
open -a Xcode
# File → New → Project → iOS → App
# Name: LOVEExperience
# Interface: SwiftUI
# Language: Swift
```

**Add Dependencies** (Package.swift):
```swift
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0"),
]
```

### Key Files to Create

**1. VAC Model** (`ios/LOVEExperience/Models/VAC.swift`)
```swift
import Foundation

struct VACVector: Codable {
    let valence: Double    // -1.0 to 1.0
    let arousal: Double    // -1.0 to 1.0
    let connection: Double // -1.0 to 1.0
    
    static let neutral = VACVector(valence: 0, arousal: 0, connection: 0)
    static let joy = VACVector(valence: 0.9, arousal: 0.7, connection: 0.8)
}

// Quaternion utilities
struct Quaternion {
    let w, x, y, z: Double
    
    func slerp(to target: Quaternion, t: Double) -> Quaternion {
        // SLERP implementation
    }
}
```

**2. Soul Sphere View** (`ios/LOVEExperience/Views/SoulSphereView.swift`)
```swift
import SwiftUI
import RealityKit

struct SoulSphereView: View {
    @State private var vac = VACVector.joy
    
    var body: some View {
        RealityView { content in
            // Create sphere entity
            let sphere = ModelEntity(
                mesh: .generateSphere(radius: 1.5),
                materials: [CustomMaterial(vac: vac)]
            )
            
            content.add(sphere)
        } update: { content in
            // Update when VAC changes
            if let sphere = content.entities.first as? ModelEntity {
                updateMaterial(sphere, vac: vac)
            }
        }
    }
}
```

**3. Custom Metal Shader** (`ios/LOVEExperience/Shaders/SoulSphere.metal`)
```metal
#include <metal_stdlib>
using namespace metal;

// Vertex shader
vertex float4 soulSphereVertex(
    uint vertexID [[vertex_id]],
    constant float3* positions [[buffer(0)]],
    constant float& uArousal [[buffer(1)]],
    constant float& uTime [[buffer(2)]]
) {
    float3 pos = positions[vertexID];
    
    // Simplex noise displacement (port from GLSL)
    float noise = simplexNoise3D(pos * (1.5 + abs(uArousal) * 2.0));
    float3 displaced = pos + normalize(pos) * noise * 0.2 * abs(uArousal);
    
    return float4(displaced, 1.0);
}

// Fragment shader
fragment float4 soulSphereFragment(
    constant float& uValence [[buffer(0)]],
    constant float& uConnection [[buffer(1)]]
) {
    // Color interpolation
    float3 crimson = float3(0.545, 0.0, 0.0);
    float3 cyan = float3(0.0, 1.0, 1.0);
    float3 color = mix(crimson, cyan, (uValence + 1.0) * 0.5);
    
    // Fresnel glow based on connection
    // ... (port from GLSL)
    
    return float4(color, 1.0);
}
```

### Migration Steps

1. **Week 1**: Setup Xcode project, create basic SwiftUI views
2. **Week 2**: Implement RealityKit sphere, test rendering
3. **Week 3**: Port shaders to Metal, test VAC mappings
4. **Week 4**: Add haptics (Taptic Engine), API integration
5. **Week 5**: Testing on physical devices, App Store prep

### Deployment

**TestFlight Beta:**
```bash
xcodebuild -archivePath build/LOVEExperience.xcarchive archive
xcodebuild -exportArchive -archivePath build/LOVEExperience.xcarchive \
           -exportPath build/ -exportOptionsPlist ExportOptions.plist
```

**App Store:** Via Xcode or Fastlane

---

## 🤖 Android Application (experience/android/)

### Tech Stack

**Language:** Kotlin 2.0.20
- Coroutines for async
- Flow for reactive state
- Null safety
- Extension functions

**UI Framework:** Jetpack Compose 1.7+
- Declarative UI (like SwiftUI/React)
- Material Design 3
- Navigation Compose
- Compose Animation

**3D Engine:** Filament (Google's physically-based renderer)

**Why Filament?**
- ✅ Vulkan backend (modern GPU API)
- ✅ Material system with custom shaders
- ✅ Used in Google apps (proven at scale)
- ✅ Excellent performance on mid-range devices
- ✅ Cross-platform (could even run on desktop)

**State:** Kotlin StateFlow + ViewModel
- Reactive state management
- Lifecycle-aware
- Easy testing

**Testing:** JUnit 5 + Compose UI Testing

### Project Setup

```bash
# Using Android Studio
# File → New → New Project
# Select: "Empty Compose Activity"
# Language: Kotlin
# Minimum SDK: API 26 (Android 8.0)
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation("androidx.compose.ui:ui:1.7.0")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("com.google.android.filament:filament-android:1.51.5")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    
    // Testing
    testImplementation("junit:junit:5.10.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.7.0")
}
```

### Key Files to Create

**1. VAC Data Class** (`android/app/src/main/kotlin/models/VAC.kt`)
```kotlin
package com.love.experience.models

import kotlinx.serialization.Serializable

@Serializable
data class VACVector(
    val valence: Double,    // -1.0 to 1.0
    val arousal: Double,    // -1.0 to 1.0
    val connection: Double  // -1.0 to 1.0
) {
    companion object {
        val NEUTRAL = VACVector(0.0, 0.0, 0.0)
        val JOY = VACVector(0.9, 0.7, 0.8)
        val GRIEF = VACVector(-0.9, -0.4, 0.5)
    }
}

// Quaternion for rotation
data class Quaternion(val w: Double, val x: Double, val y: Double, val z: Double) {
    fun slerp(target: Quaternion, t: Double): Quaternion {
        // SLERP implementation
    }
}
```

**2. Soul Sphere View** (`android/app/src/main/kotlin/ui/SoulSphereView.kt`)
```kotlin
package com.love.experience.ui

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.filament.*

@Composable
fun SoulSphereView(
    vac: VACVector,
    modifier: Modifier = Modifier
) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            SoulSphereRenderer(context).apply {
                updateVAC(vac)
            }
        },
        update = { view ->
            view.updateVAC(vac)
        }
    )
}

class SoulSphereRenderer(context: Context) : SurfaceView(context) {
    private val engine: Engine
    private val scene: Scene
    private val camera: Camera
    
    init {
        // Initialize Filament
        engine = Engine.create()
        scene = engine.createScene()
        camera = engine.createCamera(engine.entityManager.create())
            .apply {
                setProjection(45.0, aspect, 0.1, 100.0)
                lookAt(
                    eye = doubleArrayOf(0.0, 0.0, 5.0),  // Camera position
                    center = doubleArrayOf(0.0, 0.0, 0.0),  // Look at origin
                    up = doubleArrayOf(0.0, 1.0, 0.0)
                )
            }
        
        createSoulSphere()
    }
    
    private fun createSoulSphere() {
        // Create icosahedron mesh
        // Apply custom material with shaders
        // Add to scene
    }
    
    fun updateVAC(vac: VACVector) {
        // Update material uniforms
    }
}
```

**3. Material Definition** (`android/app/src/main/res/raw/soul_sphere_shader.mat`)
```glsl
// Filament material definition
material {
    name : SoulSphere,
    shadingModel : lit,
    parameters : [
        { type : float, name : uValence },
        { type : float, name : uArousal },
        { type : float, name : uConnection },
        { type : float, name : uTime }
    ],
    requires : [ uv0 ],
    vertexDomain : device
}

vertex {
    // Port GLSL vertex shader here
    // Filament uses GLSL ES 3.0
}

fragment {
    // Port GLSL fragment shader here
}
```

### Migration Steps

1. **Week 1**: Setup Android Studio project, configure Filament
2. **Week 2**: Create icosahedron mesh, basic rendering
3. **Week 3**: Port shaders (GLSL→Filament material)
4. **Week 4**: Add Jetpack Compose UI, API integration
5. **Week 5**: Haptic feedback, testing on devices
6. **Week 6**: Play Store prep, release

### Deployment

**Google Play Console:**
- Internal testing track
- Alpha → Beta → Production
- AAB (Android App Bundle) format

---

## 🔄 Shared Code Package (experience/shared/)

### What Gets Shared

**~40% code reuse across platforms:**

✅ **Business Logic:**
- VAC model definitions
- Quaternion math (slerp, angular distance, vacToQuaternion)
- Easing functions
- Canonical emotions dictionary

✅ **API Clients:**
- Observer API TypeScript client
- Listener API TypeScript client
- HTTP request/response types

✅ **Type Definitions:**
- VAC vector types
- Emotion types
- API response types

❌ **NOT Shared (platform-specific):**
- UI components
- Rendering/shaders (GLSL vs Metal vs SPIR-V)
- Haptic implementations
- Platform-specific optimizations

### NPM Workspace Setup

**Root package.json:**
```json
{
  "name": "@love/experience-monorepo",
  "private": true,
  "workspaces": [
    "shared",
    "web"
  ],
  "scripts": {
    "dev:web": "npm run dev --workspace=web",
    "test:shared": "npm test --workspace=shared",
    "build:all": "npm run build --workspaces"
  }
}
```

**shared/package.json:**
```json
{
  "name": "@love/experience-shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

**Shared Code Usage:**

```typescript
// In web/
import { CANONICAL_EMOTIONS, slerp } from '@love/experience-shared';

// In iOS (via TypeScript JSON bridge)
// Generate Swift types from TypeScript
// Use swift-bridge or similar

// In Android (via TypeScript JSON bridge)
// Generate Kotlin types from TypeScript
```

---

## 🎨 Shader Translation Guide

### GLSL → Metal (iOS)

**Differences:**
- `vec3` → `float3`
- `mix()` → `mix()` (same!)
- `smoothstep()` → `smoothstep()` (same!)
- Uniforms passed as buffers

**Example:**
```glsl
// GLSL (web)
uniform float uValence;
vec3 color = mix(crimson, cyan, (uValence + 1.0) * 0.5);
```

```metal
// Metal (iOS)
constant float& uValence [[buffer(0)]]
float3 color = mix(crimson, cyan, (uValence + 1.0) * 0.5);
```

### GLSL → Filament Material (Android)

Filament uses GLSL ES 3.0, so minimal changes:

```glsl
// Filament material
material {
    parameters : [
        { type : float, name : uValence }
    ]
}

fragment {
    // Almost identical to web GLSL
    vec3 color = mix(crimson, cyan, (materialParams.uValence + 1.0) * 0.5);
}
```

---

## 📅 Migration Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up all three project structures
- [ ] Create shared package with core utilities
- [ ] Verify build systems work
- [ ] Set up CI/CD pipelines

### Phase 2: Web Application (Weeks 3-6)
- [ ] Migrate Soul Sphere to R3F v9
- [ ] Port all shaders (should work as-is!)
- [ ] Build UI with Tailwind
- [ ] Integrate Observer/Listener APIs
- [ ] Deploy to Vercel for testing

### Phase 3: iOS Application (Weeks 7-10)
- [ ] Create RealityKit sphere
- [ ] Translate shaders to Metal
- [ ] Build SwiftUI interface
- [ ] Integrate Taptic Engine
- [ ] TestFlight beta

### Phase 4: Android Application (Weeks 11-14)
- [ ] Set up Filament renderer
- [ ] Port shaders to Filament materials
- [ ] Build Jetpack Compose UI
- [ ] Test on various devices
- [ ] Play Store alpha release

### Phase 5: Parity & Polish (Weeks 15-16)
- [ ] Visual comparison tests (screenshots)
- [ ] Performance benchmarks
- [ ] Ensure feature parity
- [ ] Documentation
- [ ] Final testing

**Total: 16 weeks (4 months) for complete migration**

---

## 💰 Cost-Benefit Analysis

### Development Time

| Task | React Native | Platform-Specific |
|------|--------------|-------------------|
| Initial Setup | 1 week | 2 weeks (3 projects) |
| Soul Sphere | 2 weeks | 6 weeks (2 weeks × 3) |
| UI/UX | 1 week | 3 weeks |
| Testing | 1 week | 4 weeks |
| **Total** | **5 weeks** | **15 weeks** |

### Maintenance Burden

| Aspect | React Native | Platform-Specific |
|--------|--------------|-------------------|
| Bug fixes | 1x effort | 3x effort |
| New features | 1x effort | 3x effort |
| Platform updates | High risk | Medium risk (gradual) |
| Dependencies | Many (expo, R3F, etc.) | Fewer (native SDKs) |

### Performance

| Metric | React Native | Native |
|--------|--------------|--------|
| FPS | 30-60 (unstable) | 60-120 (guaranteed) |
| GPU | WebGL via bridge | Direct Metal/Vulkan |
| Battery | Medium drain | Optimized |
| App Size | 50-80 MB | 10-20 MB each |

---

## ⚠️ Risks & Mitigations

### Risk 1: Feature Divergence
**Problem:** Each platform drifts apart over time  
**Mitigation:**
- Strict visual parity tests (screenshot comparison)
- Shared test cases (same VAC inputs = same visual output)
- Regular cross-platform reviews

### Risk 2: Maintenance Overhead
**Problem:** 3x the work for updates  
**Mitigation:**
- Maximize shared code (40%+)
- Automated testing on all platforms
- Consider hiring platform specialists

### Risk 3: Team Expertise
**Problem:** Need Swift, Kotlin, TypeScript knowledge  
**Mitigation:**
- Start with web (easiest)
- Hire specialists for iOS/Android
- Cross-training sessions

### Risk 4: Deployment Complexity
**Problem:** 3 different release processes  
**Mitigation:**
- CI/CD automation (GitHub Actions)
- Coordinated release calendar
- Feature flags for phased rollouts

---

## 🚀 Recommended Migration Path

### Option A: Sequential (Lower Risk)
1. **Month 1-2**: Build web version, deploy, gather feedback
2. **Month 3-4**: Build iOS version if web succeeds
3. **Month 5-6**: Build Android version

**Pros:** Validate concept before full investment  
**Cons:** Slower time to mobile

### Option B: Parallel (Higher Risk, Faster)
1. **Month 1**: Set up all three projects simultaneously
2. **Month 2-4**: Build all three in parallel (requires team)
3. **Month 5-6**: Polish and release all

**Pros:** Faster to market  
**Cons:** Higher upfront investment

---

## 🎯 Success Criteria

### Web
- [ ] Loads in < 2 seconds
- [ ] 60fps on desktop browsers
- [ ] Works on tablets/mobile browsers
- [ ] Lighthouse score > 90

### iOS
- [ ] 60fps on iPhone 11+
- [ ] 120fps on iPhone 13 Pro+ (ProMotion)
- [ ] Haptics feel natural
- [ ] < 20MB app size
- [ ] Passes App Store review

### Android
- [ ] 60fps on mid-range devices (Snapdragon 7-series)
- [ ] Works on Android 8.0+ (API 26+)
- [ ] < 25MB app size
- [ ] Passes Play Store review

### All Platforms
- [ ] Visual parity (same VAC = same appearance)
- [ ] API integration works identically
- [ ] Same user experience
- [ ] Same feature set

---

## 📊 Resource Requirements

### Team

**Minimum:**
- 1 Full-stack TypeScript/React developer (web)
- 1 iOS developer (Swift/RealityKit)
- 1 Android developer (Kotlin/Filament)
- 1 Designer (visual parity, UX)

**Ideal:**
- 2 web developers
- 2 iOS developers
- 2 Android developers
- 1 QA specialist
- 1 DevOps engineer

### Infrastructure

- **CI/CD**: GitHub Actions or GitLab CI
- **Hosting**: Vercel (web), TestFlight (iOS), Play Internal (Android)
- **Monitoring**: Sentry for error tracking
- **Analytics**: Posthog or Mixpanel

---

## 🎬 Next Steps

### Immediate (This Week)
1. Review this migration plan
2. Decide: Sequential vs Parallel approach
3. Prioritize platforms (Web first? iOS first?)
4. Set up initial project structures

### Short-term (Next Month)
1. Extract shared code to `experience/shared/`
2. Set up first platform (probably web)
3. Migrate Soul Sphere component
4. Test with real Observer data

### Long-term (3-6 Months)
1. Complete all three platforms
2. Achieve visual parity
3. Beta testing with real users
4. Production releases

---

## 💭 Final Recommendation

**My Honest Opinion:**

The React Native version is **95% complete**. You have:
- ✅ 298 tests passing
- ✅ All utilities implemented
- ✅ API integration working
- ❌ Rendering issue (R3F + expo-gl conflict)

**I recommend:**
1. **Spend 1-2 more sessions** debugging the RN render issue
2. **If still blocked**, start **web-only version** as proof of concept
3. **Don't commit to full 3-platform split** until web version validates the experience

The platform-specific approach is architecturally superior, but the RN version is SO CLOSE to working. It would be a shame to abandon 298 tests and weeks of work for a bug that might be fixable.

**What do you think?**
