"""Ollama Model Management Service.

Comprehensive client for Ollama REST API supporting model lifecycle management.

This module provides a complete interface to Ollama's model management capabilities,
enabling the Listener to dynamically download, inspect, and manage LLM models without
manual intervention. Critical for the AI Models feature that allows admins to manage
models through the Experience UI.

Key Components:
    OllamaManager: Main client for Ollama REST API operations
    ModelInfo: Pydantic model for basic model information
    ModelDetails: Pydantic model for detailed model metadata
    PullProgress: Real-time progress updates during model downloads

Operations Supported:
    - List local models (GET /api/tags)
    - Pull/download models with streaming progress (POST /api/pull)
    - Delete models (DELETE /api/delete)
    - Get model details (POST /api/show)
    - Health check (GET /)

Integration Points:
    - Used by: routes/ai_models.py (model management endpoints)
    - Calls: Ollama server (http://localhost:11434)
    - Enables: Admin UI for model management

Performance:
    - List models: ~100ms
    - Model details: ~200ms
    - Pull model: Minutes (depends on model size & network speed)
    - Delete model: ~500ms

Examples:
    >>> from app.services.ollama_manager import OllamaManager
    >>> manager = OllamaManager()
    >>> models = await manager.list_local_models()
    >>> for model in models:
    >>>     print(f"{model.name}: {model.parameter_size}, {model.quantization}")

See Also:
    - AI Models Feature: docs/features/ai-models/00-OVERVIEW.md
    - API Routes: app/api/routes/ai_models.py
    - Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
"""

import json
from typing import AsyncIterator, Dict, List, Optional

import httpx
from pydantic import BaseModel


class ModelInfo(BaseModel):
    """Information about an Ollama model."""

    name: str
    size: int  # bytes
    modified_at: str
    digest: str
    parameter_size: str  # e.g., "8B", "70B"
    quantization: str  # e.g., "Q4_0", "Q8_0"
    family: str  # e.g., "llama", "mixtral"


class ModelDetails(BaseModel):
    """Detailed information about a model."""

    name: str
    size: int
    parameters: str
    template: str
    format: str
    family: str
    parameter_size: str
    quantization_level: str

    # Derived/estimated
    estimated_ram_gb: float
    estimated_speed_tokens_per_sec: float
    recommended_for: List[str]  # Functions this model is good for


class PullProgress(BaseModel):
    """Progress update during model pull."""

    status: str  # "pulling manifest", "downloading", "success", "error"
    digest: Optional[str] = None
    total: Optional[int] = None
    completed: Optional[int] = None
    percent: Optional[float] = None


