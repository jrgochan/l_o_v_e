#!/usr/bin/env python3
"""
Seed Demo Journey Data

Imports demo user journeys, waypoints, and strategy attempts for testing and
development purposes. This data should ONLY be used in development environments.

Features:
- 10 sample journeys across 4 demo user personas
- 7 completed, 2 abandoned, 1 paused journeys
- 32 strategy attempts with ratings and feedback
- Tests various journey patterns and outcomes

Safety:
- Includes --dev-only flag (required for seeding)
- Clear demo- user_id naming convention
- Easy to identify and delete demo data

Usage:
    python scripts/seed_demo_data.py --dev-only [--dry-run] [--verify-only]
    
Options:
    --dev-only      REQUIRED - Confirms this is dev environment only
    --dry-run       Show what would be imported without actually importing
    --verify-only   Check if demo data already exists, don't import
"""

import asyncio
import json
import sys
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import UUID, uuid4

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.transition_strategy import (
    UserJourney,
    JourneyWaypoint,
    StrategyAttempt,
    TransitionStrategy
)
from app.models.emotion_definition import EmotionDefinition
from sqlalchemy import select, func


DEMO_JOURNEYS_FILE = "data/demo_journeys.json"


def user_id_to_uuid(user_id_str: str) -> UUID:
    """
    Generate consistent UUID from user_id string.
    
    Uses MD5 hash to create a deterministic UUID from the string identifier.
    This ensures the same user_id string always generates the same UUID.
    """
    # Generate consistent UUID from string using MD5 hash
    hash_bytes = hashlib.md5(user_id_str.encode()).digest()
    return UUID(bytes=hash_bytes)


def load_demo_journeys() -> Dict[str, Any]:
    """Load demo journeys from JSON file."""
    full_path = Path(__file__).parent.parent / DEMO_JOURNEYS_FILE
    
    if not full_path.exists():
        raise FileNotFoundError(f"Demo journeys file not found: {full_path}")
    
    with open(full_path, 'r') as f:
        return json.load(f)


async def get_emotion_id(session, emotion_name: str) -> Optional[UUID]:
    """Look up emotion ID from emotion_definitions by name."""
    stmt = select(AtlasDefinition).where(AtlasDefinition.emotion_name == emotion_name)
    result = await session.execute(stmt)
    emotion = result.scalar_one_or_none()
    return emotion.id if emotion else None


async def get_strategy_id(session, strategy_name: str) -> Optional[UUID]:
    """
    Look up strategy ID from transition_strategies by name.
    
    Uses .first() instead of .scalar_one_or_none() to handle potential duplicates.
    """
    stmt = select(TransitionStrategy).where(TransitionStrategy.strategy_name == strategy_name)
    result = await session.execute(stmt)
    strategy = result.scalars().first()  # Get first match to handle duplicates
    return strategy.id if strategy else None


async def check_existing_demo_data(session) -> Dict[str, int]:
    """Check how much demo data already exists."""
    # Count journeys - we'll check user_id as string in verification
    stmt = select(func.count(UserJourney.id))
    result = await session.execute(stmt)
    journey_count = result.scalar()
    
    # Count waypoints from demo journeys
    # This is approximate since we don't have a direct way to filter
    stmt = select(func.count(JourneyWaypoint.id))
    result = await session.execute(stmt)
    waypoint_count = result.scalar()
    
    # Count strategy attempts
    stmt = select(func.count(StrategyAttempt.id))
    result = await session.execute(stmt)
    attempt_count = result.scalar()
    
    return {
        'demo_journeys': journey_count,
        'total_waypoints': waypoint_count,
        'total_attempts': attempt_count
    }


