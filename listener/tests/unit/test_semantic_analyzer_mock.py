from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.semantic_analyzer import SemanticAnalyzer, get_semantic_analyzer


@pytest.fixture
def mock_ollama():
    with patch("app.services.semantic_analyzer.get_llm") as mock:
        llm_instance = MagicMock()
        llm_instance.ainvoke = AsyncMock()
        mock.return_value = llm_instance
        yield mock


@pytest.fixture
def mock_model_fetcher():
    with patch("app.services.semantic_analyzer.get_model_fetcher") as mock:
        fetcher = MagicMock()
        fetcher.get_model_for_function = AsyncMock(return_value="mock-model")
        fetcher.get_prompt_for_function = AsyncMock(
            return_value={"template_content": "System msg", "version": "1.0"}
        )
        mock.return_value = fetcher
        yield mock


@pytest.mark.asyncio
async def test_init_defaults():
    """Test default initialization."""
    with patch("app.services.semantic_analyzer.settings") as mock_settings:
        mock_settings.OLLAMA_MODEL = "default-model"
        mock_settings.LLM_TEMPERATURE = 0.0
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
        assert analyzer.model == "default-model"
        assert analyzer.temperature == 0.0


@pytest.mark.asyncio
async def test_init_dynamic_fetch():
    """Test dynamic model fetching."""
    with patch("asyncio.get_event_loop") as mock_get_loop:
        mock_loop = MagicMock()
        mock_loop.run_until_complete.return_value = "dynamic-model"
        mock_get_loop.return_value = mock_loop

        analyzer = SemanticAnalyzer(fetch_dynamic_model=True)
        assert analyzer.model == "dynamic-model"


@pytest.mark.asyncio
async def test_init_dynamic_fetch_no_loop():
    """Test dynamic fetch when no loop exists."""
    with (
        patch("asyncio.get_event_loop", side_effect=RuntimeError("No loop")),
        patch("asyncio.new_event_loop") as mock_new_loop,
        patch("asyncio.set_event_loop") as mock_set_loop,
    ):

        mock_loop = MagicMock()
        mock_loop.run_until_complete.return_value = "dynamic-model"
        mock_new_loop.return_value = mock_loop

        analyzer = SemanticAnalyzer(fetch_dynamic_model=True)
        assert analyzer.model == "dynamic-model"
        mock_new_loop.assert_called_once()
        mock_set_loop.assert_called_once()


@pytest.mark.asyncio
async def test_init_dynamic_fetch_fail(mock_ollama, mock_model_fetcher):
    """Test dynamic fetch failure falls back to default."""
    with patch("app.services.semantic_analyzer.settings") as mock_settings:
        mock_settings.OLLAMA_MODEL = "default-model"
        mock_model_fetcher.return_value.get_model_for_function.side_effect = Exception("Fetch Fail")

        # We need mock loop to run the fail
        with patch("asyncio.get_event_loop") as mock_get_loop:
            mock_loop = MagicMock()
            mock_loop.run_until_complete.side_effect = Exception("Run Fail")
            mock_get_loop.return_value = mock_loop

            analyzer = SemanticAnalyzer(fetch_dynamic_model=True)
            assert analyzer.model == "default-model"


@pytest.mark.asyncio
async def test_refresh_prompt(mock_ollama, mock_model_fetcher):
    """Test prompt refreshing."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)

    fetcher = mock_model_fetcher.return_value
    fetcher.get_prompt_for_function.return_value = {
        "template_content": "New System Msg",
        "version": "2.0",
    }

    await analyzer._refresh_prompt()
    formatted = analyzer.prompt.format_messages(input_text="test")
    assert "New System Msg" in formatted[0].content


@pytest.mark.asyncio
async def test_refresh_prompt_fail(mock_ollama, mock_model_fetcher):
    """Test prompt refresh failure."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    fetcher = mock_model_fetcher.return_value
    fetcher.get_prompt_for_function.side_effect = Exception("Fail")

    # Should safely log warning and continue
    await analyzer._refresh_prompt()


