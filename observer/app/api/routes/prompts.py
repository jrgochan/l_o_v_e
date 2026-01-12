"""Prompt management routes."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.prompts import PromptTemplateResponse
from app.services.prompt_service import PromptService, get_prompt_service

router = APIRouter()


@router.get("/ai/prompts", response_model=Dict[str, Any])
async def get_active_prompts(
    function_name: Optional[str] = None,
    prompt_service: PromptService = Depends(get_prompt_service),
) -> Any:
    """Get active prompts.

    If function_name is provided, returns single result.
    If not, could list all active (future).

    Currently tailored for fetching specific function config.
    """
    if not function_name:
        raise HTTPException(status_code=400, detail="function_name required")

    prompt = await prompt_service.get_active_prompt(function_name)

    if not prompt:
        return {"found": False}

    return {"found": True, "prompt": PromptTemplateResponse.model_validate(prompt)}
