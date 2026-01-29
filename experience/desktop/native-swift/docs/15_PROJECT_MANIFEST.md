# Project Manifest: "Liquid Metal" (Native Swift)

**Version**: 2.0 (Liquid Intelligence)
**Date**: 2026-01-28
**Status**: Release Candidate

## Overview
This directory contains the optimized native macOS client for the L.O.V.E. stack. It replaces the web-based "Experience" module with a high-performance, Privacy-First application running on Apple Silicon.

## 🏗️ Project Structure

### Workspace
*   **`LoveApp`**: The executable target. Contains the App Lifecycle, View Coordination, and Dependency Injection.

### Packages (Modular Architecture)
We use local Swift Packages for strict separation of concerns:

| Package | Role | Key Components |
| :--- | :--- | :--- |
| **SoulCore** | **Data** | `Memory` (Model), `EmotionCollection` (Model), `EmotionEngine` (Logic) |
| **SoulUI** | **Visuals** | `SoulView` (SwiftUI), `SoulShader.metal` (MSL), `SoulGlass` (Styles) |
| **SoulBrain** | **Mind** | `EmotionalPathfinder` (A* Logic), `VACMath` (Quaternions) |
| **SoulBio** | **Body** | `HapticEngine` (CoreHaptics), `BioMonitor` (Simulated HealthKit) |
| **SoulVoice** | **Voice** | `SpeechEngine` (SFSpeechRecognizer), `VoiceEngine` (AVSpeechSynthesizer) |
| **SoulChat** | **Social** | `ChatView` (UI), `Message` (Model) |

## 🔄 The "Soul Loop" (Data Flow)

1.  **Input**: User speaks or types.
    *   *Voice*: `SpeechEngine` transcribes audio -> Text.
    *   *Text*: `ChatView` captures string.
2.  **Processing**: `DependencyContainer.processInput(text)`
    *   *Analysis*: `EmotionEngine` maps Text -> Vibe (VAC Vector).
    *   *Routing*: `EmotionalPathfinder` calculates path: Current Vibe -> Target Vibe.
3.  **Reaction**:
    *   *Visual*: `SoulView` interpolates shader uniforms (Color, Turbulence) along the path.
    *   *Physical*: `HapticEngine` plays transient patterns for "State Change".
    *   *Audio*: `VoiceEngine` speaks response with emotional inflection (Pitch/Rate).
4.  **Memory**:
    *   `Memory` and `Message` objects are saved to SQLite via SwiftData.

## 🛠️ Key Technologies
*   **SwiftData**: Persistence.
*   **Metal (MSL)**: Rendering the "Liquid Soul" sphere.
*   **Simd / Accelerate**: High-performance vector math.
*   **Combine**: Reactive state management (`DependencyContainer`).

## ⚠️ Known Limits / Future Work
*   **Vector Search**: Implemented via `VectorIndex` (Accelerate/vDSP) for Long-Term Memory.
*   **LLM**: Fully integrated `Llama-3-Instruct` via `MLX` with KV-Caching and 4-bit Quantization.

## 📚 Documentation
See `docs/` for the complete 14-chapter manual.
