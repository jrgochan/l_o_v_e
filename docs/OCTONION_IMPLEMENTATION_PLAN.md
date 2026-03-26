# Octonion Support Extension — Implementation Plan (v3)

This plan outlines the complete strategy to upgrade the L.O.V.E. stack from 4D quaternions to 8D octonions, based on the **Hybrid Mapping** (Valence, Arousal, Connection, Depth, Coping, Velocity, Novelty). It incorporates fixes, math corrections, and performance budgets from multiple rounds of deep analysis.

## Design Decisions

### API Strategy
To guarantee 100% backward compatibility for existing client modules, we will introduce **completely parallel API endpoints** (`/oct/calculate` and `/oct/slerp`). Existing `calculate` and `slerp` endpoints will continue using the 4D SciPy quaternion engine completely untouched.

### Geometrical Divergence
The mathematical projection from 3-variables to 4D uses a `1/√3` scale, while the 7-variable to 8D projection uses a `1/√7` scale. Therefore, even if the 4 new dimensions are exactly `0`, an octonion state will reflect a different angular magnitude than its quaternion equivalent. **This is architecturally correct** — adding dimensions alters the shape of the space. The verification tests reflect this reality.

### Fano Multiplication Table Selection
There are 480 valid octonion multiplication tables. In Phase 0, we match our 7 dimensions to a table whose resulting 7 algebraic triples (e.g., `e₁ × e₂ → e₄`) form clinically meaningful narratives, such as *Valence × Arousal → Depth*.

### First-Utterance Velocity
Since Emotional Velocity (Ė) requires a previous state (`V = Δφ/Δt`), the first utterance in a session will explicitly default to `0.0` (stillness). The UI will show dormant particles until the second utterance arrives.

### LLM Prompt Strategy
We are expanding the single listener extraction prompt to include `Depth`, `Coping Potential`, and `Novelty`. To combat LLM unreliability on abstract dimensions, we will anchor the prompt with explicit examples (e.g., `-1.0` = Helpless, `+1.0` = Empowered). Latency tradeoff (~1s) is accepted.

---

## Variable Mapping (The Hybrid)

| Dimension | Octonion Slot | Range | Description |
|-----------|--------------|-------|-------------|
| Scalar (e₀) | `o.e0` | computed | Total emotional intensity (from normalization) |
| Valence (e₁) | `o.e1` | [-1, 1] | Pleasure ↔ Displeasure |
| Arousal (e₂) | `o.e2` | [-1, 1] | Energy ↔ Lethargy |
| Connection (e₃) | `o.e3` | [-1, 1] | Connected ↔ Isolated |
| Depth (e₄) | `o.e4` | [-1, 1] | Profound ↔ Superficial |
| Coping (e₅) | `o.e5` | [-1, 1] | Empowered ↔ Helpless |
| Velocity (e₆) | `o.e6` | [-1, 1] | Rapid change ↔ Stillness (computed) |
| Novelty (e₇) | `o.e7` | [-1, 1] | Novel ↔ Familiar |

---

## Conversion Formula

```python
def vac_extended_to_octonion(v, a, c, d, p, vel, n) -> Octonion:
    """Map 7 emotional dimensions to a unit octonion on S⁷."""
    mag = sqrt(v*v + a*a + c*c + d*d + p*p + vel*vel + n*n)

    if mag < EPSILON:
        return Octonion(1, 0, 0, 0, 0, 0, 0, 0)  # Identity

    angle = π * (mag / sqrt(7))  # √7 is max magnitude when all inputs = ±1
    half = angle / 2
    scalar = cos(half)
    scale = sin(half) / mag

    return Octonion(scalar, v*scale, a*scale, c*scale, d*scale, p*scale, vel*scale, n*scale)
```

---

## Phase 0: Standalone Math Prototype & Clinical Triples

Before altering the existing engine, build a standalone Python script to validate:
- **Goal A:** Geometric S⁷ SLERP preserves unit-norms without associative algebra
- **Goal B:** Octonion dot products yield valid angular distances
- **Goal C:** The 7 selected Fano triples produce clinically sound insights (permute e₁…e₇ assignments until they do)

---

## Phase 1: Frontend UI & Toggles (Settings & Admin)

### [MODIFY] `experience/web/types/visualization.ts` & Stores
- Add `enableOctonionLayer` and `enableFanoPlaneRenders` to the configuration
- Bump the Settings Export version to `"1.1"` with migration logic
- Add accessibility degradation: when `reducedMotion` is true, particle velocities and aura pulsing freeze

