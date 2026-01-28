# 08. Performance & Optimization

**Target**: 120fps (ProMotion)  
**Energy**: < 5% CPU impact usage during idle  
**Memory**: < 200MB Baseline

## 1. Frame Rate Strategy ("Liquid Metal")

### 1.1. The 120Hz Mandate
*   **SwiftUI**: By default, SwiftUI renders efficiently, but complex layouts can stutter.
*   **Identity**: Ensure all `List` items have stable `id`s.
*   **Offscreen Rendering**: Avoid `.drawingGroup()` unless necessary (it switches to Bitmap rendering which can be blurry on Retina).
*   **Profiling**: Use **Instruments (Core Animation)** to detect "Hitches". Zero hitches allowed.

### 1.2. Metal Shaders (The "Aura")
*   Visualizations use `ShaderLibrary` (iOS 17+ / macOS 14+).
*   **Compute**: Run particle physics in a Compute Shader.
*   **Render**: Run pixel coloring in a Fragment Shader.
*   **CPU Usage**: Should be ~0%. GPU takes the load.

## 2. Thermal Management (The "Cool Soul")

Running AI models generates heat. Heat throttles performance.

### 2.1. Neural Engine (ANE) First
*   **Policy**: All inference MUST run on ANE where possible.
*   **Measurement**: Use `powertop` or Xcode Energy Gauge.
*   **Throttling**: If `ProcessInfo.processInfo.thermalState` > `.serious`:
    - Disable generic background "analysis".
    - Reduce UI "breathing" animation frame rate to 30fps.
    - Stop any background syncing.

## 3. Memory Hygiene

### 3.1. Vector Index
*   Loading 100k vectors (Float32) = ~40MB.
*   **Swift Optimization**: Use `[Float16]` (Half Precision) if accuracy permits. Cuts RAM by 50%.

### 3.2. Image Handling
*   If users attach photos, **Downsample** immediately upon load (`CGImageSourceCreateThumbnailAtIndex`).
*   Never load full 12MP images into memory for a Thumbnail view.

## 4. Launch Time
*   **Target**: < 400ms to Interactive.
*   **Lazy Loading**:
    - Do NOT init `CoreML` models on `App.init()`.
    - Init them on a background queue or upon first user interaction (Lazy Varnish).
*   **Splash Screen**: Native Launch Screen (Storyboard) must match the initial SwiftUI view perfectly to prevent "Layout Jump".
