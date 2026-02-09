# CMD+L Command Palette - Planning Document

**Date:** December 7, 2025
**Feature Name:** Love Command Palette
**Keyboard Shortcut:** CMD+L (Ctrl+L on Windows/Linux)
**Status:** 📋 Planning Phase

---

## Vision 🌌

Create an elegant, keyboard-driven command palette that opens with **CMD+L**, providing instant access to all 87 emotions through beautiful nested navigation. Think of it as a "keyboard labyrinth" for navigating the emotional landscape - powerful, fast, and absolutely gorgeous.

---

## User Requirements

From conversation with user:

1. **Both pages** - Works on Zen page (/) and Admin page (/admin/atlas)
2. **All the actions** - As many as we can think of
3. **Current theme** - Match existing glassmorphism/dark aesthetic
4. **Modifier keys** - All actions available with modifier key combinations

---

## Technical Approach

**Hybrid Implementation:**
- Use `cmdk` library as foundation (battle-tested, accessible)
- Custom styling to match Soul Sphere aesthetic
- Full keyboard navigation with arrow keys
- Fuzzy search built-in

---

## Architecture

### Component Structure

```
experience/web/
├── components/
│   └── CommandPalette/
│       ├── CommandPalette.tsx          # Main component
│       ├── EmotionCommand.tsx          # Individual emotion item
│       ├── CategoryGroup.tsx           # Category grouping
│       └── CommandPaletteStyles.tsx    # Custom styles
├── hooks/
│   └── useCommandPalette.ts            # State management hook
└── types/
    └── command-palette.ts              # TypeScript interfaces
```

### Data Flow

```
┌─────────────────────────────────────────┐
│  CMD+L Press                            │
│  ↓                                      │
│  useCommandPalette hook opens           │
│  ↓                                      │
│  CommandPalette component renders       │
│  ↓                                      │
│  Load all 87 emotions from store        │
│  ↓                                      │
│  Group by 10 categories                 │
│  ↓                                      │
│  User navigates with ↑↓ or searches     │
│  ↓                                      │
│  User selects with Enter + modifiers    │
│  ↓                                      │
│  Action dispatched to appropriate store │
└─────────────────────────────────────────┘
```

---

## UI Design

### Main View
```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search emotions or actions...                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📂 Expansive (14 emotions)                             │
│     ✨ Joy, Peace, Love, Excitement...                  │
│                                                          │
│  📂 Contractive (12 emotions)                           │
│     😰 Fear, Anger, Shame, Anxiety...                   │
│                                                          │
│  📂 Social Connection (8 emotions)                      │
│     🤝 Trust, Empathy, Belonging...                     │
│                                                          │
│  📂 Existential & Identity (10 emotions)                │
│     🎭 Identity, Purpose, Authenticity...               │
│                                                          │
│  ... (6 more categories)                                │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  ↑↓ Navigate  Enter Select  ⌘ Multi  ⌥ Focus  Esc Close│
└─────────────────────────────────────────────────────────┘
```

### Drilled Down View
```
┌─────────────────────────────────────────────────────────┐
│  🔍 Expansive >                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  > ✨ Joy                    [VAC: 0.8, 0.7, 0.6]       │
│    ☮️  Peace                  [VAC: 0.5, -0.3, 0.7]     │
│    💖 Love                    [VAC: 0.9, 0.4, 0.9]      │
│    🎉 Excitement              [VAC: 0.8, 0.9, 0.5]      │
│    🙏 Gratitude               [VAC: 0.7, 0.2, 0.8]      │
│    ✅ Contentment             [VAC: 0.6, -0.2, 0.6]     │
│    😊 Satisfaction            [VAC: 0.65, 0.1, 0.65]    │
│    ... (7 more)                                         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Enter Select  ⌘↵ Add  ⌥↵ Focus  ⇧↵ Navigate  Esc Back │
└─────────────────────────────────────────────────────────┘
```

### Search Results
```
┌─────────────────────────────────────────────────────────┐
│  🔍 joy                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  EMOTIONS (3)                                           │
│  > ✨ Joy                    [Expansive]                │
│    😊 Enjoyment              [Expansive]                │
│    🎊 Joyful                 [Expansive]                │
│                                                          │
│  ACTIONS (2)                                            │
│    Navigate to Joy                                      │
│    Find paths from Joy                                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Enter Select  ⌘↵ Add  ⌥↵ Focus  ⇧↵ Navigate           │
└─────────────────────────────────────────────────────────┘
```

