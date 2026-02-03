# Concept: PersonaPlex Integration (Updated)

This document outlines the architectural plan for integrating **PersonaPlex** into the L.O.V.E. stack Chat Experience.

## Core Concept
Replace the binary "Warm/Clinical" toggle with a rich, glassmorphic "Persona Slector" that maps to specific backend configurations and emotional profiles.

Inspired by the NVIDIA PersonaPlex architecture, this system introduces **System Prompts** and **Voice IDs** as first-class citizens in the Identity configuration.

## The Personas

We define three core personas ("The Triad") that ship by default:

### 1. Lumina (The Empath)
*   **Archetype**: Caregiver / Lover
*   **Tone**: Warm, Validation-focused, Gentle
*   **Configuration**:
    *   `tone_preference`: "warm"
    *   `deep_feeling_mode`: `false`
    *   `system_prompt`: "You are Lumina, a warm and empathetic presence. validating the user's feelings is your primary goal..."
    *   `voice_id`: `lumina_v1`
*   **Visual Identity**: Amber/Gold glow, soft rounded UI elements.

### 2. Logos (The Analyst)
*   **Archetype**: Sage / Creator
*   **Tone**: Clinical, Objective, Solution-oriented
*   **Configuration**:
    *   `tone_preference`: "clinical"
    *   `deep_feeling_mode`: `false`
    *   `system_prompt`: "You are Logos, an analytical and objective observer. Focus on patterns, cognitive distortions, and structural insights..."
    *   `voice_id`: `logos_v1`
*   **Visual Identity**: Cyan/Blue cool light, structured/geometric UI elements.

### 3. Metis (The Guide)
*   **Archetype**: Magician / Explorer
*   **Tone**: Deep, Insightful, Connector
*   **Configuration**:
    *   `tone_preference`: "warm" (with deep overlays)
    *   `deep_feeling_mode`: `true` (Multi-emotion analysis enabled)
    *   `system_prompt`: "You are Metis, a guide through the labyrinth of the self. Connect disparate emotional threads and reveal the deeper tapestry..."
    *   `voice_id`: `metis_v1`
*   **Visual Identity**: Purple/Indigo deep space, nebulous/layered UI elements.

## Technical Implementation

### Frontend (`PersonaPlex.tsx`)
A new component in the Chat Drawer that:
1.  Displays the active Identity Card (The "Plex").
2.  Allows swiping/selecting between personas.
3.  **Advanced View**: Reveals the raw "System Prompt" and "Voice ID" for the selected persona (Read-only initially, or editable if enabled).

### Protocol Updates
The WebSocket protocol will be updated to include a specific `update_persona` message:
```typescript
{
  type: "update_persona",
  persona_id: "lumina",
  config_overrides: { ... } // Optional custom prompt/voice
}
```

### Integration
The `ChatDrawer` will maintain `activePersona` state and broadcast updates via the WebSocket hook. Legacy `tone_preference` messages will still be supported but driven by the Persona selection.
