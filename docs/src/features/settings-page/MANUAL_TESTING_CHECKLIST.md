# Settings System - Manual Testing Checklist

**Date**: December 7, 2025
**Purpose**: Comprehensive manual validation of settings features
**Time Required**: 15-20 minutes

---

## 🎯 Pre-Testing Setup

### **1. Start the Application**

```bash
# Terminal 1 - Backend services
cd infra && ./bin/run-love-stack.sh

# Terminal 2 - Frontend
cd experience/web && npm run dev
```

### **2. Open Browser**

- Navigate to: `http://localhost:3000/admin/atlas`
- Open DevTools Console (F12)
- Clear any localStorage: `localStorage.clear()` then refresh

---

## ✅ Test Suite

### **Test 1: Access Settings Page** (2 min)

#### Method A: Keyboard Shortcut

- [ ] Press `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
- [ ] **Expected**: Settings page opens
- [ ] **Verify**: URL is `/admin/settings`

#### Method B: Settings Button

- [ ] Return to Atlas (click "← Back to Atlas")
- [ ] Hover over ⚙️ Settings button in top-right
- [ ] **Verify**: Tooltip shows "Settings (Ctrl/Cmd+,)"
- [ ] Click ⚙️ Settings button
- [ ] **Expected**: Settings page opens

#### Method C: Direct URL

- [ ] Navigate to `http://localhost:3000/admin/settings`
- [ ] **Expected**: Settings page loads

**Success Criteria:**

- ✅ All 3 methods work
- ✅ No console errors
- ✅ Page renders correctly

---

### **Test 2: Presets Functionality** (3 min)

- [ ] Click "⚙️ Presets" button
- [ ] **Verify**: Modal appears with 4 presets
- [ ] **Verify**: Warning message about replacing settings visible

**Load Performance Preset:**

- [ ] Click "⚡ Performance Mode" card
- [ ] **Expected**: Success notification appears
- [ ] **Expected**: Modal closes
- [ ] Click "Visual" tab
- [ ] **Verify**: Animation mode is "Subtle"
- [ ] Click "Accessibility" tab
- [ ] **Verify**: "Reduce Motion" is enabled
- [ ] Click "Behavior" tab
- [ ] **Verify**: "Focus Mode" is enabled

**Load Clinical Preset:**

- [ ] Click "⚙️ Presets" again
- [ ] Click "🏥 Clinical Mode" card
- [ ] **Expected**: Success notification
- [ ] Click "Chat" tab
- [ ] **Verify**: Tone mode is "Clinical"
- [ ] **Verify**: "Deep Feeling Mode" is enabled
- [ ] Click "Accessibility" tab
- [ ] **Verify**: "High Contrast" is enabled
- [ ] **Verify**: Font size is "Large"

**Load Demo Preset:**

- [ ] Click "⚙️ Presets"
- [ ] Click "✨ Demo Mode"
- [ ] Click "Visual" tab
- [ ] **Verify**: Animation mode is "Mystical"
- [ ] **Verify**: Emotion size slider is above 1.0

**Load Accessibility Preset:**

- [ ] Click "⚙️ Presets"
- [ ] Click "♿ Accessibility Mode"
- [ ] Click "Visual" tab
- [ ] **Verify**: Animations are disabled
- [ ] Click "Accessibility" tab
- [ ] **Verify**: All accessibility features enabled

**Success Criteria:**

- ✅ All 4 presets load correctly
- ✅ Settings change in UI immediately
- ✅ Success notifications appear
- ✅ No console errors

---

### **Test 3: Export Settings** (2 min)

**Test Export to File:**

- [ ] Configure some custom settings
- [ ] Click "📥 Export" button
- [ ] **Expected**: JSON file downloads
- [ ] **Verify**: Filename format is `love-settings-YYYY-MM-DD.json`
- [ ] Open downloaded file
- [ ] **Verify**: Valid JSON with `version` and `settings` fields
- [ ] **Verify**: All 7 sections present (visual, behavior, layers, network, chat, keyboard, accessibility)

