#!/bin/bash
set -e

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Check and Seed Database (Idempotent)
echo "Checking if database is seeded..."
# Use export PYTHONPATH to ensure module resolution works
export PYTHONPATH=.
SEEDED=$(python3 -c "import asyncio, logging; logging.disable(logging.CRITICAL); from app.database import AsyncSessionLocal; from sqlalchemy import text; 
async def check():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text('SELECT COUNT(*) FROM emotion_definitions'))
            print(result.scalar())
    except Exception:
        print('0')
asyncio.run(check())" | tail -n 1) # Capture only the last line

echo "Database contains $SEEDED emotion definitions."

if [ "$SEEDED" -eq "0" ] || [ "${FORCE_RESEED:-false}" == "true" ]; then
    # Default to goemotions if not set, consistent with config.sh
    TARGET_DATASET="${DATASET:-goemotions}"
    echo "Seeding database (Force=${FORCE_RESEED:-false}) with DATASET=$TARGET_DATASET..."
    
    # Run seeding with force-reseed to bypass prompts/overwrite data
    # We use --level=enhanced matching typical production setup
    python3 scripts/seed_all.py --level=enhanced --dataset="$TARGET_DATASET" --force-reseed
else
    echo "Database matches seed criteria or has data. Skipping auto-seed."
fi

# Always check/seed users (idempotent operation)
echo "Ensuring default users exist..."
python3 scripts/seed_users.py

# Start application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --loop asyncio
