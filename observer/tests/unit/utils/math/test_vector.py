from app.utils.math import vector


def test_magnitude():
    # Test zero vector
    assert vector.magnitude([0.0, 0.0, 0.0]) == 0.0

    # Test unit vector
    assert vector.magnitude([1.0, 0.0, 0.0]) == 1.0

    # Test known vector (3, 4, 0) -> 5
    assert vector.magnitude([3.0, 4.0, 0.0]) == 5.0

    # Test negative components
    assert vector.magnitude([-3.0, -4.0, 0.0]) == 5.0


def test_euclidean_distance():
    v1 = [0.0, 0.0, 0.0]
    v2 = [3.0, 4.0, 0.0]
    assert vector.euclidean_distance(v1, v2) == 5.0
    assert vector.euclidean_distance(v2, v1) == 5.0

    v3 = [1.0, 1.0, 1.0]
    # sqrt((1-1)^2 + (1-1)^2 + (1-1)^2) = 0
    assert vector.euclidean_distance(v3, v3) == 0.0


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert vector.cosine_similarity(v1, v2) == 1.0

    v3 = [0.0, 1.0, 0.0]
    assert vector.cosine_similarity(v1, v3) == 0.0  # Orthogonal

    v4 = [-1.0, 0.0, 0.0]
    assert vector.cosine_similarity(v1, v4) == -1.0  # Opposite

    # Zero vector handling
    assert vector.cosine_similarity([0, 0, 0], v1) == 0.0


def test_cosine_distance():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    # 1 - 1 = 0
    assert vector.cosine_distance(v1, v2) == 0.0

    v3 = [0.0, 1.0, 0.0]
    # 1 - 0 = 1
    assert vector.cosine_distance(v1, v3) == 1.0

    v4 = [-1.0, 0.0, 0.0]
    # 1 - (-1) = 2
    assert vector.cosine_distance(v1, v4) == 2.0


def test_update_running_average():
    # Initial: 10, Count: 1, New: 20 -> (10*0 + 20)/1 = 20 (if logic treats count=1 as first item?)
    # Logic: if count <= 1: return new_value
    assert vector.update_running_average(10.0, 1, 20.0) == 20.0

    # Avg=10, Count=2 (previous=1), New=20 -> (10*1 + 20)/2 = 15
    assert vector.update_running_average(10.0, 2, 20.0) == 15.0

    # Avg=15, Count=3, New=30 -> (15*2 + 30)/3 = 60/3 = 20
    assert vector.update_running_average(15.0, 3, 30.0) == 20.0
