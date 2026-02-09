# Listener Module - Architecture

## Overview

The Listener employs a **Hybrid Edge-Cloud** architecture to balance real-time responsiveness with deep semantic analysis. This dual-tier design ensures users receive immediate feedback while maintaining high accuracy for canonical state storage.

## Design Philosophy

1. **Responsiveness First**: Edge processing provides instant UI feedback
2. **Accuracy Eventually**: Cloud processing refines to truth
3. **Privacy by Default**: Audio is ephemeral, only sanitized text persists
4. **Asynchronous Processing**: Long-running tasks don't block user experience
5. **Graceful Degradation**: System works offline with reduced functionality

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE CLIENT                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React Native App (Experience + Listener Edge)        │  │
│  │                                                        │  │
│  │  ┌──────────────┐          ┌──────────────┐          │  │
│  │  │ Audio Capture│─────────▶│ whisper.rn   │          │  │
│  │  │ (AVFoundation│          │ (On-Device)  │          │  │
│  │  │  /MediaRecorder)         │              │          │  │
│  │  └──────────────┘          └───────┬──────┘          │  │
│  │                                     │                  │  │
│  │                            ┌────────▼──────────┐      │  │
│  │                            │ Crude Sentiment   │      │  │
│  │                            │ (Lexicon Lookup)  │      │  │
│  │                            └────────┬──────────┘      │  │
│  │                                     │                  │  │
│  │                            ┌────────▼──────────┐      │  │
│  │                            │ Optimistic Update │      │  │
│  │                            │ (Tint Sphere)     │      │  │
│  │                            └───────────────────┘      │  │
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │
                    [Upload Audio]
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                    CLOUD BACKEND                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  FastAPI Gateway                                       │  │
│  │  - POST /listener/ingest                               │  │
│  │  - Authentication (JWT)                                │  │
│  │  - Rate Limiting                                       │  │
│  │  - Audio Normalization (ffmpeg)                       │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│                       ↓                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Redis + Arq (Task Queue)                              │  │
│  │  - Job: {audio_data, user_id, timestamp}               │  │
│  │  - Returns: job_id (202 Accepted)                      │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│                       ↓                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Worker Nodes (Arq Workers)                            │  │
│  │                                                         │  │
│  │  Step 1: faster-whisper (GPU)                          │  │
│  │    └─ Audio → High-fidelity text                       │  │
│  │                                                         │  │
│  │  Step 2: LangChain + LLM                               │  │
│  │    └─ Text → VAC extraction                            │  │
│  │                                                         │  │
│  │  Step 3: Transformers NER                              │  │
│  │    └─ PII scrubbing                                    │  │
│  │                                                         │  │
│  │  Step 4: Call Observer API                             │  │
│  │    └─ Store state                                      │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│                       ↓                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  WebSocket Notifier                                    │  │
│  │  - Push result to client                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
listener/
├── mobile/  (React Native - Edge Component)
│   ├── src/
│   │   ├── services/
│   │   │   ├── AudioRecorder.ts
│   │   │   ├── WhisperService.ts     # whisper.rn wrapper
│   │   │   └── CrudeSentiment.ts     # Lexicon-based
│   │   └── hooks/
│   │       └── useVoiceInput.ts
│   └── package.json
│
├── backend/  (Python - Cloud Component)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app
│   │   ├── config.py
│   │   │
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── ingest.py        # POST /listener/ingest
│   │   │   │   ├── websocket.py     # WS /ws/listener
│   │   │   │   └── health.py
│   │   │   └── models/
│   │   │       ├── request.py
│   │   │       └── response.py
│   │   │
│   │   ├── services/
│   │   │   ├── transcription.py     # faster-whisper
│   │   │   ├── semantic_analyzer.py # LangChain + LLM
│   │   │   ├── pii_scrubber.py      # Transformers NER
│   │   │   └── observer_client.py   # Observer API calls
│   │   │
│   │   ├── workers/
│   │   │   └── audio_processor.py   # Arq worker tasks
│   │   │
│   │   └── utils/
│   │       ├── audio_utils.py       # ffmpeg normalization
│   │       └── validators.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
└── docs/
    └── (this documentation)
```

## Data Flow

### Complete Request Flow

```
1. User presses "Record" in mobile app
   ↓
2. AudioRecorder.start()
   ↓
3. Audio chunks → whisper.rn (streaming)
   ↓
4. Partial text appears in UI (< 200ms)
   ↓
5. CrudeSentiment analyzes partial text
   ↓
6. Soul Sphere tints (red/cyan) immediately
   ↓
7. User stops recording
   ↓
8. Full audio uploaded to FastAPI /ingest
   ↓
9. API normalizes audio (16kHz mono WAV)
   ↓
10. Job pushed to Redis queue → Returns job_id
   ↓
11. Arq worker picks up job
   ↓
12. faster-whisper processes (GPU) → high-fidelity text
   ↓
13. LangChain orchestrates LLM call
   ↓
14. LLM returns structured JSON (Pydantic validated)
   ↓
15. Transformers NER scrubs PII
   ↓
16. Observer API called → Store state
   ↓
17. Versor API called → Get quaternion
   ↓
18. WebSocket push to client
   ↓
19. Experience module animates refined state
```

## Component Details

### Edge Component (Mobile)

```typescript
// mobile/src/services/WhisperService.ts

import { initWhisper } from 'whisper.rn';

class WhisperService {
  private whisper: any;

  async initialize() {
    this.whisper = await initWhisper({
      filePath: 'ggml-tiny.en.bin',
      enableCoreML: Platform.OS === 'ios',  // Use Neural Engine
      enableNNAPI: Platform.OS === 'android'  // Use DSP
    });
  }

  async transcribe(audioPath: string): Promise<string> {
    const result = await this.whisper.transcribe({
      filePath: audioPath,
      language: 'en',
      maxLen: 1  // Streaming mode
    });

    return result.text;
  }
}
```

### Cloud Component (Backend)

```python
# backend/app/services/transcription.py

from faster_whisper import WhisperModel

class TranscriptionService:
    def __init__(self):
        self.model = WhisperModel(
            "large-v3",
            device="cuda",
            compute_type="float16"
        )

    def transcribe(self, audio_path: str) -> str:
        """High-fidelity transcription"""
        segments, info = self.model.transcribe(
            audio_path,
            vad_filter=True,  # Voice activity detection
            language="en"
        )

        # Combine segments
        text = " ".join(segment.text for segment in segments)

        return text.strip()
```

## Next Steps

Now that you understand the architecture:
- **02-edge-transcription.md** - whisper.rn implementation details
- **03-cloud-processing.md** - faster-whisper backend setup
- **04-semantic-analysis.md** - LLM VAC extraction
