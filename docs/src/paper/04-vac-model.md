# Section 4: The VAC Model

## Meta

- Target length: 3.0 pages
- Key messages: Formal definition of VAC space, Connection axis theory, 87-emotion atlas, critical distinctions, distance metrics
- Status: Draft

---

## Content

### 4.1 Mathematical Definition

The VAC model represents emotional states as points in a three-dimensional continuous space:

$$\text{Emotion} \in \mathbb{R}^3: (V, A, C) \text{ where } V, A, C \in [-1, +1]$$

Each dimension captures a distinct aspect of emotional experience:

**Valence (V)**: The hedonic quality of the emotion

- $V = +1$: Maximum pleasantness (e.g., joy, ecstasy)
- $V = 0$: Neutral hedonic tone
- $V = -1$: Maximum unpleasantness (e.g., anguish, despair)

**Arousal (A)**: The physiological activation level

- $A = +1$: Maximum activation (e.g., panic, excitement)
- $A = 0$: Moderate activation
- $A = -1$: Minimum activation (e.g., lethargy, calm)

**Connection (C)**: The interpersonal alignment quality

- $C = +1$: Complete unity, "feeling WITH" (e.g., deep empathy, compassion)
- $C = 0$: No relational component, or balanced
- $C = -1$: Complete separation, "feeling FOR/AT" (e.g., pity, condescension)

The VAC space forms a unit cube $[-1, +1]^3$ containing $2^3 = 8$ corners representing archetypal emotional states. However, most emotions occupy interior positions, creating a continuous emotional landscape.

### 4.2 The Connection Dimension: Theoretical Foundation

#### Etymology and Linguistic Evidence

The linguistic distinction between "feeling WITH" and "feeling FOR" appears across languages and cultures:

- **Compassion**: From Latin *com-* (with) + *pati* (to suffer) = "to suffer with"
- **Sympathy**: From Greek *syn-* (together) + *pathos* (feeling) = "feeling together" (but often interpreted as "feeling for")
- **Empathy**: From Greek *en-* (in) + *pathos* (feeling) = "feeling into"
- **Pity**: From Latin *pietas* (piety, duty), implying distance and hierarchy

These etymological roots suggest that human emotional experience has always included a relational dimension.

#### Brené Brown's Empirical Framework

Brown's (2021) research on 87 emotions emphasizes relational quality as fundamental [CITATION]. She distinguishes:

**Pity**: "A feeling that another's suffering is your good fortune" (separates)
**Sympathy**: "I feel for you" (well-intentioned but maintains distance)  
**Empathy**: "I feel with you" (requires vulnerability and connection)
**Compassion**: "I recognize your suffering and I want to help" (WITH, not FOR)

Brown's framework emerged from extensive qualitative research (12,000+ data pieces) and emphasizes that people commonly conflate these terms, yet they produce distinct relational outcomes.

#### Therapeutic Significance

The Connection dimension has direct therapeutic implications:

1. **Shame vs. Guilt**: Brown distinguishes these as:
   - Shame: "I am bad" (disconnection from self: $C < 0$)
   - Guilt: "I did something bad" (connection to values maintained: $C > 0$)

   Shame is less amenable to change because it involves identity-level disconnection, while guilt allows for repair.

2. **Grief vs. Despair**:
   - Grief: "I lost someone I love" (love persists: $C > 0$)
   - Despair: "I am alone in my suffering" (isolation: $C < 0$)

   Therapeutic approaches differ: grief benefits from connection-enhancing interventions, while despair requires first addressing isolation.

3. **Compassion vs. Pity**:
   - Compassion fosters healing and agency
   - Pity can reinforce victimhood and dependence

   Mental health systems must distinguish these to avoid iatrogenic harm.

### 4.3 The 87-Emotion Atlas

We map all 87 emotions from Brown's "Atlas of the Heart" to VAC coordinates. This mapping was performed through:

1. **Theoretical Analysis**: Examining Brown's descriptions of each emotion's relational quality
2. **Semantic Validation**: Testing LLM extraction on exemplar phrases
3. **Iterative Refinement**: Adjusting coordinates to maintain geometric consistency

Below we present key emotions from each of Brown's 13 categories:

#### Category 1: Places We Go When Life Is Good

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| Joy | 0.9 | 0.7 | 0.8 | Energized, connected positivity |
| Gratitude | 0.8 | 0.3 | 0.9 | Warm appreciation WITH others |
| Contentment | 0.7 | -0.2 | 0.5 | Peaceful satisfaction |
| Happiness | 0.8 | 0.5 | 0.6 | General positive state |

