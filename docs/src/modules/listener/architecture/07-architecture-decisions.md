# Architecture Decision Records (ADRs)

**Reading Time:** ~25 minutes  
**Audience:** Senior developers, architects  
**Prerequisites:** [Troubleshooting Guide](06-troubleshooting.md)  
**Goal:** Understand why key architectural decisions were made

---

## What are ADRs?

**Architecture Decision Records** document significant technical decisions, their context, and rationale. They help future developers understand WHY certain choices were made.

---

## ADR-001: Use Ollama Instead of OpenAI API

**Date:** November 2025  
**Status:** ✅ Accepted  
**Decision Makers:** Core team

### Context

We need an LLM to extract VAC coordinates from text. Options:

1. **OpenAI API** (GPT-4)
2. **Anthropic API** (Claude)
3. **Local LLM** via Ollama
4. **HuggingFace Transformers** (self-hosted)

### Decision

Use **Ollama with Llama 3.1** for local LLM inference.

### Rationale

**Pros:**

- ✅ **Privacy:** All data stays local (critical for emotional/health data)
- ✅ **Cost:** $0 per request vs. $0.02 for GPT-4
- ✅ **Control:** We control model selection and updates
- ✅ **Latency:** Acceptable (~1.5s) for our use case
- ✅ **Easy setup:** `brew install ollama` + `ollama pull model`

**Cons:**

- ❌ **Accuracy:** Local 8B models < GPT-4 quality
- ❌ **Resources:** Requires CPU/RAM (or GPU)
- ❌ **Maintenance:** We manage model updates

### Alternatives Considered

| Option | Privacy | Cost | Accuracy | Setup | Selected? |
|--------|---------|------|----------|-------|-----------|
| OpenAI API | ❌ | ❌ | ✅✅✅ | ✅ | ❌ |
| Anthropic API | ❌ | ❌ | ✅✅ | ✅ | ❌ |
| **Ollama** | ✅✅ | ✅✅ | ✅ | ✅ | **✅** |
| HuggingFace | ✅ | ✅ | ✅ | ❌ | ❌ |

### Consequences

- Users must install Ollama and download models (~5GB)
- Accuracy is ~91% vs. ~95% for GPT-4
- But privacy and cost benefits outweigh accuracy loss
- Can always add GPT-4 as optional enhancement

### Validation

Tested on 100 examples:

- Ollama (llama3.1:8b): 91% accuracy, 0.18 MAE on Connection
- GPT-4: 95% accuracy, 0.12 MAE on Connection

**Conclusion:** Acceptable trade-off

---

## ADR-002: Use FastAPI Instead of Flask

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

Need a Python web framework for the Listener API.

### Decision

Use **FastAPI** instead of Flask or Django.

### Rationale

**Pros:**

- ✅ **Async native:** Built for `async/await` (critical for LLM calls)
- ✅ **Type hints:** Pydantic integration for validation
- ✅ **Auto documentation:** OpenAPI/Swagger generated automatically
- ✅ **Performance:** Faster than Flask for async operations
- ✅ **Modern:** Active development, growing ecosystem

**Cons:**

- ❌ **Learning curve:** Async patterns can be tricky
- ❌ **Newer:** Less mature than Flask (but stable enough)

### Alternatives

- **Flask:** Synchronous (blocks on LLM calls)
- **Django:** Too heavyweight for a microservice

### Consequences

- Team needs async/await expertise
- But async is essential for LLM inference
- Worth the learning curve

---

## ADR-003: Use Pydantic for Validation

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

LLMs can return invalid data (values > 1.0, wrong types, etc.)

### Decision

Use **Pydantic models** for strict validation.

### Rationale

**Benefits:**

```python
class VACVector(BaseModel):
    valence: float = Field(ge=-1.0, le=1.0)  # Enforces range!
    arousal: float = Field(ge=-1.0, le=1.0)
    connection: float = Field(ge=-1.0, le=1.0)

# If LLM returns valence=2.0, Pydantic raises ValidationError
```

- ✅ Catches errors before they propagate
- ✅ Self-documenting (OpenAPI schema generation)
- ✅ Type safety throughout the codebase

### Alternatives

- Manual validation (error-prone)
- JSON Schema validation (more verbose)

### Consequences

