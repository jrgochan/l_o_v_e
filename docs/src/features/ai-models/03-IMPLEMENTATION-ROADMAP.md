# AI Model Management - Implementation Roadmap

## Phased Rollout Plan

**Created**: December 7, 2025  
**Status**: Planning Phase  
**Total Estimated Time**: 20-25 hours

---

## 🎯 Implementation Phases

### Phase 1: Backend Foundation (6-8 hours)

#### 1.1 Ollama Manager Service (3-4 hours)

**File**: `listener/app/services/ollama_manager.py`

- [ ] Create `OllamaManager` class
- [ ] Implement `list_local_models()`
- [ ] Implement `pull_model()` with streaming progress
- [ ] Implement `delete_model()`
- [ ] Implement `get_model_details()`
- [ ] Add helper functions (RAM estimation, speed estimation)
- [ ] Unit tests for all methods
- [ ] Error handling and retries

#### Deliverables

- Working Ollama API client
- Comprehensive test coverage
- Type-safe Pydantic models

#### Warm Mode Additionsment Service (2-3 hours)

**File**: `observer/app/services/ai_model_service.py`

- [ ] Create `AIModelService` class
- [ ] Implement `get_model_assignments()`
- [ ] Implement `assign_model()`
- [ ] Implement `get_a# Assessment for Clinical Action()`
- [ ] Add validation (model exists before assignment)
- [ ] Unit tests

#### Phase 1 Deliverables

- Model assignm# Technical Deep-Dive: Ollama Model Integration
- Fallback handling

#### 1.3 Database Migration (1 hour)

**File**: `observer/migrations/versions/add_model_management.sql`

- [ ] Create `model_assignments` table
- [ ] Create `model_performance_metrics` table
- [ ] Seed default assignments
- [ ] Add indexes
- [ ] Test migration up/down

#### Phase 2 Deliverables

- Database schema
- Default data

---

### Phase 2: API Endpoints (4-6 hours)

#### 2.1 Listener Model Endpoints (2-3 hours)

**File**: `listener/app/api/routes/ai_models.py`

- [ ] `GET /ai/models/local` - List local models
- [ ] `POST /ai/models/pull` - Start model pull
- [ ] `WS /ai/models/pull/{task_id}` - Stream progress
- [ ] `DELETE /ai/models/{model_name}` - Delete model
- [ ] `GET /ai/models/{model_name}/details` - Model details
- [ ] Integration tests
- [ ] API documentation

#### Deliverables

- 5 new endpoints
- WebSocket progress streaming
- FastAPI auto-docs updated

#### 2.2 Observer Assignment Endpoints (2-3 hours)

**File**: `observer/app/api/routes/ai_settings.py`

- [ ] `GET /ai/assignments` - Get current assignments
- [ ] `POST /ai/assignments` - Update assignment
- [ ] `GET /ai/recommendations` - Get recommendations
- [ ] `GET /ai/performance` - Get performance metrics
- [ ] Integration tests
- [ ] API documentation

#### Phase 3 Deliverables

- 4 new endpoints
- Type-safe request/response schemas

---

### Phase 3: Update Existing Services (3-4 hours)

#### 3.1 Semantic Analyzer (1 hour)

**File**: `listener/app/services/semantic_analyzer.py`

- [ ] Remove hard-coded model
- [ ] Fetch model from assignment service
- [ ] Add fallback logic
- [ ] Track performance metrics
- [ ] Test with different models

#### Multi-Emotion Narrative (added after opening)

**File**: `listener/app/services/multi_emotion_analyzer.py`

- [ ] Remove hard-coded model
- [ ] Fetch model from assignment service
- [ ] Add fallback logic
- [ ] Track performance metrics

#### Relationship Insights (added after VAC interpretation)

**File**: `observer/app/services/insight_generator.py`

- [ ] Remove hard-coded model  
- [ ] Fetch model from assignment service
- [ ] Add fallback logic
- [ ] Track performance metrics

#### Pattern Analysis (after biomarkers)

**File**: `listener/app/services/atlas_mapper.py`

- [ ] Remove hard-coded model
- [ ] Fetch model from assignment service
- [ ] Add fallback logic

