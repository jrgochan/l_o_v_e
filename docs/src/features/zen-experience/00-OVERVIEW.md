# Zen Experience - Pure Soul Sphere Viewer

**Feature:** Zen Experience Mode  
**Status:** 📋 Planned (Not Yet Implemented)  
**Planned Date:** December 2025  
**Estimated Effort:** 3-4 hours

---

## Vision

Transform the main page (`/`) into a **pure, contemplative viewer** that mirrors the admin/atlas session data, displaying only the beautiful Soul Sphere without UI clutter.

### The Concept

**Two-Page System:**

- **`/admin/atlas`** - Control Center (existing functionality)
- **`/`** - Zen Viewer (pure Soul Sphere visualization)

The admin page drives what the zen page displays, creating a beautiful separation of control and contemplation.

---

## Use Cases

### 1. Therapeutic Display

**Scenario:** Therapist works in `/admin/atlas` on laptop while client views `/` on large screen

- Therapist explores emotions, computes paths
- Client sees beautiful sphere transformations in real-time
- Pure, non-distracting visual experience

### 2. Presentation Mode

**Scenario:** Present emotional concepts to audience

- Speaker controls from `/admin/atlas`
- Audience views `/` (projected or on displays)
- Professional, focused presentation

### 3. Development Workflow

**Scenario:** Developer testing sphere behavior

- Admin page for controls and debugging
- Main page for pure visual verification
- Split-screen for instant feedback

### 4. Meditation/Contemplation

**Scenario:** User wants to simply observe emotional states

- No buttons, controls, or distractions
- Just the morphing sphere
- Zen-like focus on emotional awareness

---

## Architecture Overview

### Data Flow

```text
┌─────────────────────┐
│  /admin/atlas       │
│  (Control Center)   │
│                     │
│  • Select emotions  │
│  • Compute paths    │
│  • Analyze data     │
└──────────┬──────────┘
           │
           │ BroadcastChannel
           │ 'love-sphere-sync'
           ▼
┌─────────────────────┐
│  /  (Zen Viewer)    │
│                     │
│  • Soul Sphere      │
│  • Transition Paths │
│  • Pure Display     │
└─────────────────────┘
```

### Synchronization Strategy

#### Phase 1: Local (BroadcastChannel API)

- **Technology:** Native browser BroadcastChannel
- **Scope:** Same browser, different tabs
- **Latency:** Real-time (<10ms)
- **Use Case:** Local development, single-user scenarios

#### Phase 2: Network (WebSocket - Future)

- **Technology:** Backend WebSocket rooms
- **Scope:** Different devices/networks
- **Latency:** Network-dependent (~50-200ms)
- **Use Case:** Production deployment, multi-device setups

---

## Data Synchronized

### Core Sphere State

- **VAC Coordinates:** [valence, arousal, connection]
- **Quaternion Rotation:** [w, x, y, z] (optional for smooth transitions)
- **Target Emotion:** Current emotion being displayed

### Selection State

- **Selected Emotion IDs:** Array of selected emotions from admin
- **Hovered Emotion ID:** Currently hovered emotion (optional)

### Transition Path State

- **Active Path:** Full path data if transition is active
- **Path Waypoints:** Steps in the journey
- **Path Progress:** Current waypoint index (if animated)

### Metadata

- **Timestamp:** Last update time
- **Session ID:** Admin session identifier
- **Sync Version:** Protocol version for compatibility

---

## Zen Viewer UX

### Visual Elements (Visible)

- **Soul Sphere:** Full-screen, centered, beautiful
- **Transition Paths:** If active path exists in admin
- **VAC Axis Labels:** Optional (toggle with 'A')
- **Session Indicator:** Tiny floating badge (top-left)
- **Settings Button:** Minimal gear icon (top-right corner)

### Visual Elements (Hidden)

- ❌ Control panels
- ❌ Sidebars
- ❌ Emotion controls
- ❌ Chat interface
- ❌ Headers/footers
- ❌ Emotion cloud/points

