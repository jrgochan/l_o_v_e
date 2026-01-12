# Deep Feeling Mode - UI/UX Design Specification

## Design Principles

1. **Progressive Disclosure**: Show simple view by default, detailed view on demand
2. **Visual Hierarchy**: Primary emotions prominent, secondary/underlying subtle
3. **Contextual Relevance**: Different views for different contexts (chat, analysis, clinical)
4. **Smooth Transitions**: Animations between modes and states
5. **Accessibility First**: Keyboard navigation, screen reader support, color contrast

---

## Toggle Controls

### Location

### ChatPanel Header - Right side control group

### Design Specifications

#### Toggle Component Structure

```text
[Label Left] ●—○ [Label Right]
             ^ slider pill moves left/right
```

### Dimensions

- Width: 140px
- Height: 36px
- Border radius: 18px (full pill)
- Slider diameter: 28px (4px padding)

### Colors (Light Mode)

- Background inactive: `#374151` (gray-700)
- Background active: Gradient based on mode
  - Warm: `#f59e0b` to `#f97316` (amber-orange)
  - Clinical: `#3b82f6` to `#06b6d4` (blue-cyan)
  - Deep Feeling: `#8b5cf6` to `#ec4899` (purple-pink)
- Slider: `#ffffff` with subtle shadow
- Text: `#ffffff` (always white for contrast)

### Animation

- Duration: 200ms
- Easing: ease-in-out
- Slider moves smoothly
- Background color transitions
- Glow effect on active side

### States

- Default: Left side active
- Hover: Slight brightness increase (+10%)
- Focus: 2px cyan outline for keyboard navigation
- Active: Pressed state (-5% brightness)
- Disabled: 50% opacity, no pointer events

### Toggle Set Layout

```text
┌─────────────────────────────────────────────────────┐
│ [💗 Warm] ●—○ [🔬 Clinical]                        │
│ [🤖 AI] ●—○ [🎯 Atlas]                             │
│ [🎯 Single] ○—● [🌊 Deep]                          │
└─────────────────────────────────────────────────────┘
```

**Spacing**: 12px vertical gap between toggles

**Tooltips**:

- Appear on hover after 500ms
- Dark background with white text
- Max width: 200px
- Position: Below toggle, center-aligned

---

## Multi-Emotion Display Contexts

### Context 1: Chat Message Area (Quick View)

**Purpose**: Inline emotion display in conversation flow

**Layout**: Horizontal chip cluster

```text
[😰 Anxiety 85%] [⚡ Excitement 62%] [💔 Grief 71%*]
  ^ Primary        ^ Secondary         ^ Underlying (faded)
```

**Specifications**:

- **Primary Badge**:
  - Font size: 14px (medium)
  - Padding: 6px 12px
  - Bold font weight
  - Full opacity
  - Larger emoji (20px)
  
- **Secondary Badges**:
  - Font size: 12px
  - Padding: 4px 10px
  - Normal font weight
  - Full opacity
  - Medium emoji (16px)
  
- **Underlying Badges**:
  - Font size: 11px
  - Padding: 3px 8px
  - Light font weight
  - 60% opacity
  - Small emoji (14px)
  - Asterisk (*) indicator

**Colors** (based on VAC valence):

- Very negative (<-0.5): `#ef4444` (red-500)
- Negative (-0.5 to -0.1): `#f97316` (orange-500)
- Neutral (-0.1 to 0.1): `#fbbf24` (amber-400)
- Positive (0.1 to 0.5): `#a3e635` (lime-400)
- Very positive (>0.5): `#22c55e` (green-500)

**Responsive Behavior**:

- Flex wrap enabled
- 4px gap between badges
- Max 3 badges per row on small screens

---

### Context 2: Analysis Panel (Detailed View)

**Purpose**: Comprehensive emotion breakdown

**Layout**: Vertical stack with expansion

```text
┌─────────────────────────────────────────────────┐
│ PRIMARY EMOTION                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 😰 ANXIETY                                   │ │
│ │ Confidence: 85%  [████████▒▒]                │ │
│ │ VAC: (-0.4, 0.7, 0.2)                        │ │
│ │ [Mini 3D sphere visualization]                │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ SECONDARY EMOTIONS                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚡ EXCITEMENT                                 │ │
│ │ Confidence: 62%  VAC: (0.6, 0.8, 0.5)        │ │
│ │ ↔️ Contradictory with Anxiety                │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 😢 REGRET                                     │ │
│ │ Confidence: 48%  VAC: (-0.6, -0.2, 0.3)      │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ⊕ UNDERLYING EMOTIONS (2)  [Expandable]         │
│                                                  │
│ 🔗 EMOTION RELATIONSHIPS                         │
│ • Anxiety ⟷ Excitement: CONTRADICTORY           │
│   "Ambivalence about the opportunity"            │
│ • Grief → Regret: AMPLIFYING                     │
│   "Loss intensifying time pressure"              │
│                                                  │
│ 🎯 AGGREGATE STATE                               │
│ Weighted VAC: (-0.15, 0.35, 0.45)               │
│ Complexity: ●●●●○ 78% (High)                    │
│ Pattern: Concurrent with underlying thread       │
└─────────────────────────────────────────────────┘
```

