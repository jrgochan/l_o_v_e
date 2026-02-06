from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.routes.ai_models import active_pulls
from app.main import app

# Create a fresh client for these tests
client = TestClient(app)


@pytest.fixture
def mock_ollama_manager():
    with (
        patch("app.api.routes.ai_models.OllamaManager") as mock,
        patch("app.api.routes.ai_models.asyncio.sleep") as mock_sleep,
    ):
        instance = MagicMock()
        mock.return_value = instance
        mock_sleep.return_value = None  # Skip sleep
        # Setup async methods to return awaitables (AsyncMock or MagicMock that is awaitable)
        instance.list_local_models = AsyncMock(
            return_value=[
                {
                    "name": "test-model",
                    "size": 100,
                    "modified_at": "now",
                    "digest": "sha",
                    "parameter_size": "8B",
                    "quantization": "Q4",
                    "family": "llama",
                }
            ]
        )
        instance.delete_model = AsyncMock(return_value={"status": "success"})
        instance.get_model_details = AsyncMock(
            return_value={
                "name": "test-model",
                "size": 100,
                "parameters": "params",
                "template": "tpl",
                "format": "gguf",
                "family": "llama",
                "parameter_size": "8B",
                "quantization_level": "Q4",
                "estimated_ram_gb": 8.0,
                "estimated_speed_tokens_per_sec": 20.0,
                "recommended_for": [],
            }
        )
        instance.health_check = AsyncMock(return_value=True)
        instance.close = AsyncMock()

        yield instance


def test_list_local_models(mock_ollama_manager):
    response = client.get("/listener/ai/models/local")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "test-model"


def test_start_model_pull(mock_ollama_manager):
    response = client.post("/listener/ai/models/pull", json={"name": "new-model"})
    assert response.status_code == 200
    assert "task_id" in response.json()
    assert response.json()["status"] == "started"


def test_stream_pull_progress(mock_ollama_manager):
    # Manually seed task
    task_id = "test-task"
    active_pulls[task_id] = {"ai_model_name": "new-model", "status": "starting"}

    # Mock pull_model generator
    async def progress_gen(model_name):
        progress = MagicMock()
        progress.status = "downloading"
        progress.digest = "sha256:123"
        progress.total = 100
        progress.completed = 50
        progress.percent = 50.0
        progress.dict.return_value = {
            "status": "downloading",
            "digest": "sha256:123",
            "total": 100,
            "completed": 50,
            "percent": 50.0,
        }
        yield progress

        progress2 = MagicMock()
        progress2.status = "success"
        progress2.digest = "sha256:123"
        progress2.total = 100
        progress2.completed = 100
        progress2.percent = 100.0
        progress2.dict.return_value = {
            "status": "success",
            "digest": "sha256:123",
            "total": 100,
            "completed": 100,
            "percent": 100.0,
        }
        yield progress2

    mock_ollama_manager.pull_model.side_effect = progress_gen

    with client.websocket_connect(f"/listener/ai/models/pull/{task_id}") as websocket:
        data1 = websocket.receive_json()
        assert data1["status"] == "downloading", f"Expected downloading, got {data1}"

        data2 = websocket.receive_json()
        assert data2["status"] == "success", f"Expected success, got {data2}"


def test_stream_pull_not_found():
    with client.websocket_connect("/listener/ai/models/pull/missing-task") as websocket:
        data = websocket.receive_json()
        assert "error" in data


def test_delete_model(mock_ollama_manager):
    response = client.delete("/listener/ai/models/test-model")
    assert response.status_code == 200
    assert response.json()["result"]["status"] == "success"


def test_get_model_details(mock_ollama_manager):
    response = client.get("/listener/ai/models/test-model/details")
    assert response.status_code == 200
    assert response.json()["name"] == "test-model"


def test_get_model_details_404(mock_ollama_manager):
    mock_ollama_manager.get_model_details.side_effect = Exception("Not found")
    response = client.get("/listener/ai/models/missing/details")
    assert response.status_code == 404


def test_health_check_ok(mock_ollama_manager):
    response = client.get("/listener/ai/models/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_check_fail(mock_ollama_manager):
    mock_ollama_manager.health_check.return_value = False
    response = client.get("/listener/ai/models/health")
    assert response.status_code == 200
    assert response.json()["status"] == "error"
