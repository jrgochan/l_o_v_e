# pylint: disable=redefined-outer-name, unused-argument, broad-exception-raised
# pylint: disable=import-outside-toplevel
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.routes import ai_models
from app.main import app
from app.services.ollama_manager import ModelDetails, ModelInfo

client = TestClient(app)


@pytest.fixture
def mock_ollama() -> Any:
    with patch.object(ai_models, "OllamaManager", autospec=True) as mock:
        instance = mock.return_value
        # Since autospec creates a mock that matches the class,
        # instance methods that are async will be AsyncMock automatically.
        # But we still want to return specific values in tests.
        with patch("asyncio.sleep", new_callable=AsyncMock):
            yield instance


def test_list_local_models(mock_ollama: Any) -> None:
    mock_ollama.list_local_models.return_value = [
        ModelInfo(
            name="phi-3:mini",
            size=25769803776,
            modified_at="2024-01-01T00:00:00Z",
            digest="sha256:123",
            parameter_size="3.8B",
            quantization="Q4_0",
            family="phi3",
        )
    ]

    response = client.get("/listener/ai/models/local")
    assert response.status_code == 200, f"Failed: {response.json()}"
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "phi-3:mini"


def test_get_model_details(mock_ollama: Any) -> None:
    mock_ollama.get_model_details.return_value = ModelDetails(
        name="phi-3:mini",
        size=25769803776,
        parameters="3.8B params",
        template="{{ .Prompt }}",
        format="gguf",
        family="phi3",
        parameter_size="3.8B",
        quantization_level="Q4_0",
        estimated_ram_gb=4.0,
        estimated_speed_tokens_per_sec=50.0,
        recommended_for=["summarization"],
    )

    response = client.get("/listener/ai/models/phi-3:mini/details")
    assert response.status_code == 200, f"Failed: {response.json()}"
    assert response.json()["name"] == "phi-3:mini"
    assert response.json()["estimated_ram_gb"] == 4.0


def test_delete_model(mock_ollama: Any) -> None:
    mock_ollama.delete_model.return_value = {"status": "success"}

    response = client.delete("/listener/ai/models/phi-3:mini")
    assert response.status_code == 200, f"Failed: {response.json()}"
    assert response.json()["result"]["status"] == "success"


def test_start_model_pull_error(mock_ollama: Any) -> None:
    # Mocking exceptions: The route calls active_pulls[task_id].
    # We can't easily mock internal dict operations with patch unless we patch the dict.
    # But if we make uuid raise, we catch that.
    with patch("uuid.uuid4", side_effect=Exception("UUID fail")):
        response = client.post("/listener/ai/models/pull", json={"name": "llama3"})
        assert response.status_code == 500
        assert "UUID fail" in response.json()["detail"]


@pytest.mark.asyncio
async def test_stream_pull_progress_success(mock_ollama: Any) -> None:
    # Use patch.dict on the module attribute directly
    # Note: ai_models was imported from app.api.routes
    task_id = "test-stream-task"

    progress_mock = MagicMock()
    progress_mock.status = "downloading"
    progress_mock.digest = "sha256:123"
    progress_mock.total = 100
    progress_mock.completed = 50
    progress_mock.percent = 50.0
    progress_mock.dict.return_value = {"status": "downloading", "percent": 50.0}

    success_mock = MagicMock()
    success_mock.status = "success"
    # Ensure other fields are NOT MagicMocks
    success_mock.digest = None
    success_mock.total = None
    success_mock.completed = None
    success_mock.percent = None
    # success doesn't always have percent, but our code accesses .status
    success_mock.dict.return_value = {"status": "success"}

    async def gen(name: Any) -> Any:
        yield progress_mock
        yield success_mock

    mock_ollama.pull_model.side_effect = gen

    with patch.dict(
        ai_models.active_pulls,
        {task_id: {"ai_model_name": "phi-3:mini", "status": "starting", "progress": None}},
        clear=False,
    ):

        with client.websocket_connect(f"/listener/ai/models/pull/{task_id}") as websocket:
            data1 = websocket.receive_json()
            assert data1["status"] == "downloading"

            data2 = websocket.receive_json()
            if data2.get("status") == "error":
                pytest.fail(f"Server error: {data2.get('error')}")
            assert data2["status"] == "success"


