# Deep Feeling Mode - Multi-Emotion Enhancements

## Synthesis & Complexity

---

## 🎯 Purpose

When Deep Feeling mode detects multiple emotions, insights should:

### Warm Mode

- Validate emotional complexity
- Synthesize emotions into coherent narrative
- Explain relationships in accessible language
- Provide integrated guidance

### Clinical Mode

- Assess complexity and clarity scores
- Analyze relationship patterns
- Prioritize interventions based on prominence
- Document multi-emotion presentation

---

## 📐 Additional Data Fields

Both modes add these fields when `deepFeelingMode = True`:

### Warm Mode Additions

```python
{
  # ... base warm mode fields ...
  
  # Deep Feeling additions
  "multi_emotion_narrative": str,  # Synthesis of complexity
  "relationship_insights": [str],  # How emotions interact (accessible)
  "integrated_guidance": str,  # Guidance considering all emotions
  "primary_emotion_focus": {  # Keep user grounded
    "name": str,
    "reason": str  # Why this is primary
  }
}
```

### Clinical Mode Additions

```python
{
  # ... base clinical mode fields ...
  
  # Deep Feeling additions
  "complexity_assessment": str,  # Clinical interpretation of complexity
  "pattern_analysis": str,  # Relationship pattern (masking, etc.)
  "intervention_prioritization": str,  # Which emotion to address first
  "multi_emotion_summary": {
    "primary": {"name": str, "prominence": float},
    "secondary": [{"name": str, "prominence": float}],
    "relationships": [{"type": str, "strength": float, "clinical_sig": str}]
  }
}
```

---

## ✍️ Warm Mode Content Generation

### 1. Multi-Emotion Narrative

**Purpose**: Help user understand they're experiencing complexity (not chaos)

**Templates:**

```python
def _generate_multi_emotion_narrative(emotions, relationships, aggregate):
    primary = [e for e in emotions if e['prominence'] == 'primary'][0]
    secondary = [e for e in emotions if e['prominence'] == 'secondary']
    
    # Opening
    if len(emotions) == 2:
        narrative = f"I'm sensing a blend of {primary['emotion_name'].lower()} and {secondary[0]['emotion_name'].lower()}. "
    elif len(emotions) == 3:
        narrative = f"I'm sensing something complex here - primarily {primary['emotion_name'].lower()}, but also {secondary[0]['emotion_name'].lower()} and {secondary[1]['emotion_name'].lower()}. "
    else:
        narrative = f"You're experiencing a rich emotional landscape right now - {primary['emotion_name'].lower()} is most prominent, with several other emotions present. "
    
    # Complexity validation
    complexity = aggregate['complexity_score']
    if complexity > 0.7:
        narrative += "This is what I call emotional complexity - you're not just feeling one thing, you're experiencing multiple valid emotions at once. This is actually a sign of emotional depth and self-awareness."
    else:
        narrative += "These emotions are related and make sense together - they're all responding to what you're experiencing."
    
    return narrative
```

### 2. Relationship Insights

**Purpose**: Explain how emotions interact in accessible terms

```python
RELATIONSHIP_TEMPLATES = {
    "masking": {
        "template": "{emotion_a} might be protecting you from fully feeling the {emotion_b}",
        "example": "Anxiety might be protecting you from fully feeling the sadness underneath"
    },
    "complementary": {
        "template": "{emotion_a} and {emotion_b} are working together, both responding to the same situation",
        "example": "Anxiety and excitement are working together - both are high-energy responses to something important"
    },
    "contradictory": {
        "template": "{emotion_a} and {emotion_b} are pulling you in different directions, which can feel confusing",
        "example": "Anger and guilt are pulling you in different directions - anger wants you to act, guilt wants you to hold back"
    },
    "amplifying": {
        "template": "{emotion_a} is intensifying the {emotion_b} you're experiencing",
        "example": "Frustration is intensifying the anxiety - they're feeding each other"
    },
    "sequential": {
        "template": "{emotion_a} seems to be leading toward {emotion_b} - one following the other",
        "example": "Disappointment seems to be leading toward sadness - a natural emotional sequence"
    }
}

def _generate_relationship_insights(relationships):
    insights = []
    
    for rel in relationships[:3]:  # Max 3 relationships
        template = RELATIONSHIP_TEMPLATES[rel['type']]['template']
        insight = template.format(
            emotion_a=rel['emotion_a'].lower(),
            emotion_b=rel['emotion_b'].lower()
        )
        insights.append(insight)
    
    return insights
```

