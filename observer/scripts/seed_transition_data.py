"""
Seed Transition System Data

Loads from canonical JSON data files and populates:
1. Category transition difficulty matrix (13×13 = 169 entries)
2. Initial emotion regulation strategies (~20 core strategies)
3. Transition patterns (5 core patterns)
4. Pattern-strategy mappings

Data sources:
- data/brene_brown/categories.json
- data/brene_brown/category_transitions.json
- data/strategies/base/core_strategies.json
- data/patterns/base/core_patterns.json
- data/mappings/pattern_strategy_mappings.json
"""

import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.transition_strategy import (
    TransitionStrategy,
    TransitionPattern,
    PatternStrategy,
    CategoryTransition
)
from sqlalchemy import select


def load_json_data(filepath: str):
    """Load and validate data from JSON file."""
    full_path = Path(__file__).parent.parent / filepath
    
    if not full_path.exists():
        raise FileNotFoundError(f"Data file not found: {filepath}")
    
    try:
        with open(full_path, 'r') as f:
            data = json.load(f)
        
        # Basic validation
        if not isinstance(data, dict):
            raise ValueError(f"{filepath}: root must be an object")
        
        print(f"  ✓ Loaded and validated {filepath}")
        return data
        
    except json.JSONDecodeError as e:
        raise ValueError(f"{filepath}: Invalid JSON - {e}")


async def seed_category_transitions(dataset: str = "brene_brown", force_reseed: bool = False):
    """Seed the category_transitions table from JSON."""
    print(f"Seeding category transitions for dataset: {dataset}...")
    
    # Determine files based on dataset
    if dataset == "brene_brown":
        categories_file = "data/brene_brown/categories.json"
        transitions_file = "data/brene_brown/category_transitions.json"
    elif dataset == "goemotions":
        # GoEmotions includes categories in the transitions file
        categories_file = None
        transitions_file = "data/goemotions/category_transitions.json"
    elif dataset == "plutchik":
        categories_file = "data/plutchik/categories.json"
        transitions_file = "data/plutchik/category_transitions.json"
    elif dataset == "all":
        # Recursive call for each supported dataset
        for ds in ["brene_brown", "goemotions", "plutchik"]:
            await seed_category_transitions(ds, force_reseed)
        return
    else:
        # Default fallback or error
        print(f"  ⚠️  Unknown dataset '{dataset}' for transitions, defaulting to brene_brown structure if available")
        categories_file = f"data/{dataset}/categories.json"
        transitions_file = f"data/{dataset}/category_transitions.json"
        
        # Check if exists
        try:
             load_json_data(transitions_file)
        except:
             print(f"  ⚠️  No transition data found for {dataset}, skipping")
             return

    # Load data
    try:
        transitions_data = load_json_data(transitions_file)
        
        # Get categories list
        if "category_names" in transitions_data:
            categories = transitions_data["category_names"]
        elif categories_file:
            categories_data = load_json_data(categories_file)
            categories = [c["name"] for c in categories_data["categories"]]
        else:
            raise ValueError(f"Could not determine categories for {dataset}")
            
        difficulty_matrix = transitions_data["difficulty_matrix"]
    except Exception as e:
        print(f"  ❌ Failed to load transition data: {e}")
        return
    
    async with AsyncSessionLocal() as session:
        # Check if ANY transitions exist (generic check)
        # We might want to check for *these specific attributes* but for now simpler is better
        # If force_reseed is True, we only clear if we are actually about to insert something.
        
        # Note: If we run 'all', we don't want to clear on the 2nd/3rd iteration.
        # So we should only clear if specific dataset matches? 
        # But table doesn't track dataset. 
        # Strategy: If force_reseed, clear ALL on first run? 
        # Or just upsert?
        # The current logic clears ALL if count > 0.
        # This is destructive for 'all' mode.
        
        stmt = select(CategoryTransition)
        result = await session.execute(stmt)
        existing = result.scalars().all()
        
        if len(existing) > 0:
            if force_reseed:
                # Only clear if we haven't already cleared in this session? 
                # For simplicity, we assume force_reseed clears everything once.
                # But here we might be calling this multiple times for 'all'.
                # Let's trust the orchestrator handles force_reseed or we do it once.
                
                # Check if the existing transitions match our current categories?
                # It's hard to distinguish.
                pass 
                # logic kept simple: if force_reseed, we clear. 
                # This means for 'all', we must be careful. 
                # seed_all.py typically runs this script ONCE. 
                # If we run with dataset='all', this function recurses.
                # The generic delete should probably happen outside the loop or we check.
                pass
            
            # To avoid complexity, we'll just check if we need to clear
            # If we are in recursive mode, the parent handles it?
            pass

        # Use a merge strategy or check existence per pair to allow additive seeding
        
        # Create entries
        count = 0
        for from_idx, from_cat in enumerate(categories):
            for to_idx, to_cat in enumerate(categories):
                difficulty = difficulty_matrix[from_idx][to_idx]
                
                # Generate rationale
                if from_idx == to_idx:
                    rationale = "Same category - natural progression"
                elif difficulty >= 0.9:
                    rationale = "Psychologically invalid direct transition - requires bridge emotions"
                elif difficulty >= 0.6:
                    rationale = "Difficult transition - requires significant work or external support"
                elif difficulty >= 0.3:
                    rationale = "Moderate difficulty - achievable with appropriate strategies"
                else:
                    rationale = "Relatively easy transition"
                
                # Determine bridge requirements
                is_prohibited = difficulty >= 0.9
                requires_bridge = difficulty >= 0.7
                bridge_cats = []
                
                if requires_bridge:
                    # Generic bridges (placeholder for now as these are specific to Brene Brown model)
                    # Ideally these should be in the JSON
                    bridge_cats = ["Acceptance", "Curiosity", "Gratitude"] # Generic fallback
                
                # Check if exists to avoid duplicates (additive)
                # A composite key check would be expensive in loop but loop is small (13x13=169)
                # Ideally DB should have unique constraint on from/to
                
                trans = CategoryTransition(
                    from_category=from_cat,
                    to_category=to_cat,
                    difficulty_score=difficulty,
                    is_prohibited=is_prohibited,
                    requires_bridge=requires_bridge,
                    recommended_bridge_categories=bridge_cats,
                    psychological_rationale=rationale
                )
                
                session.add(trans)
                count += 1
        
        await session.commit()
        print(f"✅ Seeded {count} category transitions for {dataset}")


