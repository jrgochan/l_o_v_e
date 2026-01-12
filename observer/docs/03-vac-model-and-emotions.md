# Observer Module - VAC Model and Emotions

## Overview

The Observer module stores and manages the complete "Digital Atlas of the Heart"—**87 distinct emotions** organized into **13 semantic categories**. This document provides the canonical VAC coordinates and semantic definitions that seed the `atlas_definitions` table.

## The VAC Model

### Three-Dimensional Emotional Space

| Axis | Name | Range | Meaning |
|------|------|-------|---------|
| **X** | Valence | -1.0 to +1.0 | Intrinsic pleasantness (positive) or unpleasantness (negative) |
| **Y** | Arousal | -1.0 to +1.0 | Physiological activation level (calm to excited) |
| **Z** | Connection | -1.0 to +1.0 | Authentic alignment with self and others |

### Key Distinctions Enabled by Connection

The Connection axis (Z) is what separates L.O.V.E. from traditional VAD models:

**Compassion vs. Pity**
- Compassion: `[0.5, 0.2, 0.9]` - Feeling **with**, positive connection
- Pity: `[-0.3, -0.1, -0.7]` - Feeling **for**, separation/negative connection

**Belonging vs. Fitting In**
- Belonging: `[0.8, 0.4, 1.0]` - Authentic acceptance, maximum connection
- Fitting In: `[0.3, 0.3, -0.3]` - External conformity, disconnected from self

## The 87 Emotions: Complete Reference

### Category 1: Places We Go When Things Are Uncertain or Too Much

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Stress** | -0.4 | +0.6 | -0.2 | Physical/emotional tension from demands |
| **Overwhelm** | -0.6 | +0.9 | -0.3 | Extreme stress, system saturation |
| **Anxiety** | -0.5 | +0.7 | -0.4 | Future-focused fear, apprehension |
| **Worry** | -0.4 | +0.5 | -0.3 | Cognitive anxiety, rumination |
| **Avoidance** | -0.3 | -0.2 | -0.4 | Evasion of discomfort |
| **Excitement** | +0.7 | +0.8 | +0.4 | Positive anticipation, high energy |
| **Dread** | -0.7 | +0.6 | -0.5 | Intense anxiety about future event |
| **Fear** | -0.6 | +0.8 | -0.5 | Response to perceived threat |
| **Vulnerability** | 0.0 | +0.3 | +0.6 | Gateway to connection, risk exposure |

**Computational Notes**:
- **Overwhelm**: When detected, trigger "Flooding" warning
- **Vulnerability**: Acts as a bridge state to high-connection emotions

---

### Category 2: Places We Go When We Compare

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Comparison** | -0.2 | +0.3 | -0.3 | Evaluating self against others |
| **Admiration** | +0.6 | +0.3 | +0.5 | Respect and approval without envy |
| **Reverence** | +0.7 | +0.2 | +0.8 | Deep respect and awe |
| **Envy** | -0.5 | +0.4 | -0.6 | Wanting what others have |
| **Jealousy** | -0.6 | +0.7 | -0.7 | Fear of losing what's yours |
| **Resentment** | -0.7 | +0.5 | -0.8 | Stored anger from perceived injustice |
| **Schadenfreude** | +0.3 | +0.4 | -0.7 | Pleasure from others' misfortune |
| **Freudenfreude** | +0.8 | +0.5 | +0.9 | Joy at others' success |

**Critical Test Case**:
- Schadenfreude vs. Freudenfreude: Same V/A, opposite Connection

---

### Category 3: Places We Go When Things Don't Go As Planned

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Boredom** | -0.2 | -0.8 | -0.2 | Lack of stimulation |
| **Disappointment** | -0.5 | -0.3 | 0.0 | Unmet expectations |
| **Expectations** | 0.0 | +0.2 | 0.0 | Future-oriented belief |
| **Regret** | -0.6 | -0.2 | -0.3 | Sorrow about past actions |
| **Discouragement** | -0.5 | -0.4 | -0.2 | Loss of confidence |
| **Resignation** | -0.6 | -0.6 | -0.5 | Acceptance of undesired outcome |
| **Frustration** | -0.5 | +0.7 | -0.2 | High energy, blocked goal |

---

### Category 4: Places We Go When It's Beyond Us

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Awe** | +0.7 | +0.5 | +0.8 | Overwhelmed by greatness/beauty |
| **Wonder** | +0.6 | +0.4 | +0.7 | Curiosity and amazement |
| **Confusion** | -0.2 | +0.3 | -0.2 | Lack of understanding |
| **Curiosity** | +0.5 | +0.6 | +0.3 | Drive to explore and learn |
| **Interest** | +0.4 | +0.5 | +0.2 | Attention and engagement |
| **Surprise** | 0.0 | +0.8 | 0.0 | Unexpected occurrence |

**Computational Notes**:
- **Confusion**: High entropy state—trigger clarification request from Listener
- **Awe**: High Connection to something greater than self

---

