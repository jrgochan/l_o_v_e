# 03. UI Design System: "Fluid Soul"

**Framework**: SwiftUI  
**Renderer**: Metal  
**Style**: Glassmorphism 2.0 ("Liquid Glass")

## 1. The Glass Philosophy
Standard Glassmorphism (CSS `backdrop-filter`) is flat. "Liquid Glass" has depth, refraction, and chromatic aberration.

### 1.1. Materials
We use a custom `ViewModifier` to apply the signature material stack.

```swift
struct SoulGlass: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial) // The blur
            .background(
                // The "Inner Glow"
                LinearGradient(colors: [.white.opacity(0.1), .clear],
                               startPoint: .topLeading,
                               endPoint: .bottomTrailing)
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5) // Elevation
    }
}
```

## 2. Fluidity & Motion

### 2.1. The "Breathing" Rhythm
The UI should never be perfectly still. It should "breathe" (scale/opacity) at 6 cycles per minute (standard meditative breath).
*   **Implementation**: A global `BreathPublisher` (Combine) that emits a sine wave value `0.0` to `1.0`. All views can subscribe to this to subtly oscillate.

### 2.2. Physics-Based Animation
We avoid `easeIn` / `easeOut`. We use `Spring`.
*   **Standard Spring**: `.spring(response: 0.4, dampingFraction: 0.8)` -> "Snappy but soft".
*   **Heavy Spring**: `.spring(response: 0.6, dampingFraction: 0.7)` -> For "heavy" emotional content (Sadness).

## 3. Typography
We use dynamic type but with a custom font: **"SF Pro Rounded"** (soft, human) or a licensed humanist sans.

| Role | Style | Weight |
| :--- | :--- | :--- |
| **Header** | Large Title | Bold |
| **Vibe** | Title 1 | Semibold |
| **Body** | Body | Regular |
| **Caption** | Footnote | Medium |

## 4. Haptics (The "Tactile" Layer)
We treat the `Taptic Engine` as a speaker.

*   **Joy**: Sharp, crisp taps (`.rigid`).
*   **Sadness**: Soft, heavy thuds (`.heavy`).
*   **Anxiety**: Rapid, light oscillation.
*   **Peace**: Slow, fade-in/fade-out continuous vibration (using CoreHaptics `CHHapticPattern`).

## 5. Accessibility (A11y)
*   **VoiceOver**: All custom controls MUST implement `.accessibilityLabel` and `.accessibilityValue`.
*   **Reduce Motion**: We must respect `Environment(\.accessibilityReduceMotion)`. If true, disable the "Breathing" and complex transitions.
