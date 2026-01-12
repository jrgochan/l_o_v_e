# Settings Page Architecture

## Unified Settings Management for L.O.V.E. Experience

**Date**: December 7, 2025  
**Purpose**: Centralize all user preferences and configuration  
**Status**: Planning Phase

---

## 🎯 Vision

Create a comprehensive Settings page that unifies all scattered settings into a single, intuitive interface with proper persistence and network sync capabilities.

---

## 📍 Current State: Settings are Scattered

### **Current Locations:**

1. **ControlPanel** (Left Sidebar)
   - Path Animation Mode (Subtle/Dynamic/Mystical)
   - Auto-compute Paths
   - Enable Animations
   - Category Filters
   - Layer Toggles

2. **ChatPanel** (Bottom Panel)
   - Tone Mode (Warm/Clinical)
   - Atlas Mapping toggle
   - Deep Feeling Mode

3. **Keyboard-Only**
   - Motion Indicators (O key)
   - Focus Mode (F key)
   - Various layer toggles

4. **Hard-Coded Defaults**
   - Path opacity: 0.6
   - Emotion size: 1.0
   - Color scheme: 'category'

### **Problems:**

- ⚠️ No central place to see all settings
- ⚠️ No persistence (resets on page refresh)
- ⚠️ No way to reset to defaults
- ⚠️ No export/import for sharing configs
- ⚠️ No network mode toggle
- ⚠️ Hard to discover all available options

---

## 🏗️ Proposed Architecture

### **Settings Store (Unified)**

