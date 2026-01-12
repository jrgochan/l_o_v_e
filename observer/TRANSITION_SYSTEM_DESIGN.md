# Emotional State Transition System - Technical Design

## Executive Summary

This document specifies the Emotional State Transition Guidance System for the LOVE stack. This system enables users to:

1. Describe their current emotional state
2. Select a goal emotional state
3. Receive an evidence-based path with intermediate waypoints
4. Visualize the journey through the Soul Sphere
5. Access psychological strategies for each transition
6. Track progress and learn from personal history

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        EXPERIENCE (Frontend)                 │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │  Goal Setting    │  │   Path Visualization            │ │
│  │  Interface       │  │   - Glowing path curve          │ │
│  │                  │  │   - Waypoint markers            │ │
│  └──────────────────┘  │   - Animated camera             │ │
│                        │   - Interactive exploration      │ │
│                        └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│                      OBSERVER (Backend)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Path Planning Service                               │  │
│  │  - Category-based A* pathfinding                     │  │
│  │  - Psychological constraint validation               │  │
│  │  - User history integration                          │  │
│  │  - Strategy recommendation engine                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Strategy Database                                   │  │
│  │  - 87 emotions × transition patterns                 │  │
│  │  - Evidence-based interventions                      │  │
│  │  - Success metrics                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ↓ Quaternion Calculations
┌─────────────────────────────────────────────────────────────┐
│                        VERSOR (Math Engine)                  │
│  - Multi-waypoint SLERP path generation                     │
│  - Smooth quaternion interpolation                          │
│  - Full path concatenation for visualization                │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Category-Based Emotional Graph

