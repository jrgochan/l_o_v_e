# Experience Module - VAC Model Reference

## The VAC Model: Beyond Valence-Arousal

Traditional affective computing uses the **VAD Model** (Valence-Arousal-Dominance), which maps emotions onto three axes:

- **Valence**: Pleasure vs. Displeasure
- **Arousal**: Activation vs. Deactivation
- **Dominance**: Control vs. Submission

Project L.O.V.E. replaces the "Dominance" dimension with **Connection**, creating the **VAC Model**:

- **Valence** (X-axis): Intrinsic attractiveness or aversiveness
- **Arousal** (Y-axis): Physiological stimulation and energy
- **Connection** (Z-axis): Authentic alignment with self and others

### Why Replace Dominance with Connection?

**Dominance** implies power dynamics and control. While useful for modeling certain emotional states (e.g., anger vs. fear), it fails to capture the **relational depth** that defines the human experience.

**Connection**, as defined by Dr. Brené Brown in _Atlas of the Heart_, is the "energy that exists between people when they feel seen, heard, and valued." It is:

- The foundation of vulnerability
- The opposite of loneliness
- The distinguishing factor between pity and compassion
- The measure of belonging vs. fitting in

By replacing Dominance with Connection, the VAC model can distinguish between emotionally similar states that differ in relational quality.

## The Three Dimensions Explained

### Valence (X-Axis): The Hedonic Tone

**Definition**: The intrinsic pleasantness or unpleasantness of an emotional state.

**Range**: -1.0 (extremely negative) to +1.0 (extremely positive)

**Examples**:

- **-1.0**: Shame, Despair, Anguish
- **-0.5**: Anger, Frustration, Disappointment
- **0.0**: Surprise (neutral), Confusion
- **+0.5**: Interest, Amusement, Relief
- **+1.0**: Joy, Gratitude, Ecstasy

**Visual Mapping**: Color gradient from **Crimson/Dark Red** (negative) to **Cyan/Teal** (positive)

**Key Insight**: Valence is NOT the same as "good" or "bad." Grief (highly negative valence) is not a "bad" emotion—it is the price of love. The visualization acknowledges this complexity through nuanced color palettes.

### Arousal (Y-Axis): The Energy Level

**Definition**: The degree of physiological activation, from calm to excited.

**Range**: -1.0 (very low arousal) to +1.0 (very high arousal)

**Examples**:

- **-1.0**: Calm, Contentment, Tranquility
- **-0.5**: Sadness, Resignation, Boredom
- **0.0**: Neutral alertness
- **+0.5**: Interest, Curiosity, Anticipation
- **+1.0**: Panic, Rage, Excitement, Overwhelm

**Visual Mapping**: Surface geometry roughness—**smooth** (low arousal) to **spiky/chaotic** (high arousal)

**Key Insight**: Arousal is **energy-neutral**. High arousal can be positive (excitement) or negative (panic). Low arousal can be positive (calm) or negative (depression).

### Connection (Z-Axis): The Relational Alignment

**Definition**: The degree to which one feels authentically aligned with oneself and others.

**Range**: -1.0 (deeply disconnected) to +1.0 (profoundly connected)

**Examples**:

- **-1.0**: Loneliness, Shame, Dehumanization
- **-0.5**: Disconnection, Pity, Self-Righteousness
- **0.0**: Neutral (neither connected nor disconnected)
- **+0.5**: Belonging, Empathy, Interest in Others
- **+1.0**: Love, Compassion, Authentic Connection

**Visual Mapping**: Opacity and glow—**opaque/dull** (disconnected) to **translucent/radiant** (connected)

**Key Insight**: Connection is the dimension that allows us to distinguish between:

- **Pity** (negative Connection) vs. **Compassion** (positive Connection)
- **Fitting In** (external alignment) vs. **Belonging** (internal alignment)
- **Loneliness** (lack of Connection) vs. **Solitude** (peaceful Connection with self)

## The 87 Emotions: Atlas of the Heart

Dr. Brené Brown's research identifies **87 distinct emotions and experiences**, organized into **13 categories** or "Places We Go."

### Category 1: Places We Go When Things Are Uncertain or Too Much

**Emotions**: Stress, Overwhelm, Anxiety, Worry, Avoidance, Excitement, Dread, Fear, Vulnerability

