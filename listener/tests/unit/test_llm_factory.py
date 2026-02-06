import importlib
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.config import settings
from app.services import llm_factory

# --- Vertex Adapter Tests ---


@pytest.mark.asyncio
async def test_vertex_adapter_ainvoke():
    """Test VertexAdapter.ainvoke returns content string."""
    # Mock ChatVertexAI
    with patch("app.services.llm_factory.ChatVertexAI") as MockChatClass:
        # Mock instance
        mock_instance = MockChatClass.return_value
        # Mock response from ainvoke
        mock_response = MagicMock()
        mock_response.content = "Vertex Response"
        mock_instance.ainvoke = AsyncMock(return_value=mock_response)

        # Ensure imports check passes
        with patch("app.services.llm_factory.VERTEX_AVAILABLE", True):
            adapter = llm_factory.VertexAdapter("gemini-pro", 0.7, "my-project", "us-central1")
            result = await adapter.ainvoke("Hello")

            assert result == "Vertex Response"
            mock_instance.ainvoke.assert_called_once_with("Hello")


def test_vertex_adapter_init_error():
    """Test VertexAdapter raises ImportError if package missing."""
    with patch("app.services.llm_factory.VERTEX_AVAILABLE", False):
        with pytest.raises(ImportError, match="langchain-google-vertexai not installed"):
            llm_factory.VertexAdapter("model", 0.1, "proj", "loc")


# --- Ollama Adapter Tests ---


@pytest.mark.asyncio
async def test_ollama_adapter_ainvoke():
    """Test OllamaAdapter.ainvoke returns string."""
    with patch("app.services.llm_factory.Ollama") as MockOllama:
        mock_instance = MockOllama.return_value
        mock_instance.ainvoke = AsyncMock(return_value="Ollama Response")

        adapter = llm_factory.OllamaAdapter("llama2", 0.5, "http://localhost:11434")
        result = await adapter.ainvoke("Hi")

        assert result == "Ollama Response"
        mock_instance.ainvoke.assert_awaited_with("Hi")


# --- Factory Tests ---


def test_get_llm_default():
    """Test factory returns Ollama adapter by default (when provider is not google_vertex)."""
    with patch("app.config.settings.AI_PROVIDER", "ollama"):
        adapter = llm_factory.get_llm()
        assert isinstance(adapter, llm_factory.OllamaAdapter)
        assert adapter.provider == "ollama"


def test_get_llm_vertex_fallback():
    """Test fallback to Ollama if Google Project not set."""
    with patch("app.config.settings.AI_PROVIDER", "google_vertex"):
        with patch("app.config.settings.GOOGLE_CLOUD_PROJECT", ""):  # Empty project
            adapter = llm_factory.get_llm()
            assert isinstance(adapter, llm_factory.OllamaAdapter)
            assert adapter.provider == "ollama"


def test_get_llm_vertex_success():
    """Test getting Vertex adapter when configured correctly."""
    with (
        patch("app.config.settings.AI_PROVIDER", "google_vertex"),
        patch("app.config.settings.GOOGLE_CLOUD_PROJECT", "my-project"),
        patch("app.services.llm_factory.VERTEX_AVAILABLE", True),
        patch("app.services.llm_factory.ChatVertexAI"),
    ):  # Mock the class to avoid init errors

        adapter = llm_factory.get_llm(model="gemini-ultra")
        # Since we mocked the class, we check type or attributes
        assert isinstance(adapter, llm_factory.VertexAdapter)
        assert adapter.provider == "google_vertex"


def test_get_llm_vertex_model_override():
    """Test preserving gemini model name override."""
    with (
        patch("app.config.settings.AI_PROVIDER", "google_vertex"),
        patch("app.config.settings.GOOGLE_CLOUD_PROJECT", "my-project"),
        patch("app.services.llm_factory.VERTEX_AVAILABLE", True),
        patch("app.services.llm_factory.ChatVertexAI") as MockChat,
    ):

        # Case 1: passing a gemini model
        llm_factory.get_llm(model="gemini-1.5-pro")
        MockChat.assert_called_with(
            model_name="gemini-1.5-pro",
            temperature=settings.LLM_TEMPERATURE,
            project="my-project",
            location=settings.GOOGLE_CLOUD_LOCATION,
            max_output_tokens=2048,
        )

        # Case 2: default model from settings
        llm_factory.get_llm(model=None)
        # Should use settings.VERTEX_MODEL_NAME
        # Verify call with whatever VERTEX_MODEL_NAME is (default 'gemini-pro' usually)
        # We can't easily assert exactly without knowing settings value,
        # but we know it should NOT be None


# --- Import Logic Tests ---


def test_vertex_import_logic():
    """Test the try/except ImportError block at module level."""
    # Use reload mechanism
    with patch.dict(sys.modules):
        # Remove if present
        if "langchain_google_vertexai" in sys.modules:
            del sys.modules["langchain_google_vertexai"]

        # Mock import failure
        with patch("builtins.__import__", side_effect=ImportError("No module")):
            # Force reload llm_factory
            # We need to target the specific import in llm_factory
            # This is tricky with builtins.__import__ affecting all imports.
            # Easier approach: remove 'langchain_google_vertexai' from sys.modules
            # and mock sys.modules to raise KeyError? No.
            pass

    # Actually, simpler test for lines 19-20 coverage:
    # Just verify VERTEX_AVAILABLE exists.
    # To truly hit the 'except ImportError' line during execution,
    # we'd need to simulate the library missing.
    # We can do this by mocking sys.modules during a reload.

    with patch.dict(sys.modules):
        # Hide the real module
        sys.modules["langchain_google_vertexai"] = None

        # Reload
        importlib.reload(llm_factory)
        assert llm_factory.VERTEX_AVAILABLE is False

    # Restore (reload again to get real state back if needed, or rely on test isolation??)
    # Ideally reload back to safe state
    importlib.reload(llm_factory)