### 3. Integrated Guidance

**Purpose**: Provide guidance that considers all emotions together

```python
def _generate_integrated_guidance(emotions, relationships, aggregate):
    primary = [e for e in emotions if e['prominence'] == 'primary'][0]
    
    # Start with primary
    guidance = f"Given this complexity, I'd suggest starting with the {primary['emotion_name'].lower()} - it's the most accessible right now. "
    
    # Check for masking pattern
    masking_rels = [r for r in relationships if r['type'] == 'masking']
    if masking_rels:
        masked = masking_rels[0]['emotion_b']
        guidance += f"As you work with that, you might notice the {masked.lower()} that's beneath it. That's okay - emotions often reveal themselves in layers."
    
    # Check for contradictory pattern
    contradictory = [r for r in relationships if r['type'] == 'contradictory']
    if contradictory:
        guidance += " The conflicting feelings you're experiencing are real - sometimes we need to hold multiple truths at once."
    
    # Add grounding if high complexity
    if aggregate['complexity_score'] > 0.7:
        guidance += " When emotions feel this complex, it can help to focus on just one breath at a time."
    
    return guidance
```

---

## ✍️ Clinical Mode Content Generation

### 1. Complexity Assessment

```python
def _generate_complexity_assessment(emotions, aggregate):
    complexity = aggregate['complexity_score']
    clarity = aggregate['emotional_clarity']
    pattern = aggregate['temporal_pattern']
    
    # Base assessment
    if complexity > 0.7:
        assessment = "Multi-emotion presentation with high complexity score (>0.7) suggests "
    else:
        assessment = "Multi-emotion presentation with moderate complexity suggests "
    
    # Add pattern
    if pattern == "concurrent":
        assessment += "concurrent emotional activation. "
    elif pattern == "sequential":
        assessment += "sequential emotional transitions. "
    else:
        assessment += "emerging emotional pattern (developing state). "
    
    # Add clarity interpretation
    if clarity < 0.5:
        assessment += "Low emotional clarity (<0.5) indicates conflicted/ambivalent state."
    else:
        assessment += f"Emotional clarity score of {clarity:.2f} suggests patient has some insight."
    
    return assessment
```

### 2. Pattern Analysis

```python
def _generate_pattern_analysis(relationships):
    if not relationships:
        return "No significant emotion relationships detected"
    
    # Identify dominant pattern
    masking = [r for r in relationships if r['type'] == 'masking']
    contradictory = [r for r in relationships if r['type'] == 'contradictory']
    
    if masking:
        rel = masking[0]
        analysis = f"{rel['emotion_a']}-masking-{rel['emotion_b']} pattern detected "
        analysis += f"(common defensive/avoidance mechanism; strength: {rel['strength']:.2f})"
    elif contradictory:
        rel = contradictory[0]
        analysis = f"{rel['emotion_a']}-{rel['emotion_b']} contradictory pattern "
        analysis += f"(ambivalence indicator; strength: {rel['strength']:.2f})"
    else:
        rel = relationships[0]
        analysis = f"{rel['type'].capitalize()} relationship pattern between {rel['emotion_a']} and {rel['emotion_b']}"
    
    return analysis
```

### 3. Intervention Prioritization

