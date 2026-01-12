# Experience Module Code Quality Plan - Path to 100%

**Date Created:** January 4, 2026  
**Status:** Phase 1 - Baseline Assessment  
**Goal:** Achieve 100% code quality matching Listener, Observer, and Versor modules

---

## 📊 Current State

The Experience module is a **TypeScript/Next.js** application with two sub-modules:
- **`experience/web/`** - Main Next.js web application (~100+ components, hooks, stores)
- **`experience/shared/`** - Cross-platform shared utilities (VAC, quaternion, API clients)

**Already in place:**
✅ ESLint configuration (Next.js + TypeScript rules)
✅ Prettier configuration
✅ TypeScript strict mode enabled
✅ Jest test framework with coverage thresholds (70-80%)
✅ Quality check script available (`infra/scripts/check-typescript-quality.sh`)
✅ Comprehensive refactoring plan documented (ADMIN_REFACTORING_PLAN.md)

---

## 🎯 What "100%" Means for Experience

Based on patterns from Listener, Observer, and Versor:

### 1. **Code Quality Checks (All Passing)**
- ✅ TypeScript compiler (`tsc --noEmit`) - zero type errors
- ✅ ESLint - zero linting errors
- ✅ Prettier - all code formatted
- ✅ npm audit - no security vulnerabilities
- ✅ Build test - clean production build

### 2. **Documentation Excellence**
- ✅ JSDoc comments on all exported functions/components
- ✅ Inline comments explaining complex logic
- ✅ Props interfaces documented
- ✅ Custom hooks documented with examples
- ✅ README/architecture docs updated

### 3. **Test Coverage**
- ✅ 70%+ branch coverage
- ✅ 70%+ function coverage  
- ✅ 80%+ line coverage
- ✅ 80%+ statement coverage
- ✅ Critical paths 100% covered

### 4. **Architecture**
- ✅ No components over 400 lines
- ✅ Logic in hooks, not components
- ✅ No code duplication
- ✅ Clear directory structure

---

## 📋 Implementation Plan

### **Phase 1: Baseline Assessment & Quick Wins** ⏳ IN PROGRESS
**Timeline:** Day 1 - 2 hours  
**Status:** Starting...

**Goals:**
- [ ] Run all quality checks and capture output
- [ ] Auto-fix what we can with `--fix` flag
- [ ] Document baseline metrics
- [ ] List remaining manual fixes needed

**Commands:**
```bash
cd experience/web
npm install
npm run lint 2>&1 | tee eslint-report.txt
npm run type-check 2>&1 | tee typescript-report.txt
npm test -- --coverage 2>&1 | tee test-coverage-report.txt
npm run build 2>&1 | tee build-report.txt
./infra/scripts/check-typescript-quality.sh --fix
```

**Expected Output:** 
- Baseline metrics document
- Many auto-fixed formatting issues
- List of remaining manual fixes needed

---

### **Phase 2: TypeScript Type Safety** ⏳ PENDING
**Timeline:** Day 2-3 - 4-6 hours  
**Goal:** Achieve zero TypeScript errors

**Priority Order:**
1. **Stores** (4 files) - Foundation of type safety
2. **Hooks** (~25 files) - Business logic
3. **Components** (~100+ files) - User interface
4. **Utils** (~5 files) - Helper functions
5. **Shared module** (all files)

**Common Fixes:**
- Add return type annotations
- Replace `any` with specific types
- Add proper generics to collections
- Fix prop interface incompleteness
- Add missing null checks

**Verification:**
```bash
cd experience/web && npm run type-check
cd experience/shared && npm run type-check
```

---

### **Phase 3: Linting Excellence** ⏳ PENDING
**Timeline:** Day 3-4 - 3-4 hours  
**Goal:** Achieve zero ESLint errors

**Common Fixes:**
- Remove unused variables/imports
- Fix missing dependencies in useEffect
- Correct hook usage
- Add missing alt text on images
- Remove console.log statements (use logger)

**Commands:**
```bash
cd experience/web
npm run lint:fix
npm run lint
npm run build
```

---

### **Phase 4: Documentation Excellence** ⏳ PENDING
**Timeline:** Day 4-6 - 8-12 hours  
**Goal:** Match Observer/Listener documentation quality

