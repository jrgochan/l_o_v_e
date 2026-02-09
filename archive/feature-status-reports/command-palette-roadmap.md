# Command Palette - Completion Roadmap

**Date:** December 26, 2025
**Status:** 🚧 In Progress
**Goal:** Complete keyboard-driven interface for emotional journeys

---

## 📊 Current Status

### ✅ Phase 0: Basic Command Palette (COMPLETE)
**Completed:** December 7, 2025

- Beautiful command palette with CMD+K shortcut
- Emotion search with fuzzy matching
- Category browsing and drill-down
- Recent emotions & favorites (persisted)
- Modifier key actions (⌘ Add, ⌥ Focus, ⇧ Navigate)
- Quick actions: `/clear`, `/bridge`, `/reset`, `/help`
- Full keyboard navigation (↑↓, Enter, Esc)

**Files:**
- `experience/web/components/CommandPalette.tsx` (~270 lines)
- `experience/web/hooks/useCommandPalette.ts` (~290 lines)
- `experience/web/types/command-palette.ts` (~100 lines)

---

## 🎯 Tonight's Implementation Plan

### Phase 1: Journey Commands (4-6 hours) 🚧
**Status:** Starting now
**Priority:** HIGH - Core functionality

**Objective:** Full keyboard control of emotional journeys

**Commands to Implement:**
- `/journey start` - Begin journey from current path
- `/journey pause` - Pause active journey
- `/journey resume` - Continue paused journey
- `/journey complete` - Mark journey as complete
- `/journey abandon` - Abandon current journey
- `/next` - Move to next waypoint
- `/previous` - Return to previous waypoint
- `/waypoint [number]` - Jump to specific waypoint
- `/waypoint list` - View all waypoints in palette
- `/waypoint current` - Show current waypoint details

**UI Enhancements:**
- Active journey indicator in palette header
- Journey progress bar (waypoints reached)
- Current waypoint display with strategies
- Visual state for reached/current/locked waypoints

**Files to Modify:**
- `experience/web/hooks/useCommandPalette.ts` - Add journey handlers
- `experience/web/components/CommandPalette.tsx` - Journey UI
- `experience/web/types/command-palette.ts` - Journey types

**Integration Points:**
- `useExperienceStore` - Journey state management (already exists!)
- `TransitionPathRenderer` - 3D visualization sync
- `JourneyProgress` - Component coordination

---

### Phase 2: Advanced Search Operators (3-4 hours)
**Status:** Queued
**Priority:** HIGH - Power user features

**Objective:** Power user search capabilities

**Operators to Implement:**
- `~emotion` - Find similar emotions (VAC distance < 0.3)
- `!emotion` - Find opposite emotions (inverted VAC)
- `>category` - Filter by category (prefix match)
- `@favorite` - Show only favorited emotions
- `valence>0.5` - Filter by valence coordinate
- `arousal<0` - Filter by arousal coordinate
- `connection>0.8` - Filter by connection coordinate
- Combined operators - Chain multiple filters

**Search Enhancements:**
- Operator syntax highlighting
- Auto-complete suggestions
- Search hints in footer
- Operator documentation in `/help`

**Algorithm:**
- VAC similarity: Euclidean distance in 3D space
- Opposite: Invert VAC coordinates and find closest
- Filters: Parse and apply predicate chains

**Files to Modify:**
- `experience/web/components/CommandPalette.tsx` - Parser & filter logic
- `experience/web/hooks/useCommandPalette.ts` - Search utilities

---

### Phase 3: Journey Templates (2-3 hours)
**Status:** Queued
**Priority:** MEDIUM - Quick access workflows

**Objective:** Pre-built and custom journey templates

**Templates to Create:**
1. **Anxiety → Calm** - Most common therapeutic journey
   - Waypoints: Anxiety → Awareness → Acceptance → Calm
   - Difficulty: Easy, Duration: 15-20 min

2. **Sad → Content** - Depression support
   - Waypoints: Sadness → Melancholy → Peaceful → Content
   - Difficulty: Moderate, Duration: 20-25 min

3. **Angry → Peace** - Anger management
   - Waypoints: Anger → Frustration → Disappointment → Acceptance → Peace
   - Difficulty: Moderate, Duration: 25-30 min

4. **Stressed → Relaxed** - Stress reduction
   - Waypoints: Stressed → Overwhelmed → Tired → Calm → Relaxed
   - Difficulty: Easy, Duration: 15-20 min

**Commands:**
- `/template [name]` - Load pre-built template
- `/template list` - View all templates
- `/template save [name]` - Save current path as template
- `/template load [name]` - Load custom template
- `/template delete [name]` - Remove custom template

**Storage:**
- Pre-built: Static `data/journey-templates.ts`
- Custom: localStorage with metadata

