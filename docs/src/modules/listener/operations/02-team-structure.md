# Team Structure

**Reading Time:** ~15 minutes  
**Audience:** Engineering managers, hiring managers  
**Prerequisites:** [Monitoring & Operations](01-monitoring.md)  
**Goal:** Understand recommended team structure and responsibilities

---

## Recommended Team Composition

### Small Team (2-3 people)

For early stage or maintenance mode:

```text
┌─────────────────────────────────────┐
│   Senior Backend Engineer (Lead)   │
│   - Architecture & code review      │
│   - Performance optimization        │
│   - Production support              │
│   FTE: 1.0                          │
└─────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼────┐  ┌──▼──────┐
│ML/AI   │  │ Junior  │
│Engineer│  │Developer│
│0.5 FTE │  │ 0.5 FTE │
└────────┘  └─────────┘
```

**Total:** ~2 FTE

---

### Growing Team (4-6 people)

For active development:

```text
         ┌──────────────────┐
         │ Engineering Lead │
         └────────┬─────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌──▼──────┐ ┌──▼─────┐
│ Senior BE │ │ ML Eng  │ │ DevOps │
│ (Core)    │ │ (LLM)   │ │ (Ops)  │
│  1.0 FTE  │ │ 1.0 FTE │ │0.5 FTE │
└───────────┘ └─────────┘ └────────┘
      │           │
┌─────▼─────┐ ┌──▼──────┐
│ Junior #1 │ │Junior #2│
│  Features │ │ Testing │
│  0.5 FTE  │ │ 0.5 FTE │
└───────────┘ └─────────┘
```

**Total:** ~3.5-4 FTE

---

## Role Definitions

### Engineering Lead

**Responsibilities:**

- Architecture decisions
- Code review (all PRs)
- Performance optimization
- Production incidents (escalation point)
- Technical roadmap
- Cross-module coordination

**Required Skills:**

- Python expert (5+ years)
- FastAPI, async/await
- System design
- Team leadership

**Time Allocation:**

- 40% Architecture & design
- 30% Code review
- 20% Production support
- 10% Team coordination

---

### Senior Backend Engineer

**Responsibilities:**

- Core features implementation
- API design
- Integration with Observer/Versor
- Performance tuning
- Mentoring juniors

**Required Skills:**

- Python (3+ years)
- FastAPI, Pydantic
- Async programming
- Testing (pytest)

**Time Allocation:**

- 60% Feature development
- 20% Code review
- 15% Bug fixes
- 5% Documentation

---

### ML/AI Engineer

**Responsibilities:**

- Prompt engineering (THE CRITICAL WORK)
- Model selection and evaluation
- VAC extraction accuracy
- Multi-emotion analysis
- Semantic validation

**Required Skills:**

- LLM/prompt engineering
- Python
- Understanding of emotion psychology
- Statistical analysis

**Time Allocation:**

- 50% Prompt optimization
- 25% Model evaluation
- 15% Semantic testing
- 10% Research (new models/techniques)

---

### Junior Developer

**Responsibilities:**

- Feature implementation (guided)
- Writing tests
- Bug fixes
- Documentation updates

**Required Skills:**

- Python (1+ year)
- Eager to learn
- Testing mindset

**Time Allocation:**

- 65% Feature development
- 20% Testing
- 10% Learning
- 5% Documentation

---

### DevOps Engineer

**Responsibilities:**

- CI/CD pipelines
- Container orchestration
- Monitoring setup
- Incident response
- Capacity planning

**Required Skills:**

- Docker/K8s
- Prometheus/Grafana
- CI/CD (GitLab CI)
- Python (basic)

**Time Allocation:**

- 40% Infrastructure
- 30% Monitoring
- 20% Incident response
- 10% Automation

---

## Collaboration Model

### Code Review Process

**All code must be reviewed:**

| Change Type | Reviewers Required | Who? |
|-------------|-------------------|------|
| Feature | 1 senior | Lead or Senior BE |
| Bug fix | 1 | Any senior |
| Prompt change | 2 | ML Engineer + Lead (CRITICAL) |
| Deployment | 1 | DevOps |
| Documentation | 1 | Anyone |

**Critical Rule:** Prompt changes MUST be reviewed by ML Engineer.

---

### Meeting Cadence

**Daily Standup (15 min):**

- What I did yesterday
- What I'm doing today
- Any blockers

**Weekly Planning (1 hour):**

- Review sprint progress
- Plan next week
- Discuss technical challenges

**Bi-Weekly Retrospective (30 min):**

- What went well
- What to improve
- Action items

**Monthly Architecture Review (2 hours):**

- Review system health
- Discuss major changes
- Plan improvements

---

## Onboarding Timeline

### New Junior Developer

| Week | Focus | Goal |
|------|-------|------|
| **Week 1** | Setup + Learning | Environment running, understand VAC model |
| **Week 2** | Small tasks | First PR (docs or tests) |
| **Week 3** | Feature work | Implement small feature with guidance |
| **Week 4** | Independent | Take on issues independently |

**Resources:**

- [Junior Developer Docs](../guides/01-getting-started.md)
- Pair programming with senior
- Code review feedback

---

### New Senior Developer

| Week | Focus | Goal |
|------|-------|------|
| **Week 1** | Architecture | Understand system design, read ADRs |
| **Week 2** | Codebase | Review all services, run tests |
| **Week 3** | Feature work | Implement medium-complexity feature |
| **Week 4** | Production | On-call training, incident response |

**Resources:**

- [Senior Developer Docs](../architecture/01-deep-dive.md)
- Architecture review with lead
- Shadow on-call week

---

## Knowledge Management

### Critical Knowledge Areas

| Area | Primary Owner | Backup | Documentation |
|------|---------------|--------|---------------|
| Prompt Engineering | ML Engineer | Senior BE | [Prompt Engineering Guide](../architecture/03-prompt-engineering.md) |
| FastAPI Architecture | Senior BE | Lead | [Deep Dive](../architecture/01-deep-dive.md) |
| Deployment | DevOps | Senior BE | [Architecture Overview](../architecture/00-high-level-overview.md) |
| Testing | All | Lead | [Testing Guide](../guides/05-testing-guide.md) |

**Bus Factor:** Min 2 people for critical areas

---

## Hiring Profile

### Senior Backend Engineer

**Must have:**

- 3+ years Python
- FastAPI or similar async framework
- Microservices experience
- Test-driven development

**Nice to have:**

- LLM/ML experience
- Emotion/psychology background
- K8s/Docker

**Interview Focus:**

- Async programming challenge
- System design question
- Code review exercise

---

### ML Engineer

**Must have:**

- Prompt engineering experience
- Understanding of LLMs
- Python
- Statistical analysis

**Nice to have:**

- Psychology background
- Fine-tuning experience
- RAG systems

**Interview Focus:**

- Prompt engineering exercise: "Teach an LLM the Connection axis"
- Model selection discussion
- VAC concept understanding

---

## Key Takeaways

✅ **Small team:** 2 FTE sufficient for maintenance  
✅ **Growing team:** 3.5-4 FTE for active development  
✅ **Critical role:** ML Engineer owns prompt engineering  
✅ **Prompt changes:** Require 2 reviewers (critical)  
✅ **Onboarding:** 1-4 weeks depending on level  
✅ **Bus factor:** 2+ people for critical knowledge  

---

**Next:** [Incident Response →](03-incident-response.md)
