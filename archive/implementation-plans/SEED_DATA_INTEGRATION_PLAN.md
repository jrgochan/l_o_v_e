# Experience Module - Seed Data Integration Plan

**Created:** December 5, 2025, 1:13 AM
**Purpose:** Comprehensive plan to integrate Observer's rich seed data into Experience web module
**Estimated Time:** 4-6 hours
**Status:** Ready for implementation

---

## 🎯 Executive Summary

The Observer module now contains incredibly rich seed data (107 strategies, 18 patterns, 50 bootstrap records) but the Experience web UI is only utilizing a fraction of it. This plan outlines how to fully leverage this data to create a world-class user experience.

---

## 📊 Current State vs. Desired State

### What's Working ✅
- Atlas emotion loading (87 emotions)
- Basic transition path generation
- Strategy display with details
- Journey initiation and tracking
- Waypoint progression

### Critical Gaps Identified ⚠️

| Feature | Data Available | Currently Used | Impact |
|---------|---------------|----------------|---------|
| Bootstrap patterns (50 records) | ✅ | ❌ | New users get no benefit |
| User strategy effectiveness | ✅ API exists | ❌ | No personalization |
| Journey history | ✅ API exists | ❌ | Can't see past progress |
| Strategy feedback collection | ✅ API supports | ❌ | No learning loop |
| Context-aware recommendations | ✅ 5 modifiers | ❌ | Generic suggestions |
| Pattern education | ✅ 18 patterns | ❌ Partial | Lost empowerment |

---

## 🏗️ Implementation Plan - 6 Phases

### **Phase 1: Observer API Bootstrap Endpoints** (1-1.5 hours)

**Goal:** Create new API endpoints to expose bootstrap data

**Location:** `observer/app/api/routes/bootstrap.py` (NEW FILE)

**Endpoints to Create:**
```python
GET /api/v1/bootstrap/strategy-effectiveness
GET /api/v1/bootstrap/path-templates
GET /api/v1/bootstrap/context-recommendations
GET /api/v1/bootstrap/challenge-patterns
GET /api/v1/bootstrap/all
```

**Implementation Steps:**
1. Create `observer/app/api/routes/bootstrap.py`
2. Query `bootstrap_data` table by `data_type`
3. Return JSON with proper typing
4. Add route to main.py
5. Test with curl/postman

**Deliverables:**
- [ ] bootstrap.py route file
- [ ] 5 new API endpoints
- [ ] Integration tests
- [ ] Update API documentation

---

### **Phase 2: Experience API Client Enhancement** (30 minutes)

**Goal:** Add bootstrap data queries to Observer API client

**Location:** `experience/shared/src/api/observer.ts`

**New Methods to Add:**
```typescript
// Bootstrap data types
export interface BootstrapStrategyRating {
  strategy_name: string;
  global_rating: number;
  success_rate: number;
  best_for_patterns: string[];
  avg_time_to_effect: string;
  difficulty: number;
  completion_rate: number;
}

export interface BootstrapPathTemplate {
  from_emotion: string;
  to_emotion: string;
  optimal_path: string[];
  difficulty: number;
  estimated_time_minutes: number;
  success_rate: number;
  recommended_strategies: string[];
}

// In ObserverApiClient class:
async getBootstrapStrategyRatings(): Promise<BootstrapStrategyRating[]>
async getBootstrapPathTemplates(): Promise<BootstrapPathTemplate[]>
async getContextRecommendations(context: UserContext): Promise<ContextualRecommendation[]>
```

**Deliverables:**
- [ ] Type definitions for bootstrap data
- [ ] 3-4 new client methods
- [ ] Update exports in index.ts

---

### **Phase 3: Strategy Feedback Collection** (1-1.5 hours)

**Goal:** Collect user feedback on strategy effectiveness

**Location:** `experience/web/components/JourneyProgress.tsx`

