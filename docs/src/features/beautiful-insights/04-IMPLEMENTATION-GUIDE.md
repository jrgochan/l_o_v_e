# Beautiful Insights - Implementation Guide

## Step-by-Step Instructions

---

## 📋 Prerequisites

- ✅ Heartbeat Analyzer complete (progress tracking working)
- ✅ Deep Feeling Mode functional
- ✅ Clinical alerts system in place
- ✅ Session analytics tracking active
- ✅ Familiarity with `insight_generator.py`

---

## 🎯 Implementation Overview

**Estimated Time**: 5.5-7 hours
**Complexity**: Medium-High
**Files Modified**: 3-4
**Files Created**: 1-2

### Phases

1. Backend: Restructure insight generation (2-3h)
2. Frontend: Create InsightCard component (2-3h)
3. Integration: Wire into ChatPanel & AnalysisPanel (1h)
4. Testing & Polish (30-45min)

---

## 📦 Phase 1: Backend Restructuring (2-3 hours)

### File: `observer/app/services/insight_generator.py`

### Step 1.1: Add Helper Methods (~45min)

Add these new methods to the `InsightGenerator` class:

```python
# ============================================================================
# WARM MODE - Structured Insight Generation
# ============================================================================

def _generate_warm_opening(self, emotion_name: str, valence: float) -> str:
    """Generate empathetic opening with validation."""
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


def _generate_voice_observations_warm(self, prosody_data: Dict[str, Any], vac_data: Dict[str, float]) -> List[str]:
    """Generate natural language voice observations."""
    observations = []

    energy = prosody_data.get('energy', 0.5)
    pitch = prosody_data.get('pitch_mean', 150)
    rate = prosody_data.get('rate', 4.0)
    variability = prosody_data.get('pitch_std', 20)

    # Energy + Pitch combo
    if energy > 0.7 and pitch > 170:
        observations.append("Your voice has a lot of energy and tension")
    elif energy > 0.7 and pitch < 130:
        observations.append("There's power and intensity in your voice")
    elif energy < 0.3 and pitch > 170:
        observations.append("Your voice sounds soft, almost fragile")
    elif energy < 0.3:
        observations.append("There's a heaviness in your voice")

    # Speech rate
    if rate > 5.0:
        observations.append("You're speaking quickly, which often happens when thoughts are racing")
    elif rate < 3.0:
        observations.append("You're speaking slowly and deliberately, taking your time with words")

    # Variability
    if variability > 40:
        observations.append("Your voice is animated with lots of expression")
    elif variability < 15:
        observations.append("Your voice sounds flat or monotone, which can happen when we're overwhelmed")

    # Voice quality
    if prosody_data.get('jitter', 0) > 0.02:
        observations.append("There's a tightness in your voice that suggests your body is on alert")

    return observations[:4]  # Max 4


def _get_emotion_understanding_warm(self, emotion_name: str) -> str:
    """Get accessible explanation of emotion."""
    EMOTION_UNDERSTANDING = {
        "Anxiety": "Anxiety is your mind's way of trying to protect you by preparing for potential challenges. It's exhausting, but it means you care deeply.",
        "Sadness": "Sadness is how your heart processes loss and honors what mattered. It's painful, but it's also how we integrate change.",
        "Joy": "Joy is your being's celebration of alignment - when what's happening matches what you value. It reminds you what's possible.",
        "Anger": "Anger is energy for change - it signals when boundaries are crossed or values are violated. It's trying to protect what matters to you.",
        "Fear": "Fear is your survival system activating to keep you safe. It's uncomfortable, but it shows how much you value your wellbeing.",
        "Contentment": "Contentment is your being's way of saying 'this is enough.' It's peace without needing anything to be different.",
        "Excitement": "Excitement is your body preparing for something you value - it's anticipation mixed with energy and hope.",
        "Overwhelm": "Overwhelm is your system saying 'this is too much right now.' It's a signal to slow down and simplify."
    }

    return EMOTION_UNDERSTANDING.get(
        emotion_name,
        f"{emotion_name} is your emotional system responding to what's happening. It's giving you important information about your needs and values."
    )


def _interpret_arousal_warm(self, arousal: float) -> str:
    """Interpret arousal in relatable terms."""
    if arousal > 0.7:
        return "You're in a high-activation state - your system is revved up"
    elif arousal > 0.3:
        return "There's moderate energy moving through you - you're engaged and alert"
    elif arousal > -0.3:
        return "You're in a balanced energy state - not too activated, not too flat"
    elif arousal > -0.7:
        return "Your energy is quite low right now - you might feel tired or depleted"
    else:
        return "You're in a very low-energy state - your system might be shutting down to protect you"


def _interpret_valence_warm(self, valence: float) -> str:
    """Interpret valence in relatable terms."""
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


def _interpret_connection_warm(self, connection: float) -> str:
    """Interpret connection in relatable terms."""
    if connection > 0.7:
        return "You feel deeply connected - to yourself, others, or your values"
    elif connection > 0.3:
        return "There's a sense of connection present - you're not entirely alone in this"
    elif connection > -0.3:
        return "Connection feels neutral right now"
    elif connection > -0.7:
        return "You might feel somewhat alone or disconnected in this experience"
    else:
        return "There's significant disconnection - you might feel very alone or cut off"


def _generate_reflection_question(self, emotion_name: str, vac_data: Dict[str, float]) -> str:
    """Generate a reflective question based on VAC state."""
    arousal = vac_data.get('arousal', 0)
    valence = vac_data.get('valence', 0)
    connection = vac_data.get('connection', 0)

    # Pick based on most salient dimension
    if abs(arousal) > max(abs(valence), abs(connection)):
        # Arousal-focused
        if arousal > 0.5:
            questions = [
                "What would it feel like to slow down, even just for one breath?",
                "Where in your body are you feeling this intensity?",
                "What is this energy trying to tell you?"
            ]
        else:
            questions = [
                "What would it take to have just a little more energy right now?",
                "Is this low energy asking you to rest, or is it numbness protecting you?",
                "What does this tiredness feel like in your body?"
            ]
    elif abs(connection) > abs(valence):
        # Connection-focused
        if connection < 0:
            questions = [
                "What would connection feel like right now?",
                "Is there someone you'd feel safe reaching out to?",
                "What helps you feel less alone?"
            ]
        else:
            questions = [
                "What's creating this sense of connection?",
                "Who or what helps you feel this way?",
                "How can you nurture this connection?"
            ]
    else:
        # Valence-focused
        if valence < 0:
            questions = [
                "What would it be like to be gentle with yourself about feeling this way?",
                "What do you need most in this moment?",
                "Who or what helps when you feel like this?"
            ]
        else:
            questions = [
                "What's contributing to this positive feeling?",
                "How can you savor this moment?",
                "What does this tell you about what matters to you?"
            ]

    import random
    return random.choice(questions)


def _generate_gentle_suggestion(self, emotion_name: str, vac_data: Dict[str, float]) -> str:
    """Generate a gentle suggestion based on VAC state."""
    arousal = vac_data.get('arousal', 0)
    valence = vac_data.get('valence', 0)
    connection = vac_data.get('connection', 0)

    if abs(arousal) > max(abs(valence), abs(connection)):
        # Arousal-focused
        if arousal > 0.5:
            suggestions = [
                "You might try placing a hand on your heart and noticing the physical sensations",
                "Consider taking three slow breaths, making the exhale longer than the inhale",
                "It might help to gently move your body - even just stretching or walking"
            ]
        else:
            suggestions = [
                "You might notice what small thing could bring even a tiny bit of energy",
                "Consider stepping outside or opening a window to change your environment",
                "Sometimes gentle movement can help when energy is low"
            ]
    elif abs(connection) < abs(valence):
        # Connection-focused
        if connection < 0:
            suggestions = [
                "You might reach out to someone, even just to say hello",
                "Consider doing something that usually makes you feel connected to yourself",
                "It might help to remember times when you did feel connected"
            ]
        else:
            suggestions = [
                "You might share this feeling with someone who cares about you",
                "Consider savoring this sense of connection",
                "Notice what's contributing to feeling connected"
            ]
    else:
        # Valence-focused
        if valence < 0:
            suggestions = [
                "You might name this feeling out loud: 'I'm feeling " + emotion_name.lower() + "'",
                "Consider writing down what you're experiencing, without judgment",
                "It might help to remember this is temporary, even if it doesn't feel that way"
            ]
        else:
            suggestions = [
                "You might take a moment to really notice and savor this feeling",
                "Consider what you could do to extend or deepen this positive state",
                "Try to notice what specifically is creating this"
            ]

    import random
    return random.choice(suggestions)


def _generate_gentle_invitations(
    self,
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    message_count: int
) -> List[Dict[str, str]]:
    """Generate 2-3 gentle invitations, alternating types."""
    invitations = []

    # Odd messages = start with reflection
    # Even messages = start with suggestion
    start_with_reflection = (message_count % 2 == 1)

    if start_with_reflection:
        invitations.append({
            "type": "reflection",
            "text": self._generate_reflection_question(emotion['name'], vac_data)
        })
        invitations.append({
            "type": "suggestion",
            "text": self._generate_gentle_suggestion(emotion['name'], vac_data)
        })
    else:
        invitations.append({
            "type": "suggestion",
            "text": self._generate_gentle_suggestion(emotion['name'], vac_data)
        })
        invitations.append({
            "type": "reflection",
            "text": self._generate_reflection_question(emotion['name'], vac_data)
        })

    # Optional third: Add grounding for high arousal
    if vac_data.get('arousal', 0) > 0.7:
        invitations.append({
            "type": "suggestion",
            "text": "You might try placing a hand on your heart and taking three slow breaths"
        })

    return invitations
```

