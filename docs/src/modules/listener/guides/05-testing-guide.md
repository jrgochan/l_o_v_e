# Testing Guide

**Reading Time:** ~25 minutes
**Audience:** New developers
**Prerequisites:** [Common Tasks](04-common-tasks.md) complete
**Goal:** Learn how to write and run tests for the Listener

---

## Why Testing Matters

Testing is not optional—it's how we ensure the Listener works correctly and doesn't break when we make changes.

**Three reasons testing is critical:**

1. **Prevents bugs:** Catch issues before they reach users
2. **Enables refactoring:** Make changes confidently
3. **Documents behavior:** Tests show how code should work

---

## Types of Tests

The Listener has three types of tests:

```text
tests/
├── unit/           # Test individual functions
├── semantic/       # Test VAC extraction (THE CRITICAL TESTS!)
└── integration/    # Test full pipeline
```

### 1. Unit Tests

**What:** Test individual functions in isolation
**Example:** Testing that PII scrubber removes names
**Speed:** Fast (milliseconds)

### 2. Semantic Tests

**What:** Test that VAC extraction works correctly
**Example:** Pity vs. Compassion distinction
**Speed:** Slow (seconds - calls LLM)
**Importance:** ⭐⭐⭐⭐⭐ CRITICAL!

### 3. Integration Tests

**What:** Test multiple components together
**Example:** Full audio → transcription → VAC pipeline
**Speed:** Slowest (seconds to minutes)

---

## Running Tests

### Run All Tests

```bash
# From listener/ directory
pytest tests/ -v
```

Expected output:

```text
tests/unit/test_pii_scrubber.py::test_scrub_names PASSED
tests/unit/test_transcription.py::test_transcribe_text PASSED
tests/semantic/test_connection_axis.py::test_pity_vs_compassion PASSED
tests/integration/test_full_pipeline.py::test_full_pipeline PASSED

========== 25 passed in 45.2s ==========
```

### Run Specific Test Categories

```bash
# Only unit tests (fast)
pytest tests/unit/ -v

# Only semantic tests (critical!)
pytest tests/semantic/ -v

# Only integration tests (slow)
pytest tests/integration/ -v
```

### Run a Single Test File

```bash
pytest tests/semantic/test_connection_axis.py -v
```

### Run a Single Test Function

```bash
pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -v
```

### Run with More Detail

```bash
# Very verbose (shows everything)
pytest tests/ -vv

# Show print statements
pytest tests/ -s

# Stop at first failure
pytest tests/ -x
```

---

## The Sacred Test: Pity vs. Compassion

This test validates the entire VAC model innovation. **If this test fails, the Connection axis doesn't work!**

**File:** `tests/semantic/test_connection_axis.py`

```python
def test_pity_vs_compassion():
    """
    THE CRITICAL TEST

    This test validates the core innovation: the Connection axis.
    Pity and compassion both involve witnessing suffering, but:
    - Pity = feeling FOR someone (separation) → Connection < 0
    - Compassion = feeling WITH someone (alignment) → Connection > 0.5

    If this test fails, our innovation is broken!
    """
    analyzer = get_semantic_analyzer()

    # Test Pity (negative connection - separation)
    pity_result = analyzer.analyze_sync("I feel sorry for them, they're struggling")

    assert pity_result.vac.connection < 0, \
        f"Pity should have negative Connection! Got {pity_result.vac.connection}"

    assert pity_result.primary_emotion in ["Pity", "Sympathy"], \
        f"Expected Pity or Sympathy, got {pity_result.primary_emotion}"

    # Test Compassion (positive connection - alignment)
    compassion_result = analyzer.analyze_sync("I understand their pain. I'm here with them")

    assert compassion_result.vac.connection > 0.5, \
        f"Compassion should have positive Connection! Got {compassion_result.vac.connection}"

    assert compassion_result.primary_emotion in ["Compassion", "Empathy"], \
        f"Expected Compassion or Empathy, got {compassion_result.primary_emotion}"

    print(f"✅ Pity Connection: {pity_result.vac.connection:.2f}")
    print(f"✅ Compassion Connection: {compassion_result.vac.connection:.2f}")
```

