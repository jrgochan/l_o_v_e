"""Model Assignment Fetcher.

Helper utility for fetching dynamically assigned AI models from the Observer module.

This module enables centralized model management - instead of hardcoding which model
each function uses, models can be assigned dynamically through the Observer's AI
management interface. This allows changing models without redeploying the Listener.

Key Components:
    ModelFetcher: Fetches and caches model assignments from Observer
    get_model_fetcher: Factory function returning singleton instance

Integration Points:
    - Calls: Observer module (GET /observer/ai/assignments)
    - Used by: SemanticAnalyzer, MultiEmotionAnalyzer, etc.

Features:
    - Dynamic model assignment (change models without redeployment)
    - Caching with TTL (reduces Observer load)
    - Fallback to defaults (graceful degradation)
    - Per-function model assignment

Performance:
    - Latency: ~50ms (when fetching from Observer)
    - Cache hit: < 1ms
    - Cache TTL: 60 seconds (configurable)

Examples:
    >>> from app.services.model_fetcher import get_model_fetcher
    >>> fetcher = get_model_fetcher()
    >>> model = await fetcher.get_model_for_function("semantic_vac")
    >>> print(model)
    "llama3.1:8b-instruct-q4_0"

See Also:
    - Observer API: observer/app/api/routes/ai_assignments.py
    - AI Models: docs/features/ai-models/00-OVERVIEW.md
    - Usage: app/services/semantic_analyzer.py (uses this for dynamic assignment)
"""

import logging
from typing import Any, Dict, Optional, cast

import httpx

logger = logging.getLogger(__name__)


