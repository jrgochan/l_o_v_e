import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.clinical_alert_service import ClinicalAlertService
from app.models.clinical_alert import AlertLevel, AlertType

@pytest.fixture
def mock_db():
    m = AsyncMock()
    # add_all is synchronous
    m.add_all = MagicMock()
    return m

@pytest.fixture
def service(mock_db):
    return ClinicalAlertService(mock_db)

@pytest.mark.asyncio
async def test_evaluate_alerts_clean(service, mock_db):
    """Test no alerts generated for normal data."""
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={"valence": 0.5, "arousal": 0.0},
        prosody_data={"hnr": 20, "jitter": 1.0, "shimmer": 2.0, "pitch_range": 100},
        confidence=0.9
    )
    assert len(alerts) == 0
    mock_db.add_all.assert_not_called()

@pytest.mark.asyncio
async def test_distress_alert(service):
    """Test high distress alert."""
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={"valence": -0.6, "arousal": 0.8}, # Trigger thresholds
        prosody_data=None,
        confidence=0.9
    )
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.HIGH_AROUSAL.value
    assert alerts[0].level == AlertLevel.CRITICAL.value

@pytest.mark.asyncio
async def test_voice_quality_alert(service):
    """Test poor voice quality (HNR)."""
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"hnr": 4.0}, # < 5.0
        confidence=0.9
    )
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.VOICE_QUALITY.value

@pytest.mark.asyncio
async def test_vocal_stability_jitter(service):
    """Test jitter alerts (warning and attention)."""
    # Warning (>5.0)
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"jitter": 6.0},
        confidence=0.9
    )
    assert len(alerts) == 1
    assert alerts[0].level == AlertLevel.WARNING.value
    
    # Attention (>3.0)
    alerts2 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"jitter": 4.0},
        confidence=0.9
    )
    assert len(alerts2) == 1
    assert alerts2[0].level == AlertLevel.ATTENTION.value

@pytest.mark.asyncio
async def test_vocal_stability_shimmer(service):
    """Test shimmer alerts (warning and attention)."""
    # Warning (>10.0)
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"shimmer": 11.0},
        confidence=0.9
    )
    assert len(alerts) == 1
    assert alerts[0].level == AlertLevel.WARNING.value

    # Attention (>6.0) - NEW
    alerts2 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"shimmer": 8.0},
        confidence=0.9
    )
    assert len(alerts2) == 1
    assert alerts2[0].level == AlertLevel.ATTENTION.value

@pytest.mark.asyncio
async def test_pitch_range_alert(service):
    """Test flat affect (pitch range)."""
    # Very narrow (<30)
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"pitch_range": 20.0},
        confidence=0.9
    )
    assert len(alerts) == 1
    assert alerts[0].level == AlertLevel.WARNING.value

    # Narrow (<50) - NEW
    alerts2 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data={"pitch_range": 40.0},
        confidence=0.9
    )
    assert len(alerts2) == 1
    assert alerts2[0].level == AlertLevel.ATTENTION.value

@pytest.mark.asyncio
async def test_voice_content_discrepancy(service):
    """Test correlation mismatch."""
    # Warning (>0.5)
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data=None,
        confidence=0.9,
        insights={"voice_content_correlation": {"discrepancy": 0.6}}
    )
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.VOICE_MISMATCH.value
    assert alerts[0].level == AlertLevel.WARNING.value

    # Attention (>0.3) - NEW
    alerts2 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data=None,
        confidence=0.9,
        insights={"voice_content_correlation": {"discrepancy": 0.4}}
    )
    assert len(alerts2) == 1
    assert alerts2[0].level == AlertLevel.ATTENTION.value

    # No Alert (<0.3) - NEW (Testing 'insights' branch where no alert is made)
    alerts3 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data=None,
        confidence=0.9,
        insights={"voice_content_correlation": {"discrepancy": 0.1}}
    )
    assert len(alerts3) == 0

@pytest.mark.asyncio
async def test_low_confidence(service):
    """Test low confidence alerts."""
    # Very Low (<0.4)
    alerts = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data=None,
        confidence=0.3
    )
    assert len(alerts) == 1
    assert alerts[0].type == AlertType.LOW_CONFIDENCE.value
    assert alerts[0].level == AlertLevel.WARNING.value

    # Low (<0.6) - NEW
    alerts2 = await service.evaluate_alerts(
        session_id="sess_1",
        vac_data={},
        prosody_data=None,
        confidence=0.5
    )
    assert len(alerts2) == 1
    assert alerts2[0].level == AlertLevel.ATTENTION.value

def test_overall_status(service):
    """Test status aggregation."""
    crit = MagicMock(level=AlertLevel.CRITICAL.value)
    warn = MagicMock(level=AlertLevel.WARNING.value)
    attn = MagicMock(level=AlertLevel.ATTENTION.value)
    unknown = MagicMock(level="UNKNOWN")
    
    assert service.determine_overall_status([]) == "stable"
    assert service.determine_overall_status([crit, warn]) == "critical"
    assert service.determine_overall_status([warn, attn]) == "warning"
    assert service.determine_overall_status([attn]) == "attention"
    
    # Hit unreachable "stable" at end if alerts exist but no matching level
    assert service.determine_overall_status([unknown]) == "stable"
