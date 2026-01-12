# First Contribution - Versor Module

Ready to contribute to the Versor module? This guide walks you through the entire process from branch creation to merged PR.

---

## Before You Start

Make sure you've completed:

- ✅ [Getting Started](01-getting-started.md) - Environment setup
- ✅ [Codebase Tour](02-codebase-tour.md) - Know where things are
- ✅ [Key Concepts](03-key-concepts.md) - Understand the math
- ✅ [Common Tasks](04-common-tasks.md) - Practical experience
- ✅ [Testing Guide](05-testing-guide.md) - Test-driven development

---

## The Contribution Workflow

```text
1. Pick an issue
2. Create a branch
3. Make changes
4. Write tests
5. Run validation
6. Commit
7. Push
8. Create PR
9. Code review
10. Merge!
```

---

## Step 1: Pick an Issue

### Finding Good First Issues

Look for issues labeled:

- `good first issue` - Perfect for beginners
- `help wanted` - Community contributions welcome
- `documentation` - Non-code contributions
- `bug` - Fix something broken

### Claim the Issue

Comment on the issue:

```text
Hi! I'd like to work on this. Is it still available?
```

Wait for confirmation before starting.

---

## Step 2: Create a Branch

### Branch Naming Convention

```bash
# Format: <type>/<short-description>
git checkout -b feature/add-slerp-smoothing
git checkout -b fix/quaternion-normalization-bug
git checkout -b docs/update-api-examples
git checkout -b refactor/simplify-vac-conversion
```

**Types:**

- `feature/` - New functionality
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code improvements (no behavior change)
- `test/` - Test additions/improvements
- `chore/` - Build, dependencies, etc.

### Example

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/improve-flooding-detection

# Verify you're on the new branch
git branch
# * feature/improve-flooding-detection
#   main
```

---

## Step 3: Make Your Changes

### Example: Add a New Function

Let's add a function to detect rapid valence shifts.

**Edit `app/core/transitions.py`:**

```python
def detect_valence_spike(q_transition: Quaternion, threshold: float = 0.7) -> bool:
    """
    Detect rapid valence shifts that may indicate mood swings.
    
    Args:
        q_transition: Transition quaternion between states
        threshold: Minimum x-component to detect (default: 0.7)
    
    Returns:
        True if rapid valence shift detected
    
    Example:
        >>> from app.core.vac_model import VACVector
        >>> vac1 = VACVector(-0.8, 0.0, 0.0)
        >>> vac2 = VACVector(0.8, 0.0, 0.0)
        >>> q_trans = calculate_transition(
        ...     vac1.to_quaternion(),
        ...     vac2.to_quaternion()
        ... )
        >>> detect_valence_spike(q_trans)
        True
    """
    return abs(q_transition.x) > threshold
```

### Keep Changes Focused

**✅ Good:**

- One logical change per PR
- Related files modified together
- Clear purpose

**❌ Bad:**

- Multiple unrelated changes
- Mix of features and refactoring
- Scope creep

---

## Step 4: Write Tests

### Add Tests for Your Changes

**Edit `tests/unit/test_transitions.py`:**

```python
import pytest
from app.core.quaternion import Quaternion
from app.core.vac_model import VACVector
from app.core.transitions import detect_valence_spike, calculate_transition

def test_detect_valence_spike_positive():
    """Test that large positive valence shift is detected."""
    vac1 = VACVector(valence=-0.8, arousal=0.0, connection=0.0)
    vac2 = VACVector(valence=0.8, arousal=0.0, connection=0.0)
    
    q_trans = calculate_transition(
        vac1.to_quaternion(),
        vac2.to_quaternion()
    )
    
    assert detect_valence_spike(q_trans) is True

def test_detect_valence_spike_negative():
    """Test that large negative valence shift is detected."""
    vac1 = VACVector(valence=0.8, arousal=0.0, connection=0.0)
    vac2 = VACVector(valence=-0.8, arousal=0.0, connection=0.0)
    
    q_trans = calculate_transition(
        vac1.to_quaternion(),
        vac2.to_quaternion()
    )
    
    assert detect_valence_spike(q_trans) is True

def test_detect_valence_spike_none():
    """Test that small valence shift is not detected."""
    vac1 = VACVector(valence=0.3, arousal=0.0, connection=0.0)
    vac2 = VACVector(valence=0.4, arousal=0.0, connection=0.0)
    
    q_trans = calculate_transition(
        vac1.to_quaternion(),
        vac2.to_quaternion()
    )
    
    assert detect_valence_spike(q_trans) is False

