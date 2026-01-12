# Emotional State Transition System - Quick Start Guide

## 🎯 What You Can Do Now

With the foundation complete, you can:
1. ✅ Generate transition paths from any emotion to any goal
2. ✅ See psychologically valid waypoints
3. ✅ Get evidence-based strategies for each transition
4. ✅ View path metrics (difficulty, time, success rate)
5. ⏳ Visualize paths on Soul Sphere (next step)
6. ⏳ Track journey progress (next step)

## 🚀 Quick Start (5 Minutes)

### Step 1: Set Up Database
```bash
cd observer

# Make setup script executable (already done)
# chmod +x setup_transition_system.sh

# Run setup - creates tables and seeds data
./setup_transition_system.sh
```

**Expected Output**:
```
✅ Migration applied successfully
✅ Data seeded successfully
   Strategies: 15
   Category Transitions: 169
   Transition Patterns: 5
✅ Setup Complete!
```

### Step 2: Start Observer API
```bash
# Activate virtual environment if not already
cd observer
source venv/bin/activate

# Start the API
python app/main.py
```

**Expected Output**:
```
INFO: Starting Observer Module...
INFO: Database initialized successfully
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test API (Choose One)

#### Option A: Web Interface
```bash
# Open API docs in browser
open http://localhost:8000/docs

# Navigate to POST /observer/transition-path
# Click "Try it out"
# Use this example:
{
  "user_id": "00000000-0000-0000-0000-000000000001",
  "current_vac": [-0.5, 0.7, -0.4],
  "goal_vac": [0.5, -0.7, 0.4],
  "max_waypoints": 3
}
```

#### Option B: Command Line
```bash
curl -X POST http://localhost:8000/observer/transition-path \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000001",
    "current_vac": [-0.5, 0.7, -0.4],
    "goal_vac": [0.5, -0.7, 0.4],
    "max_waypoints": 3
  }'
```

**Expected Response**:
```json
{
  "path_id": "...",
  "current_state": {
    "emotion": "Anxiety",
    "category": "Places We Go When Things Are Uncertain or Too Much",
    "vac": [-0.5, 0.7, -0.4]
  },
  "goal_state": {
    "emotion": "Calm",
    "category": "Places We Go When Life Is Good",
    "vac": [0.5, -0.7, 0.4]
  },
  "waypoints": [
    {
      "emotion": "Worry",
      "reasoning": "Reducing physiological arousal...",
      "strategies": [...]
    }
  ],
  "path_metrics": {
    "total_distance": 1.89,
    "overall_difficulty": "moderate",
    "success_probability": 0.7
  }
}
```

### Step 4: Test Frontend UI
```bash
cd experience/web

# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

**What to Do**:
1. Type how you're feeling in "Emotional Input"
2. Click "Set Emotional Goal & Get Path"
3. Search for "Calm" or "Joy"
4. Click "Generate Transition Path"
5. See the waypoint journey displayed!

## 📋 What Was Built

### Backend (Observer) ✅
- **Path Planning Service**: Category-aware A* pathfinding
- **6 API Endpoints**: Path generation, journey tracking, analytics
- **Database**: 7 tables with 169 category transitions + 15+ strategies
- **Evidence-Based**: Grounded in emotion regulation research

### Frontend (Experience) ✅
- **Goal Setting UI**: Search and select target emotions
- **Path Display**: Waypoints with reasoning and metrics
- **Integration**: Connected to Observer API
- ⏳ **3D Visualization**: Pending Soul Sphere path rendering

### Research Foundation ✅
- **Brené Brown**: 13 emotion categories from "Atlas of the Heart"
- **James Gross**: 5 strategy types from Process Model
- **Marsha Linehan**: DBT skills (TIPP, Radical Acceptance)
- **Kristin Neff**: Self-compassion practices
- **Steven Hayes**: ACT acceptance strategies

## 🧪 Test Scenarios

### Scenario 1: Anxiety → Calm (Common Path)
```json
{
  "current_vac": [-0.5, 0.7, -0.4],  // Anxiety
  "goal_vac": [0.5, -0.7, 0.4]        // Calm
}
```
**Expected**: Path through Worry with breathing/grounding strategies

### Scenario 2: Shame → Joy (Complex Path)
```json
{
  "current_vac": [-0.9, -0.1, -1.0],  // Shame
  "goal_vac": [0.9, 0.7, 0.8]          // Joy
}
```
**Expected**: 
- System MUST add Vulnerability as waypoint
- Path through connection-building
- Self-compassion strategies included

### Scenario 3: Loneliness → Belonging
```json
{
  "current_vac": [-0.7, -0.2, -0.9],  // Loneliness
  "goal_vac": [0.8, 0.4, 1.0]          // Belonging
}
```
**Expected**: Path through Vulnerability with social connection strategies

### Scenario 4: Overwhelm → Contentment
```json
{
  "current_vac": [-0.6, 0.9, -0.3],   // Overwhelm
  "goal_vac": [0.6, -0.5, 0.5]         // Contentment
}
```
**Expected**: Arousal regulation first, then cognitive strategies

## 📊 Available API Endpoints

1. **POST `/observer/transition-path`**
   - Generate optimal path from current to goal
   - Returns waypoints with strategies

