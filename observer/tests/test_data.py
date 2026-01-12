"""
Canonical test data for Observer module tests.
Provides standard VAC vectors, emotion definitions, and test constants.
"""

from typing import Dict, List

# ============================================================================
# CANONICAL VAC VECTORS
# ============================================================================

# Positive emotions
JOY_VAC = [0.9, 0.7, 0.8]
HAPPINESS_VAC = [0.7, 0.5, 0.5]
GRATITUDE_VAC = [0.8, 0.3, 0.9]
CALM_VAC = [0.5, -0.7, 0.4]

# Negative emotions
SHAME_VAC = [-0.9, -0.1, -1.0]  # Maximum negative Connection
DESPAIR_VAC = [-0.9, -0.6, -0.7]
ANGER_VAC = [-0.5, 0.8, -0.2]
SADNESS_VAC = [-0.6, -0.4, 0.0]

# THE CRITICAL DISTINCTION
COMPASSION_VAC = [0.5, 0.2, 0.9]   # Positive Connection (feeling WITH)
PITY_VAC = [-0.3, -0.1, -0.7]      # Negative Connection (feeling FOR)

# Paradoxical emotion
GRIEF_VAC = [-0.9, -0.4, 0.5]      # Negative valence, positive Connection

# Connection axis extremes
BELONGING_VAC = [0.8, 0.4, 1.0]    # Maximum positive Connection
LOVE_VAC = [0.9, 0.3, 1.0]         # Maximum positive Connection
HATE_VAC = [-0.9, 0.6, -1.0]       # Maximum negative Connection
DEHUMANIZATION_VAC = [-0.9, 0.4, -1.0]  # Maximum negative Connection

# Same V/A, opposite Connection
PRIDE_VAC = [0.7, 0.6, 0.6]        # Positive Connection
HUBRIS_VAC = [0.7, 0.6, -0.8]      # Negative Connection

# Neutral/Complex
NEUTRAL_VAC = [0.0, 0.0, 0.0]      # Identity quaternion
VULNERABILITY_VAC = [0.0, 0.3, 0.6]  # Gateway emotion
BITTERSWEETNESS_VAC = [0.0, -0.2, 0.5]  # Complex duality

# ============================================================================
# TEST EMOTION DEFINITIONS
# ============================================================================

TEST_EMOTIONS = {
    "Joy": {
        "vac": JOY_VAC,
        "category": "When Life Is Good",
        "definition": "Intense, brief feeling of positive emotion and delight.",
        "haptic": "LIGHT_PULSE"
    },
    "Shame": {
        "vac": SHAME_VAC,
        "category": "When We Fall Short",
        "definition": "I am bad; identity-level negative self-judgment.",
        "haptic": "HEAVY_THROB"
    },
    "Compassion": {
        "vac": COMPASSION_VAC,
        "category": "Places We Go With Others",
        "definition": "Feeling with another; motivated to help; shared humanity.",
        "haptic": "HEARTBEAT"
    },
    "Pity": {
        "vac": PITY_VAC,
        "category": "Places We Go With Others",
        "definition": "Feeling for another from a place of separation; condescension.",
        "haptic": "HEAVY_THROB"
    },
    "Grief": {
        "vac": GRIEF_VAC,
        "category": "When We're Hurting",
        "definition": "Deep loss with paradoxical connection to love.",
        "haptic": "HEARTBEAT"
    },
    "Anger": {
        "vac": ANGER_VAC,
        "category": "When We Feel Wronged",
        "definition": "Strong feeling of displeasure or hostility.",
        "haptic": "HEAVY_THROB"
    },
    "Frustration": {
        "vac": [-0.5, 0.6, -0.3],  # Slightly lower arousal than anger
        "category": "When We Feel Wronged",
        "definition": "Feeling of being upset/annoyed.",
        "haptic": "FAST_PULSE"
    },
    "Panic": {
        "vac": [-0.6, 0.8, -0.4],  # Very high arousal
        "category": "When Things Are Uncertain",
        "definition": "Sudden uncontrollable fear or anxiety.",
        "haptic": "CHAOS"
    },
    "Calm": {
        "vac": CALM_VAC,
        "category": "When Life Is Good",
        "definition": "State of being free from agitation.",
        "haptic": "SLOW_WAVE"
    },
    "Vulnerability": {
        "vac": VULNERABILITY_VAC,
        "category": "When We Search for Connection",
        "definition": "Uncertainty, risk, and emotional exposure.",
        "haptic": "OPEN_PULSE"
    },
    "Anxiety": {
        "vac": [-0.3, 0.6, -0.2],
        "category": "When Things Are Uncertain",
        "definition": "Worry about future uncertainties.",
        "haptic": "FAST_PULSE"
    },
    "Neutral": {
        "vac": [0.0, 0.0, 0.0],
        "category": "Neutral",
        "definition": "Balanced state.",
        "haptic": "STEADY"
    },
    "Relief": {
        "vac": [0.3, -0.3, 0.2],
        "category": "When Things Are Uncertain",
        "definition": "Relaxation following release of anxiety.",
        "haptic": "SLOW_WAVE"
    },
}