The 87 emotions are organized into 13 psychological categories (from Brené Brown's "Atlas of the Heart"). These categories form a directed graph where edges represent psychologically valid transitions.

**Key Principles:**
- Not all emotions can transition directly to others (e.g., Shame → Joy is psychologically invalid)
- Some emotions serve as "bridges" (Vulnerability, Awe, Compassion)
- Transitions must respect arousal regulation, connection building, and valence shifts
- Some categories require specific intermediate steps

**Example Path:**
```
Shame → Vulnerability → Belonging → Joy
  ↓         ↓              ↓          ↓
Cat 8    Gateway       Cat 9      Cat 11
```

### 2. VAC-Based Distance Metrics

Emotional distance is calculated in 3D VAC space with weighted axes:

```python
distance = (
    1.0 × |v₁ - v₂| +  # Valence: moderate difficulty
    1.2 × |a₁ - a₂| +  # Arousal: slightly harder (physiological)
    1.5 × |c₁ - c₂|    # Connection: most difficult (requires vulnerability)
)
```

**Rationale:**
- **Valence shifts** are achievable through reappraisal and environment changes
- **Arousal regulation** requires physiological interventions (breath, movement)
- **Connection changes** are hardest; they involve vulnerability and trust

### 3. Strategy-Pattern Mapping

Instead of mapping strategies to all 7,569 emotion pairs (87×87), we use **transition patterns**:

**Pattern Types:**
1. **High Arousal → Low Arousal** (e.g., Anxiety → Calm)
2. **Negative Connection → Positive Connection** (e.g., Shame → Self-Compassion)
3. **Social Disconnection → Connection** (e.g., Loneliness → Belonging)
4. **High Negative Valence → Acceptance** (e.g., Anger → Peace)
5. **Overwhelm → Regulated State** (e.g., Stress → Contentment)

Each pattern has 3-7 evidence-based strategies from emotion regulation research.

### 4. Personalized Learning

The system learns from each user's history:
- Which transitions have worked before
- Which strategies were rated helpful
- Time-to-completion for waypoints
- Contextual factors (time of day, external support)

## API Specification

### POST `/observer/transition-path`

Generate an optimal emotional transition path.

**Request:**
```json
{
  "user_id": "uuid",
  "current_emotion": "Anxiety",
  "current_vac": [-0.5, 0.7, -0.4],
  "goal_emotion": "Calm",
  "goal_vac": [0.5, -0.7, 0.4],
  "max_waypoints": 3,
  "include_alternatives": true
}
```

**Response:**
```json
{
  "path_id": "uuid",
  "created_at": "2024-12-04T17:00:00Z",
  
  "current_state": {
    "emotion": "Anxiety",
    "category": "Places We Go When Things Are Uncertain or Too Much",
    "vac": [-0.5, 0.7, -0.4],
    "quaternion": [0.707, -0.353, 0.494, -0.283]
  },
  
  "goal_state": {
    "emotion": "Calm",
    "category": "Places We Go When Life Is Good",
    "vac": [0.5, -0.7, 0.4],
    "quaternion": [0.707, 0.353, -0.494, 0.283]
  },
  
  "waypoints": [
    {
      "order": 1,
      "emotion": "Worry",
      "category": "Places We Go When Things Are Uncertain or Too Much",
      "vac": [-0.4, 0.5, -0.3],
      "quaternion": [0.707, -0.282, 0.353, -0.212],
      "distance_from_previous": 0.45,
      "estimated_time": "15-30 minutes",
      "difficulty": "moderate",
      "reasoning": "Reducing physiological arousal while maintaining awareness. This is a natural first step for anxiety regulation.",
      
      "strategies": [
        {
          "strategy_id": "uuid",
          "name": "4-7-8 Breathing",
          "type": "response_modulation",
          "description": "Breathe in for 4 counts, hold for 7, exhale for 8. Activates parasympathetic nervous system.",
          "steps": [
            "Find comfortable seated position",
            "Place tongue behind upper teeth",
            "Exhale completely through mouth",
            "Inhale through nose for 4 counts",
            "Hold breath for 7 counts",
            "Exhale through mouth for 8 counts",
            "Repeat 4 cycles"
          ],
          "time_required": "5-10 minutes",
          "difficulty_level": 1,
          "evidence_level": "meta_analysis",
          "effectiveness_rating": 4.2,
          "times_successful_for_user": 3,
          "user_notes": ["Worked well before bed", "Hard to do during panic"]
        },
        {
          "strategy_id": "uuid",
          "name": "5-4-3-2-1 Grounding",
          "type": "attentional_deployment",
          "description": "Engage senses to anchor in present moment and reduce rumination.",
          "steps": [
            "Name 5 things you can see",
            "Name 4 things you can touch",
            "Name 3 things you can hear",
            "Name 2 things you can smell",
            "Name 1 thing you can taste"
          ],
          "time_required": "5-10 minutes",
          "difficulty_level": 1,
          "evidence_level": "clinical",
          "effectiveness_rating": 4.5,
          "times_successful_for_user": 0
        }
      ]
    },
    {
      "order": 2,
      "emotion": "Contentment",
      "category": "Places We Go When Life Is Good",
      "vac": [0.6, -0.5, 0.5],
      "quaternion": [0.707, 0.424, -0.353, 0.353],
      "distance_from_previous": 1.12,
      "estimated_time": "30-60 minutes",
      "difficulty": "moderate",
      "reasoning": "Shifting from worry to contentment requires releasing rumination and accepting uncertainty. This is the biggest shift in the path.",
      
      "strategies": [
        {
          "strategy_id": "uuid",
          "name": "Cognitive Reappraisal: Probability Estimation",
          "type": "cognitive_reappraisal",
          "description": "Challenge catastrophic thinking by estimating actual probability of feared outcomes.",
          "steps": [
            "Write down specific worry",
            "What's the worst that could happen? (1-100%)",
            "What's the best that could happen? (1-100%)",
            "What's most likely to happen? (1-100%)",
            "What evidence supports each scenario?",
            "How have similar situations turned out before?",
            "If worst happens, how would you cope?"
          ],
          "time_required": "20-30 minutes",
          "difficulty_level": 3,
          "evidence_level": "rct",
          "effectiveness_rating": 4.0
        }
      ]
    }
  ],
  
  "visualization_data": {
    "full_quaternion_path": [
      [0.707, -0.353, 0.494, -0.283],
      [0.707, -0.349, 0.489, -0.281],
      // ... 180 interpolated quaternions for smooth animation
      [0.707, 0.353, -0.494, 0.283]
    ],
    "waypoint_indices": [0, 60, 120, 180],
    "path_curve_points": [
      {"x": -0.5, "y": 0.7, "z": -0.4},
      {"x": -0.4, "y": 0.5, "z": -0.3},
      {"x": 0.6, "y": -0.5, "z": 0.5},
      {"x": 0.5, "y": -0.7, "z": 0.4}
    ]
  },
  
  "path_metrics": {
    "total_distance": 1.89,
    "total_estimated_time": "45-90 minutes",
    "overall_difficulty": "moderate",
    "success_probability": 0.72,
    "requires_external_support": false
  },
  
  "alternatives": [
    {
      "path_id": "uuid",
      "reasoning": "Alternative path through 'Curiosity' - may work if cognitive engagement is easier than relaxation",
      "waypoints_preview": ["Anxiety", "Interest", "Calm"],
      "difficulty": "moderate",
      "estimated_time": "60-120 minutes"
    }
  ],
  
  "personalization_notes": [
    "You've successfully completed Anxiety → Calm transitions 3 times before",
    "4-7-8 Breathing has been particularly effective for you",
    "Morning transitions tend to be more successful for you"
  ]
}
```

### POST `/observer/journey/start`

Start tracking a transition journey.

**Request:**
```json
{
  "user_id": "uuid",
  "path_id": "uuid",
  "start_time": "2024-12-04T17:00:00Z",
  "context": {
    "location": "home",
    "time_of_day": "evening",
    "has_support": false,
    "energy_level": 3
  }
}
```

**Response:**
```json
{
  "journey_id": "uuid",
  "status": "in_progress",
  "current_waypoint": 0,
  "started_at": "2024-12-04T17:00:00Z"
}
```

### POST `/observer/journey/{journey_id}/waypoint-reached`

Mark a waypoint as reached and validate emotional state.

**Request:**
```json
{
  "waypoint_index": 1,
  "reached_at": "2024-12-04T17:25:00Z",
  "self_assessment": {
    "emotion_match": 4,
    "confidence": 5
  },
  "strategies_tried": [
    {
      "strategy_id": "uuid",
      "tried": true,
      "helpful_rating": 5,
      "notes": "This really worked! Felt immediate relief."
    }
  ],
  "current_state_description": "I feel much calmer now, less racing thoughts"
}
```

**Response:**
```json
{
  "validated": true,
  "current_vac": [-0.38, 0.48, -0.28],
  "distance_to_waypoint": 0.12,
  "next_waypoint": {
    "order": 2,
    "emotion": "Contentment",
    "strategies": [...]
  }
}
```

### GET `/observer/journey/{journey_id}`

Get current journey status and progress.

### GET `/observer/user/{user_id}/journey-history`

Get user's past journeys for analytics.

### GET `/observer/user/{user_id}/effective-strategies`

Get strategies that have worked well for this user.

## Database Schema

### New Tables

#### `transition_strategies`

```sql
CREATE TABLE transition_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_name VARCHAR(200) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    detailed_steps JSONB NOT NULL,
    time_required VARCHAR(50),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    evidence_level VARCHAR(50) NOT NULL,
    research_citations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_strategy_type ON transition_strategies(strategy_type);
```

#### `transition_patterns`

```sql
CREATE TABLE transition_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    from_category VARCHAR(200) NOT NULL,
    to_category VARCHAR(200) NOT NULL,
    vac_change_characteristics JSONB NOT NULL,
    difficulty_score FLOAT NOT NULL,
    psychological_reasoning TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `pattern_strategies` (junction table)

```sql
CREATE TABLE pattern_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID REFERENCES transition_patterns(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES transition_strategies(id) ON DELETE CASCADE,
    recommendation_order INTEGER NOT NULL,
    applicability_conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_id, strategy_id)
);
```

#### `user_journeys`

```sql
CREATE TABLE user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    start_emotion_id UUID REFERENCES atlas_definitions(id),
    goal_emotion_id UUID REFERENCES atlas_definitions(id),
    start_vac FLOAT[] NOT NULL,
    goal_vac FLOAT[] NOT NULL,
    waypoints JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    current_waypoint INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    abandoned_at TIMESTAMP WITH TIME ZONE,
    context_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX idx_user_journeys_status ON user_journeys(status);
