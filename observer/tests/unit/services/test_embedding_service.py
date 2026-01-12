import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.embedding_service import (
    EmbeddingService, 
    LocalEmbeddingProvider, 
    OpenAIEmbeddingProvider,
    get_embedding_service
)
from app.config import settings

@pytest.fixture
def mock_settings():
    with patch("app.services.embedding_service.settings") as mock_s:
        mock_s.EMBEDDING_MODEL = "all-MiniLM-L6-v2"
        mock_s.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
        mock_s.OPENAI_API_KEY = "sk-test"
        mock_s.EMBEDDING_PROVIDER = "local"
        yield mock_s

@pytest.fixture
def mock_sentence_transformer():
    with patch("sentence_transformers.SentenceTransformer") as mock:
        yield mock

@pytest.fixture
def mock_openai():
    with patch("openai.AsyncOpenAI") as mock:
        yield mock

# === Local Provider Tests ===

def test_local_provider_init(mock_settings, mock_sentence_transformer):
    """Test local provider initialization."""
    mock_sentence_transformer.return_value.get_sentence_embedding_dimension.return_value = 384
    
    provider = LocalEmbeddingProvider()
    assert provider.dimension == 384
    mock_sentence_transformer.assert_called_with("all-MiniLM-L6-v2")

@pytest.mark.asyncio
async def test_local_provider_generate(mock_settings, mock_sentence_transformer):
    """Test local embedding generation."""
    mock_model = mock_sentence_transformer.return_value
    # encode return numpy array
    mock_model.encode.return_value = MagicMock(tolist=lambda: [0.1, 0.2, 0.3])
    
    provider = LocalEmbeddingProvider()
    emb = await provider.generate_embedding("test")
    
    assert emb == [0.1, 0.2, 0.3]
    mock_model.encode.assert_called_with("test", convert_to_numpy=True)

# === OpenAI Provider Tests ===

def test_openai_provider_init(mock_settings, mock_openai):
    """Test OpenAI provider init."""
    provider = OpenAIEmbeddingProvider()
    assert provider.dimension == 1536 # Default for small
    mock_openai.assert_called_with(api_key="sk-test")

def test_openai_provider_missing_key(mock_settings):
    """Test missing key raises error."""
    mock_settings.OPENAI_API_KEY = None
    with pytest.raises(ValueError):
        OpenAIEmbeddingProvider()

@pytest.mark.asyncio
async def test_openai_provider_generate(mock_settings, mock_openai):
    """Test OpenAI generation."""
    client = mock_openai.return_value
    # Mock response structure
    resp = MagicMock()
    data_item = MagicMock()
    data_item.embedding = [0.9] * 1536
    resp.data = [data_item]
    
    client.embeddings.create = AsyncMock(return_value=resp)
    
    provider = OpenAIEmbeddingProvider()
    emb = await provider.generate_embedding("text")
    
    assert len(emb) == 1536
    assert emb[0] == 0.9

@pytest.mark.asyncio
async def test_openai_provider_error(mock_settings, mock_openai):
    """Test OpenAI error handling."""
    client = mock_openai.return_value
    client.embeddings.create.side_effect = Exception("API Error")
    
    provider = OpenAIEmbeddingProvider()
    with pytest.raises(Exception):
        await provider.generate_embedding("text")

# === Service Tests ===

@pytest.mark.asyncio
async def test_service_init_auto_local(mock_settings, mock_sentence_transformer):
    """Test auto-detect local."""
    mock_settings.EMBEDDING_PROVIDER = "local"
    service = EmbeddingService()
    assert isinstance(service.provider, LocalEmbeddingProvider)

@pytest.mark.asyncio
async def test_service_init_auto_openai(mock_settings, mock_openai):
    """Test auto-detect OpenAI."""
    mock_settings.EMBEDDING_PROVIDER = "openai"
    service = EmbeddingService()
    assert isinstance(service.provider, OpenAIEmbeddingProvider)

@pytest.mark.asyncio
async def test_service_generate_embedding(mock_settings):
    """Test service generation flow."""
    mock_provider = AsyncMock()
    mock_provider.dimension = 3
    mock_provider.generate_embedding.return_value = [0.1, 0.2, 0.3]
    
    service = EmbeddingService(provider=mock_provider)
    
    # Test valid text
    res = await service.generate_embedding("  Hello \n world  ")
    assert res == [0.1, 0.2, 0.3]
    # Check preprocessing
    mock_provider.generate_embedding.assert_called_with("Hello world")

@pytest.mark.asyncio
async def test_service_dimension_mismatch(mock_settings):
    """Test dimension validation."""
    mock_provider = AsyncMock()
    mock_provider.dimension = 3
    mock_provider.generate_embedding.return_value = [0.1] # Wrong dim
    
    service = EmbeddingService(provider=mock_provider)
    
    with pytest.raises(ValueError, match="Expected embedding dimension"):
        await service.generate_embedding("test")

@pytest.mark.asyncio
async def test_service_empty_text(mock_settings):
    """Test empty text validation."""
    service = EmbeddingService(provider=AsyncMock())
    with pytest.raises(ValueError, match="Text cannot be empty"):
        await service.generate_embedding("")
    with pytest.raises(ValueError):
        await service.generate_embedding("   ")

@pytest.mark.asyncio
async def test_service_batch(mock_settings):
    """Test batch generation."""
    mock_provider = AsyncMock()
    mock_provider.dimension = 1
    mock_provider.generate_embedding.side_effect = [[0.1], [0.2]]
    
    service = EmbeddingService(provider=mock_provider)
    res = await service.generate_embeddings_batch(["t1", "t2"])
    
    assert res == [[0.1], [0.2]]
    assert mock_provider.generate_embedding.call_count == 2

def test_singleton_getter(mock_settings, mock_sentence_transformer):
    """Test get_embedding_service singleton."""
    # We must reset the global instance first to avoid side effects from other tests if any
    # Since imports are top-level, we might need to patch the module dict or just check type
    svc1 = get_embedding_service()
    svc2 = get_embedding_service()
    assert svc1 is svc2

@pytest.mark.asyncio
async def test_embedding_service_dimension_property():
    provider = MagicMock(); provider.dimension = 123
    service = EmbeddingService(provider=provider)
    assert service.dimension == 123