#### Category 2: Places We Go When Things Don't Go as Planned

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| Disappointment | -0.4 | -0.1 | 0.2 | Unmet expectations, connected to hopes |
| Frustration | -0.3 | 0.6 | -0.2 | Blocked goals, mild separation |
| Regret | -0.5 | 0.1 | 0.3 | Wish for different choice, values intact |

#### Category 3: Places We Go When It's Beyond Us

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| Awe | 0.5 | 0.4 | 0.7 | Vastness, connection to something greater |
| Wonder | 0.6 | 0.3 | 0.6 | Curious openness |
| Overwhelm | -0.2 | 0.7 | -0.3 | Flooded, struggling to connect |

#### Category 8: Places We Go When We Fall Short

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| **Shame** | -0.7 | -0.2 | **-0.8** | Deep self-disconnection |
| **Guilt** | -0.5 | 0.1 | **0.4** | Values-connected despite transgression |
| Humiliation | -0.8 | 0.3 | -0.9 | Public shaming, severe disconnection |
| Embarrassment | -0.4 | 0.2 | -0.3 | Mild social disconnection |

#### Category 10: Places We Go When We Feel Wronged

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| Anger | -0.6 | 0.8 | -0.4 | High energy separation |
| Contempt | -0.7 | 0.4 | -0.9 | Dismissive, extreme separation |
| Resentment | -0.5 | 0.4 | -0.6 | Prolonged bitterness |

#### Category 11: Places We Go When the Heart Is Open

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| **Compassion** | 0.5 | 0.2 | **0.9** | Suffering WITH |
| **Pity** | -0.3 | -0.1 | **-0.7** | Suffering FOR (distance) |
| Sympathy | 0.1 | 0.0 | 0.3 | Mild connection, "feeling for" |
| **Empathy** | 0.0 | 0.3 | **0.95** | Pure resonance |

#### Category 13: Places We Go When Life Is Heartbreaking

| Emotion | V | A | C | Interpretation |
|---------|---|---|---|----------------|
| **Grief** | -0.8 | -0.3 | **0.7** | Love persists through loss |
| **Despair** | -0.9 | -0.4 | **-0.6** | Isolated suffering |
| Sadness | -0.6 | -0.2 | 0.2 | General negative affect |
| Anguish | -0.9 | 0.5 | -0.5 | Intense suffering with disconnection |

*Complete 87-emotion atlas available in supplementary materials.*

### 4.4 Critical Distinctions Enabled by Connection

The Connection axis enables computational systems to distinguish emotionally similar but relationally distinct states:

#### Distinction 1: Pity vs. Compassion

**Similarity in VA Space:**

- Both involve recognizing another's suffering (negative valence)
- Both are relatively low-energy states (low arousal)
- VAD's dominance doesn't clearly separate them

**Distinction in VAC Space:**

- **Pity** $(-0.3, -0.1, -0.7)$: Maintains hierarchical distance, "I'm fortunate not to be them"
- **Compassion** $(0.5, 0.2, 0.9)$: Shared humanity, "I'm with you in this"

**Distance**: $\Delta_{VAC} = \sqrt{(0.8)^2 + (0.3)^2 + (1.6)^2} = 1.83$

The Connection axis contributes most to the distance (1.6 out of 1.83), confirming it's the primary distinguishing feature.

#### Distinction 2: Grief vs. Despair

**Similarity in VA Space:**

- Both are intensely negative (high negative valence)
- Both involve low energy (low arousal)

**Distinction in VAC Space:**

- **Grief** $(-0.8, -0.3, 0.7)$: Connection to the lost person/thing persists; love endures
- **Despair** $(-0.9, -0.4, -0.6)$: Isolated suffering, disconnected from support

**Therapeutic Implication**: Grief requires honoring connection while allowing painful feelings. Despair requires first re-establishing connection (e.g., reaching out) before emotional processing can occur. Treating them identically risks therapeutic harm.

#### Distinction 3: Shame vs. Guilt

**Similarity in VA Space:**

- Both involve negative self-evaluation (negative valence)
- Both may have similar arousal

**Distinction in VAC Space:**

