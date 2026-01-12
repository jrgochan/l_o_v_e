# Experience Module - Haptic Feedback System

## Overview

The Experience module uses **haptic feedback** (vibration) to simulate the "friction" of emotional transitions. When the Soul Sphere rotates through emotional space, the device vibrates in patterns that correspond to the **intensity** and **character** of the change.

This creates a **psychophysical correspondence** between:

- Mathematical angular distance (quaternion rotation)
- Physical sensation (vibration patterns)
- Emotional experience (the "work" of change)

## The Psychophysics of Emotional Work

### Quantifying Emotional Transitions

The Versor engine calculates the **angular distance** (φ) between emotional states:

```
φ = 2 × arccos(|w_transition|)
```

Where `w_transition` is the scalar component of the transition quaternion.

**Interpretation**:

- **φ < 15°**: Micro-adjustment (rumination, stabilization)
- **φ = 45°**: Noticeable shift (change in perspective)
- **φ > 90°**: Major transition (complete reorientation)
- **φ = 180°**: Opposite states (e.g., Shame → Self-Compassion)

### Three Core Haptic Patterns

The system implements three distinct vibration patterns:

1. **The Thud**: High-velocity turn (rapid, intense shift)
2. **The Heartbeat**: Stability in positive Connection (rhythmic, comforting)
3. **The Flooding**: Overwhelm/chaos (erratic, warning)

## Library Selection: react-native-haptics

### Why react-native-haptics?

The SRS specifies `react-native-haptics` over `expo-haptics` due to performance benchmarks:

| Library                | Heavy Impact Latency | Justification          |
| ---------------------- | -------------------- | ---------------------- |
| `react-native-haptics` | **0.36ms**           | 2.13x faster than Expo |
| `expo-haptics`         | 0.77ms               | Acceptable but slower  |

**Critical Requirement**: When syncing haptics to visual rotation apogees (midpoint of SLERP), sub-millisecond precision is perceptible.

### Installation

```bash
npm install react-native-haptics
```

### API Overview

```typescript
import Haptics from "react-native-haptics";

// iOS Impact Styles
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// iOS Notification Styles
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Selection feedback (lighter)
Haptics.selectionAsync();
```

## Pattern 1: The Thud (High-Velocity Turn)

### When to Trigger

When the **angular velocity** exceeds a threshold, indicating a rapid emotional shift.

```typescript
const VELOCITY_THRESHOLD = 3.0; // radians per second

function calculateAngularVelocity(
  currentQuat: Quaternion,
  previousQuat: Quaternion,
  deltaTime: number,
): number {
  const dot = currentQuat.dot(previousQuat);
  const angle = 2 * Math.acos(Math.abs(dot));
  return angle / deltaTime;
}

// In animation loop
const velocity = calculateAngularVelocity(current, previous, delta);
if (velocity > VELOCITY_THRESHOLD) {
  triggerThud();
}
```

### Implementation

Trigger at the **midpoint** of the SLERP interpolation (50% progress):

```typescript
let slerpProgress = 0;
const SLERP_DURATION = 1.0; // seconds

useFrame((state, delta) => {
  if (slerpProgress >= 1.0) return;

  slerpProgress += delta / SLERP_DURATION;

  // Trigger at midpoint
  if (slerpProgress >= 0.5 && !hasTriggeredMidpoint) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    hasTriggeredMidpoint = true;
  }

  // SLERP animation
  meshRef.current.quaternion.slerp(targetQuat, slerpProgress);

  if (slerpProgress >= 1.0) {
    hasTriggeredMidpoint = false;
  }
});
```

### Intensity Scaling

Scale intensity based on angular distance:

```typescript
function getImpactIntensity(angularDistance: number): ImpactFeedbackStyle {
  const degrees = angularDistance * (180 / Math.PI);

  if (degrees < 30) return Haptics.ImpactFeedbackStyle.Light;
  if (degrees < 70) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

// Usage
const intensity = getImpactIntensity(angularDistance);
Haptics.impactAsync(intensity);
```

## Pattern 2: The Heartbeat (Stability)

### When to Trigger

When the user maintains:

- **High Connection** (z > 0.5)
- **Low Angular Velocity** (stable state)

This creates a sense of "being present" in a positive emotional space.

### Pattern Definition

```
Lub-Dub... Pause
|20ms|100ms|40ms|--800ms--|

Lub  = Light impact (20ms duration)
Dub  = Medium impact (40ms duration)
Pause = 800ms silence
```

### iOS Implementation

iOS doesn't support custom duration patterns directly. We use recursive timers:

```typescript
class HeartbeatPattern {
  private isActive = false;
  private interval: NodeJS.Timeout | null = null;

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.beat();
  }

  stop() {
    this.isActive = false;
    if (this.interval) clearTimeout(this.interval);
  }

  private beat() {
    if (!this.isActive) return;

    // Lub
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      // Dub
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Schedule next beat
      this.interval = setTimeout(() => this.beat(), 800);
    }, 120); // 20ms + 100ms pause
  }
}

// Usage
const heartbeat = new HeartbeatPattern();

useEffect(() => {
  const connection = useExperienceStore.getState().targetVAC[2];
  const velocity = useExperienceStore.getState().angularVelocity;

  if (connection > 0.5 && velocity < 0.5) {
    heartbeat.start();
  } else {
    heartbeat.stop();
  }
}, [connection, velocity]);
```

### Android Implementation

Android supports pattern arrays natively:

```typescript
import { Vibration } from "react-native";

const HEARTBEAT_PATTERN = [
  0, // Start immediately
  20, // Lub duration
  100, // Pause
  40, // Dub duration
  800, // Long pause
];

// Start repeating pattern
Vibration.vibrate(HEARTBEAT_PATTERN, true); // true = repeat

// Stop
Vibration.cancel();
```

### Cross-Platform Abstraction

```typescript
import { Platform } from "react-native";

class HeartbeatManager {
  private pattern: HeartbeatPattern | null = null;

  start() {
    if (Platform.OS === "ios") {
      this.pattern = new HeartbeatPattern();
      this.pattern.start();
    } else {
      Vibration.vibrate(HEARTBEAT_PATTERN, true);
    }
  }

  stop() {
    if (Platform.OS === "ios") {
      this.pattern?.stop();
    } else {
      Vibration.cancel();
    }
  }
}
```

## Pattern 3: The Flooding (Chaos)

### When to Trigger

"Flooding" represents emotional overwhelm—high arousal combined with rapid state changes:

```typescript
const isFlooding = (arousal: number, elasticity: number): boolean => {
  return arousal > 0.8 && elasticity > 0.7;
};
```

**Elasticity** = Rate of state change over time (calculated by Versor).

### Pattern Definition

A **randomized, high-frequency** vibration that simulates system overload:

```typescript
class FloodingPattern {
  private isActive = false;
  private interval: NodeJS.Timeout | null = null;

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.chaosLoop();
  }

  stop() {
    this.isActive = false;
    if (this.interval) clearTimeout(this.interval);
  }

  private chaosLoop() {
    if (!this.isActive) return;

    // Random intensity
    const styles = [
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Heavy,
    ];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];

    Haptics.impactAsync(randomStyle);

    // Random interval (50-200ms)
    const randomDelay = 50 + Math.random() * 150;
    this.interval = setTimeout(() => this.chaosLoop(), randomDelay);
  }
}
```

### User Safety

Prevent desensitization and battery drain:

```typescript
class FloodingPattern {
  private startTime: number = 0;
  private readonly MAX_DURATION = 5000; // 5 seconds

  start() {
    this.startTime = Date.now();
    this.chaosLoop();
  }

  private chaosLoop() {
    if (!this.isActive) return;

    // Auto-stop after max duration
    if (Date.now() - this.startTime > this.MAX_DURATION) {
      this.stop();
      return;
    }

    // ... chaos logic
  }
}
```

## HapticManager Component

### Headless Component Pattern

The HapticManager is a **headless component**—it has no visual output but manages side effects:

```typescript
// src/features/experience/components/HapticManager.tsx

import { useEffect, useRef } from "react";
import Haptics from "react-native-haptics";
import { useExperienceStore } from "../store/useExperienceStore";
import { HeartbeatManager, FloodingPattern } from "../utils/haptics";

export const HapticManager: React.FC = () => {
  const targetVAC = useExperienceStore((state) => state.targetVAC);
  const angularVelocity = useExperienceStore((state) => state.angularVelocity);
  const hapticMode = useExperienceStore((state) => state.hapticMode);

  const heartbeat = useRef(new HeartbeatManager());
  const flooding = useRef(new FloodingPattern());

  // Quiet mode override
  useEffect(() => {
    if (hapticMode === "quiet") {
      heartbeat.current.stop();
      flooding.current.stop();
    }
  }, [hapticMode]);

  // Heartbeat logic
  useEffect(() => {
    if (hapticMode === "quiet") return;

    const [_, __, connection] = targetVAC;

    if (connection > 0.5 && angularVelocity < 0.5) {
      heartbeat.current.start();
    } else {
      heartbeat.current.stop();
    }

    return () => heartbeat.current.stop();
  }, [targetVAC, angularVelocity, hapticMode]);

  // Flooding logic
  useEffect(() => {
    if (hapticMode === "quiet") return;

    const [_, arousal, __] = targetVAC;
    const elasticity = useExperienceStore.getState().elasticity;

    if (arousal > 0.8 && elasticity > 0.7) {
      flooding.current.start();
    } else {
      flooding.current.stop();
    }

    return () => flooding.current.stop();
  }, [targetVAC, hapticMode]);

  // Thud logic (triggered by velocity spikes)
  useEffect(() => {
    if (hapticMode === "quiet") return;

    if (angularVelocity > 3.0) {
      const angularDistance = useExperienceStore.getState().angularDistance;
      const intensity = getImpactIntensity(angularDistance);
      Haptics.impactAsync(intensity);
    }
  }, [angularVelocity, hapticMode]);

  return null; // Headless component
};
```