```python
def _generate_intervention_prioritization(emotions, relationships):
    primary = [e for e in emotions if e['prominence'] == 'primary'][0]
    secondary = [e for e in emotions if e['prominence'] == 'secondary']
    
    priority = f"Address {primary['emotion_name']} first "
    
    # Check prominence scores
    if primary.get('prominence_score', 1.0) > 0.7:
        priority += "(high prominence; most accessible to patient), "
    else:
        priority += "(moderate prominence; patient awareness present), "
    
    # Check for masking
    masking = [r for r in relationships if r['type'] == 'masking']
    if masking:
        masked = masking[0]['emotion_b']
        priority += f"then gently explore underlying {masked} (masking pattern detected). "
    
    # Add complexity note
    if len(emotions) > 2:
        priority += "Monitor for additional emotions emerging as primary is addressed."
    
    return priority
```

---

## 📝 Complete Example - Deep Feeling Mode

### Warm Mode: Anxiety + Sadness + Frustration

```json
{
  "mode": "warm",
  "structured": true,
  "emotion": "Anxiety",
  
  "opening": "I sense you're experiencing something complex right now. The most prominent feeling is anxiety, but there's more beneath the surface.",
  
  "multi_emotion_narrative": "I'm sensing a blend of anxiety, sadness, and frustration. This is what I call emotional complexity - you're not just feeling one thing, you're experiencing multiple valid emotions at once. This is actually a sign of emotional depth and self-awareness.",
  
  "voice_observations": [
    "Your voice has tension and energy from the anxiety",
    "There's also a heaviness that suggests sadness",
    "You're speaking quickly, as if trying to outrun the feelings"
  ],
  
  "relationship_insights": [
    "Anxiety might be protecting you from fully feeling the sadness underneath",
    "The frustration seems to be directed at yourself for feeling anxious",
    "These emotions are actually trying to work together, even though it feels chaotic"
  ],
  
  "primary_emotion_focus": {
    "name": "Anxiety",
    "reason": "This is the most accessible emotion right now - the one you're most aware of"
  },
  
  "emotion_understanding": "Anxiety is your mind's protective response, but when it's layered with sadness and frustration, it becomes more complex. Each emotion is valid and telling you something important.",
  
  "vac_interpretation": {
    "energy_state": "You're in a high-activation state, though the sadness is pulling you toward lower energy",
    "emotional_tone": "This blend feels difficult - the anxiety is intense and the sadness is heavy",
    "connection_quality": "You might feel quite alone with all of this"
  },
  
  "gentle_invitations": [
    {
      "type": "reflection",
      "text": "What would it be like to acknowledge all of these feelings without needing to fix any of them?"
    },
    {
      "type": "suggestion",
      "text": "You might try naming each emotion out loud: 'I'm feeling anxiety... and sadness... and frustration...'"
    }
  ],
  
  "integrated_guidance": "Given this complexity, I'd suggest starting with the anxiety - it's the most accessible right now. As you work with that, you might notice the sadness that's beneath it. That's okay - emotions often reveal themselves in layers."
}
```

### Clinical Mode: Same Scenario