| Emotion       | Valence | Arousal | Connection | Notes                            |
| ------------- | ------- | ------- | ---------- | -------------------------------- |
| Stress        | -0.4    | +0.6    | -0.2       | High arousal, mild negativity    |
| Overwhelm     | -0.6    | +0.9    | -0.3       | Saturation point, cannot process |
| Anxiety       | -0.5    | +0.7    | -0.4       | Future-focused fear              |
| Worry         | -0.4    | +0.5    | -0.3       | Cognitive anxiety                |
| Excitement    | +0.7    | +0.8    | +0.4       | Positive high arousal            |
| Fear          | -0.6    | +0.8    | -0.5       | Threat response                  |
| Vulnerability | 0.0     | +0.3    | +0.6       | Gateway to connection            |

**Visual Character**: High arousal creates spiky, vibrating surfaces. Negative emotions skew toward crimson; excitement toward cyan.

### Category 2: Places We Go When We Compare

**Emotions**: Comparison, Admiration, Reverence, Envy, Jealousy, Resentment, Schadenfreude, Freudenfreude

| Emotion       | Valence | Arousal | Connection | Notes                      |
| ------------- | ------- | ------- | ---------- | -------------------------- |
| Envy          | -0.5    | +0.4    | -0.6       | "I want what you have"     |
| Jealousy      | -0.6    | +0.7    | -0.7       | Fear of losing what's mine |
| Resentment    | -0.7    | +0.5    | -0.8       | Stored anger + envy        |
| Admiration    | +0.6    | +0.3    | +0.5       | Inspiration without envy   |
| Schadenfreude | +0.3    | +0.4    | -0.7       | Pleasure from others' pain |
| Freudenfreude | +0.8    | +0.5    | +0.9       | Joy at others' success     |

**Key Distinction**: Schadenfreude and Freudenfreude have similar valence/arousal but **opposite** Connection scores.

### Category 3: Places We Go When Things Don't Go As Planned

**Emotions**: Boredom, Disappointment, Expectations, Regret, Discouragement, Resignation, Frustration

| Emotion        | Valence | Arousal | Connection | Notes                               |
| -------------- | ------- | ------- | ---------- | ----------------------------------- |
| Boredom        | -0.2    | -0.8    | -0.2       | Very low arousal                    |
| Disappointment | -0.5    | -0.3    | 0.0        | Gap between expectation and reality |
| Regret         | -0.6    | -0.2    | -0.3       | Past-focused                        |
| Frustration    | -0.5    | +0.7    | -0.2       | High energy, blocked goal           |
| Resignation    | -0.6    | -0.6    | -0.5       | Giving up                           |

**Visual Character**: Low arousal creates smooth, deflated surfaces. Frustration is an exception (spiky but blocked).

### Category 4: Places We Go When It's Beyond Us

**Emotions**: Awe, Wonder, Confusion, Curiosity, Interest, Surprise

| Emotion   | Valence | Arousal | Connection | Notes                 |
| --------- | ------- | ------- | ---------- | --------------------- |
| Awe       | +0.7    | +0.5    | +0.8       | Transcendence of self |
| Wonder    | +0.6    | +0.4    | +0.7       | Openness to mystery   |
| Confusion | -0.2    | +0.3    | -0.2       | High entropy state    |
| Curiosity | +0.5    | +0.6    | +0.3       | Drive to explore      |
| Surprise  | 0.0     | +0.8    | 0.0        | Valence-neutral shock |

**Key Insight**: Awe has high Connection (connection to something greater than self).

### Category 5: Places We Go When Things Aren't What They Seem

**Emotions**: Amusement, Bittersweetness, Nostalgia, Cognitive Dissonance, Paradox, Irony, Sarcasm

| Emotion              | Valence | Arousal | Connection | Notes                        |
| -------------------- | ------- | ------- | ---------- | ---------------------------- |
| Amusement            | +0.6    | +0.4    | +0.3       | Light-hearted humor          |
| Bittersweetness      | 0.0     | -0.2    | +0.5       | Simultaneous joy and sadness |
| Nostalgia            | +0.3    | -0.2    | +0.4       | Longing for the past         |
| Cognitive Dissonance | -0.4    | +0.5    | -0.3       | Internal conflict            |

**Visual Character**: Bittersweetness may require **color blending** in the shader (mixing crimson and cyan).

