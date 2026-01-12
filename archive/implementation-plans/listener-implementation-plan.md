# Listener Module - Implementation Plan

## Overview

This document tracks the implementation progress of the Listener module using a fully **local-first architecture** with Ollama (Llama 3.1) and faster-whisper.

## Architecture Decision: Local-First

**Technology Choices**:
- **Transcription**: faster-whisper (local Whisper model)
- **LLM**: Ollama + Llama 3.1 8B
- **Task Queue**: Redis + Arq
- **Privacy**: All processing happens locally

**Benefits**:
- ✅ No API costs
- ✅ Complete privacy (audio never leaves machine)
- ✅ No rate limits
- ✅ Works offline
- ✅ Faster development iteration

## Implementation Timeline

### ✅ Day 1: Environment Setup & Dependencies (COMPLETE)

**Status**: ✅ COMPLETE

**Completed**:
- [x] Created complete directory structure
- [x] Created `requirements.txt` with all dependencies
- [x] Created `.env.example` configuration template
- [x] Created `app/config.py` with Pydantic settings
- [x] Created all `__init__.py` files for proper packaging
- [x] Created `pytest.ini` with test configuration
- [x] Created `.gitignore` for Python project
- [x] Created `SETUP.md` with detailed installation instructions
- [x] Created `README.md` with project overview

**Files Created** (19 total):
```
listener/
├── requirements.txt
├── .env.example
├── .gitignore
├── pytest.ini
├── README.md
├── SETUP.md
├── IMPLEMENTATION_PLAN.md
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       └── __init__.py
│   ├── services/
│   │   └── __init__.py
│   ├── workers/
│   │   └── __init__.py
│   ├── models/
│   │   └── __init__.py
│   └── utils/
│       └── __init__.py
└── tests/
    ├── __init__.py
    ├── unit/
    │   └── __init__.py
    ├── semantic/
    │   └── __init__.py
    └── integration/
        └── __init__.py
```

**Next Steps**: User must install dependencies:
```bash
cd listener
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Install system dependencies
brew install ollama redis ffmpeg
ollama serve &
ollama pull llama3.1:8b-instruct-q4_0
```

---

### Day 2: Transcription Service Implementation

**Goal**: Implement faster-whisper audio transcription service

**Tasks**:
- [ ] Create `TranscriptionService` class
- [ ] Implement audio file handling (WAV, M4A, AAC)
- [ ] Create audio normalization utilities with ffmpeg
- [ ] Implement model loading and caching
- [ ] Write unit tests with sample audio files

**Deliverables**:
- [ ] `app/services/transcription.py`
- [ ] `app/utils/audio_utils.py`
- [ ] `tests/unit/test_transcription.py`
- [ ] Sample audio files in `tests/fixtures/`

**Success Criteria**:
- ✅ Can transcribe 10s audio file in <1s
- ✅ Handles multiple audio formats
- ✅ Model caching prevents reload on each request
- ✅ Unit tests pass

---

### Day 3: Semantic Analysis with Local LLM

**Goal**: Implement VAC extraction using Ollama + LangChain

**Tasks**:
- [ ] Create `SemanticAnalyzer` class with Ollama integration
- [ ] Implement psychometric prompt with few-shot examples
- [ ] Create Pydantic models for VAC response
- [ ] Implement structured output parsing
- [ ] Focus on Connection axis extraction

**Deliverables**:
- [ ] `app/services/semantic_analyzer.py`
- [ ] `app/models/vac_response.py`
- [ ] Prompt template with Pity/Compassion examples
- [ ] Basic unit tests

**Success Criteria**:
- ✅ LLM returns structured JSON with VAC values
- ✅ Pydantic validation works
- ✅ Connection axis values are reasonable
- ✅ Processing time <2s per request

---

### Day 4: CRITICAL - Semantic Validation Testing

**Goal**: Validate Connection axis extraction - THE MOST CRITICAL MILESTONE

**Tasks**:
- [ ] Implement `test_pity_vs_compassion()` - **THE critical test**
- [ ] Implement `test_grief_positive_connection()`
- [ ] Implement `test_belonging_vs_fitting_in()`
- [ ] **Iterate on prompt engineering until all tests pass**
- [ ] Document prompt refinement process

**Deliverables**:
- [ ] `tests/semantic/test_connection_axis.py`
- [ ] `tests/semantic/test_vac_extraction.py`
- [ ] All semantic tests passing ✅
- [ ] Finalized prompt template
- [ ] Test report with accuracy metrics

