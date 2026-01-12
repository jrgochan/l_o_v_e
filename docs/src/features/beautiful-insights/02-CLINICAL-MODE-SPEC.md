# Clinical Mode - Detailed Specification

## Assessment for Clinical Action

---

## 🎯 Purpose

In Clinical Mode, insights should help clinicians:

1. **Assess** patient state quickly and accurately
2. **Identify** intervention points and priorities
3. **Document** observations with evidence
4. **Plan** therapeutic response strategies

---

## 📐 Data Structure

### **Python Return Object** (`insight_generator.py`)

```python
{
  "mode": "clinical",
  "structured": True,
  "emotion": "Anxiety",
  "category": "Negative High-Energy",
  "vac": {"valence": -0.45, "arousal": 0.72, "connection": -0.23},
  "confidence": 0.87,
  
  # Structured clinical sections
  "assessment_summary": str,  # 1-2 sentence clinical state
  "quadrant_classification": str,  # VAC quadrant + significance
  
  "biomarkers": {
    "vocal": {
      "pitch": {"value": float, "interpretation": str, "indicator": "↑" | "↓" | "="},
      "energy": {"value": float, "interpretation": str, "indicator": str},
      "rate": {"value": float, "interpretation": str, "indicator": str},
      "quality": str  # "Moderate tension", "Good", etc.
    },
    "emotional": {
      "valence": {"value": float, "clinical_sig": str},
      "arousal": {"value": float, "clinical_sig": str, "indicator": "↑↑" | "↑" | "=" | "↓" | "↓↓"},
      "connection": {"value": float, "clinical_sig": str}
    }
  },
  
  "recommended_interventions": [
    {
      "priority": int,  # 1 = highest
      "type": "grounding" | "validation" | "exploration" | "reframe" | "skill",
      "technique": str,  # Name of technique
      "rationale": str,  # Why this technique
      "script": str,  # What to say/do
      "evidence": str  # Brief citation
    }
  ],
  
  "differential_emotions": [  # For ruling out similar states
    {"name": str, "category": str, "note": str}
  ],
  
  "clinical_alerts": [...],  # Already have from clinical_alert_service
  "session_analytics": {...},  # Already have from session_analytics_service
  
  # Legacy fields
  "summary": str,
  "guidance": str,
  "recommendations": []
}
```

---

## ✍️ Content Generation Rules

### **1. Assessment Summary**

#### Template: "Patient presents with [emotion] ([confidence]% confidence), [arousal state], [valence state]"

#### Examples

```python
def _generate_assessment_summary(emotion, confidence, vac_data):
    emotion_name = emotion['name']
    valence = vac_data['valence']
    arousal = vac_data['arousal']
    
    # Arousal state
    if arousal > 0.5:
        arousal_state = "high arousal state"
    elif arousal < -0.5:
        arousal_state = "low arousal state"
    else:
        arousal_state = "moderate arousal"
    
    # Valence state  
    if valence > 0.3:
        valence_state = "positive valence"
    elif valence < -0.3:
        valence_state = "negative valence"
    else:
        valence_state = "neutral valence"
    
    return f"Patient presents with {emotion_name} ({confidence:.0%} confidence), {arousal_state}, {valence_state}"

# Examples:
"Patient presents with Anxiety (87% confidence), high arousal state, negative valence"
"Patient presents with Contentment (92% confidence), low arousal state, positive valence"
```

### **2. Quadrant Classification**

```python
def _generate_quadrant_classification(vac_data):
    v, a, c = vac_data['valence'], vac_data['arousal'], vac_data['connection']
    
    # Determine quadrant
    if v > 0 and a > 0:
        quadrant = "Positive high-energy"
        significance = "Indicates activation with positive affect (clinically favorable)"
    elif v > 0 and a < 0:
        quadrant = "Positive low-energy"
        significance = "Indicates contentment/calm (therapeutically valuable state)"
    elif v < 0 and a > 0:
        quadrant = "Negative high-energy"
        significance = "Indicates distress with activation (intervention target)"
    else:
        quadrant = "Negative low-energy"
        significance = "Indicates depression/withdrawal (requires attention)"
    
    # Add connection modifier
    if c < -0.5:
        significance += "; significant disconnection present"
    elif c > 0.5:
        significance += "; strong connection (therapeutic resource)"
    
    return f"{quadrant} ({significance})"
```

### **3. Biomarkers**

#### Vocal Biomarkers

