"""Concrete Clinical Alert Rules.

Implementations of specific logic for detecting clinical risks.
"""

from typing import Any, Dict, List

from app.models.clinical_alert import AlertLevel, AlertType, ClinicalAlert
from app.services.clinical.rules.base import AlertRule, AnalysisContext


class DistressRule(AlertRule):
    """Detects high distress (high negative arousal)."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for high distress."""
        arousal = context.vac_data.get("arousal", 0.0)
        valence = context.vac_data.get("valence", 0.0)

        threshold_arousal = thresholds["distress"]["arousal"]
        threshold_valence = thresholds["distress"]["valence"]

        if arousal > threshold_arousal and valence < threshold_valence:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.CRITICAL.value,
                    type=AlertType.HIGH_AROUSAL.value,
                    message="High distress detected",
                    suggestion="Consider crisis assessment protocols",
                    triggered_by={"arousal": arousal, "valence": valence},
                    threshold_used={
                        "arousal": threshold_arousal,
                        "valence": threshold_valence,
                    },
                    version=thresholds["version"],
                )
            ]
        return []


class VoiceQualityRule(AlertRule):
    """Detects poor voice quality (HNR)."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for poor voice quality."""
        if not context.prosody_data:
            return []

        hnr = context.prosody_data.get("hnr")
        if hnr is None:
            return []

        threshold_poor = thresholds["voice_quality"]["hnr_poor"]
        # threshold_moderate = thresholds["voice_quality"]["hnr_moderate"]  # unused

        if hnr < threshold_poor:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING.value,
                    type=AlertType.VOICE_QUALITY.value,
                    message="Poor voice quality detected",
                    suggestion="May indicate vocal strain, fatigue, or emotional distress",
                    triggered_by={"hnr": hnr},
                    threshold_used={"hnr_poor": threshold_poor},
                    version=thresholds["version"],
                )
            ]
        return []


class VocalStabilityRule(AlertRule):
    """Detects vocal instability (jitter, shimmer)."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for vocal instability."""
        if not context.prosody_data:
            return []

        alerts = []
        prosody = context.prosody_data

        # Check jitter
        jitter = prosody.get("jitter")
        if jitter is not None:
            t_attn = thresholds["vocal_stability"]["jitter_attention"]
            t_warn = thresholds["vocal_stability"]["jitter_warning"]

            if jitter > t_warn:
                alerts.append(
                    ClinicalAlert(
                        session_id=session_id,
                        level=AlertLevel.WARNING.value,
                        type=AlertType.PATTERN_CONCERN.value,
                        message="High vocal jitter detected",
                        suggestion="May indicate significant anxiety, stress, or vocal tension",
                        triggered_by={"jitter": jitter},
                        threshold_used={"jitter_warning": t_warn},
                        version=thresholds["version"],
                    )
                )
            elif jitter > t_attn:
                alerts.append(
                    ClinicalAlert(
                        session_id=session_id,
                        level=AlertLevel.ATTENTION.value,
                        type=AlertType.PATTERN_CONCERN.value,
                        message="Elevated vocal jitter",
                        suggestion="May indicate anxiety, stress, or vocal tension",
                        triggered_by={"jitter": jitter},
                        threshold_used={"jitter_attention": t_attn},
                        version=thresholds["version"],
                    )
                )

        # Check shimmer
        shimmer = prosody.get("shimmer")
        if shimmer is not None:
            t_attn = thresholds["vocal_stability"]["shimmer_attention"]
            t_warn = thresholds["vocal_stability"]["shimmer_warning"]

            if shimmer > t_warn:
                alerts.append(
                    ClinicalAlert(
                        session_id=session_id,
                        level=AlertLevel.WARNING.value,
                        type=AlertType.PATTERN_CONCERN.value,
                        message="High vocal shimmer detected",
                        suggestion="May indicate vocal instability or emotional distress",
                        triggered_by={"shimmer": shimmer},
                        threshold_used={"shimmer_warning": t_warn},
                        version=thresholds["version"],
                    )
                )
            elif shimmer > t_attn:
                alerts.append(
                    ClinicalAlert(
                        session_id=session_id,
                        level=AlertLevel.ATTENTION.value,
                        type=AlertType.PATTERN_CONCERN.value,
                        message="Elevated vocal shimmer",
                        suggestion="May indicate vocal instability",
                        triggered_by={"shimmer": shimmer},
                        threshold_used={"shimmer_attention": t_attn},
                        version=thresholds["version"],
                    )
                )

        return alerts