### Integration into App

```typescript
// App.tsx

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <Canvas>
        <SoulSphere />
      </Canvas>

      <HapticManager /> {/* Add haptic manager */}
    </View>
  );
}
```

## User Settings

### Quiet Mode Toggle

```typescript
// Settings screen component

import { Switch } from 'react-native';
import { useExperienceStore } from './store/useExperienceStore';

function SettingsScreen() {
  const hapticMode = useExperienceStore(state => state.hapticMode);
  const setHapticMode = useExperienceStore(state => state.setHapticMode);

  return (
    <View>
      <Text>Haptic Feedback</Text>
      <Switch
        value={hapticMode === 'normal'}
        onValueChange={enabled =>
          setHapticMode(enabled ? 'normal' : 'quiet')
        }
      />
    </View>
  );
}
```

### Intensity Preference

Allow users to scale haptic intensity:

```typescript
interface HapticPreferences {
  mode: "quiet" | "normal";
  intensityMultiplier: number; // 0.5 to 2.0
}

// Apply to impacts
const scaledIntensity = Math.floor(
  baseIntensity * preferences.intensityMultiplier,
);
```

## Platform-Specific Considerations

### iOS: Taptic Engine

Modern iPhones (7+) have the Taptic Engine:

- High-fidelity vibrations
- Distinct impact styles
- Low latency

**CoreHaptics API**: For advanced patterns, bridge to CoreHaptics:

```swift
// iOS native module (if needed)
import CoreHaptics

func playCustomPattern() {
  let engine = try? CHHapticEngine()
  try? engine?.start()

  let pattern = try? CHHapticPattern(
    events: [
      CHHapticEvent(eventType: .hapticTransient, parameters: [], relativeTime: 0),
      CHHapticEvent(eventType: .hapticContinuous, parameters: [], relativeTime: 0.1, duration: 0.5)
    ],
    parameters: []
  )

  let player = try? engine?.makePlayer(with: pattern!)
  try? player?.start(atTime: 0)
}
```

### Android: Vibrator Service

Android haptics vary by device:

- **Amplitude Control**: Supported on Android 8.0+ (VibrationEffect)
- **Patterns**: Supported via duration arrays
- **Quality**: Depends on hardware (flagship vs. budget)

**Best Practice**: Test on multiple Android devices to ensure acceptable quality.

## Testing Haptics

### Manual Testing Checklist

| Scenario                        | Expected Haptic        | Verification          |
| ------------------------------- | ---------------------- | --------------------- |
| Joy → Shame (large shift)       | Heavy thud at midpoint | Feel strong vibration |
| Calm → Contentment (small)      | Light tap or none      | Subtle or silent      |
| Sustained Joy (high Connection) | Heartbeat pattern      | Rhythmic "lub-dub"    |
| Overwhelm (high Arousal)        | Chaotic, erratic       | Rapid, random pulses  |
| Quiet mode enabled              | None                   | Complete silence      |

### Automated Testing

```typescript
describe("HapticManager", () => {
  beforeEach(() => {
    jest.spyOn(Haptics, "impactAsync");
  });

  test("triggers heavy impact for large angular distance", () => {
    const store = useExperienceStore.getState();
    store.setAngularVelocity(5.0);
    store.setAngularDistance(Math.PI / 2); // 90°

    // Wait for effect
    waitFor(() => {
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy,
      );
    });
  });

  test("respects quiet mode", () => {
    const store = useExperienceStore.getState();
    store.setHapticMode("quiet");
    store.setAngularVelocity(5.0);

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
```

## Performance and Battery Optimization

### Throttling

Prevent excessive haptic calls:

```typescript
import { throttle } from "lodash";

const triggerHaptic = throttle((intensity) => {
  Haptics.impactAsync(intensity);
}, 100); // Max once per 100ms
```

### Decay Functions

Gradually reduce haptic intensity over time:

```typescript
let hapticDecayFactor = 1.0;

setInterval(() => {
  if (hapticDecayFactor > 0) {
    hapticDecayFactor -= 0.1; // Decay 10% per second
  }
}, 1000);

// Apply to intensity
const scaledIntensity = baseIntensity * hapticDecayFactor;
```

## Next Steps

Now that you understand the haptic system:

- **08-state-management.md** - Complete Zustand store implementation
- **09-performance-optimization.md** - Optimize for 60fps