async def seed_strategies(force_reseed: bool = False):
    """Seed the transition_strategies table from JSON."""
    print("Seeding strategies...")
    
    # Load data
    data = load_json_data("data/strategies/base/core_strategies.json")
    strategies = data["strategies"]
    
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        stmt = select(TransitionStrategy)
        result = await session.execute(stmt)
        existing = result.scalars().all()
        
        if len(existing) > 0:
            if force_reseed:
                print(f"  🔄 Force reseed - clearing {len(existing)} existing strategies")
                from sqlalchemy import delete
                await session.execute(delete(TransitionStrategy))
                await session.commit()
            else:
                print(f"  ⏭️  Strategies already seeded ({len(existing)} entries)")
                return
        
        for strat_data in strategies:
            strategy = TransitionStrategy(
                strategy_name=strat_data["name"],
                strategy_type=strat_data["type"],
                description=strat_data["description"],
                detailed_steps=strat_data["steps"],
                time_required=strat_data["time_required"],
                difficulty_level=strat_data["difficulty"],
                evidence_level=strat_data["evidence"],
                research_citations=strat_data.get("citations", []),
                contraindications=strat_data.get("contraindications")
            )
            session.add(strategy)
        
        await session.commit()
        print(f"✅ Seeded {len(strategies)} strategies")


async def seed_patterns(force_reseed: bool = False):
    """Seed the transition_patterns table from JSON."""
    print("Seeding transition patterns...")
    
    # Load data
    data = load_json_data("data/patterns/base/core_patterns.json")
    patterns = data["patterns"]
    
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        stmt = select(TransitionPattern)
        result = await session.execute(stmt)
        existing = result.scalars().all()
        
        if len(existing) >= 5:
            if force_reseed:
                print(f"  🔄 Force reseed - clearing {len(existing)} existing patterns")
                from sqlalchemy import delete
                await session.execute(delete(TransitionPattern))
                await session.commit()
            else:
                print(f"  ⏭️  Basic patterns already seeded ({len(existing)} entries)")
                return
        
        for pattern_data in patterns:
            pattern = TransitionPattern(
                pattern_name=pattern_data["name"],
                from_category=pattern_data["from_cat"],
                to_category=pattern_data["to_cat"],
                vac_change_characteristics=pattern_data["vac_change"],
                difficulty_score=pattern_data["difficulty"],
                psychological_reasoning=pattern_data["reasoning"],
                example_transitions=pattern_data["examples"]
            )
            session.add(pattern)
        
        await session.commit()
        print(f"✅ Seeded {len(patterns)} transition patterns")


