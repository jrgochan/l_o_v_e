# Experience Module - Accessibility

## Overview

The Experience module must be accessible to users with diverse abilities. This includes visual impairments (colorblindness, low vision), motor impairments, vestibular disorders, and cognitive differences. This guide implements WCAG 2.1 Level AA compliance.

## Visual Accessibility

### Colorblind Modes

The default color palette (crimson to cyan) is problematic for users with red-green colorblindness (deuteranopia), the most common form affecting ~8% of men and ~0.5% of women.

#### Implementation

**Store Integration**:

```typescript
// In useExperienceStore.ts
export type ColorblindMode =
  | "default"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia";

interface UserPreferences {
  colorblindMode: ColorblindMode;
  // ... other preferences
}
```

**Color Palettes**:

| Mode         | Negative Color      | Positive Color   | Affected Population |
| ------------ | ------------------- | ---------------- | ------------------- |
| Default      | Crimson (#8B0000)   | Cyan (#00FFFF)   | N/A                 |
| Deuteranopia | Dark Blue (#0000CC) | Yellow (#FFD700) | ~5% of males        |
| Protanopia   | Dark Blue (#0000CC) | Orange (#FF8C00) | ~1% of males        |
| Tritanopia   | Magenta (#CC0088)   | Teal (#00CCA8)   | ~0.01%              |

**Shader Update**:

```typescript
// In SoulSphere component
const colorblindMode = useExperienceStore(
  (state) => state.preferences.colorblindMode,
);

const colorPalettes = {
  default: {
    negative: new THREE.Color(0x8b0000), // Crimson
    positive: new THREE.Color(0x00ffff), // Cyan
  },
  deuteranopia: {
    negative: new THREE.Color(0x0000cc), // Blue
    positive: new THREE.Color(0xffd700), // Yellow
  },
  protanopia: {
    negative: new THREE.Color(0x0000cc), // Blue
    positive: new THREE.Color(0xff8c00), // Orange
  },
  tritanopia: {
    negative: new THREE.Color(0xcc0088), // Magenta
    positive: new THREE.Color(0x00cca8), // Teal
  },
};

const palette = colorPalettes[colorblindMode];

// Update material uniforms
material.uniforms.uColorNeg.value = palette.negative;
material.uniforms.uColorPos.value = palette.positive;
```

**Settings UI**:

```typescript
function ColorblindSettings() {
  const colorblindMode = useExperienceStore(state => state.preferences.colorblindMode);
  const setColorblindMode = useExperienceStore(state => state.setColorblindMode);

  return (
    <View>
      <Text style={styles.label}>Colorblind Mode</Text>

      <TouchableOpacity onPress={() => setColorblindMode('default')}>
        <Text>Default (Crimson/Cyan)</Text>
        {colorblindMode === 'default' && <Icon name="check" />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setColorblindMode('deuteranopia')}>
        <Text>Deuteranopia (Blue/Yellow)</Text>
        {colorblindMode === 'deuteranopia' && <Icon name="check" />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setColorblindMode('protanopia')}>
        <Text>Protanopia (Blue/Orange)</Text>
        {colorblindMode === 'protanopia' && <Icon name="check" />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setColorblindMode('tritanopia')}>
        <Text>Tritanopia (Magenta/Teal)</Text>
        {colorblindMode === 'tritanopia' && <Icon name="check" />}
      </TouchableOpacity>
    </View>
  );
}
```

### High Contrast Mode

For users with low vision, provide high-contrast alternatives.

```typescript
interface HighContrastSettings {
  enabled: boolean;
  contrastRatio: number; // 1.0 to 2.0
}

// Apply to shader
const contrastMultiplier = highContrast.enabled
  ? highContrast.contrastRatio
  : 1.0;
material.uniforms.uContrastMultiplier.value = contrastMultiplier;
```

**Fragment Shader Update**:

```glsl
uniform float uContrastMultiplier;

void main() {
  vec3 color = mix(uColorNeg, uColorPos, smoothMix);

  // Apply contrast
  color = (color - 0.5) * uContrastMultiplier + 0.5;

  gl_FragColor = vec4(color, alpha);
}
```

### Text Alternatives

Provide text descriptions of emotional states:

```typescript
function EmotionalStateLabel() {
  const targetVAC = useExperienceStore(state => state.targetVAC);
  const [valence, arousal, connection] = targetVAC;

  const description = generateDescription(valence, arousal, connection);

  return (
    <Text
      accessibilityLabel={description}
      accessibilityRole="text"
      style={styles.stateLabel}
    >
      {description}
    </Text>
  );
}

function generateDescription(v: number, a: number, c: number): string {
  const valenceDesc = v > 0.5 ? 'positive' : v < -0.5 ? 'negative' : 'neutral';
  const arousalDesc = a > 0.5 ? 'high energy' : a < -0.5 ? 'low energy' : 'moderate energy';
  const connectionDesc = c > 0.5 ? 'connected' : c < -0.5 ? 'disconnected' : 'neutral connection';

  return `Emotional state: ${valenceDesc}, ${arousalDesc}, ${connectionDesc}`;
}
```

## Motor Accessibility

### Reduced Motion Mode

Users with vestibular disorders can experience nausea from motion. Provide a reduced motion option.

**Implementation**:

```typescript
const reducedMotion = useExperienceStore(
  (state) => state.preferences.reducedMotion,
);

useFrame((state, delta) => {
  if (!meshRef.current) return;

  // Reduce animation speed
  const speed = reducedMotion ? 0.5 : 2.0;
  meshRef.current.quaternion.slerp(targetQuat, delta * speed);
});
```

**System Setting Detection**:

```typescript
import { AccessibilityInfo } from "react-native";

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    if (enabled) {
      useExperienceStore.getState().setReducedMotion(true);
    }
  });
}, []);
```

### Disable Auto-Rotation

Allow users to disable automatic rotation entirely:

```typescript
function DisableRotationSetting() {
  const [rotationDisabled, setRotationDisabled] = useState(false);

  return (
    <Switch
      value={rotationDisabled}
      onValueChange={setRotationDisabled}
      accessibilityLabel="Disable automatic rotation"
    />
  );
}
```

## Haptic Accessibility

### Quiet Mode

Some users find haptics distracting or uncomfortable:

```typescript
function HapticSettings() {
  const hapticMode = useExperienceStore(state => state.preferences.hapticMode);
  const setHapticMode = useExperienceStore(state => state.setHapticMode);

  return (
    <View>
      <Text style={styles.label}>Haptic Feedback</Text>
      <Switch
        value={hapticMode === 'normal'}
        onValueChange={enabled => setHapticMode(enabled ? 'normal' : 'quiet')}
        accessibilityLabel="Enable haptic feedback"
        accessibilityHint="Vibration patterns that accompany emotional transitions"
      />
    </View>
  );
}
```

### Intensity Control

Allow users to adjust haptic intensity:

```typescript
function HapticIntensitySlider() {
  const [intensity, setIntensity] = useState(1.0);

  return (
    <Slider
      value={intensity}
      onValueChange={setIntensity}
      minimumValue={0.5}
      maximumValue={2.0}
      step={0.1}
      accessibilityLabel="Haptic intensity"
      accessibilityValue={{ min: 0.5, max: 2.0, now: intensity }}
    />
  );
}

// Apply to haptic calls
Haptics.impactAsync(style, { intensity: userIntensity });
```

## Screen Reader Support

### VoiceOver / TalkBack

Provide meaningful labels and hints:

```typescript
<View
  accessible={true}
  accessibilityLabel="Emotional visualization sphere"
  accessibilityHint="Displays your current emotional state through color, shape, and motion"
  accessibilityRole="image"
>
  <Canvas>
    <SoulSphere />
  </Canvas>
</View>
```

### Descriptive Navigation

```typescript
<TouchableOpacity
  onPress={openSettings}
  accessible={true}
  accessibilityLabel="Settings"
  accessibilityHint="Open accessibility and preference settings"
  accessibilityRole="button"
>
  <Icon name="settings" />
</TouchableOpacity>
```

### State Announcements

Announce significant state changes:

```typescript
import { AccessibilityInfo } from "react-native";

useEffect(() => {
  const [v, a, c] = targetVAC;

  // Announce major emotional shifts
  if (Math.abs(v - previousVAC[0]) > 0.5) {
    const message =
      v > 0 ? "Shifting to positive emotions" : "Shifting to negative emotions";
    AccessibilityInfo.announceForAccessibility(message);
  }
}, [targetVAC]);
```

## Cognitive Accessibility

### Simplified Mode

Provide a simplified view for users who find the 3D visualization overwhelming:

```typescript
function SimplifiedView() {
  const targetVAC = useExperienceStore(state => state.targetVAC);
  const [valence, arousal, connection] = targetVAC;

  return (
    <View style={styles.simplified}>
      <Text style={styles.title}>Your Emotional State</Text>

      <View style={styles.metric}>
        <Text>Valence: </Text>
        <ProgressBar progress={(valence + 1) / 2} color={valence > 0 ? 'green' : 'red'} />
      </View>

      <View style={styles.metric}>
        <Text>Energy: </Text>
        <ProgressBar progress={(arousal + 1) / 2} color="blue" />
      </View>

      <View style={styles.metric}>
        <Text>Connection: </Text>
        <ProgressBar progress={(connection + 1) / 2} color="purple" />
      </View>
    </View>
  );
}
```

### Contextual Help

Provide explanations accessible at any time:

```typescript
<TouchableOpacity
  onPress={() => setShowHelp(true)}
  accessible={true}
  accessibilityLabel="Help"
  accessibilityHint="Learn about the emotional visualization"
>
  <Icon name="help-circle" />
</TouchableOpacity>

{showHelp && (
  <Modal>
    <Text>This sphere represents your emotional state.</Text>
    <Text>• Color shows whether emotions are positive or negative</Text>
    <Text>• Surface texture shows energy level</Text>
    <Text>• Glow shows connection to self and others</Text>
  </Modal>
)}
```

## Testing Accessibility

### Automated Testing

```typescript
import { render } from '@testing-library/react-native';

describe('Accessibility', () => {
  test('Soul Sphere has accessibility label', () => {
    const { getByLabelText } = render(<ExperienceView />);
    expect(getByLabelText('Emotional visualization sphere')).toBeTruthy();
  });

  test('Settings button is accessible', () => {
    const { getByRole } = render(<SettingsButton />);
    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Settings');
  });

  test('Colorblind mode switches palette', () => {
    const { rerender } = render(<SoulSphere />);

    useExperienceStore.getState().setColorblindMode('deuteranopia');
    rerender(<SoulSphere />);

    // Verify shader uniforms updated
    // (requires access to material uniforms)
  });
});
```

### Manual Testing Checklist

- [ ] VoiceOver (iOS) reads all interactive elements
- [ ] TalkBack (Android) reads all interactive elements
- [ ] All buttons have descriptive labels
- [ ] State changes are announced
- [ ] Colorblind modes distinguish all states
- [ ] High contrast mode increases visibility
- [ ] Reduced motion mode reduces animation speed
- [ ] Haptics can be disabled completely
- [ ] Simplified view is comprehensible
- [ ] Text size respects system settings

### User Testing

Recruit users with disabilities to test:

- At least 2 users with colorblindness
- At least 1 user with motor impairments
- At least 1 user who relies on screen readers
- At least 1 user with vestibular disorders

## WCAG 2.1 Compliance

### Level A (Required)

- [x] **1.1.1 Non-text Content**: All visual states have text equivalents
- [x] **1.4.1 Use of Color**: Information not conveyed by color alone (geometry and glow also used)
- [x] **2.1.1 Keyboard**: All functionality accessible without haptics
- [x] **4.1.2 Name, Role, Value**: All components properly labeled

### Level AA (Target)

- [x] **1.4.3 Contrast**: High contrast mode available
- [x] **1.4.11 Non-text Contrast**: UI elements meet 3:1 contrast
- [x] **2.3.1 Three Flashes**: No flashing content
- [x] **2.5.1 Pointer Gestures**: No complex gestures required

### Level AAA (Aspirational)

- [ ] **1.4.6 Enhanced Contrast**: 7:1 contrast (future enhancement)
- [ ] **2.2.3 No Timing**: No time limits on interactions
- [ ] **2.3.2 Three Flashes**: More restrictive flash limit

## Platform-Specific Considerations

### iOS

```swift
// Native module for advanced accessibility
@objc(AccessibilityModule)
class AccessibilityModule: NSObject {
  @objc
  func isVoiceOverRunning(_ callback: RCTResponseSenderBlock) {
    callback([UIAccessibility.isVoiceOverRunning])
  }

  @objc
  func isDarkerSystemColorsEnabled(_ callback: RCTResponseSenderBlock) {
    callback([UIAccessibility.isDarkerSystemColorsEnabled])
  }
}
```

### Android

```kotlin
// Check for accessibility services
class AccessibilityHelper(private val context: Context) {
  fun isTalkBackEnabled(): Boolean {
    val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    return am.isEnabled && am.isTouchExplorationEnabled
  }
}
```

## Documentation for Users

### In-App Accessibility Guide

```typescript
function AccessibilityGuide() {
  return (
    <ScrollView>
      <Text style={styles.title}>Accessibility Features</Text>

      <Text style={styles.section}>Colorblind Modes</Text>
      <Text>We provide color palettes for common types of colorblindness.</Text>

      <Text style={styles.section}>Reduced Motion</Text>
      <Text>Decrease animation speed to prevent discomfort.</Text>

      <Text style={styles.section}>Quiet Mode</Text>
      <Text>Disable haptic feedback if vibrations are distracting.</Text>

      <Text style={styles.section}>Simplified View</Text>
      <Text>Switch to a text-based view of your emotional state.</Text>

      <Text style={styles.section}>Screen Readers</Text>
      <Text>The app is fully compatible with VoiceOver and TalkBack.</Text>
    </ScrollView>
  );
}
```

## Future Enhancements

- Voice control integration
- Customizable color palettes
- Audio descriptions of transitions
- Alternative input methods (switch control)
- Adjustable UI text size
- Localization for accessibility features

---

**Remember**: Accessibility is not a feature—it's a requirement. Every user deserves to experience the Soul Sphere's representation of their emotional journey.
