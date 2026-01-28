# RFC 001: Standalone "Soul Sphere" Architecture

**Status**: Adopted / Plan
**Date**: 2026-01-25
**Module**: Experience / Observer
**Goal**: Remove Cloud Dependencies for a Privacy-First, Offline-Capable Desktop App

## 1. Executive Summary

The current L.O.V.E. application uses a "Thin Client" architecture: a Tauri frontend that connects to a Dockerized/Cloud backend (Postgres + Python API). This RFC describes the transformation to a **Standalone Architecture** where the entire stack runs locally on the user's machine without Docker, internet, or complex setup.

### The Vision
- **Single Install**: User downloads `.dmg`, drags to Applications, opens it. Done.
- **Zero Config**: No environment variables, no Docker, no API keys.
- **Offline First**: Works on a plane. Your emotional data never leaves your device.
- **Resilient**: Self-healing data structures and robust process lifecycle management.

---

## 2. Core Architectural Shifts

We need to move from a **Microservices** pattern to a **Monolithic Application** pattern managed by Tauri.

| Component | Current (Cloud/Docker) | Proposed (Standalone) |
| :--- | :--- | :--- |
| **Orchestrator** | Docker Compose / K8s | **Tauri (Rust)** |
| **Backend** | Python Service (Container) | **Bundled Binary (Sidecar)** |
| **Database** | PostgreSQL | **SQLite** (File-based) |
| **Vector Search** | pgvector extension | **SQLite (Storage) + FAISS (Index)** |
| **AI Inference** | OpenAI API / Cloud GPU | **Local CPU/Metal** (Ollama) |
| **Storage** | S3 / Cloud Storage | **Local Filesystem** |

---

## 3. Implementation Details

### 3.1. The "Sidecar" Pattern & Binary Signing
Tauri provides a "sidecar" mechanism to bundle external binaries. Here, the Python API (`observer`) becomes that binary.

**Workflow:**
1.  **Build Time**: Use PyInstaller to compile `observer/main.py` -> `observer-server` executable.
2.  **Sign & Notarize**: 
    - macOS Gatekeeper requires all bundled binaries to be signed.
    - We must sign `observer-server` and `ffmpeg` with the Apple Developer ID *before* bundling them into the Tauri .app structure.
3.  **Package**: Include distinct binaries for macOS Intel and Apple Silicon in the Tauri bundle resources.
4.  **Runtime**:
    - Tauri app starts.
    - Rust process spawns `observer-server` in the background.

### 3.2. Database Abstraction (The "Repository Pattern")
We currently rely heavily on PostgreSQL-specific features (`pgvector`, `ARRAY`, `JSONB`). We must decouple the application logic from the database implementation.

**Action Plan:**
1.  **Abstract Interface**: Create a `DatabaseProvider` protocol in Python.
2.  **Dual Implementation**:
    - `PostgresProvider`: Keeps current functionality for Cloud.
    - `SQLiteProvider`: Handles local storage.
        - Maps `ARRAY` → `JSON` text field.
        - Maps `JSONB` → `JSON` text field.
    - **Encryption At Rest**: Use **SQLCipher** (via `sqlcipher3` or `sqlite-pysqlcipher`) to encrypt `soul.db`. The key is managed by the OS Keychain (via Tauri) and passed to Python via Stdin.
    - **Safe Migrations**: 
        - On startup, create a snapshot backup: `soul.db` -> `soul.db.pre-migration.bak`.
        - Run Alembic migrations.
        - **Fail-Safe**: If migration crashes, auto-restore the backup and boot into "Safe Mode".

### 3.3. Audio Processing (The ffmpeg dependency)
The `listener` module requires `ffmpeg` for audio processing.
- **Solution**:
    - **Download**: Tauri build script downloads static `ffmpeg` binary for the target platform.
    - **Bundle**: Place in `src-tauri/binners` (or resources).
    - **Path Config**: Rust passes the path to the sidecar via environment variable `FFMPEG_PATH`.

### 3.4. Local Vector Strategy (Split-Brain Prevention)
SQLite does not natively support high-performance vector search (HNSW). We will use FAISS, but **SQLite is the Single Source of Truth**.