async def seed_journey(
    session,
    journey_data: Dict[str, Any],
    dry_run: bool = False
) -> tuple[bool, str]:
    """
    Seed a single journey with its waypoints and strategy attempts.
    
    Returns:
        tuple of (success: bool, message: str)
    """
    try:
        journey_user_id = journey_data['user_id']
        print(f"\n{'='*60}")
        print(f"Processing Journey: {journey_data['start_emotion']} → {journey_data['goal_emotion']}")
        print(f"User: {journey_user_id}")
        print(f"Status: {journey_data['status']}")
        print(f"{'='*60}")
        
        # Look up emotion IDs
        start_emotion_id = await get_emotion_id(session, journey_data['start_emotion'])
        goal_emotion_id = await get_emotion_id(session, journey_data['goal_emotion'])
        
        if not start_emotion_id or not goal_emotion_id:
            msg = f"  ❌ ERROR: Could not find emotion IDs for {journey_data['start_emotion']} or {journey_data['goal_emotion']}"
            print(msg)
            return False, msg
        
        if dry_run:
            print(f"  🔍 DRY RUN: Would create journey with {len(journey_data['waypoints'])} waypoints")
            print(f"  🔍 DRY RUN: Would create {len(journey_data['strategies_attempted'])} strategy attempts")
            return True, "Dry run successful"
        
        # Create UserJourney
        journey_id = uuid4()
        
        # Calculate timestamps
        started_at = datetime.utcnow() - timedelta(minutes=journey_data['duration_minutes'])
        
        completed_at = None
        abandoned_at = None
        paused_at = None
        
        if journey_data['status'] == 'completed':
            completed_at = datetime.utcnow()
        elif journey_data['status'] == 'abandoned':
            abandoned_at = datetime.utcnow()
        elif journey_data['status'] == 'paused':
            paused_at = datetime.utcnow()
        
        # Find last reached waypoint
        current_waypoint = 0
        for wp in journey_data['waypoints']:
            if wp.get('reached', False):
                current_waypoint = wp['index']
        
        # Convert user_id string to UUID
        user_uuid = user_id_to_uuid(journey_user_id)
        
        journey = UserJourney(
            id=journey_id,
            user_id=user_uuid,  # Use UUID generated from string
            start_emotion_id=start_emotion_id,
            goal_emotion_id=goal_emotion_id,
            start_vac=journey_data['start_vac'],
            goal_vac=journey_data['goal_vac'],
            waypoints=[wp['emotion'] for wp in journey_data['waypoints']],
            status=journey_data['status'],
            current_waypoint=current_waypoint,
            started_at=started_at,
            completed_at=completed_at,
            abandoned_at=abandoned_at,
            paused_at=paused_at,
            context_metadata=journey_data.get('context'),
            estimated_time=f"{journey_data['duration_minutes']} minutes"
        )
        
        session.add(journey)
        print(f"  ✅ Created journey: {journey.id}")
        
        # Create JourneyWaypoints
        waypoint_count = 0
        for waypoint_data in journey_data['waypoints']:
            emotion_id = await get_emotion_id(session, waypoint_data['emotion'])
            
            if not emotion_id:
                print(f"  ⚠️  WARNING: Could not find emotion ID for {waypoint_data['emotion']}, skipping waypoint")
                continue
            
            # Parse time_to_reach
            time_str = waypoint_data.get('time_to_reach', '0 minutes')
            
            # Calculate reached_at timestamp
            reached_at = None
            if waypoint_data.get('reached', False):
                # Calculate based on cumulative time
                minutes = int(time_str.split()[0])
                reached_at = started_at + timedelta(minutes=minutes)
            
            waypoint = JourneyWaypoint(
                journey_id=journey_id,
                waypoint_index=waypoint_data['index'],
                emotion_id=emotion_id,
                emotion_name=waypoint_data['emotion'],
                category=waypoint_data['category'],
                vac_target=waypoint_data['vac'],
                reached=1 if waypoint_data.get('reached', False) else 0,
                reached_at=reached_at,
                time_to_reach=time_str
            )
            
            session.add(waypoint)
            waypoint_count += 1
        
        print(f"  ✅ Created {waypoint_count} waypoints")
        
        # Create StrategyAttempts
        attempt_count = 0
        for attempt_data in journey_data['strategies_attempted']:
            strategy_id = await get_strategy_id(session, attempt_data['strategy_name'])
            
            if not strategy_id:
                print(f"  ⚠️  WARNING: Could not find strategy ID for '{attempt_data['strategy_name']}', skipping attempt")
                continue
            
            # Calculate tried_at timestamp (somewhere during the journey)
            waypoint_idx = attempt_data['waypoint_index']
            # Estimate time based on waypoint progress
            progress_minutes = sum(
                int(wp.get('time_to_reach', '0 minutes').split()[0])
                for wp in journey_data['waypoints']
                if wp['index'] <= waypoint_idx
            )
            tried_at = started_at + timedelta(minutes=progress_minutes)
            
            attempt = StrategyAttempt(
                journey_id=journey_id,
                waypoint_index=waypoint_idx,
                strategy_id=strategy_id,
                strategy_name=attempt_data['strategy_name'],
                tried=1,
                tried_at=tried_at,
                helpful_rating=attempt_data.get('helpful_rating'),
                time_spent=attempt_data.get('time_spent'),
                user_notes=attempt_data.get('notes'),
                completed=1 if attempt_data.get('completed', False) else 0,
                abandoned=0 if attempt_data.get('completed', False) else 1
            )
            
            session.add(attempt)
            attempt_count += 1
        
        print(f"  ✅ Created {attempt_count} strategy attempts")
        
        # Commit the journey with all related records
        await session.commit()
        
        return True, "Journey seeded successfully"
        
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        await session.rollback()
        return False, str(e)


