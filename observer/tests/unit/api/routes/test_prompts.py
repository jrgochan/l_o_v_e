from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.prompts import get_active_prompts


@pytest.mark.asyncio
async def test_get_active_prompts():
    service = AsyncMock()

    # 1. No function name
    with pytest.raises(HTTPException):
        await get_active_prompts(function_name=None, prompt_service=service)

    # 2. Not found
    service.get_active_prompt.return_value = None
    res = await get_active_prompts(function_name="func", prompt_service=service)
    assert res["found"] is False

    # 3. Found
    mock_prompt = MagicMock()
    mock_prompt.function_name = "func"
    mock_prompt.version = "v1"
    mock_prompt.template_content = "content"
    # Pydantic model validation mock - just ensure attributes exist

    service.get_active_prompt.return_value = mock_prompt

    # Need to patch the Response model validation since we are using MagicMock
    with patch("app.api.routes.prompts.PromptTemplateResponse") as MockModel:
        MockModel.model_validate.return_value = {"id": "123"}
        res = await get_active_prompts(function_name="func", prompt_service=service)
        assert res["found"] is True
        assert res["prompt"] == {"id": "123"}
