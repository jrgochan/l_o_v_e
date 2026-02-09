# Your First Contribution

**Reading Time:** ~20 minutes
**Audience:** New developers ready to contribute
**Prerequisites:** [Testing Guide](05-testing-guide.md) complete
**Goal:** Make your first successful pull request

---

## Before You Start

Congratulations on making it this far! You've learned:

- ✅ How to set up the Listener
- ✅ The codebase structure
- ✅ The VAC model and Connection axis
- ✅ Common development tasks
- ✅ How to write and run tests

Now it's time to contribute! 🚀

---

## Finding a Good First Issue

### Look for "good first issue" Label

On GitLab, issues tagged with `good first issue` are specifically chosen for new contributors:

```text
https://gitlab.com/l_o_v_e/platform/-/issues?label_name[]=good%20first%20issue
```

### Types of Good First Issues

1. **Documentation improvements** - Fix typos, add examples
2. **Add test cases** - Improve test coverage
3. **Small bug fixes** - Clear, isolated issues
4. **Add examples to prompts** - Improve emotion detection

### What to Avoid (For Now)

- ❌ Major architectural changes
- ❌ Modifying the core VAC extraction logic
- ❌ Changes requiring deep LLM expertise
- ❌ Multi-module changes

---

## Development Workflow

### Step 1: Fork and Clone (If External Contributor)

**If you're part of the team:**

```bash
# Already have the repo? Skip to Step 2!
```

**If you're an external contributor:**

```bash
# Fork on GitLab first, then:
git clone https://gitlab.com/YOUR_USERNAME/l_o_v_e.git
cd l_o_v_e
```

### Step 2: Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b fix/issue-123-improve-gratitude-detection
```

**Branch Naming Convention:**

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `test/` - Test improvements
- `refactor/` - Code refactoring

**Examples:**

```bash
git checkout -b feat/add-awe-emotion
git checkout -b fix/connection-axis-clamping
git checkout -b docs/improve-setup-guide
git checkout -b test/add-grief-tests
```

### Step 3: Make Your Changes

Work on your feature/fix:

```bash
# Make changes
code listener/app/services/semantic_analyzer.py

# Test locally
pytest tests/ -v

# Test your specific change
pytest tests/semantic/test_emotion.py -v
```

### Step 4: Write Tests

**Every code change needs tests!**

```python
# tests/semantic/test_your_feature.py

def test_your_new_feature():
    """Test your new feature works correctly"""
    analyzer = get_semantic_analyzer()

    result = analyzer.analyze_sync("Your test input")

    assert result.primary_emotion == "Expected Emotion"
    assert result.vac.connection > 0.5
```

### Step 5: Run All Tests

```bash
# Make sure nothing broke!
pytest tests/ -v

# Check coverage
pytest tests/ --cov=app
```

---

## Commit Guidelines

### Commit Message Format

We use conventional commits:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**

```text
feat(semantic): add Awe emotion detection

Added Awe to the prompt with example demonstrating high
Connection and positive Valence. This addresses scenarios
where users experience transcendent feelings.

Closes #123
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `style`: Code style (formatting)
- `chore`: Build/tooling

### Good Commit Messages

✅ **Good:**

```text
feat(semantic): add Gratitude emotion example

Added few-shot example for Gratitude emotion to improve
detection accuracy. Gratitude now has positive valence
and high connection values.

Closes #45
```

✅ **Good:**

```text
fix(semantic): clamp VAC values to valid range

LLM sometimes returns values > 1.0. Added clamping to
ensure all VAC values stay within [-1, 1] range.

Fixes #78
```

❌ **Bad:**

```text
Update code

Made some changes
```

❌ **Bad:**

```text
Fixed stuff
```

### Making Commits

```bash
# Stage your changes
git add listener/app/services/semantic_analyzer.py
git add tests/semantic/test_gratitude.py

# Commit with good message
git commit -m "feat(semantic): add Gratitude emotion detection

Added Gratitude example to prompt to improve detection of
thankfulness and appreciation emotions.

Closes #45"
```

!!! tip "Commit Early, Commit Often"
    Make small, focused commits. Each commit should do ONE thing.

---

## Creating a Merge Request

### Step 1: Push Your Branch

```bash
git push origin feat/add-awe-emotion
```

### Step 2: Create MR on GitLab

1. Go to <https://gitlab.com/l_o_v_e/platform>
2. Click "Create merge request"
3. Fill in the template:

