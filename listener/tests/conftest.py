"""Listener Module - Test Configuration.

Pytest fixtures and configuration for testing.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Generator

import pytest

from app.api.deps import get_current_user, get_current_user_ws
from app.main import app

if TYPE_CHECKING:
    from app.models.multi_emotion_response import MultiEmotionAnalysisResponse  # noqa: F401
    from app.models.vac_response import EmotionalClassification, VACVector  # noqa: F401


@pytest.fixture(autouse=True)
def override_auth() -> Generator[None, None, None]:
    """Mock authentication for all tests."""
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    # Need to import locally or global import to avoid circular dep issues in conftest?
    # get_current_user_ws is imported at top level

    app.dependency_overrides[get_current_user_ws] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    yield
    app.dependency_overrides = {}


@pytest.fixture(scope="session", autouse=True)
def suppress_shutdown_logging_errors() -> Generator[None, None, None]:
    """Suppress logging errors during interpreter shutdown.

    Fixes 'ValueError: I/O operation on closed file' from huggingface_hub/httpx.
    """
    yield
    # Remove handlers to prevent writing to closed streams
    logging.getLogger().handlers = []


@pytest.fixture
def fixtures_dir() -> Path:
    """Get path to test fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_text() -> str:
    """Sample text for testing semantic analysis."""
    return "I'm feeling overwhelmed by everything today."


@pytest.fixture
def pity_text() -> str:
    """Text expressing pity (negative Connection)."""
    return "I feel sorry for them. They're really struggling."


@pytest.fixture
def compassion_text() -> str:
    """Text expressing compassion (positive Connection)."""
    return "I understand their pain. I'm here with them."


@pytest.fixture
def grief_text() -> str:
    """Text expressing grief (negative Valence, positive Connection)."""
    return (
        "I miss them so much. The pain of losing them is overwhelming, "
        "but I still feel connected to the love we shared."
    )


@pytest.fixture
def belonging_text() -> str:
    """Text expressing belonging (positive Connection)."""
    return "I can just be myself here. I'm accepted for who I am."


@pytest.fixture
def fitting_in_text() -> str:
    """Text expressing fitting in (negative Connection)."""
    return "I have to pretend to be someone I'm not to fit in."


@pytest.fixture
def joy_text() -> str:
    """Text expressing joy."""
    return "I'm feeling amazing today! Everything is clicking and I feel so alive!"


@pytest.fixture
def anguish_text() -> str:
    """Text expressing anguish (high arousal, negative valence, isolation)."""
    return (
        "I'm in agony and nobody understands what I'm going through. "
        "I'm completely alone in this suffering."
    )


# ---------------------------------------------------------------------------
# Shared factory fixtures — reduce boilerplate across test files
# ---------------------------------------------------------------------------


@pytest.fixture
def make_vac_vector() -> "Callable[..., VACVector]":
    """Factory fixture for creating VACVector instances with defaults."""
    # pylint: disable=import-outside-toplevel
    from app.models.vac_response import VACVector as VACVectorModel

    def _factory(valence: float = 0.5, arousal: float = 0.5, connection: float = 0.5) -> VACVector:
        return VACVectorModel(valence=valence, arousal=arousal, connection=connection)

    return _factory


@pytest.fixture
def make_emotion_classification() -> "Callable[..., Any]":
    """Factory fixture for creating EmotionalClassification instances with defaults."""
    # pylint: disable=import-outside-toplevel
    from app.models.vac_response import EmotionalClassification as EmotionalClassificationModel
    from app.models.vac_response import VACVector as VACVectorModel

    def _factory(
        primary_emotion: str = "Joy",
        category: str = "Places We Go When Life Is Good",
        vac: VACVector | None = None,
        confidence: float = 0.9,
        reasoning: str = "Test reasoning",
    ) -> EmotionalClassification:
        if vac is None:
            vac = VACVectorModel(valence=0.8, arousal=0.6, connection=0.7)

        return EmotionalClassificationModel(
            primary_emotion=primary_emotion,
            category=category,
            vac=vac,
            confidence=confidence,
            reasoning=reasoning,
        )

    return _factory


@pytest.fixture
def make_multi_emotion_response() -> "Callable[..., Any]":
    """Factory fixture for creating MultiEmotionAnalysisResponse with defaults."""
    # pylint: disable=import-outside-toplevel
    from app.models.multi_emotion_response import (
        DetectedEmotionResponse,
    )
    from app.models.multi_emotion_response import (
        MultiEmotionAnalysisResponse as MultiEmotionAnalysisResponseModel,
    )
    from app.models.vac_response import VACVector as VACVectorModel

    def _factory(
        primary_emotion: str = "Joy",
        primary_category: str = "Happiness",
        vac: VACVector | None = None,
        confidence: float = 0.9,
        reasoning: str = "Test reasoning",
    ) -> MultiEmotionAnalysisResponse:
        if vac is None:
            vac = VACVectorModel(valence=0.8, arousal=0.6, connection=0.7)

        primary = DetectedEmotionResponse(
            emotion_name=primary_emotion,
            category=primary_category,
            vac=vac,
            confidence=confidence,
            prominence="primary",
            original_name=None,
            match_method=None,
            match_confidence=None,
        )
        return MultiEmotionAnalysisResponseModel(
            emotions=[primary],
            relationships=[],
            aggregate_vac=vac,
            complexity_score=0.3,
            emotional_clarity=0.9,
            temporal_pattern="concurrent",
            reasoning=reasoning,
        )

    return _factory


@pytest.fixture
def reset_all_singletons() -> Generator[None, None, None]:
    """Reset all service singleton instances. Use for tests needing isolation."""
    # pylint: disable=import-outside-toplevel,protected-access
    import app.services.model_fetcher as model_fetcher_mod
    import app.services.multi_emotion_analyzer as multi_emotion_analyzer_mod
    import app.services.observer_client as observer_client_mod
    import app.services.pii_scrubber as pii_scrubber_mod
    import app.services.prosody_analyzer as prosody_analyzer_mod
    import app.services.semantic_analyzer as semantic_analyzer_mod
    import app.services.transcription as transcription_mod

    multi_emotion_analyzer_mod._MULTI_EMOTION_ANALYZER_INSTANCE = None
    model_fetcher_mod._FETCHER_INSTANCE = None
    observer_client_mod._CLIENT_INSTANCE = None
    pii_scrubber_mod._SCRUBBER_INSTANCE = None
    prosody_analyzer_mod._PROSODY_ANALYZER_INSTANCE = None
    semantic_analyzer_mod._ANALYZER_INSTANCE = None
    transcription_mod._SERVICE_INSTANCE = None

    yield

    # pylint: disable=protected-access
    multi_emotion_analyzer_mod._MULTI_EMOTION_ANALYZER_INSTANCE = None
    model_fetcher_mod._FETCHER_INSTANCE = None
    observer_client_mod._CLIENT_INSTANCE = None
    pii_scrubber_mod._SCRUBBER_INSTANCE = None
    prosody_analyzer_mod._PROSODY_ANALYZER_INSTANCE = None
    semantic_analyzer_mod._ANALYZER_INSTANCE = None
    transcription_mod._SERVICE_INSTANCE = None