```

#### `journey_waypoints`

```sql
CREATE TABLE journey_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES user_journeys(id) ON DELETE CASCADE,
    waypoint_index INTEGER NOT NULL,
    emotion_id UUID REFERENCES atlas_definitions(id),
    vac_target FLOAT[] NOT NULL,
    reached BOOLEAN DEFAULT FALSE,
    reached_at TIMESTAMP WITH TIME ZONE,
    time_to_reach INTERVAL,
    validated_vac FLOAT[],
    distance_from_target FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journey_id, waypoint_index)
);

CREATE INDEX idx_waypoints_journey ON journey_waypoints(journey_id);
```

#### `strategy_attempts`

```sql
CREATE TABLE strategy_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES user_journeys(id) ON DELETE CASCADE,
    waypoint_index INTEGER NOT NULL,
    strategy_id UUID REFERENCES transition_strategies(id),
    tried_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    helpful_rating INTEGER CHECK (helpful_rating BETWEEN 1 AND 5),
    time_spent INTERVAL,
    user_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attempts_journey ON strategy_attempts(journey_id);
CREATE INDEX idx_attempts_strategy ON strategy_attempts(strategy_id);
```

## Implementation Classes

### Core Path Planning Service

```python
# observer/app/services/path_planner.py

from typing import List, Optional, Tuple
import numpy as np
from queue import PriorityQueue
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.atlas_definition import AtlasDefinition
from app.services.emotion_mapper import EmotionMapper