**Documentation Standard:**
```typescript
/**
 * Custom hook for managing emotional sphere animations
 * 
 * Handles SLERP interpolation between emotional states, providing
 * smooth transitions with configurable duration and easing functions.
 * 
 * @example
 * ```tsx
 * const { animateToState } = useSphereAnimation();
 * 
 * animateToState({
 *   vac: [0.8, 0.6, 0.7],
 *   duration: 1000,
 *   easing: 'easeInOut'
 * });
 * ```
 * 
 * @param initialState - Starting VAC coordinates
 * @returns Animation control functions and current state
 */
export function useSphereAnimation(initialState: VACVector) {
  // ...
}
```

**Priorities:**
- **Tier 1 (6-8 hours):** All hooks, stores, shared utilities, complex components
- **Tier 2 (3-4 hours):** Admin panels, visualizations, API utilities
- **Tier 3 (2-3 hours):** Simple UI components, types, test utilities

**Architecture Docs:**
- `experience/README.md` - Overview and getting started
- `experience/ARCHITECTURE.md` - System design and patterns
- `experience/web/README.md` - Web-specific guide
- `experience/shared/README.md` - Shared module guide

---

### **Phase 5: Test Coverage** ⏳ PENDING
**Timeline:** Day 7-9 - 8-12 hours  
**Goal:** Achieve 70-80%+ test coverage

**Current Tests:**
- Components: EmotionalControls, EmotionalInput, GoalSetting, JourneyProgress, Scene, VACDisplay
- Hooks: usePathComparison, useStatistics, useMatrixData
- Stores: useSettingsStore
- Utils: settingsPresets

**Priority 1 - Core Functionality:**
- `stores/useExperienceStore.ts`
- `stores/useEmotionHistoryStore.ts`
- `stores/useAtlasAdminStore.ts`
- `hooks/useSphereSync.ts`
- `hooks/useEmotionNavigation.ts`
- `hooks/usePathCalculator.ts`

**Priority 2 - Shared Utilities:**
- `shared/src/core/quaternion.ts`
- `shared/src/core/vac.ts`
- `shared/src/core/easing.ts`
- `shared/src/api/listener.ts`
- `shared/src/api/observer.ts`

**Priority 3 - Complex Components:**
- `components/SoulSphere.tsx`
- `components/TransitionPathRenderer.tsx`
- `components/CommandPalette.tsx`

**Verification:**
```bash
npm test -- --coverage
```

---

### **Phase 6: Code Refactoring** ⏳ OPTIONAL
**Timeline:** Day 10-15 - 20-30 hours  
**Goal:** Execute approved refactoring plan

**Note:** This phase is **optional** for achieving 100% quality but highly recommended for long-term maintainability.

**Key Priorities:**
1. **ChatPanel.tsx** (1,010 lines → 200 lines)
2. **Unified Sphere System** (eliminate ~700 lines duplication)
3. **Large Panel Decomposition** (InfoPanel, ControlPanel, PathMatrixGrid)

See `ADMIN_REFACTORING_PLAN.md` for complete details.

---

### **Phase 7: Final Verification & Documentation** ⏳ PENDING
**Timeline:** Day 16 - 2-3 hours  
**Goal:** Verify everything passes and document achievement

**Verification:**
```bash
./infra/scripts/check-typescript-quality.sh
npm test -- --coverage --verbose
```

**Deliverables:**
- `experience/CODE_QUALITY_REPORT.md` - Before/after metrics
- Updated project root `README.md`
- All quality checks passing

---

## 📊 Success Metrics

After completion, the Experience module will have:

### **Code Quality (100%)**
- ✅ Zero TypeScript errors (strict mode)
- ✅ Zero ESLint errors
- ✅ All code Prettier-formatted
- ✅ Clean production build
- ✅ No security vulnerabilities

### **Documentation (100%)**
- ✅ All exports have JSDoc comments
- ✅ Complex algorithms explained inline
- ✅ Architecture guides complete
- ✅ Hook usage examples provided
- ✅ Component prop interfaces documented

### **Test Coverage (70-80%+)**
- ✅ 70%+ branch coverage
- ✅ 70%+ function coverage
- ✅ 80%+ line coverage
- ✅ 80%+ statement coverage
- ✅ Critical paths 100% covered

---

## ⏱️ Time Estimates

