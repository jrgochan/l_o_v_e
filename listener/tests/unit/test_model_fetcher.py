"""Unit tests for ModelFetcher service."""

# pylint: disable=protected-access

import time
from unittest.mock import AsyncMock, Mock, patch

import pytest

import app.services.model_fetcher
from app.services.model_fetcher import ModelFetcher, get_model_fetcher


class TestModelFetcher:
    """Test ModelFetcher class."""

    def setup_method(self) -> None:
        """Reset singleton before each test."""
        app.services.model_fetcher._fetcher_instance = None  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_get_model_for_function_cache_hit(self) -> None:
        """Test getting model from cache."""
        fetcher = ModelFetcher()
        fetcher._cache["test_func"] = "cached_model"
        fetcher._cache_time["test_func"] = time.time()

        model = await fetcher.get_model_for_function("test_func")
        assert model == "cached_model"

    @pytest.mark.asyncio
    async def test_get_model_for_function_cache_miss_success(self) -> None:
        """Test fetching model from observer when cache misses."""
        fetcher = ModelFetcher(observer_url="http://test-observer")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"assignments": {"test_func": "remote_model"}}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            model = await fetcher.get_model_for_function("test_func")

        assert model == "remote_model"
        assert fetcher._cache["test_func"] == "remote_model"

    @pytest.mark.asyncio
    async def test_get_model_for_function_error_fallback(self) -> None:
        """Test fallback to default when observer fails."""
        fetcher = ModelFetcher()

        with patch("httpx.AsyncClient", side_effect=Exception("Connection error")):
            model = await fetcher.get_model_for_function("test_func", default="default_model")

        assert model == "default_model"

    @pytest.mark.asyncio
    async def test_get_model_for_function_cache_expired(self) -> None:
        """Test cache expiration triggers refresh."""
        fetcher = ModelFetcher()
        fetcher._cache["test_func"] = "old_model"
        fetcher._cache_time["test_func"] = time.time() - 100  # Expired

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"assignments": {"test_func": "new_model"}}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            model = await fetcher.get_model_for_function("test_func", cache_ttl=60)

        assert model == "new_model"

    @pytest.mark.asyncio
    async def test_get_prompt_for_function_success(self) -> None:
        """Test fetching prompt successfully."""
        fetcher = ModelFetcher()

        prompt_data = {"template_content": "You are a bot", "version": 1}
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"found": True, "prompt": prompt_data}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await fetcher.get_prompt_for_function("test_func")

        assert result == prompt_data
        assert fetcher._prompt_cache["test_func"] == prompt_data

    @pytest.mark.asyncio
    async def test_get_prompt_for_function_not_found_404(self) -> None:
        """Test prompt fetch returns None on 404."""
        fetcher = ModelFetcher()

        mock_response = Mock()
        mock_response.status_code = 404

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await fetcher.get_prompt_for_function("test_func")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_prompt_for_function_not_found_msg(self) -> None:
        """Test prompt fetch returns None when API says not found."""
        fetcher = ModelFetcher()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"found": False}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await fetcher.get_prompt_for_function("test_func")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_prompt_for_function_error(self) -> None:
        """Test prompt fetch handles exceptions."""
        fetcher = ModelFetcher()

        with patch("httpx.AsyncClient", side_effect=Exception("Fail")):
            result = await fetcher.get_prompt_for_function("test_func")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_prompt_cache_hit(self) -> None:
        """Test caching for prompts."""
        fetcher = ModelFetcher()
        prompt_data = {"template": "cached"}
        fetcher._prompt_cache["test_func"] = prompt_data
        fetcher._prompt_cache_time["test_func"] = time.time()

        result = await fetcher.get_prompt_for_function("test_func")
        assert result == prompt_data

    @pytest.mark.asyncio
    async def test_get_prompt_expired_cache(self) -> None:
        """Test prompt cache expiration triggers refresh."""
        fetcher = ModelFetcher()
        fetcher._prompt_cache["test_func"] = {"template": "old"}
        fetcher._prompt_cache_time["test_func"] = time.time() - 400

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"found": True, "prompt": {"template": "new"}}

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await fetcher.get_prompt_for_function("test_func", cache_ttl=60)

        assert result == {"template": "new"}

    def test_clear_cache(self) -> None:
        """Test clearing cache."""
        fetcher = ModelFetcher()
        fetcher._cache["a"] = "b"
        fetcher._cache_time["a"] = 123
        fetcher._prompt_cache["c"] = "d"

        fetcher.clear_cache()

        assert len(fetcher._cache) == 0
        assert len(fetcher._cache_time) == 0
        assert len(fetcher._prompt_cache) == 0

    def test_singleton_get_model_fetcher(self) -> None:
        """Test singleton pattern."""
        f1 = get_model_fetcher()
        f2 = get_model_fetcher()
        assert f1 is f2
