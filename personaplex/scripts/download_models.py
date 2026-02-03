import os
import sys

from dotenv import load_dotenv
from huggingface_hub import hf_hub_download

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

token = os.getenv("HF_TOKEN")
if not token:
    print("❌ Error: HF_TOKEN not found in .env")
    print("Please set your HuggingFace token in personaplex/.env")
    sys.exit(1)

REPO_ID = "nvidia/personaplex-7b-v1"
FILES = {
    "Mimi (Audio Autoencoder)": "tokenizer-e351c8d8-checkpoint125.safetensors",
    "Text Tokenizer": "tokenizer_spm_32k_3.model",
    "Moshi (Language Model - 7GB)": "model.safetensors",
}

print(f"⬇️  Downloading models from {REPO_ID}...")
print(f"🔑 Using token: {token[:4]}...{token[-4:]}")

try:
    for name, filename in FILES.items():
        print(f"\n📦 Downloading {name}...")
        path = hf_hub_download(
            repo_id=REPO_ID, filename=filename, token=token, resume_download=True
        )
        print(f"✅ Cached at: {path}")

    print("\n✨ All models downloaded successfully!")

except Exception as e:
    print(f"\n❌ Error downloading models: {e}")
    if "401" in str(e) or "403" in str(e):
        print("💡 Hint: Ensure you have accepted the license at:")
        print(f"   https://huggingface.co/{REPO_ID}")
    sys.exit(1)