**File**: `/experience/web/stores/useSettingsStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // === VISUAL SETTINGS ===
  pathAnimationMode: 'subtle' | 'dynamic' | 'mystical';
  emotionDisplayMode: 'simple' | 'data'; // Future
  showMotionIndicators: boolean;
  colorScheme: 'category' | 'valence' | 'arousal' | 'connection';
  pathOpacity: number; // 0-1
  emotionSize: number; // 0.5-2.0
  enableAnimations: boolean;
  
  // === BEHAVIOR SETTINGS ===
  autoComputePaths: boolean;
  showAllPaths: boolean;
  focusMode: boolean;
  
  // === LAYER VISIBILITY ===
  layers: {
    soulSphere: boolean;
    emotionPoints: boolean;
    emotionLabels: boolean;
    transitionPaths: boolean;
    waypoints: boolean;
    bridgeHighlight: boolean;
    legend: boolean;
  };
  
  // === NETWORK SETTINGS ===
  networkMode: 'local' | 'network';
  apiEndpoints: {
    observer: string;
    listener: string;
    versor: string;
  };
  customEndpoints: boolean; // Use custom vs default
  
  // === CHAT PREFERENCES ===
  defaultToneMode: 'warm' | 'clinical';
  defaultDeepFeeling: boolean;
  autoFocusEmotions: boolean; // Auto-add detected emotions to sphere
  
  // === KEYBOARD SHORTCUTS ===
  enableKeyboardShortcuts: boolean;
  customKeyBindings: Record<string, string>; // Future
  
  // === ACCESSIBILITY ===
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  
  // === ACTIONS ===
  updateVisualSetting: (key: string, value: any) => void;
  updateBehaviorSetting: (key: string, value: any) => void;
  updateNetworkSetting: (key: string, value: any) => void;
  updateChatSetting: (key: string, value: any) => void;
  updateLayer: (layer: string, value: boolean) => void;
  
  resetToDefaults: () => void;
  exportSettings: () => string; // JSON string
  importSettings: (json: string) => void;
  
  // === NETWORK UTILITIES ===
  testConnection: () => Promise<ConnectionStatus>;
  switchNetworkMode: (mode: 'local' | 'network') => void;
}

interface ConnectionStatus {
  observer: { connected: boolean; latency?: number; error?: string };
  listener: { connected: boolean; latency?: number; error?: string };
  versor: { connected: boolean; latency?: number; error?: string };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default values
      pathAnimationMode: 'subtle',
      emotionDisplayMode: 'simple',
      showMotionIndicators: true,
      colorScheme: 'category',
      pathOpacity: 0.6,
      emotionSize: 1.0,
      enableAnimations: true,
      
      autoComputePaths: true,
      showAllPaths: true,
      focusMode: false,
      
      layers: {
        soulSphere: true,
        emotionPoints: true,
        emotionLabels: true,
        transitionPaths: true,
        waypoints: true,
        bridgeHighlight: true,
        legend: true
      },
      
      networkMode: 'local',
      apiEndpoints: {
        observer: 'http://localhost:8000',
        listener: 'http://localhost:8002',
        versor: 'http://localhost:8001'
      },
      customEndpoints: false,
      
      defaultToneMode: 'warm',
      defaultDeepFeeling: false,
      autoFocusEmotions: true,
      
      enableKeyboardShortcuts: true,
      customKeyBindings: {},
      
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      
      // Actions implementation...
      updateVisualSetting: (key, value) => {
        set({ [key]: value });
      },
      
      // ... etc
      
      resetToDefaults: () => {
        // Reset to defaults above
      },
      
      exportSettings: () => {
        const state = get();
        return JSON.stringify(state, null, 2);
      },
      
      importSettings: (json) => {
        try {
          const imported = JSON.parse(json);
          set(imported);
        } catch (e) {
          console.error('Invalid settings JSON:', e);
        }
      },
      
      testConnection: async () => {
        const { apiEndpoints } = get();
        const results: ConnectionStatus = {
          observer: { connected: false },
          listener: { connected: false },
          versor: { connected: false }
        };
        
        // Test each endpoint
        for (const [service, url] of Object.entries(apiEndpoints)) {
          try {
            const start = Date.now();
            const response = await fetch(`${url}/health`);
            const latency = Date.now() - start;
            
            if (response.ok) {
              results[service] = { connected: true, latency };
            } else {
              results[service] = { 
                connected: false, 
                error: `HTTP ${response.status}` 
              };
            }
          } catch (error) {
            results[service] = { 
              connected: false, 
              error: error.message 
            };
          }
        }
        
        return results;
      },
      
      switchNetworkMode: (mode) => {
        set({ networkMode: mode });
        
        // Update API endpoints based on mode
        if (mode === 'local') {
          set({
            apiEndpoints: {
              observer: 'http://localhost:8000',
              listener: 'http://localhost:8002',
              versor: 'http://localhost:8001'
            }
          });
        } else {
          // Network mode - use environment variables or defaults
          set({
            apiEndpoints: {
              observer: process.env.NEXT_PUBLIC_OBSERVER_URL || 'https://api.love.platform/observer',
              listener: process.env.NEXT_PUBLIC_LISTENER_URL || 'https://api.love.platform/listener',
              versor: process.env.NEXT_PUBLIC_VERSOR_URL || 'https://api.love.platform/versor'
            }
          });
        }
      }
    }),
    {
      name: 'love-settings', // localStorage key
      partialize: (state) => ({
        // Only persist these fields (not derived state)
        pathAnimationMode: state.pathAnimationMode,
        emotionDisplayMode: state.emotionDisplayMode,
        showMotionIndicators: state.showMotionIndicators,
        colorScheme: state.colorScheme,
        pathOpacity: state.pathOpacity,
        emotionSize: state.emotionSize,
        enableAnimations: state.enableAnimations,
        autoComputePaths: state.autoComputePaths,
        showAllPaths: state.showAllPaths,
        focusMode: state.focusMode,
        layers: state.layers,
        networkMode: state.networkMode,
        customEndpoints: state.customEndpoints,
        apiEndpoints: state.customEndpoints ? state.apiEndpoints : undefined,
        defaultToneMode: state.defaultToneMode,
        defaultDeepFeeling: state.defaultDeepFeeling,
        autoFocusEmotions: state.autoFocusEmotions,
        enableKeyboardShortcuts: state.enableKeyboardShortcuts,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
        fontSize: state.fontSize
      })
    }
  )
);
```

---

## 🎨 Settings Page UI Design

### **Route**: `/admin/settings`

**Layout**:

```text
┌────────────────────────────────────────────────────┐
│  Settings                                    [Save] │
├────────────────────────────────────────────────────┤
│                                                     │
│  [Visual] [Behavior] [Network] [Chat] [Access]     │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Selected Tab Content                         │ │
│  │                                               │ │
│  │  (Visual Settings shown by default)           │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Reset to Defaults]  [Export]  [Import]           │
└────────────────────────────────────────────────────┘
```

### **Tab 1: Visual Settings**

