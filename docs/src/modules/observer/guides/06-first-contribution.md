# First Contribution

**Reading Time:** ~20 minutes  
**Audience:** New developers  
**Prerequisites:** All previous guides completed  
**Goal:** Make your first successful contribution to Observer

---

## Overview

You've learned the concepts, explored the code, and written tests. Now it's time to contribute! This guide walks you through the entire process from creating a branch to merging your first PR.

---

## Before You Start

### ✅ Checklist

- [ ] Observer runs locally without errors
- [ ] All tests pass (`pytest`)
- [ ] You understand the codebase structure
- [ ] You have a GitLab account
- [ ] You have write access to the repo (or can fork)

### 🎯 Good First Issues

Look for issues tagged with:

- `good first issue`
- `documentation`
- `enhancement`
- `bug` (simple ones)

**Examples of good first contributions:**

- Add a new emotion to the atlas
- Fix a typo in documentation
- Add tests for existing code
- Improve error messages
- Add validation to API endpoints

---

## Git Workflow

### Step 1: Update Your Local Repository

Always start with the latest code:

```bash
cd observer

# Make sure you're on main branch
git checkout main

# Pull latest changes
git pull origin main
```

### Step 2: Create a Feature Branch

Branch naming convention:

```text
<type>/<short-description>

Types:
- feature/  (new functionality)
- fix/      (bug fixes)
- docs/     (documentation)
- test/     (adding tests)
- refactor/ (code improvements)
```

**Examples:**

```bash
# Adding a new emotion
git checkout -b feature/add-anticipation-emotion

# Fixing a bug
git checkout -b fix/vector-search-timeout

# Updating docs
git checkout -b docs/improve-testing-guide

# Adding tests
git checkout -b test/add-emotion-mapper-tests
```

---

## Example: Adding a New Emotion

Let's walk through a complete contribution.

### Step 1: Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/add-anticipation-emotion
```

### Step 2: Make Your Changes

Following the [Common Tasks guide](04-common-tasks.md), add the emotion:

**Edit `observer/data/atlas_emotions.json`:**

```json
{
  "name": "Anticipation",
  "category": "When It's Beyond Us",
  "vac": [0.5, 0.6, 0.3],
  "description": "Looking forward to a future event with excitement and readiness.",
  "keywords": ["expectation", "looking forward", "excitement", "future"],
  "citations": [
    {
      "author": "Panksepp, J.",
      "year": 1998,
      "title": "Affective Neuroscience",
      "source": "Oxford University Press"
    }
  ]
}
```

### Step 3: Test Your Changes

```bash
# Seed the new emotion
python scripts/seed_atlas.py

# Verify it works
curl http://localhost:8000/atlas/emotions/Anticipation | jq

# Run tests
pytest -v
```

All tests should pass! ✅

### Step 4: Commit Your Changes

Write a clear commit message:

```bash
# Stage your changes
git add data/atlas_emotions.json

# Commit with descriptive message
git commit -m "feat: Add Anticipation emotion to atlas

- Add Anticipation to atlas_emotions.json
- VAC coordinates: [0.5, 0.6, 0.3]
- Category: When It's Beyond Us
- Includes research citation from Panksepp (1998)

Closes #123"
```

**Good commit messages:**

- Start with type: `feat:`, `fix:`, `docs:`, `test:`
- Short summary (50 chars)
- Blank line
- Detailed description
- Reference issue number

### Step 5: Push Your Branch

```bash
git push origin feature/add-anticipation-emotion
```

---

## Creating a Pull Request

### Step 1: Go to GitLab

Navigate to:

```text
https://gitlab.com/l_o_v_e/platform/-/merge_requests/new
```

### Step 2: Fill Out the PR Template

```markdown
## Description

This PR adds the "Anticipation" emotion to the Observer atlas.

## Type of Change

- [x] New feature (non-breaking change that adds functionality)
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] Documentation update
- [ ] Performance improvement

## Changes Made

- Added Anticipation emotion to `data/atlas_emotions.json`
- VAC coordinates: [0.5, 0.6, 0.3] (positive valence, moderate arousal, slight connection)
- Category: "When It's Beyond Us"
- Included research citation

## Testing

- [x] All existing tests pass
- [x] Verified emotion appears in API: `/atlas/emotions/Anticipation`
- [x] Tested similarity search with anticipation-like coordinates
- [ ] Added new tests (not required for data-only change)

## Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [x] I have commented my code where necessary
- [x] I have updated the documentation
- [x] My changes generate no new warnings
- [x] New and existing tests pass locally