---

## Actions & Modifier Keys

### Base Actions (No Modifier)

**On Categories:**
- **Enter** - Drill down into category

**On Emotions:**
- **Enter** - Select emotion (replaces current selection)

### With Command/Ctrl (⌘/Ctrl)

**On Emotions:**
- **⌘+Enter** - Add to selection (multi-select)
- **⌘+Shift+Enter** - Toggle emotion in selection

### With Option/Alt (⌥)

**On Emotions:**
- **⌥+Enter** - Focus on emotion (camera flies to it, highlights it)
- **⌥+Shift+Enter** - Isolate emotion (hide all others)

### With Shift (⇧)

**On Emotions:**
- **⇧+Enter** - Navigate camera to emotion (smooth fly-to)
- **⇧+⌘+Enter** - Compute paths from this emotion

### Quick Actions (Type to trigger)

When search box is focused, special commands:
- `/clear` - Clear all selections
- `/bridge` - Select bridge emotions
- `/reset` - Reset to neutral
- `/zen` - Toggle zen mode features
- `/settings` - Open settings
- `/help` - Show keyboard shortcuts

---

## Emotion Categories (10 Groups)

1. **Expansive** (14 emotions)
   - Joy, Peace, Love, Excitement, Hope, etc.

2. **Contractive** (12 emotions)
   - Fear, Anger, Shame, Anxiety, etc.

3. **Social Connection** (8 emotions)
   - Trust, Empathy, Belonging, etc.

4. **Existential & Identity** (10 emotions)
   - Purpose, Identity, Authenticity, etc.

5. **Motivational & Achievement** (9 emotions)
   - Pride, Ambition, Determination, etc.

6. **Vulnerability & Authenticity** (8 emotions)
   - Vulnerability, Openness, Acceptance, etc.

7. **Cognitive & Awareness** (7 emotions)
   - Curiosity, Awe, Confusion, etc.

8. **Transitional & Liminal** (6 emotions)
   - Boredom, Nostalgia, Anticipation, etc.

9. **Shadow & Complexity** (7 emotions)
   - Envy, Jealousy, Resentment, etc.

10. **Meta-Emotional** (6 emotions)
    - Emotional Awareness, Regulation, etc.

---

## Advanced Features

### Context-Aware Suggestions

Show relevant emotions based on:
- Current selected emotion
- Recent selections
- Frequently used emotions
- Emotional "neighbors" in VAC space

### Recent & Favorites

```
┌─────────────────────────────────────────┐
│  🔍 Search...                           │
├─────────────────────────────────────────┤
│                                          │
│  ⭐ FAVORITES                           │
│     Joy, Peace, Love                    │
│                                          │
│  🕐 RECENT                              │
│     Anxiety → Calm (5m ago)             │
│     Curiosity (12m ago)                 │
│                                          │
│  📂 ALL CATEGORIES                      │
│     Expansive, Contractive...           │
│                                          │
└─────────────────────────────────────────┘
```

### Path Actions

When 2+ emotions selected:
- **Compute paths between** - Calculate transition paths
- **Compare paths** - See multiple routes side-by-side
- **Start journey** - Begin guided transition

### View Actions

- **Toggle axis labels** (A)
- **Toggle zen indicator** (I)
- **Toggle data viz mode** (D)
- **Cycle animation modes** (M)
- **Focus mode** (F)

---

## Implementation Phases

### Phase 1: Foundation (2-3 hours)
- [ ] Install and configure cmdk
- [ ] Create CommandPalette component
- [ ] Implement CMD+L keyboard shortcut
- [ ] Basic emotion list with categories
- [ ] Simple selection action

### Phase 2: Navigation (2 hours)
- [ ] Category drill-down
- [ ] Fuzzy search implementation
- [ ] Arrow key navigation
- [ ] VAC coordinate display

### Phase 3: Actions (2-3 hours)
- [ ] Modifier key actions (⌘, ⌥, ⇧)
- [ ] Multi-select with ⌘+Enter
- [ ] Focus mode with ⌥+Enter
- [ ] Camera navigation with ⇧+Enter

### Phase 4: Polish (2 hours)
- [ ] Beautiful styling (glassmorphism)
- [ ] Smooth animations
- [ ] Loading states
- [ ] Error handling

### Phase 5: Advanced (2-3 hours)
- [ ] Recent emotions
- [ ] Favorites system
- [ ] Quick actions (/commands)
- [ ] Context-aware suggestions
- [ ] Path computation actions