### Run This Test

```bash
pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -v
```

**This should ALWAYS pass.** If it fails, investigate immediately!

---

## Writing Your First Test

Let's write a test for a new feature!

### Example: Test a New Emotion

**Scenario:** You added support for "Gratitude" and want to test it.

### Step 1: Create the Test File

Create `tests/semantic/test_gratitude.py`:

```python
"""Test Gratitude emotion detection"""
import pytest
from app.services.semantic_analyzer import get_semantic_analyzer


def test_gratitude_detection():
    """
    Test that Gratitude is correctly detected with appropriate VAC values.

    Gratitude should have:
    - Positive valence (pleasant feeling)
    - Low to moderate arousal (calm appreciation)
    - Positive connection (feeling connected through thanks)
    """
    analyzer = get_semantic_analyzer()

    # Test input
    text = "I'm so grateful for all the support I've received"

    # Analyze
    result = analyzer.analyze_sync(text)

    # Assertions
    assert result.primary_emotion == "Gratitude", \
        f"Expected Gratitude, got {result.primary_emotion}"

    assert result.vac.valence > 0.5, \
        f"Gratitude should be positive! Got valence={result.vac.valence}"

    assert result.vac.connection > 0.5, \
        f"Gratitude should have positive connection! Got {result.vac.connection}"

    assert result.confidence > 0.7, \
        f"Should be confident! Got {result.confidence}"

    print(f"✅ Detected: {result.primary_emotion}")
    print(f"✅ VAC: ({result.vac.valence:.2f}, {result.vac.arousal:.2f}, {result.vac.connection:.2f})")
```

### Step 2: Run the Test

```bash
pytest tests/semantic/test_gratitude.py -v
```

### Step 3: Interpret Results

**If it passes:**

```text
tests/semantic/test_gratitude.py::test_gratitude_detection PASSED
✅ Detected: Gratitude
✅ VAC: (0.82, 0.35, 0.78)
```

Great! Your feature works!

**If it fails:**

```text
AssertionError: Expected Gratitude, got Joy
```

The LLM is confusing Gratitude with Joy. You need to:

1. Add better examples to the prompt
2. Make the distinction clearer
3. Re-run the test

---

## Test Fixtures: Reusable Setup

Fixtures let you reuse setup code across tests.

**File:** `tests/conftest.py`

```python
"""Shared test fixtures"""
import pytest
from app.services.semantic_analyzer import SemanticAnalyzer


@pytest.fixture
def semantic_analyzer():
    """Provide a semantic analyzer for tests"""
    return SemanticAnalyzer()


@pytest.fixture
def sample_texts():
    """Common test inputs"""
    return {
        "joy": "I'm feeling so happy and excited!",
        "grief": "I miss them so much",
        "anxiety": "I'm worried about what might happen",
        "gratitude": "I'm grateful for this opportunity"
    }
```

### Using Fixtures

```python
def test_joy_detection(semantic_analyzer, sample_texts):
    """Test joy detection using fixtures"""
    result = semantic_analyzer.analyze_sync(sample_texts["joy"])

    assert result.primary_emotion == "Joy"
    assert result.vac.valence > 0.7
```

Much cleaner! No repeated setup code.

---

## Parameterized Tests: Test Multiple Inputs

Test the same logic with different inputs:

```python
import pytest


@pytest.mark.parametrize("text,expected_emotion,expected_connection", [
    # Positive connection emotions
    ("I understand their pain", "Compassion", 0.5),
    ("I love spending time with them", "Love", 0.8),
    ("I feel so grateful", "Gratitude", 0.7),

    # Negative connection emotions
    ("I feel sorry for them", "Pity", -0.5),
    ("Nobody understands me", "Loneliness", -0.8),
    ("I feel so ashamed", "Shame", -0.8),
])
def test_connection_axis(semantic_analyzer, text, expected_emotion, expected_connection):
    """Test Connection axis across multiple emotions"""
    result = semantic_analyzer.analyze_sync(text)

    # Check emotion
    assert result.primary_emotion == expected_emotion, \
        f"Expected {expected_emotion}, got {result.primary_emotion}"

    # Check connection sign
    if expected_connection > 0:
        assert result.vac.connection > 0, \
            f"{expected_emotion} should have positive Connection"
    else:
        assert result.vac.connection < 0, \
            f"{expected_emotion} should have negative Connection"
```

Run all 6 tests at once:

```bash
pytest tests/semantic/test_connection_axis.py::test_connection_axis -v
```

---

## Mocking: Test Without Dependencies

Sometimes you want to test code without calling external services.

### Example: Mock Ollama LLM

```python
from unittest.mock import Mock, patch


def test_analyze_with_mock_llm():
    """Test semantic analysis with mocked LLM"""

    # Create mock LLM response
    mock_response = '''
    {
        "primary_emotion": "Joy",
        "category": "Places We Go When Life Is Good",
        "vac": {"valence": 0.9, "arousal": 0.7, "connection": 0.8},
        "confidence": 0.95,
        "reasoning": "High positive valence with energy and connection"
    }
    '''

    # Patch the LLM
    with patch('app.services.semantic_analyzer.Ollama') as mock_ollama:
        mock_ollama.return_value.ainvoke.return_value = mock_response

        analyzer = SemanticAnalyzer()
        result = analyzer.analyze_sync("I'm happy!")

        assert result.primary_emotion == "Joy"
        assert result.vac.valence == 0.9
```

**Why mock?**

- Tests run much faster
- Don't need Ollama running
- Predictable results

---

## Testing Async Code

The Listener uses `async/await`. Here's how to test it:

```python
import pytest


@pytest.mark.asyncio
async def test_async_analysis():
    """Test async semantic analysis"""
    analyzer = get_semantic_analyzer()

    # Use await for async functions
    result = await analyzer.analyze("I'm feeling great!")

    assert result.primary_emotion in ["Joy", "Happiness"]
    assert result.vac.valence > 0.5
```

Run with:

```bash
pytest tests/ -v --asyncio-mode=auto
```

---

## Test Coverage

Coverage shows which lines of code are tested.

### Install Coverage Tool

```bash
pip install pytest-cov
```

### Run with Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

### View Coverage Report

```bash
open htmlcov/index.html
```

You'll see which files have good coverage:

```text
Name                              Stmts   Miss  Cover
-----------------------------------------------------
app/services/semantic_analyzer.py   150     10    93%
app/services/transcription.py       120      5    96%
app/services/pii_scrubber.py         80      2    98%
-----------------------------------------------------
TOTAL                               350     17    95%
```

**Goal:** Aim for > 90% coverage on critical files.

---

## Test-Driven Development (TDD)

TDD means writing tests BEFORE writing code.

### TDD Workflow

1. **Write a failing test**
2. **Write minimal code to pass**
3. **Refactor**
4. **Repeat**

### Example: Add "Awe" Emotion

#### Step 1: Write the test first

```python
def test_awe_detection():
    """Test Awe detection (WILL FAIL - feature doesn't exist yet!)"""
    analyzer = get_semantic_analyzer()

    result = analyzer.analyze_sync(
        "The universe is so vast and beautiful. I feel small but connected."
    )

    assert result.primary_emotion == "Awe"
    assert result.vac.valence > 0.5  # Positive
    assert result.vac.connection > 0.7  # High connection
```

#### Step 2: Run the test (it will fail)

```bash
pytest tests/semantic/test_awe.py -v

# FAILED: Expected Awe, got Wonder
```

#### Step 3: Implement the feature

Add Awe example to the prompt in `semantic_analyzer.py`.

#### Step 4: Run test again (should pass now!)