```markdown
## Description
Brief description of what this MR does

## Changes
- Added Awe emotion example to semantic_analyzer.py
- Added test for Awe detection
- Updated documentation

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Documentation
- [ ] Tests

## Testing
- [x] All tests pass (`pytest tests/ -v`)
- [x] Added new tests for this feature
- [x] Manual testing completed

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated
- [x] No breaking changes

## Related Issues
Closes #123
```text

### Step 3: Request Review

Assign reviewers and wait for feedback!

---

## Code Review Process

### What Reviewers Look For

1. **Does it work?**
   - Tests pass
   - Feature works as intended

2. **Is it tested?**
   - New code has tests
   - Tests are meaningful

3. **Is it documented?**
   - Comments explain why
   - Docstrings updated
   - Docs updated if needed

4. **Does it follow conventions?**
   - Consistent with existing code
   - Follows style guide

5. **Is it maintainable?**
   - Clear and readable
   - Not overly complex

### Responding to Feedback

**✅ Good response:**

```text
Great catch! I've updated the test to check connection > 0.5
instead of just > 0. Pushed in commit abc123.
```

**✅ Good response:**

```text
Good point about the edge case. I've added a test for empty
input and it now raises ValueError as expected.
```

**❌ Bad response:**

```text
Works on my machine 🤷
```

**❌ Bad response:**

```text
I don't think that's important
```

### Making Changes

```bash
# Make requested changes
code listener/app/services/semantic_analyzer.py

# Test
pytest tests/ -v

# Commit
git add .
git commit -m "fix: address review feedback

- Added edge case handling
- Improved test coverage"

# Push
git push origin feat/add-awe-emotion
```

The MR will update automatically!

---

## Example: Complete First Contribution

Let's walk through a complete example!

### The Issue

#### #156: Add test for "Hope" emotion

Description: We need a test to ensure Hope is detected with positive valence and moderate connection.

### Step 1: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b test/add-hope-emotion-test
```

### Step 2: Write the Test

Create `tests/semantic/test_hope.py`:

```python
"""Test Hope emotion detection"""
import pytest
from app.services.semantic_analyzer import get_semantic_analyzer


def test_hope_detection():
    """
    Test that Hope is correctly detected.

    Hope should have:
    - Positive valence (optimistic feeling)
    - Low to moderate arousal (calm but forward-looking)
    - Positive connection (connected to positive future)
    """
    analyzer = get_semantic_analyzer()

    # Test cases for Hope
    hope_texts = [
        "I'm hopeful things will get better",
        "There's still hope for a good outcome",
        "I have hope for the future"
    ]

    for text in hope_texts:
        result = analyzer.analyze_sync(text)

        # Check emotion
        assert result.primary_emotion in ["Hope", "Optimism"], \
            f"Expected Hope, got {result.primary_emotion}"

        # Check VAC values
        assert result.vac.valence > 0, \
            f"Hope should be positive! Got {result.vac.valence}"

        assert result.vac.connection > 0, \
            f"Hope involves positive connection to future"

        print(f"✅ '{text}' → {result.primary_emotion}")
        print(f"   VAC: ({result.vac.valence:.2f}, {result.vac.arousal:.2f}, {result.vac.connection:.2f})")


def test_hope_vs_despair():
    """Test that Hope and Despair are distinguished"""
    analyzer = get_semantic_analyzer()

    hope_result = analyzer.analyze_sync("I'm hopeful")
    despair_result = analyzer.analyze_sync("I'm hopeless")

    # Valence should be opposite
    assert hope_result.vac.valence > 0
    assert despair_result.vac.valence < 0

    print(f"✅ Hope valence: {hope_result.vac.valence:.2f}")
    print(f"✅ Despair valence: {despair_result.vac.valence:.2f}")
```

### Step 3: Run Tests

```bash
pytest tests/semantic/test_hope.py -v

# If it passes:
pytest tests/ -v  # Run all tests
```

### Step 4: Commit

```bash
git add tests/semantic/test_hope.py
git commit -m "test(semantic): add tests for Hope emotion

Added comprehensive tests for Hope emotion detection:
- Test Hope is detected with positive valence
- Test Hope has positive connection
- Test Hope vs. Despair distinction

Closes #156"
```

### Step 5: Push and Create MR

```bash
git push origin test/add-hope-emotion-test
```

Then create MR on GitLab with description.

### Step 6: Respond to Review

**Reviewer comment:**
> "Can you add a test for 'hopeful but anxious'? Mixed emotions are important."

**Your response:**

```text
Good idea! I've added:

def test_hope_with_anxiety():
    """Hope can coexist with anxiety (mixed emotions)"""
    result = analyzer.analyze_sync("I'm hopeful but also anxious")
    # Valence might be neutral, arousal moderate
    assert result.vac.arousal > 0  # Anxiety adds energy
```

### Step 7: Merge

Once approved, your MR gets merged. Congrats! 🎉

---

## Common Mistakes (And How to Avoid Them)

### Mistake 1: Not Running Tests

❌ **What happens:**

```text
# Push without testing
git push origin feat/my-feature

# CI fails - tests don't pass!
```

✅ **Solution:**

```bash
# Always run tests first
pytest tests/ -v

# Then push
git push origin feat/my-feature
```

### Mistake 2: Changing Too Much

❌ **Problem:**

- Changed 10 files
- Added 3 features
- Refactored existing code
- Updated documentation

This is too much for one MR!

✅ **Solution:**
One MR = One focused change

### Mistake 3: Not Writing Tests

❌ **Problem:**

```python
# Added feature but no tests
```

Reviewers will ask: "Where are the tests?"

✅ **Solution:**
Always add tests for new code!

### Mistake 4: Poor Commit Messages

❌ **Bad:**

```text
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

✅ **Good:**

```bash
git commit -m "feat(semantic): add Gratitude emotion example

Added few-shot example demonstrating Gratitude with
positive valence and high connection.

Closes #45"
```

### Mistake 5: Breaking the Sacred Test

❌ **Problem:**

```text
FAILED tests/semantic/test_connection_axis.py::test_pity_vs_compassion
```

This is the most important test! Don't break it!

✅ **Solution:**
Always run semantic tests:

```bash
pytest tests/semantic/ -v
```

---

## After Your First Contribution

### What's Next?

1. **Take on bigger issues** - Now that you know the process
2. **Review others' MRs** - Learn from other contributors
3. **Help new contributors** - Answer questions, provide feedback
4. **Explore other modules** - Observer, Versor, Experience

### Becoming a Regular Contributor

After a few successful contributions:

1. **Join regular meetings** - Sync with the team
2. **Propose features** - Share ideas for improvements
3. **Mentor juniors** - Help onboard new developers
4. **Shape the roadmap** - Influence project direction

---

## Quick Reference

### Commands

```bash
# Create branch
git checkout -b feat/my-feature

# Make changes
code listener/app/...

# Test
pytest tests/ -v

# Commit
git add .
git commit -m "feat: description"

# Push
git push origin feat/my-feature
```

### Checklist Before Creating MR

- [ ] All tests pass (`pytest tests/ -v`)
- [ ] New tests added for new code
- [ ] Code follows style guidelines
- [ ] Commit messages are clear
- [ ] Documentation updated (if needed)
- [ ] Self-reviewed the changes
- [ ] No commented-out code
- [ ] No debug print statements

---

## Getting Help

Stuck? Here's where to get help:

1. **Check documentation** - This guide and other docs
2. **Ask in Slack** - #listener-module channel
3. **Comment on the issue** - Ask for clarification
4. **Look at previous MRs** - Learn from examples
5. **Tag a maintainer** - They're here to help!

---

## Community Guidelines

### Be Respectful

- Everyone was a beginner once
- Disagreements on technical points are fine
- Personal attacks are not

### Be Patient

- Reviews take time
- Maintainers are volunteers (unless you're on the core team)
- Your MR will be reviewed, promise!

### Be Open to Feedback

- Feedback makes you better
- Reviews improve code quality
- Learn from experienced contributors

---

## Congratulations! 🎉

You now know everything you need to make your first contribution!

**Remember:**

- Start small
- Write tests
- Ask for help
- Be patient
- Have fun!

---

## Next Steps

Now that you're ready to contribute:

1. **Find an issue** - Browse `good first issue` label
2. **Ask to be assigned** - Comment: "I'd like to work on this!"
3. **Create a branch** - Follow naming convention
4. **Make changes + tests** - Follow this guide
5. **Create MR** - Get feedback, iterate
6. **Celebrate!** - You're a contributor! 🎊

---

## Advanced Topics

Ready for more?

- **[Deep Dive Architecture](../architecture/01-deep-dive.md)** - Technical deep dive
- **[Prompt Engineering](../architecture/03-prompt-engineering.md)** - Master LLM prompts
- **[Performance Optimization](../architecture/04-performance-optimization.md)** - Make it faster

---

**Questions?** Ask in Slack or comment on the issue!

**Ready to start?** [Browse good first issues →](https://gitlab.com/l_o_v_e/platform/-/issues?label_name[]=good%20first%20issue)