**Total Estimated Time:** 10-13 hours

---

## Technical Details

### Dependencies

```json
{
  "dependencies": {
    "cmdk": "^0.2.0"
  }
}
```

### Hook API

```typescript
interface UseCommandPaletteOptions {
  onSelect?: (emotion: Emotion) => void;
  onMultiSelect?: (emotions: Emotion[]) => void;
  onFocus?: (emotion: Emotion) => void;
  onNavigate?: (emotion: Emotion) => void;
}

function useCommandPalette(options?: UseCommandPaletteOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState<'home' | 'category' | 'emotion'>('home');

  // ... implementation

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
    // ... other methods
  };
}
```

### Component API

```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  emotions: Emotion[];
  categories: EmotionCategory[];
  onSelect: (emotion: Emotion, modifiers: KeyModifiers) => void;
}

interface KeyModifiers {
  command: boolean;  // ⌘ on Mac, Ctrl on Windows
  option: boolean;   // ⌥ on Mac, Alt on Windows
  shift: boolean;    // ⇧
}
```

---

## Styling

### Theme Integration

```typescript
const commandPaletteTheme = {
  overlay: 'bg-black/50 backdrop-blur-sm',
  container: 'bg-gray-900/95 backdrop-blur-md border border-gray-700',
  input: 'bg-gray-800/50 text-white placeholder-gray-400',
  list: 'bg-gray-900/90',
  item: 'hover:bg-cyan-500/20 hover:text-cyan-300',
  itemSelected: 'bg-cyan-500/30 text-cyan-200',
  category: 'text-gray-400 uppercase text-xs font-semibold',
  separator: 'border-gray-700',
  kbd: 'bg-gray-700 text-gray-300 rounded px-2 py-1 text-xs',
};
```

### Animations

```typescript
const commandPaletteAnimations = {
  enter: 'animate-in fade-in-0 zoom-in-95 slide-in-from-top-4',
  exit: 'animate-out fade-out-0 zoom-out-95 slide-out-to-top-4',
  item: 'transition-colors duration-150',
};
```

---

## Testing Strategy

### Manual Testing
1. Open command palette with CMD+L
2. Test arrow key navigation
3. Test search with fuzzy matching
4. Test each modifier key combination
5. Test on both Zen and Admin pages
6. Test category drill-down
7. Test quick actions (/commands)

### Keyboard Testing
- [ ] CMD+L opens palette
- [ ] ESC closes palette
- [ ] ↑↓ navigates items
- [ ] Enter selects
- [ ] ⌘+Enter multi-selects
- [ ] ⌥+Enter focuses
- [ ] ⇧+Enter navigates camera
- [ ] Type-to-search works

---

## Future Enhancements

### Phase 6: AI Integration
- Natural language: "Show me emotions related to sadness"
- Smart suggestions: "Based on your patterns, try..."
- Emotional journey recommendations

### Phase 7: Customization
- Custom keyboard shortcuts
- Favorite emotions
- Personal categories
- Command aliases

### Phase 8: Collaboration
- Share command history
- Team favorites
- Collaborative emotion exploration

---

## Notes & Considerations

### Accessibility
- Full keyboard navigation (no mouse required)
- Screen reader support (ARIA labels)
- High contrast mode support
- Configurable font sizes

### Performance
- Lazy load emotion data
- Virtualized list for 87 emotions
- Debounced search
- Memoized filtered results

### Browser Compatibility
- Works in Chrome, Firefox, Safari, Edge
- Fallback for older browsers
- Mobile touch support (future)

---

## Success Metrics

✅ Opens in <50ms
✅ Search results in <100ms
✅ Smooth 60fps animations
✅ Zero accessibility issues
✅ Works on both Zen and Admin pages
✅ All modifier key combinations work
✅ Discoverable (help text visible)
✅ Beautiful (matches Soul Sphere aesthetic)

---

## Questions to Resolve

1. Should favorites persist to localStorage?
2. Should recent history be saved?
3. Maximum number of multi-selected emotions?
4. Custom keyboard shortcut configuration?
5. Mobile/touch support priority?

---

**This will be AMAZING! 🌟**

The command palette will transform how users interact with emotions - making it fast, elegant, and powerful. The keyboard-first approach is perfect for power users, while the beautiful UI keeps it accessible for everyone.

---

**Status:** Ready for implementation when you toggle to Act mode!
**Next Step:** Install cmdk and start with Phase 1
