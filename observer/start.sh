#!/bin/bash
set -e

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Check and Seed Database (Idempotent)
echo "Checking if database is seeded..."
SEEDED=$(python3 -c "import asyncio; from app.database import AsyncSessionLocal; from sqlalchemy import text; 
async def check():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text('SELECT COUNT(*) FROM emotion_definitions'))
            print(result.scalar())
    except Exception:
        print('0')
asyncio.run(check())")

echo "Database contains $SEEDED emotion definitions."

if [ "$SEEDED" -eq "0" ]; then
    # Default to goemotions if not set, consistent with config.sh
    TARGET_DATASET="${DATASET:-goemotions}"
    echo "Database empty. Seeding with DATASET=$TARGET_DATASET..."
    
    # Run seeding with force-reseed to bypass prompts (safe since empty)
    # We use --level=enhanced matching typical production setup
    python3 scripts/seed_all.py --level=enhanced --dataset="$TARGET_DATASET" --force-reseed
else
    echo "Database matches seed criteria or has data. Skipping auto-seed."
fi

# Start application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --loop asyncio
