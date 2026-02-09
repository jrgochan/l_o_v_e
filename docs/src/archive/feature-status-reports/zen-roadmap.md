# Zen Experience - Implementation Roadmap

**Document:** 02-ROADMAP.md
**Status:** Planning Document
**Last Updated:** December 7, 2025

---

## Overview

This roadmap breaks down the Zen Experience implementation into manageable phases with clear deliverables and time estimates.

---

## Phase 1: Foundation (Est: 2 hours)

### Goals

- Establish BroadcastChannel communication
- Sync basic VAC state
- Minimal zen viewer layout

### Tasks

#### 1.1 Create useSphereSync Hook (45 min)

**File:** `experience/web/hooks/useSphereSync.ts`

- [ ] Implement broadcaster mode
- [ ] Implement listener mode
- [ ] Add heartbeat mechanism
- [ ] Add error handling
- [ ] Add logging

**Deliverable:** Hook that can broadcast/receive sphere state

#### 1.2 Add Broadcaster to Admin (30 min)

**File:** `experience/web/app/admin/atlas/page.tsx`

- [ ] Import useSphereSync
- [ ] Call with mode='broadcaster'
- [ ] Broadcast on VAC changes
- [ ] Broadcast on selection changes
- [ ] Test: Console logs show messages being sent

**Deliverable:** Admin page broadcasts sphere state

#### 1.3 Add Listener to Main Page (30 min)

**File:** `experience/web/app/page.tsx`

- [ ] Import useSphereSync
- [ ] Call with mode='listener'
- [ ] Update sphere on messages
- [ ] Test: Sphere responds to admin changes

**Deliverable:** Main page receives and displays updates

#### 1.4 Testing & Validation (15 min)

- [ ] Open both pages side-by-side
- [ ] Select emotion in admin
- [ ] Verify sphere changes on main page
- [ ] Check console for sync messages
- [ ] Measure latency (<100ms goal)

**Deliverable:** Working end-to-end sync

---

## Phase 2: Zen UI (Est: 1 hour)

### Goals

- Create beautiful zen viewer layout
- Add session indicator
- Remove all UI clutter

### Tasks

#### 2.1 Create ZenSessionIndicator (30 min)

**File:** `experience/web/components/ZenSessionIndicator.tsx`

- [ ] Floating badge component
- [ ] Show time since last sync
- [ ] Stale state warning (>10s)
- [ ] Smooth animations
- [ ] Test: Indicator updates correctly

**Deliverable:** Session status indicator component

#### 2.2: Simplify Main Page Layout (20 min)

**File:** `experience/web/app/page.tsx`

- [ ] Remove sidebar completely
- [ ] Remove header overlay
- [ ] Keep only Scene + Settings
- [ ] Add ZenSessionIndicator
- [ ] Full-screen black background

**Deliverable:** Clean, minimal zen viewer

#### 2.3 Add Indicator Toggle (10 min)

- [ ] Add 'I' keyboard shortcut
- [ ] Toggle indicator visibility
- [ ] Update useKeyboardShortcuts
- [ ] Test: Press 'I' hides/shows indicator

**Deliverable:** Keyboard control for indicator

---

## Phase 3: Enhanced Sync (Est: 1 hour)

### Goals

- Sync transition paths
- Add stale detection
- Handle edge cases

### Tasks

#### 3.1 Path Synchronization (30 min)

- [ ] Add path_update message type
- [ ] Broadcast active path from admin
- [ ] Receive and render path on zen page
- [ ] Test: Path appears when computed in admin

**Deliverable:** Paths sync between pages

#### 3.2 Stale Detection (20 min)

- [ ] Monitor time since last message
- [ ] Show warning after 10s
- [ ] Revert to neutral state after 30s?
- [ ] Test: Close admin, watch indicator

**Deliverable:** Graceful handling of disconnection

#### 3.3 Reconnection Logic (10 min)

- [ ] Auto-reconnect when admin returns
- [ ] Clear stale state
- [ ] Smooth transition back
- [ ] Test: Close/reopen admin tab

**Deliverable:** Seamless reconnection

---

## Phase 4: Polish & Features (Est: 30 min)

### Goals

- Add finishing touches
- Performance optimization
- Documentation

### Tasks

#### 4.1 Performance Optimization (15 min)

- [ ] Debounce rapid broadcasts (max 30fps)
- [ ] Only broadcast on meaningful changes
- [ ] Profile CPU usage on zen page
- [ ] Ensure smooth 60fps rendering

**Deliverable:** Optimized performance

