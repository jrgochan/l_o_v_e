# Cinematic Camera Controls - Keyboard Vision

**Date:** December 7, 2025
**Status:** 🌟 Vision Document
**Theme:** Beautiful, choreographed camera movements via keyboard

---

## The Vision 🎬

Transform the Soul Sphere into a **cinematic experience** where the camera dances through emotional space, guided entirely by keyboard commands. Every movement intentional, every transition smooth, every view breathtaking.

**Make exploring emotions feel like directing a film.** 🎥

---

## Camera Movement Philosophy

## The camera is a storyteller

Each camera movement should:

- Have **purpose** - Why this view?
- Show **beauty** - Reveal the sphere's magnificence
- Create **understanding** - Help grasp emotional relationships
- Feel **intentional** - Never accidental or jarring

---

## Keyboard Camera Commands

### Basic Movements

### Via CMD+K

- `/camera orbit` - Gentle circular motion around sphere
- `/camera zoom in` - Smooth zoom toward center
- `/camera zoom out` - Pull back for overview
- `/camera reset` - Return to default position
- `/camera free` - Unlock for manual rotation

### Via Direct Keys (when implemented)

- **W/S** - Zoom in/out
- **A/D** - Orbit left/right
- **Q/E** - Roll camera
- **R** - Reset to home
- **F** - Frame selected emotions

---

## Preset Views 🎭

### Cardinal Positions

#### `/camera top` - Bird's eye view

- See VAC space from above
- Understand arousal/valence plane
- Perfect for presenting category distributions

#### `/camera side` - Profile view

- See valence axis clearly
- Understand emotional spectrum
- Good for showing positive/negative split

#### `/camera front` - Connection focus

- See connection axis depth
- Understand relational dynamics
- Perfect for social emotions

#### `/camera isometric` - 45° angle

- Balanced view of all three axes
- Classic data visualization perspective
- Great for screenshots

---

## Cinematic Sequences 🎬

### Emotional Flythrough

#### `/camera tour` - Automated tour of all bridge emotions

```text
1. Fly to Vulnerability (3 sec)
2. Orbit around it (2 sec)
3. Fly to Awe (3 sec)
4. Orbit around it (2 sec)
...continues through all 6 bridge emotions
```

#### `/camera category tour` - Fly through category

```bash
/camera tour expansive
  → Visits Joy, Peace, Love, etc. in sequence
```

### Path Walkthrough

#### `/camera follow path` - Camera follows computed path

```text
When path from Anxiety → Calm:
  → Starts at Anxiety
  → Smooth fly to waypoint 1
  → Pause and orbit
  → Fly to waypoint 2
  → etc.
```

#### `/camera path preview` - Quick preview of entire path

Faster version showing the full journey in 10 seconds

---

## Advanced Camera Techniques

### 1. Dolly Zoom (Vertigo Effect)

#### `/camera dolly joy`

- Zoom in while pulling back
- Creates dramatic focus on emotion
- Keeps emotion same size but changes perspective
- Beautiful for emphasizing significance

### 2. Orbital Tracking

#### `/camera orbit around joy`

- Camera circles selected emotion
- Maintains constant distance
- Shows emotion from all angles
- Perfect for detailed exploration

### 3. Fly-by

#### `/camera flyby joy to peace`

- Camera swoops past both emotions
- Reveals spatial relationship
- Dynamic, engaging movement
- Great for presentations

### 4. Pendulum Swing

#### `/camera swing anxiety calm`

- Camera swings between two emotions
- Shows contrast and distance
- Rhythmic, meditative movement
- Therapeutic visual metaphor

---

## Camera Bookmarks 📍

### Save & Load Views

### Save current view

```text
CMD+K → "/bookmark save overview"
```

### Load saved view

```text
CMD+K → "/bookmark load overview"
  OR
CMD+K → "overview" (if bookmark named "overview")
```

### Default Bookmarks

- **home** - Starting view
- **overview** - Pulled back, see everything
- **expansive** - Focused on positive emotions
- **contractive** - Focused on difficult emotions
- **bridge** - Centered on bridge emotions
- **neutral** - VAC origin (0,0,0)

---

## Presentation Mode 📊

### Slideshow Commands

#### `/present start` - Begin presentation mode

- Hides UI except sphere
- Enables presentation-specific keyboard shortcuts
- Tracks which slide you're on

#### Slides

