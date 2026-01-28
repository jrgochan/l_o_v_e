# RFC 002: Mobile-First "Fluid Soul" Experience

**Status**: Draft
**Date**: 2026-01-27
**Module**: Experience (Web/Desktop)
**Goal**: Unified, beautiful, and touch-first interface across all interaction points (Desktop, Tablet, Mobile).

## 1. Executive Summary

The current L.O.V.E. interface is optimized for Desktop. As we move to a "Soul Sphere" that lives with the user, the interface must become **Liquid**. It should flow gracefully from a 27" monitor to a 6" iPhone screen without losing its emotive power. This RFC defines the "Fluid Soul" design system.

---

## 2. Core Design Philosophies

### 2.1. The "Glass Soul" Aesthetic (Glassmorphism 2.0)
- **Concept**: The UI layers should feel like physical panes of emotional glass.
- **Implementation**:
    - Heavy use of `backdrop-filter: blur(16px)` and `saturate(180%)`.
    - Variable transparency based on hierarchy (Nav = 80%, Cards = 60%).
    - **Performance Guardrails**: on Low-Power mobile devices, automatically degrade blur to opaque colors to maintain 60fps.

### 2.2. Fluid Typography & Spacing
- **Concept**: Text should never be "too small" or "too big".
- **Implementation**:
    - Use `clamp()` for everything.
    - Example: `font-size: clamp(1rem, 2vw + 0.5rem, 1.5rem);`.
    - **Grid**: Switch from fixed pixels to relative `rem` and `%` based grid systems.

### 2.3. Touch-First Physics
- **Concept**: Interacting with the Soul Sphere should feel tactile.
- **Implementation**:
    - **Hit Targets**: Minimum `44px` tappable area for all interactive elements.
    - **Gestures**: Swipe-to-dismiss on cards, Pull-to-refresh for context.
    - **Feedback**: Haptic feedback (via `navigator.vibrate` on Android, Taptic Engine on iOS via Tauri) on all significant actions.

---

## 3. Technical Implementation

### 3.1. Mobile Navigation Architecture
- **Desktop**: Sidebar Navigation.
- **Mobile**: Bottom Tab Bar (Thumb Zone Friendly).
- **Transition**: CSS Grid areas change based on Media Query:
```css
@media (max-width: 768px) {
  .layout { grid-template-areas: "content" "nav"; }
}
```

### 3.2. PWA & Native Shell
- **Manifest**: Full PWA compliance (icons, splash screens, offline support).
- **Safe Areas**: Respect iOS "Notch" and "Home Bar" using `safe-area-inset-*`.
- **Input Handling**: Prevent zoom-on-focus for Inputs (font-size >= 16px).

### 3.3. Animation Strategy (Framer Motion)
- **Micro-interactions**: Buttons scale down slightly (`0.98`) on press.
- **Page Transitions**: Shared Element Transitions between "List" and "Detail" views.
- **Reduced Motion**: Respect system accessibility settings.

### 3.4. Dark Mode 2.0 (Deep Soul)
- **Concept**: Avoid pure black (`#000000`). Use rich, deep emotional colors.
- **Palette**:
    - *Sadness*: Deep Indigo (`#0F172A`)
    - *Joy*: Warm Charcoal (`#1C1917`)
    - *Anger*: Dark Maroon (`#2A0A0A`)
- **Adaptive**: The background ambiently shifts based on the dominant emotion of the active session.

### 3.5. Emotional Haptics (Texture)
- **Concept**: Feelings have texture. Sadness is heavy; Joy is light.
- **Implementation**:
    - **Joy**: Sharp, high-frequency ticks (like a heartbeat).
    - **Sadness**: Slow, low-frequency rumbles.
    - **Anxiety**: Rapid, chaotic buzzing.
    - **Tooling**: Use `navigator.vibrate` patterns (e.g., `[50, 200, 50]`) mapped to the Valence/Arousal grid.

### 3.6. One-Handed Ergonomics (ThumbOS)
- **Concept**: 90% of interactions should be reachable with one thumb.
- **Implementation**:
    - **Reachability**: Critical actions (New Journal, Record Audio) must live in the bottom 30% of the screen.
    - **Sheets**: Use "Bottom Sheets" instead of centered Modals for context.
    - **Typography**: Headers align to the bottom-left of their container for easier reading during scrolling.

### 3.7. Fluid Gestures
- **Concept**: Swipe > Tap.
- **Implementation**:
    - **Back**: Standard edge swipe (iOS native behavior).
    - **Archive**: Swipe card left to archive/delete (with haptic resistance).
    - **Context**: Swipe card right to "Pin" or "Favorite".
    - **Transitions**: Use `framer-motion`'s `AnimatePresence` for drag-to-dismiss physics.

### 3.8. Foldable & Adaptive Posture
- **Concept**: The interface honors the physical shape of the device.
- **Implementation**:
    - **Book Mode**: On Foldables (Pixel Fold), splitting the "List" and "Detail" views across the hinge.
    - **Tabletop Mode**: If device is half-folded (L-shape), control surfaces move to the bottom half, content to the top.

