#!/usr/bin/env python3
"""
Seed Bootstrap Pattern Data

Imports cold-start bootstrap data including:
- Strategy effectiveness ratings (synthetic aggregate data)
- Path templates for common transitions
- Contextual modifiers for recommendations

This data helps new users without journey history by providing research-backed
initial recommendations until personalized data accumulates.

Note: This is reference data stored as JSONB metadata, not relational data.
It can be updated without affecting core schema.

Usage:
    python scripts/seed_bootstrap_data.py [--dry-run] [--verify-only]
    
Options:
    --dry-run       Show what would be imported without actually importing
    --verify-only   Check if bootstrap data already exists, don't import
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from uuid import uuid4

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from sqlalchemy import text


BOOTSTRAP_FILE = "data/bootstrap_patterns.json"


def load_bootstrap_data() -> Dict[str, Any]:
    """Load bootstrap patterns from JSON file."""
    full_path = Path(__file__).parent.parent / BOOTSTRAP_FILE
    
    if not full_path.exists():
        raise FileNotFoundError(f"Bootstrap file not found: {full_path}")
    
    with open(full_path, 'r') as f:
        return json.load(f)


async def check_bootstrap_table_exists(session) -> bool:
    """Check if bootstrap_data table exists."""
    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'bootstrap_data'
        );
    """)
    result = await session.execute(query)
    return result.scalar()


async def create_bootstrap_table(session) -> bool:
    """Create bootstrap_data table if it doesn't exist."""
    try:
        # Create table
        create_table_sql = text("""
            CREATE TABLE IF NOT EXISTS bootstrap_data (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                data_type VARCHAR(50) NOT NULL,
                data_category VARCHAR(100),
                content JSONB NOT NULL,
                version VARCHAR(20) DEFAULT '1.0',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(data_type, data_category)
            )
        """)
        await session.execute(create_table_sql)
        
        # Create indexes separately
        create_index1_sql = text("""
            CREATE INDEX IF NOT EXISTS idx_bootstrap_data_type ON bootstrap_data(data_type)
        """)
        await session.execute(create_index1_sql)
        
        create_index2_sql = text("""
            CREATE INDEX IF NOT EXISTS idx_bootstrap_data_category ON bootstrap_data(data_category)
        """)
        await session.execute(create_index2_sql)
        
        await session.commit()
        print("  ✅ Created bootstrap_data table with indexes")
        return True
        
    except Exception as e:
        print(f"  ❌ ERROR creating table: {e}")
        await session.rollback()
        return False


async def insert_or_update_bootstrap_data(
    session,
    data_type: str,
    data_category: Optional[str],
    content: Dict[str, Any],
    version: str = "1.0",
    dry_run: bool = False
) -> tuple[bool, str]:
    """Insert or update bootstrap data record."""
    try:
        if dry_run:
            print(f"    🔍 DRY RUN: Would upsert {data_type}/{data_category or 'default'}")
            return True, "Dry run"
        
        # Upsert using ON CONFLICT
        upsert_sql = text("""
            INSERT INTO bootstrap_data (id, data_type, data_category, content, version)
            VALUES (:id, :data_type, :data_category, :content, :version)
            ON CONFLICT (data_type, data_category)
            DO UPDATE SET
                content = EXCLUDED.content,
                version = EXCLUDED.version,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
        """)
        
        result = await session.execute(
            upsert_sql,
            {
                "id": str(uuid4()),
                "data_type": data_type,
                "data_category": data_category,
                "content": json.dumps(content),
                "version": version
            }
        )
        
        record_id = result.scalar()
        action = "Updated" if record_id else "Inserted"
        print(f"    ✅ {action}: {data_type}/{data_category or 'default'}")
        return True, action
        
    except Exception as e:
        print(f"    ❌ ERROR: {e}")
        return False, str(e)


async def seed_bootstrap_patterns(
    session,
    data: Dict[str, Any],
    dry_run: bool = False
) -> tuple[int, int]:
    """
    Seed all bootstrap pattern data.
    
    Returns:
        tuple of (success_count, fail_count)
    """
    success_count = 0
    fail_count = 0
    
    print(f"\n{'='*60}")
    print("Seeding Strategy Effectiveness Ratings")
    print(f"{'='*60}")
    
    # Seed strategy effectiveness ratings
    ratings = data['strategy_effectiveness']['ratings']
    for rating in ratings:
        success, msg = await insert_or_update_bootstrap_data(
            session,
            data_type="strategy_effectiveness",
            data_category=rating['strategy_name'],
            content=rating,
            dry_run=dry_run
        )
        if success:
            success_count += 1
        else:
            fail_count += 1
    
    if not dry_run:
        await session.commit()
        print(f"  💾 Committed {len(ratings)} strategy ratings")
    
    print(f"\n{'='*60}")
    print("Seeding Path Templates")
    print(f"{'='*60}")
    
    # Seed path templates
    templates = data['path_templates']['templates']
    for template in templates:
        path_key = f"{template['from_emotion']} → {template['to_emotion']}"
        success, msg = await insert_or_update_bootstrap_data(
            session,
            data_type="path_template",
            data_category=path_key,
            content=template,
            dry_run=dry_run
        )
        if success:
            success_count += 1
        else:
            fail_count += 1
    
    if not dry_run:
        await session.commit()
        print(f"  💾 Committed {len(templates)} path templates")
    
    print(f"\n{'='*60}")
    print("Seeding Context Modifiers")
    print(f"{'='*60}")
    
    # Seed context modifiers (one record per modifier type)
    for modifier_type, modifier_data in data['context_modifiers'].items():
        if modifier_type in ['description', 'note']:
            continue
            
        success, msg = await insert_or_update_bootstrap_data(
            session,
            data_type="context_modifier",
            data_category=modifier_type,
            content=modifier_data,
            dry_run=dry_run
        )
        if success:
            success_count += 1
        else:
            fail_count += 1
    
    if not dry_run:
        await session.commit()
        print(f"  💾 Committed context modifiers")
    
    print(f"\n{'='*60}")
    print("Seeding Common Challenge Patterns")
    print(f"{'='*60}")
    
    # Seed common challenges
    challenges = data['common_challenges']['challenges']
    for challenge in challenges:
        success, msg = await insert_or_update_bootstrap_data(
            session,
            data_type="common_challenge",
            data_category=challenge['challenge_name'],
            content=challenge,
            dry_run=dry_run
        )
        if success:
            success_count += 1
        else:
            fail_count += 1
    
    if not dry_run:
        await session.commit()
        print(f"  💾 Committed {len(challenges)} challenge patterns")
    
    return success_count, fail_count


