# Option A: Subtle Elegant

## Therapeutic Calm - Gentle Breathing Lines & Soft Flow

---

## 🎭 Essence

> "Whispers of change, gentle invitations."

Subtle Elegant mode embodies **therapeutic presence** - calm, grounded, and supportive. Like a gentle breath or the slow rhythm of ocean waves, it suggests transformation without demanding attention.

**Emotional Resonance**: Safety, patience, groundedness  
**Use Case**: Clinical work, focused exploration, default experience  
**Feeling**: 😌 Peaceful, 🌊 Flowing, 🕊️ Gentle

---

## 👁️ Visual Characteristics

### Breathing

- **Cycle**: 3-4 seconds (aligned with natural breath)
- **Amplitude**: 5-10% scale variation
- **Pattern**: Smooth sine wave, no sharp transitions
- **Effect**: Tube gently expands and contracts like breathing

### Undulation

- **Wave**: Subtle sine wave along tube length
- **Amplitude**: 0.5-1% position offset (barely visible)
- **Frequency**: 0.3 Hz (slow, organic)
- **Effect**: Gentle rippling, like fabric in breeze

### Opacity

- **Range**: 0.6 - 0.75 (never fully solid)
- **Cycle**: 4 seconds
- **Pattern**: Smooth fade in/out
- **Effect**: Soft shimmer, ethereal presence

### Color

- **Base**: Difficulty color (unchanged)
- **Variation**: ±5% brightness
- **Cycle**: 5 seconds (slow)
- **Effect**: Subtle glow pulse

### Particles

- **Count**: 8-10 per path
- **Speed**: 0.2 (slow, meditative)
- **Size**: 0.02 (small, unobtrusive)
- **Effect**: Gentle flow showing direction

---

## 🔧 Technical Implementation

### Approach: Simple useFrame animations

**Advantages:**

- Excellent performance
- Easy to understand
- Predictable behavior
- No shader compilation

```typescript
function SubtleElegantPath({ path, isSelected, opacity }: PathProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // 1. Gentle breathing (3.5s cycle)
    const breathe = 1.0 + Math.sin(time * (Math.PI * 2 / 3.5)) * 0.075;
    meshRef.current.scale.set(breathe, 1.0, breathe);
    
    // 2. Soft undulation (subtle vertical movement)
    const wobble = Math.sin(time * 0.3) * 0.005;
    meshRef.current.position.y = wobble;
    
    // 3. Opacity shimmer (4s cycle)
    const shimmer = 0.675 + Math.sin(time * (Math.PI * 2 / 4.0)) * 0.075;
    materialRef.current.opacity = shimmer * opacity;
    
    // 4. Subtle glow pulse (5s cycle)
    const glow = 1.0 + Math.sin(time * (Math.PI * 2 / 5.0)) * 0.05;
    materialRef.current.emissiveIntensity = glow * (isSelected ? 2.0 : 1.0);
  });
  
  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={pathColor}
        emissive={pathColor}
        emissiveIntensity={isSelected ? 2.0 : 1.0}
        transparent
        opacity={0.7}
        metalness={0.2}
        roughness={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
```

---

## 📐 Parameters

### Breathing

```typescript
BREATHING: {
  period: 3.5,        // seconds per cycle
  amplitude: 0.075,   // 7.5% scale variation
  function: 'sine',   // smooth, organic
  axis: 'radial'      // expand/contract, not stretch
}
```

### **Undulation**

```typescript
UNDULATION: {
  frequency: 0.3,     // Hz (slow wave)
  amplitude: 0.005,   // 0.5% position offset
  axis: 'y',          // vertical movement
  phase: 0            // no phase offset between paths
}
```

### Opacity Shimmer

```typescript
OPACITY: {
  base: 0.675,        // center point
  amplitude: 0.075,   // ±7.5% variation
  period: 4.0,        // seconds
  min: 0.6,           // never too faint
  max: 0.75           // never fully solid
}
```

### Glow Pulse

```typescript
GLOW: {
  base: 1.0,          // normal intensity
  amplitude: 0.05,    // ±5% variation
  period: 5.0,        // seconds (slow)
  selected: 2.0       // 2x for selected path
}
```

### Particles

```typescript
PARTICLES: {
  count: 10,          // particles per path
  speed: 0.2,         // slow, meditative
  size: 0.02,         // small, subtle
  opacity: 0.8        // visible but not dominant
}
```

---

## 🎨 Visual Example

### Unselected Path

```text
Time 0s:  ━━━━━━━━━  (70% opacity, normal thickness)
Time 1s:  ━━━━━━━━━  (72% opacity, slight expand)
Time 2s:  ━━━━━━━━━  (75% opacity, peak expand)
Time 3s:  ━━━━━━━━━  (72% opacity, contracting)
Time 4s:  ━━━━━━━━━  (70% opacity, back to normal)

Vertical wobble: ↕️ 0.5% (barely noticeable)
Glow: 💫 Subtle pulse
Particles: → → → (slow, steady flow)
```

### Selected Path (via keyboard)

```text
Same animations but:
- Glow: 2x intensity (stands out clearly)
- No other changes (keeps consistency)
```

---

## 🧪 Performance Profile

**GPU Load**: Very Low  
**CPU Load**: Minimal  
**Frame Impact**: <1ms  
**Recommended For**: All devices

**Why It's Fast:**

- No shader compilation
- Simple math (sine functions)
- No texture lookups
- Minimal state updates

---

## 💜 Therapeutic Rationale

### Secondary Threads is Default

1. **Minimal Distraction**: Supports focus on content
2. **Calming Effect**: Slow rhythms reduce anxiety
3. **Professional**: Appropriate for clinical settings
4. **Accessible**: Works for all users, all contexts
5. **Grounding**: Breath-like rhythm is inherently regulating

The gentle breathing creates **passive regulation** - users unconsciously sync with the visual rhythm, supporting emotional stability during exploration.

---

## 🔄 Transition In/Out

### When Switching TO Subtle

- Fade in over 1 second
- Slow down any fast animations
- Reduce amplitude gradually

### When Switching FROM Subtle

- Maintain smooth continuity
- Gradually increase parameters
- No jarring jumps

---

**Next**: See `02-DYNAMIC-PLAYFUL.md` for energetic option
