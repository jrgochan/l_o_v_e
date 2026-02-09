# Warm Mode - Detailed Specification

## Mirror for Self-Understanding

---

## 🎯 Purpose

In Warm Mode, insights should help users:

1. Feel **seen and understood**
2. **Understand** what they're experiencing and why
3. **Connect** the dots between body, emotion, and meaning
4. **Explore** gentle pathways forward (not prescriptive)

---

## 📐 Data Structure

### **Python Return Object** (`insight_generator.py`)

```python
{
  "mode": "warm",
  "structured": True,  # Frontend detection flag
  "emotion": "Anxiety",
  "category": "Negative High-Energy",
  "vac": {"valence": -0.45, "arousal": 0.72, "connection": -0.23},
  "confidence": 0.87,

  # Structured sections
  "opening": str,  # Empathetic validation (2-3 sentences)
  "voice_observations": [str],  # 2-4 natural language observations
  "emotion_understanding": str,  # What this emotion means (accessible)
  "vac_interpretation": {
    "energy_state": str,  # Arousal in relatable terms
    "emotional_tone": str,  # Valence in relatable terms
    "connection_quality": str  # Connection in relatable terms
  },
  "gentle_invitations": [
    {
      "type": "reflection" | "suggestion",
      "text": str
    }
  ],  # 2-3 invitations, alternating types
  "similar_emotions": [  # From recommendation engine
    {"name": str, "category": str, "distance": float}
  ],
  "paths_forward": [  # Optional: curated journeys
    {"from": str, "to": str, "description": str}
  ],

  # Legacy fields (for backwards compatibility)
  "summary": str,  # Generated from structured data if frontend doesn't support
  "guidance": str,
  "recommendations": []
}
```

---

## ✍️ Content Generation Rules

### **1. Opening (Validation)**

#### Template Structure

- Acknowledge emotion with "I" language
- Validate the experience
- Optional: Brief why/context

#### Examples

#### Anxiety

> "I sense you're experiencing anxiety right now, and I want you to know that's completely valid. This is your system trying to protect you."

#### Sadness

> "I hear a deep sadness in what you're sharing. It's okay to feel this - sadness is how we honor what matters to us."

#### Joy

> "I'm sensing real joy in your expression! This is wonderful - you're experiencing something that lights you up."

#### Confusion

> "I notice you're feeling confused or uncertain right now. That's actually a meaningful state - it means you're processing something important."

#### Formula

```python
def _generate_warm_opening(emotion_name, valence, vac_data):
    emotion_lower = emotion_name.lower()

    # Validation phrase
    if valence < -0.3:
        validation = "and I want you to know that's completely valid"
    elif valence > 0.3:
        validation = "and that's wonderful"
    else:
        validation = "and that's meaningful"

    # Purpose/context
    if emotion_lower in ['anxiety', 'fear', 'worry']:
        context = "This is your system trying to protect you."
    elif emotion_lower in ['sadness', 'grief']:
        context = "Sadness is how we honor what matters to us."
    elif emotion_lower in ['joy', 'delight', 'excitement']:
        context = "You're experiencing something that lights you up."
    else:
        context = "This emotion is telling you something important."

    return f"I sense you're experiencing {emotion_lower} right now, {validation}. {context}"
```

### **2. Voice Observations**

#### Generation Rules

- 2-4 observations in natural language
- Connect voice features to emotional state
- Use accessible metaphors

#### Voice Feature → Natural Language Mapping