2. **POST `/observer/journey/start`**
   - Begin tracking a journey
   - Stores context metadata

3. **POST `/observer/journey/{id}/waypoint-reached`**
   - Mark waypoint complete
   - Record strategy attempts
   - Auto-complete if last waypoint

4. **GET `/observer/journey/{id}`**
   - Get current journey status

5. **GET `/observer/user/{id}/journey-history`**
   - View past journeys and success rates

6. **GET `/observer/user/{id}/effective-strategies`**
   - Get top-rated strategies for this user

## 🔬 Key Features to Test

### Psychological Validity
- ✅ **Try Shame → Joy direct**: Should be blocked or require Vulnerability
- ✅ **High arousal states**: Should reduce arousal before complex cognition
- ✅ **Bridge emotions**: Vulnerability, Awe, Compassion appear when needed
- ✅ **Category awareness**: Paths respect Brené Brown's structure

### Personalization
- ⏳ **User history**: Complete same journey twice, second should be faster
- ⏳ **Strategy effectiveness**: Rate strategies, see them prioritized next time

### Evidence-Based Content
- ✅ **Strategy types**: 5 types from Gross (1998)
- ✅ **Evidence levels**: Meta-analysis, RCT, Clinical, Theoretical
- ✅ **Research citations**: Each strategy has references
- ✅ **Step-by-step**: Detailed instructions for each strategy

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# If not running:
brew services start postgresql@16  # macOS
# or
sudo systemctl start postgresql    # Linux
```

### "Module not found" errors
```bash
cd observer
source venv/bin/activate
pip install -r requirements.txt
```

### "Table already exists" during migration
This is OK! Tables were created already. The seed script will handle duplicates.

### Frontend can't connect to Observer
```bash
# Make sure Observer is running on port 8000
curl http://localhost:8000/health

# Check NEXT_PUBLIC_OBSERVER_URL in experience/web/.env.local
echo "NEXT_PUBLIC_OBSERVER_URL=http://localhost:8000" > experience/web/.env.local
```

## 📈 What's Next (Remaining Work)

### Week 1: Backend Polish
- [ ] Strategy Recommender Service (pattern matching)
- [ ] Unit tests for PathPlanner
- [ ] Integration tests for API endpoints
- [ ] Versor multi-waypoint SLERP endpoint

### Week 2: Frontend Visualization
- [ ] Soul Sphere path rendering (glowing curves)
- [ ] Waypoint markers (locked/available/active/reached)
- [ ] Animated camera journey preview
- [ ] Strategy detail cards with timers

### Week 3: Journey Tracking
- [ ] Journey dashboard component
- [ ] Progress visualization
- [ ] Strategy attempt recording
- [ ] Completion celebration

### Week 4: Integration & Testing
- [ ] End-to-end journey flow
- [ ] User testing (5-10 people)
- [ ] Performance optimization
- [ ] Documentation updates

## 🎓 Understanding the System

### How Pathfinding Works

1. **User inputs**: Current VAC + Goal VAC
2. **Emotion mapping**: System finds nearest emotions in atlas
3. **Category check**: Validates transition is psychologically possible
4. **A* search**: Finds optimal path considering:
   - VAC distance (weighted by axis)
   - Category transition difficulty
   - User history (if available)
   - Arousal regulation requirements
5. **Bridge detection**: Adds Vulnerability if needed for shame healing
6. **Strategy matching**: Recommends evidence-based techniques
7. **Return path**: Waypoints + strategies + metrics

### Weighted Distance Formula
```
distance = 1.0 × |valence1 - valence2| 
         + 1.2 × |arousal1 - arousal2|
         + 1.5 × |connection1 - connection2|
```

**Why weighted?**
- Connection is hardest to change (requires vulnerability)
- Arousal requires physiological regulation
- Valence can shift with cognitive reappraisal

### Bridge Emotions

**Vulnerability** [0.0, 0.3, 0.6]
- Required for: Shame → any positive connection
- Brené Brown: "Birthplace of love, belonging, joy"

**Awe** [0.7, 0.5, 0.8]
- Gateway emotion - accessible from most states
- Shifts perspective, interrupts rumination

**Compassion** [0.5, 0.2, 0.9]
- Heals shame and pain
- Feeling WITH vs. Pity (feeling FOR)

## 📚 Key Documents

- **System Architecture**: `observer/TRANSITION_SYSTEM_DESIGN.md`
- **Psychological Rules**: `observer/CATEGORY_GRAPH.md`
- **Implementation Guide**: `TRANSITION_IMPLEMENTATION_ROADMAP.md`
- **Session Summary**: `TRANSITION_SYSTEM_SESSION_SUMMARY.md`

## 🎉 What Makes This Special

This isn't just emotion tracking—it's **guided emotional navigation**:

✅ **Psychologically Valid** - Respects how emotions actually work
✅ **Evidence-Based** - Strategies from published research  
✅ **Personalized** - Learns what works for each user
✅ **Visual** - See your journey through 3D space
✅ **Actionable** - Step-by-step instructions
✅ **Compassionate** - No toxic positivity, respects pain

---

**Ready to navigate your emotional landscape! 🧭✨**

*Questions? Check the comprehensive docs or test the API at http://localhost:8000/docs*
