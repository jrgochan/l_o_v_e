# Observer Module - Comprehensive Testing Plan

**Goal:** 100% test coverage  
**Strategy:** Unit tests → Integration tests → Semantic validation  
**Test Database:** Same PostgreSQL container (isolated test data)

---

## 📋 Test Suite Overview

### Total Test Count: ~60 tests

| Category | Tests | Priority | Coverage Target |
|----------|-------|----------|-----------------|
| **Unit Tests** | ~35 | HIGH | 100% of services |
| **Integration Tests** | ~15 | MEDIUM | All API endpoints |
| **Semantic Tests** | ~10 | CRITICAL | Emotion distinctions |

---

## 🧪 Unit Tests (tests/unit/)

### test_embedding_service.py (~8 tests)

**Coverage: EmbeddingService, LocalEmbeddingProvider, OpenAIEmbeddingProvider**

- [ ] `test_local_provider_initialization` - Model loads correctly
- [ ] `test_local_embedding_generation` - Generates correct dimension
- [ ] `test_embedding_dimension_property` - Returns correct dim
- [ ] `test_text_preprocessing` - Cleans whitespace, line breaks
- [ ] `test_empty_text_raises_error` - ValueError on empty string
- [ ] `test_batch_embedding_generation` - Multiple texts at once
- [ ] `test_openai_provider_requires_api_key` - Fails without key
- [ ] `test_provider_auto_detection` - Selects based on settings

---

### test_quaternion_builder.py (~10 tests)

**Coverage: QuaternionBuilder**

- [ ] `test_vac_validation_success` - Valid VAC passes
- [ ] `test_vac_validation_out_of_range` - Raises ValueError
- [ ] `test_vac_validation_wrong_length` - Raises ValueError  
- [ ] `test_http_api_call_success` - Mocked Versor response
- [ ] `test_http_api_call_failure` - Handles connection errors
- [ ] `test_quaternion_is_unit_length` - Validates ||q|| = 1.0
- [ ] `test_quaternion_dict_conversion` - List ↔ Dict
- [ ] `test_direct_import_mode` - Uses Versor package (skip if not installed)
- [ ] `test_response_parsing` - Extracts current_state correctly
- [ ] `test_singleton_pattern` - get_quaternion_builder returns same instance

---

### test_emotion_mapper.py (~10 tests)

**Coverage: EmotionMapper**

- [ ] `test_vac_distance_calculation` - Euclidean distance correct
- [ ] `test_semantic_distance_calculation` - Cosine distance correct
- [ ] `test_weighted_fusion_short_text` - 80/20 weighting
- [ ] `test_weighted_fusion_long_text` - 40/60 weighting
- [ ] `test_find_nearest_vac_only` - Works without embedding
- [ ] `test_find_nearest_with_embedding` - Combined distance
- [ ] `test_top_k_retrieval` - Returns K nearest emotions
- [ ] `test_zero_vector_handling` - Max distance for zeros
- [ ] `test_normalization_scales` - Distances normalized correctly
- [ ] `test_empty_atlas_raises_error` - ValueError if no emotions

---

### test_metrics_calculator.py (~7 tests)

**Coverage: MetricsCalculator**

- [ ] `test_angular_distance_calculation` - arccos(|q1·q2|) correct
- [ ] `test_elasticity_calculation` - E = θ / Δt
- [ ] `test_zero_delta_time` - Returns 0.0 elasticity
- [ ] `test_rigidity_calculation` - R = 1 / variance
- [ ] `test_rigidity_insufficient_data` - Returns 0.0 with <2 states
- [ ] `test_flooding_detection` - Triggers at E > 2.0
- [ ] `test_stuckness_detection` - High R + negative V

---

## 🔗 Integration Tests (tests/integration/)

### test_api_endpoints.py (~10 tests)

**Coverage: FastAPI routes end-to-end**