```python
VOICE_OBSERVATIONS = {
    "high_energy_high_pitch": "Your voice has a lot of energy and tension",
    "high_energy_low_pitch": "There's power and intensity in your voice",
    "low_energy_high_pitch": "Your voice sounds soft, almost fragile",
    "low_energy_low_pitch": "There's a heaviness in your voice",

    "fast_rate": "You're speaking quickly, which often happens when thoughts are racing",
    "slow_rate": "You're speaking slowly and deliberately, taking your time with words",

    "high_variability": "Your voice is animated with lots of expression",
    "low_variability": "Your voice sounds flat or monotone, which can happen when we're overwhelmed",

    "voice_tension": "There's a tightness in your voice that suggests your body is on alert",
    "voice_breathiness": "Your voice sounds breathy, like you're having trouble catching your breath"
}

def _generate_voice_observations(prosody_data, vac_data):
    observations = []

    energy = prosody_data.get('energy', 0.5)
    pitch = prosody_data.get('pitch_mean', 150)
    rate = prosody_data.get('rate', 4.0)
    variability = prosody_data.get('pitch_std', 20)

    # Energy + Pitch combo
    if energy > 0.7 and pitch > 170:
        observations.append(VOICE_OBSERVATIONS["high_energy_high_pitch"])
    elif energy > 0.7 and pitch < 130:
        observations.append(VOICE_OBSERVATIONS["high_energy_low_pitch"])
    elif energy < 0.3 and pitch > 170:
        observations.append(VOICE_OBSERVATIONS["low_energy_high_pitch"])
    elif energy < 0.3:
        observations.append(VOICE_OBSERVATIONS["low_energy_low_pitch"])

    # Speech rate
    if rate > 5.0:
        observations.append(VOICE_OBSERVATIONS["fast_rate"])
    elif rate < 3.0:
        observations.append(VOICE_OBSERVATIONS["slow_rate"])

    # Variability
    if variability > 40:
        observations.append(VOICE_OBSERVATIONS["high_variability"])
    elif variability < 15:
        observations.append(VOICE_OBSERVATIONS["low_variability"])

    # Voice quality
    if prosody_data.get('jitter', 0) > 0.02:
        observations.append(VOICE_OBSERVATIONS["voice_tension"])

    return observations[:4]  # Max 4 observations
```

### **3. Emotion Understanding**

**Purpose**: Explain what the emotion IS in accessible language

#### Template: "[Emotion] is [functional purpose]. [Personal meaning/cost]."

#### Examples

```python
EMOTION_UNDERSTANDING = {
    "Anxiety": "Anxiety is your mind's way of trying to protect you by preparing for potential challenges. It's exhausting, but it means you care deeply.",

    "Sadness": "Sadness is how your heart processes loss and honors what mattered. It's painful, but it's also how we integrate change.",

    "Joy": "Joy is your being's celebration of alignment - when what's happening matches what you value. It reminds you what's possible.",

    "Anger": "Anger is energy for change - it signals when boundaries are crossed or values are violated. It's trying to protect what matters to you.",

    "Fear": "Fear is your survival system activating to keep you safe. It's uncomfortable, but it shows how much you value your wellbeing.",

    "Confusion": "Confusion is your mind saying 'I need more information to make sense of this.' It's uncomfortable but it's the beginning of clarity.",

    # Default template
    "DEFAULT": f"{{emotion}} is your emotional system responding to what's happening. It's giving you important information about your needs and values."
}
```

### **4. VAC Interpretation**

**Purpose**: Translate technical VAC coords into relatable human experience

#### Structure

```python
{
  "energy_state": _interpret_arousal_warm(arousal),
  "emotional_tone": _interpret_valence_warm(valence),
  "connection_quality": _interpret_connection_warm(connection)
}
```

#### Arousal → Energy State (Warm)

```python
def _interpret_arousal_warm(arousal):
    if arousal > 0.7:
        return "You're in a high-activation state - your system is revved up and ready to go"
    elif arousal > 0.3:
        return "There's moderate energy moving through you - you're engaged and alert"
    elif arousal > -0.3:
        return "You're in a balanced energy state - not too activated, not too flat"
    elif arousal > -0.7:
        return "Your energy is quite low right now - you might feel tired or depleted"
    else:
        return "You're in a very low-energy state - your system might be shutting down to protect you"
```

#### Valence → Emotional Tone (Warm)

```python
def _interpret_valence_warm(valence):
    if valence > 0.7:
        return "This energy feels really good - there's pleasure and positivity here"
    elif valence > 0.3:
        return "This has a somewhat positive quality - things feel okay"
    elif valence > -0.3:
        return "This feels neutral or mixed - neither clearly good nor bad"
    elif valence > -0.7:
        return "This energy doesn't feel good - there's some distress or discomfort"
    else:
        return "This feels quite painful or difficult - the distress is significant"
```