**Test Copy to Clipboard:**

- [ ] Click "📋 Copy" button
- [ ] **Expected**: Success notification "Settings copied to clipboard!"
- [ ] Open text editor and paste (Cmd/Ctrl + V)
- [ ] **Verify**: Same JSON structure as exported file
- [ ] **Verify**: Valid JSON

**Success Criteria:**

- ✅ Export downloads valid JSON file
- ✅ Copy to clipboard works
- ✅ Both contain same complete settings
- ✅ Notifications appear

---

### **Test 4: Import Settings** (3 min)

**Setup:**

- [ ] Export current settings (save as backup)
- [ ] Load Performance preset
- [ ] **Verify**: Settings changed

**Test Import from File:**

- [ ] Click "📤 Import" button
- [ ] **Expected**: File picker opens
- [ ] Select the backup file you exported
- [ ] **Expected**: Success notification "Settings imported successfully!"
- [ ] **Verify**: Settings restored to pre-Performance state
- [ ] Check multiple tabs to confirm restoration

**Test Invalid Import:**

- [ ] Create a text file with invalid JSON: `{ invalid }`
- [ ] Try to import it
- [ ] **Expected**: Error notification "Invalid settings file"
- [ ] Open browser console
- [ ] **Verify**: Specific error message logged
- [ ] **Verify**: Current settings unchanged

**Success Criteria:**

- ✅ Valid import works
- ✅ Settings fully restored
- ✅ Invalid import rejected gracefully
- ✅ Helpful error messages
- ✅ Settings preserved on error

---

### **Test 5: Keyboard Shortcuts on Settings Page** (2 min)

**While on Settings Page:**

- [ ] Click "Behavior" tab
- [ ] Note current Focus Mode state
- [ ] Press `F` key
- [ ] **Expected**: Focus Mode toggles
- [ ] **Verify**: UI updates immediately

**Test Animation Mode Cycling:**

- [ ] Click "Visual" tab
- [ ] Note current animation mode
- [ ] Press `M` key
- [ ] **Expected**: Animation mode cycles (Subtle → Dynamic → Mystical → Subtle)
- [ ] **Verify**: UI selector updates
- [ ] Press `M` again
- [ ] **Verify**: Cycles to next mode

**Test Data Viz Mode:**

- [ ] Press `D` key
- [ ] Navigate to Atlas page
- [ ] **Expected**: Data Visualization overlay appears (if 'D' toggles it on)
- [ ] Press `D` again
- [ ] **Expected**: Overlay closes

**Success Criteria:**

- ✅ Keyboard shortcuts work on Settings page
- ✅ UI updates reflect changes
- ✅ Changes persist when navigating to Atlas
- ✅ No conflicts with input fields

---

### **Test 6: Settings Persistence** (2 min)

**Configure Custom Settings:**

- [ ] Set animation mode to "Dynamic"
- [ ] Enable "Focus Mode"
- [ ] Set path opacity to 0.9
- [ ] Enable "High Contrast"
- [ ] Change default tone to "Clinical"

**Test Persistence:**

- [ ] Close browser tab completely
- [ ] Reopen browser
- [ ] Navigate to `http://localhost:3000/admin/settings`
- [ ] Check each setting configured above
- [ ] **Expected**: All settings persist exactly as configured

**Test Atlas Reflects Settings:**

- [ ] Navigate to Atlas page
- [ ] **Verify**: Visual settings applied (paths should look different based on your settings)

**Success Criteria:**

- ✅ All settings persist across sessions
- ✅ localStorage contains settings
- ✅ Atlas reflects settings correctly
- ✅ No data loss

---

### **Test 7: Reset to Defaults** (2 min)

**Setup:**

- [ ] Load Clinical preset (makes big changes)
- [ ] **Verify**: Settings significantly different from defaults

**Test Reset:**

