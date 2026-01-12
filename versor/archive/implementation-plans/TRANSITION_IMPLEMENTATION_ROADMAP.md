# Emotional State Transition System - Implementation Roadmap

## 🎯 Project Status

**Phase**: Foundation Complete → Ready for Backend Implementation

**Documentation Created**:
- ✅ `observer/TRANSITION_SYSTEM_DESIGN.md` - Complete technical specification
- ✅ `observer/CATEGORY_GRAPH.md` - Psychological transition rules
- ✅ `observer/migrations/versions/add_transition_system_tables.sql` - Database schema
- ✅ `observer/app/models/transition_strategy.py` - SQLAlchemy models

## 📋 Implementation Phases

### Phase 1: Database & Models ✅ COMPLETE

**Status**: Foundation Ready

**Completed**:
1. Database schema with 7 tables + 3 views + 2 functions + 2 triggers
2. Python SQLAlchemy models for all tables
3. Indexes for query optimization
4. Analytics views for success tracking

**Next Step**: Run migration to create tables

```bash
cd observer
# Run the SQL migration
psql -U postgres -d observer_db -f migrations/versions/add_transition_system_tables.sql
```

### Phase 2: Backend Services (Observer)

**Priority**: HIGH - Core path planning logic

#### 2.1 Path Planner Service

**File**: `observer/app/services/path_planner.py`

**Key Classes**:
```python
class PathPlanner:
    """Category-aware A* pathfinding for emotional transitions."""
    
    async def find_transition_path(
        current_vac, 
        goal_vac, 
        max_waypoints=3, 
        user_id=None
    ) -> TransitionPath
    
    async def _astar_search(...) -> List[AtlasDefinition]
    
    def _calculate_g_cost(...) -> float
    
    def _heuristic_cost(...) -> float
    
    async def _get_valid_neighbors(...) -> List[AtlasDefinition]
```

**Implementation Tasks**:
- [ ] Create `path_planner.py` with A* algorithm
- [ ] Implement category transition difficulty matrix lookup
- [ ] Add user history integration for personalized paths
- [ ] Implement bridge emotion detection (Vulnerability, Awe, etc.)
- [ ] Add path validation (arousal regulation, connection building)

**Test Cases**:
- [ ] Anxiety → Calm (should route through Worry)
- [ ] Shame → Joy (MUST include Vulnerability waypoint)
- [ ] Loneliness → Connection (via Vulnerability)
- [ ] Verify prohibited transitions are blocked (Shame → Joy direct)

#### 2.2 Strategy Recommendation Engine

**File**: `observer/app/services/strategy_recommender.py`

**Key Classes**:
```python
class StrategyRecommender:
    """Recommends strategies based on transition patterns."""
    
    async def get_strategies_for_transition(
        from_emotion,
        to_emotion,
        user_id=None
    ) -> List[Strategy]
    
    async def get_personalized_strategies(
        user_id,
        pattern_name
    ) -> List[Strategy]
```

**Implementation Tasks**:
- [ ] Pattern matching algorithm (from emotion pair to pattern)
- [ ] Strategy retrieval with effectiveness ratings
- [ ] User history filtering (boost strategies that worked before)
- [ ] Context-aware filtering (time of day, energy level)

#### 2.3 API Routes

**File**: `observer/app/api/routes/transitions.py`

**Endpoints to Create**:

1. **POST `/observer/transition-path`**
   - Generate optimal path from current to goal
   - Return waypoints with strategies
   - Include visualization data (quaternions)

2. **POST `/observer/journey/start`**
   - Begin tracking a journey
   - Store context metadata

3. **POST `/observer/journey/{id}/waypoint-reached`**
   - Mark waypoint reached
   - Validate emotional state
   - Auto-complete journey if last waypoint

4. **GET `/observer/journey/{id}`**
   - Get current journey status

5. **GET `/observer/user/{id}/journey-history`**
   - Get past journeys for analytics

6. **GET `/observer/user/{id}/effective-strategies`**
   - Get user's top-rated strategies

**Implementation Tasks**:
- [ ] Create transition router
- [ ] Implement all 6 endpoints
- [ ] Add request/response schemas (Pydantic)
- [ ] Add error handling and validation
- [ ] Write integration tests

#### 2.4 Database Seed Data

**File**: `observer/scripts/seed_transition_data.py`

**Data to Seed**:
1. **Category Transitions** (13×13 = 169 entries)
   - Difficulty scores from CATEGORY_GRAPH.md
   - Psychological rationale
   - Bridge recommendations

2. **Initial Strategies** (Start with ~20)
   - 4-7-8 Breathing
   - 5-4-3-2-1 Grounding
   - Progressive Muscle Relaxation
   - Cognitive Reappraisal templates
   - Self-Compassion meditation
   - Expressive writing
   - Physical exercise recommendations
   - Social connection strategies

