"""Utility Functions Package.

This package contains helper functions for integrating with external libraries,
particularly SciPy's rotation mathematics. The primary purpose is format conversion
between L.O.V.E.'s scalar-first quaternion convention and SciPy's scalar-last convention.

Package Contents:
    - scipy_adapter.py: SciPy format conversion and integration

Public API:
    - love_to_scipy(): Convert [w,x,y,z] → [x,y,z,w]
    - scipy_to_love(): Convert [x,y,z,w] → [w,x,y,z]
    - create_rotation(): Create SciPy Rotation from L.O.V.E. quaternion
    - rotation_to_love(): Extract L.O.V.E. quaternion from SciPy Rotation

Why Adapter Pattern?
    - **Convention mismatch:** L.O.V.E. uses scalar-first, SciPy uses scalar-last
    - **Encapsulation:** Isolates format differences in one place
    - **Maintainability:** If SciPy changes, only adapter needs updating
    - **Type safety:** Explicit conversions prevent subtle bugs

Example:
    Using SciPy integration::

        from app.utils import love_to_scipy, scipy_to_love
        from app.core import Quaternion

        # L.O.V.E. quaternion
        q_love = Quaternion(w=1.0, x=0.0, y=0.0, z=0.0)

        # Convert to SciPy format for SLERP
        q_scipy = love_to_scipy(q_love)  # [0, 0, 0, 1]

        # After SciPy processing
        q_result_scipy = some_scipy_operation(q_scipy)

        # Convert back to L.O.V.E. format
        q_result = scipy_to_love(q_result_scipy)
"""

from .scipy_adapter import create_rotation, love_to_scipy, rotation_to_love, scipy_to_love

__all__ = ["love_to_scipy", "scipy_to_love", "create_rotation", "rotation_to_love"]
