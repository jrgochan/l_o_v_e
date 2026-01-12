# Clinical Alerts Backend Implementation

**Priority:** 🔴 HIGH  
**Target Module:** Observer  
**Estimated Effort:** 2-3 days  
**Status:** 📋 Ready for Implementation

---

## 🎯 Objective

Move clinical alert detection and interpretation logic from frontend to Observer backend, ensuring medical decision-making is centralized, auditable, and maintainable by clinical experts.

---

## 📊 Current State Analysis

### Frontend Logic to Migrate

#### Location: `experience/web/components/admin/ClinicalDashboard.tsx` (lines 49-101)

```typescript
// Current frontend alert detection
if (vac && vac.arousal > 0.7 && vac.valence < -0.5) {
  alerts.push({
    level: 'critical',
    type: 'high_arousal',
    message: 'High distress detected',
    suggestion: 'Consider crisis assessment protocols'
  });
}

if (prosody?.voice_quality === 'poor' || (prosody?.hnr && prosody.hnr < 5)) {
  alerts.push({
    level: 'warning',
    type: 'pattern_concern',
    message: 'Poor voice quality detected',
    suggestion: 'May indicate vocal strain, fatigue, or emotional distress'
  });
}

// ... more hardcoded thresholds
```

#### Problems

- ❌ Clinical thresholds hardcoded in UI component
- ❌ No versioning of clinical rules
- ❌ Cannot be configured per clinician
- ❌ No audit trail
- ❌ Medical interpretations in frontend

---

## 🏗️ Proposed Architecture

### New Service: ClinicalAlertService

```python
observer/app/services/clinical_alert_service.py
├── ClinicalAlertService
│   ├── evaluate_alerts(vac, prosody, confidence) -> List[ClinicalAlert]
│   ├── _check_distress_level(vac) -> Optional[Alert]
│   ├── _check_voice_quality(prosody) -> Optional[Alert]
│   ├── _check_vocal_stability(prosody) -> Optional[Alert]
│   ├── _check_emotional_suppression(vac, prosody) -> Optional[Alert]
│   ├── _check_confidence_level(confidence) -> Optional[Alert]
│   └── _determine_overall_status(alerts) -> AlertLevel
```

### New Model: ClinicalAlert

```python
observer/app/models/clinical_alert.py
├── ClinicalAlert (SQLAlchemy model)
│   ├── id: UUID
│   ├── session_id: UUID (FK)
│   ├── timestamp: DateTime
│   ├── level: Enum (critical, warning, attention, stable)
│   ├── type: Enum (high_arousal, voice_mismatch, etc.)
│   ├── message: String
│   ├── suggestion: String
│   ├── triggered_by: JSONB (VAC/prosody values that triggered)
│   ├── threshold_used: JSONB (thresholds applied)
│   └── version: String (alert rule version)
```

### Enhanced InsightGenerator

```python
# observer/app/services/insight_generator.py

async def generate_insights(...) -> Dict[str, Any]:
    # ... existing code ...
    
    # NEW: Evaluate clinical alerts
    alert_service = ClinicalAlertService(self.db)
    alerts = await alert_service.evaluate_alerts(
        vac_data=vac_data,
        prosody_data=prosody_data,
        confidence=confidence
    )
    
    insights["clinical_alerts"] = [alert.to_dict() for alert in alerts]
    insights["overall_status"] = alert_service.determine_overall_status(alerts)
    
    return insights
```

---

## 📝 Implementation Steps

### Step 1: Create Database Model (30 min)

#### File: `observer/app/models/clinical_alert.py`

