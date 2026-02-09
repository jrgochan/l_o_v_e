"""Concrete Emotion Relationship Rules.

Implementations of specific logic for detecting emotional dynamics.
"""

from typing import Any, Dict, Optional

from app.services.emotions.rules.base import RelationshipContext, RelationshipRule


class ContradictoryRule(RelationshipRule):
    """Detects contradictory emotions (opposite valences, similar arousal)."""

    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Check for contradictory emotions."""
        # IF valence_diff > 1.0 AND arousal_diff < 0.5
        if context.valence_diff > 1.0 and context.arousal_diff < 0.5:
            return {
                "emotion_a": context.emotion_a["emotion_name"],
                "emotion_b": context.emotion_b["emotion_name"],
                "type": "contradictory",
                "strength": round(min(context.valence_diff / 2.0, 1.0), 2),
                "description": (
                    f"Conflicting {context.emotion_a['emotion_name'].lower()} and "
                    f"{context.emotion_b['emotion_name'].lower()}"
                ),
            }
        return None


class MaskingRule(RelationshipRule):
    """Detects masking (primary covering underlying)."""

    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Check for masking."""
        prom_a = context.emotion_a.get("prominence", "secondary")
        prom_b = context.emotion_b.get("prominence", "secondary")
        val_diff = context.valence_diff
        arousal_diff = context.arousal_diff

        # A masking B
        if prom_a == "primary" and prom_b == "underlying" and val_diff > 0.8:
            return {
                "emotion_a": context.emotion_a["emotion_name"],
                "emotion_b": context.emotion_b["emotion_name"],
                "type": "masking",
                "strength": round(min((val_diff + arousal_diff) / 2.5, 1.0), 2),
                "description": (
                    f"{context.emotion_a['emotion_name']} may be masking "
                    f"{context.emotion_b['emotion_name'].lower()}"
                ),
            }
        # B masking A
        if prom_b == "primary" and prom_a == "underlying" and val_diff > 0.8:
            return {
                "emotion_a": context.emotion_b["emotion_name"],
                "emotion_b": context.emotion_a["emotion_name"],
                "type": "masking",
                "strength": round(min((val_diff + arousal_diff) / 2.5, 1.0), 2),
                "description": (
                    f"{context.emotion_b['emotion_name']} may be masking "
                    f"{context.emotion_a['emotion_name'].lower()}"
                ),
            }
        return None


class ComplementaryRule(RelationshipRule):
    """Detects complementary emotions (close in VAC space)."""

    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Check for complementary emotions."""
        if context.distance < 0.5:
            return {
                "emotion_a": context.emotion_a["emotion_name"],
                "emotion_b": context.emotion_b["emotion_name"],
                "type": "complementary",
                "strength": round(1.0 - context.distance, 2),
                "description": (
                    f"{context.emotion_a['emotion_name']} and "
                    f"{context.emotion_b['emotion_name'].lower()} naturally co-occur"
                ),
            }
        return None


class AmplifyingRule(RelationshipRule):
    """Detects amplifying emotions (same valence, different arousal)."""

    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Check for amplifying emotions."""
        if context.valence_diff < 0.4 and context.arousal_diff > 0.8:
            # Higher arousal one amplifies the other
            if context.vac_a[1] > context.vac_b[1]:
                src, target = context.emotion_a, context.emotion_b
            else:
                src, target = context.emotion_b, context.emotion_a

            return {
                "emotion_a": src["emotion_name"],
                "emotion_b": target["emotion_name"],
                "type": "amplifying",
                "strength": round(context.arousal_diff, 2),
                "description": (
                    f"{src['emotion_name']} intensifying {target['emotion_name'].lower()}"
                ),
            }
        return None


class SequentialRule(RelationshipRule):
    """Detects sequential progression (moderate separation)."""

    def check(self, context: RelationshipContext) -> Optional[Dict[str, Any]]:
        """Check for sequential progression."""
        if 0.5 < context.distance < 1.2 and context.arousal_diff > 0.4:
            # Lower arousal typically comes first
            if context.vac_a[1] < context.vac_b[1]:
                first, second = context.emotion_a, context.emotion_b
            else:
                first, second = context.emotion_b, context.emotion_a

            return {
                "emotion_a": first["emotion_name"],
                "emotion_b": second["emotion_name"],
                "type": "sequential",
                "strength": 0.5,
                "description": (
                    f"{first['emotion_name']} may transition to "
                    f"{second['emotion_name'].lower()}"
                ),
            }
        return None
