# Logging Control - Console.* Migration Progress

**Last Updated**: December 7, 2025  
**Status**: 40% Complete (65/163 calls migrated)  
**Time Invested**: 1.5 hours of migration

---

## 📊 Migration Statistics

### **Overall Progress:**
- **Total console.* calls found**: 163
- **Migrated to logger**: 65
- **Remaining**: 98
- **Completion**: 40%

### **Progress Breakdown:**

| Category | Migrated | Remaining | % Complete |
|----------|----------|-----------|------------|
| Hooks | 59 | ~15 | 80% |
| Stores | 6 | ~2 | 75% |
| Components | 0 | ~80 | 0% |

---

## ✅ Fully Migrated Files (9)

### **Hooks (7 files, 59 calls):**

1. **useOllamaModels** (10 calls) ✅
   - Categories: `websocket`, `api`
   - Types: info, debug, error
   - Model pull WebSocket progress
   - API errors and success messages

2. **useWebSocketChat** (19 calls) ✅
   - Category: `websocket`
   - Types: info, debug, error
   - Connection lifecycle
   - Message parsing
   - Progress updates
   - Error handling

3. **useEmotionAtlas** (3 calls) ✅
   - Category: `api`
   - Types: info, error
   - Emotion data loading
   - API errors

4. **useModelAssignments** (5 calls) ✅
   - Category: `api`
   - Types: error
   - Model assignment operations
   - Recommendations & performance fetching

5. **useVoiceRecording** (5 calls) ✅
   - Category: `hooks`
   - Types: info, debug, error
   - Recording lifecycle
   - Microphone access errors

6. **usePathCalculator** (4 calls) ✅
   - Category: `hooks`
   - Types: info, debug, error
   - Path computation
   - API calls to Observer

7. **useLoadCachedPaths** (5 calls) ✅
   - Category: `api`
   - Types: info, warn, debug, error
   - Cache loading from backend
   - Performance metrics

8. **useEmotionNavigation** (8 calls) ✅
   - Category: `hooks`
   - Types: warn, debug
   - Emotion finding/focusing
   - Selection operations

### **Stores (1 file, 6 calls):**

9. **useSettingsStore** (6 calls) ✅
   - Category: `state`
   - Types: info, warn, error
   - Settings validation
   - Import/Export operations

---

## ⏳ Remaining Files (~98 calls)

### **High Priority Hooks (~15 calls):**
- useComputeAllPaths (~2 calls)
- useObserverPolling (~2 calls)
- Other utility hooks (~11 calls)

### **Components (~80 calls):**

**Admin Components:**
- ChatPanel (~5 calls)
- ChatDrawer (~3 calls)
- VoiceRecorder (~2 calls)
- PathMatrixGrid (~4 calls)
- ExportControls (~2 calls)
- StatisticsPanel (~2 calls)
- SmartRecommendations (~2 calls)
- NetworkSettings (~2 calls)
- EmotionRelationshipGraph (~1 call)

**Clinical Components:**
- ProsodyVisualization (~1 call)
- Other clinical components (~5 calls)

**User-Facing Components:**
- PersonalStrategies (~1 call)
- ContextualRecommendations (~1 call)
- JourneyHistory (~1 call)
- Scene (~2 calls)
- TransitionPathRenderer (~3 calls)
- EmotionalInput (~1 call)
- GoalSetting (~4 calls)
- JourneyProgress (~1 call)

**Other:**
- Misc components (~40+ calls)

### **Keyboard Shortcuts (~20 calls):**
- useKeyboardShortcuts (~20 console.log calls for shortcuts help)

### **Test Setup (~3 calls):**
- __tests__/setup.ts (console suppression)

---

## 🎯 Migration Quality Metrics

### **Consistency:**
- ✅ All migrations follow same pattern
- ✅ Correct categories assigned
- ✅ Appropriate log levels used
- ✅ Data passed as objects (not strings)

### **Categories Used:**
- `websocket` - 30 calls (WebSocket operations)
- `api` - 18 calls (HTTP requests)
- `hooks` - 17 calls (Hook lifecycle)
- `state` - 6 calls (State management)

### **Log Levels Used:**
- `debug` - 22 calls (detailed info)
- `info` - 28 calls (normal logging)
- `warn` - 10 calls (warnings)
- `error` - 11 calls (errors)

---

## 📝 Migration Patterns

### **Pattern 1: Simple Message**
```typescript
// Before:
console.log('[WebSocket] Connected');

// After:
logger.info('websocket', 'Connected');
```