### Step 1.2: Restructure `_generate_warm_summary()` (~30min)

Replace the current method to return structured data:

```python
def _generate_warm_summary(
    self,
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    confidence: float,
    prosody_data: Optional[Dict[str, Any]],
    reasoning: Optional[str],
    message_count: int = 1
) -> Dict[str, Any]:
    """Generate structured warm mode insights."""

    valence = vac_data.get('valence', 0.0)

    # Build structured insights
    structured = {
        "opening": self._generate_warm_opening(emotion['name'], valence),
        "emotion_understanding": self._get_emotion_understanding_warm(emotion['name']),
        "vac_interpretation": {
            "energy_state": self._interpret_arousal_warm(vac_data['arousal']),
            "emotional_tone": self._interpret_valence_warm(vac_data['valence']),
            "connection_quality": self._interpret_connection_warm(vac_data['connection'])
        },
        "gentle_invitations": self._generate_gentle_invitations(emotion, vac_data, message_count)
    }

    # Add voice observations if available
    if prosody_data:
        structured["voice_observations"] = self._generate_voice_observations_warm(prosody_data, vac_data)

    return structured
```

### Step 1.3: Add Clinical Helper Methods (~45min)

```python
# ============================================================================
# CLINICAL MODE - Structured Insight Generation
# ============================================================================

def _generate_assessment_summary_clinical(
    self,
    emotion_name: str,
    confidence: float,
    vac_data: Dict[str, float]
) -> str:
    """Generate clinical assessment summary."""
    arousal = vac_data['arousal']
    valence = vac_data['valence']

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

    return f"Patient presents with {emotion_name} ({confidence:.0%} confidence), {arousal_state} ({arousal:+.2f}), {valence_state} ({valence:+.2f})"


def _generate_biomarkers(
    self,
    prosody_data: Optional[Dict[str, Any]],
    vac_data: Dict[str, float]
) -> Dict[str, Any]:
    """Generate structured biomarker data."""
    biomarkers = {"vocal": {}, "emotional": {}}

    # Vocal biomarkers
    if prosody_data:
        pitch = prosody_data.get('pitch_mean')
        if pitch:
            if pitch > 180:
                interp, indicator = "Elevated (stress indicator)", "↑"
            elif pitch < 120:
                interp, indicator = "Low (depression indicator)", "↓"
            else:
                interp, indicator = "Normal range", "="

            biomarkers["vocal"]["pitch"] = {
                "value": pitch,
                "interpretation": interp,
                "indicator": indicator
            }

        # Energy, rate, quality (similar pattern)
        # ... (see spec document for full implementation)

    # Emotional biomarkers
    v, a, c = vac_data['valence'], vac_data['arousal'], vac_data['connection']

    biomarkers["emotional"]["valence"] = {
        "value": v,
        "clinical_sig": "Significant negative affect" if v < -0.5 else "Mild negative affect" if v < 0 else "Positive affect"
    }

    # ... (see spec for full implementation)

    return biomarkers


def _generate_recommended_interventions(
    self,
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    prosody_data: Optional[Dict[str, Any]],
    alerts: List
) -> List[Dict[str, Any]]:
    """Generate prioritized intervention recommendations."""
    interventions = []
    priority = 1

    arousal = vac_data['arousal']
    valence = vac_data['valence']
    emotion_name = emotion['name']

    # Priority 1: Address acute distress
    if arousal > 0.7 and valence < -0.3:
        interventions.append({
            "priority": priority,
            "type": "grounding",
            "technique": "5-4-3-2-1 Sensory Grounding",
            "rationale": "High arousal indicates need for nervous system regulation",
            "script": "Can you tell me 5 things you see, 4 things you can touch, 3 things you hear, 2 things you can smell, and 1 thing you can taste?",
            "evidence": "Effective for acute anxiety (Bourne, 2015)"
        })
        priority += 1

    # Priority 2: Always validate
    interventions.append({
        "priority": priority,
        "type": "validation",
        "technique": "Emotion Validation",
        "rationale": "All emotions serve a function; validate before addressing",
        "script": f"It makes complete sense you're feeling {emotion_name.lower()} given what you're experiencing. This emotion is trying to help you...",
        "evidence": "DBT emotion regulation module (Linehan)"
    })
    priority += 1

    # Priority 3: Explore (emotion-specific)
    if emotion_name.lower() in ['anxiety', 'worry', 'fear']:
        interventions.append({
            "priority": priority,
            "type": "exploration",
            "technique": "Threat Assessment",
            "rationale": "Anxiety often responds to reality-testing of feared outcomes",
            "script": "What specifically are you worried might happen? And if that did happen, then what?",
            "evidence": "CBT core technique for anxiety disorders"
        })
    else:
        interventions.append({
            "priority": priority,
            "type": "exploration",
            "technique": "Values Clarification",
            "rationale": "Connect emotion to underlying values",
            "script": f"This {emotion_name.lower()} seems to be protecting something important to you. What might that be?",
            "evidence": "ACT values work (Hayes et al.)"
        })

    return interventions[:3]  # Max 3
```