```python
def _generate_vocal_biomarkers(prosody_data):
    biomarkers = {"vocal": {}}
    
    # Pitch
    pitch = prosody_data.get('pitch_mean')
    if pitch:
        if pitch > 180:
            interp = "Elevated (stress indicator)"
            indicator = "↑"
        elif pitch < 120:
            interp = "Low (depression indicator)"
            indicator = "↓"
        else:
            interp = "Normal range"
            indicator = "="
        
        biomarkers["vocal"]["pitch"] = {
            "value": pitch,
            "interpretation": interp,
            "indicator": indicator
        }
    
    # Energy
    energy = prosody_data.get('energy')
    if energy:
        if energy > 0.7:
            interp = "High activation"
            indicator = "↑"
        elif energy < 0.3:
            interp = "Low activation"
            indicator = "↓"
        else:
            interp = "Moderate"
            indicator = "="
        
        biomarkers["vocal"]["energy"] = {
            "value": energy,
            "interpretation": interp,
            "indicator": indicator
        }
    
    # Rate
    rate = prosody_data.get('rate')
    if rate:
        if rate > 5.0:
            interp = "Rapid speech (cognitive acceleration)"
            indicator = "↑"
        elif rate < 3.0:
            interp = "Slow speech (psychomotor retardation)"
            indicator = "↓"
        else:
            interp = "Normal rate"
            indicator = "="
        
        biomarkers["vocal"]["rate"] = {
            "value": rate,
            "interpretation": interp,
            "indicator": indicator
        }
    
    # Voice quality
    jitter = prosody_data.get('jitter', 0)
    if jitter > 0.02:
        biomarkers["vocal"]["quality"] = "Moderate tension detected"
    elif jitter > 0.05:
        biomarkers["vocal"]["quality"] = "Significant vocal tension"
    else:
        biomarkers["vocal"]["quality"] = "Good voice quality"
    
    return biomarkers
```

#### Emotional Biomarkers

```python
def _generate_emotional_biomarkers(vac_data):
    biomarkers = {"emotional": {}}
    
    v, a, c = vac_data['valence'], vac_data['arousal'], vac_data['connection']
    
    # Valence
    if v > 0.5:
        sig = "Strong positive affect"
    elif v > 0:
        sig = "Mild positive affect"
    elif v > -0.5:
        sig = "Mild negative affect"
    else:
        sig = "Significant negative affect"
    
    biomarkers["emotional"]["valence"] = {
        "value": v,
        "clinical_sig": sig
    }
    
    # Arousal
    if a > 0.7:
        sig = "High activation (↑↑ sympathetic)"
        indicator = "↑↑"
    elif a > 0.3:
        sig = "Moderate activation (↑ sympathetic)"
        indicator = "↑"
    elif a > -0.3:
        sig = "Balanced autonomic state"
        indicator = "="
    elif a > -0.7:
        sig = "Low activation (↓ parasympathetic)"
        indicator = "↓"
    else:
        sig = "Very low activation (↓↓ shutdown)"
        indicator = "↓↓"
    
    biomarkers["emotional"]["arousal"] = {
        "value": a,
        "clinical_sig": sig,
        "indicator": indicator
    }
    
    # Connection
    if c < -0.5:
        sig = "Significant disconnection (isolation risk)"
    elif c < 0:
        sig = "Mild disconnection"
    elif c > 0.5:
        sig = "Strong connection (therapeutic resource)"
    else:
        sig = "Moderate connection"
    
    biomarkers["emotional"]["connection"] = {
        "value": c,
        "clinical_sig": sig
    }
    
    return biomarkers
```

### **4. Recommended Interventions**

#### Intervention Database

```python
INTERVENTIONS = {
    "grounding": {
        "5-4-3-2-1": {
            "rationale": "High arousal indicates need for nervous system regulation",
            "script": "Can you tell me 5 things you see, 4 things you can touch, 3 things you hear, 2 things you can smell, and 1 thing you can taste?",
            "evidence": "Effective for acute anxiety (Bourne, 2015)"
        },
        "body_scan": {
            "rationale": "Dissociation or disconnection from body sensations",
            "script": "Let's do a quick body scan. Starting with your feet, what sensations do you notice?",
            "evidence": "MBSR core technique (Kabat-Zinn)"
        }
    },
    "validation": {
        "emotion_validation": {
            "rationale": "All emotions serve a function; validate before addressing",
            "script": "It makes complete sense you're feeling [emotion] given what you're experiencing. This emotion is trying to help you...",
            "evidence": "DBT emotion regulation module (Linehan)"
        }
    },
    "exploration": {
        "threat_assessment": {
            "rationale": "Anxiety often responds to reality-testing",
            "script": "What specifically are you worried might happen? And if that did happen, then what?",
            "evidence": "CBT core technique for anxiety"
        },
        "values_clarification": {
            "rationale": "Connect emotion to underlying values",
            "script": "This emotion seems to be protecting something important to you. What might that be?",
            "evidence": "ACT values work (Hayes et al.)"
        }
    },
    "reframe": {
        "cognitive_reframe": {
            "rationale": "Challenge distorted thinking patterns",
            "script": "Let's look at the evidence for and against that thought...",
            "evidence": "CBT cognitive restructuring"
        }
    }
}
```

