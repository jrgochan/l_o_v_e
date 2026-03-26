#!/usr/bin/env python3
"""
Compute Extended Dimension Defaults for Atlas Emotions
======================================================

Adds psychologically-grounded default values for the 4 extended
dimensions (Depth, Coping, Velocity, Novelty) to emotion JSON files.

Theoretical basis:
  - Depth (D):    Depth psychology — surface reactive vs core existential
  - Coping (P):   Lazarus & Folkman secondary appraisal — agency / helplessness
  - Velocity (Ė): VAC-derived + emotion-specific overrides — rate of change
  - Novelty (N):  Scherer's novelty check — familiar universal vs rare compound

Usage:
    python scripts/compute_extended_defaults.py          # Process all datasets
    python scripts/compute_extended_defaults.py --dry-run  # Preview without writing
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# ═══════════════════════════════════════════════════════════════════════
# EMOTION-SPECIFIC OVERRIDES
# ═══════════════════════════════════════════════════════════════════════
# Keyed by lowercase emotion name.  Values: (D, P, Ė, N) or partial dict.
# These override category-level defaults for clinically distinct emotions.

EMOTION_OVERRIDES: Dict[str, Dict[str, float]] = {
    # --- Deep existential / identity states ---
    "shame": {"depth": 0.9, "coping": -0.8, "novelty": -0.2},
    "humiliation": {"depth": 0.85, "coping": -0.85, "novelty": 0.1},
    "self-compassion": {"depth": 0.85, "coping": 0.7, "novelty": 0.3},
    "grief": {"depth": 0.9, "coping": -0.4, "novelty": -0.3},
    "despair": {"depth": 0.9, "coping": -0.9, "velocity": -0.6, "novelty": -0.3},
    "anguish": {"depth": 0.9, "coping": -0.7, "velocity": 0.5, "novelty": 0.3},
    "desolation": {"depth": 0.85, "coping": -0.85, "velocity": -0.5, "novelty": 0.2},
    "hopelessness": {"depth": 0.85, "coping": -0.9, "velocity": -0.7, "novelty": -0.4},
    "helplessness": {"depth": 0.7, "coping": -0.95, "velocity": -0.5, "novelty": -0.3},
    "numbness": {"depth": 0.5, "coping": -0.6, "velocity": -0.9, "novelty": -0.7},
    # --- High-agency / empowered states ---
    "determination": {"depth": 0.6, "coping": 0.8, "velocity": 0.4},
    "courage": {"depth": 0.7, "coping": 0.8, "velocity": 0.3, "novelty": 0.3},
    "confidence": {"depth": 0.5, "coping": 0.85, "velocity": 0.1, "novelty": -0.2},
    "pride": {"depth": 0.6, "coping": 0.7, "velocity": 0.2, "novelty": -0.1},
    "empowerment": {"depth": 0.6, "coping": 0.9, "velocity": 0.3, "novelty": 0.2},
    # --- High-velocity states ---
    "panic": {"coping": -0.8, "velocity": 0.85, "novelty": 0.5},
    "terror": {"depth": 0.7, "coping": -0.85, "velocity": 0.8, "novelty": 0.6},
    "rage": {"depth": 0.6, "coping": -0.3, "velocity": 0.8, "novelty": 0.1},
    "fury": {"depth": 0.6, "coping": -0.2, "velocity": 0.85, "novelty": 0.1},
    "excitement": {"depth": 0.3, "coping": 0.6, "velocity": 0.7, "novelty": 0.4},
    "thrill": {"depth": 0.3, "coping": 0.5, "velocity": 0.75, "novelty": 0.5},
    "ecstasy": {"depth": 0.5, "coping": 0.6, "velocity": 0.7, "novelty": 0.6},
    "surprise": {"depth": 0.2, "coping": 0.0, "velocity": 0.7, "novelty": 0.8},
    # --- Frozen / low-velocity states ---
    "resignation": {"depth": 0.6, "coping": -0.7, "velocity": -0.8, "novelty": -0.7},
    "apathy": {"depth": 0.3, "coping": -0.6, "velocity": -0.9, "novelty": -0.8},
    "boredom": {"depth": 0.1, "coping": -0.2, "velocity": -0.8, "novelty": -0.9},
    "indifference": {"depth": 0.1, "coping": -0.1, "velocity": -0.7, "novelty": -0.8},
    # --- Rare / novel emotional states ---
    "awe": {"depth": 0.8, "coping": 0.3, "velocity": 0.3, "novelty": 0.7},
    "wonder": {"depth": 0.7, "coping": 0.4, "velocity": 0.3, "novelty": 0.8},
    "transcendence": {"depth": 0.9, "coping": 0.5, "velocity": 0.2, "novelty": 0.8},
    "reverence": {"depth": 0.8, "coping": 0.4, "velocity": 0.1, "novelty": 0.5},
    "elevation": {"depth": 0.7, "coping": 0.5, "velocity": 0.3, "novelty": 0.6},
    "bittersweet": {"depth": 0.7, "coping": 0.1, "velocity": 0.1, "novelty": 0.5},
    "cognitive dissonance": {"depth": 0.5, "coping": -0.3, "velocity": 0.4, "novelty": 0.6},
    "nostalgia": {"depth": 0.7, "coping": 0.1, "velocity": -0.2, "novelty": -0.4},
    # --- Relational depth ---
    "love": {"depth": 0.8, "coping": 0.5, "velocity": 0.0, "novelty": -0.3},
    "belonging": {"depth": 0.75, "coping": 0.6, "velocity": -0.1, "novelty": -0.3},
    "compassion": {"depth": 0.8, "coping": 0.6, "velocity": 0.1, "novelty": 0.0},
    "empathy": {"depth": 0.75, "coping": 0.4, "velocity": 0.2, "novelty": 0.1},
    "gratitude": {"depth": 0.7, "coping": 0.6, "velocity": 0.0, "novelty": 0.0},
    "trust": {"depth": 0.65, "coping": 0.6, "velocity": -0.2, "novelty": -0.3},
    "loneliness": {"depth": 0.7, "coping": -0.5, "velocity": -0.4, "novelty": -0.3},
    "disconnection": {"depth": 0.6, "coping": -0.5, "velocity": -0.5, "novelty": -0.3},
    # --- Everyday reactive ---
    "irritation": {"depth": 0.2, "coping": -0.1, "velocity": 0.3, "novelty": -0.5},
    "annoyance": {"depth": 0.15, "coping": -0.1, "velocity": 0.3, "novelty": -0.6},
    "frustration": {"depth": 0.35, "coping": -0.3, "velocity": 0.3, "novelty": -0.4},
    "stress": {"depth": 0.35, "coping": -0.3, "velocity": 0.4, "novelty": -0.3},
    "worry": {"depth": 0.4, "coping": -0.4, "velocity": 0.2, "novelty": -0.2},
    # --- Calm / grounded ---
    "calm": {"depth": 0.3, "coping": 0.5, "velocity": -0.4, "novelty": -0.5},
    "contentment": {"depth": 0.4, "coping": 0.5, "velocity": -0.3, "novelty": -0.4},
    "serenity": {"depth": 0.5, "coping": 0.6, "velocity": -0.5, "novelty": -0.3},
    "peace": {"depth": 0.6, "coping": 0.6, "velocity": -0.5, "novelty": -0.3},
    "relief": {"depth": 0.4, "coping": 0.5, "velocity": 0.4, "novelty": 0.1},
    # --- Plutchik primaries ---
    "joy": {"depth": 0.4, "coping": 0.6, "velocity": 0.3, "novelty": -0.4},
    "sadness": {"depth": 0.6, "coping": -0.3, "velocity": -0.3, "novelty": -0.4},
    "anger": {"depth": 0.5, "coping": -0.2, "velocity": 0.6, "novelty": -0.2},
    "fear": {"depth": 0.5, "coping": -0.6, "velocity": 0.5, "novelty": 0.2},
    "disgust": {"depth": 0.4, "coping": -0.1, "velocity": 0.3, "novelty": -0.1},
    "anticipation": {"depth": 0.3, "coping": 0.3, "velocity": 0.4, "novelty": 0.2},
}


# ═══════════════════════════════════════════════════════════════════════
# CATEGORY-LEVEL DEFAULTS
# ═══════════════════════════════════════════════════════════════════════
# Keyed by lowercase substring match.  Provides baseline defaults
# when no emotion-specific override exists.

CATEGORY_DEFAULTS: List[Tuple[str, Dict[str, float]]] = [
    # Brené Brown categories
    ("uncertain", {"depth": 0.4, "coping": -0.35, "novelty": -0.2}),
    ("compare", {"depth": 0.5, "coping": -0.3, "novelty": -0.2}),
    ("search for connection", {"depth": 0.7, "coping": 0.0, "novelty": -0.1}),
    ("heartbreak", {"depth": 0.8, "coping": -0.5, "novelty": -0.1}),
    ("place we go with others", {"depth": 0.6, "coping": 0.2, "novelty": 0.0}),
    ("self-assess", {"depth": 0.55, "coping": 0.1, "novelty": -0.1}),
    ("things don't go as planned", {"depth": 0.45, "coping": -0.3, "novelty": 0.1}),
    ("fall short", {"depth": 0.6, "coping": -0.4, "novelty": -0.2}),
    ("right", {"depth": 0.3, "coping": 0.4, "novelty": -0.3}),
    ("moral suffering", {"depth": 0.8, "coping": -0.2, "novelty": 0.2}),
    ("feel wronged", {"depth": 0.5, "coping": -0.3, "novelty": -0.1}),
    ("believe", {"depth": 0.65, "coping": 0.5, "novelty": 0.3}),
    ("marvel", {"depth": 0.7, "coping": 0.4, "novelty": 0.5}),
    # GoEmotions / general
    ("joy", {"depth": 0.35, "coping": 0.5, "novelty": -0.3}),
    ("anger", {"depth": 0.45, "coping": -0.2, "novelty": -0.2}),
    ("sadness", {"depth": 0.6, "coping": -0.3, "novelty": -0.3}),
    ("fear", {"depth": 0.5, "coping": -0.5, "novelty": 0.1}),
    ("surprise", {"depth": 0.25, "coping": 0.1, "novelty": 0.6}),
    ("disgust", {"depth": 0.4, "coping": -0.1, "novelty": -0.1}),
    ("love", {"depth": 0.7, "coping": 0.5, "novelty": -0.2}),
    ("appreciation", {"depth": 0.55, "coping": 0.5, "novelty": 0.0}),
    ("optimism", {"depth": 0.4, "coping": 0.6, "novelty": 0.1}),
    ("confusion", {"depth": 0.3, "coping": -0.3, "novelty": 0.3}),
    ("curiosity", {"depth": 0.35, "coping": 0.4, "novelty": 0.5}),
    ("desire", {"depth": 0.5, "coping": 0.2, "novelty": 0.1}),
    ("disapproval", {"depth": 0.35, "coping": 0.1, "novelty": -0.3}),
    ("embarrassment", {"depth": 0.5, "coping": -0.5, "novelty": 0.1}),
    ("grief", {"depth": 0.85, "coping": -0.5, "novelty": -0.2}),
    ("nervousness", {"depth": 0.35, "coping": -0.4, "novelty": 0.1}),
    ("pride", {"depth": 0.5, "coping": 0.7, "novelty": -0.1}),
    ("remorse", {"depth": 0.6, "coping": -0.3, "novelty": -0.1}),
    ("neutral", {"depth": 0.2, "coping": 0.1, "novelty": -0.5}),
    ("realization", {"depth": 0.4, "coping": 0.3, "novelty": 0.5}),
    ("caring", {"depth": 0.6, "coping": 0.5, "novelty": -0.2}),
    ("relief", {"depth": 0.4, "coping": 0.5, "novelty": 0.1}),
    # UAL categories
    ("social", {"depth": 0.5, "coping": 0.2, "novelty": -0.1}),
    ("self-conscious", {"depth": 0.55, "coping": -0.3, "novelty": -0.1}),
    ("contempt", {"depth": 0.4, "coping": 0.1, "novelty": -0.2}),
    ("interest", {"depth": 0.35, "coping": 0.4, "novelty": 0.4}),
    ("acceptance", {"depth": 0.5, "coping": 0.5, "novelty": -0.3}),
    ("shame", {"depth": 0.8, "coping": -0.7, "novelty": -0.2}),
    ("guilt", {"depth": 0.65, "coping": -0.3, "novelty": -0.2}),
    ("happiness", {"depth": 0.4, "coping": 0.5, "novelty": -0.3}),
    ("awe", {"depth": 0.75, "coping": 0.3, "novelty": 0.6}),
    ("distress", {"depth": 0.5, "coping": -0.5, "novelty": 0.0}),
    # Plutchik
    ("plutchik", {"depth": 0.45, "coping": 0.0, "novelty": -0.3}),
]

# Fallback if no category matches
DEFAULT_EXTENDED = {"depth": 0.4, "coping": 0.0, "novelty": -0.1}


def _clamp(v: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def compute_extended(emotion_name: str, category: str, vac: list) -> dict:
    """
    Compute extended dimension defaults for a single emotion.

    Returns dict: {"depth": float, "coping": float, "velocity": float, "novelty": float}
    """
    name_lower = emotion_name.lower().strip()
    cat_lower = category.lower().strip()
    v, a, c = vac[0], vac[1], vac[2]

    # Start with category defaults
    result = dict(DEFAULT_EXTENDED)  # copy
    for pattern, defaults in CATEGORY_DEFAULTS:
        if pattern in cat_lower:
            result.update(defaults)
            break

    # Apply emotion-specific overrides
    if name_lower in EMOTION_OVERRIDES:
        result.update(EMOTION_OVERRIDES[name_lower])

    # ─── Velocity: VAC-derived if not overridden ───
    if "velocity" not in result:
        # Base velocity from arousal (high arousal = rapid change)
        # Plus a contribution from valence extremity (extreme feelings shift fast)
        velocity = a * 0.5 + abs(v) * 0.15
        # Negative arousal dampens velocity (low energy = stuck)
        if a < -0.3:
            velocity = velocity * 0.5
        result["velocity"] = _clamp(velocity, -1.0, 1.0)

    # Apply small refinements based on VAC relationships
    # Deep negative valence → increase depth slightly
    if v < -0.5 and "depth" in result:
        result["depth"] = _clamp(result["depth"] + 0.1)
    # High connection → slight coping boost (social support helps)
    if c > 0.5 and "coping" in result:
        result["coping"] = _clamp(result["coping"] + 0.1)
    # Very low connection → slight coping penalty (isolation)
    if c < -0.5 and "coping" in result:
        result["coping"] = _clamp(result["coping"] - 0.1)

    # Round to 2 decimal places
    return {k: round(_clamp(v), 2) for k, v in result.items()}


def process_file(filepath: Path, dry_run: bool = False) -> int:
    """Process a single emotions.json file, adding extended dimensions in-place."""
    with open(filepath, "r") as f:
        data = json.load(f)

    emotions = data.get("emotions", [])
    if not emotions:
        print(f"  ⚠ No emotions in {filepath}")
        return 0

    updated = 0
    for emotion in emotions:
        name = emotion.get("emotion_name", "")
        category = emotion.get("category", "")
        vac = emotion.get("vac", [0, 0, 0])

        extended = compute_extended(name, category, vac)
        emotion["extended"] = extended
        updated += 1

    if not dry_run:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")  # trailing newline
        print(f"  ✅ Updated {updated} emotions in {filepath}")
    else:
        # Preview a few
        print(f"  [DRY RUN] Would update {updated} emotions in {filepath}")
        for e in emotions[:5]:
            ext = e["extended"]
            print(
                f"    {e['emotion_name']:25s} D={ext['depth']:+.2f}  "
                f"P={ext['coping']:+.2f}  Ė={ext['velocity']:+.2f}  "
                f"N={ext['novelty']:+.2f}"
            )
        if len(emotions) > 5:
            print(f"    ... +{len(emotions)-5} more")

    return updated


def main():
    dry_run = "--dry-run" in sys.argv

    data_dir = Path(__file__).parent.parent / "data"
    emotion_files = sorted(data_dir.glob("*/emotions.json"))

    if not emotion_files:
        print("❌ No emotion files found!")
        sys.exit(1)

    print("═" * 60)
    print("COMPUTE EXTENDED DIMENSION DEFAULTS")
    print("═" * 60)
    if dry_run:
        print("🔍 DRY RUN MODE — no files will be modified\n")

    total = 0
    for filepath in emotion_files:
        dataset = filepath.parent.name
        print(f"\n📂 Dataset: {dataset}")
        count = process_file(filepath, dry_run=dry_run)
        total += count

    print(f"\n{'═' * 60}")
    print(
        f"{'✅' if not dry_run else '🔍'} Total: {total} emotions processed across {len(emotion_files)} datasets"
    )
    print("═" * 60)


if __name__ == "__main__":
    main()
