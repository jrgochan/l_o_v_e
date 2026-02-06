from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.routes import ai_models
from app.main import app
from app.services.ollama_manager import ModelDetails, ModelInfo

client = TestClient(app)


@pytest.fixture
def mock_ollama():
    with patch.object(ai_models, "OllamaManager", autospec=True) as mock:
        instance = mock.return_value
        # Since autospec creates a mock that matches the class,
        # instance methods that are async will be AsyncMock automatically.
        # But we still want to return specific values in tests.
        with patch("asyncio.sleep", new_callable=AsyncMock):
            yield instance


def test_list_local_models(mock_ollama):
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


def test_get_model_details(mock_ollama):
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


def test_delete_model(mock_ollama):
    mock_ollama.delete_model.return_value = {"status": "success"}

    response = client.delete("/listener/ai/models/phi-3:mini")
    assert response.status_code == 200, f"Failed: {response.json()}"
    assert response.json()["result"]["status"] == "success"


def test_start_model_pull_error(mock_ollama):
    # Mocking exceptions: The route calls active_pulls[task_id].
    # We can't easily mock internal dict operations with patch unless we patch the dict.
    # But if we make uuid raise, we catch that.
    with patch("uuid.uuid4", side_effect=Exception("UUID fail")):
        response = client.post("/listener/ai/models/pull", json={"name": "llama3"})
        assert response.status_code == 500
        assert "UUID fail" in response.json()["detail"]


@pytest.mark.asyncio
async def test_stream_pull_progress_success(mock_ollama):
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

    async def gen(name):
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
async def test_stream_pull_progress_not_found():
    with client.websocket_connect("/listener/ai/models/pull/unknown-task") as websocket:
        data = websocket.receive_json()
        assert "error" in data


@pytest.mark.asyncio
async def test_stream_pull_progress_error(mock_ollama):
    from app.api.routes.ai_models import active_pulls

    task_id = "test-error-task"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "starting", "progress": None}

    mock_ollama.pull_model.side_effect = Exception("Pull failed")
    # Actually need to mock the generator raising exception, or pull_model raising it immediately
    # The code does `async for progress in ollama.pull_model(name):`
    # If pull_model returns a generator, iterating it needs to raise.

    async def error_gen(name):
        raise Exception("Stream failed")
        yield  # Unreachable

    mock_ollama.pull_model = error_gen

    with client.websocket_connect(f"/listener/ai/models/pull/{task_id}") as websocket:
        data = websocket.receive_json()
        assert data["status"] == "error"
        assert "Stream failed" in data["error"]


@pytest.mark.asyncio
async def test_stream_pull_websocket_disconnect_direct(mock_ollama):
    """Test disconnect via direct endpoint call."""
    from fastapi import WebSocketDisconnect

    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    # Setup active pull
    task_id = "test-direct-disconnect"
    active_pulls[task_id] = {
        "ai_model_name": "phi-3:mini",
        "status": "downloading",
        "progress": {"status": "downloading", "percent": 10.0},
    }

    # Mock websocket
    websocket = AsyncMock()
    # accept is called
    websocket.accept = AsyncMock()
    # send_json raises Disconnect immediately on first call
    websocket.send_json.side_effect = WebSocketDisconnect()

    # Run endpoint directly
    # FastAPI route signature is (websocket, task_id)
    await stream_pull_progress(websocket, task_id)

    # Verify coverage via report