### [NEW] `experience/web/components/admin/settings/OctonionControls.tsx`
- Add toggles to activate features in the Admin dashboard
- Provide a "Learn More" explainer panel describing the 4 new dimensions

---

## Phase 2: WebGL Experience ("The Layered Soul")

### [MODIFY] `experience/web/shaders/vertex.glsl` & `fragment.glsl`
- Pass new uniforms: `uDepth` (core luminance), `uCoping` (shield logic), `uVelocity` (orbital variance), `uNovelty` (aura presence)

### [MODIFY] `experience/web/components/spheres/SoulSphere.ts`
- **CRITICAL TRANSPARENCY FIX:** Create concentric shells with explicit rendering instructions:
  - `outerAura.renderOrder = 0` → `coreSphere.renderOrder = 3`
  - All transparent layers: `depthWrite = false`, `depthTest = true`, `side = DoubleSide`
- **PERFORMANCE BUDGET:**
  - Octonion layers add ≤ 2ms frame time at 60fps on mid-range GPU
  - Velocity particle count capped to 200 max
  - Auto-disable octonion layers when `renderQuality === "low"`

---

## Phase 3: The "Dimension Map" (Fano Plane HUD)

### [NEW] `experience/web/components/admin/visualization/FanoOverlay.tsx`
- Floating PiP React **SVG component** (not WebGL) in top-right corner
- Label as "Dimension Map" (progressive UX — not "Fano Plane")
- **Interactivity:**
  - Nodes pulse based on rate of change ("heartbeat")
  - Hovering a line shows algebraic interaction (e.g., *Valence × Arousal → Depth*)
- Include "Octonion Fingerprint" text summary with mini bar charts

---

## Phase 4: Core Math Engine (versor/app)

### [NEW] `versor/app/api/routes/oct_calculate.py` & `oct_slerp.py`
- Parallel endpoints accepting `oct_request` models, outputting 8-component `oct_response`

### [NEW] `versor/app/core/octonion.py`
- Frozen `Octonion` dataclass
- 7D → S⁷ mapping: `angle = π × mag / √7`
- Cayley-Dickson multiplication table chosen in Phase 0

### [NEW] `versor/app/core/octonion_interpolation.py`
- Generic geometric S⁷ SLERP on ℝ⁸ vectors
- **Does NOT modify or replace existing SciPy SLERP for quaternions**

### [MODIFY] `versor/app/core/transitions.py`
- Extend `generate_insight()` with 4 new clinically-reviewed messages:
  - `DEPTH_SHIFT`: "Your feelings are becoming more (or less) deeply held."
  - `COPING_SHIFT`: "Your sense of control over this situation is shifting."
  - `VELOCITY_SHIFT`: "The pace of your emotional change is itself changing."
  - `NOVELTY_SHIFT`: "This feeling is becoming more (or less) familiar to you."

---

## Phase 5: Data Pipeline (observer/app & listener/app)

### [MODIFY] `observer/app` DB Migrations
- Add `octonion_vector` (`VECTOR(8)`) via `pgvector`
- Non-destructive to existing `vac_vector` and `quaternion_vector`

### [MODIFY] `listener/app` Emotion Extraction Prompts
- Anchor extraction with explicit reference bounds for [-1, 1] for `Depth`, `Coping Potential`, `Novelty`

---

## Verification Plan

### Automated Tests
1. **Math Prototype:** Interpolate Joy → Sadness maintaining `‖o‖ == 1.0` continuously
2. **Directional Projection:** Given pure VAC values (new dims = 0), the *direction* of the first 3 imaginary components matches the quaternion imaginary components exactly (ratios preserved, absolute magnitude differs)

### Manual Verification
1. No flickering in layered WebGL mesh under camera rotation
2. Legacy `/calculate` calls still use 4D SciPy path without errors
3. First-utterance velocity defaults to zero without crashing the HUD

---

## WebGL Transparency Reference

```typescript
// Explicit render order: outer layers render FIRST
outerAura.renderOrder = 0;
particleField.renderOrder = 1;
copingShell.renderOrder = 2;
coreSphere.renderOrder = 3;

// All transparent layers must NOT write to depth buffer
[outerAura, particleField, copingShell].forEach(mesh => {
    mesh.material.depthWrite = false;
    mesh.material.depthTest = true;
    mesh.material.transparent = true;
    mesh.material.side = THREE.DoubleSide;
});
```

---

## Accessibility (WCAG 2.1)

When `reducedMotion` is true:
- Orbiting particles → static dots at current position
- Crackling sparks → steady ambient glow
- Shield crack animations → static visual state
- Fano heartbeat pulsing → disabled