```python
"""
Clinical Alert Model

Stores clinical alert evaluations for audit trail and analysis.
"""

from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
import uuid
from datetime import datetime

from app.database import Base


class AlertLevel(str, enum.Enum):
    """Clinical alert severity levels."""
    CRITICAL = "critical"  # Immediate attention needed
    WARNING = "warning"    # Clinical concern
    ATTENTION = "attention"  # Monitor closely
    STABLE = "stable"      # No concerns


class AlertType(str, enum.Enum):
    """Types of clinical alerts."""
    HIGH_AROUSAL = "high_arousal"  # High negative arousal
    VOICE_MISMATCH = "voice_mismatch"  # Voice-content discrepancy
    LOW_CONFIDENCE = "low_confidence"  # Analysis uncertainty
    PATTERN_CONCERN = "pattern_concern"  # Concerning patterns
    VOICE_QUALITY = "voice_quality"  # Poor voice quality


class ClinicalAlert(Base):
    """
    Clinical alert record.
    
    Stores alerts generated during emotional analysis sessions
    for audit trail, analysis, and clinical review.
    """
    
    __tablename__ = "clinical_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Alert details
    level = Column(Enum(AlertLevel), nullable=False, index=True)
    type = Column(Enum(AlertType), nullable=False, index=True)
    message = Column(String, nullable=False)
    suggestion = Column(String, nullable=True)
    
    # Audit information
    triggered_by = Column(JSONB, nullable=False)  # VAC/prosody values
    threshold_used = Column(JSONB, nullable=False)  # Thresholds applied
    version = Column(String, nullable=False, default="1.0")  # Alert rule version
    
    # Relationships
    session = relationship("ChatSession", back_populates="alerts")
    
    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "timestamp": self.timestamp.isoformat(),
            "level": self.level.value,
            "type": self.type.value,
            "message": self.message,
            "suggestion": self.suggestion,
            "triggered_by": self.triggered_by,
            "threshold_used": self.threshold_used,
            "version": self.version
        }
```

### Step 2: Create Database Migration (15 min)

#### File: `observer/migrations/versions/add_clinical_alerts.sql`

```sql
-- Add clinical_alerts table

CREATE TYPE alert_level AS ENUM ('critical', 'warning', 'attention', 'stable');
CREATE TYPE alert_type AS ENUM ('high_arousal', 'voice_mismatch', 'low_confidence', 'pattern_concern', 'voice_quality');

CREATE TABLE clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Alert details
    level alert_level NOT NULL,
    type alert_type NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    
    -- Audit information
    triggered_by JSONB NOT NULL,
    threshold_used JSONB NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_clinical_alerts_session ON clinical_alerts(session_id);
CREATE INDEX idx_clinical_alerts_timestamp ON clinical_alerts(timestamp);
CREATE INDEX idx_clinical_alerts_level ON clinical_alerts(level);
CREATE INDEX idx_clinical_alerts_type ON clinical_alerts(type);

-- Add alerts relationship to chat_sessions (for completeness)
-- Note: May already exist if using SQLAlchemy relationships
```

### Step 3: Create ClinicalAlertService (2-3 hours)

#### File: `observer/app/services/clinical_alert_service.py`

