# C2: Smart Recommendations Engine - Implementation Plan

**Status:** Starting  
**Estimated Time:** 4-6 hours (simplified from 6-8)  
**Priority:** ⭐ HIGH - Discovery and exploration value  
**Date Started:** December 5, 2025

---

## 🎯 Objective

Create an intelligent recommendation system that suggests:
- Similar emotions (VAC distance-based)
- Complementary paths (interesting patterns)
- Problematic transitions (hardest paths)
- Curated journeys (shame healing, joy cultivation, etc.)

---

## 📋 Implementation Checklist

### **Phase 1: Backend Service** (3 hours)

#### **1.1: RecommendationEngine Service** (2 hours)
- [ ] Create `observer/app/services/recommendation_engine.py`
- [ ] Method: `get_similar_emotions()` - VAC distance queries
- [ ] Method: `get_complementary_paths()` - Pattern detection
- [ ] Method: `get_problematic_transitions()` - Difficulty analysis
- [ ] Method: `get_curated_journeys()` - Predefined therapeutic patterns
- [ ] Method: `_detect_path_loops()` - Circular paths
- [ ] Method: `_detect_triangles()` - 3-emotion patterns
- [ ] Method: `_analyze_category_connectivity()` - Category patterns

#### **1.2: API Endpoint** (30 minutes)
- [ ] Add to `observer/app/api/routes/atlas.py`
- [ ] `GET /atlas/recommendations?context=exploration&emotion_id=xxx`
- [ ] Response schema with all recommendation types
- [ ] Context-aware (exploration vs healing vs growth)

#### **1.3: Curated Journey Definitions** (30 minutes)
- [ ] Define 5-7 therapeutic journey patterns
- [ ] Shame healing triangle
- [ ] Joy cultivation path
- [ ] Anxiety reduction sequence
- [ ] Grief integration journey
- [ ] Connection building path

---

### **Phase 2: Frontend Integration** (1.5 hours)

#### **2.1: SmartRecommendations Component** (1 hour)
- [ ] Create `experience/web/components/admin/SmartRecommendations.tsx`
- [ ] Fetch from recommendations endpoint
- [ ] Display similar emotions
- [ ] Display complementary paths
- [ ] Display curated journeys
- [ ] One-click to apply recommendation

#### **2.2: Integrate into ControlPanel** (30 minutes)
- [ ] Add Recommendations section to ControlPanel
- [ ] Collapsible accordion
- [ ] Context selector (exploration/healing/growth)
- [ ] Visual feedback

---

### **Phase 3: Testing** (30 minutes)
- [ ] Test similar emotions suggestions
- [ ] Test curated journeys
- [ ] Test problematic transitions list
- [ ] Verify one-click apply works
- [ ] Performance check

---

## 🏗️ RecommendationEngine Architecture

```python
class RecommendationEngine:
    """
    Intelligent recommendation system for emotional exploration.
    """
    
    async def get_recommendations(
        self,
        context: str = 'exploration',
        current_emotion_id: Optional[UUID] = None,
        selected_emotions: List[UUID] = []
    ) -> Dict:
        """
        Get personalized recommendations.
        
        Returns:
        - similar_emotions: Nearest neighbors in VAC space
        - complementary_paths: Interesting patterns to explore
        - problematic_transitions: Hardest paths (research opportunities)
        - curated_journeys: Therapeutic patterns (shame healing, etc.)
        """
        
    async def get_similar_emotions(emotion_id, limit=5):
        """
        Find emotions nearest in VAC space.
        Uses database query with euclidean distance.
        """
        
    async def get_complementary_paths(selected_emotions):
        """
        Find paths that form interesting patterns:
        - Loops (A→B→C→A)
        - Triangles (shame healing)
        - Bridges (paths using bridge emotions)
        - Contrasts (opposite emotions)
        """
        
    async def get_problematic_transitions():
        """
        Query cached paths, sort by difficulty DESC.
        Return hardest 10 transitions for research.
        """
        
    async def get_curated_journeys():
        """
        Return predefined therapeutic patterns:
        - Shame Healing Triangle (Shame→Vulnerability→Compassion)
        - Joy Cultivation (Gratitude→Joy→Awe)
        - Anxiety Reduction (Anxiety→Awe→Peace)
        - Grief Integration (Grief→Acceptance→Peace)
        - Connection Building (Loneliness→Vulnerability→Belonging)
        """
```