**Features to Add:**
1. **Strategy Attempt Modal** - When marking waypoint reached:
   - "Which strategies did you try?"
   - Multi-select from waypoint's recommended strategies
   - Star rating (1-5) for each tried
   - Optional notes field
   - Time spent input

2. **API Integration:**
   - Send to existing `/journey/{id}/waypoint-reached` endpoint
   - Include strategies_tried array with ratings
   - Persist to database

3. **UI Enhancements:**
   - "Mark as Reached" button opens modal
   - Strategy selection checkboxes
   - Rating stars for each selected
   - "Skip feedback" option
   - Submit → waypoint marked + feedback saved

**Deliverables:**
- [ ] StrategyFeedbackModal component
- [ ] Integration with waypoint-reached API
- [ ] Updated JourneyProgress component
- [ ] Local state management for feedback

---

### **Phase 4: User Personalization Display** (1 hour)

**Goal:** Show user their most effective strategies

**Location:** `experience/web/components/PersonalStrategies.tsx` (NEW FILE)

**Features:**
1. **Your Effective Strategies Section:**
   - Query `/user/{id}/effective-strategies`
   - Display top 5 with star ratings
   - Show "times tried" and "avg rating"
   - Display user's past notes
   - Highlight these in recommendations

2. **Integration Points:**
   - Add to GoalSetting component
   - Show in sidebar or collapsible panel
   - Auto-refresh after journey completion

**Deliverables:**
- [ ] PersonalStrategies component
- [ ] API query hook
- [ ] Display in GoalSetting or new sidebar
- [ ] Styling with user's success color scheme

---

### **Phase 5: Journey History & Analytics** (1-1.5 hours)

**Goal:** Display user's journey history with insights

**Location:** `experience/web/components/JourneyHistory.tsx` (NEW FILE)

**Features:**
1. **Journey Timeline:**
   - Query `/user/{id}/journey-history`
   - Show completed/abandoned journeys
   - Success rate visualization
   - Time-based chart of emotional journey patterns

2. **Individual Journey Details:**
   - Expand to see waypoints
   - Strategies used
   - Time taken vs. estimated
   - Success factors

3. **Analytics Dashboard:**
   - Total journeys: X
   - Success rate: Y%
   - Most common goals
   - Favorite strategies
   - Total time invested in growth

**Deliverables:**
- [ ] JourneyHistory component
- [ ] Journey card sub-component
- [ ] Analytics visualization
- [ ] Integration into main UI (new tab/panel)

---

### **Phase 6: Bootstrap & Context-Aware Recommendations** (1.5-2 hours)

**Goal:** Leverage bootstrap patterns for smart recommendations

**Location:** `experience/web/components/ContextualRecommendations.tsx` (NEW FILE)

**Features:**
1. **Context Capture Form:**
   - Time of day (morning/afternoon/evening/late_night)
   - Energy level (high/moderate/low)
   - Location (home/work/public)
   - Available time (5min/15min/30min/60+min)
   - Experience level (beginner/intermediate/advanced)

2. **Smart Recommendations:**
   - Query bootstrap context_modifiers
   - Filter strategies by context
   - Show "Best for your situation" section
   - Example: "You have 15 minutes at work → Box Breathing, Thank Your Mind"

3. **Path Template Suggestions:**
   - "Others on similar journeys tried: [Anxiety → Calm]"
   - Show pre-computed paths from bootstrap
   - Display success rates
   - One-click apply template

4. **Challenge Pattern Matching:**
   - "Feeling anxious/stressed? Try this progression:"
   - Progressive difficulty strategies
   - Research-backed sequences

**Deliverables:**
- [ ] Context capture form component
- [ ] Contextual recommendations engine
- [ ] Path template browser
- [ ] Challenge pattern matcher
- [ ] Integration into GoalSetting flow

---

## 🔧 Technical Implementation Details

### Backend Changes Required

#### 1. New Bootstrap API Routes (`observer/app/api/routes/bootstrap.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.database import get_db