```python
"""
Clinical Alert Service

Evaluates clinical alerts based on VAC, prosody, and confidence data.
Centralizes clinical decision logic with configurable thresholds.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.models.clinical_alert import ClinicalAlert, AlertLevel, AlertType

logger = logging.getLogger(__name__)


class ClinicalAlertService:
    """
    Evaluate clinical alerts based on emotional analysis data.
    
    Thresholds are configurable and versioned for clinical validation.
    """
    
    # Clinical thresholds (configurable via config/database)
    THRESHOLDS = {
        "version": "1.0",
        "distress": {
            "arousal": 0.7,
            "valence": -0.5
        },
        "voice_quality": {
            "hnr_poor": 5.0,
            "hnr_moderate": 10.0
        },
        "vocal_stability": {
            "jitter_attention": 3.0,
            "jitter_warning": 5.0,
            "shimmer_attention": 6.0,
            "shimmer_warning": 10.0
        },
        "pitch_range": {
            "narrow": 50.0,  # Hz
            "very_narrow": 30.0
        },
        "confidence": {
            "low": 0.6,
            "very_low": 0.4
        },
        "voice_content_discrepancy": {
            "attention": 0.3,
            "warning": 0.5
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def evaluate_alerts(
        self,
        session_id: str,
        vac_data: Dict[str, float],
        prosody_data: Optional[Dict[str, Any]],
        confidence: float,
        insights: Optional[Dict[str, Any]] = None
    ) -> List[ClinicalAlert]:
        """
        Evaluate all clinical alerts for given analysis data.
        
        Args:
            session_id: Chat session ID
            vac_data: VAC coordinates {valence, arousal, connection}
            prosody_data: Voice prosody features
            confidence: Confidence score (0-1)
            insights: Optional insight data (for voice-content correlation)
            
        Returns:
            List of clinical alerts (may be empty)
        """
        alerts = []
        
        # Check distress level
        distress_alert = self._check_distress_level(session_id, vac_data)
        if distress_alert:
            alerts.append(distress_alert)
        
        # Check prosody-related alerts
        if prosody_data:
            voice_quality_alert = self._check_voice_quality(session_id, prosody_data)
            if voice_quality_alert:
                alerts.append(voice_quality_alert)
            
            vocal_stability_alerts = self._check_vocal_stability(session_id, prosody_data)
            alerts.extend(vocal_stability_alerts)
            
            pitch_alert = self._check_pitch_range(session_id, prosody_data)
            if pitch_alert:
                alerts.append(pitch_alert)
        
        # Check voice-content correlation
        if insights and 'voice_content_correlation' in insights:
            correlation_alert = self._check_voice_content_correlation(
                session_id, insights['voice_content_correlation']
            )
            if correlation_alert:
                alerts.append(correlation_alert)
        
        # Check confidence level
        confidence_alert = self._check_confidence_level(session_id, confidence)
        if confidence_alert:
            alerts.append(confidence_alert)
        
        # Persist alerts to database
        if alerts:
            self.db.add_all(alerts)
            await self.db.commit()
            logger.info(f"Generated {len(alerts)} clinical alerts for session {session_id}")
        
        return alerts
    
    def _check_distress_level(self, session_id: str, vac_data: Dict[str, float]) -> Optional[ClinicalAlert]:
        """Check for high distress (high negative arousal)."""
        arousal = vac_data.get('arousal', 0.0)
        valence = vac_data.get('valence', 0.0)
        
        threshold_arousal = self.THRESHOLDS['distress']['arousal']
        threshold_valence = self.THRESHOLDS['distress']['valence']
        
        if arousal > threshold_arousal and valence < threshold_valence:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.CRITICAL,
                type=AlertType.HIGH_AROUSAL,
                message="High distress detected",
                suggestion="Consider crisis assessment protocols",
                triggered_by={
                    "arousal": arousal,
                    "valence": valence
                },
                threshold_used={
                    "arousal": threshold_arousal,
                    "valence": threshold_valence
                },
                version=self.THRESHOLDS['version']
            )
        
        return None
    
    def _check_voice_quality(self, session_id: str, prosody: Dict[str, Any]) -> Optional[ClinicalAlert]:
        """Check voice quality (HNR)."""
        hnr = prosody.get('hnr')
        if hnr is None:
            return None
        
        threshold_poor = self.THRESHOLDS['voice_quality']['hnr_poor']
        
        if hnr < threshold_poor:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.WARNING,
                type=AlertType.VOICE_QUALITY,
                message="Poor voice quality detected",
                suggestion="May indicate vocal strain, fatigue, or emotional distress",
                triggered_by={"hnr": hnr},
                threshold_used={"hnr_poor": threshold_poor},
                version=self.THRESHOLDS['version']
            )
        
        return None
    
    def _check_vocal_stability(self, session_id: str, prosody: Dict[str, Any]) -> List[ClinicalAlert]:
        """Check vocal stability (jitter, shimmer)."""
        alerts = []
        
        # Check jitter
        jitter = prosody.get('jitter')
        if jitter is not None:
            threshold_attention = self.THRESHOLDS['vocal_stability']['jitter_attention']
            threshold_warning = self.THRESHOLDS['vocal_stability']['jitter_warning']
            
            if jitter > threshold_warning:
                alerts.append(ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING,
                    type=AlertType.PATTERN_CONCERN,
                    message="High vocal jitter detected",
                    suggestion="May indicate significant anxiety, stress, or vocal tension",
                    triggered_by={"jitter": jitter},
                    threshold_used={"jitter_warning": threshold_warning},
                    version=self.THRESHOLDS['version']
                ))
            elif jitter > threshold_attention:
                alerts.append(ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.ATTENTION,
                    type=AlertType.PATTERN_CONCERN,
                    message="Elevated vocal jitter",
                    suggestion="May indicate anxiety, stress, or vocal tension",
                    triggered_by={"jitter": jitter},
                    threshold_used={"jitter_attention": threshold_attention},
                    version=self.THRESHOLDS['version']
                ))
        
        # Check shimmer
        shimmer = prosody.get('shimmer')
        if shimmer is not None:
            threshold_attention = self.THRESHOLDS['vocal_stability']['shimmer_attention']
            threshold_warning = self.THRESHOLDS['vocal_stability']['shimmer_warning']
            
            if shimmer > threshold_warning:
                alerts.append(ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.WARNING,
                    type=AlertType.PATTERN_CONCERN,
                    message="High vocal shimmer detected",
                    suggestion="May indicate vocal instability or emotional distress",
                    triggered_by={"shimmer": shimmer},
                    threshold_used={"shimmer_warning": threshold_warning},
                    version=self.THRESHOLDS['version']
                ))
            elif shimmer > threshold_attention:
                alerts.append(ClinicalAlert(
                    session_id=session_id,
                    level=AlertLevel.ATTENTION,
                    type=AlertType.PATTERN_CONCERN,
                    message="Elevated vocal shimmer",
                    suggestion="May indicate vocal instability",
                    triggered_by={"shimmer": shimmer},
                    threshold_used={"shimmer_attention": threshold_attention},
                    version=self.THRESHOLDS['version']
                ))
        
        return alerts
    
    def _check_pitch_range(self, session_id: str, prosody: Dict[str, Any]) -> Optional[ClinicalAlert]:
        """Check pitch range (flat affect indicator)."""
        pitch_range = prosody.get('pitch_range')
        if pitch_range is None:
            return None
        
        threshold_narrow = self.THRESHOLDS['pitch_range']['narrow']
        threshold_very_narrow = self.THRESHOLDS['pitch_range']['very_narrow']
        
        if pitch_range < threshold_very_narrow:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.WARNING,
                type=AlertType.PATTERN_CONCERN,
                message="Very limited pitch range detected",
                suggestion="May indicate significant flat affect or emotional suppression",
                triggered_by={"pitch_range": pitch_range},
                threshold_used={"pitch_range_very_narrow": threshold_very_narrow},
                version=self.THRESHOLDS['version']
            )
        elif pitch_range < threshold_narrow:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.ATTENTION,
                type=AlertType.PATTERN_CONCERN,
                message="Limited pitch range detected",
                suggestion="May indicate flat affect or emotional suppression",
                triggered_by={"pitch_range": pitch_range},
                threshold_used={"pitch_range_narrow": threshold_narrow},
                version=self.THRESHOLDS['version']
            )
        
        return None
    
    def _check_voice_content_correlation(
        self, 
        session_id: str, 
        correlation: Dict[str, Any]
    ) -> Optional[ClinicalAlert]:
        """Check voice-content discrepancy."""
        discrepancy = correlation.get('discrepancy', 0.0)
        
        threshold_attention = self.THRESHOLDS['voice_content_discrepancy']['attention']
        threshold_warning = self.THRESHOLDS['voice_content_discrepancy']['warning']
        
        if discrepancy > threshold_warning:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.WARNING,
                type=AlertType.VOICE_MISMATCH,
                message="Significant voice-content discrepancy",
                suggestion="Client may be suppressing or masking emotions",
                triggered_by={"discrepancy": discrepancy},
                threshold_used={"discrepancy_warning": threshold_warning},
                version=self.THRESHOLDS['version']
            )
        elif discrepancy > threshold_attention:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.ATTENTION,
                type=AlertType.VOICE_MISMATCH,
                message="Voice-content discrepancy detected",
                suggestion="Monitor for emotional suppression or incongruence",
                triggered_by={"discrepancy": discrepancy},
                threshold_used={"discrepancy_attention": threshold_attention},
                version=self.THRESHOLDS['version']
            )
        
        return None
    
    def _check_confidence_level(self, session_id: str, confidence: float) -> Optional[ClinicalAlert]:
        """Check analysis confidence level."""
        threshold_low = self.THRESHOLDS['confidence']['low']
        threshold_very_low = self.THRESHOLDS['confidence']['very_low']
        
        if confidence < threshold_very_low:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.WARNING,
                type=AlertType.LOW_CONFIDENCE,
                message="Very low analysis confidence",
                suggestion="Manual clinical review strongly recommended",
                triggered_by={"confidence": confidence},
                threshold_used={"confidence_very_low": threshold_very_low},
                version=self.THRESHOLDS['version']
            )
        elif confidence < threshold_low:
            return ClinicalAlert(
                session_id=session_id,
                level=AlertLevel.ATTENTION,
                type=AlertType.LOW_CONFIDENCE,
                message="Low analysis confidence",
                suggestion="Manual verification recommended",
                triggered_by={"confidence": confidence},
                threshold_used={"confidence_low": threshold_low},
                version=self.THRESHOLDS['version']
            )
        
        return None
    
    def determine_overall_status(self, alerts: List[ClinicalAlert]) -> str:
        """Determine overall clinical status from alerts."""
        if not alerts:
            return "stable"
        
        if any(a.level == AlertLevel.CRITICAL for a in alerts):
            return "critical"
        
        if any(a.level == AlertLevel.WARNING for a in alerts):
            return "warning"
        
        if any(a.level == AlertLevel.ATTENTION for a in alerts):
            return "attention"
        
        return "stable"
```

