# L.O.V.E. Project - Architecture Documentation

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Alpha

---

## 📚 Documentation Index

This architecture documentation provides a comprehensive technical deep-dive into the L.O.V.E. (Listener-Observer-Versor-Experience) stack—a multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Connection) model with quaternion mathematics for 3D visualization.

### Core Architecture Documents

1. **[System Overview](01-system-overview.md)**
   High-level architecture, the four-module stack, and how they work together

2. **[The VAC Model](02-vac-model.md)**
   The innovation behind the Connection axis and why it matters

3. **[Listener Module](../modules/listener/index.md)**
   Audio transcription and semantic VAC analysis

4. **[Observer Module](../modules/observer/index.md)**
   Data persistence, vector search, and emotional atlas

5. **[Versor Module](../modules/versor/index.md)**
   Quaternion mathematics engine

6. **[Experience Module](../modules/experience/index.md)**
   3D visualization and user interface

7. **[Integration Patterns](07-integration-patterns.md)**
   How modules communicate and data flows

8. **[Data Architecture](08-data-architecture.md)**
   Database schema, seeding system, and data management

9. **[Technology Stack](09-technology-stack.md)**
   Technology choices and architectural decisions

10. **[Deployment & Operations](10-deployment-operations.md)**
    Running, testing, and deploying the stack

11. **[Development Guide](11-development-guide.md)**
    For new developers joining the project

12. **[Known Issues & Solutions](12-known-issues.md)**
    Current blockers and workarounds

---

## 🎯 Quick Navigation by Role

### For New Developers

Start here: [Development Guide](11-development-guide.md) → [System Overview](01-system-overview.md)

### For Module Developers

- Working on audio/text? → [Listener Module](../modules/listener/index.md)
- Working on data/DB? → [Observer Module](../modules/observer/index.md)
- Working on math? → [Versor Module](../modules/versor/index.md)
- Working on UI/3D? → [Experience Module](../modules/experience/index.md)

### For Integration Work

[Integration Patterns](07-integration-patterns.md) → [Data Architecture](08-data-architecture.md)

### For Deployment/DevOps

[Deployment & Operations](10-deployment-operations.md) → [Technology Stack](09-technology-stack.md)

### For Understanding the Innovation

[The VAC Model](02-vac-model.md) → [System Overview](01-system-overview.md)

---

## 📊 Project Status at a Glance

| Module | Status | Tests | Documentation |
|--------|--------|-------|---------------|
| **Versor** | 🧪 Alpha | 68/68 passing | ✅ Complete |
| **Observer** | 🧪 Alpha | Passing | ✅ Complete |
| **Listener** | 🧪 Alpha | Passing | ✅ Complete |
| **Experience** | 🧪 Alpha | Passing | ✅ Complete |

**Overall System:** Deployed to production at [love.jrgochan.io](https://love.jrgochan.io)

---

## 🔑 Key Concepts

Before diving into the documentation, familiarize yourself with these core concepts:

### The VAC Model

- **V**alence: Emotional positivity/negativity [-1, 1]
- **A**rousal: Activation/energy level [-1, 1]
- **C**onnection: Interpersonal alignment [-1, 1]

The **Connection axis** is the innovation—it distinguishes:

- Pity (feeling FOR someone, C < 0) vs. Compassion (feeling WITH someone, C > 0)
- Grief (connected loss, C > 0) vs. Despair (isolated suffering, C < 0)

### The Four Modules

```text
┌──────────────────────────────────────────────────────────┐
│                    L.O.V.E. STACK                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  LISTENER → OBSERVER → VERSOR → EXPERIENCE              │
│  (Input)    (Memory)   (Math)   (Output)                │
│                                                          │
│  Audio/Text → VAC → Store → Quaternion → 3D Viz         │
└──────────────────────────────────────────────────────────┘
```

### Technology Choices

- **Python 3.12+** for backend services
- **FastAPI** for REST APIs
- **PostgreSQL 18 + pgvector** for vector search
- **Ollama + Llama 3.1** for local LLM (privacy-first)
- **Next.js 16 + React Three Fiber** for 3D web interface

---

## 🏗️ Architecture Philosophy

### 1. **Local-First**

No cloud APIs required for core functionality—protects user privacy for sensitive emotional data.

### 2. **Microservices**

Each module is independent, can be deployed separately, communicates via REST APIs.

### 3. **Evidence-Based**

All emotional strategies cite peer-reviewed research (Linehan, Brown, Gross, Van der Kolk, etc.).

### 4. **Mathematical Foundation**

Quaternions provide smooth, continuous transitions in 3D emotional space.

### 5. **Code Quality**

Comprehensive testing, error handling, documentation, and deployment automation.

---

## 📖 Reading Guide

### Quick Start (1 hour)

1. [System Overview](01-system-overview.md) - 10 min
2. [The VAC Model](02-vac-model.md) - 10 min
3. [Integration Patterns](07-integration-patterns.md) - 15 min
4. [Deployment & Operations](10-deployment-operations.md) - 25 min

### Deep Dive (4-6 hours)

Read all documents in order (00-12).

### Module-Specific (30-45 min each)

Jump to your module of interest (03-06).

---

## 🔗 Related Documentation

### Module-Level Documentation

- `listener/README.md` - Listener setup and API
- `listener/docs/` - 13 detailed Listener specifications
- `observer/README.md` - Observer setup and API
- `observer/docs/` - Observer specifications
- `versor/README.md` - Versor setup and API
- `versor/docs/` - 14 detailed Versor specifications
- `experience/README.md` - Experience setup guide
- `experience/docs/` - 13 Experience specifications

### Project-Level Documentation

- `/README.md` - Project overview and quick start
- `/INTEGRATION_STATUS.md` - Current integration status
- `/DEVELOPMENT_VS_PRODUCTION.md` - Environment differences
- `infra/README.md` - Infrastructure and deployment
- `observer/SEEDING_SYSTEM_README.md` - Database seeding guide
- `observer/TRANSITION_SYSTEM_COMPLETE.md` - Transition system details

### Archived Documentation

Historical session summaries and implementation plans have been moved to `/archive/` to maintain a clean documentation footprint. See `/archive/README.md` for details.

---

## 🤝 Contributing to Documentation

When updating architecture documentation:

1. **Update the relevant section** - Don't create new top-level docs
2. **Keep it current** - Archive outdated session summaries
3. **Use clear diagrams** - ASCII diagrams are fine
4. **Link liberally** - Cross-reference related sections
5. **Version the changes** - Update "Last Updated" dates

---

## 📝 Document Conventions

- ✅ **Complete** - Fully implemented and tested
- 🚧 **In Progress** - Partially implemented
- ⏳ **Pending** - Planned but not started
- ❌ **Blocked** - Waiting on dependency

Code blocks are tagged with language for syntax highlighting:

- `python` for Python
- `typescript` for TypeScript
- `bash` for shell commands
- `sql` for database queries
- `json` for JSON data

---

**Ready to explore?** Start with [System Overview →](01-system-overview.md)
