# Data Visualization Mode - Mini Soul Spheres

## Toggle with 'D' Key - Show VAC Coordinates 3D Spheres

**Created**: December 7, 2025, 12:54 AM MDT  
**Status**: Planning Phase  
**Purpose**: Visualize each emotion's VAC coordinates as a mini soul sphere

---

## 🎯 Vision

Transform emotion nodes from simple colored spheres into **mini Soul Spheres** that visualize their VAC coordinates using the same sophisticated 3D representation as the Aggregate Emotion Sphere.

### Current: Simple Mode

- Emotion = colored sphere
- Breathing/rotation/glow based on VAC
- Motion indicators (rings) show category type
- Clean, categorical, easy to understand

### New: Data Mode (Press 'D')

- Emotion = **mini Soul Sphere** (like AggregateEmotionSphere)
- **Color blending** represents VAC values
- **Particles** based on arousal (count/speed)
- **Opacity** based on complexity/confidence
- **Particle swirl** direction based on valence
- Shows emotional "density" and dimensional complexity

---

## 🎭 The Meta-Magic

### Dual Representation

- **Spatial position** = Canonical VAC coordinates (where it sits in space)
- **Internal visualization** = User's actual experience of that emotion (from chat data)

### Example

- **Joy's canonical VAC**: [0.8, 0.7, 0.6] (positive, high arousal, connected)
- **User's joy experience**: Could be less connected, different arousal
- **Mini sphere shows**: The user's personalized version inside the canonical position

Creates beautiful **"This is Joy in general vs YOUR Joy"** comparison!

---

## 🏗️ Architecture

### 1. Add Display Mode Setting

```typescript
// types/atlas-admin.ts
export type EmotionDisplayMode = 'simple' | 'data';

interface AtlasAdminSettings {
  // ... existing settings
  emotionDisplayMode: EmotionDisplayMode; // Default: 'simple'
}
```

### 2. Create MiniSoulSphere Component

**New file**: `experience/web/components/admin/emotions/MiniSoulSphere.tsx`

Based on AggregateEmotionSphere but:

- Renders in R3F context (not standalone canvas)
- Smaller size (matches current emotion sphere)
- Simplified particle system (10-30 particles max)
- Takes VAC coordinates as input
- Optional: accepts chat session data
- Color blending based on VAC values

```typescript
interface MiniSoulSphereProps {
  vac: VACVector; // [valence, arousal, connection]
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  mode: PathAnimationMode; // Respects animation mode
  chatData?: {
    userVac?: VACVector; // User's actual VAC for this emotion
    confidence?: number;
    frequency?: number; // How often user experiences this
  };
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}
```

#### Rendering approach

- Main sphere: Color from VAC valence (green/yellow/orange/red gradient)
- Particle count: Based on arousal (10-30 particles)
- Particle speed: Based on arousal
- Particle swirl direction: Based on valence (up=positive, down=negative)
- Sphere opacity: Based on connection or confidence
- Rotation: Based on arousal

### 3. Update EmotionCloud

```typescript
{settings.emotionDisplayMode === 'simple' ? (
  <AnimatedEmotionNode
    emotion={emotion}
    color={color}
    size={size}
    mode={settings.pathAnimationMode}
    isSelected={isSelected}
    isHovered={isHovered}
    onClick={handleClick}
    onPointerOver={handlePointerOver}
    onPointerOut={handlePointerOut}
  />
) : (
  <MiniSoulSphere
    vac={emotion.vac}
    size={size}
    isSelected={isSelected}
    isHovered={isHovered}
    mode={settings.pathAnimationMode}
    chatData={getChatDataForEmotion(emotion.id)}
    onClick={handleClick}
    onPointerOver={handlePointerOver}
    onPointerOut={handlePointerOut}
  />
)}
```

### 4. Add Keyboard Shortcut

```typescript
case 'd':
  // Toggle emotion display mode (Data spheres vs Simple)
  if (!e.ctrlKey && !e.metaKey) {
    const currentMode = settings.emotionDisplayMode;
    const newMode = currentMode === 'simple' ? 'data' : 'simple';
    updateSetting('emotionDisplayMode', newMode);
    
    console.log(`Emotion Display Mode: ${newMode === 'data' 
      ? '📊 Data Spheres (VAC visualization)' 
      : '● Simple Spheres (Clean nodes)'}`);
  }
  break;
```

---