def test_analyze_sync(mock_ollama):
    """Test synchronous analyze wrapper."""
    with patch.object(SemanticAnalyzer, "analyze", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = MagicMock()

        with patch("asyncio.get_event_loop") as mock_get_loop:
            mock_loop = MagicMock()
            mock_get_loop.return_value = mock_loop

            analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
            analyzer.analyze_sync("test")

            mock_loop.run_until_complete.assert_called_once()


def test_analyze_sync_no_loop(mock_ollama):
    """Test sync analyze with no loop."""
    with patch.object(SemanticAnalyzer, "analyze", new_callable=AsyncMock):
        with (
            patch("asyncio.get_event_loop", side_effect=RuntimeError),
            patch("asyncio.new_event_loop") as mock_new,
            patch("asyncio.set_event_loop"),
        ):

            mock_loop = MagicMock()
            mock_new.return_value = mock_loop

            analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
            analyzer.analyze_sync("test")

            mock_loop.run_until_complete.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_happy_path(mock_ollama):
    """Test successful analysis."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    mock_llm = mock_ollama.return_value
    mock_llm.ainvoke.return_value = """
    {
        "primary_emotion": "Joy",
        "category": "Good",
        "vac": {"valence": 0.9, "arousal": 0.5, "connection": 0.8},
        "confidence": 0.95,
        "reasoning": "Test reasoning"
    }
    """
    result = await analyzer.analyze("I am happy")
    assert result.primary_emotion == "Joy"


@pytest.mark.asyncio
async def test_analyze_markdown_cleanup(mock_ollama):
    """Test cleanup of markdown code blocks."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    mock_llm = mock_ollama.return_value

    # Test ```json
    mock_llm.ainvoke.return_value = """```json
    {
        "primary_emotion": "Joy",
        "category": "Good",
        "vac": {"valence": 0, "arousal": 0, "connection": 0},
        "confidence": 0.9,
        "reasoning": "test"
    }
    ```"""
    result = await analyzer.analyze("text")
    assert result.primary_emotion == "Joy"

    # Test just ```
    mock_llm.ainvoke.return_value = """```
    {
        "primary_emotion": "Joy",
        "category": "Good",
        "vac": {"valence": 0, "arousal": 0, "connection": 0},
        "confidence": 0.9,
        "reasoning": "test"
    }
    ```"""
    result = await analyzer.analyze("text")
    assert result.primary_emotion == "Joy"


@pytest.mark.asyncio
async def test_analyze_null_values(mock_ollama):
    """Test handling of null values (Uncertainty)."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    mock_llm = mock_ollama.return_value
    mock_llm.ainvoke.return_value = '{"primary_emotion": null, "vac": {"valence": null}}'

    result = await analyzer.analyze("blah")
    assert result.primary_emotion == "Uncertainty"


@pytest.mark.asyncio
async def test_analyze_json_error(mock_ollama):
    """Test JSON parse error."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    mock_llm = mock_ollama.return_value
    mock_llm.ainvoke.return_value = "Not JSON"

    with pytest.raises(RuntimeError, match="Invalid JSON response"):
        await analyzer.analyze("test")


@pytest.mark.asyncio
async def test_analyze_llm_error(mock_ollama):
    """Test LLM failure."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    mock_llm = mock_ollama.return_value
    mock_llm.ainvoke.side_effect = Exception("LLM Down")

    with pytest.raises(RuntimeError, match="Analysis error"):
        await analyzer.analyze("test")


@pytest.mark.asyncio
async def test_analyze_empty_input(mock_ollama):
    """Test empty input validation."""
    analyzer = SemanticAnalyzer(fetch_dynamic_model=False)
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        await analyzer.analyze("")


def test_singleton_pattern():
    """Test singleton getter."""
    with patch("app.services.semantic_analyzer.SemanticAnalyzer") as mock_cls:
        import app.services.semantic_analyzer

        app.services.semantic_analyzer._ANALYZER_INSTANCE = None

        s1 = get_semantic_analyzer()
        s2 = get_semantic_analyzer()
        assert s1 is s2
        mock_cls.assert_called_once()