#### Connection → Connection Quality (Warm)

```python
def _interpret_connection_warm(connection):
    if connection > 0.7:
        return "You feel deeply connected - to yourself, others, or your values"
    elif connection > 0.3:
        return "There's a sense of connection present - you're not entirely alone in this"
    elif connection > -0.3:
        return "Connection feels neutral right now - neither strongly connected nor disconnected"
    elif connection > -0.7:
        return "You might feel somewhat alone or disconnected in this experience"
    else:
        return "There's significant disconnection - you might feel very alone or cut off"
```

### **5. Gentle Invitations**

#### Smart Alternating Logic

```python
def _generate_gentle_invitations(self, emotion, vac_data, message_count):
    """Generate 2-3 invitations, alternating reflections and suggestions."""
    invitations = []

    # Use message count from session analytics to alternate
    # Odd messages (1, 3, 5...) = start with reflection
    # Even messages (2, 4, 6...) = start with suggestion
    start_with_reflection = (message_count % 2 == 1)

    if start_with_reflection:
        invitations.append({
            "type": "reflection",
            "text": self._generate_reflection_question(emotion, vac_data)
        })
        invitations.append({
            "type": "suggestion",
            "text": self._generate_gentle_suggestion(emotion, vac_data)
        })
    else:
        invitations.append({
            "type": "suggestion",
            "text": self._generate_gentle_suggestion(emotion, vac_data)
        })
        invitations.append({
            "type": "reflection",
            "text": self._generate_reflection_question(emotion, vac_data)
        })

    # Optional third invitation
    if vac_data.get('arousal', 0) > 0.7:  # High arousal = add grounding
        invitations.append({
            "type": "suggestion",
            "text": "You might try placing a hand on your heart and taking three slow breaths"
        })

    return invitations
```

#### Reflection Question Templates

```python
REFLECTION_QUESTIONS = {
    "high_arousal": [
        "What would it feel like to slow down, even just for one breath?",
        "Where in your body are you feeling this intensity?",
        "What is this energy trying to tell you?"
    ],
    "low_arousal": [
        "What would it take to have just a little more energy right now?",
        "What does this low energy feel like in your body?",
        "Is this tiredness asking you to rest, or is it numbness protecting you?"
    ],
    "negative_valence": [
        "What would it be like to be gentle with yourself about feeling this way?",
        "What do you need most in this moment?",
        "Who or what helps when you feel like this?"
    ],
    "positive_valence": [
        "What's contributing to this positive feeling?",
        "How can you savor this moment?",
        "What does this tell you about what matters to you?"
    ],
    "disconnection": [
        "What would connection feel like right now?",
        "Is there someone you'd feel safe reaching out to?",
        "What helps you feel less alone?"
    ]
}
```

#### Gentle Suggestion Templates

```python
GENTLE_SUGGESTIONS = {
    "high_arousal": [
        "You might try placing a hand on your heart and noticing the physical sensations",
        "Consider taking three slow breaths, making the exhale longer than the inhale",
        "It might help to gently move your body - even just stretching or walking"
    ],
    "low_arousal": [
        "You might notice what small thing could bring even a tiny bit of energy",
        "Consider stepping outside or opening a window to change your environment",
        "Sometimes gentle movement can help when energy is low"
    ],
    "negative_valence": [
        "You might name this feeling out loud: 'I'm feeling [emotion]'",
        "Consider writing down what you're experiencing, without judgment",
        "It might help to remember this is temporary, even if it doesn't feel that way"
    ],
    "positive_valence": [
        "You might take a moment to really notice and savor this feeling",
        "Consider sharing this with someone who cares about you",
        "Try to notice what specifically is creating this positive state"
    ],
    "disconnection": [
        "You might reach out to someone, even just to say hello",
        "Consider doing something that usually makes you feel connected to yourself",
        "It might help to remember times when you did feel connected"
    ]
}
```

---

## 🎨 Visual Design

### **Container**

```css
bg-gradient-to-br from-amber-900/30 to-rose-900/30
border-l-4 border-amber-400
rounded-lg p-5 space-y-4
max-w-2xl
```

