# Listener Module Documentation

## The Sensory Cortex of the L.O.V.E. Framework

---

## Overview

The **Listener Module** is the first point of contact between human emotional expression and the L.O.V.E. Stack's mathematical representation system. It transforms messy, analog human language (spoken or written) into precise VAC (Valence-Arousal-Connection) coordinates.

```mermaid
graph TD
    A[User Input<br/>Voice or Text] --> B{Input Type?}
    B -->|Audio| C[faster-whisper<br/>Transcription]
    B -->|Text| D[Direct Processing]
    C --> E[Semantic Analyzer<br/>Ollama + Llama 3.1]
    D --> E
    E --> F[VAC Extraction]
    F --> G[PII Scrubber<br/>Spacy NER]
    G --> H[Output:<br/>VAC Coordinates<br/>+ Emotion<br/>+ Reasoning]

    style E fill:#4f46e5,color:#fff
```mermaid
graph TD
    A[Audio Input] --> B[Transcription]
    B --> C[Semantic Analysis]
    C --> D[Emotion Classification]
    D --> E[VAC Extraction]
    D --> F[Atlas Mapping]
    E --> G[Visual Output]

    style A fill:#f3f4f6,stroke:#333,stroke-width:2px
    style G fill:#f3f4f6,stroke:#333,stroke-width:2px
    style C fill:#818cf8,color:#fff
    style D fill:#6366f1,color:#fff
    style E fill:#4f46e5,color:#fff
    style F fill:#6366f1,color:#fff
    style G fill:#818cf8,color:#fff
