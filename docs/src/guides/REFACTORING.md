# Backend Refactoring Recommendations

**Created:** December 6, 2025  
**Purpose:** Document frontend logic that should be moved to backend APIs  
**Status:** 📋 Recommendations for Future Implementation

---

## 🎯 Executive Summary

This document identifies frontend logic in the admin web application that should be moved to backend APIs in the Listener, Observer, or Versor modules. The primary concerns are:

1. **Clinical/medical decision logic** should not reside in frontend
2. **Business logic** should be centralized and versioned
3. **Complex computations** should happen server-side for consistency
4. **Audit trails** require server-side implementation

**Key Findings:**

- **5 major areas** of frontend logic need backend refactoring
- **Observer module** will handle 80% of the work
- **Listener module** needs minor enhancements
- **Versor module** not needed for current refactoring

---

## 📊 Priority Matrix

| Area | Priority | Module | Complexity | Impact |
|------|----------|--------|------------|--------|
| Clinical Alert Detection | 🔴 High | Observer | Medium | High |
| Clinical Interpretations | 🔴 High | Observer | Medium | High |
| Session Analytics | 🟡 Medium | Observer | Low | Medium |
| Path Analysis Helpers | 🟢 Low | Observer | Low | Low |
| Audio Waveform Processing | 🟢 Low | Listener | Medium | Low |

---

## 🔍 Detailed Findings

### 1. Clinical Alert Detection & Classification

**Priority:** 🔴 HIGH  
**Target Module:** Observer  
**Current Location:** `experience/web/components/admin/ClinicalDashboard.tsx` (lines 49-101)

**Problem:**
The frontend contains complex clinical decision logic including:

- High distress detection: `arousal > 0.7 && valence < -0.5`
- Voice quality thresholds: `HNR < 5 = poor quality`
- Jitter thresholds: `jitter > 3% = attention needed`
- Pitch range assessment: `range < 50 Hz = flat affect`
- Confidence scoring: `< 0.6 = low confidence`

**Why It's a Problem:**

- Medical/clinical thresholds should be validated by experts
- Thresholds may need adjustment based on research
- No audit trail of alert decisions
- Inconsistent if logic duplicated elsewhere
- Cannot be A/B tested or configured per clinician

**Recommendation:**
Move to `observer/app/services/clinical_alert_service.py`

---

### 2. Clinical Prosody Interpretations

**Priority:** 🔴 HIGH  
**Target Module:** Observer  
**Current Location:** `experience/web/components/admin/clinical/ProsodyVisualization.tsx` (lines 219-253)

**Problem:**
Medical interpretations embedded in UI component:

- "High vocal energy may indicate heightened emotional arousal, stress, or activation"
- "Low pitch variability may indicate flat affect or emotional suppression"
- "Rapid speech rate may indicate anxiety, mania, or pressured thought"

**Why It's a Problem:**

- Clinical interpretations should come from validated medical knowledge
- Updates require frontend deployment
- Cannot be personalized or configured
- No way to track interpretation accuracy

**Recommendation:**
Move to enhanced `observer/app/services/insight_generator.py`

---

### 3. Session Metrics Calculation

**Priority:** 🟡 MEDIUM  
**Target Module:** Observer  
**Current Location:** `experience/web/components/admin/ChatPanel.tsx` (lines 219-242)

**Problem:**
Business logic for session analysis in frontend:

- Emotion counting and averaging
- Confidence score aggregation
- Alert counting by category
- Dominant category determination

**Why It's a Problem:**

- Cannot persist session data for historical analysis
- No database record of sessions
- Cannot query across sessions
- Recalculated on every page load

**Recommendation:**
Create `observer/app/services/session_analytics_service.py`

---

### 4. Path Analysis Helper Functions

**Priority:** 🟢 LOW  
**Target Module:** Observer  
**Current Location:** `experience/web/hooks/usePathCalculator.ts` (lines 145-170)

**Problem:**
Domain knowledge about emotion atlas in frontend:

- Difficulty level normalization
- Bridge emotion detection (hardcoded list)
- Bridge emotion extraction

**Why It's a Problem:**

- Domain knowledge should be centralized
- Bridge emotions list should be data-driven
- Cannot update without frontend deployment

**Recommendation:**
Move to `observer/app/services/path_matrix_service.py`

---

### 5. Audio Waveform Processing

**Priority:** 🟢 LOW  
**Target Module:** Listener  
**Current Location:** `experience/web/components/admin/clinical/ProsodyVisualization.tsx` (lines 24-60)

**Problem:**
Web Audio API usage in browser:

- Decoding audio blobs
- RMS calculation for visualization
- Sample normalization

**Why It's a Problem:**

- Duplicates work already done in Listener
- Inconsistent processing between client/server
- Unnecessary client-side computation

