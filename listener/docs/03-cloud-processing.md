# Listener Module - Cloud Processing

## Overview

The Cloud Processing tier provides high-fidelity transcription and deep semantic analysis. This is where the "canonical truth" is established—the data that gets stored in the Observer.

## faster-whisper Backend

### What is faster-whisper?

**faster-whisper** is a reimplementation of OpenAI's Whisper using CTranslate2, providing:
- ✅ 4x faster than standard Whisper
- ✅ Lower VRAM usage (can run on smaller GPUs)
- ✅ Identical accuracy to original models
- ✅ Streaming support

### Installation

```bash
# Install faster-whisper
pip install faster-whisper

# Requires CUDA for GPU acceleration
# Or use CPU mode (slower)
```

### TranscriptionService Implementation

```python
# backend/app/services/transcription.py

from faster_whisper import WhisperModel
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

class TranscriptionService:
    """High-fidelity cloud transcription using faster-whisper"""
    
    def __init__(
        self,
        model_size: str = "large-v3",
        device: str = "cuda",
        compute_type: str = "float16"
    ):
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type
        )
        logger.info(f"Whisper model loaded: {model_size} on {device}")
    
    def transcribe(
        self,
        audio_path: str,
        language: str = "en"
    ) -> TranscriptionResult:
        """
        Transcribe audio file to text.
        
        Args:
            audio_path: Path to audio file
            language: Language code (default: en)
        
        Returns:
            TranscriptionResult with text and metadata
        """
        segments, info = self.model.transcribe(
            audio_path,
            language=language,
            vad_filter=True,       # Voice Activity Detection
            vad_parameters={
                "threshold": 0.5,
                "min_speech_duration_ms": 250,
                "max_speech_duration_s": 30.0,
                "min_silence_duration_ms": 500
            },
            beam_size=5,           # Higher = more accurate, slower
            best_of=5,
            temperature=0.0        # Deterministic output
        )
        
        # Collect all segments
        full_text = []
        timestamps = []
        
        for segment in segments:
            full_text.append(segment.text)
            timestamps.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
        
        combined_text = " ".join(full_text).strip()
        
        return TranscriptionResult(
            text=combined_text,
            language=info.language,
            language_probability=info.language_probability,
            duration_seconds=info.duration,
            segments=timestamps
        )
```

### Audio Normalization

Mobile devices produce various audio formats. Normalize before processing:

```python
# backend/app/utils/audio_utils.py

import subprocess
import tempfile
import os

class AudioNormalizer:
    """Normalize audio to Whisper's expected format"""
    
    @staticmethod
    def normalize(input_path: str) -> str:
        """
        Convert audio to 16kHz mono WAV.
        
        Args:
            input_path: Original audio file (.m4a, .aac, .opus, etc.)
        
        Returns:
            Path to normalized WAV file
        """
        # Create temp output file
        output_path = tempfile.mktemp(suffix=".wav")
        
        # ffmpeg command
        command = [
            'ffmpeg',
            '-i', input_path,
            '-ar', '16000',        # 16kHz sample rate
            '-ac', '1',            # Mono
            '-c:a', 'pcm_s16le',   # 16-bit PCM
            '-y',                  # Overwrite
            output_path
        ]
        
        # Execute
        result = subprocess.run(
            command,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise Exception(f"ffmpeg failed: {result.stderr}")
        
        return output_path
```

## Asynchronous Processing

### Arq Worker Task

```python
# backend/app/workers/audio_processor.py

from arq import ArqRedis
from app.services.transcription import TranscriptionService
from app.services.semantic_analyzer import SemanticAnalyzer
from app.services.pii_scrubber import PIIScrubber
from app.services.observer_client import ObserverClient
from app.utils.audio_utils import AudioNormalizer

async def process_audio(
    ctx: dict,
    audio_path: str,
    user_id: str,
    session_id: str,
    timestamp: str
) -> dict:
    """
    Main worker task for audio processing.
    
    Steps:
    1. Normalize audio
    2. Transcribe (faster-whisper)
    3. Extract VAC (LLM)
    4. Scrub PII
    5. Store in Observer
    6. Return result
    """
    
    # Initialize services
    normalizer = AudioNormalizer()
    transcription_service = TranscriptionService()
    semantic_analyzer = SemanticAnalyzer()
    pii_scrubber = PIIScrubber()
    observer_client = ObserverClient()
    
    try:
        # Step 1: Normalize audio
        normalized_path = normalizer.normalize(audio_path)
        
        # Step 2: Transcribe
        transcription = transcription_service.transcribe(normalized_path)
        raw_text = transcription.text
        
        # Step 3: Semantic analysis (VAC extraction)
        emotion_result = await semantic_analyzer.analyze(raw_text)
        
        # Step 4: Scrub PII
        sanitized_text = pii_scrubber.scrub(raw_text)
        
        # Step 5: Store in Observer
        observer_result = await observer_client.record_state(
            user_id=user_id,
            session_id=session_id,
            input_text=sanitized_text,
            vac_scalars=emotion_result.vac.dict(),
            timestamp=timestamp
        )
        
        # Cleanup
        os.remove(audio_path)
        os.remove(normalized_path)
        
        return {
            "status": "success",
            "transcription": raw_text,
            "sanitized_text": sanitized_text,
            "emotion": emotion_result.dict(),
            "observer_state_id": observer_result.state_id
        }
        
    except Exception as e:
        logger.error(f"Audio processing failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
```

## Next Steps

Now that you understand cloud processing:
- **04-semantic-analysis.md** - LLM VAC extraction with LangChain
- **05-atlas-mapping.md** - 87 emotions classification
- **06-pii-sanitization.md** - Privacy protection