### Step 1.4: Update Main `generate_insights()` Method (~30min)

Modify the existing method to generate structured insights:

```python
async def generate_insights(
    self,
    emotion_name: str,
    vac_data: Dict[str, float],
    confidence: float,
    tone_mode: str = 'warm',
    prosody_data: Optional[Dict[str, Any]] = None,
    reasoning: Optional[str] = None,
    use_atlas_mapping: bool = True,
    session_id: Optional[str] = None,
    multi_emotion_data: Optional[Dict[str, Any]] = None  # NEW
) -> Dict[str, Any]:
    """Generate comprehensive insights (now structured)."""

    # Get emotion details
    emotion = await self._get_emotion_details(emotion_name, vac_data, use_atlas_mapping)
    if not emotion:
        return self._generate_fallback_insights(emotion_name, vac_data, tone_mode)

    # Get message count for alternating logic
    message_count = 1
    if session_id:
        try:
            analytics_service = SessionAnalyticsService(self.db)
            session_analytics = await analytics_service.get_or_create(session_id)
            message_count = session_analytics.emotion_count
        except:
            pass

    # Base insights structure
    insights = {
        "mode": tone_mode,
        "structured": True,  # IMPORTANT: Frontend detection flag
        "emotion": emotion_name,
        "category": emotion.get("category"),
        "vac": vac_data,
        "confidence": confidence
    }

    # Generate mode-specific structured content
    if tone_mode == 'warm':
        warm_structured = self._generate_warm_summary(
            emotion, vac_data, confidence, prosody_data, reasoning, message_count
        )
        insights.update(warm_structured)
    else:
        clinical_structured = self._generate_clinical_summary_structured(
            emotion, vac_data, confidence, prosody_data, reasoning
        )
        insights.update(clinical_structured)

    # Get recommendations (already have this)
    # ... existing recommendation code ...

    # Add clinical alerts & session analytics (already have this)
    # ... existing code ...

    # Generate legacy summary for backwards compatibility
    insights["summary"] = self._generate_legacy_summary(insights, tone_mode)
    insights["guidance"] = insights.get("integrated_guidance") or self._generate_guidance(emotion, vac_data, tone_mode)

    return insights
```