#### Selection Logic

```python
def _generate_recommended_interventions(emotion, vac_data, prosody_data, alerts):
    interventions = []
    priority = 1
    
    arousal = vac_data['arousal']
    valence = vac_data['valence']
    connection = vac_data['connection']
    
    # Priority 1: Address acute distress (high arousal + negative)
    if arousal > 0.7 and valence < -0.3:
        interventions.append({
            "priority": priority,
            "type": "grounding",
            "technique": "5-4-3-2-1 Sensory Grounding",
            **INTERVENTIONS["grounding"]["5-4-3-2-1"]
        })
        priority += 1
    
    # Priority 2: Always validate the emotion
    interventions.append({
        "priority": priority,
        "type": "validation",
        "technique": "Emotion Validation",
        **INTERVENTIONS["validation"]["emotion_validation"]
    })
    priority += 1
    
    # Priority 3: Explore based on emotion type
    if emotion['name'].lower() in ['anxiety', 'worry', 'fear']:
        interventions.append({
            "priority": priority,
            "type": "exploration",
            "technique": "Threat Assessment",
            **INTERVENTIONS["exploration"]["threat_assessment"]
        })
    else:
        interventions.append({
            "priority": priority,
            "type": "exploration",
            "technique": "Values Clarification",
            **INTERVENTIONS["exploration"]["values_clarification"]
        })
    
    return interventions[:3]  # Max 3 interventions
```

---

## 🎨 Visual Design

### **Container**

```css
bg-gray-800
border border-blue-500/50
rounded-lg p-5 space-y-4
max-w-2xl
```

### **Section Styling**

#### Assessment Header

- Large emotion name: text-lg font-bold text-blue-300
- Confidence: text-2xl font-bold text-blue-400
- Category: text-xs text-gray-400

#### Clinical Alerts

- Background: bg-red-900/20
- Border: border-red-500/50
- Use existing AlertBadge component

#### Biomarkers Grid

- 2-column layout
- Vocal (left) vs Emotional (right)
- Monospace values
- Indicators (↑↑, ↑, =, ↓, ↓↓) for quick scanning

#### Interventions

- Numbered list (ordered by priority)
- Technique name: font-medium text-white
- Script: text-xs text-blue-200 bg-blue-900/20 p-2 rounded
- Evidence: text-xs text-gray-400 italic

#### Session Context

- Background: bg-gray-700/50
- Compact grid layout
- text-xs

---

## 📝 Complete Example

### **Anxiety with High Arousal**

