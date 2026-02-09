import logging
import os

from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_models():
    """
    Download required models to the cache directory.
    This script is intended to run during the Docker build process.
    """
    # Model to download (must match what is used in app/services/embedding_service.py)
    # config.py uses "all-MiniLM-L6-v2"
    model_name = "all-MiniLM-L6-v2"

    # Rely on HF_HOME environment variable for standard cache structure
    logger.info(f"Starting download of '{model_name}' using standard HF_HOME cache...")

    try:
        # This triggers the download and caching using standard layout
        SentenceTransformer(model_name)
        logger.info(f"Successfully downloaded '{model_name}'.")

        # Verify file existence (basic check)
        cache_folder = os.getenv("HF_HOME")
        if cache_folder and os.path.exists(cache_folder):
            logger.info(f"Cache directory verified at: {cache_folder}")
            # List contents to confirm
            logger.info(f"Contents: {os.listdir(cache_folder)}")
        else:
            logger.warning(
                "HF_HOME not set or path missing, but download completed successfully."
            )

    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        exit(1)


if __name__ == "__main__":
    download_models()