3. **Transition Patterns** (5 core patterns)
   - High Arousal → Low Arousal
   - Negative Connection → Positive Connection
   - Social Disconnection → Connection
   - High Negative Valence → Acceptance
   - Overwhelm → Regulated State

**Implementation Tasks**:
- [ ] Create seed script
- [ ] Add all 169 category transitions
- [ ] Add initial 20 strategies with detailed steps
- [ ] Map strategies to patterns
- [ ] Run seed script

### Phase 3: Versor Extensions

**File**: `versor/app/api/routes/multi_slerp.py`

**New Endpoint**: **POST `/versor/multi-point-path`**

**Request**:
```json
{
  "waypoints": [
    {"vac": [-0.5, 0.7, -0.4]},
    {"vac": [-0.4, 0.5, -0.3]},
    {"vac": [0.6, -0.5, 0.5]},
    {"vac": [0.5, -0.7, 0.4]}
  ],
  "steps_per_segment": 60
}
```

**Response**:
```json
{
  "segments": [
    {"from_index": 0, "to_index": 1, "path": [...]},
    {"from_index": 1, "to_index": 2, "path": [...]}
  ],
  "full_path": [...],
  "total_frames": 180
}
```

**Implementation Tasks**:
- [ ] Create multi-waypoint SLERP endpoint
- [ ] Concatenate segments into full path
- [ ] Ensure smooth transitions between segments
- [ ] Add quaternion validation

### Phase 4: Frontend Components (Experience)

#### 4.1 Goal Setting Interface

**File**: `experience/web/components/GoalSetting.tsx`

**Features**:
- Search/browse emotion atlas
- Display current emotional state
- Show psychological distance to goal
- Preview path difficulty

**Implementation Tasks**:
- [ ] Create component with emotion search
- [ ] Integrate with Observer's atlas API
- [ ] Add VAC distance visualization
- [ ] Show category information

#### 4.2 Transition Path Display

**File**: `experience/web/components/TransitionPath.tsx`

**Features**:
- List waypoint emotions as cards
- Show strategies for each transition
- Display estimated time/difficulty
- Progress tracking

**Implementation Tasks**:
- [ ] Create waypoint card components
- [ ] Strategy detail expandable sections
- [ ] Progress indicators
- [ ] "Start Journey" button

#### 4.3 Soul Sphere Path Visualization

**File**: `experience/web/components/SoulSphere.tsx` (enhance existing)

**New Features**:
- Glowing path curve through sphere
- Waypoint markers (locked/available/active/reached states)
- Animated camera following path
- Interactive waypoint exploration

**Implementation Tasks**:
- [ ] Add CatmullRomCurve3 for path rendering
- [ ] Create waypoint marker components
- [ ] Implement camera animation system
- [ ] Add click handlers for waypoint info
- [ ] Particle effects along path

**Visual States**:
```typescript
type WaypointState = 
  | 'locked'      // Gray, small, can't reach yet
  | 'available'   // Yellow, medium, can view info
  | 'active'      // Bright, large, pulsing (current)
  | 'reached';    // Green checkmark, dimmed
```

#### 4.4 Strategy Detail Component

**File**: `experience/web/components/StrategyDetail.tsx`

**Features**:
- Step-by-step instructions
- Timer for time-based strategies
- Rating system (1-5 stars)
- Notes field

**Implementation Tasks**:
- [ ] Create strategy card UI
- [ ] Add timer/countdown feature
- [ ] Implement rating submission
- [ ] Notes textarea with save

#### 4.5 Journey Progress Dashboard

**File**: `experience/web/components/JourneyDashboard.tsx`

**Features**:
- Current journey status
- Waypoint progress bar
- Strategies tried/helpful
- Time elapsed
- Quick check-in button

**Implementation Tasks**:
- [ ] Create dashboard layout
- [ ] Progress visualization
- [ ] Strategy effectiveness chart
- [ ] Emotional check-in form

### Phase 5: Integration & Testing

#### 5.1 End-to-End Flow Test

**Scenario**: Anxiety → Calm journey

```typescript
// Test Steps:
1. User describes feeling anxious
2. System analyzes → VAC [-0.5, 0.7, -0.4]
3. User sets goal: "Calm"
4. Observer generates path: Anxiety → Worry → Calm
5. Versor generates SLERP path (180 quaternions)
6. Experience visualizes path on sphere
7. User starts journey
8. User tries "4-7-8 Breathing" strategy
9. User checks in → reports at Worry
10. System validates, moves to next waypoint
11. User tries "Cognitive Reappraisal"
12. User checks in → reports feeling calm
13. Journey marked complete
14. Success metrics recorded
```

