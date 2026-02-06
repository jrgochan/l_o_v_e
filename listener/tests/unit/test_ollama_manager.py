import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ollama_manager import (
    OllamaManager,
    estimate_ram_requirement,
    recommend_for_functions,
)


@pytest.fixture
def mock_httpx():
    with patch("app.services.ollama_manager.httpx.AsyncClient") as mock:
        client_instance = AsyncMock()
        # stream is a context manager, not an awaitable coroutine
        client_instance.stream = MagicMock()
        mock.return_value = client_instance
        yield client_instance


@pytest.mark.asyncio
async def test_health_check_success(mock_httpx):
    mock_httpx.get.return_value = MagicMock(status_code=200)

    manager = OllamaManager()
    assert await manager.health_check() is True


@pytest.mark.asyncio
async def test_health_check_failure(mock_httpx):
    mock_httpx.get.side_effect = Exception("Down")

    manager = OllamaManager()
    assert await manager.health_check() is False


@pytest.mark.asyncio
async def test_list_local_models(mock_httpx):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "models": [
            {
                "name": "llama3",
                "size": 4000000000,
                "modified_at": "2024-01-01T00:00:00Z",
                "digest": "sha256:12345",
                "details": {
                    "parameter_size": "8B",
                    "quantization_level": "Q4_0",
                    "family": "llama",
                },
            }
        ]
    }
    mock_httpx.get.return_value = mock_response

    manager = OllamaManager()
    models = await manager.list_local_models()

    assert len(models) == 1
    assert models[0].name == "llama3"
    assert models[0].parameter_size == "8B"


@pytest.mark.asyncio
async def test_list_local_models_error(mock_httpx):
    mock_httpx.get.side_effect = httpx.RequestError("Failed")

    manager = OllamaManager()
    with pytest.raises(RuntimeError, match="Failed to list local models"):
        await manager.list_local_models()


@pytest.mark.asyncio
async def test_delete_model(mock_httpx):
    mock_httpx.request.return_value = MagicMock(status_code=200, json=lambda: {"status": "success"})

    manager = OllamaManager()
    result = await manager.delete_model("test")
    assert result["status"] == "success"


@pytest.mark.asyncio
async def test_get_model_details(mock_httpx):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "size": 100,
        "parameters": "params",
        "template": "tpl",
        "details": {
            "format": "gguf",
            "parameter_size": "8B",
            "quantization_level": "Q4_0",
            "family": "llama",
        },
    }
    mock_httpx.post.return_value = mock_response

    manager = OllamaManager()
    details = await manager.get_model_details("test-model")

    assert details.name == "test-model"
    assert details.parameter_size == "8B"
    assert details.estimated_ram_gb > 0


@pytest.mark.asyncio
async def test_pull_model_stream(mock_httpx):
    # Mock streaming response
    stream_context = AsyncMock()
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()

    # Mock aiter_lines
    lines = [
        json.dumps({"status": "pulling manifest"}),
        json.dumps({"status": "downloading", "completed": 50, "total": 100}),
        json.dumps({"status": "success"}),
    ]

    # Async iterator for lines
    async def line_gen():
        for line in lines:
            yield line

    mock_response.aiter_lines = MagicMock(return_value=line_gen())
    stream_context.__aenter__.return_value = mock_response
    mock_httpx.stream.return_value = stream_context

    manager = OllamaManager()
    progress_updates = []
    async for progress in manager.pull_model("model"):
        progress_updates.append(progress)

    assert len(progress_updates) == 3
    assert progress_updates[0].status == "pulling manifest"
    assert progress_updates[1].percent == 50.0
    assert progress_updates[2].status == "success"


def test_helpers():
    assert estimate_ram_requirement("70B") >= 40.0
    recommendations = recommend_for_functions("8B", "llama")
    assert "semantic_vac" in recommendations
    recommendations_mixtral = recommend_for_functions("47B", "mixtral")
    assert "insight_generation" in recommendations_mixtral

    # Phi coverage
    recommendations_phi = recommend_for_functions("3.8B", "phi")
    assert "atlas_mapping" in recommendations_phi


def test_estimate_speed():
    from app.services.ollama_manager import estimate_speed

    assert estimate_speed("3B", "Q4_0") == 50.0
    assert estimate_speed("70B", "F16") == 3.0 * 0.7
    assert estimate_speed("Unknown", "F16") == 20.0 * 0.7


@pytest.mark.asyncio
async def test_pull_model_exception(mock_httpx):
    mock_httpx.stream.side_effect = Exception("Connect Fail")
    manager = OllamaManager()

    # Needs async for loop because it's an async generator
    with pytest.raises(RuntimeError, match="Failed to pull model"):
        async for _ in manager.pull_model("model"):
            pass


@pytest.mark.asyncio
async def test_delete_model_error(mock_httpx):
    mock_httpx.request.side_effect = Exception("Delete Fail")
    manager = OllamaManager()
    with pytest.raises(RuntimeError, match="Failed to delete model"):
        await manager.delete_model("model")


@pytest.mark.asyncio
async def test_get_model_details_error(mock_httpx):
    mock_httpx.post.side_effect = Exception("Details Fail")
    manager = OllamaManager()
    with pytest.raises(RuntimeError, match="Failed to get details"):
        await manager.get_model_details("model")


@pytest.mark.asyncio
async def test_close(mock_httpx):
    manager = OllamaManager()
    await manager.close()
    manager.client.aclose.assert_called_once()


@pytest.mark.asyncio
async def test_pull_model_empty_line(mock_httpx):
    """Test skipping empty lines in stream."""
    stream_context = AsyncMock()
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()

    # Empty line then success
    lines = ["", json.dumps({"status": "success"})]

    async def line_gen():
        for line in lines:
            yield line

    mock_response.aiter_lines = MagicMock(return_value=line_gen())
    stream_context.__aenter__.return_value = mock_response
    mock_httpx.stream.return_value = stream_context

    manager = OllamaManager()
    updates = []
    async for p in manager.pull_model("m"):
        updates.append(p)

    assert len(updates) == 1
    assert updates[0].status == "success"


@pytest.mark.asyncio
async def test_pull_model_empty_stream(mock_httpx):
    """Test completely empty stream (natural loop exit)."""
    stream_context = AsyncMock()
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()

    # Empty generator
    async def line_gen():
        if False:
            yield  # make it a generator

    mock_response.aiter_lines = MagicMock(return_value=line_gen())
    stream_context.__aenter__.return_value = mock_response
    mock_httpx.stream.return_value = stream_context

    manager = OllamaManager()
    updates = []
    async for p in manager.pull_model("m"):
        updates.append(p)

    # Should exit loop naturally with 0 updates
    assert len(updates) == 0