### Category 5: Places We Go When Things Aren't What They Seem

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Amusement** | +0.6 | +0.4 | +0.3 | Light-hearted enjoyment |
| **Bittersweetness** | 0.0 | -0.2 | +0.5 | Simultaneous happiness and sadness |
| **Nostalgia** | +0.3 | -0.2 | +0.4 | Sentimental longing for the past |
| **Cognitive Dissonance** | -0.4 | +0.5 | -0.3 | Mental discomfort from conflicting beliefs |
| **Paradox** | 0.0 | +0.3 | 0.0 | Contradictory yet true |
| **Irony** | +0.2 | +0.2 | 0.0 | Incongruity between expectation and reality |
| **Sarcasm** | 0.0 | +0.3 | -0.2 | Mocking irony |

**Computational Notes**:
- **Bittersweetness**: Requires high-dimensional embedding to capture duality
- Neutral Valence doesn't mean "no feeling"—it means complex blending

---

### Category 6: Places We Go When We're Hurting

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Anguish** | -0.9 | +0.4 | -0.5 | Severe mental or physical pain |
| **Hopelessness** | -0.8 | -0.5 | -0.6 | Belief that nothing will improve |
| **Despair** | -0.9 | -0.6 | -0.7 | Complete loss of hope |
| **Sadness** | -0.6 | -0.4 | 0.0 | General unhappiness |
| **Grief** | -0.9 | -0.4 | +0.5 | **Paradox: Deep loss + love/connection** |

**Critical Distinction**:
- **Grief** has positive Connection despite extreme negative Valence
- This is what distinguishes it from Despair (which has negative Connection)

---

### Category 7: Places We Go With Others

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Compassion** | +0.5 | +0.2 | +0.9 | Feeling with + motivated to help |
| **Pity** | -0.3 | -0.1 | -0.7 | Feeling for (separation, condescension) |
| **Empathy** | +0.4 | +0.1 | +0.8 | Feeling with someone |
| **Sympathy** | +0.2 | 0.0 | +0.3 | Feeling for someone |
| **Boundaries** | +0.5 | +0.2 | +0.7 | Healthy limits in relationships |
| **Comparative Suffering** | -0.4 | +0.3 | -0.6 | Ranking pain ("I have it worse") |

**Validation Test**: The Observer MUST distinguish Compassion from Pity based solely on Connection.

---

### Category 8: Places We Go When We Fall Short

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Shame** | -0.9 | -0.1 | -1.0 | "I am bad" (identity-level) |
| **Self-Compassion** | +0.6 | -0.2 | +0.9 | Kindness toward self |
| **Perfectionism** | -0.3 | +0.5 | -0.6 | Rigid, unattainable standards |
| **Guilt** | -0.6 | +0.2 | -0.3 | "I did something bad" (behavior-level) |
| **Humiliation** | -0.8 | +0.4 | -0.9 | Public shame |
| **Embarrassment** | -0.4 | +0.5 | -0.2 | Mild social discomfort |

**Computational Notes**:
- **Shame**: Maximum negative Connection (z = -1.0)
- **Self-Compassion**: Rotational opposite of Shame
- **Perfectionism**: High rigidity score

---

### Category 9: Places We Go When We Search for Connection

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Belonging** | +0.8 | +0.4 | +1.0 | Authentic acceptance for who you are |
| **Fitting In** | +0.3 | +0.3 | -0.3 | Changing self to be accepted |
| **Connection** | +0.7 | +0.2 | +0.9 | Energy between people when seen/valued |
| **Disconnection** | -0.5 | -0.3 | -0.7 | Lack of meaningful connection |
| **Insecurity** | -0.4 | +0.4 | -0.5 | Uncertainty about self-worth |
| **Invisibility** | -0.6 | -0.3 | -0.8 | Feeling unseen |
| **Loneliness** | -0.7 | -0.2 | -0.9 | Isolation, disconnection |

---

### Category 10: Places We Go When the Heart Is Open

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Love** | +0.9 | +0.3 | +1.0 | Deep affection and connection |
| **Lovelessness** | -0.7 | -0.4 | -0.8 | Absence of love |
| **Heartbreak** | -0.8 | +0.4 | +0.3 | Loss of love (residual connection) |
| **Trust** | +0.6 | +0.1 | +0.9 | Belief in reliability |
| **Self-Trust** | +0.7 | +0.1 | +0.8 | Confidence in own judgment |
| **Betrayal** | -0.8 | +0.6 | -0.9 | Violation of trust |
| **Defensiveness** | -0.3 | +0.6 | -0.4 | Self-protection |
| **Flooding** | -0.6 | +0.9 | -0.7 | Emotional overwhelm, shutdown |
| **Hurt** | -0.6 | +0.2 | -0.3 | Emotional pain |

---

### Category 11: Places We Go When Life Is Good

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Joy** | +0.9 | +0.7 | +0.8 | Intense, brief positive feeling |
| **Happiness** | +0.7 | +0.5 | +0.5 | Stable positive well-being |
| **Calm** | +0.5 | -0.7 | +0.4 | Peaceful, tranquil state |
| **Contentment** | +0.6 | -0.5 | +0.5 | Satisfied, at ease |
| **Gratitude** | +0.8 | +0.3 | +0.9 | Appreciation for gifts/blessings |
| **Foreboding Joy** | +0.5 | +0.6 | -0.2 | Joy + fear of losing it |
| **Relief** | +0.6 | -0.3 | +0.3 | Release from distress |
| **Tranquility** | +0.7 | -0.8 | +0.6 | Deep peace |