@pytest.mark.asyncio
async def test_stream_pull_progress_not_found() -> None:
    with client.websocket_connect("/listener/ai/models/pull/unknown-task") as websocket:
        data = websocket.receive_json()
        assert "error" in data


@pytest.mark.asyncio
async def test_stream_pull_progress_error(mock_ollama: Any) -> None:
    from app.api.routes.ai_models import active_pulls

    task_id = "test-error-task"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "starting", "progress": None}

    mock_ollama.pull_model.side_effect = Exception("Pull failed")
    # Actually need to mock the generator raising exception, or pull_model raising it immediately
    # The code does `async for progress in ollama.pull_model(name):`
    # If pull_model returns a generator, iterating it needs to raise.

    async def error_gen(name: Any) -> Any:
        if True:  # pylint: disable=using-constant-test
            raise Exception("Stream failed")
        yield  # type: ignore[unreachable]

    mock_ollama.pull_model = error_gen

    with client.websocket_connect(f"/listener/ai/models/pull/{task_id}") as websocket:
        data = websocket.receive_json()
        assert data["status"] == "error"
        assert "Stream failed" in data["error"]


@pytest.mark.asyncio
async def test_stream_pull_websocket_disconnect_direct(mock_ollama: Any) -> None:
    """Test WebSocketDisconnect re-raise via direct endpoint call."""
    from fastapi import WebSocketDisconnect

    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    # Setup active pull
    task_id = "test-direct-disconnect"
    active_pulls[task_id] = {
        "ai_model_name": "phi-3:mini",
        "status": "downloading",
        "progress": {"status": "downloading", "percent": 10.0},
    }

    # Mock websocket with sync headers so origin check works properly
    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.headers = MagicMock()
    websocket.headers.get.return_value = None  # Skip origin validation
    # send_json raises Disconnect immediately on first call
    websocket.send_json.side_effect = WebSocketDisconnect()

    # pull_model must yield something so the send_json path is reached
    async def mock_pull(model_name: Any) -> Any:
        m = MagicMock()
        m.status = "downloading"
        m.digest = "sha256:123"
        m.total = 100
        m.completed = 10
        m.percent = 10.0
        m.dict.return_value = {"status": "downloading", "completed": 10, "total": 100}
        yield m

    mock_ollama.pull_model.side_effect = mock_pull

    with patch("asyncio.sleep", new_callable=AsyncMock):
        # WebSocketDisconnect re-raised at line 202 propagates through both finally blocks
        with pytest.raises(WebSocketDisconnect):
            await stream_pull_progress(websocket, task_id)

    # Outer finally still runs websocket.close()
    websocket.close.assert_called()


@pytest.mark.asyncio
async def test_stream_pull_allowed_origin(mock_ollama: Any) -> None:
    """Test that an allowed origin passes validation (branch 166->170)."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-allowed-origin"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "starting", "progress": None}

    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.headers = MagicMock()
    websocket.headers.get.return_value = "http://localhost:3000"  # Allowed origin

    # Empty generator so it completes quickly
    async def empty_gen(name: Any) -> Any:
        return
        yield

    mock_ollama.pull_model.side_effect = empty_gen

    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # Should have accepted (not closed with 1008)
    websocket.accept.assert_called_once()


@pytest.mark.asyncio
async def test_stream_pull_empty_generator(mock_ollama: Any) -> None:
    """Test pull_model yields nothing (branch 181->207 — straight to finally)."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-empty-gen"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "starting", "progress": None}

    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.headers = MagicMock()
    websocket.headers.get.return_value = None

    # Empty async generator — no yields
    async def empty_gen(name: Any) -> Any:
        return
        yield

    mock_ollama.pull_model.side_effect = empty_gen

    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # ollama.close() should still be called in finally
    mock_ollama.close.assert_called_once()


