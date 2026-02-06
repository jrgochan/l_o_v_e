# 14. Parity Compliance Plan (Native Swift)

**Goal**: Ensure the native macOS app ("Liquid Metal") provides 1:1 functional parity with the existing Python/Node stack (`versor`, `observer`, `experience`, `listener`).

## 1. Logic Parity: Versor -> SoulBrain

The `versor` module handles emotional math. We must replicate this in `SoulBrain`.

| Versor Feature (Python) | SoulBrain Equivalent (Swift)  | Status                                       |
| ----------------------- | ----------------------------- | -------------------------------------------- |
| VAC Model (3D Vectors)  | `SoulCore.Models.Vibe`        | ✅ Implemented                               |
| VAC -> Quaternion       | `VACVector.to_quaternion()`   | ✅ Implemented (`VACMath.swift`)             |
| SLERP Interpolation     | `simd_slerp` (simd framework) | ✅ Implemented (`EmotionalPathfinder.swift`) |
| Transition Logic (A\*)  | `EmotionalPathfinder`         | ✅ Implemented (`EmotionalPathfinder.swift`) |
| Canonical Emotions      | `EmotionEngine` (Static Dict) | ✅ Implemented                               |

**Action Items**:

1.  Port `to_quaternion` logic from `vac_model.py` to `SoulBrain`.
2.  Implement `simd` based interpolation for smooth transitions.

## 2. Data Parity: Observer -> SoulCore

The `observer` module handles data persistence and vector search.

| Observer Feature (Postgres/pgvector) | SoulCore Equivalent (SwiftData)        | Status                                       |
| ------------------------------------ | -------------------------------------- | -------------------------------------------- |
| `user_trajectory` Table              | `Memory` Model (SwiftData)             | ✅ Implemented                               |
| `atlas_definitions` (87 Emotions)    | `Atlas.json` Seeder                    | ✅ Implemented (`DatabaseSeeder.swift`)      |
| Vector Embeddings (1536 dim)         | `[Float]` Attribute (External Storage) | ✅ Implemented (`Memory.swift`)              |
| Semantic Search (HNSW)               | `USearch` (Local Lib) or CoreData      | ✅ Keyword Matching (Vector Search Deferred) |
| Haptic Patterns                      | `HapticEngine` dictionary              | ✅ Implemented (`HapticEngine.swift`)        |

**Action Items**:

1.  Create `Atlas.json` containing the 87 emotions (exported from Postgres).
2.  Build a `Seeder` class to populate `SwiftData` on first launch.

## 3. Visual Parity: Experience -> SoulUI

The `experience` module (React/Three.js) renders the Soul Sphere.

| Experience Feature (Three.js) | SoulUI Equivalent (Metal/SwiftUI) | Status                              |
| ----------------------------- | --------------------------------- | ----------------------------------- |
| Icosahedron Geometry          | `Sphere()` + Metal Shader         | ✅ Implemented (`SoulShader.metal`) |
| Vertex Displacement (Noise)   | Metal Shader (MSL)                | ✅ Implemented (`SoulShader.metal`) |
| Fresnel Glow (Connection)     | `SoulGlass` (Approx) -> Shader    | ✅ Implemented (`SoulShader.metal`) |
| Breathing Animation (Time)    | SwiftUI Animation                 | ✅ Implemented                      |
| Color Palettes (Valence)      | `SoulColors`                      | ✅ Implemented                      |

**Action Items**:

1.  Upgrade `SoulUI` from standard SwiftUI shapes to a custom **Metal Shader View** for the true "Liquid Metal" effect (Vertex Displacement).
2.  Implement `SoulColors` logic in MSL (Metal Shading Language).

## 4. Input Parity: Listener -> SoulBrain / Speech

The `listener` module handles audio capture, transcription, and initial semantic analysis.

| Listener Feature (Python/FastAPI) | SoulBrain Equivalent (Native Swift)     | Status                                |
| --------------------------------- | --------------------------------------- | ------------------------------------- |
| Audio Capture (FastAPI)           | `AVFoundation` (AudioEngine)            | ✅ Implemented (`SpeechEngine.swift`) |
| Transcription (Whisper)           | `Speech` Framework (SFSpeechRecognizer) | ✅ Implemented (`SpeechEngine.swift`) |
| Semantic Analysis (Ollama)        | `MLX` (local Llama-3-8B) or CoreML      | ✅ Keyword Matching (LLM Deferred)    |
| PII Scrubbing (Spacy)             | `NaturalLanguage` Framework             | ✅ Native Privacy (On-Device)         |

**Action Items**:

1.  Implement `InputManager` in `SoulBrain` to handle `AVAudioEngine` pipeline.
2.  Create `TranscriptionService` using `SFSpeechRecognizer` (on-device).
3.  Integrate `MLX` Swift bindings for local LLM inference (replacing Ollama).

## 5. Dataset Parity: Emotion Collections

The `observer` module supports multiple emotion datasets (e.g., "Atlas of the Heart", "Plutchik"). One collection is active at a time.

| Observer Feature (Postgres) | SoulCore Equivalent (SwiftData)    | Status                                       |
| --------------------------- | ---------------------------------- | -------------------------------------------- |
| `emotion_collections` Table | `EmotionCollection` Model          | ✅ Implemented (`EmotionCollection.swift`)   |
| `collection_id` FK          | `Emotion.collection` Relationship  | ✅ Implemented (`Emotion.swift`)             |
| Active Collection Logic     | `SettingsStore` / `AppContainer`   | ✅ Implemented (`DependencyContainer.swift`) |
| Seeding Multiple Datasets   | `JSON` Seeders for each collection | ✅ Implemented (`DatabaseSeeder.swift`)      |

**Action Items**:

1.  Define `EmotionCollection` model in `SoulCore`.
2.  Update `Emotion` model to belong to a `Collection`.
3.  Implement "Change Dataset" in App Settings.
4.  Refactor `EmotionEngine` to load coordinates from the _Active Collection_ instead of hardcoded dictionary.

## Implementation Roadmap

### Phase 2: Core App Structure (Next)

- **Goal**: Create `LoveApp` target, Navigation, and App Container.
- **Deliverable**: A runnable macOS app with basic navigation.

### Phase 3: The Mind (Versor Port)

- **Goal**: Implement `vac_to_quaternion` and `pathfinding` in `SoulBrain`.
- **Deliverable**: Unit tests proving Swift math matches Python math.

### Phase 4: The Content (Observer Port)

- **Goal**: Port Atlas/Collections data and enable seeding.
- **Deliverable**: "Browse Emotions" UI populated with Atlas data.

### Phase 5: The Soul (Experience Port)

- **Goal**: Replace `VibeOrb` with a real Metal Shader.
- **Deliverable**: 1:1 visual match with the WebGL Soul Sphere.
