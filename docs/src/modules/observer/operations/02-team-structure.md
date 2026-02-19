# Team Structure

**Reading Time:** ~15 minutes
**Audience:** Engineering managers, hiring managers
**Prerequisites:** [Architecture Overview](../architecture/00-high-level-overview.md)
**Goal:** Understand recommended team structure and skills for Observer

---

## Overview

Observer requires a blend of skills:

- Backend development (Python, async)
- Database expertise (PostgreSQL, pgvector)
- Algorithms (A*, graph search)
- Vector search / ML fundamentals
- DevOps (Docker, monitoring)

---

## Recommended Team Structures

### Small Team (3-5 Engineers)

**Structure:**

```text
Engineering Manager
├─ Senior Backend Engineer (Observer lead)
├─ Backend Engineer (Observer + Listener)
├─ Database Engineer (Part-time, 50%)
└─ DevOps Engineer (Shared with other modules)
```

**Responsibilities:**

- **Senior Backend:** Architecture, A* pathfinding, vector search
- **Backend:** API endpoints, WebSockets, services
- **Database:** Schema design, indexing, migrations, performance
- **DevOps:** Deployment, monitoring, backups

### Medium Team (6-10 Engineers)

**Structure:**

```text
Engineering Manager
├─ Tech Lead (Observer architecture)
├─ Senior Backend Engineer × 2
│  ├─ Engineer 1: Core services (emotion matching, pathfinding)
│  └─ Engineer 2: Chat/WebSocket, insights
├─ Backend Engineer × 2
│  ├─ Engineer 3: API layer, integrations
│  └─ Engineer 4: Metrics, analytics
├─ Database Engineer (Full-time)
├─ DevOps Engineer
└─ QA Engineer (Testing, automation)
```

---

## Key Roles & Skills

### Backend Engineer (Observer)

**Core skills:**

- Python 3.12+ (advanced async/await)
- FastAPI (routing, dependencies, WebSockets)
- SQLAlchemy (async ORM, query optimization)
- Pydantic (validation, schemas)
- Algorithms (graph search, A*)

**Nice to have:**

- Vector databases / embeddings
- PostgreSQL tuning
- Microservice patterns
- Docker / Kubernetes

**Typical day:**

- Implement new API endpoints
- Optimize service layer code
- Write/review PRs
- Fix bugs
- Participate in architecture discussions

### Database Engineer

**Core skills:**

- PostgreSQL (advanced: indexing, partitioning, replication)
- pgvector (HNSW tuning, vector operations)
- SQL optimization (EXPLAIN ANALYZE, query planning)
- Alembic migrations
- Backup/recovery procedures

**Nice to have:**

- Vector search algorithms
- Python (for migration scripts)
- Prometheus/Grafana

**Typical day:**

- Monitor database performance
- Optimize slow queries
- Design/review schema changes
- Maintain backup systems
- Plan capacity upgrades

### DevOps Engineer

**Core skills:**

- Docker / Docker Compose
- CI/CD (GitHub Actions, GitHub Actions)
- Monitoring (Prometheus, Grafana)
- PostgreSQL operations
- AWS / GCP / Azure

**Nice to have:**

- Kubernetes
- Terraform
- PgBouncer configuration
- Load balancing

**Typical day:**

- Monitor production metrics
- Deploy new releases
- Investigate incidents
- Maintain infrastructure
- Optimize resource usage

---

## Onboarding Process

### Week 1: Setup & Fundamentals

**Goals:**

- Development environment running
- Understand L.O.V.E. ecosystem
- Read junior developer guides

**Tasks:**

- [ ] Set up local Observer instance
- [ ] Run all tests successfully
- [ ] Read [Getting Started](../guides/01-getting-started.md)
- [ ] Read [Codebase Tour](../guides/02-codebase-tour.md)
- [ ] Read [Key Concepts](../guides/03-key-concepts.md)

### Week 2: Code Exploration

**Goals:**

- Understand codebase structure
- Make first small contribution

**Tasks:**

- [ ] Read all service files
- [ ] Add a new emotion to atlas (guided)
- [ ] Write a test
- [ ] Submit first PR
- [ ] Read [Senior Dev: Architecture](../architecture/01-deep-dive.md)

### Week 3-4: Deep Dives