class ModelFetcher:
    """Fetches AI model assignments from Observer API with caching.

    Enables centralized model management—models can be assigned through Observer's
    web interface without redeploying the Listener. Each AI function (semantic_vac,
    multi_emotion, etc.) can have its own assigned model.

    Architecture:
        Request: GET /observer/ai/assignments
        Response: {"assignments": {"semantic_vac": "llama3.1:8b", ...}}
        Cache: In-memory dict with TTL
        Fallback: Default model if Observer unavailable

    Attributes:
        observer_url (str): Observer API base URL
        _cache (dict): Model assignment cache {function: model}
        _cache_time (dict): Cache timestamps {function: timestamp}

    Examples:
        Basic usage:
        >>> fetcher = ModelFetcher()
        >>> model = await fetcher.get_model_for_function("semantic_vac")
        >>> print(model)
        "llama3.1:8b-instruct-q4_0"

        With caching:
        >>> model1 = await fetcher.get_model_for_function("semantic_vac")  # Fetches from Observer
        >>> model2 = await fetcher.get_model_for_function("semantic_vac")  # Uses cache

        Clear cache:
        >>> fetcher.clear_cache()

    See Also:
        - Singleton: get_model_fetcher()
        - Observer API: observer/app/api/routes/ai_assignments.py
        - Feature docs: docs/features/ai-models/

    Notes:
        - Cache TTL is 60 seconds by default
        - Observer failures fallback to default gracefully
        - Used by semantic_analyzer.py for dynamic model assignment
    """

    def __init__(self, observer_url: str = "http://localhost:8000"):
        """Initialize ModelFetcher with Observer URL."""
        self.observer_url = observer_url
        self._cache: Dict[str, str] = {}
        self._cache_time: Dict[str, float] = {}
        self._prompt_cache: Dict[str, Any] = {}
        self._prompt_cache_time: Dict[str, float] = {}

    async def get_model_for_function(
        self,
        function: str,
        default: str = "llama3.1:8b-instruct-q4_0",
        use_cache: bool = True,
        cache_ttl: int = 60,  # seconds
    ) -> str:
        """Get the currently assigned model for an AI function.

        Fetches model assignment from Observer's AI management system. Uses caching
        to reduce load on Observer and improve performance.

        Args:
            function: Function name to get model for.
                Sample Usage:
                - "semantic_vac" - Single-emotion VAC extraction
                - "multi_emotion" - Multi-emotion analysis
                - "atlas_mapping" - Emotion atlas mapping

            default: Fallback model if fetch fails or no assignment exists.
                Sample Usage: "llama3.1:8b-instruct-q4_0", "phi-3:mini"

            use_cache: Whether to use cached value if available.
                True = Check cache first (faster)
                False = Always fetch fresh from Observer

            cache_ttl: Cache time-to-live in seconds. Default: 60
                How long cached values remain valid.

        Returns:
            str: Model name to use for the function.
                Sample Usage:
                - "llama3.1:8b-instruct-q4_0"
                - "phi-3:mini"
                - "mistral:7b"

            Sample Usage:
            Get model for semantic analysis:
            >>> fetcher = get_model_fetcher()
            >>> model = await fetcher.get_model_for_function("semantic_vac")
            >>> print(model)
            "llama3.1:8b-instruct-q4_0"

            With custom default:
            >>> model = await fetcher.get_model_for_function(
            >>>     "semantic_vac",
            >>>     default="phi-3:mini"
            >>> )

            Skip cache (force fresh fetch):
            >>> model = await fetcher.get_model_for_function(
            >>>     "semantic_vac",
            >>>     use_cache=False
            >>> )

        Performance:
            - Cache hit: < 1ms
            - Cache miss: ~50ms (Observer request)
            - Observer down: ~5s (timeout, then uses default)

        Notes:
            - Returns default if Observer is unavailable (graceful fallback)
            - Cache is per-instance (not global)
            - Cache ages out after TTL seconds
            - Observer failures are logged but don't raise exceptions

        See Also:
            - Clear cache: clear_cache()
            - Observer API: observer/app/api/routes/ai_assignments.py
            - Usage: app/services/semantic_analyzer.py::__init__()
        """
        import time

        # Check cache first
        if use_cache and function in self._cache:
            cache_age = time.time() - self._cache_time.get(function, 0)
            if cache_age < cache_ttl:
                logger.debug("Using cached model for %s: %s", function, self._cache[function])
                return self._cache[function]

        # Fetch from Observer
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.observer_url}/observer/ai/assignments")
                response.raise_for_status()
                data = response.json()

                assignments = data.get("assignments", {})
                model = str(assignments.get(function, default))

                # Update cache
                self._cache[function] = model
                self._cache_time[function] = time.time()

                logger.info("Fetched model assignment for %s: %s", function, model)
                return model

        except Exception as e:
            logger.warning(
                "Failed to fetch model assignment for %s: %s. Using default: %s",
                function,
                e,
                default,
            )
            return default

    def clear_cache(self) -> None:
        """Clear the model assignment cache."""
        self._cache = {}
        self._cache_time = {}
        self._prompt_cache = {}
        self._prompt_cache_time = {}
        logger.info("Model assignment cache cleared")

    async def get_prompt_for_function(
        self,
        function: str,
        use_cache: bool = True,
        cache_ttl: int = 300,  # 5 minutes default for prompts (less frequent changes)
    ) -> Optional[Dict[str, Any]]:
        """Get the active prompt template for an AI function.

        Returns:
            Dict containing 'template_content', 'input_variables', etc.
            Returns None if no active prompt found.
        """
        import time

        # Check cache
        if use_cache and function in self._prompt_cache:
            cache_age = time.time() - self._prompt_cache_time.get(function, 0)
            if cache_age < cache_ttl:
                logger.debug("Using cached prompt for %s", function)
                return cast(Dict[str, Any], self._prompt_cache[function])

        # Fetch from Observer
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.observer_url}/observer/ai/prompts", params={"function_name": function}
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                data = response.json()

                if not data.get("found"):
                    return None

                prompt_data = data.get("prompt")

                # Update cache
                self._prompt_cache[function] = prompt_data
                self._prompt_cache_time[function] = time.time()

                logger.info("Fetched prompt for %s (v%s)", function, prompt_data.get("version"))
                return cast(Dict[str, Any], prompt_data)

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Failed to fetch prompt for %s: %s", function, e)
            return None


# Global instance
_FETCHER_INSTANCE: Optional[ModelFetcher] = None


def get_model_fetcher(observer_url: str = "http://localhost:8000") -> ModelFetcher:
    """Get or create global ModelFetcher instance.

    Args:
        observer_url: Observer API base URL

    Returns:
        ModelFetcher instance
    """
    global _FETCHER_INSTANCE  # pylint: disable=global-statement

    if _FETCHER_INSTANCE is None:
        _FETCHER_INSTANCE = ModelFetcher(observer_url)

    return _FETCHER_INSTANCE
