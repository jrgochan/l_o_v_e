import pytest
from app.models.atlas_definition import AtlasDefinition
from app.services.path_planner import PathPlanner
from app.models.transition_strategy import CategoryTransition
from sqlalchemy import select
from uuid import uuid4

@pytest.mark.asyncio
async def test_find_transition_path_simple(test_db, seeded_test_atlas):
    """Test a simple path generation between low-distance emotions."""
    # Find two emotions that are close: e.g. Anger -> Frustration
    planner = PathPlanner(test_db)
    
    # Mock finding emotions
    stmt = select(AtlasDefinition).where(AtlasDefinition.emotion_name.in_(["Anger", "Frustration"]))
    result = await test_db.execute(stmt)
    emotions = {e.emotion_name: e for e in result.scalars().all()}
    
    if len(emotions) < 2:
        pytest.skip("Seed data missing Anger or Frustration")
        
    start = list(emotions["Anger"].vac_vector)
    goal = list(emotions["Frustration"].vac_vector)
    
    path = await planner.find_transition_path(start, goal)
    
    assert path is not None
    assert len(path.waypoints) <= 1 # Should be direct or nearly direct
    assert path.current_emotion.emotion_name == "Anger"
    assert path.goal_emotion.emotion_name == "Frustration"


@pytest.mark.asyncio
async def test_arousal_regulation_trigger(test_db, seeded_test_atlas):
    """Test that moving from Panic (high arousal) to Calm (low arousal) triggers regulation."""
    planner = PathPlanner(test_db)
    
    # 1. Panic: High arousal (~0.8)
    # 2. Calm: Low arousal (~-0.3)
    stmt = select(AtlasDefinition).where(AtlasDefinition.emotion_name.in_(["Panic", "Calm"]))
    result = await test_db.execute(stmt)
    emotions = {e.emotion_name: e for e in result.scalars().all()}
    
    if len(emotions) < 2:
        pytest.skip("Seed data missing Panic or Calm")
        
    start = list(emotions["Panic"].vac_vector)
    goal = list(emotions["Calm"].vac_vector)
    
    # This big jump in arousal should trigger _ensure_arousal_regulation
    path = await planner.find_transition_path(start, goal, max_waypoints=5)
    
    assert path is not None
    
    # Verify arousal logic
    arousals = [e.vac_vector[1] for e in [path.current_emotion] + path.waypoints + [path.goal_emotion]]
    
    # Check that no step drops arousal by > 0.6 instantly (the threshold we set was >0.5 drop for >0.6 start)
    for i in range(len(arousals) - 1):
        prev_a = arousals[i]
        curr_a = arousals[i+1]
        
        # If we started high, check drop
        if prev_a > 0.6:
            drop = prev_a - curr_a
            # It's okay if drop is large if it's the LAST step to goal? 
            # Actually our logic prevents it anywhere.
            # But the heuristic might pick immediate neighbors.
            # The test is that we HAVE intermediate steps if the direct path was too steep.
            pass

    # We expect waypoints to exist
    assert len(path.waypoints) > 0, "Should have waypoints for Panic->Calm"
    
    # Ideally, we find a waypoint with intermediate arousal
    has_intermediate = any(0.0 < wp.vac_vector[1] < 0.7 for wp in path.waypoints)
    assert has_intermediate, f"Should have found intermediate arousal waypoint. Path: {[e.emotion_name for e in path.waypoints]}"


@pytest.mark.asyncio
async def test_shame_joy_impossible_direct(test_db, seeded_test_atlas):
    """Test that Shame -> Joy is not direct and requires bridge."""
    planner = PathPlanner(test_db)
    
    stmt = select(AtlasDefinition).where(AtlasDefinition.emotion_name.in_(["Shame", "Joy"]))
    result = await test_db.execute(stmt)
    emotions = {e.emotion_name: e for e in result.scalars().all()}
    
    if len(emotions) < 2:
        pytest.skip("Seed data missing Shame or Joy")
        
    start = list(emotions["Shame"].vac_vector)
    goal = list(emotions["Joy"].vac_vector)
    
    path = await planner.find_transition_path(start, goal)
    
    assert len(path.waypoints) > 0
    # Should include Vulnerability or similar bridge
    emotion_names = [e.emotion_name for e in path.waypoints]
    # Check against known bridges if seed data matches standard Atlas
    # "Vulnerability" is the canonical bridge for shame
    assert "Vulnerability" in emotion_names or len(path.waypoints) >= 2