**Recommendation:**
Add waveform data to `listener/app/services/prosody_analyzer.py` output

---

## 📋 Implementation Plans

See separate detailed implementation documents:

- [CLINICAL_ALERTS_IMPLEMENTATION.md](./CLINICAL_ALERTS_IMPLEMENTATION.md) - Phase 1 (High Priority)
- [SESSION_ANALYTICS_IMPLEMENTATION.md](./SESSION_ANALYTICS_IMPLEMENTATION.md) - Phase 2 (Medium Priority)
- [PATH_HELPERS_IMPLEMENTATION.md](./PATH_HELPERS_IMPLEMENTATION.md) - Phase 3 (Low Priority)

---

## ✅ What's Already Done Well

**Keep in Frontend (Pure Visualization):**

- ✅ 3D Soul Sphere rendering (Three.js/WebGL)
- ✅ Interactive emotion navigation
- ✅ UI state management (Zustand stores)
- ✅ Animation and transitions
- ✅ Layout and panel management
- ✅ Keyboard shortcuts
- ✅ Visual effects and particles

**Already Using Backend Correctly:**

- ✅ Path computation API calls (Observer)
- ✅ Recommendation engine API calls (Observer)
- ✅ WebSocket-based real-time analysis
- ✅ Transcription and semantic analysis (Listener)
- ✅ Emotion detection pipeline (Listener → Observer)
- ✅ Basic insight generation (Observer)

---

## 🎯 Recommended Implementation Order

### Phase 1: Critical Clinical Logic (2-3 days)

**Goal:** Remove medical decision-making from frontend

1. Create `ClinicalAlertService` in Observer
2. Enhance `InsightGenerator` with clinical interpretations
3. Update WebSocket to send alert data
4. Frontend becomes pure display layer

**Files to Create/Modify:**

- NEW: `observer/app/services/clinical_alert_service.py`
- NEW: `observer/app/models/clinical_alert.py`
- MODIFY: `observer/app/services/insight_generator.py`
- MODIFY: `observer/app/api/routes/chat_websocket.py`
- MODIFY: `experience/web/components/admin/ClinicalDashboard.tsx`

### Phase 2: Session Analytics (2-3 days)

**Goal:** Server-side session tracking

1. Create `SessionAnalyticsService` in Observer
2. Add database models and migrations
3. Create REST + WebSocket endpoints
4. Update frontend to consume backend analytics

**Files to Create/Modify:**

- NEW: `observer/app/services/session_analytics_service.py`
- NEW: `observer/app/models/session_analytics.py`
- NEW: `observer/migrations/versions/add_session_analytics.sql`
- NEW: `observer/app/api/routes/session_analytics.py`
- MODIFY: `experience/web/components/admin/ChatPanel.tsx`

### Phase 3: Path Helpers (1 day)

**Goal:** Centralize domain knowledge

1. Move helpers to `PathMatrixService`
2. Update API responses
3. Update frontend to use new response format

**Files to Modify:**

- MODIFY: `observer/app/services/path_matrix_service.py`
- MODIFY: `observer/app/api/routes/transitions.py`
- MODIFY: `experience/web/hooks/usePathCalculator.ts`

### Phase 4: Audio Enhancement (1-2 days)

**Goal:** Complete audio analysis in backend

1. Add waveform sampling to Listener
2. Include in prosody output
3. Remove Web Audio API from frontend

**Files to Modify:**

- MODIFY: `listener/app/services/prosody_analyzer.py`
- MODIFY: `experience/web/components/admin/clinical/ProsodyVisualization.tsx`

---

## 📈 Expected Benefits

### Immediate Benefits

- ✅ Clinical logic centralized and auditable
- ✅ Consistent interpretations across platform
- ✅ Easier to update thresholds and rules
- ✅ Better separation of concerns
- ✅ Reduced frontend bundle size

### Long-term Benefits

- ✅ Session data persistence for historical analysis
- ✅ A/B testing of clinical thresholds
- ✅ Clinician-specific configurations
- ✅ Audit trails for compliance
- ✅ Machine learning on session data
- ✅ Cross-session analytics and trends

---

## 🔄 Migration Strategy

1. **Backend First:** Implement new backend services
2. **Parallel Operation:** Run old and new logic simultaneously
3. **Validation:** Compare results, ensure accuracy
4. **Feature Flag:** Enable new backend logic via config
5. **Frontend Update:** Switch to backend data
6. **Cleanup:** Remove old frontend logic

---

## 📝 Next Steps

1. Review this document with team
2. Prioritize phases based on product roadmap
3. Create detailed technical specs for Phase 1
4. Estimate effort and assign resources
5. Plan sprint(s) for implementation

---

**Document Status:** 📋 Ready for Review  
**Last Updated:** December 6, 2025  
**Author:** Cline (AI Assistant)