def test_detect_valence_spike_custom_threshold():
    """Test valence spike detection with custom threshold."""
    vac1 = VACVector(valence=-0.5, arousal=0.0, connection=0.0)
    vac2 = VACVector(valence=0.5, arousal=0.0, connection=0.0)
    
    q_trans = calculate_transition(
        vac1.to_quaternion(),
        vac2.to_quaternion()
    )
    
    assert detect_valence_spike(q_trans, threshold=0.3) is True
    assert detect_valence_spike(q_trans, threshold=0.9) is False
```

### Run Tests

```bash
# Run your new tests
pytest tests/unit/test_transitions.py::test_detect_valence_spike_positive -v

# Run all tests
pytest tests/ -v

# Check coverage
pytest tests/ --cov=app --cov-report=term-missing
```

**Ensure 100% coverage is maintained!**

---

## Step 5: Run Validation

### Format Code

```bash
# Format with black
black app/ tests/

# Sort imports
isort app/ tests/
```

### Lint Code

```bash
# Check style
flake8 app/ tests/

# Type check
mypy app/ --strict
```

### Run DX Scripts (if available)

```bash
# Run all quality checks
../infra/scripts/check-python-quality.sh --module=versor --fix

# Run tests
../infra/scripts/run-tests.sh --module=versor
```

### Verify Everything Passes

```bash
# All checks should pass
pytest tests/ -v
flake8 app/ tests/
mypy app/ --strict
black app/ tests/ --check
isort app/ tests/ --check
```

---

## Step 6: Commit Your Changes

### Stage Your Changes

```bash
# See what changed
git status

# Stage specific files
git add app/core/transitions.py
git add tests/unit/test_transitions.py

# Or stage all changes
git add .
```

### Write a Good Commit Message

**Format:**

```text
<type>(<scope>): <short summary>

<optional body explaining what and why>

<optional footer with issue references>
```

**Example:**

```bash
git commit -m "feat(transitions): add valence spike detection

Adds detect_valence_spike() function to identify rapid mood swings
based on quaternion transition's x-component (valence axis).

Includes comprehensive tests covering positive/negative shifts,
small changes, and custom thresholds.

Closes #123"
```

### Commit Message Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code change that neither fixes bug nor adds feature
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Good Commit Messages

✅ **Good:**

```text
feat(slerp): add frame count validation

Validates num_frames is between MIN_NUM_FRAMES and MAX_NUM_FRAMES
before generating SLERP path. Raises ValueError if out of range.
```

❌ **Bad:**

```text
fixed bug
```

```text
WIP
```

```text
changes
```

---

## Step 7: Push Your Branch

```bash
# Push to your fork
git push origin feature/improve-flooding-detection

# If this is your first push, set upstream
git push -u origin feature/improve-flooding-detection
```

---

## Step 8: Create a Pull Request

### On GitLab/GitHub

1. Navigate to the repository
2. Click "New Pull Request" or "New Merge Request"
3. Select your branch as the source
4. Select `main` as the target
5. Fill out the PR template

### PR Title

Use the same format as commit messages:

```text
feat(transitions): add valence spike detection
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed? What problem does it solve?

## Changes Made
- Added `detect_valence_spike()` function to `transitions.py`
- Added comprehensive tests to `test_transitions.py`
- Updated docstrings with examples

## Testing
- [ ] All existing tests pass
- [ ] New tests added
- [ ] Coverage maintained at 100%
- [ ] Manually tested with example data

## Checklist
- [ ] Code follows project style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Commit messages follow convention

## Related Issues
Closes #123
```

---

## Step 9: Code Review

### What to Expect

Reviewers will check:

- ✅ Code correctness
- ✅ Test coverage
- ✅ Documentation
- ✅ Style consistency
- ✅ Performance implications

### Responding to Feedback

**Example review comment:**
> "Could you add a docstring example showing the threshold parameter?"

**Good response:**

```text
Good catch! I'll add an example with a custom threshold.
```

Then make the changes:

```bash
# Make requested changes
vim app/core/transitions.py

# Run tests again
pytest tests/ -v

# Commit changes
git add app/core/transitions.py
git commit -m "docs(transitions): add threshold example to docstring"

