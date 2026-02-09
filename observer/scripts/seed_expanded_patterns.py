#!/usr/bin/env python3
"""
Seed Expanded Transition Patterns

Imports 13 additional transition patterns from JSON data files into the
transition_patterns table. This expands the pattern library from 5 to 18 total.

Categories being added:
- Trauma Processing (3 patterns)
- Grief Integration (3 patterns)
- Anxiety Regulation (3 patterns)
- Shame Resilience (2 patterns)
- Joy Cultivation (2 patterns)

Usage:
    python scripts/seed_expanded_patterns.py [--dry-run] [--verify-only]

Options:
    --dry-run       Show what would be imported without actually importing
    --verify-only   Check if patterns already exist, don't import
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.transition_strategy import TransitionPattern  # noqa: E402
from sqlalchemy import select  # noqa: E402

# Pattern data file paths
PATTERN_FILES = {
    "Trauma Processing": "data/patterns/trauma_processing.json",
    "Grief Integration": "data/patterns/grief_integration.json",
    "Anxiety Regulation": "data/patterns/anxiety_regulation.json",
    "Shame Resilience": "data/patterns/shame_resilience.json",
    "Joy Cultivation": "data/patterns/joy_cultivation.json",
}


def load_pattern_data(filepath: str) -> Dict[str, Any]:
    """Load pattern data from JSON file."""
    full_path = Path(__file__).parent.parent / filepath

    if not full_path.exists():
        raise FileNotFoundError(f"Pattern file not found: {full_path}")

    with open(full_path, "r") as f:
        return json.load(f)


async def check_existing_patterns(session) -> Dict[str, int]:
    """Check how many patterns already exist."""
    stmt = select(TransitionPattern)
    result = await session.execute(stmt)
    existing = result.scalars().all()

    return {"existing_total": len(existing)}


async def pattern_exists(session, pattern_name: str) -> bool:
    """Check if a pattern with this name already exists."""
    stmt = select(TransitionPattern).where(
        TransitionPattern.pattern_name == pattern_name
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def seed_patterns_from_file(
    session, category_name: str, filepath: str, dry_run: bool = False
) -> tuple[int, int]:
    """
    Seed patterns from a JSON file.

    Returns:
        tuple of (patterns_added, patterns_skipped)
    """
    print(f"\n{'='*60}")
    print(f"Processing: {category_name}")
    print(f"File: {filepath}")
    print(f"{'='*60}")

    # Load data
    data = load_pattern_data(filepath)
    patterns = data.get("patterns", [])

    print(f"Found {len(patterns)} patterns in file")

    added = 0
    skipped = 0

    for pattern_data in patterns:
        pattern_name = pattern_data["name"]

        # Check if already exists
        if await pattern_exists(session, pattern_name):
            print(f"  ⏭️  SKIP: '{pattern_name}' (already exists)")
            skipped += 1
            continue

        if dry_run:
            print(f"  🔍 DRY RUN: Would add '{pattern_name}'")
            added += 1
            continue

        # Create pattern object
        pattern = TransitionPattern(
            pattern_name=pattern_data["name"],
            from_category=pattern_data["from_category"],
            to_category=pattern_data["to_category"],
            vac_change_characteristics=pattern_data["vac_change_characteristics"],
            difficulty_score=pattern_data["difficulty_score"],
            psychological_reasoning=pattern_data["psychological_reasoning"],
            example_transitions=pattern_data["example_transitions"],
        )

        session.add(pattern)
        print(
            f"  ✅ ADD: '{pattern_name}' (difficulty: {pattern.difficulty_score:.1f})"
        )
        added += 1

    if not dry_run and added > 0:
        await session.commit()
        print(f"\n💾 Committed {added} new patterns from {category_name}")

    return added, skipped


async def verify_seeded_patterns(session) -> Dict[str, int]:
    """Verify all patterns were seeded correctly."""
    print(f"\n{'='*60}")
    print("VERIFICATION: Checking seeded patterns")
    print(f"{'='*60}")

    stmt = select(TransitionPattern)
    result = await session.execute(stmt)
    all_patterns = result.scalars().all()

    print(f"\nTotal patterns in database: {len(all_patterns)}")

    # Group by from_category
    by_from_cat = {}
    for pattern in all_patterns:
        cat = pattern.from_category
        by_from_cat[cat] = by_from_cat.get(cat, 0) + 1

    print("\nPatterns by source category:")
    for cat, count in sorted(by_from_cat.items()):
        print(f"  {cat[:50]}...: {count}")

    # Group by difficulty
    by_difficulty = {"easy": 0, "moderate": 0, "difficult": 0, "very_difficult": 0}
    for pattern in all_patterns:
        diff = pattern.difficulty_score
        if diff < 0.3:
            by_difficulty["easy"] += 1
        elif diff < 0.6:
            by_difficulty["moderate"] += 1
        elif diff < 0.8:
            by_difficulty["difficult"] += 1
        else:
            by_difficulty["very_difficult"] += 1

    print("\nPatterns by difficulty:")
    print(f"  Easy (< 0.3): {by_difficulty['easy']}")
    print(f"  Moderate (0.3-0.6): {by_difficulty['moderate']}")
    print(f"  Difficult (0.6-0.8): {by_difficulty['difficult']}")
    print(f"  Very Difficult (>= 0.8): {by_difficulty['very_difficult']}")

    return {
        "total": len(all_patterns),
        "by_from_category": by_from_cat,
        "by_difficulty": by_difficulty,
    }


async def main(dry_run: bool = False, verify_only: bool = False):
    """Main seeding function."""
    print("=" * 60)
    print("EXPANDED TRANSITION PATTERNS SEEDING")
    print("=" * 60)

    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made")

    if verify_only:
        print("\n✓ VERIFY ONLY MODE - Just checking what exists")

    async with AsyncSessionLocal() as session:
        # Check existing
        existing = await check_existing_patterns(session)
        print("\nCurrent database status:")
        print(f"  Existing patterns: {existing.get('existing_total', 0)}")

        if verify_only:
            await verify_seeded_patterns(session)
            return

        # Process each category
        total_added = 0
        total_skipped = 0

        for category_name, filepath in PATTERN_FILES.items():
            try:
                added, skipped = await seed_patterns_from_file(
                    session, category_name, filepath, dry_run=dry_run
                )
                total_added += added
                total_skipped += skipped

            except FileNotFoundError as e:
                print(f"  ❌ ERROR: {e}")
                continue
            except Exception as e:
                print(f"  ❌ ERROR processing {category_name}: {e}")
                import traceback

                traceback.print_exc()
                continue

        # Summary
        print(f"\n{'='*60}")
        print("SEEDING COMPLETE")
        print(f"{'='*60}")
        print(f"Patterns added: {total_added}")
        print(f"Patterns skipped (already exist): {total_skipped}")
        print(f"Total processed: {total_added + total_skipped}")

        if not dry_run:
            # Verify
            await verify_seeded_patterns(session)

            print(f"\n{'='*60}")
            print("✅ SUCCESS: Expanded pattern library seeded!")
            print(f"{'='*60}")
            print("\nNext steps:")
            print(
                "1. Verify patterns: python scripts/seed_expanded_patterns.py --verify-only"
            )
            print("2. Map patterns to strategies (Phase 4)")
            print("3. Proceed to Phase 3: Bridge emotion system")
        else:
            print("\n🔍 Dry run complete. Run without --dry-run to actually seed.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed expanded pattern library")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be imported without importing",
    )
    parser.add_argument(
        "--verify-only", action="store_true", help="Only verify existing patterns"
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