async def verify_bootstrap_data(session) -> Dict[str, Any]:
    """Verify bootstrap data was seeded correctly."""
    print(f"\n{'='*60}")
    print("VERIFICATION: Checking seeded bootstrap data")
    print(f"{'='*60}")
    
    try:
        # Count by data_type
        query = text("""
            SELECT data_type, COUNT(*) as count
            FROM bootstrap_data
            GROUP BY data_type
            ORDER BY data_type;
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        print("\nBootstrap data by type:")
        total = 0
        for row in rows:
            print(f"  {row[0]}: {row[1]}")
            total += row[1]
        
        print(f"\nTotal bootstrap records: {total}")
        
        # Get version info
        query = text("""
            SELECT DISTINCT version
            FROM bootstrap_data
            ORDER BY version;
        """)
        result = await session.execute(query)
        versions = [row[0] for row in result.fetchall()]
        
        print(f"Versions: {', '.join(versions)}")
        
        return {
            'total_records': total,
            'versions': versions
        }
        
    except Exception as e:
        print(f"\n⚠️  Could not verify bootstrap data: {e}")
        print("(Table may not exist yet)")
        return {}


async def main(dry_run: bool = False, verify_only: bool = False):
    """Main seeding function."""
    print("="*60)
    print("BOOTSTRAP PATTERN DATA SEEDING")
    print("="*60)
    print("\nPurpose: Provides cold-start data for new users")
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
    
    if verify_only:
        print("✓ VERIFY ONLY MODE - Just checking what exists")
    
    async with AsyncSessionLocal() as session:
        # Check if bootstrap_data table exists
        table_exists = await check_bootstrap_table_exists(session)
        
        print(f"\nBootstrap table exists: {table_exists}")
        
        if verify_only:
            await verify_bootstrap_data(session)
            return
        
        # Create table if it doesn't exist
        if not table_exists:
            print("\nCreating bootstrap_data table...")
            if not await create_bootstrap_table(session):
                print("❌ Failed to create table, exiting")
                return
        
        # Load bootstrap data
        print(f"\nLoading bootstrap patterns from {BOOTSTRAP_FILE}...")
        data = load_bootstrap_data()
        
        print(f"\nData loaded:")
        print(f"  Strategy ratings: {len(data['strategy_effectiveness']['ratings'])}")
        print(f"  Path templates: {len(data['path_templates']['templates'])}")
        print(f"  Context modifiers: {len([k for k in data['context_modifiers'].keys() if k not in ['description', 'note']])}")
        print(f"  Common challenges: {len(data['common_challenges']['challenges'])}")
        
        # Seed all bootstrap data
        success_count, fail_count = await seed_bootstrap_patterns(
            session,
            data,
            dry_run=dry_run
        )
        
        # Summary
        print(f"\n{'='*60}")
        print("SEEDING COMPLETE")
        print(f"{'='*60}")
        print(f"Records seeded successfully: {success_count}")
        print(f"Records failed: {fail_count}")
        print(f"Total processed: {success_count + fail_count}")
        
        if not dry_run and success_count > 0:
            # Verify
            await verify_bootstrap_data(session)
            
            print(f"\n{'='*60}")
            print("✅ SUCCESS: Bootstrap pattern data seeded!")
            print(f"{'='*60}")
            print("\nNext steps:")
            print("1. Verify bootstrap data: python scripts/seed_bootstrap_data.py --verify-only")
            print("2. Integrate with strategy recommender service")
            print("3. Test with new user (no history) scenarios")
            print("\nNOTE: Bootstrap data provides baseline recommendations for cold-start users.")
        else:
            print(f"\n🔍 Dry run complete. Run without --dry-run to actually seed.")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed bootstrap pattern data")
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show what would be imported without importing')
    parser.add_argument('--verify-only', action='store_true', 
                        help='Only verify existing bootstrap data')
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(
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