### User Interactions

- **Drag:** Rotate sphere (camera control only)
- **Scroll:** Zoom in/out
- **A:** Toggle VAC axis labels
- **I:** Toggle session indicator visibility
- **Esc:** ??? (Reserved for future use)

### No-Session State

When no admin session is broadcasting:

- Show default neutral sphere (VAC: [0, 0, 0])
- Indicator shows: "Waiting for admin session..."
- Gentle pulsing animation on indicator

---

## Technical Architecture

### BroadcastChannel Protocol

**Channel Name:** `'love-sphere-sync'`

**Message Types:**

```typescript
// Sphere state update
{
  type: 'sphere_update',
  vac: [number, number, number],
  quaternion?: [number, number, number, number],
  targetEmotionId?: string,
  timestamp: number
}

// Selection update
{
  type: 'selection_update',
  selectedEmotionIds: string[],
  hoveredEmotionId?: string,
  timestamp: number
}

// Path update
{
  type: 'path_update',
  path: TransitionPath | null,
  currentWaypoint?: number,
  timestamp: number
}

// Session metadata
{
  type: 'session_meta',
  sessionId: string,
  version: string,
  timestamp: number
}

// Heartbeat (every 5s)
{
  type: 'heartbeat',
  timestamp: number
}
```

### Component Structure

**New Components:**

1. `ZenSessionIndicator.tsx` - Floating session info badge
2. `useSphereSync.ts` - BroadcastChannel hook (broadcaster/listener modes)
3. `ZenExperienceGuard.tsx` - Handles no-session state

**Modified Components:**

1. `app/page.tsx` - Zen viewer layout
2. `app/admin/atlas/page.tsx` - Add sphere state broadcaster
3. `stores/useExperienceStore.ts` - External update methods

---

## Future Enhancements

### Phase 2: Network Synchronization

- Backend session rooms via WebSocket
- Multiple viewers per admin session
- Session discovery/selection UI
- Reconnection handling

### Phase 3: Enhanced Zen Features

- Ambient audio reactive to VAC state
- Haptic feedback (if available)
- Fullscreen auto-enable option
- Screenshot/recording mode

### Phase 4: Presentation Mode

- Slide-based path walkthroughs
- Emotion highlights/callouts
- Annotations from admin
- Timing/pacing controls

---

## Benefits

✨ **Therapeutic Value:** Clean, focused emotional visualization  
✨ **Professional Presentation:** Separate control from display  
✨ **Development Efficiency:** Real-time testing workflow  
✨ **User Experience:** Pure contemplation of emotional states  
✨ **Scalability:** Foundation for network-based deployment  

---

## Risks & Mitigations

### Risk: Browser Compatibility

**Issue:** BroadcastChannel not supported in all browsers  
**Mitigation:** Feature detection with fallback to localStorage polling

### Risk: Sync Lag

**Issue:** Updates might feel delayed  
**Mitigation:** Optimize message frequency, debounce rapid updates

### Risk: Stale Data

**Issue:** Zen viewer shows old state if admin closes  
**Mitigation:** Heartbeat mechanism, timeout detection

### Risk: Resource Usage

**Issue:** Running both pages might be heavy  
**Mitigation:** Zen page is lightweight (no emotion cloud, minimal UI)

---

## Success Criteria

✅ Sphere updates in zen viewer within 100ms of admin change  
✅ Smooth transitions when admin selects new emotions  
✅ Paths render correctly on zen page  
✅ Session indicator shows connection status  
✅ No UI clutter on zen page  
✅ Works reliably across browser tabs  

---

## Related Documents

- [Implementation Guide](./01-IMPLEMENTATION.md) - Step-by-step development
- [Implementation Roadmap (Archived)](../../archive/feature-status-reports/zen-roadmap.md) - Phase-by-phase plan
- [VAC Model](../../architecture/02-vac-model.md) - Understanding the coordinate system

---

**Last Updated:** December 7, 2025  
**Next Review:** When implementation begins