- [ ] `test_health_endpoint_healthy` - Returns healthy with 87 emotions
- [ ] `test_health_endpoint_degraded` - Returns degraded with <87
- [ ] `test_health_endpoint_database_down` - 503 error
- [ ] `test_state_recording_success` - Full pipeline works
- [ ] `test_state_recording_invalid_vac` - 422 validation error
- [ ] `test_state_recording_stores_correctly` - Verifies DB entry
- [ ] `test_state_recording_calculates_metrics` - Elasticity/rigidity present
- [ ] `test_state_recording_previous_state` - Links to previous correctly
- [ ] `test_root_endpoint` - Returns API info
- [ ] `test_swagger_documentation` - /docs accessible

---

### test_database_operations.py (~5 tests)

**Coverage: SQLAlchemy models and queries**

- [ ] `test_atlas_definition_creation` - Model creates correctly
- [ ] `test_user_trajectory_creation` - Model with vectors works
- [ ] `test_foreign_key_relationship` - dominant_emotion_id links
- [ ] `test_vector_column_storage` - pgvector arrays store/retrieve
- [ ] `test_concurrent_writes` - No race conditions

---

## 🎯 Semantic Validation Tests (tests/semantic/)

### test_compassion_pity.py (~3 tests)

**THE CRITICAL TEST**

- [ ] `test_compassion_positive_connection` - [0.5, 0.2, 0.9] → Compassion
- [ ] `test_pity_negative_connection` - [-0.3, -0.1, -0.7] → Pity
- [ ] `test_compassion_pity_distinction` - Must be different emotions

---

### test_connection_axis_validation.py (~7 tests)

**Verify Connection axis works as designed**

- [ ] `test_grief_positive_connection` - Grief has +0.5 Connection
- [ ] `test_shame_maximum_negative` - Shame has -1.0 Connection
- [ ] `test_belonging_maximum_positive` - Belonging has +1.0 Connection
- [ ] `test_pride_vs_hubris` - Same V/A, opposite Connection
- [ ] `test_schadenfreude_vs_freudenfreude` - Opposite Connection
- [ ] `test_fitting_in_negative_connection` - Disconnection from self
- [ ] `test_vulnerability_positive_connection` - Gateway to connection

---

## 🏗️ Test Infrastructure Files

### 1. pytest.ini
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts = 
    -v
    --cov=app
    --cov-report=html
    --cov-report=term-missing
markers =
    unit: Unit tests (no database)
    integration: Integration tests (requires database)
    semantic: Semantic validation tests (critical)
```

### 2. tests/conftest.py
```python
# Shared fixtures for all tests
- test_db_session
- seeded_test_atlas (subset of emotions)
- mock_versor_client
- sample_vac_vectors
- test_user_factory
```

### 3. tests/test_data.py
```python
# Canonical test vectors
JOY_VAC = [0.9, 0.7, 0.8]
SHAME_VAC = [-0.9, -0.1, -1.0]
COMPASSION_VAC = [0.5, 0.2, 0.9]
PITY_VAC = [-0.3, -0.1, -0.7]
GRIEF_VAC = [-0.9, -0.4, 0.5]
```

---

## 📈 Coverage Goals

### Phase 1: Essential Tests (Day 1)
**Target: 60% coverage**
- pytest.ini + conftest.py
- THE CRITICAL TEST
- test_embedding_service.py
- test_api_endpoints.py (basic)

### Phase 2: Core Tests (Day 2)
**Target: 85% coverage**
- test_quaternion_builder.py
- test_emotion_mapper.py
- test_metrics_calculator.py

### Phase 3: Complete Suite (Day 3)
**Target: 100% coverage**
- Remaining integration tests
- All semantic tests
- Edge cases
- Error scenarios

---

## 🎯 Success Criteria

✅ **All tests passing**  
✅ **100% code coverage** (or as close as possible)  
✅ **THE CRITICAL TEST passes** (Compassion ≠ Pity)  
✅ **No flaky tests** (deterministic)  
✅ **Fast execution** (< 30 seconds for unit tests)  
✅ **Good documentation** (docstrings explain what/why)

---

## 🚀 Next Steps

**Ready to implement:**
1. Create pytest.ini
2. Create tests/conftest.py with fixtures
3. Create tests/test_data.py with canonical vectors
4. Implement THE CRITICAL TEST
5. Implement test_embedding_service.py

**Then expand to full coverage in subsequent iterations.**

---

**This plan provides a clear roadmap to 100% test coverage!** 🎯