**Minimum Path (Skip Refactoring):**
- Phase 1: 2 hours
- Phase 2: 4-6 hours
- Phase 3: 3-4 hours
- Phase 4: 8-12 hours
- Phase 5: 8-12 hours
- Phase 7: 2-3 hours
- **Total: 27-39 hours (3.5-5 days)**

**Complete Path (With Refactoring):**
- Phases 1-5 + 7: 27-39 hours
- Phase 6: 20-30 hours
- **Total: 47-69 hours (6-9 days)**

---

## 📈 Progress Tracking

### Phase 1: Baseline Assessment ⏳ IN PROGRESS
- [ ] Install dependencies
- [ ] Run ESLint and capture report
- [ ] Run TypeScript compiler and capture report
- [ ] Run test suite with coverage
- [ ] Attempt production build
- [ ] Run auto-fix with quality script
- [ ] Document baseline metrics

### Phase 2: TypeScript Type Safety
- [ ] Fix shared module types
- [ ] Fix store types
- [ ] Fix hook types
- [ ] Fix component types
- [ ] Fix util types
- [ ] Verify zero TypeScript errors

### Phase 3: Linting Excellence
- [ ] Run ESLint auto-fix
- [ ] Fix remaining manual issues
- [ ] Verify clean build
- [ ] Verify zero ESLint warnings

### Phase 4: Documentation Excellence
- [ ] Document all stores (Tier 1)
- [ ] Document all hooks (Tier 1)
- [ ] Document shared utilities (Tier 1)
- [ ] Document complex components (Tier 1)
- [ ] Document admin panels (Tier 2)
- [ ] Document visualizations (Tier 2)
- [ ] Document simple components (Tier 3)
- [ ] Create architecture docs
- [ ] Update READMEs

### Phase 5: Test Coverage
- [ ] Test core stores
- [ ] Test critical hooks
- [ ] Test shared utilities
- [ ] Test complex components
- [ ] Verify coverage thresholds
- [ ] Test critical paths

### Phase 6: Code Refactoring (Optional)
- [ ] Refactor ChatPanel
- [ ] Create unified sphere system
- [ ] Decompose large panels
- [ ] Reorganize directory structure

### Phase 7: Final Verification
- [ ] Run complete quality suite
- [ ] Run full test suite
- [ ] Create summary report
- [ ] Update main README

---

## 🔍 Baseline Metrics (January 4, 2026)

### TypeScript Errors
- **Total errors (web):** 15 errors (all in one test file)
- **Total errors (shared):** 0 errors ✅
- **By category:** Type mismatch in `usePathComparison.test.ts`

### ESLint Errors
- **Total errors:** 230 errors
- **Total warnings:** 90 warnings
- **Total issues:** 320
- **Auto-fixable:** 4 issues
- **By category:**
  - `@typescript-eslint/no-explicit-any`: ~200+ errors (most common)
  - `react-hooks/exhaustive-deps`: Multiple warnings
  - `react-hooks/purity`: 1 error (impure function call)
  - `react/no-unescaped-entities`: ~13 errors
  - `@typescript-eslint/no-unused-vars`: ~90 warnings

### Test Coverage (VERY LOW)
- **Branch coverage:** 3.63% (Target: 70%)
- **Function coverage:** 6.75% (Target: 70%)
- **Line coverage:** 6.77% (Target: 80%)
- **Statement coverage:** 6.73% (Target: 80%)
- **Tests passing:** 244/260 (93.8%)
- **Tests failing:** 16

### Build Status
- **Status:** ✅ SUCCESS
- **Compile time:** 3.3 seconds
- **Warnings:** 0
- **Errors:** 0
- **Routes:** 4 routes built successfully

### Security Audit
- **Status:** Not yet run
- **Will be included in Phase 3**

### Summary
See `BASELINE_REPORT.md` for comprehensive analysis.

---

## 📝 Notes

**Key Differences from Python Modules:**
- Using Prettier instead of black/isort
- Using ESLint instead of flake8/pylint
- Using TypeScript compiler instead of mypy
- Using JSDoc instead of Google-style docstrings
- No pydocstyle equivalent needed (ESLint handles it)

**Philosophy Remains the Same:**
- Comprehensive documentation
- Zero errors/warnings
- High test coverage
- Well-organized code
- Teaching-quality inline comments

---

## 🚀 Next Actions

Starting Phase 1 now...

**Last Updated:** January 4, 2026 - 3:23 PM MT