@pytest.mark.asyncio
async def test_stream_pull_generic_error_direct(mock_ollama: Any) -> None:
    """Test generic exception in stream_pull_progress."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-generic-error"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    # Mock websocket
    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.headers = MagicMock()  # Sync mock for dict-like headers
    websocket.headers.get.return_value = None  # No origin → skip validation

    # pull_model raising immediately triggers inner except block
    async def error_gen(name: Any) -> Any:
        if True:  # pylint: disable=using-constant-test
            raise Exception("Generic failure")
        yield  # type: ignore[unreachable]

    mock_ollama.pull_model = error_gen

    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # Inner except sends error JSON, then finally calls ollama.close()
    calls = websocket.send_json.call_args_list
    assert len(calls) > 0
    last_call = calls[-1]
    args, _ = last_call
    data = args[0]
    assert data["status"] == "error"
    assert "Generic failure" in data["error"]


@pytest.mark.asyncio
async def test_stream_pull_disconnect(mock_ollama: Any) -> None:
    """Test WebSocketDisconnect in stream_pull_progress."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-disconnect"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    websocket = AsyncMock()
    # send_json raises WebSocketDisconnect — simulates client disconnect
    from fastapi import WebSocketDisconnect

    websocket.send_json.side_effect = WebSocketDisconnect()

    # pull_model yields one item so send_json is attempted
    async def mock_pull(model_name: Any) -> Any:
        m = MagicMock()
        m.status = "downloading"
        m.digest = "sha256:123"
        m.total = 100
        m.completed = 10
        m.percent = 10.0
        m.dict.return_value = {"status": "downloading", "completed": 10, "total": 100}
        yield m

    mock_ollama.pull_model.side_effect = mock_pull

    # WebSocketDisconnect is re-raised from inner try but caught by outer finally.
    # Outer finally calls websocket.close() which may also fail silently.
    # The function should complete without raising.
    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # Verify websocket.close was attempted in outer finally
    websocket.close.assert_called()


@pytest.mark.asyncio
async def test_stream_pull_error_cleanup(mock_ollama: Any) -> None:
    """Test cleanup when error occurs after ollama initialization."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-cleanup"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    websocket = AsyncMock()
    websocket.accept.return_value = None
    websocket.headers = MagicMock()  # Sync mock for dict-like headers
    websocket.headers.get.return_value = None  # No origin → skip validation

    # pull_model raising triggers inner except, then finally calls ollama.close()
    async def error_gen(name: Any) -> Any:
        if True:  # pylint: disable=using-constant-test
            raise Exception("Pull failed")
        yield  # type: ignore[unreachable]

    mock_ollama.pull_model = error_gen

    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # Verify ollama.close was called in the inner finally block
    mock_ollama.close.assert_called_once()


@pytest.mark.asyncio
async def test_stream_pull_accept_error(mock_ollama: Any) -> None:
    """Test generic Exception during websocket.accept."""
    from app.api.routes.ai_models import stream_pull_progress

    task_id = "test-accept-error"
    websocket = AsyncMock()
    websocket.accept.side_effect = Exception("Auth failed")

    # accept() raises, skips inner block, outer finally runs websocket.close()
    # which also raises (since websocket was never accepted), caught by bare except.
    # Function completes without raising.
    with patch("asyncio.sleep", new_callable=AsyncMock):
        await stream_pull_progress(websocket, task_id)

    # Verify close was attempted
    websocket.close.assert_called()


def test_list_local_models_error(mock_ollama: Any) -> None:
    mock_ollama.list_local_models.side_effect = Exception("List failed")
    response = client.get("/listener/ai/models/local")
    assert response.status_code == 500
    assert "List failed" in response.json()["detail"]


def test_delete_model_error(mock_ollama: Any) -> None:
    mock_ollama.delete_model.side_effect = Exception("Delete failed")
    response = client.delete("/listener/ai/models/test-model")
    assert response.status_code == 500
    assert "Delete failed" in response.json()["detail"]


def test_check_health_not_running(mock_ollama: Any) -> None:
    mock_ollama.health_check.return_value = False
    response = client.get("/listener/ai/models/health")
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["ollama"] == "not running"


def test_check_health_error(mock_ollama: Any) -> None:
    mock_ollama.health_check.side_effect = Exception("Connection refused")
    response = client.get("/listener/ai/models/health")
    # Health endpoint returns 200 OK with error payload usually, or 500?
    # Code says: return {"status": "error", "ollama": "not accessible", "error": str(e)}
    # It does NOT raise HTTPException.
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "Connection refused" in response.json()["error"]
