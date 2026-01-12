"""Embedding Service.

Generates semantic embeddings for text to enable similarity search. Embeddings are
dense vector representations that capture meaning in high-dimensional space, where
semantic similarity translates to geometric proximity.

Why Embeddings Matter:
    Traditional keyword matching fails for emotional text::

        "I feel compassionate" vs "I feel pity"
        → Keyword overlap: "feel"
        → But completely different emotions!

    Embeddings capture semantic meaning::

        "I feel compassionate" → [0.23, -0.15, 0.67, ...]
        "I feel pity" → [0.18, -0.10, -0.42, ...]
        → Cosine similarity: 0.65 (moderately similar words)
        → But VAC Connection: +0.7 vs -0.5 (opposite emotions!)

    This is why Observer uses BOTH embeddings AND VAC coordinates!

Provider Architecture:

    Supports two embedding providers::

        1. Local (sentence-transformers):
           - Runs on CPU/GPU
           - No API keys needed
           - Free, private
           - Model: all-MiniLM-L6-v2 (384 dimensions)
           - Speed: ~10-20ms per text

        2. OpenAI (text-embedding-3-*):
           - API-based
           - Requires OPENAI_API_KEY
           - Costs: $0.00002 per 1K tokens
           - Models: ada-002 (1536D), 3-small (1536D), 3-large (3072D)
           - Speed: ~50-100ms per text

    Provider selected via EMBEDDING_PROVIDER environment variable.

Model Selection Guide:

    all-MiniLM-L6-v2 (384D) - Default:
        ✅ Fast (10-20ms)
        ✅ Good quality for emotional text
        ✅ Reasonable memory (200MB model)
        ✅ No API costs
        ❌ Lower accuracy than larger models

        Recommendation: Production use for most cases

    text-embedding-3-large (3072D):
        ✅ Highest quality
        ✅ Best for nuanced emotions
        ❌ Slower (50-100ms)
        ❌ API costs ($0.13 per 1M tokens)
        ❌ Larger storage (3072D vs 384D)

        Recommendation: Premium tier, research

Performance Characteristics:

    Embedding Generation::

        Local (all-MiniLM-L6-v2):
        - Single text: 10-20ms
        - Batch (32 texts): 100-150ms (3-6ms per text)
        - Memory: ~200MB for model
        - Throughput: ~50-100 embeddings/second

        OpenAI (text-embedding-3-small):
        - Single text: 50-100ms (network latency)
        - Batch: 200-300ms (better amortization)
        - No local memory
        - Throughput: ~10-20 embeddings/second

    Recommended Optimization::

        1. Cache embeddings (TTL: 1 hour)
        2. Batch process when possible
        3. Pre-compute atlas embeddings during seeding
        4. Use local for real-time, OpenAI for offline analysis

Example Usage:

    Basic embedding generation::

        service = EmbeddingService()  # Auto-detects provider

        text = "I'm feeling overwhelmed by work deadlines"
        embedding = await service.generate_embedding(text)

        print(f"Dimension: {len(embedding)}")
        # Output: "Dimension: 384"

        print(f"First 5 values: {embedding[:5]}")
        # Output: "First 5 values: [0.234, -0.156, 0.678, -0.023, 0.445]"

    Batch processing::

        texts = [
            "I'm anxious about tomorrow",
            "Feeling calm and content",
            "Overwhelmed by everything"
        ]

        embeddings = await service.generate_embeddings_batch(texts)
        # Returns list of 3 embeddings, each 384D

    Provider-specific::

        # Force OpenAI provider
        openai_provider = OpenAIEmbeddingProvider()
        service = EmbeddingService(provider=openai_provider)
        embedding = await service.generate_embedding(text)

Vector Normalization:

    sentence-transformers models return normalized embeddings (L2 norm ≈ 1.0).
    This is important for cosine similarity::

        # Verify normalization
        import numpy as np
        norm = np.linalg.norm(embedding)
        assert 0.99 <= norm <= 1.01  # Should be ≈ 1.0

    Normalized vectors → cosine similarity = dot product (faster!)

Integration with Observer:

    Embeddings are generated for::

        1. Atlas emotions (during seeding) - 87 embeddings
        2. User trajectory transcriptions (real-time) - per state
        3. Therapeutic strategies (during seeding) - 107 embeddings
        4. Chat messages (real-time) - per message

    Storage::

        - PostgreSQL with pgvector extension
        - HNSW index for fast similarity search
        - Cosine distance operator (<=>)

References:
    - sentence-transformers: Reimers & Gurevych (2019)
    - all-MiniLM-L6-v2: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
    - OpenAI embeddings: https://platform.openai.com/docs/guides/embeddings
    - See docs/modules/observer/senior-developers/03-vector-search.md
"""

