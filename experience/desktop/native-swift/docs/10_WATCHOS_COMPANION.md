# 10. WatchOS Companion: "The Pulse"

**Target**: watchOS 10+  
**Paradigm**: Smart Stack & Complications  
**Independence**: Yes (can work without iPhone nearby)

## 1. Core Purpose
The Watch app has two jobs:
1.  **Input**: The friction-less entry point for emotional state (Digital Crown logging).
2.  **Sensor**: The biological truth source (HRV, Resting Heart Rate).

## 2. Navigation Structure (Hierarchical)
*   **Root**: "The Orb" (Current Vibe).
    - **Scroll Crown Up**: History (List).
    - **Scroll Crown Down**: Quick Actions (Voice Log, Panic Button).
    - **Tap**: Edit Vibe (Valence/Arousal picker).

## 3. Bio-Feedback Architecture

### 3.1. Background Monitoring (Passive)
*   **HKObserverQuery**: We subscribe to `HKQuantityType.heartRateVariabilitySDNN`.
*   **Frequency**: Apple limits background reads to ~4 per hour unless in a workout.
*   **Insight**: "You seem stressed" notifications are based on this trend data.

### 3.2. Mindfulness Sessions (Active)
*   When user engages "Deep Breath" mode:
    - Start an `HKWorkoutSession` (.mindAndBody).
    - **Benefit**: Unlocks high-frequency sensor access (Real-time HRV).
    - **Haptics**: Watch triggers `HapticType.click` in sync with the visual breathing guide on the wrist.

## 4. Complications (Face Strategy)

### 4.1. Circular / Corner
*   **Design**: A simple ring gauge showing current "Energy" (Arousal).
*   **Tint**: Color coded by Valence (Blue=Sad, Orange=Happy).

### 4.2. Rectangular (Modular)
*   **Design**: "Latest Insight". 
*   **Content**: A text snippet from the AI: "Take a breath, you're doing great."
