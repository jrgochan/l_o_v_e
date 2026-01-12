# CLAIMS

## Independent Claims

### CLAIM 1: VAC Coordinate System

A method for representing emotional states in computational space, comprising:

- (a) defining a three-dimensional coordinate system wherein:
  - (i) a first axis represents Valence ranging from -1 (negative) to +1 (positive);
  - (ii) a second axis represents Arousal ranging from -1 (deactivated) to +1 (activated);
  - (iii) a third axis represents Connection ranging from -1 (interpersonal separation) to +1 (interpersonal unity);
- (b) wherein said Connection axis measures relational quality distinct from power or dominance;
- (c) wherein negative Connection values represent feeling FOR or AT another person; and
- (d) wherein positive Connection values represent feeling WITH another person.

### CLAIM 2: VAC-to-Quaternion Transformation

A method for converting three-dimensional emotional coordinates into quaternion representations, comprising:

- (a) receiving Valence (V), Arousal (A), and Connection (C) coordinates each within the range [-1, 1];
- (b) normalizing said coordinates to the range [0, 1];
- (c) computing angular parameters:
  - (i) θ = π·(V+1)/2
  - (ii) φ = π·(A+1)/2
  - (iii) ψ = π·(C+1)/2
- (d) calculating quaternion components:
  - (i) w = cos(θ/2)
  - (ii) x = sin(θ/2)·cos(φ)·sin(ψ)
  - (iii) y = sin(θ/2)·sin(φ)·sin(ψ)
  - (iv) z = sin(θ/2)·cos(ψ)
- (e) normalizing the resulting quaternion to unit length.

### CLAIM 3: Category-Aware Pathfinding

A method for generating therapeutically valid emotional transition paths, comprising:

- (a) organizing a plurality of emotional states into psychological categories;
- (b) defining valid transition rules between said categories based on psychological research;
- (c) receiving a current emotional state and a goal emotional state;
- (d) applying A* pathfinding algorithm with a cost function that includes:
  - (i) weighted distance in VAC space wherein Connection is weighted higher than Valence or Arousal;
  - (ii) category transition penalties for psychologically difficult transitions;
  - (iii) arousal ceiling constraints preventing paths that increase arousal above a threshold;
  - (iv) user history bonuses for previously successful transitions;
- (e) identifying bridge emotions that enable otherwise invalid transitions;
- (f) outputting a sequence of intermediate emotional states forming a path from current to goal state.

### CLAIM 4: Multi-Modal Incongruence Detection

A system for detecting emotional incongruence, comprising:

- (a) a semantic analysis module that extracts VAC coordinates from text using natural language processing;
- (b) a prosody analysis module that extracts VAC coordinates from voice audio using acoustic feature analysis;
- (c) a self-report module that receives user-stated emotional state;
- (d) a comparison module that:
  - (i) computes distance between semantic VAC, prosody VAC, and self-report VAC;
  - (ii) flags incongruence when distance exceeds a threshold;
  - (iii) generates alerts suggesting emotional masking or suppression.

### CLAIM 5: Adaptive Strategy Recommendation

A method for personalizing emotion regulation strategy recommendations, comprising:

- (a) maintaining a database of evidence-based emotion regulation strategies;
- (b) mapping said strategies to transition patterns defined by VAC coordinate changes;
- (c) tracking, for each user, success rates of strategies attempted;
- (d) receiving a current emotional state and goal emotional state for said user;
- (e) identifying applicable strategies for the transition pattern;
- (f) ranking said strategies based on:
  - (i) historical success rate for said user;
  - (ii) evidence level from research literature;
  - (iii) contextual factors including time of day and available support;
- (g) outputting personalized strategy recommendations in ranked order.

### CLAIM 6: Quaternion-Based 3D Visualization

A method for visualizing emotional states in three-dimensional space, comprising:

- (a) converting a sequence of emotional states to unit quaternions using the method of Claim 2;
- (b) applying Spherical Linear Interpolation (SLERP) between consecutive quaternions to generate smooth animation frames;
- (c) rendering a three-dimensional object wherein:
  - (i) color represents Valence;
  - (ii) geometric displacement represents Arousal;
  - (iii) glow intensity represents Connection;
- (d) animating said object through quaternion rotations at a target frame rate;
- (e) displaying a path curve connecting emotional waypoints.

---

## Dependent Claims

### CLAIM 7 (depends on CLAIM 1)

The method of Claim 1, wherein Connection values are weighted 1.5 times higher than Valence or Arousal values when computing emotional distance.

### CLAIM 8 (depends on CLAIM 1)

The method of Claim 1, further comprising distinguishing:

- (a) pity with Connection < -0.5;
- (b) compassion with Connection > 0.5;
wherein pity and compassion have similar Valence and Arousal values but opposite Connection values.

### CLAIM 9 (depends on CLAIM 3)

The method of Claim 3, wherein bridge emotions are identified as emotions having:

- (a) intermediate VAC coordinates between category centroids; and
- (b) valid transitions to multiple other categories.

### CLAIM 10 (depends on CLAIM 3)

The method of Claim 3, wherein toxic positivity is prevented by blocking direct transitions from grief (Valence < -0.6, Connection > 0.5) to joy (Valence > 0.6, Connection > 0.5) without intermediate waypoints.

### CLAIM 11 (depends on CLAIM 3)

The method of Claim 3, wherein arousal ceiling constraints prevent any path that would increase Arousal above 0.5 when current Arousal is already above 0.3.

### CLAIM 12 (depends on CLAIM 4)

The system of Claim 4, wherein voice prosody analysis extracts features including:

- (a) pitch variance mapping to Arousal;
- (b) speaking rate mapping to Arousal;
- (c) energy distribution mapping to Valence;
- (d) spectral characteristics mapping to Connection.

