# Glossary of Terms

**Last Updated:** January 2, 2026  
**Audience:** All users  
**Goal:** Definitions of key terms and concepts

---

## A

**Arousal**
: The Y-axis of the VAC model. Measures emotional energy from calm/low (-1.0) to activated/high (+1.0). High arousal emotions include excitement, panic, anger. Low arousal emotions include calm, depression, boredom.

**Arq**
: Async job queue library for Python. Used by the Listener for background audio processing. Built on Redis, integrates with FastAPI's async/await.

**Atlas of the Heart**
: Dr. Brené Brown's taxonomy of 87 emotions organized into 13 categories. Used by the Listener to classify detected emotions.

---

## C

**Connection** (C-axis)
: The Z-axis of the VAC model—L.O.V.E.'s core innovation. Measures relational alignment from disconnected/separated (-1.0) to connected/aligned (+1.0). Distinguishes pity (FOR someone, -C) from compassion (WITH someone, +C).

**Compassion**
: Emotion characterized by feeling WITH someone in their pain. High positive Connection (+0.9), neutral to slightly positive Valence, low Arousal. Distinct from pity.

**Confidence Score**
: Value from 0.0 to 1.0 indicating the LLM's certainty in its emotional classification. Higher values indicate more confident analysis.

---

## E

**Emotional Classification**
: The complete output from semantic analysis, including primary emotion, category, VAC coordinates, confidence, and reasoning.

**EmotionalClassification** (Python class)
: Pydantic model representing analysis results. Contains emotion name, Atlas category, VAC vector, confidence score, and reasoning text.

---

## F

**FastAPI**
: Modern Python web framework used for the Listener API. Provides async support, automatic OpenAPI documentation, and Pydantic integration.

**Few-Shot Learning**
: Machine learning technique where a model learns from a small number of examples provided in the prompt. The Listener uses 6 few-shot examples to teach the LLM about the Connection axis.

---

## G

**Grief**
: Emotion characterized by pain of loss but with love/connection persisting. Negative Valence (-0.8), low Arousal, but positive Connection (+0.7). Shows Connection can be positive even in pain.

---

## L

**Listener Module**
: The sensory cortex of L.O.V.E. Transforms voice and text input into VAC coordinates using local LLM inference.

**LLM (Large Language Model)**
: Neural network trained on massive text corpora. The Listener uses Llama 3.1 (8B parameters) via Ollama for semantic VAC extraction.

**L.O.V.E.**
: Listener-Observer-Versor-Experience. The four modules comprising the emotional intelligence platform.

**Loneliness**
: Emotion defined by profound disconnection. Negative Valence, low Arousal, very negative Connection (-0.9). Connection is the defining feature.

---

## M

**MAE (Mean Absolute Error)**
: Metric for measuring Connection axis accuracy. Current: 0.18 (meaning average error of 0.18 on -1 to +1 scale). Lower is better. Target: < 0.20.

**Multi-Emotion Analysis**
: Advanced analysis mode that detects up to 3 concurrent emotions with relationships. Example: "Hope" + "Anxiety" = motivational tension.

---

## O

**Observer Module**
: The hippocampus of L.O.V.E. Stores emotional states, performs vector similarity search, and provides therapeutic pathfinding.

**Ollama**
: Local LLM serving platform. Runs models like Llama, Mistral, Phi on your machine. Listener's primary dependency for semantic analysis.

---

## P

**PII (Personally Identifiable Information)**
: Information that can identify an individual (names, addresses, phone numbers, etc.). The Listener scrubs PII before storing text.

**Pity**
: Emotion characterized by feeling FOR someone (not WITH them). Creates separation and condescension. Negative Connection (-0.7), slightly negative Valence. Distinct from compassion.

**Prompt Engineering**
: The art of crafting instructions (prompts) for LLMs to produce desired outputs. Critical for teaching the Connection axis.

**Prosody**
: Vocal characteristics beyond words: pitch, energy, speech rate, voice quality. Used in audio analysis to enhance emotion detection.

**Pydantic**
: Python library for data validation using type hints. Ensures VAC values stay in valid range (-1.0 to 1.0) and catches LLM errors.

---

## Q

**Quaternion**
: 4D mathematical representation of 3D rotation. The Versor module converts VAC coordinates into quaternions for smooth 3D animations.

---

## R

**Redis**
: In-memory data store used for the async job queue. Stores pending audio processing jobs and results.

---

## S

**Sacred Test**
: `test_pity_vs_compassion()` - THE critical test that validates the Connection axis innovation. Must always pass. If it fails, the core innovation is broken.

**Semantic Analysis**
: Process of extracting meaning and emotional content from text. The Listener uses LLMs for semantic VAC extraction.

**SLERP (Spherical Linear Interpolation)**
: Mathematical technique for smooth rotation between two quaternions. Used by Versor for 60-frame animations.

**Soul Sphere**
: 3D visualization of emotional state in the Experience module. Appearance (color, shape, glow) represents VAC coordinates.

**Spacy**
: Natural language processing library. Used by the Listener for PII detection and entity recognition.

---

## T

**Transcription**
: Process of converting speech (audio) to text. The Listener uses OpenAI's Whisper model running locally.

---

## V