- **Shame** $(-0.7, -0.2, -0.8)$: "I am bad" (identity-level disconnection)
- **Guilt** $(-0.5, 0.1, 0.4)$: "I did bad" (values-connection maintained)

**Therapeutic Implication**: Brown's research shows shame is far more correlated with psychopathology than guilt. The VAC model captures this: shame's severe negative Connection score ($C = -0.8$) indicates the need for vulnerability and reconnection before self-compassion is possible. Simply "reframing" shame doesn't work—connection must be rebuilt.

### 4.5 Distance Metrics and Similarity

To measure similarity between emotional states, we use weighted Euclidean distance:

$$d(e_1, e_2) = \sqrt{w_V(V_1 - V_2)^2 + w_A(A_1 - A_2)^2 + w_C(C_1 - C_2)^2}$$

where weights reflect psychological significance:

- $w_V = 1.0$ (baseline importance)
- $w_A = 1.2$ (arousal significantly impacts regulation difficulty)
- $w_C = 1.5$ (Connection most psychologically significant)

**Rationale for Connection Weight**: Therapeutic literature suggests relational quality is the strongest predictor of outcomes [CITATION]. Transitions across the Connection axis (e.g., shame → self-compassion) are more psychologically demanding than equal-magnitude transitions in Valence or Arousal.

**Example**: Distance from shame to guilt:
$$d(\text{shame}, \text{guilt}) = \sqrt{1.0(-0.7 - (-0.5))^2 + 1.2(-0.2 - 0.1)^2 + 1.5(-0.8 - 0.4)^2}$$
$$= \sqrt{0.04 + 0.108 + 2.16} = 1.52$$

The Connection difference dominates (contributing 2.16 out of 2.31), confirming that shame → guilt transitions are primarily about reconnection.

### 4.6 Comparison with Existing 3D Models

| Model | V | A | 3rd Dim | Captures Relational Quality? | Therapeutic Validity |
|-------|---|---|---------|------------------------------|---------------------|
| **VA** (Russell) | ✅ | ✅ | ❌ | ❌ No 3rd dimension | Low |
| **VAD** (Mehrabian) | ✅ | ✅ | Dominance | ❌ Power, not connection | Moderate |
| **VAC** (Ours) | ✅ | ✅ | **Connection** | ✅ WITH vs FOR/AT | High |

**Why Dominance Falls Short:**

Dominance measures control but conflates different types of emotional experience:

- High-dominance compassion (protective care) vs. high-dominance pity (condescension)
- Low-dominance empathy (humble resonance) vs. low-dominance despair (helplessness)

Connection explicitly measures relational alignment, providing therapeutic clarity that dominance cannot.

### 4.7 Theoretical Predictions

The VAC model makes several testable predictions:

**Prediction 1**: Prosodic features in speech will correlate with Connection scores

- Hypothesis: "Feeling WITH" involves different vocal patterns than "feeling FOR"
- Proposed signals: Pitch synchrony, warmth in voice quality, reduced vocal distance

**Prediction 2**: Connection scores predict therapeutic outcomes

- Hypothesis: Increasing Connection over therapy correlates with symptom reduction
- Test: Track VAC trajectories during treatment, correlate with PHQ-9/GAD-7 scores

**Prediction 3**: Connection is culturally universal but with different baselines

- Hypothesis: All cultures distinguish WITH/FOR, but collectivist cultures show higher average C
- Test: Cross-cultural validation of VAC extraction

**Prediction 4**: Biometric markers correlate with Connection

- Hypothesis: Positive Connection correlates with oxytocin, vagal tone, HRV; negative Connection with cortisol
- Test: Lab study measuring physiology during pity vs. compassion induction

These predictions provide a research agenda for validating the Connection dimension across modalities and populations.

---

## Notes for LaTeX Conversion

- Figures to reference:
  - Figure 1: VAC 3D space with key emotions plotted
  - Table 2: 87-emotion atlas (abbreviated, full version in appendix)
  - Figure 2: Pity vs. Compassion distinction visualization
- Citations needed:
  - Brené Brown (2021) - Atlas of the Heart
  - Russell (1980) - Circumplex Model
  - Mehrabian & Russell (1974) - PAD Model
  - Therapeutic outcome literature (connection predicts outcomes)
  - Cross-cultural emotion research
- Math equations: VAC definition, distance metric, example calculations
- Tables: Multiple emotion mapping tables, model comparison table

---

## Review Comments

- [Date] [Reviewer]: [Comment]