router = APIRouter()

@router.get("/bootstrap/strategy-effectiveness")
async def get_strategy_effectiveness(db: AsyncSession = Depends(get_db)):
    """Get global strategy effectiveness ratings."""
    query = text("""
        SELECT content
        FROM bootstrap_data
        WHERE data_type = 'strategy_effectiveness'
        ORDER BY data_category
    """)
    result = await db.execute(query)
    return {"ratings": [row[0] for row in result.fetchall()]}

@router.get("/bootstrap/path-templates")
async def get_path_templates(
    from_emotion: str = None,
    to_emotion: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Get pre-computed path templates."""
    # Filter by emotions if provided
    # Return path templates with success rates

@router.get("/bootstrap/context-recommendations")
async def get_context_recommendations(
    time_of_day: str = None,
    energy_level: str = None,
    location: str = None,
    available_time: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Get context-aware strategy recommendations."""
    # Query context_modifier records
    # Return filtered recommendations
```

#### 2. Register New Routes (`observer/app/main.py`)

```python
from app.api.routes import bootstrap

app.include_router(
    bootstrap.router,
    prefix="/api/v1/bootstrap",
    tags=["Bootstrap"]
)
```

### Frontend Changes Required

#### 1. Type Definitions (`experience/shared/src/api/observer.ts`)

```typescript
export interface BootstrapStrategyRating {
  strategy_name: string;
  global_rating: number;
  success_rate: number;
  best_for_patterns: string[];
  avg_time_to_effect: string;
  difficulty: number;
  completion_rate: number;
}

export interface BootstrapPathTemplate {
  from_emotion: string;
  to_emotion: string;
  optimal_path: string[];
  difficulty: number;
  estimated_time_minutes: number;
  success_rate: number;
  recommended_strategies: string[];
}

export interface UserContext {
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'late_night';
  energy_level?: 'high' | 'moderate' | 'low';
  location?: 'home' | 'work' | 'public';
  available_time?: '5_minutes' | '15_minutes' | '30_minutes' | '60_plus_minutes';
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ContextualRecommendation {
  strategies: string[];
  reasoning: string;
  modifiers: Record<string, number>;
}
```

#### 2. New Components to Create

**a) `ContextualRecommendations.tsx`**
```typescript
interface Props {
  currentVAC: VACVector;
  goalVAC?: VACVector;
}

export function ContextualRecommendations({ currentVAC, goalVAC }: Props) {
  const [context, setContext] = useState<UserContext>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Context capture form
  // Query bootstrap API
  // Display recommendations
  // One-click apply
}
```

**b) `PersonalStrategies.tsx`**
```typescript
export function PersonalStrategies({ userId }: { userId: string }) {
  const [topStrategies, setTopStrategies] = useState([]);

  // Query /user/{id}/effective-strategies
  // Display with star ratings
  // Show user notes
  // Highlight in recommendations
}
```

**c) `JourneyHistory.tsx`**
```typescript
export function JourneyHistory({ userId }: { userId: string }) {
  const [journeys, setJourneys] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Query /user/{id}/journey-history
  // Timeline visualization
  // Success metrics
  // Journey details on expand
}
```

**d) `StrategyFeedbackModal.tsx`**
```typescript
interface Props {
  waypoint: WaypointInfo;
  onSubmit: (feedback: StrategyFeedback[]) => void;
  onSkip: () => void;
}

export function StrategyFeedbackModal({ waypoint, onSubmit, onSkip }: Props) {
  // Strategy selection checkboxes
  // Rating stars
  // Notes input
  // Time spent
}
```

#### 3. State Management Updates (`useExperienceStore.ts`)

```typescript
interface ExperienceStore {
  // Existing...

  // NEW:
  userContext: UserContext | null;
  bootstrapData: {
    strategies: BootstrapStrategyRating[];
    paths: BootstrapPathTemplate[];
  } | null;
  journeyHistory: any[];
  effectiveStrategies: any[];

  // Actions:
  setUserContext: (context: UserContext) => void;
  loadBootstrapData: () => Promise<void>;
  loadJourneyHistory: (userId: string) => Promise<void>;
  loadEffectiveStrategies: (userId: string) => Promise<void>;
  submitStrategyFeedback: (journeyId: string, waypointIndex: number, feedback: any[]) => Promise<void>;
}
```

---

## 📋 Detailed Implementation Checklist

### Backend (Observer Module)

#### API Endpoints
- [ ] Create `observer/app/api/routes/bootstrap.py`
- [ ] Implement `GET /bootstrap/strategy-effectiveness`
- [ ] Implement `GET /bootstrap/path-templates`
- [ ] Implement `GET /bootstrap/context-recommendations`
- [ ] Implement `GET /bootstrap/challenge-patterns`
- [ ] Register bootstrap routes in main.py
- [ ] Add Pydantic schemas for bootstrap responses
- [ ] Write integration tests for new endpoints
- [ ] Update API documentation

#### Strategy Recommender Enhancement
- [ ] Update StrategyRecommender to use bootstrap data for new users
- [ ] Add fallback to bootstrap patterns when no user history
- [ ] Integrate context modifiers into recommendation logic
- [ ] Add path template matching

### Frontend (Experience Module)

#### Shared API Client (`experience/shared/`)
- [ ] Add bootstrap data type definitions
- [ ] Add UserContext interface
- [ ] Implement getBootstrapStrategyRatings()
- [ ] Implement getBootstrapPathTemplates()
- [ ] Implement getContextRecommendations()
- [ ] Implement getUserEffectiveStrategies()
- [ ] Implement getUserJourneyHistory()
- [ ] Update exports in index.ts

#### New Components (`experience/web/components/`)
- [ ] Create ContextualRecommendations.tsx
- [ ] Create PersonalStrategies.tsx
- [ ] Create JourneyHistory.tsx
- [ ] Create StrategyFeedbackModal.tsx
- [ ] Create ContextCaptureForm.tsx (sub-component)
- [ ] Create PathTemplateCard.tsx (sub-component)
- [ ] Create JourneyCard.tsx (sub-component)

#### Component Enhancements
- [ ] Enhance JourneyProgress.tsx:
  - [ ] Add feedback modal integration
  - [ ] Collect strategy attempts on waypoint reached
  - [ ] Send feedback to API
  - [ ] Show confirmation after feedback

- [ ] Enhance GoalSetting.tsx:
  - [ ] Display pattern name ("You're following: Anxiety Regulation")
  - [ ] Show pattern psychological reasoning
  - [ ] Add "Suggested Paths" section using templates
  - [ ] Integrate PersonalStrategies component
  - [ ] Add context capture option

- [ ] Enhance Strategy Display:
  - [ ] Show bootstrap global ratings
  - [ ] Display "X% of users found this helpful"
  - [ ] Highlight user's past success with strategy
  - [ ] Show context appropriateness badges

#### State Management
- [ ] Update useExperienceStore:
  - [ ] Add userContext state
  - [ ] Add bootstrapData state
  - [ ] Add journeyHistory state
  - [ ] Add effectiveStrategies state
  - [ ] Add loading/error states
  - [ ] Implement load actions
  - [ ] Add submitStrategyFeedback action

#### UI Integration
- [ ] Add new tab/section for Journey History
- [ ] Add context settings in Settings component
- [ ] Integrate contextual recommendations into main flow
- [ ] Add "Quick Start" using path templates
- [ ] Update main page layout to accommodate new components

---

## 🎨 UX Enhancements Detail

### 1. Smart Onboarding for New Users

**Before:** Generic recommendations, no guidance
**After:**
- "New here? Let's find what works for you"
- Quick context questions (30 seconds)
- Show path templates: "Most people go Anxiety → Calm this way"
- Pre-populated with bootstrap effectiveness ratings

### 2. Personalized Dashboard for Returning Users

**Before:** Same experience every time
**After:**
- "Welcome back! Your top 3 strategies: ..."
- "Your success rate: 75%"
- "Based on 4 completed journeys"
- "Want to continue where you left off?"

### 3. Context-Aware Suggestions

**Before:** All 107 strategies shown equally
**After:**
- "You're at work with 15 minutes → Try these 3"
- "Late night, low energy → Calming practices"
- "High energy, at home → Somatic/movement work"
- Filtered and prioritized automatically

### 4. Educational Journey Experience

**Before:** Just waypoints and strategies
**After:**
- "You're on a Shame Resilience journey"
- "This pattern works because: [psychological reasoning]"
- "Research shows 82% success rate for this path"
- "Others used these strategies successfully"

### 5. Learning Loop

**Before:** No feedback collected
**After:**
- After each waypoint: "How helpful were these?"
- Ratings inform future recommendations
- "This worked great last time - try it again?"
- System gets smarter with each journey

---

## 📐 Component Architecture

```
Main App
├── EmotionalControls (existing)
├── VACDisplay (existing)
├── Scene with SoulSphere (existing)
│
├── GoalSetting (ENHANCED)
│   ├── Atlas emotion selector (existing)
│   ├── PersonalStrategies (NEW)
│   ├── ContextCaptureForm (NEW)
│   ├── PathTemplatesSuggestions (NEW)
│   └── Pattern education display (NEW)
│
├── JourneyProgress (ENHANCED)
│   ├── Progress display (existing)
│   ├── Waypoint tracking (existing)
│   └── StrategyFeedbackModal (NEW)
│
└── JourneyHistory (NEW SECTION)
    ├── Journey timeline
    ├── Analytics dashboard
    └── Past journey details
```

---

## 🔄 Data Flow

### For New Users (No History)
```
1. User sets context → Context API
2. Get bootstrap recommendations → Bootstrap API
3. Show path templates → Bootstrap path_templates
4. User selects → Generate path with bootstrap-informed strategies
5. Complete journey + feedback → Builds personal history
```

### For Returning Users (Has History)
```
1. Load user history → Journey History API
2. Load effective strategies → Effective Strategies API
3. Combine with bootstrap data → Hybrid recommendations
4. Prioritize what worked before → Personalized experience
5. Fall back to bootstrap for new patterns → Always have suggestions
```

---

## 🧪 Testing Strategy

### Backend Tests
- [ ] Test bootstrap API endpoints return correct data
- [ ] Test filtering by context works
- [ ] Test new user gets bootstrap recommendations
- [ ] Test returning user gets personalized + bootstrap
- [ ] Integration test full feedback loop

### Frontend Tests
- [ ] Test ContextualRecommendations renders
- [ ] Test PersonalStrategies queries and displays
- [ ] Test JourneyHistory loads and shows data
- [ ] Test StrategyFeedbackModal submission
- [ ] Test context-aware filtering
- [ ] Integration test: new user flow
- [ ] Integration test: returning user flow

---

## 📝 Implementation Order (Recommended)

### Day 1: Backend Foundation (2-3 hours)
1. ✅ Phase 1: Bootstrap API endpoints
2. Test endpoints with Postman/curl
3. Deploy to dev environment

### Day 2: Frontend Data Layer (1-2 hours)
1. ✅ Phase 2: API client enhancement
2. Test client methods
3. Update type definitions

### Day 3: Core Features (2-3 hours)
1. ✅ Phase 3: Strategy feedback collection
2. ✅ Phase 4: Personal strategies display
3. Test user flows

### Day 4: Advanced Features (2-3 hours)
1. ✅ Phase 5: Journey history
2. ✅ Phase 6: Contextual recommendations
3. Integration testing
4. Polish and refinement

---

## 💡 Quick Wins (Can Do First)

If you want to see immediate value, do these first:

### Quick Win 1: Show Pattern Names (15 minutes)
- GoalSetting already gets path from API
- Path includes pattern info in StrategyRecommender
- Just display it: "Following: Anxiety Regulation pattern"

### Quick Win 2: Query Effective Strategies (30 minutes)
- API endpoint already exists
- Add one query to GoalSetting
- Display in sidebar: "Your top strategies"

### Quick Win 3: Collect Basic Feedback (1 hour)
- Simple modal on waypoint reached
- "How helpful?" 1-5 stars
- Send to existing API endpoint

---

## 🎯 Success Metrics

After implementation, measure:
- **Engagement:** % of users who complete journeys
- **Personalization:** % using their effective strategies
- **Context usage:** % providing context information
- **Feedback rate:** % submitting strategy ratings
- **Path template usage:** % selecting pre-computed paths
- **Return rate:** % coming back for second journey

---

## 🚀 Future Enhancements (Beyond This Plan)

Once core integration complete:
1. **LLM-generated explanations** using strategy descriptions
2. **Social features** showing aggregate "what others found helpful"
3. **Adaptive difficulty** based on completion patterns
4. **Notification system** for journey check-ins
5. **Export/share journeys** for therapeutic use
6. **Integration with Listener** for audio-initiated journeys

---

## 📚 Reference Materials

### Seed Data Files to Study
- `observer/data/bootstrap_patterns.json` - All bootstrap data structure
- `observer/data/demo_journeys.json` - Example journey format
- `observer/SEEDING_SYSTEM_README.md` - Data documentation

### Existing Code to Reference
- `observer/app/api/routes/transitions.py` - Current transition API
- `observer/app/services/strategy_recommender.py` - Recommendation logic
- `experience/web/components/GoalSetting.tsx` - Current implementation
- `experience/shared/src/api/observer.ts` - API client patterns

---

## ⚠️ Important Notes

### Don't Break Existing Functionality
- All enhancements should be **additive**
- Maintain backward compatibility
- Graceful degradation if APIs unavailable
- Loading states for all async operations

### Handle Edge Cases
- New user with no history → bootstrap data
- API unavailable → show cached/mock data
- No context provided → use sensible defaults
- Empty bootstrap table → fallback to basic recommendations

### Performance Considerations
- Cache bootstrap data (changes rarely)
- Lazy load journey history (only when tab opened)
- Debounce context recommendation queries
- Pagination for large journey histories

---

## 🎉 Expected Impact

### For Users
✨ **New users** get smart recommendations from day one
✨ **Returning users** see their progress and growth
✨ **All users** get context-appropriate suggestions
✨ **Everyone** experiences continuous improvement as system learns

### For Product
✨ **Higher engagement** through personalization
✨ **Better outcomes** with evidence-based, context-aware recommendations
✨ **Rich data collection** for future improvements
✨ **Competitive advantage** with sophisticated ML-ready foundation

---

## 📅 Estimated Timeline

- **Backend (Phase 1):** 1-1.5 hours
- **API Client (Phase 2):** 30 minutes
- **Feedback Collection (Phase 3):** 1-1.5 hours
- **Personalization (Phase 4):** 1 hour
- **History (Phase 5):** 1-1.5 hours
- **Context Recommendations (Phase 6):** 1.5-2 hours
- **Testing & Polish:** 1 hour

**Total:** 6-8 hours (can be split across multiple sessions)

---

## 🏁 Ready to Start?

When you're ready to implement:

1. **Start with Phase 1** (Backend bootstrap endpoints)
2. **Test endpoints** work correctly
3. **Move to Phase 2** (API client)
4. **Pick a Phase 3-6** based on priority
5. **Test as you go**
6. **Iterate and refine**

The seed data is powerful - let's make the Experience module shine! ✨

---

_End of Integration Plan_
