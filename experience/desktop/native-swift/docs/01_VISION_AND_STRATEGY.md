# 01. Vision & Strategy: "Liquid Metal"

**Codename**: Liquid Metal
**Target**: macOS 15+ (Sequoia)
**Language**: Swift 6
**License**: Proprietary / App Store Standard

## 1. The Core Philosophy

"Liquid Metal" is not just a rewrite; it is a **transcendence**.
We are moving from a "Web App in a Box" to a "Living OS Organism". The application should feel less like software and more like an extension of the user's nervous system.

### 1.1. Key Tenets

1.  **Zero Latency**: Input > Action must happen in <16ms (1 frame).
2.  **Privacy is Physics**: Data physically effectively cannot leave the device without explicit user intent (CloudKit is the only exception).
3.  **Tactile Soul**: Every interaction has weight. Haptics, sound, and fluid animation response are not "polish"—they are the functionality.
4.  **Ecosystem Citizen**: We don't reinvent the wheel. We use Shortcuts, Spotlight, Widgets, and Siri.

## 2. Technical Strategy: The "Diamond" Stack

### 2.1. The UI: SwiftUI + Metal

- **Why**: Best-in-class accessibility, performance, and future-proofing.
- **Improvement**: We will build a reusable `SoulUI` Swift Package that defines our Design System (Typography, Colors, Haptics) so it can be shared with a future iOS companion app.
- **Technique**: Use `Canvas` and `Metal Shaders` for the "Aura" visualizations instead of `three.js`. This reduces memory usage by ~90% while allowing for millions of particles.

### 2.2. The Mind: CoreML + MLX (Optional)

- **Strategy**: Use **Apple Neural Engine (ANE)** for always-on bio-feedback.
- **Models**:
    - Text: `Llama-3-8B-Quantized` (via generic MLX or CoreML conversion).
    - Embedding: `Bert-Tiny` (CoreML) for instant vectorization.
    - Vision: `CLIP` for image tagging (if we support journal photos).
- **Improvement**: Implement "Speculative Decoding" on-device for faster text generation.

### 2.3. The Memory: SwiftData + CloudKit

- **Schema**:
    - `Soul` (User Profile)
    - `Memory` (Journal Entry + Embedding Vector)
    - `Vibe` (Emotional State Logs)
- **Sync**: Enable `NSPersistentCloudKitContainer`. This gives us free, encrypted, multi-device sync that users trust.
- **Vector Search**:
    - **Optimization**: Do not use a heavy vector DB.
    - Store embeddings as `[Float]` in a separate binary file or `Data` blob.
    - Use `Accelerate` (vDSP) to compute Cosine Similarity. It allows searching 100k vectors in < 2ms on M1 chips.

## 3. Distribution & Monetization

- **Mac App Store (MAS)**: The primary channel.
- **Business Model**:
    - **Free**: "Single Soul" (Local Only).
    - **Pro**: "Connected Soul" (iCloud Sync + Advanced Models).
    - **Family**: Share emotional states with a partner (CloudKit Sharing).
- **TestFlight**: Use for beta testing with our "Inner Circle" users.

## 4. Roadmap to "Soul 1.0"

1.  **Foundation**: Project Setup, CI/CD, `SoulUI` Design System.
2.  **Memory**: SwiftData Schema, CRUD, CloudKit Sync.
3.  **Senses**: CoreML Integration, Vector Search.
4.  **Body**: Main app UI, Navigation, Glassmorphism.
5.  **Soul**: "Aura" Visualizations (Metal), Haptics, Sound.