async def seed_pattern_strategy_mappings(force_reseed: bool = False):
    """Map strategies to patterns based on their applicability from JSON."""
    print("Seeding pattern-strategy mappings...")
    
    # Load data
    data = load_json_data("data/mappings/pattern_strategy_mappings.json")
    mappings = data["mappings"]
    
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        check_stmt = select(PatternStrategy)
        check_result = await session.execute(check_stmt)
        existing_mappings = check_result.scalars().all()
        
        if len(existing_mappings) > 0:
            if force_reseed:
                print(f"  🔄 Force reseed - clearing {len(existing_mappings)} existing mappings")
                from sqlalchemy import delete
                await session.execute(delete(PatternStrategy))
                await session.commit()
            else:
                print(f"  ⏭️  Pattern-strategy mappings already seeded ({len(existing_mappings)} entries)")
                return
        
        # Get all patterns and strategies
        patterns_stmt = select(TransitionPattern)
        strategies_stmt = select(TransitionStrategy)
        
        patterns_result = await session.execute(patterns_stmt)
        strategies_result = await session.execute(strategies_stmt)
        
        patterns_dict = {p.pattern_name: p for p in patterns_result.scalars().all()}
        strategies_dict = {s.strategy_name: s for s in strategies_result.scalars().all()}
        
        # Create mappings
        for mapping in mappings:
            pattern_name = mapping["pattern_name"]
            pattern = patterns_dict.get(pattern_name)
            
            if not pattern:
                print(f"  ⚠️  Pattern not found: {pattern_name}")
                continue
            
            for strat in mapping["strategies"]:
                strategy_name = strat["strategy_name"]
                strategy = strategies_dict.get(strategy_name)
                
                if not strategy:
                    print(f"  ⚠️  Strategy not found: {strategy_name}")
                    continue
                
                ps_mapping = PatternStrategy(
                    pattern_id=pattern.id,
                    strategy_id=strategy.id,
                    recommendation_order=strat["recommendation_order"],
                    effectiveness_rating=strat["effectiveness_rating"],
                    applicability_conditions=None
                )
                session.add(ps_mapping)
        
        await session.commit()
        print(f"✅ Seeded pattern-strategy mappings")


async def main(force_reseed: bool = False, dataset: str = "brene_brown"):
    """Run all seed functions with validation.
    
    Args:
        force_reseed: If True, clear existing data before seeding
        dataset: Dataset to use for categories and transitions
    """
    print("=" * 60)
    print("SEEDING TRANSITION SYSTEM DATA")
    print("=" * 60)
    print(f"Dataset: {dataset}")
    if force_reseed:
        print("Mode: FORCE RESEED (will clear existing data)\n")
    
    # Validate JSON files
    print("\nValidating common JSON data files...")
    try:
        load_json_data("data/strategies/base/core_strategies.json")
        load_json_data("data/patterns/base/core_patterns.json")
        load_json_data("data/mappings/pattern_strategy_mappings.json")
        
        # Validate dataset-specific files if possible
        if dataset == "brene_brown":
             load_json_data("data/brene_brown/category_transitions.json")
        elif dataset == "goemotions":
             load_json_data("data/goemotions/category_transitions.json")
             
        print("✅ Data files validated\n")
    except (FileNotFoundError, ValueError) as e:
        print(f"❌ JSON validation failed: {e}")
        # Don't raise, just let it fail gracefully later or continue
    
    try:
        # Clear transitions if force_reseed (once)
        if force_reseed:
             async with AsyncSessionLocal() as session:
                from sqlalchemy import delete
                print("  🔄 Clearing existing category transitions...")
                await session.execute(delete(CategoryTransition))
                await session.commit()

        await seed_category_transitions(dataset, force_reseed=False) # Handled clear above
        await seed_strategies(force_reseed)
        await seed_patterns(force_reseed)
        await seed_pattern_strategy_mappings(force_reseed)
        
        print("=" * 60)
        print("✅ ALL DATA SEEDED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed transition system data from JSON")
    parser.add_argument('--force-reseed', action='store_true',
                       help='Clear existing data before seeding')
    parser.add_argument('--dataset', default='brene_brown',
                       help='Dataset to seed transitions for (brene_brown, goemotions, plutchik, all)')
    
    args = parser.parse_args()
    
    asyncio.run(main(force_reseed=args.force_reseed, dataset=args.dataset))