**The Strategy:**
1.  **Storage**: We add a `vector_embedding` BLOB column to the `messages` table in SQLite.
2.  **Transactions**: When saving a message, we write Text + Embedding to SQLite in one transaction.
3.  **Resumable Indexing**:
    - We track `last_indexed_id` in the DB.
    - If the index is missing or model version changed, we rebuild from SQLite in chunks (batches of 500).
4.  **Hybrid Search (FTS5)**:
    - We enable the **FTS5** extension in SQLite for full-text search.
    - Semantic Search = FAISS (finds *meaning*).
    - Keyword Search = FTS5 (finds *specific words*).
    - **Fusion**: The app combines results using Reciprocal Rank Fusion (RRF) for optimal "Memory" recall.

### 3.5. Offline AI Intelligence
To remove the OpenAI dependency:

**1. Embeddings (Semantic Search)**
- Use `sentence-transformers` (e.g., `all-MiniLM-L6-v2`).
- Runs efficiently on CPU.
- **Bundling**: Download weights during build.

**2. Chat / Insights (LLM)**
- **Standard**: "Lite Mode" connects to OpenAI (User Key) for immediate usage.
- **Privacy Mode**: Integrated support for **Ollama**.
    - User installs Ollama.
    - App connects to `localhost:11434`.

### 3.6. Security & Process Lifecycle (Zombie Prevention)
We must ensure the Python sidecar is secure and does not become a zombie process.

**1. Secure IPC (Unix Domain Sockets)**
- **Problem**: TCP ports (localhost:54321) can have conflicts, trigger firewalls, and are accessible by other users on the machine.
- **Solution**: On macOS/Linux, the sidecar binds to a **Unix Domain Socket** file (e.g., `/tmp/love-observer-{uuid}.sock`).
- **Benefit**: Permissions are controlled by the OS file system (0600), faster than TCP, and zero port conflicts.

**2. Secure Bootstrap (Stdin)**
- Do not pass secrets via CLI arguments (visible in `ps`).
- **Mechanism**: Rust writes the `Shared Secret` and configuration directly to the Python process's **Standard Input (stdin)** immediately after spawning.

**3. The Deadman Switch (Heartbeat)**
- Rust sends a "ping" to the Python sidecar every 5 seconds.
- Python maintains a background thread checking `last_ping_time`.
- If no ping is received for 15 seconds (e.g., Rust crashed hard), the Python process **self-terminates**.

**4. Biometric Sentinel**
- Use Tauri's integration with macOS `LocalAuthentication` framework.
- The encryption key for `soul.db` is stored in the System Keychain.
- **Access Control**: Application launch requires TouchID/FaceID to retrieve the key from Keychain before passing it to the Python sidecar.

### 3.7. Advanced Reliability & Safety
1.  **Resource Governance**: 
    - Rust monitors Python memory usage.
    - If RAM > 1.5GB (Memory Leak), trigger a graceful restart when user is idle.
2.  **Type Safety Contracts**:
    - Python Pydantic models are the Source of Truth.
    - CI pipeline generates `schema.json` -> TypeScript interfaces.
3.  **Panic Button (Duress Mode)**:
    - Dedicated "Emergency Wipe" feature.
    - Securely deletes `soul.db` and encryption keys.

### 3.8. Data Strategy
1.  **Content Addressable Storage (CAS)**:
    - User uploads (images, audio) are renamed to their SHA-256 hash (e.g., `media/a3f1...jpg`).
    - Eliminates duplicate storage and filename collision issues.
2.  **Zero-Copy Media**:
    - The database stores only the hash reference.

### 3.9. Build Stability
1.  **Reproducible Builds**:
    - Use a **Dockerized** build environment to run PyInstaller.
    - Ensures the `observer-server` binary links against a known, stable `glibc` (or `musl`) version, preventing "Symbol not found" errors on older macOS versions.

### 3.10. Adaptive Intelligence (Visionary)
1.  **Local Fine-Tuning (LoRA)**:
    - The "Soul Sphere" learns from you.
    - **Mechanism**: A background job (only when plugged in + idle) fine-tunes a small Low-Rank Adapter (LoRA) on the user's journal entries.
    - **Result**: The AI adopts the user's specific vocabulary and emotional context without sharing data.

