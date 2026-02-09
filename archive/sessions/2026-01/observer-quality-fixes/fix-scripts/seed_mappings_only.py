"""
Quick script to seed only the pattern-strategy mappings.
Run this after patterns and strategies are already seeded.
"""

import asyncio

from app.config import settings
from app.models.transition_strategy import PatternStrategy, TransitionPattern, TransitionStrategy
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


async def seed_mappings():
    """Seed pattern-strategy mappings only."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # Get all patterns and strategies
        patterns_stmt = select(TransitionPattern)
        strategies_stmt = select(TransitionStrategy)

        patterns_result = await session.execute(patterns_stmt)
        strategies_result = await session.execute(strategies_stmt)

        patterns = {p.pattern_name: p for p in patterns_result.scalars().all()}
        strategies = {s.strategy_name: s for s in strategies_result.scalars().all()}

        print(f"Found {len(patterns)} patterns and {len(strategies)} strategies")

        # Define mappings: pattern_name -> [(strategy_name, order, effectiveness)]
        mappings = {
            "High Arousal to Low Arousal": [
                ("4-7-8 Breathing Technique", 1, 4.5),
                ("5-4-3-2-1 Grounding Technique", 2, 4.3),
                ("Progressive Muscle Relaxation", 3, 4.2),
                ("TIPP Skills for Crisis", 4, 4.4),
                ("Mindfulness Meditation (Basic)", 5, 4.0),
            ],
            "Negative Connection to Positive Connection": [
                ("Self-Compassion Break (Kristin Neff)", 1, 4.6),
                ("Shame Resilience: Speak Shame", 2, 4.5),
                ("Values Clarification Exercise", 3, 4.2),
                ("Perspective-Taking: Friend's Advice", 4, 4.0),
            ],
            "Social Disconnection to Connection": [
                ("Reach Out: Text or Call", 1, 4.3),
                ("Join or Attend Community Activity", 2, 4.1),
                ("Self-Compassion Break (Kristin Neff)", 3, 4.2),
            ],
            "High Negative Valence to Acceptance": [
                ("Radical Acceptance (DBT)", 1, 4.4),
                ("Cognitive Reappraisal: Probability Estimation", 2, 4.2),
                ("Expressive Writing (Pennebaker Method)", 3, 4.1),
                ("Intense Physical Exercise", 4, 4.0),
            ],
            "Overwhelm to Regulated State": [
                ("Task Chunking and Prioritization", 1, 4.5),
                ("Permission to Say No / Set Boundaries", 2, 4.3),
                ("TIPP Skills for Crisis", 3, 4.4),
                ("4-7-8 Breathing Technique", 4, 4.2),
                ("Progressive Muscle Relaxation", 5, 4.1),
            ],
        }

        # Create mappings
        count = 0
        for pattern_name, strategy_mappings in mappings.items():
            pattern = patterns.get(pattern_name)
            if not pattern:
                print(f"  ⚠️  Pattern not found: {pattern_name}")
                continue

            for strategy_name, order, effectiveness in strategy_mappings:
                strategy = strategies.get(strategy_name)
                if not strategy:
                    print(f"  ⚠️  Strategy not found: {strategy_name}")
                    continue

                mapping = PatternStrategy(
                    pattern_id=pattern.id,
                    strategy_id=strategy.id,
                    recommendation_order=order,
                    effectiveness_rating=effectiveness,
                    applicability_conditions=None,
                )
                session.add(mapping)
                count += 1

        await session.commit()
        print(f"✅ Seeded {count} pattern-strategy mappings")

    await engine.dispose()


if __name__ == "__main__":
    print("Seeding pattern-strategy mappings...")
    asyncio.run(seed_mappings())