- [ ] Click "🔄 Reset" button
- [ ] **Expected**: Confirmation dialog appears
- [ ] **Verify**: Warning mentions "all settings" and "cannot be undone"
- [ ] Click "Cancel"
- [ ] **Expected**: Dialog closes, settings unchanged

**Actual Reset:**

- [ ] Click "🔄 Reset" again
- [ ] Click "Reset All Settings"
- [ ] **Expected**: Success notification
- [ ] **Expected**: Dialog closes
- [ ] Check Visual tab
- [ ] **Verify**: Animation mode is "Subtle" (default)
- [ ] Check Accessibility tab
- [ ] **Verify**: All features disabled (defaults)
- [ ] Check Chat tab
- [ ] **Verify**: Tone is "Warm" (default)

**Success Criteria:**

- ✅ Confirmation dialog appears
- ✅ Cancel works
- ✅ Reset actually resets all settings
- ✅ Success notification shows
- ✅ All tabs reflect default values

---

### **Test 8: Tab Navigation** (1 min)

**Test All Tabs:**

- [ ] Click "Visual" tab → content changes
- [ ] Click "Behavior" tab → content changes
- [ ] Click "Network" tab → content changes
- [ ] Click "Chat" tab → content changes
- [ ] Click "Accessibility" tab → content changes

**Verify UI:**

- [ ] Active tab has cyan underline
- [ ] Active tab has lighter background
- [ ] Inactive tabs are gray
- [ ] Hover states work on inactive tabs

**Success Criteria:**

- ✅ All 5 tabs load correctly
- ✅ Active state styling works
- ✅ No content overlap
- ✅ Smooth transitions

---

### **Test 9: Validation Error Handling** (2 min)

**Create Invalid Settings File:**

Create file `invalid-settings.json`:

```json
{
  "version": "1.0",
  "settings": {
    "visual": {
      "pathOpacity": 5.0,
      "emotionSize": 1.0,
      "pathAnimationMode": "subtle",
      "emotionDisplayMode": "simple",
      "showMotionIndicators": true,
      "colorScheme": "category",
      "enableAnimations": true,
      "dataVisualizationMode": false
    },
    "behavior": {"autoComputePaths": true, "showAllPaths": true, "focusMode": false},
    "layers": {"soulSphere": true, "emotionPoints": true, "emotionLabels": true, "transitionPaths": true, "waypoints": true, "bridgeHighlight": true, "legend": true},
    "network": {"mode": "local", "customEndpoints": false, "endpoints": {"observer": "http://localhost:8000", "listener": "http://localhost:8002", "versor": "http://localhost:8001"}},
    "chat": {"defaultToneMode": "warm", "defaultDeepFeeling": false, "autoFocusEmotions": true},
    "keyboard": {"enableKeyboardShortcuts": true, "customKeyBindings": {}},
    "accessibility": {"reducedMotion": false, "highContrast": false, "fontSize": "medium"}
  }
}
```

**Test:**

- [ ] Note current settings
- [ ] Try to import invalid-settings.json
- [ ] **Expected**: Error notification "Invalid settings file"
- [ ] Open console
- [ ] **Verify**: Error message "Invalid pathOpacity value"
- [ ] Check settings
- [ ] **Verify**: Settings unchanged (validation prevented bad data)

**Success Criteria:**

- ✅ Validation catches invalid pathOpacity
- ✅ Error notification appears
- ✅ Console shows specific error
- ✅ Settings remain valid

---

### **Test 10: Cross-Feature Integration** (2 min)

**Test Settings → Atlas Sync:**

- [ ] On Settings page, change animation mode to "Mystical"
- [ ] Navigate to Atlas
- [ ] **Verify**: Paths have mystical animations
- [ ] Return to Settings
- [ ] Change emotion size to 1.5
- [ ] Navigate to Atlas
- [ ] **Verify**: Emotions appear larger

**Test Atlas → Settings Reflection:**

- [ ] On Atlas, press `M` to cycle animation mode
- [ ] Navigate to Settings → Visual tab
- [ ] **Verify**: Animation mode selector shows new mode
- [ ] On Atlas, press `F` to toggle Focus Mode
- [ ] Navigate to Settings → Behavior tab
- [ ] **Verify**: Focus Mode toggle reflects current state