```json
{
  "mode": "clinical",
  "structured": true,
  
  "assessment_summary": "Patient presents with multi-emotion state: Anxiety (primary, 87% confidence), Sadness (secondary, 72%), Frustration (underlying, 58%)",
  
  "complexity_assessment": "Multi-emotion presentation with high complexity score (0.78) suggests concurrent emotional activation. Low emotional clarity (0.45) indicates conflicted/ambivalent state.",
  
  "pattern_analysis": "Anxiety-masking-Sadness pattern detected (common avoidance/defensive mechanism; strength: 0.82). Clinical significance: Patient may be aware of anxiety but not underlying sadness.",
  
  "multi_emotion_summary": {
    "primary": {"name": "Anxiety", "prominence": 0.72},
    "secondary": [
      {"name": "Sadness", "prominence": 0.58},
      {"name": "Frustration", "prominence": 0.31}
    ],
    "relationships": [
      {
        "type": "masking",
        "emotions": "Anxiety → Sadness",
        "strength": 0.82,
        "clinical_sig": "Defensive avoidance mechanism active"
      },
      {
        "type": "contradictory",
        "emotions": "Anxiety ↔ Frustration",
        "strength": 0.45,
        "clinical_sig": "Self-directed frustration about anxiety (meta-emotion)"
      }
    ]
  },
  
  "intervention_prioritization": "Address Anxiety first (high prominence; most accessible to patient), then gently explore underlying Sadness (masking pattern detected). Monitor for Frustration escalation.",
  
  "recommended_interventions": [
    {
      "priority": 1,
      "type": "grounding",
      "technique": "Layered Grounding",
      "rationale": "Multi-emotion state requires acknowledging complexity before regulation",
      "script": "I hear you're experiencing several emotions at once. Let's name them together: anxiety... sadness... frustration. Now let's ground in the present moment...",
      "evidence": "IFS parts work + grounding (Schwartz)"
    },
    {
      "priority": 2,
      "type": "validation",
      "technique": "Complexity Validation",
      "rationale": "Normalize multi-emotion experience before intervention",
      "script": "It makes complete sense you're feeling multiple emotions at once. Human emotional experience is complex, and what you're experiencing is actually quite common.",
      "evidence": "Emotion-Focused Therapy (Greenberg)"
    },
    {
      "priority": 3,
      "type": "exploration",
      "technique": "Pattern Exploration",
      "rationale": "Masking pattern suggests underlying emotion needs attention",
      "script": "I'm wondering if the anxiety might be protecting you from something else. What happens if we gently turn toward the sadness?",
      "evidence": "Psychodynamic defenses (Freud/modern)"
    }
  ]
}
```

---

## 🌊 Narrative Templates

### Warm Mode - Multi-Emotion Openings

```python
MULTI_EMOTION_OPENINGS = {
    2: "I'm sensing a blend of {primary} and {secondary}. This makes sense - they're both responding to what you're experiencing.",
    
    3: "I'm sensing something complex here - primarily {primary}, but also {sec1} and {sec2}. You're experiencing multiple emotions at once, which shows emotional depth.",
    
    "4+": "You're experiencing a rich emotional landscape right now. {primary} is most prominent, with several other emotions present. This complexity is meaningful - you're processing something important."
}
```

### Relationship Explanation Templates

Already defined in previous section, but here's the warm tone framing:

```python
def _generate_relationship_insights_warm(relationships):
    insights = []
    
    for rel in relationships[:3]:
        emotion_a = rel['emotion_a'].lower()
        emotion_b = rel['emotion_b'].lower()
        rel_type = rel['type']
        
        if rel_type == 'masking':
            insight = f"{emotion_a.capitalize()} might be protecting you from fully feeling the {emotion_b}"
        elif rel_type == 'complementary':
            insight = f"{emotion_a.capitalize()} and {emotion_b} are working together, both responding to the same thing"
        elif rel_type == 'contradictory':
            insight = f"{emotion_a.capitalize()} and {emotion_b} are pulling you in different directions, which can feel confusing"
        elif rel_type == 'amplifying':
            insight = f"{emotion_a.capitalize()} is intensifying the {emotion_b} - they're feeding each other"
        elif rel_type == 'sequential':
            insight = f"{emotion_a.capitalize()} seems to be leading toward {emotion_b} - one following the other"
        
        insights.append(insight)
    
    return insights
```

---

## 🔬 Clinical Mode - Pattern Analysis

### Relationship Pattern Library

```python
CLINICAL_RELATIONSHIP_PATTERNS = {
    "masking": {
        "description": "Defensive avoidance mechanism",
        "clinical_significance": "Patient aware of surface emotion but not underlying; explore gently",
        "intervention_note": "Address masking emotion first, then invite exploration of masked emotion",
        "examples": ["Anxiety masking Sadness", "Anger masking Fear", "Frustration masking Disappointment"]
    },
    "contradictory": {
        "description": "Ambivalence or internal conflict",
        "clinical_significance": "Patient experiencing competing motivations/needs",
        "intervention_note": "Help patient hold both emotions; avoid forcing resolution",
        "examples": ["Love-Hate", "Desire-Fear", "Hope-Despair"]
    },
    "complementary": {
        "description": "Emotions serving similar function",
        "clinical_significance": "Coherent emotional response to situation",
        "intervention_note": "Reinforce adaptive multi-emotion experience",
        "examples": ["Joy + Gratitude", "Anxiety + Concern", "Anger + Frustration"]
    }
}
```