**VAC Model**
: Valence-Arousal-Connection. The 3D emotional coordinate system that is L.O.V.E.'s core innovation. Extends standard 2D sentiment analysis (Valence-Arousal) with the Connection axis.

**Valence**
: The X-axis of the VAC model. Measures hedonic tone from displeasure/negative (-1.0) to pleasure/positive (+1.0). Joy has high positive valence (+0.9), grief has negative valence (-0.8).

**VACVector** (Python class)
: Pydantic model representing a point in VAC space. Contains three floats (valence, arousal, connection), each validated to be in range [-1.0, 1.0].

**Versor Module**
: The mathematical engine of L.O.V.E. Converts VAC coordinates into quaternions for 3D rotation calculations.

---

## W

**Whisper**
: OpenAI's speech-to-text model. The Listener uses it locally (not via API) for privacy-preserving transcription.

---

## Acronyms

| Acronym | Full Term | Meaning |
|---------|-----------|---------|
| **ADR** | Architecture Decision Record | Document explaining why technical decisions were made |
| **API** | Application Programming Interface | How modules communicate |
| **CAGR** | Compound Annual Growth Rate | Market growth rate metric |
| **CORS** | Cross-Origin Resource Sharing | Web security mechanism |
| **DAU** | Daily Active Users | Users active each day |
| **FDA** | Food and Drug Administration | US medical device regulator |
| **GDPR** | General Data Protection Regulation | EU privacy law |
| **GPU** | Graphics Processing Unit | Hardware for ML acceleration |
| **HIPAA** | Health Insurance Portability and Accountability Act | US healthcare privacy law |
| **HNSW** | Hierarchical Navigable Small World | Vector search algorithm (Observer) |
| **HTTP** | Hypertext Transfer Protocol | Web communication protocol |
| **JSON** | JavaScript Object Notation | Data interchange format |
| **JWT** | JSON Web Token | Authentication token format |
| **K8s** | Kubernetes | Container orchestration platform |
| **LLM** | Large Language Model | AI model trained on text |
| **MAE** | Mean Absolute Error | Accuracy metric |
| **MAU** | Monthly Active Users | Users active each month |
| **NER** | Named Entity Recognition | PII detection technique |
| **NPS** | Net Promoter Score | Customer satisfaction metric |
| **PII** | Personally Identifiable Information | Private data to protect |
| **RAG** | Retrieval-Augmented Generation | AI technique using retrieval |
| **RCA** | Root Cause Analysis | Post-incident analysis |
| **REST** | Representational State Transfer | API architecture style |
| **ROI** | Return on Investment | Financial metric |
| **RPO** | Recovery Point Objective | Data loss tolerance |
| **RTO** | Recovery Time Objective | Downtime tolerance |
| **SLA** | Service Level Agreement | Performance guarantee |
| **SLERP** | Spherical Linear Interpolation | Quaternion interpolation |
| **SSN** | Social Security Number | PII type |
| **STT** | Speech-To-Text | Transcription |
| **TAM** | Total Addressable Market | Market size |
| **TDD** | Test-Driven Development | Tests-first methodology |
| **UUID** | Universally Unique Identifier | Standard ID format |
| **VAC** | Valence-Arousal-Connection | Our 3D emotion model |
| **WER** | Word Error Rate | Transcription accuracy metric |

---

## Emotion-Specific Terms

### Pity vs. Compassion

The canonical example demonstrating the Connection axis:

**Pity:**

- "I feel sorry FOR them"
- Connection: Negative (separation)
- Creates distance, condescension

**Compassion:**

- "I feel WITH them"
- Connection: Positive (alignment)
- Shared humanity, solidarity

### Grief vs. Anguish

Another key distinction:

**Grief:**

- Pain of loss
- Connection remains positive (love persists)
- "I miss them" implies ongoing bond

**Anguish:**

- Pain + isolation
- Connection becomes negative
- "I'm in agony alone"

### Belonging vs. Fitting In

Subtle but important:

**Belonging:**

- Authentic connection
- "I can be myself here"
- Positive Connection

**Fitting In:**

- Performing to be accepted
- "I do what's needed to fit"
- Subtle negative Connection (disconnected from authentic self)

---

## Technical Terms

### Prompt

The instruction given to an LLM. For the Listener, includes:

- Role definition
- VAC model specification
- Few-shot examples
- Output format

### Temperature

LLM parameter controlling randomness (0.0-1.0). The Listener uses 0.0 for deterministic output.

### Token

Unit of text for LLMs (roughly ¾ of a word). The Listener's prompt is ~1000 tokens.

### Quantization

Reducing model precision to save memory/increase speed. q4_0 = 4-bit quantization, q8_0 = 8-bit.

---

## Key Takeaways

✅ **VAC = Valence + Arousal + Connection**  
✅ **Connection axis = L.O.V.E.'s innovation**  
✅ **Sacred test = Pity vs. Compassion validation**  
✅ **Few-shot learning = Teaching through examples**  
✅ **Local AI = Privacy-first architecture**  

---

**For more information:**

- [Key Concepts](../guides/03-key-concepts.md) - VAC model explained
- [Prompt Engineering](../architecture/03-prompt-engineering.md) - Technical deep dive
- [API Reference](api-reference.md) - Complete API documentation