```

```text
listener/
├── app/          # FastAPI application
├── tests/        # Pytest suite
└── docs/         # You are here
```

---

## Key Features

### 🎤 **Multi-Modal Input**

- Audio transcription (faster-whisper)
- Direct text analysis
- Async processing queue (Redis + Arq)

### 🧠 **Semantic VAC Extraction**

- Local LLM inference (Ollama + Llama 3.1)
- Few-shot prompting with Atlas examples
- Connection axis extraction (the innovation!)

### 🔐 **Privacy-First Architecture**

- All processing happens locally
- No external API calls
- PII automatically scrubbed before storage

### ⚡ **Performance**

- < 500ms transcription (10s audio)
- ~1-2s semantic analysis
- ~2-3s total pipeline

---

## The Critical Innovation: Connection Extraction

Standard sentiment analysis models (VADER, TextBlob, etc.) can extract:

- **Valence**: Positive vs. negative sentiment
- **Arousal**: High energy vs. low energy

But they **cannot distinguish**:

<!-- markdownlint-disable MD046 -->
!!! example "Pity vs. Compassion"
    Both emotions involve witnessing someone's suffering:

    **Pity:**
    ```
    "I feel sorry for them, they're struggling."
    ```
    - Valence: -0.3 (slightly negative)
    - Arousal: -0.1 (low energy, reflective)
    - **Connection: -0.7 (separation, condescension)**

    **Compassion:**
    ```
    "I understand their pain. I'm here for them."
    ```
    - Valence: 0.5 (offering support)
    - Arousal: 0.2 (calm presence)
    - **Connection: +0.9 (shared humanity, alignment)**

The Listener uses **carefully crafted prompts** to teach the LLM this distinction.
<!-- markdownlint-enable MD046 -->

---

## Documentation by Audience

Choose your learning path:

### 👔 **For Executives** (5-10 minute read)

High-level overview, business value, and strategic positioning.

- [Overview & Value Proposition](overview/01-executive-summary.md)
- [Business Value & ROI](overview/02-business-value.md)
- [Roadmap & Future Capabilities](overview/03-roadmap.md)

---

### 🏢 **For Managers** (30-45 minute read)

Architecture overview, team structure, and operational guidelines.

- [Architecture Overview](architecture/00-high-level-overview.md)
- [Integration Points](operations/../architecture/10-integration-points.md)
- [Monitoring & Operations](operations/01-monitoring.md)
- [Team Structure](operations/02-team-structure.md)
- [Incident Response](operations/03-incident-response.md)

---

### 🦸 **For Senior Developers** (2-3 hour deep dive)

Technical deep dive, architecture decisions, and advanced topics.

- [Deep Dive Architecture](architecture/01-deep-dive.md)
- [Semantic Analysis Internals](architecture/02-semantic-analysis.md)
- [Prompt Engineering](architecture/03-prompt-engineering.md)
- [Performance Optimization](architecture/04-performance-optimization.md)
- [Extending the Listener](architecture/05-extending-listener.md)
- [Troubleshooting Guide](architecture/06-troubleshooting.md)
- [Architecture Decision Records](architecture/07-architecture-decisions.md)

---

### 🎓 **For Junior Developers** (1-2 day tutorial)

Beginner-friendly guides with step-by-step instructions.

- [Getting Started](guides/01-getting-started.md) - Setup & first analysis
- [Codebase Tour](guides/02-codebase-tour.md) - Understanding the structure
- [Key Concepts](guides/03-key-concepts.md) - VAC model explained simply
- [Common Tasks](guides/04-common-tasks.md) - Recipes & how-tos
- [Testing Guide](guides/05-testing-guide.md) - Writing tests
- [First Contribution](guides/06-first-contribution.md) - Your first PR

---

## Reference Documentation

Complete technical reference material:

- [API Reference](reference/api-reference.md) - All endpoints documented
- [Configuration Reference](reference/configuration.md) - Every setting explained
- [Error Codes Reference](reference/error-codes.md) - Error messages & solutions
- [Glossary](reference/glossary.md) - Terms and definitions

---

## Quick Links

### Common Tasks

- [Install Dependencies](guides/01-getting-started.md#step-3-install-dependencies)
- [Run the Listener](guides/01-getting-started.md#step-6-start-the-listener)
- [Test an Analysis](guides/01-getting-started.md#step-7-test-it-your-first-analysis)

### Advanced Topics

- [Extending the Listener](architecture/05-extending-listener.md)
- [Prompt Engineering](architecture/03-prompt-engineering.md)
- [Troubleshooting](architecture/06-troubleshooting.md)

### Integration

- [Integration Points](operations/../architecture/10-integration-points.md)
- [Configuration Reference](reference/configuration.md)

---

## Module Status

| Component | Status | Tests | Coverage |
|-----------|--------|-------|----------|
| Transcription | ✅ Production | Passing | 95% |
| Semantic Analyzer | ✅ Production | Passing | 92% |
| PII Scrubber | ✅ Production | Passing | 98% |
| Multi-Emotion | ✅ Production | Passing | 90% |
| Prosody Analyzer | ✅ Production | Passing | 88% |
| API Endpoints | ✅ Production | Passing | 94% |

**Overall Status:** Production Ready ✅

---

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | FastAPI | 0.104+ | REST API server |
| **Transcription** | OpenAI Whisper | base.en | Local speech-to-text |
| **LLM** | Ollama + Llama 3.1 | 8b-instruct-q4_0 | Semantic analysis |
| **Task Queue** | Arq + Redis | 0.26+ / 7+ | Async job processing |
| **NER** | Spacy | 3.7+ | PII detection |
| **Validation** | Pydantic | 2.0+ | Type-safe schemas |
| **Testing** | Pytest | 7.4+ | Test framework |

---

## Performance Benchmarks

Measured on M1 MacBook Pro (2021):

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Transcription (10s audio) | < 500ms | ~480ms | ✅ |
| Semantic Analysis | < 2s | ~1.5s | ✅ |
| PII Scrubbing | < 100ms | ~45ms | ✅ |
| **Total Pipeline** | **< 3s** | **~2s** | ✅ |

---

## Next Steps

1. **Choose your audience** - Pick the documentation track that matches your role
2. **Start learning** - Follow the guides in order
3. **Try it yourself** - Run the Listener locally
4. **Contribute** - Help improve the module

---

**Questions?** Check the [Troubleshooting Guide](architecture/06-troubleshooting.md) or [open an issue](https://gitlab.com/l_o_v_e/platform/-/issues).
