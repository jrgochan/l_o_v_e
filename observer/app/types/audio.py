"""Audio-related type definitions for Observer."""

from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID


@dataclass
class AudioFeatures:
    """Encapsulates extracted audio features."""

    transcription: Optional[str]
    prosody: Optional[Dict[str, Any]]


@dataclass
class AudioTransactionResult:
    """Result of saving an audio message transaction."""

    session_id: UUID
    user_msg: Any  # ChatMessage
