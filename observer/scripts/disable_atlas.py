import asyncio
import sys
from pathlib import Path

from app.database import AsyncSessionLocal
from app.models.emotion_definition import EmotionCollection
from sqlalchemy import select

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def disable_atlas():
    async with AsyncSessionLocal() as session:
        # Find "Atlas of the Heart"
        stmt = select(EmotionCollection).where(
            EmotionCollection.name == "Atlas of the Heart"
        )
        result = await session.execute(stmt)
        atlas = result.scalar_one_or_none()

        if atlas:
            print(
                f"Found 'Atlas of the Heart' (ID: {atlas.id}, Active: {atlas.is_active})"
            )
            if atlas.is_active:
                atlas.is_active = False
                await session.commit()
                print("✓ Successfully disabled 'Atlas of the Heart'")
            else:
                print("Already disabled.")
        else:
            print("❌ 'Atlas of the Heart' collection not found.")


if __name__ == "__main__":
    asyncio.run(disable_atlas())