1. `/slide overview` - Full sphere view
2. `/slide categories` - Tour each category
3. `/slide bridge` - Highlight bridge emotions
4. `/slide paths` - Show example paths
5. `/slide vac` - Explain VAC model
6. `/slide conclusion` - Summary view

#### Navigation

- **→** Next slide
- **←** Previous slide
- **ESC** Exit presentation

---

## Camera Smoothing & Easing

### Movement Styles

#### `/camera ease smooth` - Gentle, therapeutic movements

#### `/camera ease snappy` - Quick, precise movements

#### `/camera ease cinematic` - Film-quality curves

#### `/camera ease instant` - No animation (accessibility)

### Speed Control

#### `/camera speed slow` - Meditative pace

#### `/camera speed normal` - Balanced

#### `/camera speed fast` - Quick navigation

#### `/camera speed custom [0-2]` - Fine control

---

## Collaborative Camera Control

### Multi-User Scenarios

#### Therapist controls camera via keyboard

→ Client sees on Zen page
→ Both experience the same cinematic journey

#### Commands

```text
/camera follow me     - Client camera follows therapist
/camera independent   - Client can explore freely
/camera sync          - Snap client to therapist view
```

---

## Recording & Playback 🎞️

### Camera Path Recording

#### `/camera record start`

- Records all camera movements
- Saves as sequence

#### `/camera record stop`

- Saves recording

#### `/camera play [name]`

- Plays back recorded camera path
- Perfect for:
  - Consistent therapy sessions
  - Presentations
  - Training videos
  - Meditation sequences

### Pre-recorded Journeys

#### `/play anxiety-relief`

- Plays pre-made camera sequence
- Visits calming emotions in order
- Synchronized with audio guidance (future)

---

## Keyboard Combinations

### Modifier + Camera

#### ⌘ + Arrow Keys - Precise camera nudging

- ⌘+↑ - Nudge up
- ⌘+↓ - Nudge down
- ⌘+← - Nudge left
- ⌘+→ - Nudge right

#### ⌥ + Arrow Keys - Rotate around sphere

- ⌥+↑ - Rotate up
- ⌥+↓ - Rotate down
- ⌥+← - Rotate left
- ⌥+→ - Rotate right

#### ⇧ + Scroll - Zoom in/out precisely

---

## Visual Enhancements

### Camera Path Preview

Show camera path before executing:

```text
> Camera tour of expansive emotions

  Path: Joy → Peace → Love → Excitement
  Duration: 20 seconds
  Stops: 4

  [Preview] [Execute] [Cancel]
```

### On-Screen Display

During camera movements:

```text
🎥 Camera: Orbiting around Joy
   Position: [x, y, z]
   Target: Joy [0.8, 0.7, 0.6]
   Press ESC to stop
```

---

## Accessibility Features

### Motion Reduction

#### `/camera accessibility reduce-motion`

- Instant cuts instead of smooth transitions
- No orbital/swooping movements
- Fast, direct positioning

### Focus Assistance

#### `/camera lock emotion`

- Camera always faces selected emotion
- Simplifies navigation for some users

---

## Implementation Roadmap

### Phase 1: Basic Movements (2 hours)

- Zoom in/out
- Orbital rotation
- Reset to home
- Free/lock modes

### Phase 2: Preset Views (1 hour)

- Top, side, front views
- Isometric view
- Quick positioning

### Phase 3: Bookmarks (1-2 hours)

- Save/load camera positions
- Default bookmarks
- Named bookmarks

### Phase 4: Cinematic Sequences (2-3 hours)

- Automated tours
- Path following
- Flyby/dolly/tracking

### Phase 5: Recording (2 hours)

- Record camera paths
- Playback recordings
- Pre-made sequences

### Phase 6: Advanced (2 hours)

- Presentation mode
- Collaborative sync
- Motion preferences

#### Total: 10-12 hours

---

## Success Metrics

✅ **Smoothness:** 60fps camera movements
✅ **Control:** Precise positioning via keyboard
✅ **Beauty:** Cinematic quality transitions
✅ **Accessibility:** Motion reduction options
✅ **Therapeutic:** Enhances emotional exploration
✅ **Professional:** Presentation-ready views

---

## Future Dreams

### VR/AR Integration

Keyboard controls for VR headset camera

### Multi-Camera Views

Picture-in-picture, split screen

### Camera AI

"Show me the best view of these emotions"

### Haptic Feedback

Controller vibration synchronized with camera movement

---

**This will make exploring emotional space feel like conducting a visual symphony!** 🎼🎥✨
