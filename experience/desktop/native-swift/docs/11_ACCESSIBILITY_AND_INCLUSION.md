# 11. Accessibility & Inclusion

**Goal**: "The Soul has no barriers."
**Standards**: WCAG 2.2 AA / Apple Human Interface Guidelines

## 1. The "Sonic Soul" (For Blind/Low Vision)

Our visual "Glassmorphism" is useless to a blind user. We must map visual data to audio.

### 1.1. Audio Graphs

- **Feature**: When viewing a "Mood Chart", use `AXChart` (Audio Graphs).
- **Effect**: Playing the chart modulates pitch (Valence) and speed (Arousal) to let the user "hear" their week.

### 1.2. VoiceOver

- **Canvas**: The "Aura" particle view must have a descriptive label: "A swirling cloud of blue and grey, pulsing slowly, indicating calm sadness."
- **Actions**: Custom Actions on the Rotor for "Log Vibe" instead of hunting for buttons.

## 2. Neurodiversity & Sensory Adaptation

### 2.1. "Calm Mode" (Reduction)

- **Trigger**: User Preference or `accessibilityReduceMotion`.
- **Changes**:
    - **Motion**: Stop all "Breathing" and parallax animations.
    - **Contrast**: Increase text contrast, remove transparency (opaque backgrounds).
    - **Blur**: Disable background blurs (reduces visual noise).

### 2.2. Dyslexia Friendly

- **Font**: Option to swap "SF Pro" for "OpenDyslexic" or a similar high-legibility font.
- **Spacing**: Increase line-height and letter-spacing automatically.

## 3. Motor Accessibility

### 3.1. Switch Control & Voice Control

- **Labels**: All interactive elements must have predictable names. No "Button 1".
- **Touch Targets**: Strictly enforced 44pt minimum suitable for coarse motor control.

### 3.2. AssistiveTouch (Hand Gestures)

- Support "Clench" and "Pinch" gestures (WatchOS / Vision Pro) to perform primary actions (Log Vibe) without touching the screen.