**Card Design**:

- Background: `#1f2937` (gray-800)
- Border: 1px solid with glow (color based on emotion)
- Border radius: 12px
- Padding: 16px
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.3)

**Expandable Sections**:

- Collapsed: Shows count only
- Expanded: Smooth slide-down animation (300ms)
- Chevron icon rotates on state change

**Confidence Bars**:

- Width: 100px
- Height: 8px
- Background: `#374151` (gray-700)
- Fill: Gradient based on confidence level
  - >80%: Green gradient
  - 60-80%: Yellow gradient
  - <60%: Orange gradient
- Rounded corners (4px)

---

### Context 3: Clinical Dashboard

**Purpose**: Technical analysis for clinicians

**Layout**: Three tabs

#### Tab 1: Emotions Table

```text
┌───────────┬────────────┬──────────────┬──────────┬─────────┐
│ Emotion   │ Confidence │ VAC          │ Voice    │ Actions │
├───────────┼────────────┼──────────────┼──────────┼─────────┤
│ Anxiety   │ 85%        │ (-0.4,0.7,+) │ ✓ 92%    │ [View]  │
│ Excitement│ 62%        │ (0.6,0.8,+)  │ ⚠ 45%    │ [View]  │
│ Grief     │ 71%        │ (-0.8,-0.3,+)│ ✓ 88%    │ [View]  │
└───────────┴────────────┴──────────────┴──────────┴─────────┘
```

**Table Styling**:

- Monospace font for numbers
- Alternating row colors
- Hover: Highlight row
- Sortable columns (click header)

**Voice Alignment Indicators**:

- ✓ Green: >75% aligned
- ⚠ Yellow: 50-75% aligned
- ✗ Red: <50% aligned (clinical alert)

#### Tab 2: Voice-Content Analysis

**Three-Column Layout**:

```text
┌─────────────┬──────────────┬──────────────┐
│ Content-Only│ Voice-Only   │ Blended      │
│             │              │              │
│ Text:       │ Prosody:     │ Combined:    │
│ Anxiety     │ Grief        │ Anxiety 70%  │
│ (-0.4,0.7,+)│ (-0.8,-0.3,+)│ Grief 30%    │
│             │              │              │
│ Semantic    │ Pitch: 145Hz │ Adjusted VAC:│
│ features:   │ Energy: 0.35 │ (-0.52,0.41,+)│
│ "nervous"   │ Rate: 2.8/s  │              │
│ "excited"   │              │ 🚨 ALERT:    │
│             │              │ Significant  │
│             │              │ discrepancy  │
└─────────────┴──────────────┴──────────────┘
```

**Alert Box** (when discrepancy detected):

- Background: `#fef3c7` (yellow-100) with red border
- Icon: ⚠️ or 🚨
- Bold text: "Voice-Content Discrepancy Detected"
- Explanation: "Voice suggests deeper sadness than verbalized"
- Action button: "Review Clinical Guidelines"

#### Tab 3: Relationship Graph

**Interactive D3.js Graph**:

- Canvas size: 600x400px
- Dark background: `#111827` (gray-900)
- Grid lines: Subtle `#374151` (gray-700)

**Node Design**:

- Circle diameter: 30-80px (scaled by confidence)
- Fill: Color based on VAC valence
- Border: 3px, thickness based on prominence
  - Primary: Thick (3px), glowing
  - Secondary: Medium (2px)
  - Underlying: Thin (1px), dashed
- Label: Emotion name below node
- Font: 10px, white with dark shadow

**Edge Design**:

- Thickness: 2-6px (scaled by strength)
- Colors:
  - Complementary: `#3b82f6` (blue)
  - Contradictory: `#f97316` (orange)
  - Masking: `#8b5cf6` (purple)
  - Amplifying: `#22c55e` (green)
  - Sequential: `#6b7280` (gray)
- Style:
  - Strong (>0.7): Solid line
  - Moderate (0.4-0.7): Short dashes
  - Weak (<0.4): Long dashes

**Interactions**:

- Hover node: Highlight + tooltip with details
- Hover edge: Highlight + show relationship description
- Click node: Pin position + show detail panel
- Drag node: Reposition (unpins on drop)
- Zoom: Mouse wheel (0.5x to 3x)
- Pan: Click and drag background