```typescript
<VisualSettings>
  <h2>Path Animation Mode</h2>
  <RadioGroup value={pathAnimationMode} onChange={...}>
    <Radio value="subtle">
      <div>
        <span>😌 Subtle Elegant</span>
        <small>Therapeutic calm, gentle breathing</small>
      </div>
    </Radio>
    <Radio value="dynamic">
      <div>
        <span>😊 Dynamic Playful</span>
        <small>Engaging flow, alive with movement</small>
      </div>
    </Radio>
    <Radio value="mystical">
      <div>
        <span>🔮 Mystical Ethereal</span>
        <small>Quantum dreams, flowing colors</small>
      </div>
    </Radio>
  </RadioGroup>
  
  <h2>Color Scheme</h2>
  <RadioGroup value={colorScheme}>
    <Radio value="category">By Category (13 colors)</Radio>
    <Radio value="valence">By Valence (Green to Red)</Radio>
    <Radio value="arousal">By Arousal (Blue to Red)</Radio>
    <Radio value="connection">By Connection (Purple to Yellow)</Radio>
  </RadioGroup>
  
  <h2>Visual Options</h2>
  <Toggle label="Show Motion Indicators" checked={showMotionIndicators} />
  <Toggle label="Enable Animations" checked={enableAnimations} />
  
  <h2>Display Sizes</h2>
  <Slider label="Path Opacity" value={pathOpacity} min={0} max={1} step={0.1} />
  <Slider label="Emotion Size" value={emotionSize} min={0.5} max={2.0} step={0.1} />
</VisualSettings>
```

### **Tab 2: Behavior Settings**

```typescript
<BehaviorSettings>
  <h2>Path Computation</h2>
  <Toggle 
    label="Auto-Compute Paths" 
    checked={autoComputePaths}
    description="Automatically compute paths when emotions are selected"
  />
  <Toggle 
    label="Show All Paths" 
    checked={showAllPaths}
    description="Show all paths vs only selected emotion pairs"
  />
  
  <h2>Focus & Visibility</h2>
  <Toggle 
    label="Focus Mode" 
    checked={focusMode}
    description="Hide unselected emotions for clarity"
  />
  
  <h2>Layer Visibility</h2>
  <div className="grid grid-cols-2 gap-2">
    <Toggle label="Soul Sphere" checked={layers.soulSphere} />
    <Toggle label="Emotion Points" checked={layers.emotionPoints} />
    <Toggle label="Labels" checked={layers.emotionLabels} />
    <Toggle label="Paths" checked={layers.transitionPaths} />
    <Toggle label="Waypoints" checked={layers.waypoints} />
    <Toggle label="Bridge Highlight" checked={layers.bridgeHighlight} />
    <Toggle label="Legend" checked={layers.legend} />
  </div>
</BehaviorSettings>
```

### **Tab 3: Network Settings**

```typescript
<NetworkSettings>
  <h2>Connection Mode</h2>
  <Toggle
    checked={networkMode === 'network'}
    onChange={(checked) => switchNetworkMode(checked ? 'network' : 'local')}
    leftLabel="🏠 Local"
    rightLabel="🌐 Network"
  />
  
  {networkMode === 'local' && (
    <InfoBox variant="success">
      ✅ All data stays on your device<br/>
      ✅ HIPAA compliant<br/>
      ✅ Offline capable<br/>
      ✅ Maximum privacy
    </InfoBox>
  )}
  
  {networkMode === 'network' && (
    <>
      <InfoBox variant="warning">
        ⚠️ Data will be sent to cloud servers<br/>
        ⚠️ Internet connection required<br/>
        ✅ Enables collaboration and sync
      </InfoBox>
      
      <h3>API Endpoints</h3>
      <Toggle 
        label="Use Custom Endpoints" 
        checked={customEndpoints}
        description="Override default network endpoints"
      />
      
      {customEndpoints && (
        <div className="space-y-2">
          <Input 
            label="Observer URL" 
            value={apiEndpoints.observer}
            onChange={(value) => updateEndpoint('observer', value)}
          />
          <Input 
            label="Listener URL" 
            value={apiEndpoints.listener}
            onChange={(value) => updateEndpoint('listener', value)}
          />
          <Input 
            label="Versor URL" 
            value={apiEndpoints.versor}
            onChange={(value) => updateEndpoint('versor', value)}
          />
        </div>
      )}
      
      <h3>Connection Status</h3>
      <ConnectionTestPanel />
      <Button onClick={testConnection} variant="outline">
        Test Connection
      </Button>
    </>
  )}
</NetworkSettings>
```

### **Tab 4: Chat Preferences**

```typescript
<ChatSettings>
  <h2>Default Modes</h2>
  <Toggle
    checked={defaultToneMode === 'clinical'}
    onChange={(checked) => set({ defaultToneMode: checked ? 'clinical' : 'warm' })}
    leftLabel="💗 Warm"
    rightLabel="🔬 Clinical"
    description="Default response style for new chat sessions"
  />
  
  <Toggle
    label="Deep Feeling Mode by Default"
    checked={defaultDeepFeeling}
    description="Analyze multiple emotions and relationships (slower but richer)"
  />
  
  <h2>Behavior</h2>
  <Toggle
    label="Auto-Focus Emotions in Sphere"
    checked={autoFocusEmotions}
    description="Automatically add detected emotions to Soul Sphere"
  />
  
  <h2>Keyboard Shortcuts</h2>
  <Toggle
    label="Enable Keyboard Shortcuts"
    checked={enableKeyboardShortcuts}
    description="Use keyboard for navigation and control"
  />
  
  <Button onClick={showShortcutsHelp} variant="outline">
    View All Shortcuts
  </Button>
</ChatSettings>
```

