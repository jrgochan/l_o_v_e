# Documentation Migration & Organization Plan
**Created**: December 6, 2025, 11:13 PM MDT
**Purpose**: Organize 35+ markdown files into clean, maintainable structure
**Execution Time**: ~30-45 minutes

---

## 🎯 Goals

1. **Clean root directory** - Keep only essential files
2. **Organize by feature** - Group related docs together in `/docs/features/`
3. **Preserve history** - Move session summaries to `/archive/sessions/2025-12/`
4. **Enable discovery** - Create clear navigation with README files
5. **Git-ready** - Structure suitable for separate documentation repo

---

## 📊 Current State (Root Directory)

**35 markdown files** need organization:

### **Keep in Root** (4 files):
- ✅ `README.md` - Project overview
- ✅ `CURRENT_STATUS.md` - Living status
- ✅ `progress.md` - Active tracker
- ✅ `DEVELOPMENT_VS_PRODUCTION.md` - Reference

### **Move to /docs/features/** (22 files):
- Heart Beat Analyzer (3)
- Beautiful Insights (1 progress file)
- Deep Feeling (12 files → consolidate to 3)
- Voice Analysis (3)
- Clinical Tools (3)

### **Move to /archive/sessions/2025-12/** (9 files):
- Cleanup summaries (2)
- Session progress files (7)

---

## 🏗️ Target Structure

```
/docs/
├── README.md (NEW - Feature navigation)
├── architecture/ (EXISTS - keep as-is)
├── features/ (NEW)
│   ├── README.md (Feature index)
│   ├── heartbeat-analyzer/
│   │   ├── SPECIFICATION.md
│   │   ├── IMPLEMENTATION-GUIDE.md
│   │   └── COMPLETION-SUMMARY.md
│   ├── beautiful-insights/ (EXISTS - keep!)
│   │   ├── README.md
│   │   ├── 00-OVERVIEW.md
│   │   ├── 01-WARM-MODE-SPEC.md
│   │   ├── 02-CLINICAL-MODE-SPEC.md
│   │   ├── 03-DEEP-FEELING-ENHANCEMENTS.md
│   │   └── 04-IMPLEMENTATION-GUIDE.md
│   ├── deep-feeling/
│   │   ├── README.md
│   │   ├── OVERVIEW.md
│   │   ├── UI-UX-DESIGN.md
│   │   └── IMPLEMENTATION-SUMMARY.md
│   ├── voice-analysis/
│   │   ├── README.md
│   │   ├── PROSODY-SYSTEM.md
│   │   └── THREE-WAY-ANALYSIS.md
│   ├── clinical-tools/
│   │   ├── README.md
│   │   ├── ALERTS-SYSTEM.md
│   │   └── DASHBOARD.md
│   └── other-features/
│       ├── ATLAS-MAPPING.md
│       └── CHAT-SYSTEM.md
└── guides/
    ├── REFACTORING.md
    └── TROUBLESHOOTING.md

/archive/
├── README.md (UPDATE - add 2025-12 index)
├── sessions/
│   └── 2025-12/
│       ├── README.md (NEW - session index)
│       ├── 06-heartbeat-beautiful-insights.md (NEW - today!)
│       ├── 05-deep-feeling-epic.md (consolidate 12 files)
│       ├── 05-voice-3way-implementation.md
│       ├── 05-cleanup-phase1.md
│       └── 05-cleanup-phase2.md
├── implementation-plans/ (EXISTS)
└── status-reports/ (EXISTS)
```

---

## 📋 Migration Steps

### **Step 1: Create Directory Structure**

```bash
# Create new feature directories
mkdir -p docs/features/heartbeat-analyzer
mkdir -p docs/features/deep-feeling
mkdir -p docs/features/voice-analysis
mkdir -p docs/features/clinical-tools
mkdir -p docs/features/other-features
mkdir -p docs/guides

# Create session directory for Dec 2025
mkdir -p archive/sessions/2025-12
```

### **Step 2: Move Heartbeat Analyzer Docs**

```bash
# Move to /docs/features/heartbeat-analyzer/
mv HEARTBEAT_ANALYZER_SPECIFICATION.md docs/features/heartbeat-analyzer/SPECIFICATION.md
mv HEARTBEAT_ANALYZER_IMPLEMENTATION_GUIDE.md docs/features/heartbeat-analyzer/IMPLEMENTATION-GUIDE.md
mv HEARTBEAT_ANALYZER_COMPLETE.md docs/features/heartbeat-analyzer/COMPLETION-SUMMARY.md
```

### **Step 3: Move Beautiful Insights Progress**

```bash
# Move progress file to /docs/features/beautiful-insights/
mv BEAUTIFUL_INSIGHTS_PROGRESS.md docs/features/beautiful-insights/PROGRESS.md
```

