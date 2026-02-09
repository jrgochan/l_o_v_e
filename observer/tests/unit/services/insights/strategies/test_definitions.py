from app.services.insights.strategies.definitions import (
    DefaultStrategy,
    DisconnectionStrategy,
    HighArousalNegativeValenceStrategy,
    LowArousalStrategy,
    PositiveValenceStrategy,
)


def test_high_arousal_negative_valence_strategy():
    strategy = HighArousalNegativeValenceStrategy()

    # Test can_handle
    assert strategy.can_handle({"arousal": 0.8, "valence": -0.5}, {}) is True
    assert strategy.can_handle({"arousal": 0.5, "valence": -0.5}, {}) is False  # Arousal too low
    assert strategy.can_handle({"arousal": 0.8, "valence": 0.5}, {}) is False  # Valence positive

    # Test generate - default
    msg = strategy.generate({}, "default")
    assert "When emotions feel this intense" in msg

    # Test generate - clinical (Line 21)
    msg = strategy.generate({}, "clinical")
    assert "High arousal with negative valence detected" in msg


def test_low_arousal_strategy():
    strategy = LowArousalStrategy()

    # Test can_handle
    assert strategy.can_handle({"arousal": -0.6}, {}) is True
    assert strategy.can_handle({"arousal": -0.4}, {}) is False

    # Test generate - default
    msg = strategy.generate({}, "default")
    assert "Low energy can be a signal" in msg

    # Test generate - clinical (Line 40-44)
    msg = strategy.generate({}, "clinical")
    assert "Low arousal state suggesting deactivation" in msg


def test_disconnection_strategy():
    strategy = DisconnectionStrategy()

    # Test can_handle
    assert strategy.can_handle({"connection": -0.4}, {}) is True
    assert strategy.can_handle({"connection": -0.2}, {}) is False

    # Test generate - default
    msg = strategy.generate({}, "default")
    assert "Feeling disconnected is really hard" in msg

    # Test generate - clinical (Line 60)
    msg = strategy.generate({}, "clinical")
    assert "Disconnection pattern detected" in msg


def test_positive_valence_strategy():
    strategy = PositiveValenceStrategy()

    # Test can_handle
    assert strategy.can_handle({"valence": 0.6}, {}) is True
    assert strategy.can_handle({"valence": 0.4}, {}) is False

    # Test generate - default
    msg = strategy.generate({}, "default")
    assert "This is a positive state" in msg

    # Test generate - clinical (Line 77)
    msg = strategy.generate({}, "clinical")
    assert "Positive affective state" in msg


def test_default_strategy():
    strategy = DefaultStrategy()

    # Test can_handle
    assert strategy.can_handle({}, {}) is True

    # Test generate - default
    msg = strategy.generate({}, "default")
    assert "Whatever you're feeling right now is valid" in msg

    # Test generate - clinical (Line 94)
    msg = strategy.generate({}, "clinical")
    assert "General emotional processing indicated" in msg