**Computational Notes**:
- **Foreboding Joy**: Positive Valence but negative Connection (paradox)
- **Gratitude**: Antidote to Foreboding Joy (stabilizes rotation)

---

### Category 12: Places We Go When We Feel Wronged

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Anger** | -0.5 | +0.8 | -0.2 | Action emotion, response to injustice |
| **Contempt** | -0.6 | +0.3 | -0.8 | "You are beneath me" |
| **Disgust** | -0.7 | +0.5 | -0.6 | Revulsion, aversion |
| **Dehumanization** | -0.9 | +0.4 | -1.0 | Complete severing of connection |
| **Hate** | -0.9 | +0.6 | -1.0 | Sustained intense negativity |
| **Self-Righteousness** | +0.3 | +0.4 | -0.7 | False moral superiority |

---

### Category 13: Places We Go to Self-Assess

| Emotion | Valence | Arousal | Connection | Definition |
|---------|---------|---------|------------|------------|
| **Pride** | +0.7 | +0.6 | +0.6 | Healthy self-esteem |
| **Hubris** | +0.7 | +0.6 | -0.8 | Inflated ego, disconnected from reality |
| **Humility** | +0.6 | -0.2 | +0.8 | Grounded confidence |

**Key Distinction**: Pride vs. Hubris—identical V/A, opposite Connection

---

## Remaining Emotions (Extended List)

The following emotions complete the 87-emotion atlas. These are secondary emotions or sub-categories:

### Additional Emotions by Category

**Category 1 Additions**:
- Panic: `[-0.7, +0.9, -0.6]`
- Terror: `[-0.9, +0.9, -0.7]`

**Category 2 Additions**:
- Admiration (listed above)

**Category 3 Additions**:
- Disillusionment: `[-0.6, -0.3, -0.4]`
- Demoralization: `[-0.7, -0.5, -0.5]`

**Category 6 Additions**:
- Sorrow: `[-0.7, -0.3, +0.2]`
- Melancholy: `[-0.5, -0.6, +0.3]`

**Category 10 Additions**:
- Tenderness: `[+0.7, +0.1, +0.8]`
- Warmth: `[+0.6, +0.2, +0.7]`

**Category 11 Additions**:
- Serenity: `[+0.7, -0.7, +0.7]`
- Hope: `[+0.6, +0.3, +0.7]`

*Note: The complete 87 emotions will be provided in the seed script with generated embeddings.*

## Seeding Script Structure

The `scripts/seed_atlas.py` file will:

1. Define all 87 emotions with VAC coordinates
2. Generate semantic embeddings for each definition
3. Calculate quaternions from VAC vectors
4. Insert into `atlas_definitions` table

```python
# scripts/seed_atlas.py

import asyncio
from app.models.atlas_definition import AtlasDefinition
from app.services.embedding_service import EmbeddingService
from app.services.quaternion_builder import QuaternionBuilder
from app.dependencies import AsyncSessionLocal

EMOTIONS = [
    {
        "emotion_name": "Joy",
        "category": "Places We Go When Life Is Good",
        "definition": "An intense, brief feeling of positive emotion.",
        "vac": [0.9, 0.7, 0.8],
        "haptic_pattern_id": "LIGHT_PULSE"
    },
    {
        "emotion_name": "Shame",
        "category": "Places We Go When We Fall Short",
        "definition": "The intensely painful feeling of being flawed and unworthy of connection.",
        "vac": [-0.9, -0.1, -1.0],
        "haptic_pattern_id": "HEAVY_THROB"
    },
    # ... 85 more emotions
]

async def seed_atlas():
    embedding_service = EmbeddingService()
    quaternion_builder = QuaternionBuilder()
    
    async with AsyncSessionLocal() as session:
        for emotion in EMOTIONS:
            # Generate embedding
            embedding = await embedding_service.generate_embedding(
                f"{emotion['emotion_name']}: {emotion['definition']}"
            )
            
            # Calculate quaternion
            quaternion = quaternion_builder.from_vac(emotion['vac'])
            
            # Create record
            atlas_entry = AtlasDefinition(
                emotion_name=emotion['emotion_name'],
                category=emotion['category'],
                definition=emotion['definition'],
                vac_vector=emotion['vac'],
                q_constant=quaternion,
                semantic_embedding=embedding,
                haptic_pattern_id=emotion.get('haptic_pattern_id')
            )
            
            session.add(atlas_entry)
        
        await session.commit()
        print(f"Seeded {len(EMOTIONS)} emotions")

if __name__ == "__main__":
    asyncio.run(seed_atlas())
```

## Next Steps

Now that you understand the emotional atlas:
- **04-vector-search.md** - Learn how to query this data with pgvector
- **05-api-specification.md** - See how the API exposes this data
- **06-quaternion-conversion.md** - Understand VAC to quaternion math
