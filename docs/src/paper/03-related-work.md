# Section 3: Related Work

## Meta

- Target length: 1.5 pages
- Key messages: Review existing dimensional models, speech emotion recognition, mental health tech, and establish the gap that Connection fills
- Status: Draft

---

## Content

### 3.1 Dimensional Emotion Models

#### Valence-Arousal (VA) Models

Russell's (1980) Circumplex Model revolutionized emotion research by proposing that all emotions could be positioned in a two-dimensional space defined by valence (pleasantness) and arousal (activation) [CITATION]. This model's elegance and empirical support made it the dominant framework in affective computing. Subsequent work has refined the circumplex, exploring whether the space is truly circular or has quadrants with different properties [CITATION].

However, VA models face fundamental limitations. Emotions that differ in relational quality but share similar valence and arousal are indistinguishable. For example, pity, sympathy, and compassion all occupy similar regions of VA space despite representing distinct interpersonal stances. This conflation limits therapeutic applications where relational quality is paramount.

#### Valence-Arousal-Dominance (VAD) Models

Mehrabian and Russell (1974) introduced the PAD model, adding Dominance as a third dimension [CITATION]. Dominance captures the sense of control or power in an emotional experience:

- High dominance: Anger, pride, contempt
- Low dominance: Fear, shame, guilt

While PAD improves on VA by adding dimensionality, dominance measures power relationships rather than interpersonal alignment. High-dominance pity (condescension) and high-dominance compassion (protective care) would both score similarly, missing the crucial relational distinction.

#### Other Dimensional Approaches

The Pleasure-Arousal-Dominance space has been extended in various ways [CITATION]. Some researchers have proposed additional dimensions like "approach-avoidance" or "certainty-uncertainty." However, none explicitly capture the quality of interpersonal connection that distinguishes relationally different emotional states.

### 3.2 Categorical Emotion Models

#### Basic Emotions Theory

Ekman's (1992) basic emotions approach identifies universal emotional categories (happiness, sadness, fear, anger, surprise, disgust) based on facial expressions [CITATION]. While empirically grounded and cross-culturally validated, categorical models lack the continuous structure needed for smooth emotional transitions in computational systems.

#### Complex Emotion Taxonomies

More recent work has expanded beyond basic emotions. Cowen and Keltner (2017) identified 27 distinct categories through semantic space analysis [CITATION]. Brené Brown's (2021) "Atlas of the Heart" catalogues 87 emotional experiences organized into 13 categories [CITATION]. These rich taxonomies capture nuance but lack mathematical structure for computation.

The VAC model bridges categorical and dimensional approaches: we map Brown's 87 emotions onto VAC coordinates, providing both categorical richness and dimensional continuity.

### 3.3 Speech-Based Emotion Recognition

#### Acoustic Feature Extraction

Speech-based emotion recognition has focused primarily on acoustic features: prosody, pitch (F0), intensity, formant frequencies, speech rate, and voice quality [CITATION]. Provost et al. have demonstrated that these features can distinguish emotional states with reasonable accuracy [CITATION - Emily's papers]. Most work targets VA space or discrete emotion categories.

#### Multimodal Approaches

Recent systems combine acoustic, linguistic, and visual channels for improved accuracy [CITATION]. Provost's work on multimodal emotion recognition has shown that semantic content complements acoustic features [CITATION - Emily's papers]. However, most multimodal systems still target traditional VA or categorical representations.

#### Mental Health Applications

Speech analysis has shown promise for mental health monitoring. Studies have used speech features to detect depression [CITATION], assess bipolar disorder symptom severity [CITATION], and estimate suicide risk [CITATION]. Provost's work in this domain has emphasized the importance of naturalistic, real-world speech data [CITATION - Emily's papers].

Our work extends this line of research by proposing that acoustic features might carry information about the Connection dimension—a hypothesis we leave for future investigation.

### 3.4 Mental Health Technology

#### Mood Tracking Applications

Numerous applications allow users to self-report emotional states. Apps like Daylio, MoodPath, and Bearable use simple emotion selectors or VA-based mood wheels [CITATION]. While useful for longitudinal tracking, these lack the relational dimension needed for therapeutic validity.

#### AI Chatbots and Therapy Apps

Woebot, Wysa, and similar applications provide cognitive-behavioral therapy (CBT) interventions through conversational interfaces [CITATION]. These systems typically use sentiment analysis to detect user emotional state. However, without the ability to distinguish pity from compassion or shame from guilt, they risk providing therapeutically inappropriate guidance.

#### Emotion Regulation Tools

Some applications focus specifically on emotion regulation, providing evidence-based strategies from DBT, CBT, and mindfulness traditions [CITATION]. However, most lack sophisticated models of emotional transitions. The L.O.V.E. Stack's A* pathfinding with psychological constraints represents a more principled approach.

### 3.5 3D Emotional Visualization

#### Affective Computing Visualizations

Prior work has visualized emotions in 3D space, typically using VAD coordinates [CITATION]. These visualizations help users understand their emotional state spatially. However, without a meaningful third dimension (beyond dominance), the utility is limited.

#### Virtual Reality Emotion Experiences

VR applications have explored immersive emotional experiences [CITATION]. Some use spatial positioning to represent emotional intensity or valence. The L.O.V.E. Stack's quaternion-based 3D visualization builds on this work but with a theoretically grounded third dimension (Connection).

#### Biofeedback and Wearables

Systems integrating heart rate variability, galvanic skin response, and other physiological signals have created real-time emotional feedback loops [CITATION]. Future work could integrate these biometric signals with VAC coordinates to provide multimodal emotional assessment.

### 3.6 Gap Analysis: The Need for Connection

Existing emotion models face a common limitation: they cannot distinguish emotionally similar but relationally distinct states. This gap has several consequences:

1. **Therapeutic Invalidity**: Mental health applications may guide users toward pity when compassion is needed, or fail to recognize that shame requires vulnerability before self-compassion can emerge.

2. **Missed Opportunities in HCI**: Conversational AI systems cannot adjust their relational stance to match user needs. A system that recognizes when a user needs "feeling WITH" versus "feeling FOR" could provide more appropriate support.

3. **Cultural Insensitivity**: Different cultures may emphasize connection differently. Without measuring this dimension, systems cannot adapt to cultural variations in emotional expression.

4. **Incomplete Multimodal Models**: If Connection can be detected in speech prosody (a hypothesis supported by linguistic research on empathy), current systems are missing a valuable signal.

The VAC model addresses this gap by operationalizing relational quality as a computational dimension. In the following sections, we demonstrate that this dimension can be extracted from language, validated experimentally, and implemented in a complete system for mental health applications.

---

## Notes for LaTeX Conversion

- Figures to reference: None in this section
- Citations needed:
  - Russell (1980) - Circumplex Model
  - Mehrabian & Russell (1974) - PAD Model
  - Ekman (1992) - Basic emotions
  - Cowen & Keltner (2017) - 27 emotions
  - Brené Brown (2021) - 87 emotions
  - Emily Provost's key papers (3-5 citations)
  - Speech emotion recognition survey papers
  - Mental health app studies
  - 3D visualization papers
- Math equations: None
- Tables: Potentially a comparison table of emotion models (VA vs VAD vs VAC)

---

## Review Comments

- [Date] [Reviewer]: [Comment]