```json
{
  "mode": "clinical",
  "structured": true,
  "emotion": "Anxiety",
  "category": "Negative High-Energy",
  "vac": {"valence": -0.45, "arousal": 0.72, "connection": -0.23},
  "confidence": 0.87,
  
  "assessment_summary": "Patient presents with Anxiety (87% confidence), high arousal state (+0.72), negative valence (-0.45)",
  
  "quadrant_classification": "Negative high-energy (Indicates distress with activation - intervention target)",
  
  "biomarkers": {
    "vocal": {
      "pitch": {
        "value": 187.3,
        "interpretation": "Elevated (stress indicator)",
        "indicator": "↑"
      },
      "energy": {
        "value": 0.742,
        "interpretation": "High activation",
        "indicator": "↑"
      },
      "rate": {
        "value": 5.2,
        "interpretation": "Rapid speech (cognitive acceleration)",
        "indicator": "↑"
      },
      "quality": "Moderate tension detected"
    },
    "emotional": {
      "valence": {
        "value": -0.45,
        "clinical_sig": "Moderate negative affect"
      },
      "arousal": {
        "value": 0.72,
        "clinical_sig": "High activation (↑↑ sympathetic)",
        "indicator": "↑↑"
      },
      "connection": {
        "value": -0.23,
        "clinical_sig": "Mild disconnection"
      }
    }
  },
  
  "recommended_interventions": [
    {
      "priority": 1,
      "type": "grounding",
      "technique": "5-4-3-2-1 Sensory Grounding",
      "rationale": "High arousal indicates need for nervous system regulation",
      "script": "Can you tell me 5 things you see, 4 things you can touch, 3 things you hear, 2 things you can smell, and 1 thing you can taste?",
      "evidence": "Effective for acute anxiety (Bourne, 2015)"
    },
    {
      "priority": 2,
      "type": "validation",
      "technique": "Emotion Validation",
      "rationale": "Validate protective function before addressing symptoms",
      "script": "It makes complete sense you're feeling anxious given what you're experiencing. Anxiety is trying to help you prepare and protect yourself.",
      "evidence": "DBT emotion regulation module (Linehan)"
    },
    {
      "priority": 3,
      "type": "exploration",
      "technique": "Threat Assessment",
      "rationale": "Anxiety often responds to reality-testing of feared outcomes",
      "script": "What specifically are you worried might happen? And if that did happen, then what?",
      "evidence": "CBT core technique for anxiety disorders"
    }
  ],
  
  "differential_emotions": [
    {"name": "Panic", "category": "Negative High-Energy", "note": "Monitor if arousal increases >0.9"},
    {"name": "Worry", "category": "Negative High-Energy", "note": "Related but more cognitive-focused"},
    {"name": "Fear", "category": "Negative High-Energy", "note": "Consider if specific threat identified"}
  ],
  
  "clinical_alerts": [
    {
      "level": "warning",
      "type": "high_arousal",
      "message": "Arousal +0.72 exceeds threshold (+0.70)",
      "suggestion": "Consider grounding techniques"
    }
  ],
  
  "session_analytics": {
    "emotion_count": 3,
    "average_confidence": 0.82,
    "alert_counts": {"critical": 0, "warning": 1, "attention": 0}
  }
}
```

---

## 🎯 Intervention Selection Algorithm

```python
def _select_interventions_by_priority(emotion, vac_data, prosody_data, alerts):
    """
    Smart intervention selection based on clinical priorities.
    """
    candidates = []
    
    v, a, c = vac_data['valence'], vac_data['arousal'], vac_data['connection']
    
    # ACUTE: High arousal + negative = immediate regulation needed
    if a > 0.7 and v < -0.3:
        candidates.append((1, "grounding", "5-4-3-2-1"))
    
    # SAFETY: Check for critical alerts
    if any(alert['level'] == 'critical' for alert in alerts):
        candidates.append((1, "safety", "risk_assessment"))
    
    # FOUNDATION: Always validate
    candidates.append((2, "validation", "emotion_validation"))
    
    # EXPLORATION: Emotion-specific
    if emotion['name'].lower() in ['anxiety', 'worry', 'fear']:
        candidates.append((3, "exploration", "threat_assessment"))
    elif emotion['name'].lower() in ['sadness', 'grief']:
        candidates.append((3, "exploration", "meaning_making"))
    elif emotion['name'].lower() in ['anger', 'frustration']:
        candidates.append((3, "exploration", "boundary_violation"))
    else:
        candidates.append((3, "exploration", "values_clarification"))
    
    # SKILL: If low energy + disconnection
    if a < -0.5 and c < -0.5:
        candidates.append((3, "skill", "behavioral_activation"))
    
    # Sort by priority and return top 3
    candidates.sort(key=lambda x: x[0])
    return [build_intervention(*c) for c in candidates[:3]]
```

---

## 📊 Evidence Citations Library

```python
EVIDENCE_CITATIONS = {
    "grounding": "Bourne, E.J. (2015). The Anxiety & Phobia Workbook",
    "dbt_validation": "Linehan, M.M. - DBT Skills Training Manual",
    "cbt_anxiety": "Beck, A.T. - Cognitive Therapy for Anxiety Disorders",
    "act_values": "Hayes, S.C. et al. - Acceptance and Commitment Therapy",
    "mbsr": "Kabat-Zinn, J. - Mindfulness-Based Stress Reduction",
    "behavioral_activation": "Martell et al. - Behavioral Activation for Depression",
    "emotion_focused": "Greenberg, L.S. - Emotion-Focused Therapy",
    "polyvagal": "Porges, S.W. - Polyvagal Theory"
}
```

---

**Next**: See `03-DEEP-FEELING-ENHANCEMENTS.md` for multi-emotion features