**Implementation Tasks**:
- [ ] Write integration test script
- [ ] Test all API endpoints
- [ ] Verify data flows correctly
- [ ] Test visualization rendering
- [ ] Test history tracking

#### 5.2 Performance Testing

**Metrics to Test**:
- Path generation time (should be < 200ms)
- SLERP generation time (should be < 100ms)
- API response times (should be < 300ms)
- Soul Sphere rendering (should be 60fps)

**Implementation Tasks**:
- [ ] Add performance monitoring
- [ ] Optimize A* search if needed
- [ ] Cache frequently-used paths
- [ ] Optimize quaternion calculations

#### 5.3 User Testing

**Test Scenarios**:
1. First-time user journey
2. Returning user with history
3. Complex path (3+ waypoints)
4. Short path (1 waypoint)
5. Abandoned journey resume
6. Strategy effectiveness feedback

**Implementation Tasks**:
- [ ] Recruit 5-10 test users
- [ ] Gather qualitative feedback
- [ ] Track completion rates
- [ ] Identify pain points
- [ ] Iterate on UX

### Phase 6: Advanced Features (Future)

**V2 Enhancements**:

1. **Abstract Goal States**
   - "I want to feel more motivated"
   - LLM interprets to emotion cluster
   - Show multiple path options

2. **AI-Powered Strategy Personalization**
   - Use LLM to adapt strategy wording
   - Context-specific modifications
   - Learn from user feedback

3. **Social Features**
   - Share successful paths
   - Community wisdom
   - Support connections

4. **Wearables Integration**
   - Heart rate variability
   - Sleep quality
   - Activity level
   - Auto-detect emotional state

5. **Therapist Portal**
   - Review client journeys
   - Suggest custom strategies
   - Track progress over time

6. **Guided Audio**
   - Meditation recordings
   - Breathing guides
   - Affirmation tracks

## 🚀 Getting Started

### For Backend Developer

1. **Set up database**:
```bash
cd observer
psql -U postgres -d observer_db -f migrations/versions/add_transition_system_tables.sql
```

2. **Create path planner service**:
```bash
touch observer/app/services/path_planner.py
# Implement PathPlanner class following TRANSITION_SYSTEM_DESIGN.md
```

3. **Create API routes**:
```bash
touch observer/app/api/routes/transitions.py
# Implement 6 endpoints
```

4. **Seed initial data**:
```bash
python observer/scripts/seed_transition_data.py
```

5. **Test**:
```bash
pytest observer/tests/test_path_planner.py -v
```

### For Frontend Developer

1. **Create goal-setting component**:
```bash
touch experience/web/components/GoalSetting.tsx
```

2. **Enhance Soul Sphere**:
```bash
# Edit experience/web/components/SoulSphere.tsx
# Add path visualization features
```

3. **Create transition path display**:
```bash
touch experience/web/components/TransitionPath.tsx
```

4. **Test**:
```bash
cd experience/web
npm run dev
# Navigate to localhost:3000
```

## 📊 Success Metrics

### Technical Metrics
- [ ] Path generation < 200ms
- [ ] API response < 300ms
- [ ] 60fps Soul Sphere rendering
- [ ] 100% test coverage for PathPlanner

### User Metrics
- [ ] 70%+ journey completion rate
- [ ] 4+ average strategy helpfulness rating
- [ ] 80%+ user satisfaction
- [ ] 60%+ return user rate

### Clinical Metrics
- [ ] Paths respect psychological validity (100%)
- [ ] Bridge emotions included when required (100%)
- [ ] Users report symptom improvement (70%+)

## 📚 Key Documents Reference

1. **System Architecture**: `observer/TRANSITION_SYSTEM_DESIGN.md`
2. **Psychological Rules**: `observer/CATEGORY_GRAPH.md`
3. **Database Schema**: `observer/migrations/versions/add_transition_system_tables.sql`
4. **Models**: `observer/app/models/transition_strategy.py`

## 🎓 Research References

1. Gross, J.J. (1998). The emerging field of emotion regulation. *Review of General Psychology*.
2. Brown, B. (2021). *Atlas of the Heart*. Random House.
3. Linehan, M.M. (2015). *DBT Skills Training Manual*. Guilford Press.
4. Neff, K. (2011). *Self-Compassion*. HarperCollins.
5. Hayes, S.C. (1999). *Acceptance and Commitment Therapy*. Guilford Press.

## 🤝 Next Steps

**Immediate Priority**:
1. Run database migration
2. Implement PathPlanner service
3. Create transition API endpoints
4. Seed initial strategy data

**Week 1 Goal**: Backend complete with working API
**Week 2 Goal**: Frontend visualization complete
**Week 3 Goal**: End-to-end integration working
**Week 4 Goal**: User testing and iteration

---

**The foundation is complete. Time to build! 🚀**
