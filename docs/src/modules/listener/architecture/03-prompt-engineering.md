# Prompt Engineering Guide

**Reading Time:** ~35 minutes
**Audience:** Senior developers, ML engineers
**Prerequisites:** [Semantic Analysis Internals](02-semantic-analysis.md)
**Goal:** Master the art of crafting effective prompts for VAC extraction

---

## The Art and Science of Prompting

Prompt engineering is the process of crafting instructions that guide an LLM to produce desired outputs. For the Listener, this means teaching an LLM to extract the Connection axis—a dimension it wasn't explicitly trained on.

**Challenge:** LLMs are trained on internet text, which rarely discusses emotions in terms of "Connection" as we define it.

**Solution:** Few-shot learning with carefully chosen examples that teach the model our framework.

---

## Prompt Anatomy

Our current prompt has 6 critical sections:

```python
prompt = """
1. Role & Context         # Who is the LLM?
2. Task Definition        # What should it do?
3. VAC Specification      # What is the model?
4. Connection Teaching    # HOW to measure Connection
5. Few-Shot Examples      # Learn by example
6. Output Format          # Structure the response
7. Analysis Instructions  # Step-by-step process
"""
```

---

## Section 1: Role & Context

```python
system_message = """
You are the Listener, an expert psychometrician trained in
Dr. Brené Brown's Atlas of the Heart.
"""
```

### Why This Matters

**Poor role definition:**

```python
"You are a helpful assistant."  # Generic, no expertise
```

**Better:**

```python
"You are an emotion detection system."  # Specific but bland
```

**Best (current):**

```python
"You are the Listener, an expert psychometrician trained in
Dr. Brené Brown's Atlas of the Heart."
```

**Impact:** Invokes LLM's knowledge of psychology, emotions, and Brené Brown's research.

---

## Section 2: Task Definition

```python
"""
Your task is to analyze text and map it to the 3-dimensional VAC Model:
- **Valence** (X-axis): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y-axis): High Energy (+1) to Low Energy (-1)
- **Connection** (Z-axis): Connected (+1) to Disconnected (-1)
"""
```

### Principles

1. **Be explicit:** Don't assume the LLM knows what VAC means
2. **Use spatial metaphors:** "X-axis", "Y-axis", "Z-axis"
3. **Show ranges:** "-1 to +1" clarifies scale
4. **Bold critical terms:** Visual emphasis matters

---

## Section 3: Connection Axis Teaching

This is THE most critical section for our innovation:

```python
"""
The Connection axis is CRITICAL and novel. It measures:

1. **Relational Stance:**
   - "with" vs "against" others
   - "us" vs "them" language
   - Shared vs. separate experience

2. **Self-Alignment:**
   - Authentic self vs. performing
   - Internal congruence vs. external pressure
   - "Being" vs. "Fitting in"

3. **Emotional Exposure:**
   - Vulnerability shared vs. hidden
   - Openness vs. guardedness
   - Trust vs. defensiveness

4. **Critical Distinction:**
   - Feeling FOR someone = separation (Connection < 0)
   - Feeling WITH someone = alignment (Connection > 0)
"""
```

### Why Each Element Matters

| Element | Purpose | Example |
|---------|---------|---------|
| Relational Stance | Teaches "with/against" | "I'm with you" vs. "Poor you" |
| Self-Alignment | Internal vs. external | Belonging vs. Fitting In |
| Emotional Exposure | Vulnerability | Open vs. Guarded |
| Critical Distinction | THE key insight | Pity FOR vs. Compassion WITH |

---

## Section 4: Few-Shot Examples

The heart of prompt engineering. These examples TEACH the LLM our framework.

### Example Selection Criteria

✅ **Must Include:**

1. **Contrastive Pairs:**
   - Pity vs. Compassion (Connection opposite)
   - Grief vs. Anguish (Connection persists vs. disappears)

2. **Edge Cases:**
   - Grief (negative Valence + positive Connection)
   - Shame (negative Connection as defining feature)

3. **Range Coverage:**
   - High Connection: +0.9 (Compassion)
   - Mid Connection: +0.5 (Hope)
   - Low Connection: 0.0 (Neutral)
   - Negative Connection: -0.7 (Pity)
   - Very Negative: -0.9 (Loneliness)

4. **Explicit Reasoning:**
   - Show step-by-step analysis
   - Explain WHY each VAC value was chosen

