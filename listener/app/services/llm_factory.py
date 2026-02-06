"""LLM Factory and Adapter Service.

Provides a unified interface for different LLM providers (Ollama, Vertex AI),
abstracting away their differences in input/output formats and initialization.
"""

import logging
from typing import Optional, Protocol, cast

from langchain_community.llms import Ollama

from app.config import settings

# Try importing Vertex AI (graceful fallback if not installed)
try:
    from langchain_google_vertexai import ChatVertexAI

    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False


logger = logging.getLogger(__name__)


class UnifiedLLM(Protocol):
    """Protocol for unified LLM interface."""

    async def ainvoke(self, input_text: str) -> str:
        """Async invoke the LLM with text input and return text output."""


class OllamaAdapter:
    """Adapter for LangChain Ollama LLM."""

    def __init__(self, model: str, temperature: float, base_url: str):
        """Initialize Ollama adapter.

        Args:
            model: Model name.
            temperature: Sampling temperature.
            base_url: Ollama API base URL.
        """
        self.llm = Ollama(
            model=model,
            temperature=temperature,
            base_url=base_url,
            format="json",  # Force JSON for structured tasks
        )
        self.provider = "ollama"

    async def ainvoke(self, input_text: str) -> str:
        """Invoke Ollama (it expects string, returns string)."""
        # Ollama.ainvoke returns Any/BaseMessage depending on version, usually string or result
        # We cast to str to satisfy the Protocol definition and MyPy
        result = await self.llm.ainvoke(input_text)
        return cast(str, result)


class VertexAdapter:
    """Adapter for Google Vertex AI Chat Model."""

    def __init__(self, model: str, temperature: float, project: str, location: str):
        """Initialize Vertex AI adapter.

        Args:
            model: Model name.
            temperature: Sampling temperature.
            project: GCP Project ID.
            location: GCP Location/Region.
        """
        if not VERTEX_AVAILABLE:
            raise ImportError("langchain-google-vertexai not installed")

        self.llm = ChatVertexAI(
            model_name=model,
            temperature=temperature,
            project=project,
            location=location,
            max_output_tokens=2048,
        )
        self.provider = "google_vertex"

    async def ainvoke(self, input_text: str) -> str:
        """Invoke Vertex AI.

        ChatVertexAI expects messages, but can accept a string which it converts
        to a HumanMessage. It returns a BaseMessage, so we must extract content.
        """
        response = await self.llm.ainvoke(input_text)
        return str(response.content)


def get_llm(
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> UnifiedLLM:
    """Factory to get the configured LLM instance.

    Args:
        model: Optional model name override.
        temperature: Optional temperature override.

    Returns:
        UnifiedLLM: Adapter instance adhering to the protocol.
    """
    provider = settings.AI_PROVIDER
    temp = temperature if temperature is not None else settings.LLM_TEMPERATURE

    logger.info("Initializing LLM with provider: %s", provider)

    if provider == "google_vertex":
        if not settings.GOOGLE_CLOUD_PROJECT:
            logger.warning("GOOGLE_CLOUD_PROJECT not set, falling back to Ollama")
            provider = "ollama"  # Fallback
        else:
            model_name = settings.VERTEX_MODEL_NAME  # Use config for Vertex
            # Note: The 'model' arg passed in is usually the Ollama model name (e.g. "llama3...").
            # Only override if it looks like a Gemini model, otherwise stick to default Vertex model
            if model and "gemini" in model:
                model_name = model

            return VertexAdapter(
                model=model_name,
                temperature=temp,
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.GOOGLE_CLOUD_LOCATION,
            )

    # Default to Ollama
    model_name = model or settings.OLLAMA_MODEL
    return OllamaAdapter(
        model=model_name,
        temperature=temp,
        base_url=settings.OLLAMA_BASE_URL,
    )
