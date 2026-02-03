# 📚 L.O.V.E. Stack Documentation Portal

Welcome to the central documentation hub for the L.O.V.E. (Listener, Observer, Versor, Experience) Stack.

## 🚀 Getting Started
- **[Quick Start Guide](../README.md#-quick-start)**: Run the stack in 5 minutes.
- **[Setup Guide](../infra/README.md)**: Detailed environment setup and troubleshooting.
- **[Architecture Overview](architecture/overview.md)**: High-level system design and data flow.

## 🧩 Modules
### 🎧 [Listener](../listener/README.md)
*Audio ingestion, transcription (Whisper), and semantic analysis.*
- [API Reference](../listener/docs/api.md)
- [Configuration](../listener/docs/configuration.md)

### 🧠 [Observer](../observer/README.md)
*Contextual memory, vector storage (pgvector), and state management.*
- [VAC Model](../observer/docs/vac_model.md)
- [Database Schema](../observer/docs/schema.md)

### 🔮 [Versor](../versor/README.md)
*Mathematical engine, quaternion processing, and SLERP interpolation.*
- [Math Core](../versor/docs/math_core.md)
- [Algorithms](../versor/docs/algorithms.md)

### 🎙️ [PersonaPlex](../personaplex/README.md)
*Voice synthesis and persona integration (NVIDIA stack).*
- [Voice Configuration](../personaplex/docs/voice_config.md)

### 🎨 [Experience](../experience/web/README.md)
*Frontend web application (Next.js) and visualization.*
- [Component System](../experience/web/docs/components.md)

## 🛠️ Operations
- **[Infrastructure](../infra/README.md)**: Docker, deployment, and scripts.
- **[Testing Strategy](testing/strategy.md)**: Unit, integration, and semantic testing.
- **[Security](security/policy.md)**: Auth, rotation, and safety.

## 💡 Guides
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Style Guide](../STYLE.md)