### Template for Each Example

```python
Example X - EMOTION_NAME (Connection Quality):
Input: "User's text here"
Analysis:
- Valence: [Analysis] → [value]
- Arousal: [Analysis] → [value]
- Connection: [Detailed analysis emphasizing relational aspect] → [value]
Output: {
  "primary_emotion": "Emotion",
  "category": "Atlas Category",
  "vac": {"valence": X, "arousal": Y, "connection": Z},
  "confidence": 0.9,
  "reasoning": "Brief explanation"
}
```

### Current Examples (6 total)

```python
# 1. PITY (separation) - Connection < 0
"I feel sorry for them, they're struggling."

# 2. COMPASSION (connection) - Connection > 0.5
"I understand their pain. I'm here for them."

# 3. JOY (positive connection) - Connection > 0.5
"I'm feeling amazing today, everything is clicking!"

# 4. GRIEF (love persists) - Connection > 0.5
"I miss them so much. The pain is overwhelming."

# 5. LONELINESS (defining feature) - Connection < -0.5
"I feel so alone. Nobody gets me."

# 6. OVERWHELM (frayed connection) - Connection ~0
"I'm feeling overwhelmed by everything."
```

### Adding a New Example

**Scenario:** You want to add "Gratitude" to improve detection.

```python
Example 7 - GRATITUDE (Connection through appreciation):
Input: "I'm so grateful for the support I've received."
Analysis:
- Valence: Positive (appreciation, warmth) → 0.8
- Arousal: Low to moderate (calm appreciation) → 0.3
- Connection: POSITIVE (gratitude creates bond, acknowledges others) → 0.8
Output: {
  "primary_emotion": "Gratitude",
  "category": "Places We Go When Life Is Good",
  "vac": {"valence": 0.8, "arousal": 0.3, "connection": 0.8},
  "confidence": 0.92,
  "reasoning": "Gratitude involves positive connection through appreciation of others or circumstances."
}
```

**Testing the new example:**

```python
# Test before adding
result_before = analyzer.analyze_sync("I'm grateful for your help")
print(f"Connection before: {result_before.vac.connection}")

# Add example to prompt
analyzer_with_gratitude = SemanticAnalyzer()  # Updated prompt

# Test after adding
result_after = analyzer_with_gratitude.analyze_sync("I'm grateful for your help")
print(f"Connection after: {result_after.vac.connection}")

# Should see improvement in Connection value
```

---

## Section 5: Output Format

```python
"""
You must respond with valid JSON matching this schema:
{
  "primary_emotion": "string (one of 87 Atlas emotions)",
  "category": "string (one of 13 Atlas categories)",
  "vac": {
    "valence": float (-1.0 to 1.0),
    "arousal": float (-1.0 to 1.0),
    "connection": float (-1.0 to 1.0)
  },
  "confidence": float (0.0 to 1.0),
  "reasoning": "string (step-by-step analysis)"
}
"""
```

### JSON Schema Benefits

1. **Structured output:** Easy to parse
2. **Type safety:** Pydantic validation
3. **Explicit ranges:** (-1.0 to 1.0) prevents errors
4. **Reasoning field:** Enables debugging

---

## Section 6: Analysis Instructions

```python
"""
Follow this analysis process:
1. Analyze Valence: Look for hedonic keywords (pleasant/unpleasant)
2. Analyze Arousal: Look for energy markers (activated/calm)
3. Analyze Connection: THIS IS THE HARDEST STEP
   - Look for relational language ("with", "against", "us", "them")
   - Assess self-alignment vs. external pressure
   - Evaluate emotional exposure (vulnerable vs. guarded)
4. Select Category: Which of the 13 Atlas categories?
5. Select Emotion: Which specific emotion from the 87?
"""
```

**Chain-of-thought reasoning improves accuracy.**

---

## Prompt Engineering Techniques

### 1. Contrastive Examples

**Purpose:** Teach fine distinctions

```python
# BAD: Only positive examples
"Joy" → Connection: +0.8
"Gratitude" → Connection: +0.7
"Love" → Connection: +0.9

# GOOD: Contrastive pairs
"Compassion" → Connection: +0.9 (WITH them)
"Pity" → Connection: -0.7 (FOR them)
# Now the LLM learns the distinction!
```

### 2. Explicit Reasoning

**Purpose:** Show the thought process