### **Section Styling**

**Opening:**

- Text: amber-100
- Font: text-base leading-relaxed
- No special container

**Voice Observations:**

- Border-left: amber-500/30 (2px)
- Padding-left: 1rem
- Title: amber-400, text-xs, semibold
- Items: amber-200, text-sm

**Emotion Understanding:**

- Background: amber-500/10
- Border-radius: rounded-lg
- Padding: p-3
- Text: amber-100, italic, text-sm

**VAC Interpretation:**

- Title: amber-400
- List items: amber-200
- Bullets: text-sm

**Gentle Invitations:**

- Background: rose-500/10
- Title: rose-400
- Reflections: rose-200 with "?" prefix
- Suggestions: rose-200 with "•" prefix

**Similar Emotions:**

- Title: amber-400
- Badges: EmotionBadge component (clickable)

---

## 📝 Complete Examples

### **Example 1: Anxiety (High Arousal, Negative)**

```json
{
  "mode": "warm",
  "structured": true,
  "opening": "I sense you're experiencing anxiety right now, and I want you to know that's completely valid. This is your system trying to protect you.",

  "voice_observations": [
    "Your voice has a lot of energy and tension",
    "You're speaking quickly, which often happens when thoughts are racing",
    "There's a tightness in your voice that suggests your body is on alert"
  ],

  "emotion_understanding": "Anxiety is your mind's way of trying to protect you by preparing for potential challenges. It's exhausting, but it means you care deeply.",

  "vac_interpretation": {
    "energy_state": "You're in a high-activation state - your system is revved up",
    "emotional_tone": "This energy doesn't feel good - there's distress present",
    "connection_quality": "You might feel alone in this, or worried about burdening others"
  },

  "gentle_invitations": [
    {
      "type": "reflection",
      "text": "What would it feel like to slow down, even just for one breath?"
    },
    {
      "type": "suggestion",
      "text": "You might try placing a hand on your heart and noticing the physical sensations of this anxiety"
    }
  ],

  "similar_emotions": [
    {"name": "Worry", "category": "Negative High-Energy"},
    {"name": "Fear", "category": "Negative High-Energy"},
    {"name": "Overwhelm", "category": "Negative High-Energy"}
  ]
}
```

### **Example 2: Contentment (Low Arousal, Positive)**

```json
{
  "mode": "warm",
  "structured": true,
  "opening": "I'm sensing a lovely contentment in your expression. This is a precious state - you're at ease.",

  "voice_observations": [
    "Your voice is calm and steady",
    "You're speaking at a relaxed pace",
    "There's a warmth and softness in your tone"
  ],

  "emotion_understanding": "Contentment is your being's way of saying 'this is enough.' It's peace without needing anything to be different.",

  "vac_interpretation": {
    "energy_state": "You're in a low-activation state - calm and settled",
    "emotional_tone": "This feels good - there's ease and wellbeing here",
    "connection_quality": "You feel connected and aligned with yourself"
  },

  "gentle_invitations": [
    {
      "type": "suggestion",
      "text": "You might take a moment to really notice and savor this feeling of contentment"
    },
    {
      "type": "reflection",
      "text": "What's contributing to this sense of peace right now?"
    }
  ],

  "similar_emotions": [
    {"name": "Peace", "category": "Positive Low-Energy"},
    {"name": "Gratitude", "category": "Positive Low-Energy"},
    {"name": "Calm", "category": "Positive Low-Energy"}
  ]
}
```

---

## 🔄 Message Count Integration

The backend needs to track message count to alternate invitation types:

```python
# In generate_insights()
try:
    analytics_service = SessionAnalyticsService(self.db)
    session_analytics = await analytics_service.get_or_create(session_id)
    message_count = session_analytics.emotion_count
except:
    message_count = 1  # Default to reflection-first

# Pass to invitation generator
insights["gentle_invitations"] = self._generate_gentle_invitations(
    emotion, vac_data, message_count
)
```

---

**Next**: See `02-CLINICAL-MODE-SPEC.md` for clinical mode details