### 3.9. Contextual Input (Voice First)
- **Concept**: Typing on glass is friction. Speaking is natural.
- **Implementation**:
    - On Mobile, the primary input action is a **Microphone** FAB, not a text box.
    - **Whisper Mode**: UI optimized for holding the phone like a Dictaphone (screen off/dimmed).

### 3.10. Organic Motion ("Soul Breath")
- **Concept**: Digital things act linear. Living things breathe.
- **Implementation**:
    - **Idle States**: Subtle 4-7-8 breathing rhythm (Expansion/Contraction) for "waiting" indicators instead of spinners.
    - **Spring Physics**: Use `react-spring` or `framer-motion` spring presets ("gentle", "wobbly") instead of `ease-in-out`.

### 3.11. Home Screen Sovereignty (Widgets)
- **Concept**: The soul shouldn't be trapped in an app icon.
- **Implementation**:
    - **iOS/Android Widgets**: "Current Vibe" widget showing the daily emotional gradient.
    - **Lock Screen**: "Quick Capture" complication to dictation mode.

### 3.12. Sonic Identity
- **Concept**: Sound connects deeper than sight.
- **Implementation**:
    - **UI Sounds**: Subtle, harmonic chimes (C Major pentatonic) for interactions.
    - **Adaptive**: The pitch shifts slightly based on the accumulated Valence of the session.

### 3.13. "Cinema Mode" (Deep Focus)
- **Concept**: When reading or writing, the tool should vanish.
- **Implementation**:
    - **Scroll Behavior**: Scrolling down hides the Navbar and Status Bar.
    - **Writing**: While typing, all chrome fades out, leaving only the text caret and thoughts.

### 3.14. Biometric Color Theory (HealthKit)
- **Concept**: The app knows how you feel before you do.
- **Implementation**:
    - **Watch Integration**: Read Heart Rate Variability (HRV) from HealthKit/Google Fit.
    - **Reactive UI**: If HRV is low (Stress), the UI automatically shifts to "Calm Blue" tones and reduces animation speed.

### 3.15. Generative UI (Chaos vs Order)
- **Concept**: The layout adapts to cognitive load.
- **Implementation**:
    - **High Energy (Joy/Anger)**: UI becomes denser, more vibrant, "Masonry" grid layouts.
    - **Low Energy (Sadness/Depression)**: UI simplifies to single-column, large text, minimal options.

### 3.16. Spatial Soul (AR/Vision Pro)
- **Concept**: Your soul is a room you can visit.
- **Implementation**:
    - **Immersive Mode**: On Vision Pro, the "Soul Sphere" becomes a 3D environment.
    - **Memory Palace**: Users can "walk" through years of memories spatially arranged in a 3D timeline.

### 3.17. Neural Dictation (Offline)
- **Concept**: Thoughts move faster than 4G.
- **Implementation**:
    - **Local Whisper**: Bundle `distil-whisper` (via ONNX Runtime for React Native/Tauri Mobile).
    - **Latency**: Zero-latency transcription that works in Airplane Mode.

### 3.18. Holographic Depth (Parallax)
- **Concept**: The screen is not flat; it is a window.
- **Implementation**:
    - **Gyroscopic Parallax**: UI layers shift slightly (2-5px) based on device tilt.
    - **Depth Maps**: Cards cast real-time shadows based on "virtual light" position.

### 3.19. Ephemeral Grace
- **Concept**: Some thoughts are meant to fade.
- **Implementation**:
    - **Breathing Text**: Text that slowly fades in and out of opacity until interacted with.
    - **Vanish Mode**: "Vent" mode where typed words disappear into smoke after 10 seconds.

### 3.20. Totem Interactions (NFC)
- **Concept**: Physical connection shares digital soul.
- **Implementation**:
    - **Soul Bump**: Tap two phones together to share a "Vibe Payload" (a color gradient + haptic pattern of your current state).
    - **Physical Token**: Tap phone to a physical NFC object (e.g., a journal) to unlock a specific reflection mode.

### 3.21. Circadian Rhythm (Golden Hour)
- **Concept**: The interface honors the sun.
- **Implementation**:
    - **Solar Sync**: Color temperature warms significantly (to 2000K) as the real sun sets.
    - **Golden Hour**: A special 20-minute window at sunset where the UI glows with a gold/violet aura.





---

## 4. Migration Plan

- [ ] **Phase 1: Foundation**: Implement Tailwind `clamp` utilities and new Color Tokens.
- [ ] **Phase 2: Navigation**: Build responsive `NavBar` component (Sidebar <-> Bottom Bar).
- [ ] **Phase 3: Touch Audit**: Audit all buttons/inputs for 44px tap targets.
- [ ] **Phase 4: PWA**: Configure `next-pwa` and manifest.json.