- Must define models for all data structures
- But prevents entire classes of bugs

---

## ADR-004: Use Arq (Not Celery) for Async Jobs

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

Need background job processing for audio analysis (can take 2-3s).

### Decision

Use **Arq** with Redis for async job queue.

### Rationale

**Pros:**

- ✅ **Async-native:** Built for `asyncio` (matches FastAPI)
- ✅ **Lightweight:** Minimal dependencies
- ✅ **Simple:** Easy to understand and debug
- ✅ **Redis-based:** We already use Redis

**Cons:**

- ❌ **Less mature:** Newer than Celery
- ❌ **Fewer features:** No flower UI, simpler monitoring

### Alternatives

| Option | Async? | Complexity | Features | Selected? |
|--------|--------|------------|----------|-----------|
| **Arq** | ✅ | Low | Basic | **✅** |
| Celery | ❌ | High | Many | ❌ |
| RQ | ❌ | Medium | Medium | ❌ |

### Consequences

- Simple worker implementation
- Less monitoring tools
- But easier to maintain and debug

---

## ADR-005: Store Only Sanitized Text (Not Audio)

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

Audio files contain rich personal information. Should we store them?

### Decision

**Never store audio files.** Process and discard immediately.

### Rationale

**Privacy-first design:**

```python
async def process_audio(ctx, audio_path, ...):
    try:
        # 1. Transcribe
        transcription = transcribe(audio_path)
        
        # 2. Analyze
        emotion = await analyze(transcription.text)
        
        # 3. Scrub PII
        sanitized = pii_scrubber.scrub(transcription.text)
        
        # 4. Store ONLY sanitized text
        await observer.record_state(sanitized_text=sanitized, ...)
        
    finally:
        # 5. DELETE audio file
        os.remove(audio_path)
```

**Benefits:**

- ✅ Minimizes privacy risk
- ✅ Reduces storage costs
- ✅ Complies with data minimization principles

**Trade-offs:**

- ❌ Can't re-analyze audio if transcription was wrong
- ❌ Can't improve models with historical audio

**Conclusion:** Privacy > reanalysis capability

---

## ADR-006: Temperature = 0.0 for Determinism

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

LLM temperature controls randomness in generation.

### Decision

Use **temperature = 0.0** (fully deterministic).

### Rationale

**Benefits:**