@pytest.mark.asyncio
async def test_stream_pull_generic_error_direct(mock_ollama):
    """Test generic exception in stream_pull_progress."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-generic-error"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    # Mock websocket
    websocket = AsyncMock()
    websocket.accept = AsyncMock()

    # Mock Ollama raise
    # The fixture mock_ollama mocks app.api.routes.ai_models.OllamaManager
    mock_ollama.pull_model.side_effect = Exception("Generic failure")

    await stream_pull_progress(websocket, task_id)

    # Check if error message sent and logged
    # catch block: await websocket.send_json(
    #    {"task_id": task_id, "status": "error", "error": str(e)}
    # )
    calls = websocket.send_json.call_args_list
    assert len(calls) > 0
    # Last call should be error
    last_call = calls[-1]
    args, _ = last_call
    data = args[0]
    assert data["status"] == "error"
    assert "Generic failure" in data["error"]


@pytest.mark.asyncio
async def test_stream_pull_disconnect(mock_ollama):
    """Test WebSocketDisconnect in stream_pull_progress."""
    from fastapi import WebSocketDisconnect

    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-disconnect"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    websocket = AsyncMock()
    # Mock pull_model to raise WebSocketDisconnect
    # Can happen if client disconnects during pull?
    # Or more likely websocket.send_json raises it.
    websocket.send_json.side_effect = WebSocketDisconnect()

    # We need pull_model to yield something so it tries to send.
    # Code calls progress.status AND progress.dict().
    async def mock_pull(model_name):
        m = MagicMock()
        m.status = "downloading"
        m.digest = "sha256:123"
        m.total = 100
        m.dict.return_value = {"status": "downloading", "completed": 10, "total": 100}
        yield m

    mock_ollama.pull_model.side_effect = mock_pull

    # Outer handler removed. Exception bubbles up.
    # But wait, if we fix the mock, it enters the loop.
    # It hits line 154: await websocket.send_json(...)
    # websocket.send_json raises WebSocketDisconnect (mocked).
    # Line 173 catch WebSocketDisconnect -> raise.
    # So it propagates.
    with pytest.raises(WebSocketDisconnect):
        await stream_pull_progress(websocket, task_id)


@pytest.mark.asyncio
async def test_stream_pull_error_cleanup(mock_ollama):
    """Test cleanup when error occurs after ollama initialization."""
    from app.api.routes.ai_models import active_pulls, stream_pull_progress

    task_id = "test-cleanup"
    active_pulls[task_id] = {"ai_model_name": "phi-3:mini", "status": "downloading", "progress": {}}

    websocket = AsyncMock()
    # Accept works
    websocket.accept.return_value = None

    # Mock Pull Model to raise Exception
    # This happens AFTER OllamaManager init
    mock_ollama.pull_model.side_effect = Exception("Pull failed")

    await stream_pull_progress(websocket, task_id)

    # Verify close was called
    # How to verify? mocked OllamaManager() returns mock_ollama (via fixture setup?)
    # Actually, fixture patches app.api.routes.ai_models.OllamaManager.
    # So `ollama = OllamaManager()` returns the mock class instance?
    # No, usually it returns the return_value of the class mock.
    # In fixture: `patch("app.api.routes.ai_models.OllamaManager", autospec=True)`
    # So `OllamaManager()` returns `mock_ollama_manager_class.return_value`.
    # Our fixture yields `mock_ollama_manager_class.return_value` as `mock_ollama`.
    # So `ollama` variable in code IS `mock_ollama`.

    mock_ollama.close.assert_called_once()


@pytest.mark.asyncio
async def test_stream_pull_accept_error(mock_ollama):
    """Test generic Exception during websocket.accept."""
    from app.api.routes.ai_models import stream_pull_progress

    task_id = "test-accept-error"
    websocket = AsyncMock()
    websocket.accept.side_effect = Exception("Auth failed")

    # Outer try/except was removed (it was redundant/dead).
    # So exception should bubble up to FastAPI.

    with pytest.raises(Exception, match="Auth failed"):
        await stream_pull_progress(websocket, task_id)

    # Verify cleanup? finally block runs.


def test_list_local_models_error(mock_ollama):
    mock_ollama.list_local_models.side_effect = Exception("List failed")
    response = client.get("/listener/ai/models/local")
    assert response.status_code == 500
    assert "List failed" in response.json()["detail"]


def test_delete_model_error(mock_ollama):
    mock_ollama.delete_model.side_effect = Exception("Delete failed")
    response = client.delete("/listener/ai/models/test-model")
    assert response.status_code == 500
    assert "Delete failed" in response.json()["detail"]


def test_check_health_not_running(mock_ollama):
    mock_ollama.health_check.return_value = False
    response = client.get("/listener/ai/models/health")
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["ollama"] == "not running"


def test_check_health_error(mock_ollama):
    mock_ollama.health_check.side_effect = Exception("Connection refused")
    response = client.get("/listener/ai/models/health")
    # Health endpoint returns 200 OK with error payload usually, or 500?
    # Code says: return {"status": "error", "ollama": "not accessible", "error": str(e)}
    # It does NOT raise HTTPException.
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "Connection refused" in response.json()["error"]