### **Tab 5: Accessibility**

```typescript
<AccessibilitySettings>
  <h2>Motion</h2>
  <Toggle
    label="Reduce Motion"
    checked={reducedMotion}
    description="Minimize animations for motion sensitivity"
  />
  
  <h2>Visual</h2>
  <Toggle
    label="High Contrast"
    checked={highContrast}
    description="Increase contrast for better visibility"
  />
  
  <RadioGroup label="Font Size" value={fontSize}>
    <Radio value="small">Small</Radio>
    <Radio value="medium">Medium (Default)</Radio>
    <Radio value="large">Large</Radio>
  </RadioGroup>
  
  <h2>Screen Reader</h2>
  <p>Additional ARIA labels and semantic HTML throughout the application.</p>
</AccessibilitySettings>
```

---

## 💾 Persistence Strategy

### **Phase 1: localStorage (Immediate)**

```typescript
// Zustand persist middleware
persist(
  (set, get) => ({ ... }),
  {
    name: 'love-settings',
    storage: createJSONStorage(() => localStorage)
  }
)
```

**Pros:**

- Simple, works immediately
- No backend needed
- Fast access

**Cons:**

- Device-specific (no cross-device sync)
- Limited to ~10MB
- Lost on cache clear

### **Phase 2: Backend Persistence (Future)**

**New Observer Endpoint**: `POST /observer/user-preferences`

```python
# observer/app/api/routes/preferences.py
@router.post("/user-preferences")
async def save_preferences(
    user_id: str,
    preferences: dict,
    db: Session = Depends(get_db)
):
    # Save to database
    # Return confirmation
    pass

@router.get("/user-preferences/{user_id}")
async def get_preferences(
    user_id: str,
    db: Session = Depends(get_db)
):
    # Fetch from database
    # Return preferences
    pass
```

**Benefits:**

- Cross-device sync
- Backup/restore
- Clinician can set defaults for clients
- Research: aggregate preference patterns

### **Phase 3: Hybrid (Best of Both)**

```typescript
// Load order:
1. Load from localStorage (immediate)
2. If network mode: Fetch from backend (async)
3. Merge (backend overwrites if newer)
4. Save changes to both (localStorage + backend)
```

---

## 🔄 Migration Strategy

### **Consolidate Existing Stores**

**Current**: Multiple stores

- `useAtlasAdminStore` (atlas-specific settings)
- State in `ChatPanel` (chat settings)
- Scattered state in components

**Migration**:

```typescript
// 1. Create new unified store
// 2. Migrate settings one by one
// 3. Keep old stores for backward compatibility
// 4. Gradually remove old stores

// During transition:
export const useSettingsStore = create((set) => ({
  // New unified settings
  ...
  
  // Temporary: sync with old store
  _syncWithAtlasStore: () => {
    const atlasSettings = useAtlasAdminStore.getState().settings;
    set({
      pathAnimationMode: atlasSettings.pathAnimationMode,
      // ...etc
    });
  }
}));
```

---

## 🎨 UI Component Hierarchy

```text
/admin/settings (page.tsx)
├── SettingsTabs
│   ├── Tab: Visual
│   │   └── VisualSettings.tsx
│   │       ├── AnimationModeSelector
│   │       ├── ColorSchemeSelector
│   │       ├── VisualToggles
│   │       └── SizeSliders
│   │
│   ├── Tab: Behavior
│   │   └── BehaviorSettings.tsx
│   │       ├── PathComputationSettings
│   │       ├── FocusModeSettings
│   │       └── LayerVisibility
│   │
│   ├── Tab: Network
│   │   └── NetworkSettings.tsx
│   │       ├── NetworkModeToggle
│   │       ├── EndpointConfiguration
│   │       ├── ConnectionTester
│   │       └── ConnectionStatus
│   │
│   ├── Tab: Chat
│   │   └── ChatSettings.tsx
│   │       ├── ToneModeSelector
│   │       ├── DeepFeelingToggle
│   │       ├── BehaviorToggles
│   │       └── ShortcutsHelp
│   │
│   └── Tab: Accessibility
│       └── AccessibilitySettings.tsx
│           ├── MotionSettings
│           ├── VisualSettings
│           └── ScreenReaderInfo
│
└── SettingsActions
    ├── SaveButton (auto-saves with localStorage)
    ├── ResetButton (confirm dialog)
    ├── ExportButton (downloads JSON)
    └── ImportButton (file picker)
```

