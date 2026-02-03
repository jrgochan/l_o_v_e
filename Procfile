# L.O.V.E. Stack Process Definitions
# Usage: uv run honcho start -f Procfile

# --- Backend Services ---
versor: cd versor && uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
observer: cd observer && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
listener: cd listener && uv run uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# --- Optional Services ---
# Uncomment to enable local PersonaPlex (requires GPU or CPU offload)
# personaplex: cd personaplex && uv run uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload

# --- Frontend ---
experience: cd experience/web && npm run dev -- -p 3000