### Step 4: Update InsightGenerator (30 min)

#### File: `observer/app/services/insight_generator.py`

```python
# Add import
from app.services.clinical_alert_service import ClinicalAlertService

# In generate_insights method, add:
async def generate_insights(
    self,
    emotion_name: str,
    vac_data: Dict[str, float],
    confidence: float,
    tone_mode: str = 'warm',
    prosody_data: Optional[Dict[str, Any]] = None,
    reasoning: Optional[str] = None,
    use_atlas_mapping: bool = True,
    session_id: Optional[str] = None  # NEW parameter
) -> Dict[str, Any]:
    # ... existing code ...
    
    # NEW: Evaluate clinical alerts
    if session_id:
        alert_service = ClinicalAlertService(self.db)
        alerts = await alert_service.evaluate_alerts(
            session_id=session_id,
            vac_data=vac_data,
            prosody_data=prosody_data,
            confidence=confidence,
            insights=insights
        )
        
        insights["clinical_alerts"] = [alert.to_dict() for alert in alerts]
        insights["overall_status"] = alert_service.determine_overall_status(alerts)
    
    return insights
```

### Step 5: Update WebSocket Handler (30 min)

#### File: `observer/app/api/routes/chat_websocket.py`

```python
# Ensure session_id is passed to insight generator
insights = await insight_generator.generate_insights(
    emotion_name=emotion_name,
    vac_data=vac_data,
    confidence=confidence,
    tone_mode=tone_mode,
    prosody_data=prosody_data,
    use_atlas_mapping=use_atlas_mapping,
    session_id=session_id  # NEW: Pass session ID
)
```

