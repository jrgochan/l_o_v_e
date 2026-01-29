# Remaining Tasks & Roadmap (Native Swift)

**Last Updated:** 2026-01-28
**Context:** Post-Phase 42 (Dataset UI & Settings)

This document outlines the remaining work required to achieve full feature parity with the legacy stack, complete the "Liquid Intelligence" vision, and prepare for comprehensive distribution.

---

## 🟢 Immediate Priorities (Phase 42-43)

### 1. Dataset UI Verification (Phase 42 Wrap-up)
- [ ] **Manual Verification**: Launch app, switch from "GoEmotions" to "Plutchik", verify 3D Nebula updates and "Explore" list reflects 8 emotions.
- [ ] **Persistence Check**: Restart app and verify "Plutchik" remains active.

### 2. Semantic Search Upgrade (GAP DETECTED)
The current `AdminDashboardView` uses simple string matching (`localizedCaseInsensitiveContains`) for the "Explore" tab. The backend (`VectorIndex`) supports semantic search, but it is not wired to the UI.
- [ ] **Wire `SoulCore.VectorIndex` to UI**: Update `AdminDashboardView` to use `DependencyContainer.search(query:)` (needs implementation) instead of local array filtering.
- [ ] **Search Mode Toggle**: Allow user to toggle between "Exact Name" (Filter) and "Conceptual" (Vector) search.

### 3. "Views" Tab Decision
The `Views` tab in Admin Dashboard is currently a placeholder ("Coming Soon").
- [ ] **Decision**: Either remove the tab (since "Visual Modes" moved to Settings/HUD) OR implement "Camera Presets".
- [ ] **RFC Proposal**: Implement "Bookmarks" – allowing users to save specific Camera Position + Visual Mode + Active Emotion combos.

---

## 🟡 Codebase/Architecture Gaps

### 4. Journey/History Visualization
- [ ] **Session Replay**: Visualize the `UserJourney` (history of visited emotions) as a 3D spline in the nebula. (RFC "Future Consideration").
- [ ] **Analytics View**: Visualize `SessionAnalytics` data (Heart Rate trends vs Vibe shifts) in a chart.

### 5. Strategy Implementation
- [ ] **Strategy Execution**: While `StrategyCardView` exists, verify that completing a strategy actually *updates* the `SoulBrain` context or `Memory` effectively.
- [ ] **Feedback Loop**: Does the user's success with a strategy influence future suggestions? (Likely a v2 feature).

### 6. Unit Test Coverage
- [ ] **UI Tests**: Add UI tests for the "Journey" flow.
- [ ] **Integration Tests**: Verify the `LLMEngine` RAG pipeline with a mock embedder.

---

## 🔵 Future Roadmap (The Fluid Soul)

### 7. Mobile/Universal Design (RFC 002)
- [ ] **Touch Adaptation**: Refactor `SoulView` gestures for multi-touch (Pinch to zoom, Two-finger rotate).
- [ ] **Fluid Layout**: Ensure Sidebar/Detail adapts to iPadOS SplitView behavior.
- [ ] **Haptic Parity**: Verify `CoreHaptics` patterns feel correct on iPhone (Linear Actuator vs Mac Trackpad).

### 8. Ecosystem & Distribution
- [ ] **App Store Readiness**: Add `Entitlements` (Microphone, Speech, File Access).
- [ ] **Release Build Optimization**: Strip debug symbols, optimize Metal shaders for binary size.

---

## 🔴 Known Issues / Tech Debt

- **Jest/JS Parity**: Existing Next.js tests are failing (modules not found). While external to *native-swift*, ensuring the "Reference Implementation" works is valuable for behavior verification.
- **Metal Shader Lints**: There are persistent warnings about `metal_stdlib` imports in headers. These are harmless for build but clutter the logs.
- **Hardcoded "GoEmotions" Default**: Ensure fallback is robust if `DatabaseSeeder` fails.