# ============================================================================
# TEST INPUT TEXTS
# ============================================================================

# Short texts (< 10 words) - Should weight VAC more
SHORT_TEXTS = {
    "joy": "I feel amazing today!",
    "shame": "I'm such a failure.",
    "compassion": "I want to help them.",
    "pity": "Poor thing.",
    "anger": "This is not fair!",
}

# Long texts (>= 10 words) - Should weight semantic more
LONG_TEXTS = {
    "joy": "I feel absolutely amazing today, everything is clicking and I'm on top of the world, feeling grateful for all the blessings in my life.",
    "shame": "I feel like such a complete failure, unworthy of love or connection, fundamentally flawed at my core, and everyone can see it.",
    "compassion": "I feel deeply connected to their pain and want to help them through this difficult time with understanding and shared humanity.",
    "pity": "I feel sorry for them from a distance, they're unfortunate but I'm glad it's not me, poor thing they really can't help themselves.",
    "grief": "I miss them so deeply it hurts, but I'm grateful for the love we shared and the connection that remains in my heart.",
}

# ============================================================================
# EXPECTED QUATERNIONS (from Versor)
# ============================================================================

# These should be verified against actual Versor output
EXPECTED_QUATERNIONS = {
    "neutral": [1.0, 0.0, 0.0, 0.0],  # Identity
    "joy": [0.303, 0.632, 0.491, 0.561],  # Approximate
    "shame": [0.340, -0.629, -0.080, -0.699],  # Approximate
}

# ============================================================================
# TEST CONSTANTS
# ============================================================================

# Tolerance for floating point comparisons
FLOAT_TOLERANCE = 1e-6
UNIT_QUAT_TOLERANCE = 1e-4

# Metrics thresholds
FLOODING_THRESHOLD = 2.0  # rad/s
STUCKNESS_THRESHOLD = 5.0  # rigidity score

# Distance ranges
MAX_VAC_DISTANCE = 3.46  # sqrt(12) from [-1,-1,-1] to [1,1,1]
MAX_SEMANTIC_DISTANCE = 2.0  # 1 - (-1) for cosine distance

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def is_unit_quaternion(q: List[float], tolerance: float = UNIT_QUAT_TOLERANCE) -> bool:
    """Check if quaternion is unit length"""
    magnitude_squared = sum(comp ** 2 for comp in q)
    return abs(magnitude_squared - 1.0) < tolerance


def assert_vac_in_range(vac: List[float]) -> None:
    """Assert all VAC components in [-1, 1]"""
    assert len(vac) == 3, f"VAC must have 3 components, got {len(vac)}"
    for i, val in enumerate(vac):
        assert -1.0 <= val <= 1.0, f"VAC[{i}] = {val} out of range [-1, 1]"


def create_test_vac(valence: float, arousal: float, connection: float) -> List[float]:
    """Create and validate a test VAC vector"""
    vac = [valence, arousal, connection]
    assert_vac_in_range(vac)
    return vac
