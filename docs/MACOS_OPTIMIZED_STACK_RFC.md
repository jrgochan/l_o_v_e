# RFC 003: Native "Liquid Metal" Architecture (macOS)

**Status**: Proposal  
**Date**: 2026-01-27  
**Module**: Experience (macOS)  
**Goal**: Build the most optimized, beautiful, and sellable version of L.O.V.E. for the Mac App Store.

## 1. Executive Summary

To achieve the "Fluid Soul" aesthetic (RFC 002) with 120fps physics-based animations, "Glassmorphism" blurs that don't drain battery, and seamless integration with the Apple ecosystem (iCloud, Siri, Shortcuts, Widgets), we propose moving from the hybrid **Tauri/Python** architecture to a **Pure Native Swift** stack.

This architecture, codenamed **"Liquid Metal"**, treats the application not as a web page in a wrapper, but as a high-performance native citizen of macOS.

### The "Why"
*   **Performance**: SwiftUI backed by Metal renders generic "Glass" effects at a fraction of the power cost of CSS `backdrop-filter`.
*   **App Store**: Zero friction. No signing "sidecar" python binaries, no sandboxing fights.
*   **Monetization**: Native support for In-App Purchases (StoreKit) and iCloud Sync (CloudKit).
*   **Intelligence**: First-class access to the Apple Neural Engine (ANE) via CoreML for zero-latency, private AI.

---

## 2. The Native Stack

| Component | Current (Tauri) | Proposed (Native Swift) | Advantage |
| :--- | :--- | :--- | :--- |
| **Language** | Rust / Python / TS | **Swift 6** | Safety, Concurrency, Apple First-Party Support |
| **UI Framework** | React / CSS | **SwiftUI** | 120fps Animations, Metal-accelerated Glass |
| **Database** | SQLite + Python Wrapper | **SwiftData** (Core Data) | iCloud Sync built-in, Graph relationships |
| **Vector Search** | FAISS (Python) | **Accelerate** + **USearch** | SIMD-optimized math on CPU/GPU |
| **AI Inference** | Ollama / Llama.cpp | **CoreML** | Runs on Neural Engine (ANE) = 90% less energy |
| **Sync** | Custom / P2P | **CloudKit** | Free, reliable, cross-device sync (iPhone/Mac) |

---

## 3. Detailed Architecture

### 3.1. User Interface (SwiftUI + Metal)
The "Fluid Soul" requires advanced blur and transparency. Webviews struggle here.
*   **Materials**: Use `.ultraThinMaterial` and `.regularMaterial` for OS-optimized blurring that adapts to light/dark mode automatically.
*   **Animation**: `SwiftUI.withAnimation(.spring(response: 0.5, dampingFraction: 0.7))` gives the exact "organic" feel we want.
*   **Haptics**: Direct access to `NSHapticFeedbackManager` for nuanced physical feedback impossible in Webviews.

### 3.2. Data Persistence (SwiftData + CloudKit)
Instead of managing a local SQLite file and building a custom sync engine:
*   **SwiftData**: The modern persistence framework. We define our `Soul` models as Swift classes.
*   **CloudKit**: By simply enabling "iCloud" capability, user data (Journals, Vibrations) syncs to their iPhone/iPad automatically.
    *   *Monetization Note*: Users trust iCloud sync. It justifies a "Pro" subscription.
*   **Privacy**: Data is encrypted by Apple's keys. We (the developers) can't see it.

### 3.3. Intelligence (CoreML + NaturalLanguage)
We remove the heavy Python runtime.
*   **Embeddings**: Use Apple's `NaturalLanguage` framework `NLEmbedding` or a quantized BERT model converted to CoreML.
*   **LLM**: Convert Llama-3-8B (or smaller "Soul" tuned models) to **CoreML** format using `coremltools`.
    *   *Optimization*: These run on the ANE (Neural Engine), freeing up the GPU for UI rendering.
*   **Vector Search**: 
    - For < 100k vectors (Personal Soul), brute-force cosine similarity using Apple's **Accelerate** (vDSP) framework is incredibly fast (sub-millisecond).
    - No need for a complex vector DB. Just store arrays of Float and use SIMD instructions.

### 3.4. App Store Strategy & Monetization
*   **Freemium Model**:
    *   **Free**: Local mode, basic AI.
    *   **Soul+ ($4.99/mo)**: iCloud Sync (Multi-device), Advanced CoreML Models (downloadable DLC), Historical Insights.
*   **StoreKit 2**: Native Swift API makes implementing subscriptions trivial.

---

## 4. Migration Strategy

We don't need to throw away the *logic*, just the implementation.

### Phase 1: The Core (Swift Package)
Implement the business logic in a pure Swift Package `LoveCore`.
*   `EmotionEngine`: The VAD (Valence/Arousal) math.
*   `Pathfinding`: The A* implementation (rewritten in Swift, extremely fast).

### Phase 2: The Data Layer
Define `SwiftData` models that mirror our Pydantic models.
*   `class JournalEntry: PersistentModel`
*   `class EmotionalState: PersistentModel`

### Phase 3: The UI (Fluidity)
Build the "Soul Sphere" views in SwiftUI.
*   Focus heavily on the "Aesthetic" RFC goals (Haptics, Sound, Blur).

---

## 5. Why NOT Tauri?
*   **Tauri is great**, but it fights the OS for "Deep Native" features.
*   **Sandboxing**: Bundling a Python binary sidecar for the App Store is a nightmare of "Entitlements" and "Hardened Runtime" signing errors.
*   **Battery**: A Python process + Webview process will always consume more energy than a single native Swift binary optimized by the OS compiler.

## 6. Conclusion
To build a product we can **sell** and that feels **magical**, Native Swift is the only professional choice for macOS. It aligns perfectly with the "Fluid Soul" vision by removing all friction between the code and the silicon.
