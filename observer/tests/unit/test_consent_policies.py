import pytest

from app.core.consent_policies import (
    CONSENT_POLICIES,
    get_optional_policies,
    get_policy,
    get_required_policies,
)


@pytest.mark.unit
def test_policies_loaded():
    """Verify default policies are loaded into the registry."""
    assert len(CONSENT_POLICIES) >= 5
    assert "terms_of_service" in CONSENT_POLICIES
    assert "emotional_data_processing" in CONSENT_POLICIES
    assert "clinical_sharing" in CONSENT_POLICIES
    assert "research_participation" in CONSENT_POLICIES
    assert "voice_analysis" in CONSENT_POLICIES


@pytest.mark.unit
def test_get_policy():
    """Verify policy lookup by key."""
    policy = get_policy("terms_of_service")
    assert policy is not None
    assert policy.key == "terms_of_service"
    assert policy.category == "legal"

    # serialization
    data = policy.to_dict()
    assert data["key"] == "terms_of_service"
    assert data["required"] is True
    assert "version" in data

    # unknown policy
    assert get_policy("unknown_policy_key") is None


@pytest.mark.unit
def test_required_vs_optional():
    """Verify required vs optional policy filtering."""
    required = get_required_policies()
    optional = get_optional_policies()

    req_keys = {p.key for p in required}
    opt_keys = {p.key for p in optional}

    # Based on defaults:
    # Required: terms, emotional_data, clinical_sharing
    # Optional: research, voice
    assert "terms_of_service" in req_keys
    assert "emotional_data_processing" in req_keys
    assert "clinical_sharing" in req_keys

    assert "research_participation" in opt_keys
    assert "voice_analysis" in opt_keys

    assert len(req_keys.intersection(opt_keys)) == 0