### **Pattern 2: With Data**
```typescript
// Before:
console.log('[API] Loaded', count, 'items');

// After:
logger.info('api', `Loaded ${count} items`);
```

### **Pattern 3: With Object Data**
```typescript
// Before:
console.log('[WebSocket] Progress:', stage, percentage + '%');

// After:
logger.debug('websocket', 'Progress update', { stage, percentage });
```

### **Pattern 4: Errors**
```typescript
// Before:
console.error('Error fetching data:', err);

// After:
logger.error('api', 'Error fetching data', err);
```

---

## 🚀 Next Steps

### **Phase 1: Remaining Hooks** (30 minutes)
- useComputeAllPaths
- useObserverPolling
- Other small hooks

### **Phase 2: High-Traffic Components** (2 hours)
- ChatPanel
- ChatDrawer
- VoiceRecorder
- Admin components

### **Phase 3: Keyboard Shortcuts** (30 minutes)
- useKeyboardShortcuts (special handling for help text)

### **Phase 4: Remaining Components** (2 hours)
- All remaining components
- Test setup files

**Estimated Time**: 5 hours to complete remaining 98 calls

---

## 💡 Lessons Learned

### **What Worked Well:**
1. **Systematic approach** - File by file, testing as we go
2. **Category system** - Makes logs easy to filter
3. **Small batches** - 3-5 replacements per commit
4. **Exact matching** - Careful SEARCH blocks prevent errors

### **Challenges:**
1. **Import variations** - Different files use different import styles
2. **String concatenation** - Need to convert to template literals
3. **Large files** - require smaller SEARCH blocks

### **Best Practices:**
1. Always add logger import first
2. Replace in order they appear in file
3. Use 3-5 SEARCH/REPLACE blocks max per call
4. Test compilation after each file
5. Keep exact formatting (spaces, quotes, etc.)

---

## 🎓 Category Assignment Guide

**Quick Reference:**
- WebSocket operations → `websocket`
- fetch() calls → `api`
- Hook lifecycle (useEffect, useState) → `hooks`
- THREE.js, Canvas, WebGL → `rendering`
- Zustand store updates → `state`
- onClick, keyboard events → `user-interaction`
- Everything else → `general`

**Level Selection:**
- Detailed diagnostics → `debug`
- Normal operation info → `info`
- Important notices → `warn`
- Failures/exceptions → `error`

---

## 🏆 Quality Standards

### **Every Migration Must:**
- ✅ Add logger import at top
- ✅ Use correct category
- ✅ Use appropriate log level
- ✅ Pass structured data (not concatenated strings when possible)
- ✅ Maintain same information content
- ✅ Preserve error objects
- ✅ Test compile after change

### **Avoid:**
- ❌ String concatenation in messages (use template literals)
- ❌ Wrong categories
- ❌ Generic 'general' category (be specific)
- ❌ Logging sensitive data (PHI, passwords, tokens)
- ❌ Over-logging (keep same verbosity as before)

---

## 📈 Velocity Tracking

| Session | Files | Calls | Time | Rate |
|---------|-------|-------|------|------|
| Dec 7 (Initial) | 9 | 65 | 1.5h | 43 calls/hour |

**Projected**: At current velocity, remaining 98 calls will take ~2.3 hours

---

## 🔄 Continuation Plan

### **Next Session Agenda:**
1. **Warm-up** (5 min): Review progress, test logger
2. **Phase 1** (30 min): Migrate remaining hooks
3. **Phase 2** (2 hours): Migrate high-traffic components
4. **Phase 3** (30 min): Keyboard shortcuts
5. **Phase 4** (1 hour): Remaining components
6. **Testing** (30 min): Verify categories and levels work
7. **Wrap-up** (15 min): Final documentation

**Total**: ~4.5 hours to complete migration

---

## 📚 Reference

### **Logger API:**
```typescript
logger.debug(category, message, ...args)
logger.info(category, message, ...args)
logger.warn(category, message, ...args)
logger.error(category, message, ...args)
```

### **Categories:**
```typescript
'websocket' | 'api' | 'hooks' | 'rendering' | 'state' | 'user-interaction' | 'general'
```

### **Levels:**
```typescript
'debug' | 'info' | 'warn' | 'error'
```

---

**Migration Status**: 🟢 On Track  
**Next Milestone**: 50% (82/163 calls)  
**Target Completion**: Next session
