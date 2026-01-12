# Experience Module - Overview

## Executive Summary

The **Experience Module** is the user-facing frontend component of the L.O.V.E. (Listener-Observer-Versor-Experience) Stack. It serves as the **efferent nerve ending** of the system—the point where abstract mathematical representations of emotional states become visceral, tangible experiences through visual and haptic feedback.

## Core Mission

The Experience module does not merely display data; it **embodies** the user's emotional trajectory. By rendering the "Soul Sphere"—a dynamic, reactive 3D object—it creates an immersive biofeedback instrument that visualizes:

- **Current emotional state** as a position in 3D space
- **Emotional transitions** as smooth rotational movements
- **Intensity of change** through haptic vibration patterns
- **Emotional texture** through geometry, color, and light

## Paradigm Shift

Traditional mood tracking apps rely on:

- Static emoji selections
- Linear scales (1-10 ratings)
- Two-dimensional charts

Project L.O.V.E. replaces this with:

- **Dynamic 3D orientation** in emotional space
- **Quaternion-based rotations** capturing the "work" of emotional shifts
- **Real-time visual feedback** that responds to the complexity of human experience

## The L.O.V.E. Stack Architecture

```
┌─────────────┐
│   LISTENER  │  Voice/Text Input → Normalized Vectors
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   OBSERVER  │  State History + Vector Database
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   VERSOR    │  Quaternion Math Engine
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ EXPERIENCE  │  ← YOU ARE HERE
└─────────────┘
3D Visualization + Haptics
```

### Module Interactions

1. **Listener** ingests user voice notes or text entries
2. **Listener** normalizes input to VAC scalars (Valence, Arousal, Connection)
3. **Observer** provides historical context and emotional definitions
4. **Versor** computes quaternion representations and transition paths
5. **Experience** receives state vectors and renders the visualization
6. **Experience** generates haptic feedback patterns
7. User perceives output, closing the feedback loop

## Core Responsibilities

The Experience module is responsible for:

### 1. Real-Time 3D Visualization

- Rendering the "Soul Sphere" using React Three Fiber
- Mapping VAC metrics to visual properties
- Animating smooth transitions between states using SLERP

### 2. Haptic Feedback Generation

- Translating angular distance into vibration patterns
- Distinguishing between micro-adjustments and radical shifts
- Providing psychophysically-tuned feedback

### 3. Performance Optimization

- Maintaining 60fps on mobile devices
- Managing GPU resources efficiently
- Implementing on-demand rendering to save battery

### 4. Accessibility

- Supporting colorblind modes
- Providing haptic override controls
- Ensuring inclusive design

## Visual Language

The Soul Sphere uses three dimensions to represent emotional state:

| **VAC Axis**       | **Visual Property**                | **Example States**                                            |
| ------------------ | ---------------------------------- | ------------------------------------------------------------- |
| **Valence** (X)    | Color (Crimson → Cyan)             | Negative: Shame, Grief<br>Positive: Joy, Gratitude            |
| **Arousal** (Y)    | Surface Roughness (Smooth → Spiky) | Low: Calm, Contentment<br>High: Excitement, Panic             |
| **Connection** (Z) | Opacity/Glow (Opaque → Radiant)    | Low: Loneliness, Disconnection<br>High: Belonging, Compassion |

## Technology Foundation

- **Framework**: React Native + Expo
- **3D Engine**: React Three Fiber (R3F) v8
- **Shaders**: Custom GLSL (vertex displacement + Fresnel effects)
- **State**: Zustand (transient updates)
- **Haptics**: react-native-haptics
- **Math**: Quaternions for rotation, SLERP for interpolation

## Key Innovation: Quaternions Over Euler Angles

Traditional 3D rotation uses Euler angles (pitch, yaw, roll), which suffer from **Gimbal Lock**—losing a degree of freedom when axes align. This is a powerful metaphor for emotional "stuckness."

**Quaternions solve this**, providing:

- ✅ No singularities
- ✅ Smooth interpolation (SLERP)
- ✅ Compact representation
- ✅ Efficient computation

In emotional terms: quaternions allow the system to model **any** transition between states without mathematical "blind spots."

## What Makes This Different

Traditional affective computing maps emotions to a 2D grid (Valence-Arousal). The Experience module operates in **3D VAC space** (Valence-Arousal-**Connection**), where:

- **Pity** and **Compassion** can be distinguished (same V/A, different Connection)
- **Overwhelm** can be detected as high-velocity rotation exceeding elasticity
- **Vulnerability** can be recognized as exposure of the Connection axis despite risk

## Success Metrics

The Experience module succeeds when:

1. Users can **intuitively understand** their emotional state from the visualization
2. Transitions feel **physically authentic** through haptic feedback
3. The app maintains **60fps** on mid-range mobile devices
4. Users report feeling **seen and understood** by the system

## Next Steps

To implement the Experience module, proceed through the documentation in order:

1. `01-architecture.md` - Understand the complete system architecture
2. `02-setup-and-dependencies.md` - Set up your development environment
3. `03-vac-model-reference.md` - Learn the emotional model
4. `04-soul-sphere-specification.md` - Build the core visualization
5. Continue through remaining guides...

---

**Remember**: This is not just a mood tracker. This is a **mathematical instrument** for mapping the human soul.