---

## 🎨 Curated Journeys

```python
CURATED_JOURNEYS = {
    "shame_healing": {
        "name": "Shame Healing Triangle",
        "description": "Brené Brown's research-backed path from shame to compassion",
        "emotions": ["Shame", "Vulnerability", "Compassion"],
        "why_powerful": "Addresses shame's core mechanism: isolation",
        "research": "Brown (2012) - Daring Greatly",
        "estimated_time": "2-4 weeks",
        "category": "healing"
    },
    "joy_cultivation": {
        "name": "Joy Cultivation Path",
        "description": "Building sustainable joy through gratitude and awe",
        "emotions": ["Contentment", "Gratitude", "Joy", "Awe"],
        "why_powerful": "Counters foreboding joy, builds authentic happiness",
        "research": "Emmons (2007), Keltner (2023)",
        "estimated_time": "1-2 weeks",
        "category": "growth"
    },
    "anxiety_to_peace": {
        "name": "Anxiety Relief Sequence",
        "description": "From worry to peace through perspective shift",
        "emotions": ["Anxiety", "Awe", "Acceptance", "Peace"],
        "why_powerful": "Interrupts rumination with vastness, then acceptance",
        "research": "Keltner (2023), Hayes (ACT)",
        "estimated_time": "1-3 weeks",
        "category": "healing"
    },
    "grief_integration": {
        "name": "Grief Integration Journey",
        "description": "Healthy grief processing toward peace",
        "emotions": ["Grief", "Sadness", "Acceptance", "Peace"],
        "why_powerful": "Honors loss while creating space for peace",
        "research": "Kessler (2019)",
        "estimated_time": "Variable (months)",
        "category": "healing"
    },
    "connection_building": {
        "name": "Connection Building Path",
        "description": "From isolation to belonging",
        "emotions": ["Loneliness", "Vulnerability", "Compassion", "Belonging"],
        "why_powerful": "Addresses core human need for connection",
        "research": "Brown (2012)",
        "estimated_time": "2-4 weeks",
        "category": "growth"
    }
}
```

---

## 🔍 Similar Emotions Query

```sql
-- Find nearest emotions in VAC space
SELECT 
    e.id,
    e.emotion_name,
    e.category,
    e.vac_vector,
    SQRT(
        POW(e.vac_vector[1] - :target_v, 2) +
        POW(e.vac_vector[2] - :target_a, 2) +
        POW(e.vac_vector[3] - :target_c, 2)
    ) as distance
FROM atlas_definitions e
WHERE e.id != :target_id
ORDER BY distance ASC
LIMIT :limit;
```

---

## 📊 Problematic Transitions Query

```sql
-- Find hardest transitions from cache
SELECT 
    pmc.from_emotion_id,
    pmc.to_emotion_id,
    pmc.distance,
    pmc.difficulty,
    pmc.waypoint_count,
    pmc.requires_bridge,
    from_e.emotion_name as from_name,
    to_e.emotion_name as to_name
FROM path_matrix_cache pmc
JOIN atlas_definitions from_e ON pmc.from_emotion_id = from_e.id
JOIN atlas_definitions to_e ON pmc.to_emotion_id = to_e.id
WHERE pmc.difficulty = 'difficult'
ORDER BY pmc.distance DESC
LIMIT 10;
```

---

## 🎯 Success Criteria

- [ ] Similar emotions work (VAC distance)
- [ ] Curated journeys return predefined patterns
- [ ] Problematic transitions list hardest paths
- [ ] Frontend displays recommendations beautifully
- [ ] One-click apply selects recommended emotions
- [ ] Context-aware (exploration vs healing)
- [ ] Performance: <100ms for recommendations
- [ ] No regressions

---

## 🚀 Implementation Order

1. **RecommendationEngine Service** (similar emotions + curated journeys)
2. **API Endpoint** (/atlas/recommendations)
3. **Test Backend** (Swagger verification)
4. **Frontend Component** (SmartRecommendations.tsx)
5. **ControlPanel Integration**
6. **Browser Testing**

---

**Ready to implement!**  
**Starting with:** RecommendationEngine Service
