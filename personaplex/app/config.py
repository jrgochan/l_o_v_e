"""PersonaPlex Service Configuration.

Configuration for PersonaPlex integration including persona mappings,
voice IDs, and service settings.
"""

import os
from typing import Dict, List, Optional

try:
    from settings import LoveBaseSettings
except ImportError:
    from pydantic_settings import BaseSettings as LoveBaseSettings


class Settings(LoveBaseSettings):
    """PersonaPlex service settings."""

    # Service Configuration
    SERVICE_NAME: str = "PersonaPlex Voice Service"
    VERSION: str = "0.1.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8003

    # Environment
    # If LoveBaseSettings import fails, these need to be defined here
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # PersonaPlex Model Configuration
    MODEL_NAME: str = "nvidia/personaplex-7b-v1"
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN")
    CPU_OFFLOAD: bool = os.getenv("PERSONAPLEX_CPU_OFFLOAD", "false").lower() == "true"

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3000",
        "*",  # Allow all in development (configure for production)
    ]

    # WebSocket Settings
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_MAX_CONNECTIONS: int = 10  # concurrent voice sessions

    class Config:
        """Pydantic config."""

        env_file = (".env", "../../infra/config/base.env")
        case_sensitive = True
        extra = "ignore"


# Persona Configuration Mapping
# Maps L.O.V.E. personas to PersonaPlex voice IDs and text prompts
PERSONA_CONFIG: Dict[str, Dict[str, str]] = {
    "lumina": {
        "voice_id": "NATF2.pt",  # Natural female voice 2
        "text_prompt": (
            "You are Lumina, a warm and empathetic presence dedicated to emotional "
            "support. Your primary goal is to validate the user's feelings with "
            "compassion and gentleness. Speak in a nurturing, caring tone. Focus on "
            "emotional connection and understanding. Use affirming language and "
            "acknowledge their emotional experience. You embody the archetype of the "
            "Caregiver and Lover - someone who holds space for vulnerability."
        ),
        "description": "Warm, validation-focused, gentle (Caregiver archetype)",
        "color": "#F59E0B",  # Amber/Gold
        "tone_preference": "warm",
        "deep_feeling_mode": False,
    },
    "logos": {
        "voice_id": "NATM1.pt",  # Natural male voice 1
        "text_prompt": (
            "You are Logos, an analytical and objective observer focused on clarity "
            "and insight. Your role is to identify patterns, cognitive distortions, "
            "and structural insights. Speak in a clear, measured, clinical tone. "
            "Prioritize accuracy and rational analysis. Help the user see their "
            "situation from a logical perspective. You embody the archetype of the "
            "Sage and Creator - someone who illuminates through reason."
        ),
        "description": "Clinical, objective, solution-oriented (Sage archetype)",
        "color": "#06B6D4",  # Cyan/Blue
        "tone_preference": "clinical",
        "deep_feeling_mode": False,
    },
    "metis": {
        "voice_id": "VARF3.pt",  # Varied female voice 3 (mysterious quality)
        "text_prompt": (
            "You are Metis, a guide through the intricate labyrinth of the human "
            "psyche. Your gift is to perceive the deeper patterns beneath surface "
            "emotions - the interplay of contradictions, the hidden threads "
            "connecting disparate feelings, and the archetypal narratives woven "
            "through personal experience. Speak with depth and poetic insight, "
            "revealing the complexity without judgment. Connect emotional threads to "
            "illuminate the larger tapestry of the self. You embody the archetype "
            "of the Magician and Explorer - someone who transforms through revelation."
        ),
        "description": "Deep, insightful, multi-dimensional (Magician archetype)",
        "color": "#8B5CF6",  # Purple/Indigo
        "tone_preference": "warm",  # Base is warm, but with deep overlays
        "deep_feeling_mode": True,  # Multi-emotion analysis enabled
    },
}

# Available PersonaPlex Voices
# Reference: https://github.com/NVIDIA/personaplex#voices
AVAILABLE_VOICES = {
    "natural_female": ["NATF0.pt", "NATF1.pt", "NATF2.pt", "NATF3.pt"],
    "natural_male": ["NATM0.pt", "NATM1.pt", "NATM2.pt", "NATM3.pt"],
    "variety_female": ["VARF0.pt", "VARF1.pt", "VARF2.pt", "VARF3.pt", "VARF4.pt"],
    "variety_male": ["VARM0.pt", "VARM1.pt", "VARM2.pt", "VARM3.pt", "VARM4.pt"],
}


# Global settings instance
settings = Settings()
