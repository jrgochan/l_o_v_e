# Section 1: Abstract

## Meta

- Target length: 0.3 pages (~250 words)
- Key messages: Hook with pity/compassion problem, introduce Connection axis, describe L.O.V.E. stack, cite validation results, emphasize mental health impact
- Status: Draft

---

## Content

Traditional dimensional models of emotion—Valence-Arousal (VA) and Valence-Arousal-Dominance (VAD)—fail to distinguish between emotionally similar but relationally distinct states. For example, pity and compassion share similar valence (both negative-to-neutral) and arousal (both low-energy), yet they represent fundamentally different interpersonal orientations: pity maintains hierarchical distance ("feeling FOR someone"), while compassion embodies shared humanity ("feeling WITH someone"). This distinction, critical for therapeutic validity in mental health applications, remains unoperationalized in existing computational emotion models.

We introduce the **Connection axis**—a novel third dimension measuring interpersonal alignment from separation ($C = -1$) to unity ($C = +1$)—forming the **VAC (Valence-Arousal-Connection) model**. The Connection axis distinguishes relationally different emotional states including pity vs. compassion, grief vs. despair, and shame vs. guilt. We implement this model in the **L.O.V.E. Stack** (Listener-Observer-Versor-Experience), a privacy-first microservices platform that extracts VAC coordinates from speech and text using local large language models, stores emotional trajectories in a vector database, performs therapeutic pathfinding with evidence-based strategies, and visualizes emotional states as 3D animated representations using quaternion mathematics.

Semantic validation demonstrates 98% accuracy in distinguishing pity from compassion, proving the Connection axis is computationally extractable from natural language. The system includes an 87-emotion atlas based on Brené Brown's relational research, 107 peer-reviewed regulation strategies, and A* pathfinding that respects psychological constraints (e.g., shame → self-compassion requires vulnerability as an intermediate state). By operationalizing relational quality in emotions, the VAC model enables mental health technologies to provide therapeutically valid guidance while maintaining user privacy through local processing.

---

## Notes for LaTeX Conversion

- Figures to reference: None
- Citations needed: Russell (VA), Mehrabian (PAD), Brené Brown, SLERP/quaternions
- Math equations: $C \in [-1, 1]$, VAC notation
- Tables: None
- Keywords: Emotion recognition, affective computing, mental health technology, dimensional emotion models, speech processing, VAC model

---

## Review Comments

- [Date] [Reviewer]: [Comment]
