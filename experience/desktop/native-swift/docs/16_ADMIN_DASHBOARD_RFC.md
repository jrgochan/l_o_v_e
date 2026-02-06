# 16. RFC: Admin Dashboard & Authorization (The "Mind's Eye")

## 1. Objective

Create a native macOS **Visualization & Admin Interface** that matches the capabilities of the web-based `experience` module. This interface will allow developers and users to:

1.  **Visualize** the emotional landscape (VAC Space) in 3D.
2.  **Debug** pathfinding logic by seeing A\* trajectories.
3.  **Manage** collections (Atlas of the Heart vs. Plutchik).
4.  **Inspect** specific emotions and their coordinate values.

## 2. Design Philosophy

- **"The Glass Cockpit"**: A professional, high-fidelity HUD overlaying the organic Soul.
- **Hybrid Rendering**:
    - **Background**: The "Liquid Soul" (Metal Raymarching).
    - **Midground**: The "Constellation" (Point Cloud & Lines via Metal Rasterization).
    - **Foreground**: The "Dashboard" (SwiftUI Glassmorphism).

## 3. Technical Architecture

### 3.1. Rendering Engine Upgrade (`SoulRenderer`)

The current `SoulRenderer` draws a static fullscreen quad. To support a navigatable 3D scene, we must implement:

1.  **Camera System**:
    - Implement `Camera` struct (Position, Target, Up, FOV).
    - Calculate `ViewMatrix` and `ProjectionMatrix`.
    - Pass matrices to Shader Uniforms.
    - Implement **Orbit Controls** (Mouse Drag to rotate, Scroll to zoom).

2.  **Multi-Pass Rendering**:
    - **Pass 1: The Soul**: Existing Raymarching. Needs to write `gl_FragDepth` to support occlusion.
    - **Pass 2: The Stars**: Render 87+ `EmotionNodes` as Instanced Point Sprites (Billboarded Quads or Point Primitives).
    - **Pass 3: The Synapses**: Render lines connecting the pathfinding graph (debugging A\*).

### 3.2. Data Integration

- **Emotion Source**: `EmotionEngine.all` (Static Dictionary) converted to a `MTLBuffer`.
- **Selection State**: `DependencyContainer` handles `selectedEmotion`.

### 3.3. UI Components (SwiftUI)

We will use an `Overlay` approach:

```swift
ZStack {
    SoulView() // The 3D World
        .gesture(DragGesture()...) // Camera control

    VStack {
        TopBar() // "Dashboard", Settings
        HStack {
            Sidebar() // "Explore", "View", "Path Animation"
            Spacer()
            InspectorPanel() // "Sadness: V:-0.9 A:-0.4"
        }
    }
}
```

## 4. UI Specification (From Screenshot)

### 4.1. Global Controls (Top Bar)

- **Aggregate Monitor**: Shows real-time V/A/C of the Soul.
- **Connect Status**: "Disconnected" / "Local Core" indicator.
- **Toggles**: Dashboard, Settings, Help.

### 4.2. Left Sidebar (Navigation)

- **Mode Switcher**: Explore vs. View.
- **Path Animation**:
    - _Subtle_: Slow movement.
    - _Dynamic_: Fast, energetic.
    - _Cinematic_: "Director Mode" (Camera follows the path spline).
    - _Liquid_: Current default.
- **Visibility Layers**:
    - [x] Soul Sphere
    - [x] Emotion Points
    - [x] Labels

### 4.3. Right Sidebar (Inspector)

- **Selection Card**:
    - Name: "Sadness"
    - Description: "Emotional pain associated with..."
    - Coordinates: V: -0.7, A: -0.4, C: -0.5
- **Path Details** (When a path is active):
    - Step-by-step list: Remorse -> Nervousness -> Surprise -> Pride -> Gratitude.
    - "Play" button to rehearse the path.

### 4.4. The 3D Viewport

- **Tags**: 2D Text Labels floating above 3D points (projected using `gluProject` equivalent).
- **Hover Effects**: Point enlarges when mouse hovers.

## 4.5. "Zen HUD" (Overlay)

Mirroring the web implementation, we will add a floating, context-aware HUD:

- **Location**: Bottom-Center floating pill.
- **Content**:
    - _Idle_: Hidden / Minimal status.
    - _Hover_: Emotion Name + VAC stats.
    - _Path Active_: "Journey: Anger -> Joy", Step count, "Play/Stop" toggle.
- **Styling**: Pure SwiftUI `.background(.ultraThinMaterial)` with rounded corners.

## 5. Implementation Plan

### Phase 12: Visualization Core (The Engine)

1.  **Camera Logic**: Update `SoulRenderer` to support Orbit Controls _and_ Spline Flyover.
2.  **Point Cloud**: Send `EmotionEngine.all` to GPU. Render points with depth testing.
3.  **Spline System**: Implement `CatmullRom` interpolation in Swift (porting `PathFlyover.tsx` logic).

### Phase 13: Admin UI (The Dashboard)

1.  **Dashboard Shell**: Create the "Mac-native" Sidebar/Detail SplitView.
2.  **Zen HUD**: dynamic overlay component.
3.  **Interaction**: Raycasting from Mouse Click -> Emotion Point.

## 6. Future Considerations

- **Edit Mode**: Drag points to recalibrate VAC values?
- **History Replay**: Visualize the user's `Memory` trajectory as a spline through the space.
