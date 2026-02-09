# Listener Module - Atlas Mapping

## Overview

The Listener must map user input to one of **87 distinct emotions** from Dr. Brené Brown's Atlas of the Heart, organized into **13 categories**. This mapping guides the VAC extraction and provides semantic context.

## The 13 Categories (Places We Go)

### 1. When Things Are Uncertain or Too Much

**Emotions**: Stress, Overwhelm, Anxiety, Worry, Avoidance, Excitement, Dread, Fear, Vulnerability

**Detection Cues**:
- High arousal language: "racing thoughts", "can't breathe", "heart pounding"
- Future-focused anxiety: "what if", "worried about"
- **Overwhelm vs. Stress**: "I can't handle this" (overwhelm) vs. "I'm busy" (stress)

**VAC Signatures**:
- Overwhelm: [-0.6, +0.9, -0.3]
- Fear: [-0.6, +0.8, -0.5]
- Vulnerability: [0.0, +0.3, +0.6] (gateway to connection)

### 2. When We Compare

**Emotions**: Comparison, Admiration, Reverence, Envy, Jealousy, Resentment, Schadenfreude, Freudenfreude

**Detection Cues**:
- Comparative language: "they have", "I wish I had", "why do they get"
- **Schadenfreude**: Pleasure at others' misfortune (positive valence, negative connection)

**VAC Signatures**:
- Envy: [-0.5, +0.4, -0.6]
- Schadenfreude: [+0.3, +0.4, -0.7] (perverse combination)

### 3. When Things Don't Go As Planned

**Emotions**: Boredom, Disappointment, Expectations, Regret, Discouragement, Resignation, Frustration

**Detection Cues**:
- Expectation language: "I thought", "I hoped", "should have been"
- **Frustration**: High energy, blocked goal - "trying so hard but nothing works"

### 4. When It's Beyond Us

**Emotions**: Awe, Wonder, Confusion, Curiosity, Interest, Surprise

**Detection Cues**:
- Awe/Wonder: "I felt so small", "breathtaking", transcendent language
- Confusion: "I don't understand", "nothing makes sense"

**VAC Signatures**:
- Awe: [+0.7, +0.5, +0.8] (connection to something greater)

### 5. When Things Aren't What They Seem

**Emotions**: Amusement, Bittersweetness, Nostalgia, Cognitive Dissonance, Paradox, Irony, Sarcasm

**Detection Cues**:
- Bittersweetness: Simultaneous joy and sadness - "happy but sad"
- Nostalgia: Past-focused longing - "I miss when..."

### 6. When We're Hurting

**Emotions**: Anguish, Hopelessness, Despair, Sadness, Grief

**Detection Cues**:
- **Grief vs. Despair**: Grief has connection to what was lost (positive z), Despair has no connection (negative z)

**VAC Signatures**:
- Grief: [-0.9, -0.4, +0.5] (paradox: pain + love)
- Despair: [-0.9, -0.6, -0.7] (total hopelessness)

### 7. When We Go With Others

**Emotions**: Compassion, Pity, Empathy, Sympathy, Boundaries, Comparative Suffering

**THE CRITICAL DISTINCTION**:
- **Pity**: "I feel sorry FOR them" → Connection: -0.7
- **Compassion**: "I feel WITH them" → Connection: +0.9

### 8. When We Fall Short

**Emotions**: Shame, Self-Compassion, Perfectionism, Guilt, Humiliation, Embarrassment

**Detection Cues**:
- **Shame**: "I am bad" (identity) → Connection: -1.0
- **Guilt**: "I did something bad" (behavior) → Connection: -0.3

### 9. When We Search for Connection

**Emotions**: Belonging, Fitting In, Connection, Disconnection, Insecurity, Invisibility, Loneliness

**Detection Cues**:
- **Belonging**: "I can be myself" → Connection: +1.0
- **Fitting In**: "I have to pretend" → Connection: -0.3

### 10. When the Heart Is Open

**Emotions**: Love, Lovelessness, Heartbreak, Trust, Self-Trust, Betrayal, Defensiveness, Flooding, Hurt

### 11. When Life Is Good

**Emotions**: Joy, Happiness, Calm, Contentment, Gratitude, Foreboding Joy, Relief, Tranquility

### 12. When We Feel Wronged

**Emotions**: Anger, Contempt, Disgust, Dehumanization, Hate, Self-Righteousness

### 13. When We Self-Assess

**Emotions**: Pride, Hubris, Humility

**Detection Cues**:
- **Hubris**: Inflated pride disconnected from reality → Connection: -0.8
- **Humility**: Grounded confidence → Connection: +0.8

## Next Steps

Now that you understand the Atlas:
- **06-pii-sanitization.md** - Privacy protection
- **07-api-specification.md** - FastAPI endpoints
- **08-async-queue.md** - Arq + Redis integration