import logging
from typing import List, Optional, Protocol, Union, cast

import numpy as np  # noqa: F401

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    """Protocol for embedding providers."""

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text."""
        ...

    @property
    def dimension(self) -> int:
        """Embedding dimension."""
        ...


class LocalEmbeddingProvider:
    """Local embedding provider using sentence-transformers.

    Runs entirely on CPU/GPU, no API keys needed.
    """

    def __init__(self, model_name: Optional[str] = None):
        """Initialize local provider."""
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name or settings.EMBEDDING_MODEL
        logger.info(f"Loading local embedding model: {self.model_name}")

        # Load model (will download on first use)
        self.model = SentenceTransformer(self.model_name)

        # Cache dimension
        self._dimension = self.model.get_sentence_embedding_dimension()

        logger.info(f"Model loaded. Dimension: {self._dimension}")

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using local model.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector
        """
        # sentence-transformers encode is synchronous
        # For true async, we'd use asyncio.to_thread in Python 3.9+
        embedding = self.model.encode(text, convert_to_numpy=True)

        # Convert numpy array to list
        return cast(list[float], embedding.tolist())

    @property
    def dimension(self) -> int:
        """Return embedding dimension."""
        return cast(int, self._dimension)


class OpenAIEmbeddingProvider:
    """OpenAI embedding provider using text-embedding-3-small or text-embedding-3-large.

    Requires OPENAI_API_KEY environment variable.
    """

    def __init__(self, model_name: Optional[str] = None, api_key: Optional[str] = None):
        """Initialize OpenAI provider."""
        from openai import AsyncOpenAI

        self.model_name = model_name or settings.OPENAI_EMBEDDING_MODEL
        self.api_key = api_key or settings.OPENAI_API_KEY

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY must be set for OpenAI provider")

        logger.info(f"Initializing OpenAI embedding provider: {self.model_name}")

        self.client = AsyncOpenAI(api_key=self.api_key)

        # Set dimension based on model
        dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        self._dimension = dimensions.get(self.model_name, 1536)

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector
        """
        try:
            response = await self.client.embeddings.create(
                model=self.model_name, input=text, encoding_format="float"
            )

            embedding = response.data[0].embedding
            return embedding

        except Exception as e:
            logger.error(f"OpenAI embedding generation failed: {e}")
            raise

    @property
    def dimension(self) -> int:
        """Return embedding dimension."""
        return self._dimension


class EmbeddingService:
    """Main embedding service that delegates to the configured provider.

    Provides a consistent interface regardless of provider.
    """

    def __init__(
        self, provider: Optional[Union[LocalEmbeddingProvider, OpenAIEmbeddingProvider]] = None
    ) -> None:
        """Initialize embedding service.

        Args:
            provider: Optional provider instance. If None, creates based on settings.
        """
        # Declare type once
        self.provider: Union[LocalEmbeddingProvider, OpenAIEmbeddingProvider]

        if provider is None:
            # Auto-detect provider from settings
            if str(settings.EMBEDDING_PROVIDER).lower() == "openai":
                logger.info("Using OpenAI embedding provider")
                self.provider = OpenAIEmbeddingProvider()
            else:
                logger.info("Using local embedding provider")
                self.provider = LocalEmbeddingProvider()
        else:
            self.provider = provider

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector

        Raises:
            ValueError: If text is empty
            Exception: If embedding generation fails
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Preprocess text (basic cleaning)
        cleaned_text = self._preprocess_text(text)

        # Generate embedding
        embedding = await self.provider.generate_embedding(cleaned_text)

        # Validate embedding
        if len(embedding) != self.provider.dimension:
            raise ValueError(
                f"Expected embedding dimension {self.provider.dimension}, " f"got {len(embedding)}"
            )

        return embedding

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List[Any] of input texts

        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)

        return embeddings

    @property
    def dimension(self) -> int:
        """Return embedding dimension."""
        return self.provider.dimension

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text before embedding.

        Basic cleaning: strip whitespace, normalize line breaks.

        Args:
            text: Raw input text

        Returns:
            Cleaned text
        """
        # Strip leading/trailing whitespace
        cleaned = text.strip()

        # Normalize line breaks
        cleaned = cleaned.replace("\r\n", " ").replace("\n", " ")

        # Collapse multiple spaces
        cleaned = " ".join(cleaned.split())

        return cleaned


# Singleton instance (lazy-loaded)
_embedding_service_instance = None


def get_embedding_service() -> EmbeddingService:
    """Get singleton embedding service instance.

    Useful for dependency injection in FastAPI.

    Returns:
        EmbeddingService instance
    """
    global _embedding_service_instance

    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService()

    return _embedding_service_instance
