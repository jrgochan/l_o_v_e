# Option B: Dynamic Playful

## Engaging Flow - Alive with Movement

---

## 🎭 Essence

> "Dance of transformation, alive with energy."possibility"*

Dynamic Playful mode embodies **energetic exploration** - vibrant, engaging, and alive. Like a flowing river or dancing flames, it shows transformation as an active, dynamic process full of life and possibility.

**Emotional Resonance**: Energy, curiosity, possibility
**Use Case**: Exploration, creativity, demos, energizing sessions
**Feeling**: 😊 Engaging, 🌈 Dynamic, 💃 Alive

---

## 👁️ Visual Characteristics

### Breathing

- **Cycle**: 1.5-2 seconds (faster, more energetic)
- **Amplitude**: 12-18% scale variation (noticeable)
- **Pattern**: Smooth sine with slight overshoot
- **Effect**: Active pulsing, clearly visible

### Undulation

- **Wave**: Pronounced traveling wave along tube
- **Amplitude**: 2-3% position offset (clearly visible)
- **Frequency**: 0.8 Hz (energetic wave)
- **Wave Speed**: 0.5 units/sec (travels along path)
- **Effect**: Flowing motion, ribbon-like movement

### Opacity

- **Range**: 0.5 - 0.9 (wider variation)
- **Cycle**: 2 seconds (faster shimmer)
- **Pattern**: Sine with secondary harmonic
- **Effect**: Noticeable sparkle, alive

### Color

- **Base**: Difficulty color
- **Variation**: Color shifts toward white at peaks
- **Gradient**: Travels along path length
- **Cycle**: 3 seconds
- **Effect**: Flowing color gradient, energy moving

### Particles

- **Count**: 15-20 per path (more visible)
- **Speed**: 0.5 (faster flow)
- **Size**: 0.025 (larger, more visible)
- **Variation**: Speeds vary ±30% (organic)
- **Effect**: River of light flowing through path

---

## 🔧 Technical Implementation

### Approach: Enhanced useFrame with multi-wave composition

```typescript
function DynamicPlayfulPath({ path, isSelected, opacity }: PathProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialY = useRef(0);

  // Store initial position
  useEffect(() => {
    if (meshRef.current) {
      initialY.current = meshRef.current.position.y;
    }
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. Energetic breathing (1.8s cycle)
    const breathe = 1.0 + Math.sin(time * (Math.PI * 2 / 1.8)) * 0.15;
    meshRef.current.scale.set(breathe, 1.0, breathe);

    // 2. Pronounced undulation (traveling wave)
    // Multiple frequencies for organic movement
    const wave1 = Math.sin(time * 0.8 * Math.PI * 2) * 0.015;
    const wave2 = Math.sin(time * 1.2 * Math.PI * 2 + 0.5) * 0.010;
    const wobble = wave1 + wave2;
    meshRef.current.position.y = initialY.current + wobble;

    // 3. Dynamic opacity (2s cycle with harmonics)
    const shimmer1 = Math.sin(time * (Math.PI * 2 / 2.0)) * 0.2;
    const shimmer2 = Math.sin(time * (Math.PI * 2 / 2.0) * 2.0) * 0.05;
    materialRef.current.opacity = (0.7 + shimmer1 + shimmer2) * opacity;

    // 4. Color brightness variation (3s cycle)
    const colorPulse = 1.0 + Math.sin(time * (Math.PI * 2 / 3.0)) * 0.15;
    const brighterColor = pathColor.clone().multiplyScalar(colorPulse);
    materialRef.current.color.copy(brighterColor);
    materialRef.current.emissive.copy(brighterColor);

    // 5. Energetic glow (selected paths pulse faster)
    const glowCycle = isSelected ? 1.5 : 3.0;
    const glow = 1.2 + Math.sin(time * (Math.PI * 2 / glowCycle)) * 0.3;
    materialRef.current.emissiveIntensity = glow * (isSelected ? 2.5 : 1.2);
  });

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={pathColor}
        emissive={pathColor}
        emissiveIntensity={1.2}
        transparent
        opacity={0.7}
        metalness={0.4}
        roughness={0.3}
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
  period: 1.8,        // faster cycle
  amplitude: 0.15,    // 15% variation (noticeable)
  function: 'sine',
  axis: 'radial'
}
```