**Goals:**

- Master Observer internals
- Take on first real task

**Tasks:**

- [ ] Deep dive: Vector search
- [ ] Deep dive: A* pathfinding
- [ ] Deep dive: Database architecture
- [ ] Implement a small feature
- [ ] Pair with senior engineer

### Month 2+: Independent Contribution

**Goals:**

- Work independently
- Contribute to architecture discussions

**Tasks:**

- Implement features end-to-end
- Review others' PRs
- Participate in on-call rotation
- Mentor newer engineers

---

## Skill Development Paths

### Junior → Mid-Level

**Focus areas:**

1. Master Observer codebase
2. Learn pgvector and vector search
3. Understand A* algorithm
4. Write comprehensive tests
5. Own small features end-to-end

**Timeline:** 6-12 months

### Mid-Level → Senior

**Focus areas:**

1. Design new features (architecture)
2. Optimize database performance
3. Lead technical discussions
4. Mentor junior engineers
5. On-call incident response

**Timeline:** 12-24 months

### Senior → Tech Lead

**Focus areas:**

1. System architecture decisions
2. Cross-module integration design
3. Technical strategy
4. Code review excellence
5. Team technical growth

**Timeline:** 24+ months

---

## Collaboration Patterns

### Daily Standup

**Format:** Async (Slack) or 15-min sync

**Each engineer shares:**

- Yesterday: What I accomplished
- Today: What I'm working on
- Blockers: What's slowing me down

**Focus on:**

- Integration issues with other modules
- Database performance concerns
- Production incidents

### Weekly Sync

**Duration:** 1 hour

**Agenda:**

1. Production review (15 min)
   - Incidents
   - Performance trends
   - Alerts
2. Technical topics (30 min)
   - Architecture discussions
   - Code reviews
   - Tech debt
3. Planning (15 min)
   - Next week priorities
   - Dependency coordination

### Code Reviews

**Guidelines:**

- All code reviewed before merge
- At least 1 approval required
- Database changes require DB engineer approval
- Performance-sensitive code requires benchmarks

**Review checklist:**

- [ ] Tests included?
- [ ] Documentation updated?
- [ ] Performance considered?
- [ ] Security reviewed?
- [ ] Backward compatible?

---

## Communication Channels

### Internal

- **Slack #observer-dev:** Day-to-day discussion
- **Slack #observer-alerts:** Production alerts
- **GitHub issues:** Feature requests, bugs
- **GitHub PRs:** Code review
- **Weekly sync:** Team alignment

### Cross-Team

- **#love-architecture:** Cross-module architecture
- **#love-incidents:** Production incidents
- **#love-releases:** Release coordination

---

## Performance Goals

### Team Velocity

**Target:** 2-3 story points per engineer per week

**Typical stories:**

- Small feature: 2 points
- Medium feature: 5 points
- Large feature: 8 points
- Bug fix: 1-2 points

### Quality Metrics

**Targets:**

- Code coverage: > 85%
- Bug rate: < 2 bugs per 1000 LOC
- Mean time to resolution: < 24 hours
- PR review time: < 24 hours

---

## Hiring Profile

### Observer Backend Engineer

**Must have:**

- 3+ years Python
- Strong async programming
- PostgreSQL experience
- RESTful API design
- Testing (pytest)

**Should have:**

- Vector databases / embeddings
- Graph algorithms
- FastAPI
- Docker

**Nice to have:**

- ML fundamentals
- A* or similar pathfinding
- WebSocket protocols
- Production PostgreSQL tuning

### Interview Process

#### Round 1: Technical Screen (45 min)

- Python async programming
- Database query optimization
- Algorithm problem (graph search)

#### Round 2: System Design (60 min)

- Design vector similarity search
- Scale Observer to 1M users
- Trade-offs discussion

#### Round 3: Code Review (45 min)

- Review actual Observer PR
- Identify issues
- Suggest improvements

#### Round 4: Team Fit (30 min)

- Collaboration style
- Communication
- Learning approach

---

## Next Steps

**Operational guides:**

- [Monitoring & Operations](01-monitoring.md)
- [Incident Response](03-incident-response.md)

**For hiring:**

- [Junior Dev: Getting Started](../guides/01-getting-started.md) - Share with candidates