---

### Context 4: Emotion Network Graph (Standalone)

**Full-Screen Mode**:

- Accessible via "Expand" button in analysis panel
- Dark overlay: `rgba(0, 0, 0, 0.9)`
- Graph centered: 900x600px
- Close button: Top-right corner

**Legend** (bottom-left):

```text
┌─────────────────────────┐
│ Relationship Types:      │
│ ─── Complementary        │
│ ─── Contradictory        │
│ ─── Masking             │
│ ─── Amplifying          │
│ ─── Sequential          │
│                         │
│ Node Size: Confidence    │
│ Node Color: VAC Valence  │
└─────────────────────────┘
```

**Control Panel** (bottom-right):

```text
┌─────────────────────┐
│ [Reset View]        │
│ [Center Graph]      │
│ [Auto-Layout]       │
│ [Export PNG]        │
└─────────────────────┘
```

---

### Context 5: Aggregate Emotion Sphere (3D)

**Purpose**: Visualize blended emotional state in 3D

**Canvas**:

- Size: 400x400px
- Background: Transparent or dark gradient
- Lighting: Ambient + directional from top-left

**Sphere Specifications**:

- Radius: 150px
- Segments: 64 (smooth surface)
- Position: Mapped to aggregate VAC coordinates
  - X: Valence
  - Y: Arousal
  - Z: Connection

**Color Blending**:

- Use weighted average of emotion colors
- Example: Red (Anxiety) + Yellow (Excitement) = Orange
- Algorithm:

  ```text
  final_color = Σ(emotion_color × confidence) / Σ(confidence)
  ```

**Opacity**:

- Base: 0.8
- Adjusted by complexity:
  - High complexity (>0.7): More transparent (0.6)
  - Low complexity (<0.3): More opaque (0.95)

**Particle Effects**:

- Count: 50-200 particles (based on arousal)
- Size: 2-4px
- Color: Matches sphere but lighter
- Movement:
  - High arousal: Fast swirling (turbulent)
  - Low arousal: Slow floating (calm)
  - Positive valence: Warm colors, upward drift
  - Negative valence: Cool colors, downward drift

**Animation**:

- Rotation: Slow auto-rotate (0.001 rad/frame)
- Transition: Smooth morph when emotions change (1000ms)
- Hover: Pause rotation, show breakdown

**Tooltip** (on hover):

```text
┌─────────────────────────────┐
│ AGGREGATE EMOTIONAL STATE    │
│                              │
│ Primary Contributors:        │
│ • Anxiety 85%               │
│ • Excitement 62%            │
│ • Grief 71%                 │
│                              │
│ Weighted VAC:               │
│ (-0.15, 0.35, 0.45)         │
│                              │
│ Complexity: 78%             │
└─────────────────────────────┘
```

---

### Context 6: Goal Emotion Panel

**Layout**: Two-column responsive

```text
┌─────────────────────┬─────────────────────┐
│ CURRENT STATE       │ GOAL EMOTION        │
│                     │                     │
│ 📍 You are here     │ 🎯 Target           │
│                     │                     │
│ Primary:            │ [Search dropdown]   │
│ Anxiety (85%)       │ ▼ Confidence        │
│                     │                     │
│ Aggregate VAC:      │ Distance: ████▒▒▒   │
│ (-0.15, 0.35, +)    │ 0.73 (Far)          │
│                     │                     │
│ [Mini sphere]       │ [Goal sphere]       │
└─────────────────────┴─────────────────────┘

┌───────────────────────────────────────────────┐
│ 🛤️ PATHS TO CONFIDENCE                        │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ ⚡ DIRECT PATH (Fastest)                  │ │
│ │                                           │ │
│ │ Anxiety → Courage → Confidence            │ │
│ │ ╰─────────╮────────╮                      │ │
│ │           2 steps                          │ │
│ │                                           │ │
│ │ Strategy:                                 │ │
│ │ Challenge negative self-talk directly.    │ │
│ │ Take one small action to build courage.   │ │
│ │                                           │ │
│ │ [Select This Path]                        │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ 🌱 GRADUAL PATH (Gentle)                  │ │
│ │                                           │ │
│ │ Anxiety → Acceptance → Self-Compassion    │ │
│ │   → Self-Trust → Confidence               │ │
│ │ ╰───────╮──────────╮──────────╮────────╮  │ │
│ │         4 steps                            │ │
│ │                                           │ │
│ │ Strategy:                                 │ │
│ │ Build a foundation of self-acceptance     │ │
│ │ before moving toward confidence.          │ │
│ │                                           │ │
│ │ [Select This Path]                        │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ 🔮 ALCHEMICAL PATH (Transformative)       │ │
│ │                                           │ │
│ │ Anxiety → Vulnerability → Authenticity    │ │
│ │   → Confidence                            │ │
│ │ ╰───────╮────────────╮──────────╮         │ │
│ │         3 steps                            │ │
│ │                                           │ │
│ │ Strategy:                                 │ │
│ │ Transform anxiety by leaning into         │ │
│ │ vulnerability and authentic expression.   │ │
│ │                                           │ │
│ │ [Select This Path]                        │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

**Path Card Design**:

- Background: `#1f2937` (gray-800)
- Border: 2px solid, color based on type:
  - Direct: `#3b82f6` (blue)
  - Gradual: `#22c55e` (green)
  - Alchemical: `#8b5cf6` (purple)