### Undulation (Multi-wave)

```typescript
UNDULATION: {
  wave1: {
    frequency: 0.8,   // Hz
    amplitude: 0.015, // 1.5% offset
    phase: 0
  },
  wave2: {
    frequency: 1.2,   // Hz (different frequency)
    amplitude: 0.010, // 1.0% offset
    phase: 0.5        // phase offset for complexity
  },
  combined: 'additive' // waves add together
}
```

### Opacity Shimmer (Harmonics)

```typescript
OPACITY: {
  base: 0.7,
  primary: {
    amplitude: 0.2,   // ±20% variation
    period: 2.0
  },
  secondary: {
    amplitude: 0.05,  // subtle harmonic
    period: 1.0       // 2x frequency
  },
  range: [0.5, 0.9]
}
```

### Color Pulse

```typescript
COLOR: {
  brightness_variation: 0.15, // ±15%
  period: 3.0,
  method: 'multiply',  // multiply base color
  selected_boost: 1.3  // extra brightness when selected
}
```

### Particles

```typescript
PARTICLES: {
  count: 18,          // more particles
  speed: {
    base: 0.5,        // faster
    variation: 0.3    // ±30% for organic feel
  },
  size: 0.025,        // larger
  opacity: 0.9,       // more visible
  trail: true         // leave subtle trail
}
```

---

## 🎨 Visual Example

### Unselected Path

```text
Time 0s:  ━━━━━━━━━  (70% opacity, normal)
Time 0.5s: ━━━━━━━━━  (80% opacity, expanding)
Time 1s:  ━━━━━━━━━  (85% opacity, peak)
Time 1.5s: ━━━━━━━━━  (75% opacity, contracting)
Time 2s:  ━━━━━━━━━  (65% opacity, minimum)

Vertical wobble: ↕️↕️ 2-3% (wave motion visible)
Brightness: 💫 Pulsing brighter/darker
Particles: →→→→→ (fast, many, flowing)
Effect: ALIVE, flowing river of light
```

### Selected Path

```text
Same but:
- Glow: 2.5x intensity (very bright)
- Pulse: Faster (1.5s vs 3s)
- Extra brightness boost
- Clearly the focus
```

---

## 🧪 Performance Profile

**GPU Load**: Low-Medium
**CPU Load**: Low
**Frame Impact**: 1-2ms
**Recommended For**: Most devices (not low-end mobile)

**Why It's Still Fast:**

- useFrame animations (no shaders)
- More math but still simple
- No texture operations
- Particle system already optimized

---

## 😊 Energetic Rationale

### Why Choose Dynamic

1. **Engagement**: Movement captures attention
2. **Exploration**: Encourages curiosity
3. **Visibility**: Paths are clearly present
4. **Energy**: Lifts mood, inspires possibility
5. **Demo-Worthy**: Shows off the system beautifully

The dynamic flow creates **active engagement** - users feel invited to explore, the movement suggests life and change is possible.

---

## 🔄 Transition Behavior

### Switching TO Dynamic FROM Subtle

```typescript
// Smoothly accelerate animations over 1.5s
- Breathing: 3.5s → 1.8s (speed up gradually)
- Amplitude: 0.075 → 0.15 (increase gradually)
- Particles: Spawn more, speed up
- Wobble: Increase amplitude smoothly
```

#### Switching TO Dynamic FROM Mystical

```typescript
// Simplify shaders, maintain energy
- Fade out shader effects
- Fade in useFrame animations
- Match energy level (keep it lively)
```

---

**Next**: See `03-MYSTICAL-ETHEREAL.md` for quantum magic
