# Listener Module - Overview

## Executive Summary

The **Listener Module** serves as the sensory cortex of Project L.O.V.E. (Listener-Observer-Versor-Experience). It is the first point of contact between the messy, analog reality of human expression and the precise, digital language of quaternions.

The Listener is responsible for:

- **Multi-Modal Ingestion**: Capturing voice and text input
- **Real-Time Transcription**: On-device speech-to-text (< 200ms feedback)
- **Semantic Analysis**: Extracting VAC scalars from transcribed text
- **Atlas Mapping**: Classifying input into one of 87 defined emotions
- **PII Sanitization**: Protecting user privacy through data scrubbing

## The Core Challenge: Translating the Ineffable

Traditional emotion tracking asks users to select from predefined options ("How are you feeling? 😊 😐 😢"). The Listener takes a radically different approach:

**Users speak naturally**, and the system:
1. Transcribes their words
2. Analyzes semantic meaning
3. Extracts three dimensions (Valence, Arousal, Connection)
4. Maps to the Atlas of the Heart taxonomy
5. Converts to mathematical quaternions

## The Split-Brain Architecture

The Listener employs a unique **Hybrid Edge-Cloud** topology to balance responsiveness with depth:

### Edge (Mobile Device)
**Purpose**: Immediate feedback, zero-latency perception

- **Technology**: whisper.rn (on-device Whisper)
- **Model**: Tiny/Base (75MB)
- **Latency**: < 200ms
- **Accuracy**: ~85% (sufficient for visual feedback)
- **Privacy**: Fully offline, no audio leaves device initially

### Cloud (Backend Server)
**Purpose**: Deep semantic analysis, canonical truth

- **Technology**: faster-whisper + LangChain + LLM
- **Model**: Large-v3 Whisper + GPT-4/Llama-70B
- **Latency**: < 3000ms (acceptable for final processing)
- **Accuracy**: ~98% transcription + nuanced emotion detection
- **Privacy**: PII scrubbed before storage

```
User speaks
     ↓
┌────────────────────────────────────┐
│  EDGE: Immediate Feedback          │
│  whisper.rn → crude sentiment      │
│  → tint Soul Sphere (red/cyan)     │
│  Latency: < 200ms                  │
└────────────────┬───────────────────┘
                 │
                 ↓
         [Audio uploaded]
                 │
                 ↓
┌────────────────────────────────────┐
│  CLOUD: Deep Analysis              │
│  faster-whisper → accurate text    │
│  LLM → VAC extraction              │
│  → Observer → Versor → Experience  │
│  Latency: < 3000ms                 │
└────────────────────────────────────┘
```

## Core Responsibilities

### 1. Audio Capture & Transcription

**Edge Processing**:
```
Voice → whisper.rn (on-device) → text stream → optimistic UI update
```

**Cloud Processing**:
```
Audio file → faster-whisper (GPU) → high-fidelity transcript
```

### 2. Semantic VAC Extraction

Using LLM with structured output:

```
Transcript → LangChain → LLM analysis → Pydantic validation → VAC scalars
```

**Output**:
```json
{
  "primary_emotion": "Overwhelm",
  "category": "Places We Go When Things Are Uncertain",
  "vac": {
    "valence": -0.6,
    "arousal": 0.9,
    "connection": -0.3
  },
  "confidence": 0.92,
  "reasoning": "High arousal (overwhelm) + negative tone + frayed connection from stress"
}
```

### 3. The Connection Challenge

**The hardest task**: Extracting the z-axis (Connection) dimension.

Standard sentiment models conflate Valence and Connection:
- "I feel sorry for them" (Pity) → Negative sentiment
- "I feel their pain" (Compassion) → Also negative sentiment

But in VAC space:
- **Pity**: Connection = -0.7 (separation, condescension)
- **Compassion**: Connection = +0.9 (shared humanity, alignment)

The Listener must use **few-shot prompting** with Atlas examples to train the LLM.

### 4. PII Sanitization

Before storage, scrub personal information:

```
Raw: "I saw Dr. Smith at Kaiser Hospital on Tuesday"
Sanitized: "I saw [NAME] at [ORG] on [DATE]"
```

**Technology**: Spacy NER or specialized LLM pass

## Architectural Position in L.O.V.E. Stack

```
┌──────────────────────────────────────────────┐
│              USER INPUT                      │
│         (Voice Note / Text)                  │
└─────────────────┬────────────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────────────┐
│            LISTENER  ⭐ YOU ARE HERE          │
│  ┌────────────────────────────────────────┐  │
│  │  Edge: whisper.rn (immediate)          │  │
│  │    ↓                                   │  │
│  │  Cloud: faster-whisper → LLM           │  │
│  │    ↓                                   │  │
│  │  VAC Extraction + PII Scrubbing        │  │
│  │    ↓                                   │  │
│  │  Output: [valence, arousal, connection]│  │
│  └────────────────────────────────────────┘  │
└─────────────────┬────────────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────────────┐
│              OBSERVER                        │
│  Store sanitized text + VAC + embeddings    │
└─────────────────┬────────────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────────────┐
│              VERSOR                          │
│  Convert VAC → Quaternion                   │
└─────────────────┬────────────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────────────┐
│              EXPERIENCE                      │
│  Animate Soul Sphere                        │
└──────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Edge ASR** | whisper.rn | On-device, zero latency |
| **Cloud ASR** | faster-whisper | 4x faster than standard Whisper |
| **Backend API** | FastAPI | Async native, high performance |
| **Task Queue** | Arq + Redis | Lightweight async job management |
| **LLM Orchestration** | LangChain | Prompt management, output parsing |
| **Validation** | Pydantic | Strict schema for Versor compatibility |
| **PII Detection** | Spacy NER | Entity recognition and scrubbing |
| **Mobile Framework** | React Native | Cross-platform (same as Experience) |

## Key Innovations

### 1. Optimistic UI Pattern

Immediate feedback while deep processing happens in background:
1. User speaks → whisper.rn transcribes locally
2. Simple lexicon lookup → crude sentiment
3. Soul Sphere tints red/cyan immediately
4. Cloud processing refines → updates to accurate state

### 2. Connection Axis Extraction

Novel dimension not in standard sentiment models:
- Requires custom few-shot examples
- Analyzes pronouns ("we" vs. "they")
- Detects relational prepositions ("with" vs. "against")
- Maps to Brown's definitions

### 3. Ephemeral Audio

Privacy by design:
- Audio processed and discarded immediately
- Only sanitized text stored
- Raw data never touches persistent storage

## Success Criteria

The Listener succeeds when:

1. **Responsiveness**: Edge feedback < 200ms
2. **Accuracy**: Cloud transcription > 95% WER
3. **Semantic Validity**: Pity vs. Compassion correctly differentiated by Connection
4. **Privacy**: Zero PII in stored data
5. **Reliability**: 99.9% uptime for ingestion API

## Next Steps

To implement the Listener module, proceed through the documentation in order:

1. **01-architecture.md** - Understand the hybrid edge-cloud design
2. **02-edge-transcription.md** - Implement whisper.rn on React Native
3. **03-cloud-processing.md** - Build faster-whisper backend
4. **04-semantic-analysis.md** - LangChain + LLM integration
5. Continue through remaining guides...

---

**Remember**: The Listener doesn't just transcribe—it **translates** the ineffable complexity of human feeling into the mathematical language that powers the Soul Sphere's dance through emotional space.
