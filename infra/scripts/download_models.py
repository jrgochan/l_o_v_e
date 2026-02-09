#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys

import requests

MODELS = {
    "listener": {
        "repo_id": "dslim/bert-base-NER",
        "exclude": [".msgpack", ".h5", ".tflite", ".ot", ".onnx", ".gitattributes", "README.md"],
    },
    "observer": {
        "repo_id": "sentence-transformers/all-MiniLM-L6-v2",
        "exclude": [".msgpack", ".h5", ".tflite", ".ot", ".onnx", ".gitattributes", "README.md"],
    },
}


def download_model(key, project_root):
    if key not in MODELS:
        print(f"Unknown model key: {key}")
        sys.exit(1)

    config = MODELS[key]
    repo_id = config["repo_id"]

    # Destination: infra/models/<sanitized_repo_id>
    sanitized_name = repo_id.replace("/", "_")
    dest_dir = os.path.join(project_root, "infra", "models", sanitized_name)

    print(f"⬇️  Downloading {repo_id} to {dest_dir} (via curl)...")
    os.makedirs(dest_dir, exist_ok=True)

    # 1. Fetch file list via HF API (requests is reliable for small JSON)
    api_url = f"https://huggingface.co/api/models/{repo_id}"
    try:
        r = requests.get(api_url, timeout=10)
        r.raise_for_status()
        siblings = r.json().get("siblings", [])
    except Exception as e:
        print(f"❌ Failed to fetch file list for {repo_id}: {e}")
        sys.exit(1)

    # 2. Iterate and Curl
    for sib in siblings:
        filename = sib["rfilename"]

        # Check exclusions
        # Suffix check
        if any(filename.endswith(ext) for ext in config["exclude"]):
            continue
        # Directory skip (we likely want flat or simple structure, but HF structure implies flat for these models usually)
        if "/" in filename:
            # Ensure subdirs exist if needed
            os.makedirs(os.path.join(dest_dir, os.path.dirname(filename)), exist_ok=True)

        url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
        local_path = os.path.join(dest_dir, filename)

        if os.path.exists(local_path):
            # Simple size check could be added here, but for now we overwrite or skip?
            # Curl -C - continues if supported.
            pass

        print(f"  - Fetching {filename}...")
        try:
            # Use curl with location follow, fail on error, continue/resume
            subprocess.check_call(["curl", "-L", "-C", "-", "-f", "-s", "-o", local_path, url])
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to download {filename}: {e}")
            sys.exit(1)

    print(f"✅ {repo_id} ready at {dest_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("model_key", choices=MODELS.keys(), help="Model to download")
    parser.add_argument("--project-root", default=".", help="Root of the project")
    args = parser.parse_args()

    download_model(args.model_key, os.path.abspath(args.project_root))