### CLAIM 13 (depends on CLAIM 4)

The system of Claim 4, wherein incongruence detection identifies:

- (a) emotional suppression when prosody VAC shows negative Valence but semantic VAC shows positive Valence;
- (b) emotional exaggeration when self-report intensity exceeds prosody intensity by more than 0.3 units.

### CLAIM 14 (depends on CLAIM 5)

The method of Claim 5, wherein strategies are categorized by evidence level:

- (a) meta-analysis findings (highest weight);
- (b) randomized controlled trials;
- (c) clinical observations;
- (d) theoretical frameworks (lowest weight).

### CLAIM 15 (depends on CLAIM 5)

The method of Claim 5, wherein transition patterns include:

- (a) high-arousal to low-arousal requiring physiological regulation strategies;
- (b) negative-connection to positive-connection requiring vulnerability-based strategies;
- (c) low-valence to high-valence requiring cognitive reappraisal strategies.

### CLAIM 16 (depends on CLAIM 6)

The method of Claim 6, wherein SLERP interpolation ensures constant angular velocity between quaternions, preventing speed variations during emotional transition animations.

### CLAIM 17 (depends on CLAIM 6)

The method of Claim 6, wherein visual mapping uses:

- (a) color interpolation from crimson (Valence = -1) through gray (Valence = 0) to cyan (Valence = +1);
- (b) vertex displacement magnitude proportional to Arousal;
- (c) glow shader intensity proportional to Connection.

---

## System Claims

### CLAIM 18: Integrated Emotional Intelligence System

A computer-implemented system for emotional state analysis and guidance, comprising:

- (a) a processor;
- (b) memory storing instructions that, when executed by said processor, perform:
  - (i) the VAC coordinate representation method of Claim 1;
  - (ii) the quaternion transformation method of Claim 2;
  - (iii) the pathfinding method of Claim 3;
  - (iv) the incongruence detection of Claim 4;
  - (v) the strategy recommendation method of Claim 5;
  - (vi) the visualization method of Claim 6.

### CLAIM 19 (depends on CLAIM 18)

The system of Claim 18, further comprising:

- (a) a microservices architecture with independent modules for:
  - (i) audio transcription and semantic analysis;
  - (ii) data persistence and vector similarity search;
  - (iii) quaternion mathematics operations;
  - (iv) three-dimensional rendering and user interface.

### CLAIM 20 (depends on CLAIM 18)

The system of Claim 18, wherein emotional state data is processed locally using on-device language models to preserve user privacy.

---

## Method of Use Claims

### CLAIM 21: Method for Therapeutic Emotional Guidance

A method for providing therapeutic emotional guidance to a user, comprising:

- (a) receiving input from the user describing their current emotional state;
- (b) determining VAC coordinates for said current state using the method of Claim 1;
- (c) receiving a goal emotional state from the user;
- (d) generating a therapeutic path using the method of Claim 3;
- (e) recommending evidence-based strategies using the method of Claim 5;
- (f) visualizing the path and current position using the method of Claim 6;
- (g) tracking progress as the user moves along said path;
- (h) updating recommendations based on user feedback and outcomes.

### CLAIM 22 (depends on CLAIM 21)

The method of Claim 21, further comprising detecting emotional masking by:

- (a) analyzing voice audio for prosodic features;
- (b) analyzing text content for semantic emotional content;
- (c) comparing prosody-derived VAC with semantics-derived VAC;
- (d) alerting when discrepancy exceeds 0.5 units in VAC space.

### CLAIM 23: Method for Clinical Session Analysis

A method for analyzing therapeutic sessions, comprising:

- (a) recording audio of a therapy session;
- (b) extracting VAC coordinates at regular intervals throughout said session;
- (c) generating a trajectory plot showing emotional progression;
- (d) identifying moments of incongruence using the method of Claim 4;
- (e) detecting breakthrough moments where Connection axis crosses from negative to positive;
- (f) generating session summary statistics including:
  - (i) average emotional complexity;
  - (ii) time spent in each emotional category;
  - (iii) number of successful transitions.

---

## Computer-Readable Medium Claims

### CLAIM 24: Computer-Readable Storage Medium

A non-transitory computer-readable storage medium storing instructions that, when executed by a processor, cause the processor to perform:

- (a) the VAC coordinate representation method of Claim 1;
- (b) the quaternion transformation method of Claim 2;
- (c) the pathfinding method of Claim 3;
- (d) the strategy recommendation method of Claim 5.

---

## Notes on Claims

**Claim Strategy:**

- Independent claims (1-6, 18, 21, 23, 24) define core inventive concepts
- Dependent claims add specific implementations and refinements
- System claims protect the integrated architecture
- Method of use claims cover practical applications
- Computer-readable medium claims protect software distribution

**Claim Scope:**

- Broad enough to cover variations in implementation
- Specific enough to be distinguishable from prior art
- Emphasis on novel Connection axis and quaternion mathematics
- Psychological validity constraints as key differentiator

**Prior Art Distinctions:**

- Russell's VA model lacks Connection dimension → Claims 1, 7, 8
- PAD's Dominance is not relational quality → Claims 1, 8
- No prior art uses quaternions for emotions → Claims 2, 6, 16, 17
- No prior art uses category-aware pathfinding → Claims 3, 9, 10, 11
- No prior art integrates multi-modal incongruence → Claims 4, 12, 13

---

### Total Claims: 24

- Independent: 7
- Dependent: 14
- System: 2
- Method of use: 2
- Medium: 1

### Recommended USPTO Fee

- $300 basic filing + $180 excess claims (14 beyond first 20) = $480
- Or micro entity: $75 + $45 = $120