```python
# BAD: Just the answer
"Pity" → Connection: -0.7

# GOOD: Show reasoning
"Pity" → Connection: -0.7 because:
- "Feel FOR them" creates distance
- Condescension implied
- No shared experience
- Separation, not alignment
```

### 3. Edge Case Coverage

**Purpose:** Handle unusual inputs

```python
# Edge case: Grief (negative + positive)
"I miss them so much" →
  Valence: -0.8 (painful)
  Connection: +0.7 (love persists!)

# This teaches: Connection can be positive even with pain
```

### 4. Range Anchoring

**Purpose:** Calibrate the scale

```python
# Anchor extremes
"Perfect connection" → +1.0
"Complete disconnection" → -1.0

# Then show mid-range
"Moderate connection" → +0.5
"Slight separation" → -0.3
```

---

## Testing Prompt Changes

### A/B Testing Framework

```python
def compare_prompts(text: str, prompt_a: str, prompt_b: str):
    """Compare two prompts on same input"""

    analyzer_a = SemanticAnalyzer(prompt=prompt_a)
    analyzer_b = SemanticAnalyzer(prompt=prompt_b)

    result_a = analyzer_a.analyze_sync(text)
    result_b = analyzer_b.analyze_sync(text)

    print(f"Input: {text}\n")
    print(f"Prompt A:")
    print(f"  Connection: {result_a.vac.connection:.2f}")
    print(f"  Reasoning: {result_a.reasoning}\n")

    print(f"Prompt B:")
    print(f"  Connection: {result_b.vac.connection:.2f}")
    print(f"  Reasoning: {result_b.reasoning}\n")

    # Calculate difference
    diff = abs(result_a.vac.connection - result_b.vac.connection)
    print(f"Connection difference: {diff:.2f}")
```

### Ablation Study

**Remove elements one-by-one to see impact:**

```python
def ablation_study(test_cases: List[str]):
    """Test impact of removing prompt elements"""

    prompts = {
        "full": create_full_prompt(),
        "no_connection_teaching": create_prompt_without_connection_section(),
        "no_few_shot": create_prompt_without_examples(),
        "minimal": create_minimal_prompt()
    }

    for case in test_cases:
        print(f"\n{'='*60}")
        print(f"Test case: {case}")
        print('='*60)

        for name, prompt in prompts.items():
            analyzer = SemanticAnalyzer(prompt=prompt)
            result = analyzer.analyze_sync(case)
            print(f"{name:30s} Connection: {result.vac.connection:+.2f}")
```

---

## Common Pitfalls

### Pitfall 1: Too Many Examples

❌ **Problem:**

```python
# 20 examples in prompt
# Prompt length: ~3000 tokens
# Inference time: ~5s
# Accuracy: 92%
```

✅ **Solution:**

```python
# 6 carefully chosen examples
# Prompt length: ~1000 tokens
# Inference time: ~1.5s
# Accuracy: 91%

# Trade-off accepted: Slight accuracy loss for 3x speed
```

### Pitfall 2: Ambiguous Ranges

❌ **Problem:**

```python
"Connection: positive to negative"
# What does "positive" mean? +0.1? +0.9?
```

✅ **Solution:**

```python
"Connection: Connected (+1.0) to Disconnected (-1.0)"
# Explicit scale anchors
```

### Pitfall 3: Inconsistent Examples

❌ **Problem:**

```python
Example 1: "Joy" → Connection: +0.8
Example 2: "Gratitude" → Connection: +0.9
# Why is Gratitude higher than Joy? Confusing!
```

✅ **Solution:**

```python
Example 1: "Joy" → Connection: +0.7 (feeling good, connected to life)
Example 2: "Gratitude" → Connection: +0.8 (explicitly acknowledging connection to others)
# Now the difference makes sense
```

### Pitfall 4: Missing Reasoning

❌ **Problem:**

```python
"Pity" → Connection: -0.7
# Why -0.7? LLM doesn't learn the pattern
```

✅ **Solution:**

```python
"Pity" → Connection: -0.7 (feeling FOR creates distance)
# Now the LLM learns WHY
```

---

## Advanced Techniques

### 1. Dynamic Example Selection