### Multi-Emotion Summary Generation

```python
def _generate_multi_emotion_summary_clinical(emotions, relationships):
    primary = [e for e in emotions if e['prominence'] == 'primary'][0]
    secondary = [e for e in emotions if e['prominence'] == 'secondary']
    
    summary = {
        "primary": {
            "name": primary['emotion_name'],
            "prominence": primary.get('prominence_score', 1.0)
        },
        "secondary": [
            {
                "name": e['emotion_name'],
                "prominence": e.get('prominence_score', 0.5)
            }
            for e in secondary
        ],
        "relationships": []
    }
    
    # Add relationship clinical significance
    for rel in relationships:
        pattern_info = CLINICAL_RELATIONSHIP_PATTERNS.get(rel['type'], {})
        summary["relationships"].append({
            "type": rel['type'],
            "emotions": f"{rel['emotion_a']} → {rel['emotion_b']}" if rel['type'] in ['masking', 'sequential'] else f"{rel['emotion_a']} ↔ {rel['emotion_b']}",
            "strength": rel['strength'],
            "clinical_sig": pattern_info.get('clinical_significance', 'Relationship detected')
        })
    
    return summary
```

---

## 🎨 Visual Additions

### Warm Mode - Deep Feeling Sections

#### Multi-Emotion Narrative (added after opening)

```css
bg-purple-500/10
border-l-2 border-purple-400
pl-4 p-3
text-purple-100 text-sm italic
```

#### Relationship Insights (added after VAC interpretation)

```css
bg-cyan-500/10
rounded-lg p-3
space-y-1
Title: text-cyan-400
Items: text-cyan-200 text-sm
```

#### Integrated Guidance (replaces simple guidance)

```css
bg-gradient-to-r from-amber-500/10 to-rose-500/10
border border-amber-400/30
rounded-lg p-3
text-amber-100 text-sm
```

### Clinical Mode - Deep Feeling Sections

#### Complexity Assessment (added after quadrant)

```css
bg-purple-900/20
border border-purple-500/30
rounded p-3
text-xs text-purple-200
```

#### Pattern Analysis (after biomarkers)

```css
bg-blue-900/20
border-l-4 border-blue-400
p-3
Title: text-blue-300 font-semibold
Content: text-blue-100 text-xs
```

#### Multi-Emotion Summary Table

```css
grid grid-cols-2 gap-2
text-xs
Primary highlighted: bg-blue-600/20
Secondary: bg-gray-700/50
```

---

## 📋 Implementation Checklist

### Backend (Deep Feeling)

- [ ] Add `_generate_multi_emotion_narrative()` method
- [ ] Add `_generate_relationship_insights()` method
- [ ] Add `_generate_integrated_guidance()` method
- [ ] Add `_generate_complexity_assessment()` method
- [ ] Add `_generate_pattern_analysis()` method
- [ ] Add `_generate_intervention_prioritization()` method
- [ ] Update `generate_insights()` to call Deep Feeling methods when applicable

### Frontend (Deep Feeling)

- [ ] Add MultiEmotionNarrative section to WarmInsightCard
- [ ] Add RelationshipInsights section to WarmInsightCard
- [ ] Add IntegratedGuidance section to WarmInsightCard
- [ ] Add ComplexityAssessment section to ClinicalInsightCard
- [ ] Add PatternAnalysis section to ClinicalInsightCard
- [ ] Add MultiEmotionSummary table to ClinicalInsightCard

---

**Next**: See `04-IMPLEMENTATION-GUIDE.md` for step-by-step implementation