### 3.11. Sovereignty Extensions
1.  **Decoy Mode (Plausible Deniability)**:
    - If a specific "Duress Password" is entered at the Biometric prompt, the app unlocks a secondary, innocent `decoy.db` instead of the real `soul.db`.
2.  **P2P Sync (Magic Wormhole)**:
    - Direct, encrypted synchronization between a user's Laptop and Desktop.
    - No cloud intermediary; devices communicate directly via local network or P2P relay.

### 3.12. Hardware Sovereignty
1.  **Neural Hardware Bridge (CoreML)**:
    - Move beyond Ollama/Llama.cpp generic backends.
    - Compile models to `.mlmodel` to bypass CPU/GPU and run directly on **Apple Neural Engine (ANE)**.
    - **Result**: Near-zero energy impact for always-on emotional awareness.

### 3.13. Ambient Presence
1.  **The "Aura" (Menu Bar App)**:
    - A lightweight Tauri tray icon that pulses subtly based on the user's computed Valence/Arousal state.
    - Keeps the user mindful of their emotional state without opening the main window.
2.  **Haptic Grounding**:
    - Trigger subtle trackpad haptics (heartbeat pattern) when high-stress states are detected.

### 3.14. Transcendence (Visionary)
1.  **Digital Legacy ("The Black Box")**:
    - Using Shamir's Secret Sharing, split the master encryption key into 3 parts.
    - Distributed to 3 trusted contacts (or printed as QR codes).
    - Allows digital inheritance of the "Soul Sphere" upon death.
2.  **The Dark Forest (Telemetry)**:
    - Zero-Knowledge Proof (ZKP) telemetry.
    - We know *that* a user felt "Awe" at 8PM, but not *who*.
    - Allows building a privacy-preserving "World Mood Map" ("The Collective Unconscious").
3.  **Multi-Modal Context**:
    - Capture screen context (OCR/Screen Recording) during high-emotion events.
    - Tag: "You felt Sad when looking at *Gmail*".

---

## 4. Migration Roadmap

### Phase 2.1: Database Refactoring
- [ ] Create `db/interfaces.py`.
- [ ] Implement `SQLiteProvider` with SQLCipher + Snapshots.
- [ ] **Test**: Run full test suite against SQLite (excluding vector search tests).

### Phase 2.2: Vector Abstraction
- [ ] Create `services/vector_store.py`.
- [ ] Implement `FAISSVectorStore` + FTS5 Hybrid Logic.
- [ ] Add `system_config` table for Model Versioning.

### Phase 2.3: Bundling & Security
- [ ] Create **Reproducible Build** Dockerfile.
- [ ] Implement **UDS** support in FastAPI (Hypercorn/Uvicorn).
- [ ] Implement Stdin + Deadman Switch.
- [ ] Create signing/notarization pipeline script.
- [ ] Implement Biometric/Keychain logic in Rust.

### Phase 2.4: Data Portability & Experience
- [ ] Implement CAS logic for `MediaService`.
- [ ] Create **JSONL Import/Export** format standard.
- [ ] Implement Splash Screen Readiness Probe.

### Phase 3: Operations & Maintenance
- [ ] **Updates**: Configure Tauri Updater (v2).
- [ ] **CI/CD**: Add `codegen` step for Pydantic -> TypeScript sync.

---

## 5. Challenges & Risks

1.  **Migration Complexity**: Mitigated by the **JSONL Import/Export** strategy.
2.  **Performance**: Python cold-start (~2-5s) will be handled by the **Splash Screen** UI pattern.
3.  **Split Brain**: Mitigated by the **SQLite-as-Source-of-Truth** strategy; vector index is disposable cache.

## 6. Conclusion
This architecture transforms L.O.V.E. from a SaaS product to a resilient, privacy-sovereign tool. By integrating industrial-grade reliability patterns and visionary features like Neural Bridging, Digital Legacy, and Biometric Sentinels, we create a "Soul Sphere" that is not just an application, but a living, breathing extension of the self.