## Related Issues

Closes #123

## Screenshots (if applicable)

N/A - Data-only change

## Additional Notes

Based on Panksepp's affective neuroscience research. Anticipation is distinct
from other future-oriented emotions (hope, worry) due to its active engagement
and moderate arousal level.
```

### Step 3: Submit the PR

Click **"Create merge request"**

---

## Code Review Process

### What to Expect

1. **Automated Checks** run first:
   - CI/CD pipeline
   - Linting
   - Tests
   - Coverage

2. **Code Review** by maintainers:
   - Usually within 1-2 business days
   - Reviewers may ask questions
   - May request changes

3. **Iteration:**
   - Address feedback
   - Push new commits
   - Re-request review

4. **Merge:**
   - Approved PRs are merged
   - Your contribution is live! 🎉

### Responding to Feedback

**Example feedback:**
> "Could you add a test to verify Anticipation's VAC coordinates?"

**Good response:**

```markdown
Great idea! I've added a test in `tests/semantic/test_anticipation.py`:

- Verifies VAC coordinates are correct
- Checks category assignment
- Tests similarity to related emotions (Hope, Curiosity)

Let me know if you'd like any changes!
```

**Making requested changes:**

```bash
# Make the changes
# Create tests/semantic/test_anticipation.py

# Commit
git add tests/semantic/test_anticipation.py
git commit -m "test: Add tests for Anticipation emotion"

# Push
git push origin feature/add-anticipation-emotion
```

---

## Common Pitfalls

### ❌ Pitfall 1: Not Testing Locally

**Problem:** Push code that doesn't work

**Solution:** Always run tests before pushing

```bash
pytest -v
```

### ❌ Pitfall 2: Committing Unrelated Changes

**Problem:** Branch includes changes to multiple unrelated files

**Solution:** Use `git add` selectively

```bash
# Good: Only add related files
git add data/atlas_emotions.json

# Bad: Adding everything
git add .  # Might include .env, IDE files, etc.
```

### ❌ Pitfall 3: Unclear Commit Messages

**Bad:**

```bash
git commit -m "update"
git commit -m "fix stuff"
git commit -m "changes"
```

**Good:**

```bash
git commit -m "feat: Add Anticipation emotion with research citation"
git commit -m "fix: Correct VAC coordinates for Pity emotion"
git commit -m "docs: Update testing guide with coverage examples"
```

### ❌ Pitfall 4: Large, Unfocused PRs

**Problem:** PR changes 20 files across multiple features

**Solution:** Keep PRs focused and small

- One feature per PR
- One bug fix per PR
- Under 400 lines of changes (ideally)

### ❌ Pitfall 5: Not Updating Documentation

**Problem:** Add feature without documenting it

**Solution:** Update relevant docs in the same PR

---

## PR Size Guidelines

### Small PR (Preferred) ✅

- **Changes:** 1-50 lines
- **Files:** 1-3 files
- **Review time:** < 30 minutes
- **Examples:**
  - Fix typo
  - Add one emotion
  - Update configuration

### Medium PR 👍

- **Changes:** 50-200 lines
- **Files:** 3-8 files
- **Review time:** 30-60 minutes
- **Examples:**
  - Add new API endpoint
  - Implement feature with tests
  - Refactor service

### Large PR 😬

- **Changes:** 200-400 lines
- **Files:** 8-15 files
- **Review time:** 1-2 hours
- **Examples:**
  - Complex feature
  - Multiple related changes
  - Consider breaking into smaller PRs

### Too Large ❌

- **Changes:** > 400 lines
- **Files:** > 15 files
- **Review time:** > 2 hours
- **Solution:** Break into multiple PRs

---

## Branch Management

### Keeping Your Branch Updated

If main branch moves ahead:

```bash
# Update main
git checkout main
git pull origin main

# Go back to your branch
git checkout feature/your-feature

# Rebase on main
git rebase main

# If conflicts, resolve them, then:
git rebase --continue

# Force push (rebased branch)
git push origin feature/your-feature --force-with-lease
```

### Cleaning Up After Merge

```bash
# After PR is merged, delete local branch
git checkout main
git pull origin main
git branch -d feature/your-feature

