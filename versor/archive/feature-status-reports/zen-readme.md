# Zen Experience Feature

**Status:** 📋 Planned - Ready for Implementation  
**Estimated Effort:** 3-4 hours  
**Priority:** High - Beautiful UX improvement

---

## What Is This?

Transform the main page (`/`) into a **pure, contemplative viewer** that displays the Soul Sphere in real-time as controlled from the admin/atlas page.

### The Vision

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│   /admin/atlas               │ --> │   /  (Zen Mode)              │
│                              │     │                              │
│   [Control Everything]       │ --> │   [Pure Visualization]       │
│   • Select emotions          │     │   • Beautiful sphere         │
│   • Compute paths            │     │   • No UI clutter            │
│   • Analyze data             │     │   • Real-time updates        │
│   • All the controls         │     │   • Contemplative focus      │
└──────────────────────────────┘     └──────────────────────────────┘
           ADMIN                                 USER
         (Control)                            (Experience)
```

---

## Quick Links

📖 **[00-OVERVIEW.md](./00-OVERVIEW.md)** - Vision, use cases, architecture  
🛠️ **[01-IMPLEMENTATION.md](./01-IMPLEMENTATION.md)** - Step-by-step code guide  
🗺️ **[02-ROADMAP.md](./02-ROADMAP.md)** - Phase-by-phase plan with timelines

---

## Key Features

✨ **Real-Time Sync** - BroadcastChannel for instant updates  
✨ **Pure UI** - Just the sphere, nothing else  
✨ **Session Awareness** - Know which admin session you're following  
✨ **Keyboard Control** - 'I' to toggle indicator  
✨ **Future-Proof** - Easy migration to WebSocket for network deployment  

---

## Quick Start (For Implementation Session)

### Prerequisites
- Today's session complete (clinical mode + axis labels)
- Git stash applied (zen mode admin changes reverted)
- Fresh session energy! ☕

### Step-by-Step
1. Read [00-OVERVIEW.md](./00-OVERVIEW.md) (5 min) - Understand the vision
2. Read [01-IMPLEMENTATION.md](./01-IMPLEMENTATION.md) (10 min) - Code details
3. Follow [02-ROADMAP.md](./02-ROADMAP.md) - Implementation phases
4. Start with Phase 1.1 - Create useSphereSync hook
5. Test incrementally after each step

### Estimated Time
- **Phase 1:** 2 hours (core sync)
- **Phase 2:** 1 hour (zen UI)
- **Phase 3:** 1 hour (enhanced features)
- **Total:** 3-4 hours for complete feature

---

## Technical Approach

### Local Development (Phase 1)
**Technology:** BroadcastChannel API
- Same browser, different tabs
- Real-time (<10ms latency)
- No backend changes needed

### Network Deployment (Future)
**Technology:** WebSocket rooms
- Different devices/networks
- Backend session management
- Multi-viewer support

---

## What Gets Synced

From `/admin/atlas` to `/`:

1. **VAC Coordinates** - Current emotional state
2. **Selected Emotions** - Which emotions are active
3. **Transition Paths** - Active journeys between emotions
4. **Quaternion Rotation** - Sphere orientation (optional)

The zen page becomes a pure display of what's happening in the admin session.

---

## User Experience

### On Main Page (`/`)
- Full-screen black background
- Centered Soul Sphere
- Tiny session indicator (top-left): "Following Admin Session • Updated 2s ago"
- Minimal settings gear (top-right corner)
- **That's it!** Pure contemplation.

### On Admin Page (`/admin/atlas`)
- All existing functionality
- Silently broadcasts state changes
- No UI changes needed
- Works exactly as before

---

## Use Cases

### 🧘 Therapeutic Sessions
Therapist on `/admin/atlas` (laptop) → Client views `/` (large screen)

### 📊 Presentations
Speaker controls admin → Audience sees zen mode

### 💻 Development
Split screen: admin (controls) + zen (visual verification)

### 🌌 Meditation
Solo user: Admin in background, zen for contemplation

---

## Why This Is Awesome

🎨 **Beautiful** - Pure, uncluttered emotional visualization  
⚡ **Real-Time** - Instant updates across tabs  
🔮 **Therapeutic** - Perfect for client-facing displays  
🚀 **Scalable** - Foundation for network deployment  
💙 **Delightful** - Separation of control and contemplation  

---

## Implementation Notes

### Files to Create
- `experience/web/hooks/useSphereSync.ts` (~100 lines)
- `experience/web/components/ZenSessionIndicator.tsx` (~60 lines)

### Files to Modify
- `experience/web/app/page.tsx` (simplify to zen layout)
- `experience/web/app/admin/atlas/page.tsx` (add broadcaster)
- `experience/web/hooks/useKeyboardShortcuts.ts` (add 'I' key)
- `experience/web/stores/useExperienceStore.ts` (external update methods)

### Total Code: ~250 lines
### Total Deletion: ~100 lines (simplifying main page)
### Net Change: ~150 lines

---

## Success Criteria

✅ Open admin in tab 1, zen in tab 2  
✅ Select emotion in admin → sphere changes in zen (<100ms)  
✅ Compute path in admin → path appears in zen  
✅ Clean, beautiful zen page with zero clutter  
✅ Session indicator shows connection status  
✅ Keyboard shortcuts work (A for axes, I for indicator)  

---

## Next Steps

**When ready to implement:**
1. Open [01-IMPLEMENTATION.md](./01-IMPLEMENTATION.md)
2. Start with Phase 1.1
3. Test after each step
4. Celebrate when complete! 🎉

---

## Questions?

All details are in the linked documents. If you have questions during implementation:
- Check [00-OVERVIEW.md](./00-OVERVIEW.md) for "why"
- Check [01-IMPLEMENTATION.md](./01-IMPLEMENTATION.md) for "how"
- Check [02-ROADMAP.md](./02-ROADMAP.md) for "when"

---

**This feature will be absolutely beautiful. Can't wait to see it come to life!** ✨🌌
