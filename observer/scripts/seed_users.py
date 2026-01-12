#!/usr/bin/env python3
"""
User Seeding Script

Ensures default users exist for development and initial deployment:
1. Admin User (admin@admin.com / love)
2. Regular User (user@user.com / love)

Usage:
    python scripts/seed_users.py
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_users():
    """Seed initial users."""
    logger.info("=" * 60)
    logger.info("USER SEEDING SCRIPT")
    logger.info("=" * 60)

    users_to_seed = [
        {
            "email": "admin@admin.com",
            "password": "love",
            "full_name": "System Admin",
            "role": UserRole.ADMIN
        },
        {
            "email": "user@user.com",
            "password": "love",
            "full_name": "Demo User",
            "role": UserRole.USER
        }
    ]

    async with AsyncSessionLocal() as session:
        try:
            seeded_count = 0
            
            for user_data in users_to_seed:
                # Check if user exists
                stmt = select(User).where(User.email == user_data["email"])
                result = await session.execute(stmt)
                existing_user = result.scalars().first()

                if existing_user:
                    logger.info(f"User {user_data['email']} already exists - skipping")
                    continue

                # Create user
                logger.info(f"Creating user {user_data['email']}...")
                new_user = User(
                    email=user_data["email"],
                    password_hash=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=True
                )
                session.add(new_user)
                seeded_count += 1
            
            if seeded_count > 0:
                await session.commit()
                logger.info(f"✓ Successfully seeded {seeded_count} users")
            else:
                logger.info("No new users created")
                
            return True

        except Exception as e:
            logger.error(f"✗ User seeding failed: {e}")
            await session.rollback()
            return False

if __name__ == "__main__":
    success = asyncio.run(seed_users())
    sys.exit(0 if success else 1)