**Success Criteria:**

- ✅ Settings sync to Atlas immediately
- ✅ Atlas changes reflect in Settings UI
- ✅ No lag or delay
- ✅ Bidirectional awareness

---

## 📊 Overall Success Criteria

**All tests must pass for production release:**

### **Functional Requirements**

- ✅ All 5 setting tabs work
- ✅ All 4 presets load correctly
- ✅ Export downloads valid JSON
- ✅ Copy to clipboard works
- ✅ Import applies settings
- ✅ Validation rejects invalid data
- ✅ Reset restores defaults
- ✅ Keyboard shortcuts work on Settings page
- ✅ Settings persist across sessions
- ✅ Sync with Atlas works

### **Quality Requirements**

- ✅ No console errors during normal use
- ✅ Helpful error messages
- ✅ Confirmation dialogs for destructive actions
- ✅ Toast notifications provide feedback
- ✅ UI is responsive and smooth
- ✅ Tooltips/titles provide context

### **Accessibility Requirements**

- ✅ Keyboard navigation works
- ✅ Focus indicators visible
- ✅ Buttons have descriptive titles
- ✅ Color contrast sufficient
- ✅ Screen reader friendly (semantic HTML)

---

## 🐛 Known Issues / Edge Cases

### **Expected Behaviors (Not Bugs):**

1. **Console errors during tests**
   - Tests intentionally pass invalid data
   - This validates our error handling works
   - Not a problem in normal use

2. **Clipboard API requires HTTPS in production**
   - Works on localhost
   - In production, needs secure context
   - Fallback: show JSON in modal for manual copy

3. **Settings sync is one-way**
   - useSettingsStore → useAtlasAdminStore
   - This is intentional (prevents circular updates)
   - Atlas components read from synced copy

---

## 📝 Recording Results

### **Pass/Fail Tracking**

| 7. Reset | ⬜ Pass / ⬜ Fail | |
| 8. Tab Navigation | ⬜ Pass / ⬜ Fail | |
| 9. Validation | ⬜ Pass / ⬜ Fail | |
| 10. Integration | ⬜ Pass / ⬜ Fail | |

**Overall**: ⬜ PASS / ⬜ FAIL

---

## 🔧 Troubleshooting

### **If Settings Don't Persist:**

1. Check browser console for localStorage errors
2. Verify localStorage isn't disabled
3. Check browser privacy settings
4. Try incognito mode (should still work)

### **If Import Fails:**

1. Validate JSON structure
2. Check console for specific error
3. Ensure all 7 sections present
4. Verify pathOpacity: 0-1, emotionSize: 0.5-2.0

### **If Keyboard Shortcuts Don't Work:**

1. Verify `enableKeyboardShortcuts` is true
2. Check if focus is in input field (shortcuts disabled in inputs)
3. Try clicking on page background first
4. Check console for errors

### **If Presets Don't Load:**

1. Check console for import errors
2. Verify `settingsPresets.ts` exists
3. Check network tab (shouldn't be network requests)
4. Try refreshing page

---

## 📸 Screenshots (Optional)

For documentation, capture:

- [ ] Settings page with all tabs
- [ ] Presets modal
- [ ] Export success notification
- [ ] Import file picker
- [ ] Reset confirmation dialog
- [ ] Each preset applied to Atlas view

---

## ✅ Final Checklist

Before marking validation complete:

- [ ] All 10 tests passed
- [ ] All automated tests passing (66/66)
- [ ] No critical console errors
- [ ] Performance acceptable (<100ms for changes)
- [ ] User experience smooth
- [ ] Documentation accurate
- [ ] Ready for production

---

**Tester**: ________________
**Date**: ________________
**Build**: ________________
**Status**: ⬜ APPROVED / ⬜ NEEDS WORK

### Notes

---

---

**Last Updated**: December 7, 2025
**Version**: 1.0