# Push
git push origin feature/improve-flooding-detection
```

### Common Review Feedback

1. **"Add type hints"**

   ```python
   # Before
   def my_function(x):
       return x * 2
   
   # After
   def my_function(x: float) -> float:
       return x * 2
   ```

2. **"Add docstring"**

   ```python
   def my_function(x: float) -> float:
       """
       Double the input value.
       
       Args:
           x: The number to double
       
       Returns:
           The doubled value
       
       Example:
           >>> my_function(5.0)
           10.0
       """
       return x * 2
   ```

3. **"Add test for edge case"**

   ```python
   def test_my_function_with_zero():
       """Test that zero input returns zero."""
       assert my_function(0.0) == 0.0
   ```

---

## Step 10: Merge

### After Approval

Once approved, a maintainer will merge your PR.

**You'll see:**

```text
✅ Merged by @maintainer 
```

### Celebrate! 🎉

You've made your first contribution!

### Update Your Local Repository

```bash
# Switch to main
git checkout main

# Pull the merged changes
git pull origin main

# Delete your feature branch (optional)
git branch -d feature/improve-flooding-detection

# Delete remote branch (optional)
git push origin --delete feature/improve-flooding-detection
```

---

## Common Issues

### Issue 1: Merge Conflicts

**Happens when:** main branch changed since you started.

**Solution:**

```bash
# Update main
git checkout main
git pull origin main

# Rebase your branch
git checkout feature/your-feature
git rebase main

# Fix conflicts in marked files
# Then continue rebase
git add .
git rebase --continue

# Force push (rebase rewrites history)
git push origin feature/your-feature --force
```

### Issue 2: Tests Failing in CI

**Happens when:** Tests pass locally but fail in CI.

**Solution:**

```bash
# Run tests in clean environment
deactivate  # Exit .venv if active
rm -rf .venv
python3 -m .venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

### Issue 3: Linting Errors

**Happens when:** Code doesn't follow style guide.

**Solution:**

```bash
# Auto-fix most issues
black app/ tests/
isort app/ tests/

# Check remaining issues
flake8 app/ tests/

# Fix manually or suppress (rarely)
# Add # noqa: E501 to line to suppress
```

---

## Tips for Success

### 1. Start Small

Your first PR should be simple:

- Fix a typo in documentation
- Add a test for existing function
- Improve docstring example

### 2. Read Existing Code

Understand the patterns before adding new code:

```bash
# See how similar functions are implemented
grep -r "detect_" app/core/transitions.py
```

### 3. Ask Questions

Don't hesitate to ask for help:

- Comment on the issue
- Ask in team chat
- Tag a maintainer

### 4. Be Patient

- Code review may take a few days
- Multiple review rounds are normal
- Learn from feedback

### 5. Keep PRs Small

- Easier to review
- Faster to merge
- Lower risk of conflicts

---

## Good First Contribution Ideas

### Documentation Improvements

```text
- Add examples to docstrings
- Fix typos
- Clarify confusing explanations
- Add diagrams
```

### Test Additions

```text
- Add edge case tests
- Improve test coverage
- Add property-based tests
- Add performance benchmarks
```

### Code Quality

```text
- Add type hints
- Improve error messages
- Add input validation
- Extract magic numbers to constants
```

### Small Features

```text
- Add configuration option
- Improve logging
- Add utility function
- Optimize performance
```

---

## After Your First Contribution

### What's Next?

1. **More Contributions:** Pick progressively harder issues
2. **Become a Reviewer:** Help review others' PRs
3. **Mentor:** Guide new contributors
4. **Own a Feature:** Take responsibility for a module

### Advanced Topics

- [Deep Dive Architecture](../architecture/01-deep-dive.md)
- [Quaternion Mathematics](../architecture/02-quaternion-mathematics.md)
- [Performance Optimization](../architecture/06-performance-optimization.md)

---

## Resources

### Git & GitHub/GitLab

- [Git Book](https://git-scm.com/book/en/v2)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)

### Code Review

- [Code Review Best Practices](https://google.github.io/eng-practices/review/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)

### Testing

- [Pytest Documentation](https://docs.pytest.org/)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

---

## Quick Reference

### Git Commands

```bash
# Create branch
git checkout -b feature/my-feature

# Stage changes
git add file1.py file2.py

# Commit
git commit -m "feat: description"

# Push
git push origin feature/my-feature

# Update from main
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
```

### Quality Checks

```bash
# Format
black app/ tests/
isort app/ tests/

# Lint
flake8 app/ tests/
mypy app/ --strict

# Test
pytest tests/ -v --cov=app

# All checks (if available)
../infra/scripts/check-python-quality.sh --module=versor --fix
```

---

## Congratulations

You're now ready to make your first contribution to the Versor module! 🚀

Remember:

- Start small
- Ask questions
- Learn from feedback
- Have fun!

---

**Previous:** [← Testing Guide](05-testing-guide.md)  
**Next:** [Senior Developer Deep Dive →](../architecture/01-deep-dive.md)