### **Step 4: Organize Deep Feeling Docs**

```bash
# Move to /docs/features/deep-feeling/
mv DEEP_FEELING_IMPLEMENTATION_PLAN.md docs/features/deep-feeling/OVERVIEW.md
mv DEEP_FEELING_UI_UX_DESIGN.md docs/features/deep-feeling/UI-UX-DESIGN.md
mv DEEP_FEELING_FINAL_IMPLEMENTATION_SUMMARY.md docs/features/deep-feeling/IMPLEMENTATION-SUMMARY.md

# Archive session summaries to /archive/sessions/2025-12/
# (Will consolidate these into one file)
mv DEEP_FEELING_SESSION_SUMMARY.md archive/sessions/2025-12/
mv DEEP_FEELING_PHASE1_PROGRESS.md archive/sessions/2025-12/
mv DEEP_FEELING_COMPLETE_SESSION_SUMMARY.md archive/sessions/2025-12/
mv DEEP_FEELING_COMPLETION_PLAN.md archive/sessions/2025-12/
mv DEEP_FEELING_INTEGRATION_SESSION.md archive/sessions/2025-12/
mv DEEP_FEELING_AUDIO_FIX_SESSION.md archive/sessions/2025-12/
mv DEEP_FEELING_FINAL_SESSION_REPORT.md archive/sessions/2025-12/
mv DEEP_FEELING_EPIC_SESSION_FINAL.md archive/sessions/2025-12/
mv DEEP_FEELING_PHASE1_CLINICAL_SESSION.md archive/sessions/2025-12/
mv DEEP_FEELING_NEXT_PHASES_PLAN.md archive/sessions/2025-12/
mv DEEP_FEELING_NEXT_STEPS.md archive/sessions/2025-12/
```

### **Step 5: Organize Voice Analysis Docs**

```bash
mv VOICE_PROSODY_IMPLEMENTATION_PLAN.md docs/features/voice-analysis/PROSODY-SYSTEM.md
mv VOICE_CONTENT_3WAY_ANALYSIS_SPECS.md docs/features/voice-analysis/THREE-WAY-ANALYSIS.md

# Archive progress file
mv VOICE_CONTENT_3WAY_SESSION_PROGRESS.md archive/sessions/2025-12/05-voice-3way-implementation.md
```

### **Step 6: Organize Clinical Tools**

```bash
mv CLINICAL_ALERTS_IMPLEMENTATION.md docs/features/clinical-tools/ALERTS-SYSTEM.md
mv CLINICAL_DASHBOARD_IMPLEMENTATION_PLAN.md docs/features/clinical-tools/DASHBOARD.md
mv PHASE1_CLINICAL_ALERTS_COMPLETE.md archive/sessions/2025-12/05-clinical-alerts-complete.md
```

### **Step 7: Organize Other Features**

```bash
mv ATLAS_EMOTION_MAPPING_PLAN.md docs/features/other-features/ATLAS-MAPPING.md
mv BACKEND_REFACTORING_RECOMMENDATIONS.md docs/guides/REFACTORING.md
mv CHAT_SPLIT_PANEL_TODO.md archive/sessions/2025-12/chat-split-panel-notes.md
```

### **Step 8: Archive Cleanup Summaries**

```bash
mv CLEANUP_2025-12-05_SUMMARY.md archive/sessions/2025-12/05-cleanup-phase1.md
mv CLEANUP_2025-12-05_PHASE2_SUMMARY.md archive/sessions/2025-12/05-cleanup-phase2.md
```

---

## 📝 Files to Create

### **1. /docs/README.md** (Navigation hub)
### **2. /docs/features/README.md** (Feature index with status)
### **3. /docs/features/heartbeat-analyzer/README.md**
### **4. /docs/features/deep-feeling/README.md**
### **5. /docs/features/voice-analysis/README.md**
### **6. /docs/features/clinical-tools/README.md**
### **7. /docs/features/other-features/README.md**
### **8. /docs/guides/README.md**
### **9. /archive/sessions/2025-12/README.md** (Session index)
### **10. /archive/sessions/2025-12/06-heartbeat-beautiful-insights.md** (Today's session!)

---

## ✅ Verification Checklist

After migration:
- [ ] Root directory has only 4 markdown files
- [ ] All features have complete docs in /docs/features/
- [ ] All session summaries in /archive/sessions/2025-12/
- [ ] Every directory has a README
- [ ] Navigation is clear from /docs/README.md
- [ ] Git status shows clean reorganization

---

## 🎯 Expected Outcome

**Root Directory**: Clean (4 markdown files)
**`/docs/`**: Organized, discoverable, current
**`/archive/`**: Complete historical record
**Navigation**: Clear README files throughout
**Git-Ready**: Structure suitable for documentation repo

---

**Status**: Ready for Execution
**Next**: Execute migration commands
