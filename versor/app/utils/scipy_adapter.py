"""SciPy adapter layer for quaternion convention conversion.

L.O.V.E. uses scalar-first notation: [w, x, y, z]
SciPy uses scalar-last notation: [x, y, z, w]

This adapter provides bidirectional conversion.
"""

from typing import TYPE_CHECKING

import numpy as np
import numpy.typing as npt
from scipy.spatial.transform import Rotation as R

if TYPE_CHECKING:
    from app.core.quaternion import Quaternion


def love_to_scipy(q: "Quaternion") -> npt.NDArray[np.float64]:
    """Convert L.O.V.E. quaternion to SciPy format.

    L.O.V.E.: [w, x, y, z] (scalar-first)
    SciPy:    [x, y, z, w] (scalar-last)

    Args:
        q: Quaternion in L.O.V.E. format

    Returns:
        NumPy array in SciPy format [x, y, z, w]
    """
    return np.array([q.x, q.y, q.z, q.w], dtype=np.float64)


def scipy_to_love(q_array: npt.NDArray[np.float64]) -> "Quaternion":
    """Convert SciPy format to L.O.V.E. quaternion.

    SciPy:    [x, y, z, w] (scalar-last)
    L.O.V.E.: [w, x, y, z] (scalar-first)

    Args:
        q_array: NumPy array in SciPy format

    Returns:
        Quaternion in L.O.V.E. format
    """
    from app.core.quaternion import Quaternion  # pylint: disable=import-outside-toplevel

    return Quaternion(
        w=float(q_array[3]), x=float(q_array[0]), y=float(q_array[1]), z=float(q_array[2])
    )


def create_rotation(
    q: "Quaternion",
) -> R:  # pragma: no cover - simple passthrough tested indirectly
    """Create SciPy Rotation object from L.O.V.E. quaternion.

    Args:
        q: Quaternion in L.O.V.E. format

    Returns:
        SciPy Rotation object
    """
    q_scipy = love_to_scipy(q)
    return R.from_quat(q_scipy)


def rotation_to_love(
    rotation: R,
) -> "Quaternion":  # pragma: no cover - simple passthrough tested indirectly
    """Extract L.O.V.E. quaternion from SciPy Rotation object.

    Args:
        rotation: SciPy Rotation object

    Returns:
        Quaternion in L.O.V.E. format [w, x, y, z]
    """
    q_scipy = rotation.as_quat()  # Returns [x, y, z, w]
    return scipy_to_love(q_scipy)