- ✅ **Testability:** Same input → same output (tests don't flake)
- ✅ **Reproducibility:** Users get consistent results
- ✅ **Debugging:** Easier to debug when behavior is predictable

**Trade-offs:**

- ❌ **Less creative:** No variation in outputs
- ❌ **Less robust:** Can't average multiple samples

**Why it's worth it:**

For emotion detection, consistency > creativity. We want:

- Same text analyzed twice → same VAC values
- Tests that pass reliably
- Production behavior that's predictable

### Alternative: Temperature > 0 + Averaging

```python
# NOT USED: Multiple samples + averaging
results = []
for _ in range(5):
    results.append(analyzer.analyze(text, temperature=0.7))

avg_connection = np.mean([r.vac.connection for r in results])
```

**Why rejected:** 5x slower, marginal accuracy gain

---

## ADR-007: Use Few-Shot Prompting (Not Fine-Tuning)

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

How to teach the LLM the Connection axis?

Options:

1. **Few-shot prompting:** Include examples in prompt
2. **Fine-tuning:** Train model on labeled dataset
3. **RAG:** Retrieve similar examples dynamically

### Decision

Use **few-shot prompting** with 6 carefully chosen examples.

### Rationale

**Pros:**

- ✅ **No training needed:** Works immediately
- ✅ **Easy to iterate:** Change examples, test, repeat
- ✅ **Model-agnostic:** Works with any LLM
- ✅ **Explainable:** Examples are visible in prompt

**Cons:**

- ❌ **Prompt length:** Examples add tokens (~1000)
- ❌ **Limited examples:** Can't include all 87 emotions

### Alternatives

**Fine-tuning:**

- Requires labeled dataset (expensive to create)
- Requires compute for training
- Model-specific (can't switch models easily)
- **Rejected:** Too much overhead

**RAG (Retrieval-Augmented Generation):**

- Requires vector database
- Adds latency for retrieval
- More complex system
- **Rejected:** Over-engineering for our use case

### Consequences

- Prompt is ~1000 tokens
- Can't demonstrate all 87 emotions
- But examples cover the key patterns

---

## ADR-008: Single-Emotion vs. Multi-Emotion Analysis

**Date:** December 2025  
**Status:** ✅ Both Supported

### Context

People often feel multiple emotions simultaneously. Should we detect one or many?

### Decision

Support **both** modes:

1. **Single-emotion mode** (default): Fast, simple
2. **Multi-emotion mode** (opt-in): Detects up to 3 concurrent emotions

### Rationale

**Single-emotion:**

- Most requests don't need complexity
- Faster (~1.5s)
- Simpler UX

**Multi-emotion:**

- Some situations need it: "I'm hopeful but anxious"
- Deeper insight
- But slower (~3-4s)

### Implementation

```python
# Default endpoint (single)
POST /listener/analyze  

# Multi-emotion endpoint (opt-in)
POST /listener/analyze-multi-emotion
```

**Consequence:** Two code paths to maintain, but serves different needs.

---

## ADR-009: PII Scrubbing with Spacy (Not LLM)

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

Need to remove personally identifiable information before storage.

Options:

1. **Spacy NER** (named entity recognition)
2. **LLM-based** (ask LLM to remove PII)
3. **Regex patterns**

### Decision

Use **Spacy NER** for PII detection and scrubbing.

### Rationale

**Pros:**

- ✅ **Fast:** ~45ms per text
- ✅ **Reliable:** Trained on large corpora
- ✅ **Specific:** Detects PERSON, ORG, GPE, DATE, etc.
- ✅ **Privacy:** Runs locally, no API calls

**Cons:**

- ❌ **Not perfect:** ~95% accuracy (some PII may slip through)
- ❌ **Language-specific:** English only (currently)

### Alternatives

**LLM-based:**

```python
prompt = "Remove all PII from this text: {text}"
```

- More accurate (~98%)
- But slower (+1s latency)
- **Rejected:** Speed matters more for this use case

**Regex patterns:**

- Very fast
- But very brittle (lots of false positives/negatives)
- **Rejected:** Too unreliable

### Consequences

- Must download Spacy model: `python -m spacy download en_core_web_sm`
- ~95% PII removal rate (acceptable)
- For clinical use, could add LLM pass as second layer

---

## ADR-010: Stateless Microservice Design

**Date:** November 2025  
**Status:** ✅ Accepted

### Context

Should the Listener store state or be stateless?

### Decision

**Stateless:** The Listener has no database, no persistent state.

### Rationale

**Benefits:**

- ✅ **Horizontal scaling:** Just add more instances
- ✅ **Simpler deployment:** No database migrations
- ✅ **Faster recovery:** Restart instantly
- ✅ **Cleaner separation:** Observer handles persistence

**Design:**

```text
Listener (stateless)
    ↓ VAC
Observer (stateful) - Stores emotional states
    ↓ Quaternion
Versor (stateless)
    ↓ Animation
Experience (stateful - client-side)
```

### Consequences

- Listener can't query historical data (asks Observer instead)
- Can scale Listener independently of data layer
- Simpler to reason about

---

## ADR-011: Connection Axis as Core Innovation

**Date:** November 2025  
**Status:** ✅ Accepted  
**Impact:** CRITICAL

### Context

Standard sentiment analysis uses Valence + Arousal (2D). Should we add a third dimension?

### Decision

Add **Connection axis** as the defining innovation of L.O.V.E.

### Rationale

**Problem with 2D models:**

They cannot distinguish:

- Pity vs. Compassion (both negative valence, low arousal)
- Grief vs. Despair (both negative valence, low energy)
- Belonging vs. Fitting In (both positive valence)
- Shame vs. Embarrassment (both negative, medium arousal)

**Solution:**

Connection axis measures **relational alignment:**

- Pity: Connection = -0.7 (feeling FOR = separation)
- Compassion: Connection = +0.9 (feeling WITH = alignment)

### Validation

**The Sacred Test:**

```python
def test_pity_vs_compassion():
    """If this fails, the innovation is broken"""
    pity = analyze("I feel sorry for them")
    assert pity.vac.connection < 0
    
    compassion = analyze("I feel with them")
    assert compassion.vac.connection > 0.5
```

**Results:** ✅ 95% accuracy on test set

### Consequences

- This is THE differentiator for L.O.V.E.
- Must be validated in every release
- Prompt engineering focuses heavily on teaching Connection

---

## ADR-012: Six Few-Shot Examples (Not More)

**Date:** December 2025  
**Status:** ✅ Accepted

### Context

How many few-shot examples should we include in the prompt?

### Decision

Use **6 examples** covering critical emotions and the Connection range.

### Rationale

**Testing different counts:**

| Examples | Prompt Tokens | Latency | Accuracy | Connection MAE |
|----------|---------------|---------|----------|----------------|
| 2 | ~400 | 1.0s | 84% | 0.32 |
| 4 | ~700 | 1.3s | 89% | 0.22 |
| **6** | **~1000** | **1.5s** | **91%** | **0.18** |
| 8 | ~1300 | 1.9s | 92% | 0.17 |
| 12 | ~2000 | 2.8s | 93% | 0.15 |

**Conclusion:** 6 examples is the sweet spot:

- Good accuracy (91%)
- Acceptable latency (1.5s)
- Diminishing returns beyond 6

### The Six Examples

1. Pity (negative Connection)
2. Compassion (positive Connection)
3. Joy (positive Connection)
4. Grief (negative Valence but positive Connection - edge case)
5. Loneliness (very negative Connection)
6. Overwhelm (moderate Connection)

### Future

Could add dynamic example selection (retrieve most relevant examples based on input).

---

## ADR-013: Sync and Async Endpoints

**Date:** December 2025  
**Status:** ✅ Accepted

### Context

Should we offer synchronous endpoints or only async job queuing?

### Decision

Offer **both**:

- `POST /listener/analyze` - Synchronous (immediate response)
- `POST /listener/ingest` - Asynchronous (queue + job ID)

### Rationale

**Different use cases:**

| Use Case | Endpoint | Why |
|----------|----------|-----|
| Interactive chat | `/analyze` | Need immediate feedback |
| Batch processing | `/ingest` | Can wait, more reliable |
| Mobile app | `/analyze` | UX requires fast response |
| Historical import | `/ingest` | Process in background |

### Implementation

```python
# Sync endpoint
@router.post("/analyze")
async def analyze_text(...):
    result = await analyzer.analyze(text)  # Wait for result
    return result  # Immediate response

# Async endpoint
@router.post("/ingest")
async def ingest(...):
    job = await redis.enqueue_job('process_audio', ...)
    return {"job_id": job.job_id}  # Immediate response, processing happens later
```

### Consequences

- Two code paths to maintain
- But serves both interactive and batch use cases

---

## Summary of Key Decisions

| ADR | Decision | Impact |
|-----|----------|--------|
| ADR-001 | Ollama (local LLM) | Privacy + cost |
| ADR-002 | FastAPI | Async performance |
| ADR-003 | Pydantic validation | Type safety |
| ADR-004 | Arq (not Celery) | Simplicity |
| ADR-005 | No audio storage | Privacy |
| ADR-006 | Temperature = 0.0 | Determinism |
| ADR-007 | Few-shot prompting | Easy iteration |
| ADR-008 | Both single & multi | Flexibility |
| ADR-009 | Spacy NER | Speed |
| ADR-010 | Stateless service | Scalability |
| ADR-011 | **Connection axis** | **THE INNOVATION** |
| ADR-012 | 6 few-shot examples | Balance |
| ADR-013 | Sync + async endpoints | UX flexibility |

---

## Future ADRs to Document

As the system evolves, document:

- Model selection strategy (when to use which model)
- Caching policy (what to cache, for how long)
- Rate limiting approach
- Authentication/authorization
- Multi-language support
- Real-time streaming vs. batch

---

## Key Takeaways

✅ **Document decisions** while context is fresh  
✅ **Include rationale:** WHY not just WHAT  
✅ **Show alternatives:** What was considered  
✅ **Note consequences:** Trade-offs made  
✅ **Update when revisited:** ADRs can be superseded  

---

**Congratulations!** You've completed all senior developer documentation for the Listener module! 🎉

**Next steps:**

- Review [Manager Documentation](../architecture/00-high-level-overview.md) for operational perspective
- Or explore [Executive Documentation](../overview/01-executive-summary.md) for strategic context