async def verify_demo_data(session) -> Dict[str, Any]:
    """Verify demo data was seeded correctly."""
    print(f"\n{'='*60}")
    print("VERIFICATION: Checking seeded demo data")
    print(f"{'='*60}")
    
    # Count journeys by status
    stmt = select(UserJourney)
    result = await session.execute(stmt)
    all_journeys = result.scalars().all()
    
    demo_journeys = [j for j in all_journeys if str(j.user_id).startswith('demo-')]
    
    print(f"\nTotal journeys in database: {len(all_journeys)}")
    print(f"Demo journeys: {len(demo_journeys)}")
    
    if not demo_journeys:
        print("\n⚠️  No demo journeys found!")
        return {}
    
    # Group by status
    by_status = {}
    for journey in demo_journeys:
        status = journey.status or 'unknown'
        by_status[status] = by_status.get(status, 0) + 1
    
    print("\nDemo journeys by status:")
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count}")
    
    # Group by user
    by_user = {}
    for journey in demo_journeys:
        user = str(journey.user_id)
        by_user[user] = by_user.get(user, 0) + 1
    
    print("\nDemo journeys by user:")
    for user, count in sorted(by_user.items()):
        print(f"  {user}: {count}")
    
    # Count waypoints and attempts
    stmt = select(func.count(JourneyWaypoint.id))
    result = await session.execute(stmt)
    waypoint_count = result.scalar()
    
    stmt = select(func.count(StrategyAttempt.id))
    result = await session.execute(stmt)
    attempt_count = result.scalar()
    
    print(f"\nTotal waypoints in database: {waypoint_count}")
    print(f"Total strategy attempts in database: {attempt_count}")
    
    return {
        'total_journeys': len(all_journeys),
        'demo_journeys': len(demo_journeys),
        'by_status': by_status,
        'by_user': by_user,
        'total_waypoints': waypoint_count,
        'total_attempts': attempt_count
    }


async def main(dev_only: bool = False, dry_run: bool = False, verify_only: bool = False):
    """Main seeding function."""
    print("="*60)
    print("DEMO JOURNEY DATA SEEDING")
    print("="*60)
    
    if not dev_only:
        print("\n❌ ERROR: --dev-only flag is REQUIRED")
        print("This ensures demo data is only seeded in development environments.")
        print("\nUsage: python scripts/seed_demo_data.py --dev-only")
        sys.exit(1)
    
    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made")
    
    if verify_only:
        print("\n✓ VERIFY ONLY MODE - Just checking what exists")
    
    async with AsyncSessionLocal() as session:
        # Check existing
        existing = await check_existing_demo_data(session)
        print(f"\nCurrent database status:")
        print(f"  Demo journeys: {existing.get('demo_journeys', 0)}")
        print(f"  Total waypoints: {existing.get('total_waypoints', 0)}")
        print(f"  Total strategy attempts: {existing.get('total_attempts', 0)}")
        
        if verify_only:
            await verify_demo_data(session)
            return
        
        # Load demo journey data
        print(f"\nLoading demo journeys from {DEMO_JOURNEYS_FILE}...")
        data = load_demo_journeys()
        journeys = data.get('journeys', [])
        
        print(f"Found {len(journeys)} demo journeys to seed")
        
        # Process each journey
        success_count = 0
        fail_count = 0
        
        for journey_data in journeys:
            success, message = await seed_journey(session, journey_data, dry_run=dry_run)
            if success:
                success_count += 1
            else:
                fail_count += 1
        
        # Summary
        print(f"\n{'='*60}")
        print("SEEDING COMPLETE")
        print(f"{'='*60}")
        print(f"Journeys seeded successfully: {success_count}")
        print(f"Journeys failed: {fail_count}")
        print(f"Total processed: {success_count + fail_count}")
        
        if not dry_run and success_count > 0:
            # Verify
            await verify_demo_data(session)
            
            print(f"\n{'='*60}")
            print("✅ SUCCESS: Demo journey data seeded!")
            print(f"{'='*60}")
            print("\nNext steps:")
            print("1. Verify demo data: python scripts/seed_demo_data.py --dev-only --verify-only")
            print("2. Test journey queries via API")
            print("3. Use demo data for UX testing and demonstrations")
            print("\nIMPORTANT: This data should NEVER be seeded to production!")
        else:
            print(f"\n🔍 Dry run complete. Run without --dry-run to actually seed.")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed demo journey data (DEV ONLY)")
    parser.add_argument('--dev-only', action='store_true', required=True,
                        help='REQUIRED - Confirms this is for development environment only')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show what would be imported without importing')
    parser.add_argument('--verify-only', action='store_true', 
                        help='Only verify existing demo data')
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(
            dev_only=args.dev_only,
            dry_run=args.dry_run,
            verify_only=args.verify_only
        ))
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