---

## 🚀 Implementation Roadmap

### **Phase 1: Foundation** (2-3 hours)

- [ ] Create `useSettingsStore.ts` with persist middleware
- [ ] Create `/admin/settings/page.tsx` route
- [ ] Create tab navigation component
- [ ] Add basic styling (Tailwind)

### **Phase 2: Settings Sections** (4-5 hours)

- [ ] Implement VisualSettings.tsx
- [ ] Implement BehaviorSettings.tsx
- [ ] Implement NetworkSettings.tsx
- [ ] Implement ChatSettings.tsx
- [ ] Implement AccessibilitySettings.tsx

### **Phase 3: Actions** (2-3 hours)

- [ ] Implement reset to defaults
- [ ] Implement export settings (download JSON)
- [ ] Implement import settings (file upload)
- [ ] Add confirmation dialogs
- [ ] Add success/error toasts

### **Phase 4: Connection Testing** (2-3 hours)

- [ ] Implement `testConnection()` function
- [ ] Create ConnectionStatus component
- [ ] Add latency display
- [ ] Add error messages
- [ ] Add retry logic

### **Phase 5: Migration** (3-4 hours)

- [ ] Update all components to use new store
- [ ] Remove settings from ControlPanel (or make it read-only)
- [ ] Update ChatPanel to use defaults from settings
- [ ] Test all functionality still works
- [ ] Remove old scattered settings

### **Phase 6: Backend Integration** (Future - 4-6 hours)

- [ ] Create Observer `/user-preferences` endpoints
- [ ] Add user authentication/identification
- [ ] Implement backend sync
- [ ] Handle conflicts (local vs server)
- [ ] Add "Last synced" indicator

**Total Time**: 13-17 hours (excluding backend integration)

---

## 🔑 Key Features

### **1. Preview Mode**

Show visual preview of settings before saving:

- Change animation mode → See mini sphere preview
- Change color scheme → See color palette
- Adjust opacity → See live slider effect

### **2. Presets**

Save/load setting presets:

- "Clinical" preset (subtle, clinical tone, high contrast)
- "Exploration" preset (dynamic, warm, all features on)
- "Performance" preset (animations off, simplified)
- User can create custom presets

### **3. Keyboard Shortcut Reference**

Embedded in settings page:

- Searchable list of all shortcuts
- Ability to customize (future)
- Print-friendly view

### **4. Network Diagnostics**

For network mode:

- Real-time latency monitoring
- Connection quality indicator
- Automatic fallback to local on network failure
- Reconnection logic

---

## 🎯 Benefits of Unified Settings

### **For Users:**

- ✅ One place to find everything
- ✅ Settings persist across sessions
- ✅ Can share configurations (export/import)
- ✅ Clear what each setting does
- ✅ Easy reset if confused

### **For Developers:**

- ✅ Single source of truth
- ✅ Easier to add new settings
- ✅ Type-safe with TypeScript
- ✅ Testable (mock store)
- ✅ Consistent UX patterns

### **For Deployment:**

- ✅ Network mode enables cloud deployment
- ✅ Settings can be managed centrally
- ✅ Clinicians can set organization defaults
- ✅ Research can standardize configurations

---

## 📝 Success Metrics

**Settings page is successful when:**

1. ✅ All current settings consolidated
2. ✅ Persists across page reloads
3. ✅ Network/local mode toggle works
4. ✅ Connection testing validates endpoints
5. ✅ Export/import enables configuration sharing
6. ✅ Accessible (keyboard nav, screen readers)
7. ✅ Mobile-responsive
8. ✅ Fast (<100ms setting changes)

---

## 🔮 Future Enhancements

### **Settings Profiles**

Multiple profiles per user:

- "Work" profile (clinical, stable, simplified)
- "Personal" profile (mystical, full features)
- Quick profile switching

### **Organization Settings**

For clinical deployments:

- Admin sets organization defaults
- Users can override specific settings
- Compliance enforcement (e.g., force HIPAA mode)

### **A/B Testing**

For research:

- Randomly assign users to setting variants
- Measure outcomes
- Optimize default settings based on data

---

**Status**: Comprehensive architecture defined  
**Complexity**: Medium (mostly UI work)  
**Impact**: High (significantly improves UX)  
**Priority**: High (enables many future features)

**Ready for implementation when approved!** ✨