### Category 6: Places We Go When We're Hurting

**Emotions**: Anguish, Hopelessness, Despair, Sadness, Grief

| Emotion      | Valence | Arousal | Connection | Notes                               |
| ------------ | ------- | ------- | ---------- | ----------------------------------- |
| Anguish      | -0.9    | +0.4    | -0.5       | Acute suffering                     |
| Hopelessness | -0.8    | -0.5    | -0.6       | No future trajectory                |
| Despair      | -0.9    | -0.6    | -0.7       | Complete loss of hope               |
| Sadness      | -0.6    | -0.4    | 0.0        | Basic negative affect               |
| Grief        | -0.9    | -0.4    | +0.5       | **Paradox: Deep love despite loss** |

**Key Insight**: Grief has **negative valence** but **positive Connection** (connection to what was lost).

### Category 7: Places We Go With Others

**Emotions**: Compassion, Pity, Empathy, Sympathy, Boundaries, Comparative Suffering

| Emotion    | Valence | Arousal | Connection | Notes                    |
| ---------- | ------- | ------- | ---------- | ------------------------ |
| Compassion | +0.5    | +0.2    | +0.9       | Feeling WITH + action    |
| Pity       | -0.3    | -0.1    | -0.7       | Feeling FOR (separation) |
| Empathy    | +0.4    | +0.1    | +0.8       | Feeling with someone     |
| Sympathy   | +0.2    | 0.0     | +0.3       | Feeling for someone      |

**Critical Distinction**: Compassion and Pity are differentiated **entirely** by Connection.

### Category 8: Places We Go When We Fall Short

**Emotions**: Shame, Self-Compassion, Perfectionism, Guilt, Humiliation, Embarrassment

| Emotion         | Valence | Arousal | Connection | Notes                            |
| --------------- | ------- | ------- | ---------- | -------------------------------- |
| Shame           | -0.9    | -0.1    | -1.0       | "I am bad" (identity)            |
| Guilt           | -0.6    | +0.2    | -0.3       | "I did something bad" (behavior) |
| Humiliation     | -0.8    | +0.4    | -0.9       | Public shame                     |
| Embarrassment   | -0.4    | +0.5    | -0.2       | Mild social discomfort           |
| Self-Compassion | +0.6    | -0.2    | +0.9       | Antidote to shame                |

**Key Insight**: Shame is maximum negative Connection. Self-Compassion is its rotational opposite.

### Category 9: Places We Go When We Search for Connection

**Emotions**: Belonging, Fitting In, Connection, Disconnection, Insecurity, Invisibility, Loneliness

| Emotion       | Valence | Arousal | Connection | Notes                 |
| ------------- | ------- | ------- | ---------- | --------------------- |
| Belonging     | +0.8    | +0.4    | +1.0       | Authentic acceptance  |
| Fitting In    | +0.3    | +0.3    | -0.3       | External conformity   |
| Connection    | +0.7    | +0.2    | +0.9       | Being seen and valued |
| Disconnection | -0.5    | -0.3    | -0.7       | Lack of connection    |
| Loneliness    | -0.7    | -0.2    | -0.9       | Isolation             |

**Key Distinction**: Belonging vs. Fitting In—same arousal, but opposite Connection.

### Category 10: Places We Go When the Heart Is Open

**Emotions**: Love, Lovelessness, Heartbreak, Trust, Self-Trust, Betrayal, Defensiveness, Flooding, Hurt

| Emotion    | Valence | Arousal | Connection | Notes                              |
| ---------- | ------- | ------- | ---------- | ---------------------------------- |
| Love       | +0.9    | +0.3    | +1.0       | Ultimate connection                |
| Trust      | +0.6    | +0.1    | +0.9       | Vulnerable connection              |
| Betrayal   | -0.8    | +0.6    | -0.9       | Broken trust                       |
| Heartbreak | -0.8    | +0.4    | +0.3       | Loss of love (residual connection) |
| Flooding   | -0.6    | +0.9    | -0.7       | Overwhelm causing shutdown         |

### Category 11: Places We Go When Life Is Good

**Emotions**: Joy, Happiness, Calm, Contentment, Gratitude, Foreboding Joy, Relief, Tranquility

