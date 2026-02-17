"""PersonaPlex Service - FastAPI Application.

Main application entry point for PersonaPlex voice mode integration.
This service wraps NVIDIA PersonaPlex with L.O.V.E.-specific configuration
and persona mappings.
"""

import logging

import sentencepiece
import structlog
import torch
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download

from app.config import PERSONA_CONFIG, settings
from app.routes import health, persona, voice  # noqa: E402

# Import Moshi components
try:
    from moshi.models import loaders
    from moshi.server import ServerState
except ImportError:
    # Allow running without moshi installed for basic testing
    loaders = None


# Configure logging
try:
    from logging_config import configure_logging

    configure_logging(log_level=settings.LOG_LEVEL, json_format=not settings.DEBUG)
except ImportError:
    try:
        logging.basicConfig(level=settings.LOG_LEVEL)
    except Exception:
        pass

logger = structlog.get_logger(__name__) if "structlog" in locals() else logging.getLogger(__name__)

# Configure rate limiting
try:
    from security import setup_rate_limiting
except ImportError:

    def setup_rate_limiting(app):
        pass


# Create FastAPI app
app = FastAPI(
    title="PersonaPlex Voice Service",
    description="NVIDIA PersonaPlex integration for L.O.V.E. stack voice mode",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)
setup_rate_limiting(app)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(persona.router, tags=["Persona Configuration"])
app.include_router(voice.router, tags=["Voice Session"])


@app.on_event("startup")
async def startup_event() -> None:
    """Application startup event handler.

    Initializes PersonaPlex service:
    - Logs configuration
    - Checks model availability
    - Verifies GPU/CPU resources
    - Loads Moshi models
    """
    logger.info("🎙️  PersonaPlex Voice Service starting up...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Model: {settings.MODEL_NAME}")
    logger.info(f"Compute: {'CPU Offload' if settings.CPU_OFFLOAD else 'GPU'}")
    logger.info(f"Port: {settings.PORT}")
    logger.info(f"Personas: {list(PERSONA_CONFIG.keys())}")

    if not settings.HF_TOKEN:
        logger.warning("⚠️  HF_TOKEN not set - model download will require manual authentication")

    if loaders:
        try:
            # Device selection: CUDA -> MPS (Mac) -> CPU
            if torch.cuda.is_available():
                device = torch.device("cuda")
            elif torch.backends.mps.is_available():
                device = torch.device("mps")
            else:
                device = torch.device("cpu")

            logger.info(f"Loading models on {device}...")

            # Load Mimi (Audio Autoencoder)
            logger.info(f"Downloading/Loading Mimi model from {settings.MODEL_NAME}...")
            mimi_weight = hf_hub_download(
                settings.MODEL_NAME, loaders.MIMI_NAME, token=settings.HF_TOKEN
            )
            mimi = loaders.get_mimi(mimi_weight, device)
            other_mimi = loaders.get_mimi(mimi_weight, device)
            mimi.to(device)
            other_mimi.to(device)
            logger.info("Mimi loaded successfully")

            # Load Tokenizer
            logger.info("Downloading/Loading Text Tokenizer...")
            tokenizer_path = hf_hub_download(
                settings.MODEL_NAME, loaders.TEXT_TOKENIZER_NAME, token=settings.HF_TOKEN
            )
            text_tokenizer = sentencepiece.SentencePieceProcessor(tokenizer_path)

            # Load Moshi (Language Model)
            logger.info("Downloading/Loading Moshi (7B) model... (This may take a while)")
            moshi_weight = hf_hub_download(
                settings.MODEL_NAME, loaders.MOSHI_NAME, token=settings.HF_TOKEN
            )
            lm = loaders.get_moshi_lm(moshi_weight, device=device, cpu_offload=settings.CPU_OFFLOAD)
            lm.eval()
            logger.info("Moshi loaded successfully")

            # Initialize Server State
            # We use a custom state object attached to the app instance
            app.state.moshi = ServerState(
                mimi=mimi,
                other_mimi=other_mimi,
                text_tokenizer=text_tokenizer,
                lm=lm,
                device=device,
                voice_prompt_dir=None,  # Will be handled dynamically or via config if needed
            )
            logger.info("Warming up model...")
            app.state.moshi.warmup()
            logger.info("Verify Moshi Ready")

        except Exception as e:
            logger.error(f"Failed to load Moshi models: {e}")
            # We don't exit to allow text-only parts to work or for debugging
            app.state.moshi = None
    else:
        app.state.moshi = None

    logger.info("PersonaPlex Voice Service ready")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Application shutdown event handler."""
    logger.info("PersonaPlex Voice Service shutting down...")
