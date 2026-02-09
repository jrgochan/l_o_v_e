# Keyboard-Driven Emotional Journeys

**Date:** December 7, 2025
**Status:** 🌟 Vision Document
**Theme:** Complete keyboard navigation for therapeutic emotional journeys

---

## The Dream 🌌

Imagine guiding someone through an entire emotional journey using ONLY the keyboard - from starting a session, to selecting emotions, computing paths, following waypoints, and completing the journey - all without touching a mouse.

**This is the future of therapeutic flow.**

---

## Journey Workflow

### Starting a Journey

```text
CMD+K → type "start journey"
  ↓
Select current emotion (type "anxiety")
  ↓
Select target emotion (type "calm")
  ↓
Compute path (auto-suggested)
  ↓
Review waypoints (↑↓ to navigate)
  ↓
Begin journey (Enter)
```

**Time:** ~10 seconds from CMD+K to journey start! ⚡

---

## Journey Navigation Commands

### Core Commands

#### `/journey start` - Begin new journey

#### `/journey pause` - Pause current journey

#### `/journey resume` - Continue journey

#### `/journey complete` - Mark journey as complete

#### `/journey abandon` - Stop and reset

### Waypoint Navigation

#### `/next` - Move to next waypoint

#### `/previous` - Return to previous waypoint

#### `/waypoint [number]` - Jump to specific waypoint

#### `/waypoint list` - View all waypoints

#### `/waypoint current` - Current waypoint details

### Journey Management

#### `/journey save` - Save journey for later

#### `/journey load` - Load saved journey

#### `/journey export` - Export journey data

#### `/journey share` - Share journey with others

---

## Visual Feedback

### Journey Progress Indicator

When journey is active, show in command palette:

```text
┌────────────────────────────────────────┐
│  🔍 Search actions...                  │
├────────────────────────────────────────┤
│                                         │
│  🛤️  ACTIVE JOURNEY: Anxiety → Calm    │
│  ━━━━━━━━━●━━━━━━━ 60%                 │
│  Waypoint 3 of 5: Awareness             │
│                                         │
│  ⚡ JOURNEY ACTIONS                    │
│    Next waypoint                        │
│    View strategies                      │
│    Pause journey                        │
│    Complete journey                     │
│                                         │
└────────────────────────────────────────┘
```

### Waypoint Details View

Press Enter on waypoint to see:

```text
┌────────────────────────────────────────┐
│  📍 Waypoint 3: Awareness              │
├────────────────────────────────────────┤
│                                         │
│  VAC: [0.2, 0.3, 0.4]                  │
│  Estimated time: 5-10 minutes           │
│  Difficulty: Moderate                   │
│                                         │
│  STRATEGIES:                            │
│  • Body scan meditation                 │
│  • Breath awareness                     │
│  • Mindful observation                  │
│                                         │
│  ACTIONS:                               │
│  → Mark as reached                      │
│  → View in 3D                           │
│  → Get detailed guidance                │
│                                         │
└────────────────────────────────────────┘
```

---

## Advanced Journey Features

### 1. Guided Waypoint Navigation

#### Auto-advance Mode

```text
/journey auto-advance on
```

Automatically moves to next waypoint after time elapsed

#### Waypoint Notifications

```text
/journey notify waypoint
```

Gentle notification when approaching waypoint

#### Strategy Suggestions

```text
/strategies
```

AI-suggested strategies for current waypoint

### 2. Journey Templates

#### Pre-built Journeys

- **Anxiety → Calm** - `/template anxiety-calm`
- **Sad → Content** - `/template sad-content`
- **Angry → Peace** - `/template angry-peace`
- **Stressed → Relaxed** - `/template stress-relax`

#### Custom Templates

- **Save as template** - `/template save "my-journey"`
- **Load template** - `/template load "my-journey"`
- **Share template** - `/template share "my-journey"`

### 3. Journey Analytics

#### View Progress

```text
/journey stats
```

Shows:

- Time spent on journey
- Waypoints reached
- Strategies used
- Success rate

#### Journey History

```text
/journey history
```

Past journeys with outcomes

---

## Keyboard Choreography 💃

### Example: Complete Journey Flow

```text
1. CMD+K → "anxiety"          (Select current emotion)
2. ⌥+Enter                     (Focus camera on anxiety)
3. CMD+K → "calm"             (Open palette again)
4. ⌘+Enter                     (Add to selection)
5. CMD+K → "compute"          (Compute paths)
6. ↓ ↓ Enter                   (Select optimal path)
7. CMD+K → "start journey"    (Begin journey)
8. [Journey progresses]
9. CMD+K → "next"             (Move to waypoint 1)
10. Read strategies
11. CMD+K → "mark reached"    (Mark waypoint complete)
12. CMD+K → "next"            (Continue...)
13. CMD+K → "complete"        (Journey done!)
```

**Total time:** ~2 minutes for complete journey setup and execution!

---

## Integration with Zen Mode

### Client View (Zen Page)

While therapist uses CMD+K on admin page, client sees on zen page:

- Journey progress bar
- Current waypoint name
- Estimated time remaining
- Gentle animations

**Therapist keyboard commands update zen display in real-time!**

---

## Voice Integration (Future)

Combine keyboard with voice:

```text
CMD+K → Voice: "Start journey from anxiety to peace"
  ↓
System parses, shows confirmation
  ↓
Press Enter to confirm
  ↓
Journey begins
```

---

## Therapeutic Benefits

### For Therapists

- ⌨️ Keep hands on keyboard - maintains flow
- 👀 Keep eyes on client - not on mouse
- ⚡ Faster session navigation
- 📝 Easy to take notes (keyboard already there)
- 🎯 Professional, focused demeanor

### For Clients

- 🌊 Smooth, uninterrupted experience
- ✨ Beautiful visual journey unfolds
- 🎭 No technical barriers
- 💙 Focused on emotional experience
- 🙏 Guided with precision

---

## Success Metrics

✅ **Speed:** Journey setup in <2 minutes
✅ **Ease:** No mouse required
✅ **Flow:** Continuous keyboard interaction
✅ **Accessibility:** Works for everyone
✅ **Professional:** Therapist never breaks eye contact

---

## Implementation Roadmap

### Phase 1: Core Journey Commands (2-3 hours)

- /journey start, pause, resume, complete
- /next, /previous waypoint navigation
- Basic journey progress tracking

### Phase 2: Waypoint Details (1-2 hours)

- Waypoint detail view in command palette
- Strategy display
- Mark as reached action

### Phase 3: Templates (2 hours)

- Pre-built journey templates
- Save/load custom templates
- Template sharing

### Phase 4: Analytics (1-2 hours)

- Journey stats tracking
- Progress visualization
- History view

### Phase 5: Auto-advance (1 hour)

- Automatic waypoint progression
- Notifications
- Time-based transitions

#### Total: 7-10 hours

---

## Future Enhancements

### Collaborative Journeys

Therapist and client both navigate together via keyboard

### Voice-Guided Journeys

Spoken waypoint descriptions synchronized with keyboard nav

### Haptic Feedback

Gentle vibrations on waypoint reach (mobile/gamepad)

### Journey Recordings

Playback past journeys with keyboard timeline scrubbing

---

**This will make emotional journeys feel like dancing through emotional space with your fingertips!** 💫🎹🌈