# Delete remote branch (if not auto-deleted)
git push origin --delete feature/your-feature
```

---

## Style Guidelines

### Python Code Style

We follow **PEP 8** with some customizations:

```python
# Good: Clear, documented function
async def find_nearest_emotion(
    vac: List[float],
    text: str,
    k: int = 5
) -> List[EmotionMatch]:
    """
    Find k nearest emotions using weighted fusion.
    
    Args:
        vac: VAC coordinates [valence, arousal, connection]
        text: Transcribed text for semantic matching
        k: Number of results to return
        
    Returns:
        List of EmotionMatch objects sorted by distance
        
    Raises:
        ValueError: If VAC coordinates are invalid
        
    Example:
        >>> emotions = await find_nearest_emotion(
        ...     vac=[0.8, 0.6, 0.7],
        ...     text="I feel joyful",
        ...     k=3
        ... )
    """
    # Implementation
```

### Database Migrations

```python
# Good: Clear migration with comments
def upgrade():
    """Add user_preference column to chat_sessions"""
    op.add_column(
        'chat_sessions',
        sa.Column('user_preference', postgresql.JSONB, nullable=True)
    )

def downgrade():
    """Remove user_preference column"""
    op.drop_column('chat_sessions', 'user_preference')
```

### Documentation

```markdown
# Good: Clear heading hierarchy

## Main Section

### Subsection

**Bold for emphasis**

`code for commands`

- Bullet points
- For lists
```

---

## Getting Help

### Stuck on Something?

1. **Check existing docs** (you're reading them!)
2. **Search closed issues** - someone may have solved it
3. **Ask in Slack** #observer-module
4. **Create a discussion** on GitLab
5. **Ask in your PR** - reviewers are happy to help!

### Good Questions

**❌ Bad:**
> "It doesn't work"

**✅ Good:**
> "When I run `pytest tests/unit/test_emotion_mapper.py`, I get this error:
>
>
> ```text
> AssertionError: assert 1.732 == 1.5
> ```> Keep everything small. Small commits, small PRs, small functions. Here's my code: [paste code]
>
> I expected sqrt(3) ≈ 1.732, but getting 1.5. What am I missing?"

---

## Celebrating Your Contribution

### After Your PR Merges 🎉

1. **Update your resume/LinkedIn**
   - "Contributed to L.O.V.E. open source project"
   - "Added emotional intelligence features using Python and PostgreSQL"

2. **Share on social media**
   - "Just made my first contribution to @LOVEProject!"
   - Tag the project

3. **Keep contributing!**
   - Look for more issues
   - Help others in discussions
   - Review PRs (once experienced)

---

## Next Steps

🎉 **Congratulations!** You've completed the Junior Developer track!

### Continue Learning

**For deeper technical knowledge:**

- [Senior Developer Guides](../architecture/01-deep-dive.md)
- Dive into algorithms (A*, vector search)
- Learn about database optimization

**For broader understanding:**

- [Manager Guides](../architecture/00-high-level-overview.md)
- System architecture and integration
- Operational concerns

**For reference:**

- [API Reference](../reference/api-reference.md)
- [Configuration Guide](../reference/configuration.md)
- [Glossary](../reference/glossary.md)

---

## Your First Contribution Checklist

Use this for every contribution:

### Before Coding

- [ ] Issue exists or created
- [ ] You understand the problem
- [ ] You know the solution approach
- [ ] Branch created from latest main

### During Development

- [ ] Code follows style guidelines
- [ ] Functions have docstrings
- [ ] Tests added/updated
- [ ] All tests pass locally
- [ ] Documentation updated

### Before Submitting PR

- [ ] Self-review completed
- [ ] Commit messages are clear
- [ ] Branch is up to date with main
- [ ] No unrelated changes included

### PR Submission

- [ ] PR template filled out completely
- [ ] Screenshots/examples provided
- [ ] Issue number referenced
- [ ] Ready for review

### During Review

- [ ] Respond to feedback promptly
- [ ] Make requested changes
- [ ] Push updates
- [ ] Re-request review

### After Merge

- [ ] Local branch deleted
- [ ] Remote branch deleted
- [ ] Celebrate! 🎉

---

## Inspiring Words

> "Every expert was once a beginner. Every master was once a novice. Your first contribution might be small, but it's the start of something bigger."
>
> "Open source is about collaboration, learning, and growth. Don't be afraid to make mistakes - that's how we all learn!"
>
> "Your perspective as a new developer is valuable. Questions you have now might become documentation that helps future contributors!"

---

**Welcome to the Observer community!** 🔭

We're excited to see your contributions. Remember:

- Ask questions
- Be patient with yourself
- Learn from feedback
- Help others when you can
- Have fun! 🚀

---

**Questions?** Reach out in Slack #observer-module or @ mention a maintainer in your PR!