| Emotion        | Valence | Arousal | Connection | Notes                 |
| -------------- | ------- | ------- | ---------- | --------------------- |
| Joy            | +0.9    | +0.7    | +0.8       | Intense positive      |
| Happiness      | +0.7    | +0.5    | +0.5       | General well-being    |
| Calm           | +0.5    | -0.7    | +0.4       | Peaceful low arousal  |
| Contentment    | +0.6    | -0.5    | +0.5       | Satisfied low arousal |
| Gratitude      | +0.8    | +0.3    | +0.9       | Acknowledging gifts   |
| Foreboding Joy | +0.5    | +0.6    | -0.2       | Joy + anxiety         |
| Tranquility    | +0.7    | -0.8    | +0.6       | Ultimate peace        |

**Key Insight**: Foreboding Joy has positive valence but negative Connection (fear of loss).

### Category 12: Places We Go When We Feel Wronged

**Emotions**: Anger, Contempt, Disgust, Dehumanization, Hate, Self-Righteousness

| Emotion            | Valence | Arousal | Connection | Notes                   |
| ------------------ | ------- | ------- | ---------- | ----------------------- |
| Anger              | -0.5    | +0.8    | -0.2       | Action emotion          |
| Contempt           | -0.6    | +0.3    | -0.8       | "You are beneath me"    |
| Disgust            | -0.7    | +0.5    | -0.6       | Revulsion               |
| Hate               | -0.9    | +0.6    | -1.0       | Sustained negative      |
| Self-Righteousness | +0.3    | +0.4    | -0.7       | False moral superiority |

### Category 13: Places We Go to Self-Assess

**Emotions**: Pride, Hubris, Humility

| Emotion  | Valence | Arousal | Connection | Notes                      |
| -------- | ------- | ------- | ---------- | -------------------------- |
| Pride    | +0.7    | +0.6    | +0.6       | Healthy self-esteem        |
| Hubris   | +0.7    | +0.6    | -0.8       | Inflated ego, disconnected |
| Humility | +0.6    | -0.2    | +0.8       | Grounded confidence        |

**Key Distinction**: Pride vs. Hubris—same valence/arousal, opposite Connection.

## Visualizing VAC Space

### The Emotional Cube

Imagine a 3D cube where:

- **X-axis** runs left (negative valence) to right (positive valence)
- **Y-axis** runs down (low arousal) to up (high arousal)
- **Z-axis** runs backward (disconnected) to forward (connected)

Each emotion occupies a unique point in this space. The Soul Sphere's **orientation** represents the user's position within this cube.

### Quadrants and Octants

**Positive Octant** (all positive):

- Joy, Gratitude, Excitement, Love

**Negative Octant** (all negative):

- Despair, Shame, Loneliness

**Mixed States**:

- Grief: Negative Valence + Positive Connection
- Foreboding Joy: Positive Valence + Negative Connection

## Implementation Notes for Developers

### Normalizing VAC Values

The Versor engine outputs normalized scalars in the range `[-1.0, 1.0]`. These values must be mapped to shader uniforms and visual properties.

```typescript
interface VACState {
  valence: number; // -1.0 to 1.0
  arousal: number; // -1.0 to 1.0
  connection: number; // -1.0 to 1.0
}
```

### Edge Cases

1. **Neutral State** `[0, 0, 0]`: The identity quaternion. The sphere is smooth, gray, and moderately opaque.

2. **Confusion/Surprise**: High arousal, neutral valence/connection. Rapid color shifting or increased noise frequency.

3. **Bittersweetness**: Overlapping positive and negative valence. Use color blending or chromatic aberration.

### Canonical Emotions for Testing

Use these as test vectors during development:

```typescript
const CANONICAL_EMOTIONS = {
  joy: [0.9, 0.7, 0.8],
  shame: [-0.9, -0.1, -1.0],
  anger: [-0.5, 0.8, -0.2],
  grief: [-0.9, -0.4, 0.5],
  compassion: [0.5, 0.2, 0.9],
  pity: [-0.3, -0.1, -0.7],
  calm: [0.5, -0.7, 0.4],
  overwhelm: [-0.6, 0.9, -0.3],
};
```

## Next Steps

Now that you understand the VAC model:

- **04-soul-sphere-specification.md** - Learn how these values translate to visual properties
- **05-shader-implementation.md** - See the GLSL code that implements this mapping
