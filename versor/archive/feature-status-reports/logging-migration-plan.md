# Logging Migration - Remaining Work Plan

**Date**: December 7, 2025  
**Current Progress**: 102/163 calls migrated (62.5%)  
**Remaining**: 61 calls across ~15 files  
**Estimated Time**: 1.5-2 hours

---

## 📊 Current Status

### **✅ Completed (22 files, 102 calls):**

**Hooks (8 files):**
- useOllamaModels
- useWebSocketChat  
- useEmotionAtlas
- useModelAssignments
- useVoiceRecording
- usePathCalculator
- useLoadCachedPaths
- useEmotionNavigation

**Stores (1 file):**
- useSettingsStore

**Components (13 files):**
- ChatPanel
- ChatDrawer
- VoiceRecorder
- EmotionRelationshipGraph
- PathMatrixGrid
- TransitionPathRenderer
- Scene
- PersonalStrategies
- ContextualRecommendations
- JourneyHistory
- JourneyProgress
- EmotionalInput
- ExportControls
- StatisticsPanel
- SmartRecommendations
- NetworkSettings
- ProsodyVisualization

---

## 📋 Remaining Files to Migrate (61 calls)

### **Priority 1: Keyboard Shortcuts (20 calls) - 30 minutes**

**File**: `experience/web/hooks/useKeyboardShortcuts.ts`  
**Calls**: ~20 (mostly console.log for keyboard help)  
**Category**: `user-interaction`  
**Complexity**: Medium (many console.log calls for help text)

**Pattern:**
```typescript
// Before:
console.log('Keyboard Shortcuts:');
console.log('  P: Toggle paths');

// After:
logger.info('user-interaction', 'Keyboard Shortcuts Help');
logger.info('user-interaction', '  P: Toggle paths');
```

**Note**: These are help messages shown when user presses H. Consider consolidating into single logger call with full help text.

---

### **Priority 2: GoalSetting Component (6 calls) - 15 minutes**

**File**: `experience/web/components/GoalSetting.tsx`  
**Calls**: 6  
**Categories**: `api`, `general`

**Console calls:**
1. `console.log(\`Loaded ${response.total_count} emotions from atlas\`)` → `logger.info('api', ...)`
2. `console.error('Failed to load emotion atlas:', err)` → `logger.error('api', ...)`
3. `console.log('Generated transition path:', path)` → `logger.info('api', ...)`
4. `console.error('Path generation error:', err)` → `logger.error('api', ...)`
5. `console.log('Journey started:', response)` → `logger.info('general', ...)`
6. `console.error('Failed to start journey:', err)` → `logger.error('general', ...)`

---

### **Priority 3: Remaining Hooks (5 calls) - 15 minutes**

**File**: `experience/web/hooks/useComputeAllPaths.ts`  
**Calls**: 2  
**Category**: `hooks`
- Start computation logging
- Error handling

**File**: `experience/web/hooks/useObserverPolling.ts`  
**Calls**: 2  
**Category**: `api`
- Observer updates
- Polling errors

**File**: Other utility hooks  
**Calls**: ~1  

---

### **Priority 4: Clinical Components (10 calls) - 30 minutes**

These are mostly error handlers and debug logs:

1. **useComputeAllPaths** (~2 calls)
   - Category: `hooks`
   - Batch computation progress

2. **useObserverPolling** (~2 calls)
   - Category: `api`
   - Polling and updates

3. **Other hooks** (~6 calls)
   - Various categories
   - Error handling

---

### **Priority 5: Miscellaneous (20 calls) - 30 minutes**

**Remaining components** with console.* calls:
- Test setup files (__tests__/setup.ts) - console suppression
- Any remaining utility functions
- Edge case error handlers

---

## 🎯 Migration Strategy for Next Session

### **Session Plan (1.5-2 hours):**

**Part 1: Warm-up (5 min)**
- Review progress
- Test logger in browser
- Verify Development tab working

**Part 2: Keyboard Shortcuts (30 min)**
- Migrate useKeyboardShortcuts
- Consider consolidating help text
- Test keyboard shortcuts still work

**Part 3: GoalSetting (15 min)**
- Migrate 6 console.* calls
- Test goal setting workflow

**Part 4: Remaining Hooks (15 min)**
- useComputeAllPaths
- useObserverPolling
- Any other hooks

**Part 5: Final Components (30 min)**
- Clinical components
- Miscellaneous files
- Test setup

**Part 6: Verification (15 min)**
- Search for any remaining console.* calls
- Test all categories
- Test all log levels
- Verify Copy Logs / Clear Console work

**Part 7: Cleanup (10 min)**
- Final documentation update
- Mark migration as complete
- Celebrate! 🎉

---

## 🔍 How to Find Remaining Calls

Use this regex search in experience/web:
```
console\.(log|debug|info|warn|error)
```

Should find ~61 remaining calls.

---

## ✅ Migration Checklist Template

For each file:
- [ ] Add `import { logger } from '@/utils/logger';`
- [ ] Replace console.log → `logger.info()` or `logger.debug()`
- [ ] Replace console.error → `logger.error()`
- [ ] Replace console.warn → `logger.warn()`
- [ ] Use correct category (websocket, api, hooks, rendering, state, user-interaction, general)
- [ ] Pass data as objects when possible
- [ ] Test compilation
- [ ] Verify no console.* calls remain in file

---

## 📈 Expected Final Stats

After completion:
- **Total files migrated**: ~35-40
- **Total calls migrated**: 163/163 (100%)
- **Hook migration**: 100%
- **Store migration**: 100%
- **Component migration**: 100%

---

## 🎓 Quick Reference

**Categories:**
- `websocket` - WebSocket operations
- `api` - HTTP fetch() calls
- `hooks` - React hooks lifecycle
- `rendering` - THREE.js, Canvas
- `state` - Zustand updates
- `user-interaction` - Clicks, keyboard
- `general` - Everything else

**Levels:**
- `debug` - Detailed diagnostics
- `info` - Normal operation
- `warn` - Important notices
- `error` - Failures

**Usage:**
```typescript
import { logger } from '@/utils/logger';

logger.debug('category', 'message', optionalData);
logger.info('category', 'message', optionalData);
logger.warn('category', 'message', optionalData);
logger.error('category', 'message', errorObject);
```

---

## 🎬 Next Session Goal

**Complete the migration!** Migrate all remaining 61 console.* calls and mark the logging control system as 100% complete.

**Final Result**: Clean, professional, controllable logging across the entire L.O.V.E. platform. 🎉

---

**Status**: Ready for completion  
**Complexity**: Low (straightforward migrations)  
**Risk**: Minimal (no breaking changes)  
**Reward**: Complete logging control! 🚀