---

## 📦 Phase 2: Frontend Component (2-3 hours)

### File: `experience/web/components/admin/InsightCard.tsx` (NEW)

### Step 2.1: Create Main Component (~30min)

```tsx
'use client';

import { useState } from 'react';
import type { InsightData, ToneMode } from '@/types/chat';
import { EmotionBadge } from './EmotionBadge';

interface InsightCardProps {
  insights: InsightData;
  toneMode: ToneMode;
  deepFeelingMode?: boolean;
  maxHeight?: number;  // For "Read more" truncation
  onEmotionClick?: (emotion: string) => void;
}

export function InsightCard({
  insights,
  toneMode,
  deepFeelingMode = false,
  maxHeight,
  onEmotionClick
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);

  // Check if insights are structured
  const isStructured = (insights as any).structured === true;

  if (!isStructured) {
    // Fallback for legacy insights
    return <LegacyInsightDisplay insights={insights} toneMode={toneMode} />;
  }

  // Render mode-specific card
  if (toneMode === 'warm') {
    return (
      <WarmInsightCard
        insights={insights}
        deepFeelingMode={deepFeelingMode}
        maxHeight={maxHeight}
        showFullContent={showFullContent}
        onToggleContent={() => setShowFullContent(!showFullContent)}
        onEmotionClick={onEmotionClick}
      />
    );
  } else {
    return (
      <ClinicalInsightCard
        insights={insights}
        deepFeelingMode={deepFeelingMode}
        maxHeight={maxHeight}
        showFullContent={showFullContent}
        onToggleContent={() => setShowFullContent(!showFullContent)}
        onEmotionClick={onEmotionClick}
      />
    );
  }
}
```

**Continue in next document...**

---

**Next**: See specific component implementation in separate guide files
**Files Modified**: 1 backend, 1-2 frontend
**Total Estimated Time**: 5.5-7 hours
