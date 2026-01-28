# 09. Ecosystem Integration

**Frameworks**: AppIntents, WidgetKit, CoreSpotlight  
**Goal**: The app should be useful even when it is closed.

## 1. App Intents (Siri & Shortcuts)

We expose the "Soul" to the OS intelligence layer.

### 1.1. Core Intents
*   `LogVibe`: "Hey Siri, I'm feeling Anxious." -> Logs Vibe.
*   `GetInsight`: "Hey Siri, why am I sad?" -> Queries `SoulChat` (LLM) and speaks summary.
*   `StartJournal`: Opens into dictation mode immediately.

### 1.2. Shortcuts
*   **Morning Routine**: Users can build a shortcut: `Wake Up` -> `Log Sleep` -> `Love: Morning Briefing`.
*   **Action Button**: Map the iPhone 15/16 Action Button directly to `StartJournal`.

## 2. WidgetKit (Home & Lock Screen)

### 2.1. Interactive Widgets (iOS 17+ / macOS 14+)
*   **"Vibe Check" Widget**:
    - **Visual**: A small bubble of the current "Aura" color.
    - **Interaction**: Buttons to quickly up-vote/down-vote Valence/Arousal without opening the app.
*   **"Memory" Widget**:
    - **Visual**: Shows a "On this day" memory photo or quote.

### 2.2. Live Activities / Dynamic Island
*   **Usage**: While "Deep Focus" or "Meditation" mode is active.
*   **Display**: Real-time HRV pulse and session timer in the Dynamic Island.

## 3. Spotlight Search (CoreSpotlight)

### 3.1. Indexing
*   **Content**: Index all `Memory` objects (Journal entries).
*   **Attributes**: `title`, `contentDescription`, `keywords` (AI generated tags), `thumbnailData`.
*   **Action**: Tapping a result Deep Links directly to that memory in the "Soul Sphere".

## 4. Continuity (Handoff)
*   **NSUserActivity**: 
    - Start writing a journal on Mac.
    - Walk away.
    - Icon appears on iPhone Dock.
    - Swipe up -> Continue writing exactly where you left off.