### Step 6: Update Frontend (1 hour)

#### File: `experience/web/components/admin/ClinicalDashboard.tsx`

```typescript
// REMOVE all local alert calculation logic (lines 49-101)
// REPLACE with backend-provided alerts

export function ClinicalDashboard({
  emotion,
  category,
  vac,
  confidence,
  prosody,
  insights,  // Now includes clinical_alerts from backend
  sessionMetrics,
  expandState,
  vacHistory,
  emotionTimeline,
  audioBlob
}: ClinicalDashboardProps) {
  const isExpanded = expandState !== 'normal';

  // Get alerts from backend insights
  const alerts = insights?.clinical_alerts || [];
  const overallStatus = insights?.overall_status || 'stable';

  // Rest of component uses backend-provided data...
}
```

---

## ✅ Testing Plan

### Unit Tests

```python
# tests/test_clinical_alert_service.py

async def test_distress_detection():
    """Test high distress alert detection."""
    service = ClinicalAlertService(db)
    
    vac_data = {"valence": -0.6, "arousal": 0.8, "connection": 0.0}
    alerts = await service.evaluate_alerts(
        session_id="test-session",
        vac_data=vac_data,
        prosody_data=None,
        confidence=0.9
    )
    
    assert len(alerts) == 1
    assert alerts[0].level == AlertLevel.CRITICAL
    assert alerts[0].type == AlertType.HIGH_AROUSAL

async def test_voice_quality_alert():
    """Test voice quality alert."""
    # Similar test for HNR < 5

async def test_no_alerts_when_stable():
    """Test that no alerts are generated for stable state."""
    # Test with good values
```

### Integration Tests

```python
# tests/integration/test_chat_websocket_alerts.py

async def test_websocket_sends_alerts():
    """Test that WebSocket sends clinical alerts to client."""
    # Send message with high distress indicators
    # Verify alert is returned in insights
```

---

## 📈 Success Metrics

- ✅ All clinical logic moved to backend
- ✅ Alerts persisted to database
- ✅ Frontend becomes pure display layer
- ✅ Thresholds configurable
- ✅ Full audit trail of alerts
- ✅ Unit test coverage > 80%

---

## 🔄 Rollout Strategy

1. **Implement backend** (do not deploy)
2. **Add feature flag** in config
3. **Deploy with flag OFF** (old logic still active)
4. **Enable for internal testing**
5. **Compare old vs new** for validation
6. **Enable for all users**
7. **Remove old frontend logic** after 1 week

---

**Implementation Ready:** ✅  
**Dependencies:** None  
**Risk Level:** Low (can be feature-flagged)