class OllamaManager:
    """Client for Ollama REST API providing complete model lifecycle management.

    This class wraps the Ollama API to provide Pythonic async methods for all
    model operations. Used by the AI Models feature to enable admin users to
    manage LLM models through the Experience UI.

    Attributes:
        base_url (str): Ollama server URL (default: "http://localhost:11434")
        client (httpx.AsyncClient): HTTP client for API requests

    Sample Usage:
        Basic usage:
        >>> manager = OllamaManager()
        >>> models = await manager.list_local_models()
        >>> print(f"Found {len(models)} models")

        Pull a model:
        >>> async for progress in manager.pull_model("phi-3:mini"):
        >>>     print(f"{progress.status}: {progress.percent}%")

    See Also:
        - API Routes: app/api/routes/ai_models.py
        - Feature Docs: docs/features/ai-models/01-OLLAMA-INTEGRATION.md

    Notes:
        - All methods are async
        - Timeout is 300s (5 minutes) for large operations
        - Remember to call close() when done (or use in async context manager)
    """

    def __init__(self, base_url: str = "http://localhost:11434"):
        """Initialize Ollama manager with base URL."""
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=300.0)

    async def health_check(self) -> bool:
        """Check if Ollama server is running and accessible.

        Returns:
            bool: True if Ollama is healthy, False otherwise

        Sample Usage:
            >>> manager = OllamaManager()
            >>> is_healthy = await manager.health_check()
            >>> if is_healthy:
            >>>     print("Ollama is running")

        Notes:
            - Fast check (< 100ms)
            - Returns False on any error (doesn't raise)
            - Useful before starting model operations
        """
        try:
            response = await self.client.get("/")
            return response.status_code == 200
        except Exception:
            return False

    async def list_local_models(self) -> List[ModelInfo]:
        """Get all models currently installed on local machine.

        Returns:
            List[ModelInfo]: List of model information objects

        Sample Usage:
            >>> manager = OllamaManager()
            >>> models = await manager.list_local_models()
            >>> for model in models:
            >>>     print(f"{model.name}: {model.parameter_size}, {model.size/1e9:.1f}GB")

        Raises:
            RuntimeError: If API request fails

        Notes:
            - Returns empty list if no models installed
            - Sorted by modification date (most recent first)
            - Includes size, digest, parameter count, quantization
        """
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()
            data = response.json()

            models = []
            for model in data.get("models", []):
                models.append(
                    ModelInfo(
                        name=model["name"],
                        size=model["size"],
                        modified_at=model["modified_at"],
                        digest=model["digest"],
                        parameter_size=model["details"].get("parameter_size", "Unknown"),
                        quantization=model["details"].get("quantization_level", "Unknown"),
                        family=model["details"].get("family", "Unknown"),
                    )
                )

            return models
        except Exception as e:
            raise RuntimeError(f"Failed to list local models: {str(e)}")

    async def pull_model(self, model_name: str) -> AsyncIterator[PullProgress]:
        """Pull (download) a model from Ollama registry.

        Yields progress updates as the model downloads.
        """
        try:
            async with self.client.stream(
                "POST",
                "/api/pull",
                json={"name": model_name, "stream": True},
                timeout=None,  # No timeout for long downloads
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)

                        # Calculate percentage if available
                        percent = None
                        if data.get("total") and data.get("completed"):
                            percent = (data["completed"] / data["total"]) * 100

                        yield PullProgress(
                            status=data.get("status", "unknown"),
                            digest=data.get("digest"),
                            total=data.get("total"),
                            completed=data.get("completed"),
                            percent=percent,
                        )

                        # If we hit success or error, we're done
                        if data.get("status") in ["success", "error"]:
                            break
        except Exception as e:
            yield PullProgress(
                status="error", digest=None, total=None, completed=None, percent=None
            )
            raise RuntimeError(f"Failed to pull model {model_name}: {str(e)}")

    async def delete_model(self, model_name: str) -> Dict[str, str]:
        """Delete a model from local storage."""
        try:
            response = await self.client.request("DELETE", "/api/delete", json={"name": model_name})
            response.raise_for_status()
            result: Dict[str, str] = response.json()
            return result
        except Exception as e:
            raise RuntimeError(f"Failed to delete model {model_name}: {str(e)}")

    async def get_model_details(self, model_name: str) -> ModelDetails:
        """Get detailed information about a model."""
        try:
            response = await self.client.post("/api/show", json={"name": model_name})
            response.raise_for_status()
            data = response.json()

            # Extract parameter size
            param_size = data["details"].get("parameter_size", "8B")
            quantization = data["details"].get("quantization_level", "Q4_0")
            family = data["details"].get("family", "unknown")

            # Estimate RAM requirements
            estimated_ram = estimate_ram_requirement(param_size)

            # Estimate speed
            estimated_speed = estimate_speed(param_size, quantization)

            # Get recommendations
            recommendations = recommend_for_functions(param_size, family)

            return ModelDetails(
                name=model_name,
                size=data.get("size", 0),
                parameters=data.get("parameters", ""),
                template=data.get("template", ""),
                format=data["details"].get("format", "gguf"),
                family=family,
                parameter_size=param_size,
                quantization_level=quantization,
                estimated_ram_gb=estimated_ram,
                estimated_speed_tokens_per_sec=estimated_speed,
                recommended_for=recommendations,
            )
        except Exception as e:
            raise RuntimeError(f"Failed to get details for model {model_name}: {str(e)}")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()


# === Helper Functions ===


def estimate_ram_requirement(parameter_size: str) -> float:
    """Estimate RAM needed based on parameter count."""
    size_map = {
        "3B": 6.0,
        "3.8B": 6.0,
        "7B": 8.0,
        "8B": 10.0,
        "13B": 16.0,
        "47B": 32.0,  # Mixtral 8x7B
        "70B": 48.0,
    }
    return size_map.get(parameter_size, 8.0)


def estimate_speed(parameter_size: str, quantization: str) -> float:
    """Estimate tokens per second.

    Rough estimates based on M1 Mac performance.
    """
    base_speeds = {
        "3B": 50.0,
        "3.8B": 45.0,
        "7B": 25.0,
        "8B": 20.0,
        "13B": 12.0,
        "47B": 5.0,
        "70B": 3.0,
    }

    # Quantization affects speed slightly
    quant_mult = {"Q4_0": 1.0, "Q5_0": 0.9, "Q8_0": 0.8, "F16": 0.7}

    base = base_speeds.get(parameter_size, 20.0)
    mult = quant_mult.get(quantization, 1.0)
    return base * mult


def recommend_for_functions(parameter_size: str, family: str) -> List[str]:
    """Recommend which L.O.V.E. functions this model is good for.

    Functions:
    - semantic_vac: Real-time VAC extraction (needs speed)
    - multi_emotion: Complex emotion detection (needs nuance)
    - insight_generation: Therapeutic guidance (needs empathy)
    - atlas_mapping: Emotion classification (needs precision)
    """
    recommendations = []

    # Fast models good for real-time analysis
    if parameter_size in ["3B", "3.8B", "7B", "8B"]:
        recommendations.append("semantic_vac")
        recommendations.append("atlas_mapping")

    # Medium models good for most tasks
    if parameter_size in ["8B", "13B"]:
        recommendations.append("multi_emotion")
        recommendations.append("insight_generation")

    # Large models best for complex tasks
    if parameter_size in ["47B", "70B"]:
        recommendations.append("insight_generation")
        recommendations.append("multi_emotion")

    # Mixtral specifically good for nuanced analysis
    if family == "mixtral":
        recommendations.append("multi_emotion")
        recommendations.append("insight_generation")

    # Phi models good for classification
    if family == "phi":
        recommendations.append("atlas_mapping")
        recommendations.append("semantic_vac")

    return recommendations