- Border radius: 12px
- Padding: 20px
- Hover: Border glows, slight scale (1.02)

**Path Visualization**:

- ASCII art showing progression
- Or simple dot-line-dot diagram
- Steps labeled with emotion names
- Step count prominently displayed

**Search Dropdown**:

- Autocomplete with fuzzy search
- Shows category below emotion name
- Preview VAC coordinates
- Max height: 300px with scroll

---

## Responsive Design

### Breakpoints

- **Mobile** (<640px): Single column, stacked layout
- **Tablet** (640-1024px): Two columns where appropriate
- **Desktop** (>1024px): Full three-column layouts

### Mobile Adaptations

**Toggle Controls**:

- Stack vertically
- Full width (minus padding)
- Larger tap targets (48px height)

**Multi-Emotion Display**:

- Primary only in chat bubbles
- Tap to expand and see all emotions
- Swipeable cards in analysis panel

**Graphs**:

- Simplified view on mobile
- List fallback for relationship graph
- Sphere disabled, static image instead

---

## Accessibility

### Keyboard Navigation

- **Tab**: Move between controls
- **Enter/Space**: Activate toggle or button
- **Arrow keys**: Navigate within graph
- **Escape**: Close modals/expanded views
- **?**: Show keyboard shortcuts

### Screen Reader Support

- ARIA labels on all interactive elements
- ARIA live regions for dynamic updates
- Role assignments (button, toggle, etc.)
- Alt text for visualizations

### Color Contrast

- All text: Minimum 4.5:1 contrast ratio
- Interactive elements: Minimum 3:1
- Focus indicators: High contrast border

---

## Animation Principles

### Timing Functions

- **Ease-in-out**: Toggles, mode switches
- **Ease-out**: Appearing elements
- **Ease-in**: Disappearing elements
- **Spring**: Drag interactions in graphs

### Durations

- **Fast** (100-200ms): Hover effects, focus
- **Medium** (200-400ms): Toggles, transitions
- **Slow** (400-600ms): Panel expansions, graphs
- **Very slow** (1000ms+): Sphere morphing, complex transitions

### Reduced Motion

- Respect `prefers-reduced-motion` media query
- Disable all non-essential animations
- Instant transitions instead of smooth
- Static images instead of particles

---

## Loading States

### Analysis in Progress

```text
┌─────────────────────────────────────┐
│ 🔄 Analyzing emotions...             │
│                                     │
│ [Spinner animation]                 │
│                                     │
│ Deep Feeling analysis takes         │
│ 20-45 seconds for comprehensive     │
│ multi-emotion detection.            │
│                                     │
│ Detected so far:                    │
│ [🔄 Primary emotion...              │
└─────────────────────────────────────┘
```

**Progressive Updates**:

- Show emotions as detected
- Update confidence in real-time
- Stream relationships as calculated

### Skeleton Screens

- Emotion cards: Gray boxes with shimmer
- Graphs: Gray circles and lines
- Text: Gray bars of varying width

---

## Error States

### Analysis Failed

```text
┌─────────────────────────────────────┐
│ ⚠️ Analysis Failed                   │
│                                     │
│ We couldn't detect emotions in      │
│ this message. This can happen if:   │
│                                     │
│ • The message is too short          │
│ • No emotional content detected     │
│ • Service temporarily unavailable   │
│                                     │
│ [Try Again] [Use Simple Mode]      │
└─────────────────────────────────────┘
```

### Fallback Behavior

- Show single emotion if multi-emotion fails
- Disable Deep Feeling toggle if errors persist
- Clear error message to user

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Load**: Complex visualizations only when visible
2. **Throttle**: Graph updates throttled to 60fps max
3. **Debounce**: Search input debounced (300ms)
4. **Virtualization**: Large emotion lists virtualized
5. **Memoization**: Expensive calculations cached

### Bundle Size

- D3.js: ~200KB (tree-shakeable)
- Three.js: Already included
- Total addition: ~250KB (gzipped)