## 🎨 Color Mapping from VAC

### Valence → Base Color

- Very Positive (0.7 to 1.0): Bright green (#22c55e)
- Positive (0.3 to 0.7): Lime (#a3e635)
- Neutral (-0.3 to 0.3): Amber (#fbbf24)
- Negative (-0.7 to -0.3): Orange (#f97316)
- Very Negative (-1.0 to -0.7): Red (#ef4444)

### Arousal → Particles

- High (0.5 to 1.0): 25-30 particles, fast speed
- Medium (-0.5 to 0.5): 15-20 particles, medium speed
- Low (-1.0 to -0.5): 10-15 particles, slow speed

### Connection → Opacity + Glow

- High (0.5 to 1.0): High opacity (0.9), strong glow
- Medium (-0.5 to 0.5): Medium opacity (0.7), medium glow
- Low (-1.0 to -0.5): Lower opacity (0.5), dim glow

### Valence → Particle Direction

- Positive: Upward spiral
- Neutral: Horizontal swirl
- Negative: Downward drift

---

## 🚀 Implementation Phases

### Phase 1: Foundation (~30 min)

- [ ] Add `EmotionDisplayMode` type
- [ ] Add `emotionDisplayMode` to settings (default: 'simple')
- [ ] Add 'D' keyboard shortcut
- [ ] Update help text

### Phase 2: MiniSoulSphere Component (~2-3 hours)

- [ ] Create MiniSoulSphere.tsx based on AggregateEmotionSphere
- [ ] Convert from standalone canvas to R3F mesh
- [ ] Implement VAC → color mapping
- [ ] Implement VAC → particle count/speed
- [ ] Implement particle system (instanced for performance)
- [ ] Test with single emotion

### Phase 3: Integration (~1 hour)

- [ ] Update EmotionCloud to conditionally render
- [ ] Pass all required props
- [ ] Ensure interactions still work (click/hover)
- [ ] Test with all 87 emotions

### Phase 4: Performance (~1 hour)

- [ ] Profile rendering performance
- [ ] Optimize particle counts if needed
- [ ] Consider LOD (show simplified version when zoomed out)
- [ ] Test on different devices

### Phase 5: Chat Data Integration (~2 hours - Optional)

- [ ] Create hook to get chat data per emotion
- [ ] Modulate mini-sphere based on user's actual VAC
- [ ] Visual differentiation (canonical vs user experience)
- [ ] Polish & test

**Total**: 6-8 hours for full implementation

---

## 🎪 Use Cases

### Educational

- Teaching: "See how each emotion has different dimensional characteristics"
- Learning: Toggle between simple (names) and data (dimensions)

### Clinical

- Show client how their Joy differs from canonical Joy
- Visualize emotional patterns over session
- Identify areas of emotional congruence/dissonance

### Research

- Compare population VAC vs canonical VAC
- Visualize emotional complexity
- Study dimensional relationships

---

## 💡 Advanced Future Ideas

### V2: Real-time Modulation

- Mini-sphere changes in real-time during chat
- Shows how user's experience evolves
- Fade between canonical and current

### V3: Historical View

- Show mini-sphere as it appeared at different points in session
- Timeline scrubbing
- Pattern identification

### V4: Comparison Mode

- Show two mini-spheres side by side (canonical vs user)
- Highlight differences
- Educational overlays

---

## 🔮 The Magic

**Simple Mode**: "What emotions exist"  
**Data Mode**: "What emotions ARE (dimensionally)"

Users can toggle their learning/viewing modality based on needs:

- Beginners: Simple mode (learn names/categories)
- Advanced: Data mode (understand VAC dimensions)
- Clinical: Toggle between for therapeutic teaching

The Soul Sphere becomes a **multi-modal educational and therapeutic tool**!

---

**Status**: Ready for implementation  
**Complexity**: Medium-High (3D rendering performance challenges)  
**Impact**: High (transforms educational/clinical utility)  
**Priority**: Nice-to-have enhancement (core### Features already complete)

---

## 📋 Decision Points

Before implementing, clarify:

1. **Particle count per mini-sphere**: 10-30? (Performance vs beauty)
2. **Chat data integration**: V1 or later enhancement?
3. **Motion indicators**: Keep in data mode or remove?
4. **LOD strategy**: Simplify when zoomed out?
5. **Color scheme**: Use VAC mapping or keep category colors?

**Ready to build when decisions are made!** ✨
