# Wibblywobbly Timeywimey Paths - Overview

## Purely Visual, Beautifully Flowing Transition Paths

**Created**: December 6, 2025, 11:44 PM MDT
**Purpose**: Transform janky hover interactions into magical flowing visual art
**Status**: Specification Phase

---

## 🎯 Vision

Transform the Soul Sphere's transition paths from interactive-but-wonky tubes into **purely visual, flowing rivers of light** that respond to the emotional landscape with three distinct magical essences:

1. **Subtle Elegant** - Therapeutic calm, gentle breathing
2. **Dynamic Playful** - Engaging flow, alive with movement
3. **Mystical Ethereal** - Otherworldly shimmer, quantum dreams

---

## 🔍 Current Problem

**Wonky Hover Behavior:**

- 3D tube hit detection has occlusion issues
- Paths jump/scale oddly at camera angles
- Cursor changes feel finicky
- Interaction breaks immersion

### Current Interaction Points

```typescript
// PathNetwork.tsx - PROBLEMS:
onClick={(e) => { setSelectedPath(path.id); }}
onPointerOver={(e) => { setHoveredPath(path.id); }}
onPointerOut={() => { setHoveredPath(null); }}

// PathCurve animation - causes wonkiness:
useFrame(() => {
  if (isHovered) {
    meshRef.current.scale.setScalar(1.5); // JUMPY!
  }
});
```

---

## ✨ Proposed Solution

### 1. Remove ALL Interactions

Paths become **purely visual**:

- ❌ No onClick
- ❌ No onPointerOver/Out
- ❌ No cursor changes
- ❌ No hover-based scaling
- ✅ Pure visual beauty
- ✅ Stable, predictable rendering

### 2. Keyboard-Based Path Navigation

Navigate paths via keyboard (InfoPanel list already exists):

- `↑` / `↓` - Cycle through paths
- `1-5` - Jump to specific path
- `Enter` - Show path details modal
- `P` - Toggle all paths

#### Visual Feedback

- Selected path: Brighter, slightly thicker
- Unselected paths: Normal flowing beauty
- InfoPanel shows selection clearly

### 3. Three Toggleable Animation Modes

**Subtle Elegant** (Default - Therapeutic):

- Gentle breathing (0.8s cycle)
- Soft undulation (barely visible)
- Calm particle flow
- Soothing opacity shimmer

**Dynamic Playful** (Engaging):

- Pronounced wave motion
- Faster particle flow
- Color gradient shifts
- Energetic pulsing

**Mystical Ethereal** (Magical):

- Shader-based flowing colors
- Multiple wave frequencies
- Quantum-like shimmer
- Dreamlike transparency shifts

---

## 🏗️ Architecture

### Component Changes

#### PathNetwork.tsx

- Remove all pointer event handlers
- Add `pathAnimationMode` prop from settings
- Render different material/animation based on mode

#### useKeyboardShortcuts.ts

### Mode 4: Data Visualization

- Add path navigation (↑/↓, 1-5)
- Add Enter for details
- Update help text

#### AtlasAdminStore

- Add `pathAnimationMode: 'subtle' | 'dynamic' | 'mystical'`
- Remove `hoveredPathId` (no longer needed)
- Keep `selectedPathId` (keyboard selection only)

#### ControlPanel

- Add "Path Animation" dropdown/toggle group
- Persist selection to localStorage

---

## 📊 Comparison Matrix

| Feature | Subtle | Dynamic | Mystical |
|:--------|:-------|:--------|:---------|
| **Breathing** | Slow (0.8s) | Medium (0.5s) | Multi-freq |
| **Undulation** | Minimal | Pronounced | Shader-based |
| **Color** | Static | Gradient shift | Flowing shader |
| **Particles** | Slow, few | Fast, many | Trails + glow |
| **Complexity** | Simple | Medium | Advanced |
| **Performance** | Excellent | Good | Moderate |
| **Vibe** | 😌 Calm | 😊 Playful | 🔮 Magical |

---

## 🎭 When to Use Each Mode

**Subtle Elegant**:

- Clinical sessions (therapeutic calm)
- Working sessions (minimal distraction)
- Teaching/presentations
- Default for most users

**Dynamic Playful**:

- Exploration sessions
- Creative brainstorming
- Demos and showcases
- When energy is needed

**Mystical Ethereal**:

- Deep introspection
- Creative inspiration
- Special moments
- When magic feels right

---

## 📋 Implementation Phases

**Phase 1**: Remove interactions (~15 min)

- Strip out all pointer events
- Remove hover state management
- Test that paths still render

**Phase 2**: Keyboard navigation (~30 min)

- Add arrow/number key handlers
- Visual feedback for selection
- Update InfoPanel integration

**Phase 3**: Animation modes (~2-3 hours)

### Mode 1: Subtle (Default)

- Mode A: Subtle (simple useFrame)
- Mode B: Dynamic (enhanced useFrame)
- Mode C: Mystical (ShaderMaterial)

**Phase 4**: Settings UI (~30 min)

- Add animation mode dropdown
- Persist to localStorage
- Transition animations

**Phase 5**: Polish & test (~30 min)

- Fine-tune parameters
- Test mode switching
- Verify performance

**Total**: 4-5 hours

---

## 🔮 The Magic

Each mode isn't just different parameters - it's a different **emotional resonance**:

- **Subtle**: Whispers of change, gentle invitation
- **Dynamic**: Dance of transformation, alive with possibility
- **Mystical**: Dreams of becoming, quantum potential

The paths become a living art piece that responds to the viewer's needs and mood.

---

**Status**: Ready to Create Specifications
**Next**: Write detailed docs for each option
**Files**: 8 specification documents

Let me create these now! 🌟