#### 4.2 Edge Case Handling (10 min)

- [ ] Handle no admin session gracefully
- [ ] Handle malformed messages
- [ ] Browser compatibility check
- [ ] Fallback for unsupported browsers

**Deliverable:** Robust error handling

#### 4.3 Documentation Update (5 min)

- [ ] Update README with zen mode info
- [ ] Add to keyboard shortcuts list
- [ ] Screenshot/demo instructions
- [ ] Migration notes

**Deliverable:** Complete documentation

---

## Future Phases (Not in Scope)

### Phase 5: Network Sync (Future)

**Estimated:** 4-6 hours

- WebSocket-based synchronization
- Backend session rooms
- Multi-device support
- Session discovery UI

### Phase 6: Enhanced Zen Features (Future)

**Estimated:** 2-3 hours

- Ambient audio reactive to VAC
- Auto-fullscreen mode
- Screenshot/recording capability
- Haptic feedback integration

### Phase 7: Presentation Mode (Future)

**Estimated:** 6-8 hours

- Slide-based walkthroughs
- Annotations from admin
- Timing controls
- Export presentation

---

## Dependencies

### Required

- ✅ useExperienceStore (exists)
- ✅ useAtlasAdminStore (exists)
- ✅ Scene component (exists)
- ✅ BroadcastChannel API (browser native)

### New

- ⏳ useSphereSync hook (to be created)
- ⏳ ZenSessionIndicator component (to be created)

---

## Risk Assessment

### High Priority Risks

#### Risk 1: Broadcast Channel Support

- **Probability:** Medium
- **Impact:** High
- **Mitigation:** Feature detection + localStorage fallback
- **Owner:** Implementation phase 1

#### Risk 2: Sync Performance

- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Debouncing, profiling
- **Owner:** Implementation phase 4

### Medium Priority Risks

#### Risk 3: Stale Data UX

- **Probability:** Medium
- **Impact:** Low
- **Mitigation:** Clear indicator states
- **Owner:** Implementation phase 3

---

## Success Metrics

### Performance

- ✅ Sync latency < 100ms (P95)
- ✅ Zen page maintains 60fps
- ✅ CPU usage < 10% on zen page

### Functionality

- ✅ 100% of sphere updates sync
- ✅ Paths render correctly
- ✅ Reconnection works reliably

### UX

- ✅ Zero UI clutter on zen page
- ✅ Clear session status
- ✅ Smooth, beautiful animations

---

## Timeline

### Sprint 1 (Session 1)

- **Duration:** 2-3 hours
- **Focus:** Phase 1 + Phase 2
- **Deliverable:** Working zen viewer with basic sync

### Sprint 2 (Session 2)

- **Duration:** 1-2 hours
- **Focus:** Phase 3 + Phase 4
- **Deliverable:** Production-ready feature

### Future

- Phase 5+ as needed for network deployment

---

## Implementation Order (Critical Path)

```text
1. useSphereSync hook (blocking)
   ↓
2. Broadcaster in admin (blocking)
   ↓
3. Listener in main (blocking)
   ↓
4. Test basic sync (gate)
   ↓
5. ZenSessionIndicator (parallel with #6)
   ↓
6. Zen page layout (parallel with #5)
   ↓
7. Enhanced features (iterative)
```

---

## Rollback Plan

If implementation hits blockers:

### Option A: Partial Deployment

- Deploy just Phase 1 (basic sync)
- Keep original main page UI
- Users can opt-in to zen mode

### Option B: Feature Flag

- Add `enableZenMode` setting
- Default: OFF
- Easy to disable if issues arise

### Option C: Revert

- Git stash exists
- Clean rollback to previous state
- Document lessons learned

---

## Post-Implementation

### Immediate (Week 1)

- [ ] User testing with 5+ users
- [ ] Performance profiling
- [ ] Bug fixes
- [ ] Documentation refinement

### Short-term (Month 1)

- [ ] Collect feedback
- [ ] Add requested features
- [ ] Optimize based on usage
- [ ] Plan network sync

### Long-term (Quarter 1)

- [ ] Network deployment
- [ ] Multi-viewer support
- [ ] Production hardening
- [ ] Scale testing

---

## Next Session Agenda

**When you're ready to implement:**

1. **Review** this roadmap
2. **Start Phase 1.1** - Create useSphereSync hook
3. **Test incrementally** after each step
4. **Iterate** based on what we discover

**Estimated Total Time:** 3-4 hours for complete implementation

---

**This roadmap is your guide - follow it step-by-step and we'll build something beautiful!** ✨