**Files to Create:**
- `experience/web/data/journey-templates.ts` - Template definitions

**Files to Modify:**
- `experience/web/hooks/useCommandPalette.ts` - Template system
- `experience/web/components/CommandPalette.tsx` - Template UI

---

### Phase 4: Session Management (2-3 hours)
**Status:** Queued
**Priority:** MEDIUM - Therapeutic workflow

**Objective:** Manage therapeutic sessions with keyboard

**Session Features:**
- Session state tracking (active/paused/ended)
- Session timer (elapsed time)
- Session bookmarks (save camera/emotion states)
- Session notes (quick text notes)
- Session history (past sessions)

**Commands:**
- `/session start` - Begin therapeutic session
- `/session end` - End session and save
- `/session pause` - Pause session timer
- `/session resume` - Resume session
- `/session notes` - Quick note entry
- `/session bookmark [name]` - Save current state
- `/session goto [bookmark]` - Jump to bookmark
- `/session summary` - View session stats

**Session Data:**
```typescript
interface Session {
  session_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'paused' | 'ended';
  duration: number; // seconds
  journeys: string[]; // journey_ids
  bookmarks: SessionBookmark[];
  notes: SessionNote[];
}
```

**UI Display:**
- Session timer in palette header
- Bookmark list in search results
- Session summary modal on end

**Files to Modify:**
- `experience/web/stores/useExperienceStore.ts` - Session state
- `experience/web/hooks/useCommandPalette.ts` - Session commands
- `experience/web/components/CommandPalette.tsx` - Session UI

---

### Phase 5: Enhanced UI & Polish (1-2 hours)
**Status:** Queued
**Priority:** LOW - Final touches

**Objective:** Professional polish and user experience

**Enhancements:**
- Keyboard shortcuts cheat sheet in footer
- Animated transitions for state changes
- Context-aware command suggestions
- Better error messages
- Loading states for async operations
- Success/failure notifications
- Operator syntax highlighting
- Command history (↑↓ to recall)
- Smart defaults based on context

**Accessibility:**
- Screen reader announcements
- Focus management
- ARIA labels
- High contrast mode support

**Performance:**
- Debounced search (100ms)
- Memoized filters
- Virtual scrolling for large lists
- Lazy loading for templates

**Files to Modify:**
- `experience/web/components/CommandPalette.tsx` - UI polish
- `experience/web/hooks/useCommandPalette.ts` - UX improvements

---

## 📈 Success Metrics

By completion, users should achieve:

### Speed
- ⚡ Journey start: <10 seconds (vs. 60+ with mouse)
- ⚡ Emotion search: <2 seconds to find and select
- ⚡ Template load: <5 seconds to begin journey

### Efficiency
- 🎯 5-10x faster than mouse-based workflows
- 🎯 Zero context switching (hands stay on keyboard)
- 🎯 Complete journeys without touching mouse

### User Experience
- 💙 Intuitive for beginners (clear hints)
- 💙 Powerful for experts (operators & shortcuts)
- 💙 Professional for therapists (session management)
- 💙 Beautiful and smooth (animations & feedback)

---

## 🧪 Testing Strategy

### Manual Testing
1. Test each command in isolation
2. Test command combinations
3. Test error cases
4. Test keyboard navigation flow
5. Test with screen reader

### Integration Testing
1. Journey + path system
2. Session + journey coordination
3. Template + journey creation
4. Search + filter combinations

### User Testing
1. New user onboarding
2. Power user workflows
3. Therapist session flow
4. Error recovery

---

## 📝 Documentation Updates

### To Update:
1. `IMPLEMENTATION_COMPLETE.md` - Add new phases
2. `KEYBOARD_DRIVEN_JOURNEYS.md` - Mark as complete
3. `POWER_USER_WORKFLOWS.md` - Add real examples
4. Help modal in app - New commands
5. README.md - Updated feature list

---

## 🚀 Deployment Checklist

Before marking complete:
- [ ] All commands implemented and tested
- [ ] UI polish complete
- [ ] Documentation updated
- [ ] Error handling robust
- [ ] Performance optimized
- [ ] Accessibility verified
- [ ] User testing passed
- [ ] Code reviewed
- [ ] Git committed with clear messages

---

## 📊 Time Tracking

**Estimated Total:** 12-18 hours

**Actual Time:**
- Phase 1: ___ hours
- Phase 2: ___ hours
- Phase 3: ___ hours
- Phase 4: ___ hours
- Phase 5: ___ hours
- **Total:** ___ hours

---

## 💭 Notes & Learnings

_(To be filled in as we progress)_

---

**Last Updated:** December 26, 2025, 8:21 PM
**Status:** Phase 1 starting now! 🚀