class PathPlanner:
    """
    Category-aware emotional transition path planning.
    """
    
    # Category transition difficulty matrix (0-1, higher = harder)
    CATEGORY_TRANSITIONS = {
        ("Places We Go When Things Are Uncertain or Too Much", 
         "Places We Go When Life Is Good"): 0.6,
        ("Places We Go When We Fall Short", 
         "Places We Go When Life Is Good"): 1.0,
        ("Places We Go When We Fall Short", 
         "Places We Go With Others"): 0.4,
        # ... complete 13×13 matrix
    }
    
    # Axis importance weights
    VALENCE_WEIGHT = 1.0
    AROUSAL_WEIGHT = 1.2
    CONNECTION_WEIGHT = 1.5
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.emotion_mapper = EmotionMapper(session)
    
    async def find_transition_path(
        self,
        current_vac: List[float],
        goal_vac: List[float],
        max_waypoints: int = 3,
        user_id: Optional[str] = None
    ) -> "TransitionPath":
        """
        Find optimal path from current to goal emotional state.
        
        Uses category-aware A* search with psychological constraints.
        """
        # 1. Identify current and goal emotions
        current_emotion = await self.emotion_mapper.find_nearest_by_vac_only(current_vac)
        goal_emotion = await self.emotion_mapper.find_nearest_by_vac_only(goal_vac)
        
        # 2. Check if direct transition is valid
        if self._is_direct_transition_valid(current_emotion, goal_emotion):
            return await self._create_direct_path(current_emotion, goal_emotion)
        
        # 3. Get user history for personalization
        user_history = None
        if user_id:
            user_history = await self._get_user_history(user_id)
        
        # 4. Run A* search
        path_emotions = await self._astar_search(
            current_emotion,
            goal_emotion,
            max_waypoints,
            user_history
        )
        
        # 5. Generate complete path with strategies
        return await self._build_transition_path(path_emotions, user_history)
    
    async def _astar_search(
        self,
        start: AtlasDefinition,
        goal: AtlasDefinition,
        max_waypoints: int,
        user_history: Optional[dict]
    ) -> List[AtlasDefinition]:
        """
        A* pathfinding with psychological constraints.
        """
        open_set = PriorityQueue()
        open_set.put((0, start, [start]))
        
        visited = set()
        best_paths = []
        
        while not open_set.empty() and len(best_paths) < 3:
            current_cost, current, path = open_set.get()
            
            if current.id in visited:
                continue
            
            visited.add(current.id)
            
            # Goal reached
            if current.category == goal.category:
                # Refine to exact goal emotion
                refined_path = await self._refine_to_goal(path, goal)
                best_paths.append(refined_path)
                continue
            
            # Pruning: path too long
            if len(path) > max_waypoints + 1:
                continue
            
            # Expand neighbors
            neighbors = await self._get_valid_neighbors(current, goal)
            
            for neighbor in neighbors:
                if neighbor.id not in visited:
                    g_cost = self._calculate_g_cost(path, neighbor, user_history)
                    h_cost = self._heuristic_cost(neighbor, goal)
                    f_cost = g_cost + h_cost
                    
                    new_path = path + [neighbor]
                    open_set.put((f_cost, neighbor, new_path))
        
        return best_paths[0] if best_paths else await self._fallback_path(start, goal)
    
    def _calculate_g_cost(
        self,
        path: List[AtlasDefinition],
        next_emotion: AtlasDefinition,
        user_history: Optional[dict]
    ) -> float:
        """
        Calculate cost from start to this emotion.
        """
        current = path[-1]
        
        # Base VAC distance
        vac_distance = self._vac_distance(current.vac_vector, next_emotion.vac_vector)
        
        # Category transition difficulty
        category_penalty = self.CATEGORY_TRANSITIONS.get(
            (current.category, next_emotion.category),
            0.5  # default moderate difficulty
        )
        
        # User history bonus
        history_bonus = 0.0
        if user_history:
            transition_key = (current.emotion_name, next_emotion.emotion_name)
            if transition_key in user_history.get('successful_transitions', {}):
                history_bonus = -0.3  # 30% cost reduction
        
        # Arousal ceiling penalty (don't increase high arousal)
        arousal_penalty = 0.0
        if next_emotion.vac_vector[1] > 0.5 and \
           abs(next_emotion.vac_vector[1]) > abs(current.vac_vector[1]):
            arousal_penalty = 0.5
        
        # Path length penalty (prefer shorter paths)
        length_penalty = len(path) * 0.1
        
        return vac_distance + category_penalty + history_bonus + arousal_penalty + length_penalty
    
    def _heuristic_cost(self, current: AtlasDefinition, goal: AtlasDefinition) -> float:
        """
        Admissible heuristic: Euclidean distance in VAC space.
        """
        return float(np.linalg.norm(
            np.array(current.vac_vector) - np.array(goal.vac_vector)
        ))
    
    def _vac_distance(self, vac1: List[float], vac2: List[float]) -> float:
        """
        Weighted VAC distance.
        """
        v1, a1, c1 = vac1
        v2, a2, c2 = vac2
        
        return (
            self.VALENCE_WEIGHT * abs(v1 - v2) +
            self.AROUSAL_WEIGHT * abs(a1 - a2) +
            self.CONNECTION_WEIGHT * abs(c1 - c2)
        )
    
    async def _get_valid_neighbors(
        self,
        current: AtlasDefinition,
        goal: AtlasDefinition
    ) -> List[AtlasDefinition]:
        """
        Get emotions that are valid next steps.
        
        Filters by:
        - Category transitions are allowed
        - Not too far in VAC space (< 1.5 units)
        - Generally moving toward goal
        """
        # Get all emotions in database
        all_emotions = await self._get_all_emotions()
        
        valid_neighbors = []
        for emotion in all_emotions:
            if emotion.id == current.id:
                continue
            
            # Check category transition is valid
            if not self._is_category_transition_valid(current.category, emotion.category):
                continue
            
            # Check distance is reasonable
            distance = self._vac_distance(current.vac_vector, emotion.vac_vector)
            if distance > 1.5:
                continue
            
            # Check we're generally moving toward goal
            current_to_goal = self._vac_distance(current.vac_vector, goal.vac_vector)
            neighbor_to_goal = self._vac_distance(emotion.vac_vector, goal.vac_vector)
            if neighbor_to_goal >= current_to_goal:
                # Only allow if this opens a bridge category
                if not self._is_bridge_category(emotion.category):
                    continue
            
            valid_neighbors.append(emotion)
        
        return valid_neighbors
```

## Next Steps

This design document provides the foundation for implementation. The following companion documents provide additional details:

1. **STRATEGY_LIBRARY.md** - Complete strategies for all 87 emotions
2. **CATEGORY_GRAPH.md** - Full category transition rules and rationale
3. **strategy_database_schema.sql** - Complete SQL schema with seed data
4. **TRANSITION_VISUALIZATION_SPEC.md** - Frontend implementation details
5. **TRANSITION_IMPLEMENTATION_ROADMAP.md** - Step-by-step development plan

## References

- Gross, J.J. (1998). The emerging field of emotion regulation. Review of General Psychology.
- Linehan, M.M. (2015). DBT Skills Training Manual.
- Brown, B. (2021). Atlas of the Heart.
- Hayes, S.C. (1999). Acceptance and Commitment Therapy.
- Neff, K. (2011). Self-Compassion.
