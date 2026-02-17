"""Business logic services."""

from app.services.ai.embeddings import (
    EmbeddingService,
    LocalEmbeddingProvider,
    OpenAIEmbeddingProvider,
    get_embedding_service,
)
from app.services.analytics.metrics import MetricsCalculator
from app.services.emotions.mapper import EmotionMapper
from app.services.math.quaternion_builder import QuaternionBuilder, get_quaternion_builder
from app.services.recommendation.engine import RecommendationEngine
from app.services.recommendation.strategies import StrategyRecommender

__all__ = [
    # Embedding
    "EmbeddingService",
    "LocalEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "get_embedding_service",
    # Quaternion
    "QuaternionBuilder",
    "get_quaternion_builder",
    # Emotion Mapping
    "EmotionMapper",
    # Metrics
    "MetricsCalculator",
    # Recommendation
    "RecommendationEngine",
    "StrategyRecommender",
]
