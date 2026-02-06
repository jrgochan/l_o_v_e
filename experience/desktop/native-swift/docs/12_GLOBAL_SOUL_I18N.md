# 12. Global Soul: Internationalization (i18n)

**Framework**: String Catalogs (.xcstrings)
**Goal**: "Emotions are universal, but vocabulary is cultural."

## 1. Cultural Emotional Theory

We don't just translate words; we translate _feelings_.

### 1.1. Untranslatable Emotions

The "Soul Sphere" supports unique emotional states that only exist in specific cultures.

- **"Saudade" (Portuguese)**: A deep emotional state of nostalgic or profound melancholic longing.
- **"Mono no aware" (Japanese)**: The pathos of things; an empathy toward things.
- **"Schadenfreude" (German)**: Pleasure derived by someone from another person's misfortune.

**Implementation**: The `EmotionEngine` must accept localized Vibe IDs that may not map 1:1 to English "Sadness".

## 2. Technical Strategy (String Catalogs)

### 2.1. String Extraction

- Use `String(localized: "key", defaultValue: "Text")` in Swift.
- Xcode 15+ automatically extracts these to `Localizable.xcstrings`.

### 2.2. Grammar Agreement

- **Gender**: Some languages (Spanish, French) gender emotions. "I am happy" -> "Estoy contento" (M) vs "Estoy contenta" (F).
- **Solution**: The `Soul` profile stores the user's grammatical gender preference, and `String(localized:)` uses inflection rules.

## 3. RTL (Right-to-Left) Support

- **Languages**: Arabic, Hebrew.
- **Layout**: SwiftUI handles mirroring automatically (`.environment(\.layoutDirection, .rightToLeft)`).
- **Visuals**: The "Flow" of the Aura charts needs to be reversed (Past on right, Future on left).

## 4. Date & Time Formats

- Never hardcode formats.
- Use `Date.FormatStyle` (iOS 15+).
- Example: `Text(date, format: .dateTime.weekday().day().month())` automatically adjusts order for US vs UK vs JP.
