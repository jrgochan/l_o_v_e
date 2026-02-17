#!/usr/bin/env python3
"""
Seed Enhanced Strategy Library

Imports 50 additional evidence-based strategies from JSON data files into the
transition_strategies table. This expands the strategy library from 20 to 70 total.

Categories being added:
- DBT Skills (10 strategies)
- ACT Techniques (8 strategies)
- Mindfulness (7 strategies)
- Somatic/Body-Based (8 strategies)
- Social Connection (6 strategies)
- Creative Expression (6 strategies)
- Meaning-Making (5 strategies)

Usage:
    python scripts/seed_enhanced_strategies.py [--dry-run] [--verify-only]

Options:
    --dry-run       Show what would be imported without actually importing
    --verify-only   Check if strategies already exist, don't import
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.transition_strategy import TransitionStrategy  # noqa: E402

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Strategy data file paths
STRATEGY_FILES = {
    "DBT Skills": "data/strategies/dbt_skills.json",
    "ACT Techniques": "data/strategies/act_techniques.json",
    "Mindfulness": "data/strategies/mindfulness.json",
    "Somatic": "data/strategies/somatic.json",
    "Social Connection": "data/strategies/social_connection.json",
    "Creative Expression": "data/strategies/creative_expression.json",
    "Meaning-Making": "data/strategies/meaning_making.json",
}


def load_strategy_data(filepath: str) -> Dict[str, Any]:
    """Load strategy data from JSON file."""
    full_path = Path(__file__).parent.parent / filepath

    if not full_path.exists():
        raise FileNotFoundError(f"Strategy file not found: {full_path}")

    with open(full_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def check_existing_strategies(session) -> Dict[str, int]:
    """Check how many strategies already exist by category."""
    stmt = select(TransitionStrategy)
    result = await session.execute(stmt)
    existing = result.scalars().all()

    # Count by extracting category from strategy names
    counts = {}
    for strategy in existing:
        # Simple heuristic: count all existing
        counts["existing_total"] = len(existing)

    return counts


async def strategy_exists(session, strategy_name: str) -> bool:
    """Check if a strategy with this name already exists."""
    stmt = select(TransitionStrategy).where(TransitionStrategy.strategy_name == strategy_name)
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def seed_strategies_from_file(
    session, category_name: str, filepath: str, dry_run: bool = False
) -> tuple[int, int]:
    """
    Seed strategies from a JSON file.

    Returns:
        tuple of (strategies_added, strategies_skipped)
    """
    print(f"\n{'='*60}")
    print(f"Processing: {category_name}")
    print(f"File: {filepath}")
    print(f"{'='*60}")

    # Load data
    data = load_strategy_data(filepath)
    strategies = data.get("strategies", [])

    print(f"Found {len(strategies)} strategies in file")

    added = 0
    skipped = 0

    for strategy_data in strategies:
        strategy_name = strategy_data["name"]

        # Check if already exists
        if await strategy_exists(session, strategy_name):
            print(f"  ⏭️  SKIP: '{strategy_name}' (already exists)")
            skipped += 1
            continue

        if dry_run:
            print(f"  🔍 DRY RUN: Would add '{strategy_name}'")
            added += 1
            continue

        # Create strategy object
        strategy = TransitionStrategy(
            strategy_name=strategy_data["name"],
            strategy_type=strategy_data["type"],
            description=strategy_data["description"],
            detailed_steps=strategy_data["steps"],
            time_required=strategy_data.get("time_required"),
            difficulty_level=strategy_data.get("difficulty"),
            evidence_level=strategy_data.get("evidence"),
            research_citations=strategy_data.get("citations", []),
            contraindications=strategy_data.get("contraindications"),
        )

        session.add(strategy)
        print(
            f"  ✅ ADD: '{strategy_name}' (difficulty: {strategy.difficulty_level}, evidence: {strategy.evidence_level})"
        )
        added += 1

    if not dry_run and added > 0:
        await session.commit()
        print(f"\n💾 Committed {added} new strategies from {category_name}")

    return added, skipped


async def verify_seeded_strategies(session) -> Dict[str, int]:
    """Verify all strategies were seeded correctly."""
    print(f"\n{'='*60}")
    print("VERIFICATION: Checking seeded strategies")
    print(f"{'='*60}")

    stmt = select(TransitionStrategy)
    result = await session.execute(stmt)
    all_strategies = result.scalars().all()

    print(f"\nTotal strategies in database: {len(all_strategies)}")

    # Group by evidence level
    by_evidence = {}
    for strategy in all_strategies:
        evidence = strategy.evidence_level or "unknown"
        by_evidence[evidence] = by_evidence.get(evidence, 0) + 1

    print("\nStrategies by evidence level:")
    for evidence, count in sorted(by_evidence.items()):
        print(f"  {evidence}: {count}")

    # Group by type
    by_type = {}
    for strategy in all_strategies:
        stype = strategy.strategy_type or "unknown"
        by_type[stype] = by_type.get(stype, 0) + 1

    print("\nStrategies by type:")
    for stype, count in sorted(by_type.items()):
        print(f"  {stype}: {count}")

    # Group by difficulty
    by_difficulty = {}
    for strategy in all_strategies:
        diff = strategy.difficulty_level or 0
        by_difficulty[diff] = by_difficulty.get(diff, 0) + 1

    print("\nStrategies by difficulty:")
    for diff, count in sorted(by_difficulty.items()):
        print(f"  Level {diff}: {count}")

    return {
        "total": len(all_strategies),
        "by_evidence": by_evidence,
        "by_type": by_type,
        "by_difficulty": by_difficulty,
    }


async def main(dry_run: bool = False, verify_only: bool = False):
    """Main seeding function."""
    print("=" * 60)
    print("ENHANCED STRATEGY LIBRARY SEEDING")
    print("=" * 60)

    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made")

    if verify_only:
        print("\n✓ VERIFY ONLY MODE - Just checking what exists")

    async with AsyncSessionLocal() as session:
        # Check existing
        existing = await check_existing_strategies(session)
        print(f"\nCurrent database status:")
        print(f"  Existing strategies: {existing.get('existing_total', 0)}")

        if verify_only:
            await verify_seeded_strategies(session)
            return

        # Process each category
        total_added = 0
        total_skipped = 0

        for category_name, filepath in STRATEGY_FILES.items():
            try:
                added, skipped = await seed_strategies_from_file(
                    session, category_name, filepath, dry_run=dry_run
                )
                total_added += added
                total_skipped += skipped

            except FileNotFoundError as e:
                print(f"  ❌ ERROR: {e}")
                continue
            except Exception as e:
                print(f"  ❌ ERROR processing {category_name}: {e}")
                import traceback as tb

                tb.print_exc()
                continue

        # Summary
        print(f"\n{'='*60}")
        print("SEEDING COMPLETE")
        print(f"{'='*60}")
        print(f"Strategies added: {total_added}")
        print(f"Strategies skipped (already exist): {total_skipped}")
        print(f"Total processed: {total_added + total_skipped}")

        if not dry_run:
            # Verify
            await verify_seeded_strategies(session)

            print(f"\n{'='*60}")
            print("✅ SUCCESS: Enhanced strategy library seeded!")
            print(f"{'='*60}")
            print("\nNext steps:")
            print("1. Verify strategies: python scripts/seed_enhanced_strategies.py --verify-only")
            print("2. Test with transition system: python test_transition_api.py")
            print("3. Proceed to Phase 2: Expanded transition patterns")
        else:
            print(f"\n🔍 Dry run complete. Run without --dry-run to actually seed.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed enhanced strategy library")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be imported without importing",
    )
    parser.add_argument(
        "--verify-only", action="store_true", help="Only verify existing strategies"
    )

    args = parser.parse_args()

    try:
        asyncio.run(main(dry_run=args.dry_run, verify_only=args.verify_only))
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