class PitchRangeRule(AlertRule):
    """Detects limited pitch range (flat affect)."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for silence patterns."""
        if not context.prosody_data:
            return []

        pitch_range = context.prosody_data.get("pitch_range")
        if pitch_range is None:
            return []

        t_narrow = thresholds["pitch_range"]["narrow"]
        t_very_narrow = thresholds["pitch_range"]["very_narrow"]

        if pitch_range < t_very_narrow:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING.value,
                    type=AlertType.PATTERN_CONCERN.value,
                    message="Very limited pitch range detected",
                    suggestion="May indicate significant flat affect or emotional suppression",
                    triggered_by={"pitch_range": pitch_range},
                    threshold_used={"pitch_range_very_narrow": t_very_narrow},
                    version=thresholds["version"],
                )
            ]
        if pitch_range < t_narrow:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.ATTENTION.value,
                    type=AlertType.PATTERN_CONCERN.value,
                    message="Limited pitch range detected",
                    suggestion="May indicate flat affect or emotional suppression",
                    triggered_by={"pitch_range": pitch_range},
                    threshold_used={"pitch_range_narrow": t_narrow},
                    version=thresholds["version"],
                )
            ]
        return []


class VoiceContentCorrelationRule(AlertRule):
    """Detects correlation discrepancy."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for correlation discrepancy."""
        if not context.insights or "voice_content_correlation" not in context.insights:
            return []

        correlation = context.insights["voice_content_correlation"]
        discrepancy = correlation.get("discrepancy", 0.0)

        t_attn = thresholds["voice_content_discrepancy"]["attention"]
        t_warn = thresholds["voice_content_discrepancy"]["warning"]

        if discrepancy > t_warn:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING.value,
                    type=AlertType.VOICE_MISMATCH.value,
                    message="Significant voice-content discrepancy",
                    suggestion="Client may be suppressing or masking emotions",
                    triggered_by={"discrepancy": discrepancy},
                    threshold_used={"discrepancy_warning": t_warn},
                    version=thresholds["version"],
                )
            ]
        if discrepancy > t_attn:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.ATTENTION.value,
                    type=AlertType.VOICE_MISMATCH.value,
                    message="Voice-content discrepancy detected",
                    suggestion="Monitor for emotional suppression or incongruence",
                    triggered_by={"discrepancy": discrepancy},
                    threshold_used={"discrepancy_attention": t_attn},
                    version=thresholds["version"],
                )
            ]
        return []


class ConfidenceRule(AlertRule):
    """Detects low confidence."""

    def evaluate(
        self, session_id: str, context: AnalysisContext, thresholds: Dict[str, Any]
    ) -> List[ClinicalAlert]:
        """Evaluate for low confidence."""
        confidence = context.confidence
        t_low = thresholds["confidence"]["low"]
        t_very_low = thresholds["confidence"]["very_low"]

        if confidence < t_very_low:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING.value,
                    type=AlertType.LOW_CONFIDENCE.value,
                    message="Very low analysis confidence",
                    suggestion="Manual clinical review strongly recommended",
                    triggered_by={"confidence": confidence},
                    threshold_used={"confidence_very_low": t_very_low},
                    version=thresholds["version"],
                )
            ]
        if confidence < t_low:
            return [
                ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.ATTENTION.value,
                    type=AlertType.LOW_CONFIDENCE.value,
                    message="Low analysis confidence",
                    suggestion="Manual verification recommended",
                    triggered_by={"confidence": confidence},
                    threshold_used={"confidence_low": t_low},
                    version=thresholds["version"],
                )
            ]
        return []