```bash
pytest tests/semantic/test_awe.py -v

# PASSED ✅
```

#### Step 5: Refactor if needed

Clean up the code, run tests again to ensure nothing broke.

---

## Debugging Failing Tests

### Technique 1: Print Debugging

```python
def test_emotion_detection():
    result = analyzer.analyze_sync("I'm confused")

    # ADD: Print for debugging
    print(f"\nEmotion: {result.primary_emotion}")
    print(f"VAC: {result.vac}")
    print(f"Reasoning: {result.reasoning}")

    assert result.primary_emotion == "Confusion"
```

Run with `-s` to see prints:

```bash
pytest tests/semantic/test_emotion.py -s
```

### Technique 2: pytest.set_trace()

```python
def test_emotion_detection():
    result = analyzer.analyze_sync("I'm confused")

    # ADD: Breakpoint
    import pdb; pdb.set_trace()

    assert result.primary_emotion == "Confusion"
```

This drops you into a debugger where you can inspect variables.

### Technique 3: Increase Verbosity

```bash
pytest tests/ -vv  # Very verbose
```

---

## Testing Best Practices

### ✅ DO

1. **Test one thing at a time**

   ```python
   def test_valence_is_positive():
       result = analyze("I'm happy!")
       assert result.vac.valence > 0
   ```

2. **Use descriptive names**

   ```python
   def test_pity_has_negative_connection():  # Good!
   def test_1():  # Bad!
   ```

3. **Write clear assertions**

   ```python
   assert result.vac.connection < 0, \
       f"Pity should have negative connection, got {result.vac.connection}"
   ```

4. **Test edge cases**

   ```python
   def test_empty_text():
       with pytest.raises(ValueError):
           analyzer.analyze_sync("")
   ```

### ❌ DON'T

1. **Don't test implementation details**

   ```python
   # Bad: Testing internal variable names
   assert analyzer._prompt is not None

   # Good: Testing behavior
   assert analyzer.analyze_sync("test") is not None
   ```

2. **Don't make tests dependent on each other**

   ```python
   # Bad: test_2 depends on test_1
   def test_1():
       global result
       result = analyzer.analyze_sync("test")

   def test_2():
       assert result is not None  # Fails if test_1 doesn't run!
   ```

3. **Don't skip the sacred test**

   ```python
   @pytest.mark.skip("Too slow")  # DON'T DO THIS!
   def test_pity_vs_compassion():
       ...
   ```

---

## Quick Reference

### Common Commands

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test
pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -v

# Stop at first failure
pytest tests/ -x

# Show print statements
pytest tests/ -s

# Very verbose
pytest tests/ -vv
```

### Test Structure

```python
def test_feature_name():
    """Clear description of what this tests"""
    # Arrange: Set up test data
    text = "I'm happy!"

    # Act: Perform the action
    result = analyzer.analyze_sync(text)

    # Assert: Check the result
    assert result.primary_emotion == "Joy"
```

---

## Continuous Integration

In production, tests run automatically on every commit.

**CI Configuration:** `.github/workflows/ci.yml`

```yaml
test:
  stage: test
  script:
    - cd listener
    - pip install -r requirements.txt
    - pytest tests/ --cov=app
  only:
    - merge_requests
    - main
```

This ensures all code is tested before merging!

---

## Next Steps

You now understand testing! 🎉

1. **[First Contribution](06-first-contribution.md)** - Make your first PR with tests
2. **[Troubleshooting Guide](../architecture/06-troubleshooting.md)** - Fix common issues

---

## Key Takeaways

✅ **Three types of tests:** Unit, Semantic, Integration
✅ **Sacred test:** Pity vs. Compassion validates the innovation
✅ **Run tests before committing:** `pytest tests/ -v`
✅ **Aim for > 90% coverage** on critical files
✅ **Write tests first** (TDD) when possible

---

**Ready to contribute?** Continue to [First Contribution →](06-first-contribution.md)