```python
def select_examples_for_input(text: str) -> List[Example]:
    """Choose most relevant examples based on input"""

    # Detect emotion keywords
    keywords = extract_keywords(text)

    if "sorry" in keywords or "pity" in keywords:
        # Include pity vs. compassion contrast
        return [pity_example, compassion_example, ...]
    elif "grateful" in keywords:
        # Include gratitude examples
        return [gratitude_example, joy_example, ...]
    else:
        # Default set
        return default_examples
```

### 2. Iterative Refinement

```python
def iterative_analysis(text: str, max_iterations: int = 3):
    """Refine analysis through multiple passes"""

    # First pass
    result = analyzer.analyze_sync(text)

    for i in range(max_iterations):
        # Check if Connection value makes sense
        if not validate_connection(result):
            # Add specific guidance for this case
            refined_prompt = add_guidance(prompt, result)
            refined_analyzer = SemanticAnalyzer(prompt=refined_prompt)
            result = refined_analyzer.analyze_sync(text)
        else:
            break

    return result
```

### 3. Confidence-Based Re-prompting

```python
async def analyze_with_confidence_threshold(
    text: str,
    min_confidence: float = 0.8
):
    """Re-analyze if confidence is low"""

    result = await analyzer.analyze(text)

    if result.confidence < min_confidence:
        # Try with more detailed prompt
        detailed_analyzer = SemanticAnalyzer(prompt=detailed_prompt)
        result = await detailed_analyzer.analyze(text)

    return result
```

---

## Evaluation Metrics

### Connection Axis Accuracy

```python
def evaluate_connection_accuracy(test_set: List[Tuple[str, float]]):
    """
    Evaluate how well the prompt extracts Connection.

    Args:
        test_set: List of (text, expected_connection) pairs
    """
    errors = []

    for text, expected in test_set:
        result = analyzer.analyze_sync(text)
        error = abs(result.vac.connection - expected)
        errors.append(error)

    mae = np.mean(errors)  # Mean Absolute Error
    rmse = np.sqrt(np.mean([e**2 for e in errors]))  # Root Mean Square Error

    print(f"MAE: {mae:.3f}")
    print(f"RMSE: {rmse:.3f}")

    return mae, rmse
```

### Critical Test Cases

```python
critical_test_cases = [
    ("I feel sorry for them", -0.5),  # Pity: negative
    ("I feel their pain with them", 0.8),  # Compassion: positive
    ("I miss them so much", 0.7),  # Grief: positive (love persists)
    ("Nobody understands me", -0.8),  # Loneliness: very negative
]

mae, rmse = evaluate_connection_accuracy(critical_test_cases)

# Target: MAE < 0.2, RMSE < 0.3
```

---

## Best Practices

### ✅ DO

1. **Start with clear role definition**
2. **Use contrastive examples** (pity vs. compassion)
3. **Show explicit reasoning** in examples
4. **Cover the full Connection range** (-1 to +1)
5. **Test on critical cases** before deployment
6. **Version control prompts** (track changes)

### ❌ DON'T

1. **Don't add too many examples** (diminishing returns after 8)
2. **Don't use vague language** ("somewhat", "kind of")
3. **Don't skip edge cases** (grief, shame)
4. **Don't forget to validate** with tests
5. **Don't change multiple elements at once** (can't identify what helped)

---

## Prompt Versioning

### Track Changes

```python
# prompts/semantic_vac_v1.py
PROMPT_V1 = """..."""  # Original with 4 examples

# prompts/semantic_vac_v2.py
PROMPT_V2 = """..."""  # Added Gratitude example

# prompts/semantic_vac_v3.py
PROMPT_V3 = """..."""  # Improved Connection teaching

CHANGELOG = """
v3.0 (2025-12-15):
- Enhanced Connection axis explanation
- Added Gratitude example
- Improved pity vs. compassion contrast
- Result: MAE improved from 0.25 to 0.18

v2.0 (2025-12-01):
- Added Gratitude and Grief examples
- Result: MAE improved from 0.30 to 0.25

v1.0 (2025-11-15):
- Initial prompt with 4 examples
- Baseline MAE: 0.30
"""
```

---

## Key Takeaways

✅ **Role definition** sets context
✅ **Connection teaching** is critical
✅ **Few-shot examples** teach the model
✅ **Contrastive pairs** (pity vs. compassion) are essential
✅ **Explicit reasoning** improves learning
✅ **Test systematically** on critical cases
✅ **Version control** prompts like code

---

**Next:** [Performance Optimization →](04-performance-optimization.md)