---

### Phase 4: Frontend Components (5-6 hours)

#### 4.1 Data Hooks (2 hours)

**Files**:

- `experience/web/hooks/useOllamaModels.ts`
- `experience/web/hooks/useModelAssignments.ts`

- [ ] Implement `useOllamaModels` hook
- [ ] Implement `useModelAssignments` hook
- [ ] WebSocket connection for pull progress
- [ ] Error handling and retry logic
- [ ] Loading states

#### 4.2 UI Components (3-4 hours)

**Files**: `experience/web/components/admin/ai-models/`

- [ ] `ModelLibrary.tsx` - List of models
- [ ] `ModelCard.tsx` - Individual model display
- [ ] `FunctionAssignments.tsx` - Assignment interface
- [ ] `PullProgressDialog.tsx` - Download progress
- [ ] `ModelTester.tsx` - Test before assign
- [ ] `SystemResources.tsx` - Resource monitoring

---

### Phase 5: Settings Page Integration (2-3 hours)

#### 5.1 Add AI Models Tab (1 hour)

**File**: `experience/web/app/admin/settings/page.tsx`

- [ ] Add "AI Models" tab to settings
- [ ] Layout two-column (library + assignments)
- [ ] Add system resources footer
- [ ] Navigation and routing

#### 5.2 Settings Store Updates (1 hour)

**File**: `experience/web/stores/useSettingsStore.ts`

- [ ] Add `modelAssignments` to store
- [ ] Add act# Mirror for Self-Understanding assignments
- [ ] Persist to localStorage
- [ ] Sync with backend on load

#### 5.3 Polish & UX (1 hour)

- [ ] Toast notifications
- [ ] Confirmation dialogs
- [ ] Loading skeletons
- [ ] Error messages
- [ ] Keyboard shortcuts

---

### Phase 6: Testing & Documentation (2-3 hours)

#### 6.1 Integration Testing (1-2 hours)

- [ ] Test full workflow: download → assign → use
- [ ] Test progress streaming
- [ ] Test model switching
- [ ] Test fallback logic
- [ ] Test resource warnings
- [ ] Test deletion

#### 6.2 Documentation (1 hour)

- [ ] User guide (how to manage models)
- [ ] API documentation updates
- [ ] Troubleshooting guide
- [ ] Performance benchmarks
- [ ] Model recommendations guide

---

## 📅 Suggested Schedule

### Week 1: Backend

**Days 1-2**: Backend foundation

- OllamaManager service
- AIModelService
- Database migration

**Days 3-4**: API endpoints

- Listener model endpoints
- Observer assignment endpoints
- Testing

**Day 5**: Update existing services

- All 4 AI functions updated
- Integration testing

### Week 2: Frontend

**Days 1-2**: Core components

- Data hooks
- UI components (model cards, assignments)

**Days 3-4**: Setting# User Interface Design for Model Settings page

- Store updates
- Polish UX

**Day 5**: Testing & docs

- End-to-end testing
- Documentation
- Bug fixes

---

## 🎯 Milestones

### Milestone 1: Backend API Ready (After Phase 2)

**Success Criteria**:

- ✅ Can list models via API
- ✅ Can pull models via API (with progress)
- ✅ Can assign models via API
- ✅ Assignments persist in database

**Validation**:

```bash
# Test with curl
curl http://localhost:8002/listener/ai/models/local
curl -X POST http://localhost:8002/listener/ai/models/pull -d '{"name":"phi-3:mini"}'
curl http://localhost:8000/observer/ai/assignments
```

### Milestone 2: Services#### Complexity Assessment (added after quadrant)

**Success Criteria**:

- ✅ Semantic analyzer uses assigned model
- ✅ Multi-emotion uses assigned model
- ✅ Insights use assigned model
- ✅ Atlas mapping uses assigned model

**Validation**:

- Assign different model to function
- Trigger analysis
- Verify correct model used (check logs)

### Milestone 3: UI Complete (After Phase 4)

**Success Criteria**:

- ✅ Can view local models
- ✅ Can download models with progress
- ✅ Can assign models to functions
- ✅ Can delete models
- ✅ System resources displayed

**Validation**:

- Walk through all user workflows
- No console errors
- Responsive design works

### Milestone 4: Production Ready (After Phase 6)

**Success Criteria**:

- ✅ All tests passing
- ✅ Documentation complete
- ✅ Performance acceptable
- ✅ Error handling robust
- ✅ User feedback positive

---

## 🚧 Risks & Mitigation

### Risk 1: Ollama API Changes

**Mitigation**:

- Pin Ollama version in documentation
- Test against specific version
- Monitor Ollama releases
- Update when needed

### Risk 2: Model Download Failures

**Mitigation**:

- Retry logic with exponential backoff
- Resume interrupted downloads
- Clear error messages
- Fallback to default model

### Risk 3: Resource Exhaustion

**Mitigation**:

- Check resources before download
- Warn user if insufficient
- Monitor RAM/disk during operation
- Automatic model unloading if needed

### Risk 4: Performance Degradation

**Mitigation**:

- Track metrics automatically
- Alert if latency > threshold
- Suggest reverting to faster model
- A/B test before full rollout

---

## 🔧 Development Workflow

### Backend Development

```bash
# 1. Create branch
git checkout -b feature/ai-model-management

# 2. Implement backend
cd listener
source venv/bin/activate
# Create ollama_manager.py
pytest tests/services/test_ollama_manager.py -v

# 3. Add endpoints
# Create api/routes/ai_models.py
pytest tests/api/test_ai_models.py -v

# 4. Update existing services
# Modify semantic_analyzer.py
pytest tests/services/test_semantic_analyzer.py -v
```

### Frontend Development

```bash
# 1. Create hooks
cd experience/web
# Create hooks/useOllamaModels.ts
npm test -- useOllamaModels

# 2. Create components
# Create components/admin/ai-models/
npm run dev  # Test in browser

# 3. Add to settings
# Update app/admin/settings/page.tsx
```

### Integration Testing

```bash
# 1. Start full stack
cd infra
./run-love-stack.sh

# 2. Test workflows
open http://localhost:3000/admin/settings
# Manual testing of all workflows

# 3. Automated E2E
npm run test:e2e
```

---

## 📊 Success Metrics

### Performance Metrics

- Model list load time: < 500ms
- Model pull initiation: < 1s
- Progress updates: Real-time (< 100ms delay)
- Assignment change: < 200ms
- Resource check: < 100ms

### Quality Metrics

- Download success rate: > 95%
- Model loading success: > 99%
- Assignment persistence: 100%
- UI responsiveness: 60 FPS

### User Metrics

- Users who try different models: Track
- Average models per user: Track
- Most popular models: Track
- Performance improvements realized: Track

---

## 🔮 Future Phases

### Phase 7: Advanced Features (Future)

- [ ] Model comparison tool
- [ ] Automatic optimization
- [ ] Community ratings
- [ ] Model marketplace
- [ ] Custom fine-tuned models

### Phase 8: Enterprise Features (Future)

- [ ] Organization-wide model policies
- [ ] Centralized model repository
- [ ] Usage quotas and limits
- [ ] Audit logging
- [ ] Cost tracking

---

## 💡 Quick Wins (Can Do Early)

Before full implementation:

1. **Add model name to logs** (1 hour)
   - See which model was used for each analysis
   - Helps debugging

### 2. Dynamic Model Selection & Management

**Environment variable** (1 hour)

- `SEMANTIC_VAC_MODEL=phi-3:mini`
- Quick experimentation without UI

1. **Performance benchmarking script** (2 hours)
   - Test all models on same data
   - Generate comparison report
   - Informs recommendations

---

## 🎯 Definition of Done

### Completion Criteria

1. ✅ Backend can list/pull/delete/assign models
2. ✅ Database stores assignments and metrics
3. ✅ All AI functions use assigned models
4. ✅ Frontend displays models beautifully
5. ✅ Users can download models with progress
6. ✅ Users can assign models to functions
7. ✅ System resources are monitored
8. ✅ Performance metrics are tracked
9. ✅ All tests passing
10. ✅ Documentation complete

---

**Status**: Detailed plan complete, ready for implementation  
**Next**: Create README.md to tie everything together