**Success Criteria** (MUST ACHIEVE):
- ✅ **Pity shows negative Connection (<-0.5)**
- ✅ **Compassion shows positive Connection (>0.5)**
- ✅ **Grief shows positive Connection despite negative Valence**
- ✅ **All VAC values within [-1, 1] range**
- ✅ **Confidence scores >0.8**

**This is the validation checkpoint!** If these tests fail, iterate on the prompt until they pass.

---

### Day 5: Observer Integration & PII Sanitization

**Goal**: Complete the pipeline to Observer and protect privacy

**Tasks**:
- [ ] Implement Spacy NER for PII detection
- [ ] Create PII scrubbing service
- [ ] Create Observer API client
- [ ] Implement end-to-end pipeline: audio → VAC → Observer
- [ ] Write integration tests

**Deliverables**:
- [ ] `app/services/pii_scrubber.py`
- [ ] `app/services/observer_client.py`
- [ ] `tests/integration/test_full_pipeline.py`
- [ ] End-to-end flow working

**Success Criteria**:
- ✅ PII is correctly identified and scrubbed
- ✅ Observer API integration works
- ✅ States are stored correctly in Observer
- ✅ Pipeline completes in <3s

---

### Day 6: Redis + Arq Async Queue

**Goal**: Implement asynchronous job processing

**Tasks**:
- [ ] Install and configure Redis locally
- [ ] Setup Arq worker infrastructure
- [ ] Implement `audio_processor` worker
- [ ] Implement job queue management
- [ ] Configure worker pool

**Deliverables**:
- [ ] `app/workers/audio_processor.py`
- [ ] Redis configuration
- [ ] Worker management scripts

**Success Criteria**:
- ✅ Redis connection works
- ✅ Workers can process jobs asynchronously
- ✅ Job status tracking works
- ✅ Multiple workers can run concurrently

---

### Day 7: FastAPI Endpoints

**Goal**: Create REST API for ingestion and status checking

**Tasks**:
- [ ] Implement `POST /listener/ingest` - Audio/text upload
- [ ] Implement `GET /listener/status/{job_id}` - Job status
- [ ] Implement health check endpoint
- [ ] Create request/response schemas
- [ ] Implement error handling

**Deliverables**:
- [ ] `app/api/routes/ingest.py`
- [ ] `app/api/routes/health.py`
- [ ] `app/main.py` - FastAPI app
- [ ] API documentation (Swagger)

**Success Criteria**:
- ✅ Can upload audio via API
- ✅ Job queueing works
- ✅ Status endpoint returns correct information
- ✅ API documentation is complete

---

### Day 8: Integration Testing & Performance

**Goal**: Validate complete system and optimize

**Tasks**:
- [ ] End-to-end API testing
- [ ] Latency benchmarking
- [ ] Load testing with concurrent requests
- [ ] Performance optimization
- [ ] Documentation updates

**Deliverables**:
- [ ] Complete integration test suite
- [ ] Performance benchmarks report
- [ ] Optimization recommendations
- [ ] Updated documentation

**Success Criteria**:
- ✅ Complete pipeline works end-to-end
- ✅ P95 latency <3s for full pipeline
- ✅ Can handle 10+ concurrent requests
- ✅ All tests passing
- ✅ Ready for integration with Experience module

---

## Critical Success Criteria

Before marking Listener as COMPLETE, we MUST achieve:

1. ✅ **Pity vs. Compassion distinction works** (Connection axis validated)
2. ✅ **Grief shows positive Connection** (validates love in loss)
3. ✅ **All VAC values valid** ([-1, 1] range)
4. ✅ **Pipeline latency <3s** (P95)
5. ✅ **Observer integration functional** (states stored correctly)
6. ✅ **All semantic tests passing** (>90% accuracy)

## Risk Management

### High Risk Items

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Ollama prompt doesn't extract Connection correctly | Critical | Extensive prompt engineering with few-shot examples | Pending Day 4 |
| faster-whisper transcription too slow | Medium | Use base.en model, optimize with GPU if available | TBD |
| Local LLM output inconsistent | High | Use temperature=0.0, structured output with Pydantic | TBD |
| Integration with Observer fails | Medium | Mock Observer for testing, fix real integration later | TBD |

## Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Transcription (10s audio) | <500ms | TBD |
| Semantic Analysis | <2s | TBD |
| PII Scrubbing | <100ms | TBD |
| **Total Pipeline** | **<3s** | **TBD** |

## Next Session

**Start with Day 2**: Transcription Service Implementation

**First task**: Create `app/services/transcription.py` with faster-whisper integration

**Prerequisites**: User must have completed environment setup (venv, dependencies, Ollama, Redis)
