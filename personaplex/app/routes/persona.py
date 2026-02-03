"""Persona Configuration Routes.

API endpoints for configuring and retrieving L.O.V.E. persona mappings
to PersonaPlex voice and prompt configurations.
"""

import logging
from typing import Any, Dict, List

from app.config import AVAILABLE_VOICES, PERSONA_CONFIG
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()


class PersonaConfigResponse(BaseModel):
    """Response model for persona configuration."""

    persona_id: str = Field(..., description="Persona identifier (lumina, logos, metis)")
    voice_id: str = Field(..., description="PersonaPlex voice file ID")
    text_prompt: str = Field(..., description="System prompt for persona conditioning")
    description: str = Field(..., description="Human-readable persona description")
    color: str = Field(..., description="UI color code for persona")
    tone_preference: str = Field(..., description="Tone mode (warm/clinical)")
    deep_feeling_mode: bool = Field(..., description="Whether deep emotion analysis is enabled")


class AvailableVoicesResponse(BaseModel):
    """Response model for available voices."""

    natural_female: List[str]
    natural_male: List[str]
    variety_female: List[str]
    variety_male: List[str]


@router.get("/personas", response_model=Dict[str, PersonaConfigResponse])
async def get_all_personas() -> Dict[str, PersonaConfigResponse]:
    """Get all available persona configurations.

    Returns all three L.O.V.E. personas with their voice and prompt mappings.

    Returns:
        dict: Mapping of persona_id to configuration

    Example:
        >>> curl http://localhost:8003/personas
        {
          "lumina": {
            "persona_id": "lumina",
            "voice_id": "NATF2.pt",
            "text_prompt": "You are Lumina...",
            ...
          },
          ...
        }
    """
    result = {}
    for persona_id, config in PERSONA_CONFIG.items():
        result[persona_id] = PersonaConfigResponse(persona_id=persona_id, **config)

    return result


@router.get("/personas/{persona_id}", response_model=PersonaConfigResponse)
async def get_persona_config(persona_id: str) -> PersonaConfigResponse:
    """Get configuration for a specific persona.

    Args:
        persona_id: Persona identifier (lumina, logos, or metis)

    Returns:
        PersonaConfigResponse: Persona configuration

    Raises:
        HTTPException: If persona_id is not found (404)

    Example:
        >>> curl http://localhost:8003/personas/lumina
        {
          "persona_id": "lumina",
          "voice_id": "NATF2.pt",
          "text_prompt": "You are Lumina, a warm and empathetic presence...",
          "description": "Warm, validation-focused, gentle",
          "color": "#F59E0B",
          "tone_preference": "warm",
          "deep_feeling_mode": false
        }
    """
    persona_id_lower = persona_id.lower()

    if persona_id_lower not in PERSONA_CONFIG:
        raise HTTPException(
            status_code=404,
            detail=f"Persona '{persona_id}' not found. Available: {list(PERSONA_CONFIG.keys())}",
        )

    config = PERSONA_CONFIG[persona_id_lower]
    return PersonaConfigResponse(persona_id=persona_id_lower, **config)


@router.get("/voices", response_model=AvailableVoicesResponse)
async def get_available_voices() -> AvailableVoicesResponse:
    """Get all available PersonaPlex voice IDs.

    Returns the full catalog of PersonaPlex voices organized by category.
    Useful for advanced users who want to customize persona voice mappings.

    Returns:
        AvailableVoicesResponse: Available voice IDs by category

    Example:
        >>> curl http://localhost:8003/voices
        {
          "natural_female": ["NATF0.pt", "NATF1.pt", "NATF2.pt", "NATF3.pt"],
          "natural_male": ["NATM0.pt", "NATM1.pt", "NATM2.pt", "NATM3.pt"],
          ...
        }
    """
    return AvailableVoicesResponse(**AVAILABLE_VOICES)


@router.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with API information.

    Returns:
        dict: Service metadata and available endpoints
    """
    return {
        "service": "PersonaPlex Voice Service",
        "version": "0.1.0",
        "description": "NVIDIA PersonaPlex integration for L.O.V.E. stack voice mode",
        "endpoints": {
            "health": "/health",
            "readiness": "/health/ready",
            "personas": "/personas",
            "voices": "/voices",
            "docs": "/docs",
        },
        "persona_count": len(PERSONA_CONFIG),
        "available_personas": list(PERSONA_CONFIG.keys()),
    }
