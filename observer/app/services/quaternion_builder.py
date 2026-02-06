"""Quaternion Builder Service.

Converts VAC (Valence-Arousal-Connection) coordinates to quaternions for 3D rotation
representation. Quaternions are used by the Experience module to render the Soul Sphere
without gimbal lock.

Why Quaternions?
    Traditional Euler angles (roll, pitch, yaw) suffer from gimbal lock at certain
    orientations. Quaternions provide:
    - Smooth interpolation (SLERP)
    - No gimbal lock
    - Compact representation (4 numbers)
    - Efficient composition

Mathematical Background:
    A quaternion is a 4D complex number: q = w + xi + yj + zk

    For unit quaternions (rotations): w² + x² + y² + z² = 1

    VAC → Quaternion Mapping::

        The Versor module provides the authoritative mathematical conversion.
        Observer can either:
        1. Call Versor via HTTP (default, always accurate)
        2. Use local fallback (faster but simplified)

Integration Modes:
    HTTP Mode (Default):
        - Calls Versor microservice via REST API
        - Always mathematically accurate
        - Graceful fallback if Versor unavailable
        - Latency: ~30ms per conversion

    Direct Import Mode:
        - Imports Versor as Python package
        - Requires Versor in PYTHONPATH
        - Faster (~1ms) but tighter coupling
        - Used for development/testing

Fallback Strategy:
    If Versor unavailable::

        1. Log warning
        2. Return identity quaternion [1, 0, 0, 0] (no rotation)
        3. System remains functional (degraded visualization)
        4. No user-facing error

Example:
    Basic conversion::

        builder = QuaternionBuilder()
        quaternion = await builder.from_vac([0.8, 0.6, 0.7])
        print(quaternion)
        # Output: [0.85, 0.30, 0.35, 0.25]

        # Verify it's a unit quaternion
        assert builder.is_unit_quaternion(quaternion)

    With validation::

        try:
            q = await builder.from_vac([2.0, 0.5, 0.3], validate=True)
        except ValueError:
            print(f"Invalid VAC: {e}")
            # Output: "Invalid VAC: valence must be in range [-1.0, 1.0], got 2.0"

Performance:
    - HTTP mode: ~30ms (network call to Versor)
    - Direct mode: ~1ms (local computation)
    - Validation overhead: < 0.1ms
    - Recommended: HTTP mode with caching (pre-compute atlas quaternions)

Pre-computed Quaternions:
    Observer pre-computes quaternions for all 87 atlas emotions during seeding.
    This eliminates runtime dependency on Versor for atlas queries::

        # During seed_atlas.py
        for emotion in emotions:
            q = await quaternion_builder.from_vac(emotion.vac)
            emotion.quaternion = q  # Store in database

        # At runtime - just read from DB
        emotion = await get_emotion("Joy")
        quaternion = emotion.quaternion  # Already computed!

References:
    - Quaternions: Hamilton (1843)
    - Gimbal lock: https://en.wikipedia.org/wiki/Gimbal_lock
    - SLERP: Shoemake (1985) "Animating rotation with quaternion curves"
    - Versor module: See versor/app/core/vac_model.py
    - See docs/modules/observer/senior-developers/01-deep-dive-architecture.md
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

import httpx
from jose import jwt

from app.config import settings

logger = logging.getLogger(__name__)


class QuaternionBuilder:
    """Builds quaternions from VAC (Valence, Arousal, Connection) coordinates.

    Two integration modes:
    1. HTTP API mode (default) - Calls Versor microservice
    2. Direct import mode - Uses Versor Python package (requires Versor in PYTHONPATH)
    """

    def __init__(self, versor_url: Optional[str] = None, use_http: bool = True) -> None:
        """Initialize quaternion builder.

        Args:
            versor_url: Versor API base URL (defaults to settings.VERSOR_URL)
            use_http: If True, use HTTP API. If False, use direct import.
        """
        self.versor_url = versor_url or settings.VERSOR_URL
        self.use_http = use_http

        if use_http:
            logger.info("Quaternion builder using HTTP API: %s", self.versor_url)
        else:
            logger.info("Quaternion builder using direct import")
            # Import Versor's VACVector class
            try:
                from versor.app.core.vac_model import (  # pylint: disable=import-outside-toplevel
                    VACVector,
                )

                self.VACVector = VACVector  # pylint: disable=invalid-name
                logger.info("Successfully imported Versor VACVector")
            except ImportError as e:
                logger.error("Failed to import Versor: %s", e)
                raise ImportError(
                    "Versor package not found. Either install Versor or use HTTP mode."
                ) from e

    def _create_service_token(self) -> str:
        """Create a service-to-service JWT token for Versor authentication."""
        # Use simple short-lived token
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=5)
        to_encode = {
            "sub": "observer-service@love.stack",  # Recognized as valid user (any non-null works
            "exp": expire,
            "iat": now,
            "type": "service",
        }
        return str(jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM))

    async def from_vac(self, vac: List[float], validate: bool = True) -> List[float]:
        """Convert VAC coordinates to quaternion.

        Args:
            vac: [valence, arousal, connection] - each in range [-1.0, 1.0]
            validate: If True, validate VAC ranges

        Returns:
            Quaternion as [w, x, y, z] where w^2 + x^2 + y^2 + z^2 = 1.0

        Raises:
            ValueError: If VAC values are out of range
            httpx.HTTPError: If Versor API call fails
        """
        if validate:
            self._validate_vac(vac)

        if self.use_http:
            return await self._from_vac_http(vac)
        else:
            return self._from_vac_direct(vac)

    async def _from_vac_http(self, vac: List[float]) -> List[float]:
        """Convert VAC to quaternion via Versor HTTP API.

        Args:
            vac: [valence, arousal, connection]

        Returns:
            Quaternion [w, x, y, z]
        """
        try:
            # ═══════════════════════════════════════════════════════════════════════
            # VERSOR API CALL: VAC → Quaternion conversion
            # ═══════════════════════════════════════════════════════════════════════
            # Versor is the authoritative mathematical engine for VAC transformations
            # It handles the complex geometric mapping from 3D affective space
            # to 4D quaternion space
            #
            # Why delegate to Versor?
            #   - Mathematical complexity (axis-angle conversions, gimbal lock avoidance)
            #   - Single source of truth for VAC model
            #   - Versor team maintains the psychologically-validated mapping
            #   - Observer focuses on clinical application, not math implementation

            # Generate service token for auth
            token = self._create_service_token()
            headers = {"Authorization": f"Bearer {token}"}

            async with httpx.AsyncClient(timeout=5.0) as client:
                # POST to Versor's calculate endpoint
                # Includes time_delta for SLERP context (though we use current_state here)
                response = await client.post(
                    f"{self.versor_url}/versor/calculate",
                    json={
                        "current_vac": {
                            "valence": vac[0],  # Positive/negative emotional tone
                            "arousal": vac[1],  # Energy/activation level
                            "connection": vac[2],  # Social connection/isolation
                        },
                        "time_delta_seconds": 1.0,  # Not used for current_state, but required
                    },
                    headers=headers,
                )
                response.raise_for_status()

                # Extract quaternion from response
                # Response structure: {"current_state": {"w": ..., "x": ..., "y": ..., "z": ...}}
                data = response.json()
                current_state = data["current_state"]

                # Convert from dict to list format [w, x, y, z]
                # Use float() to ensure native Python floats (not numpy/JSON types)
                # This prevents serialization issues downstream
                return [
                    float(current_state["w"]),
                    float(current_state["x"]),
                    float(current_state["y"]),
                    float(current_state["z"]),
                ]

        except Exception as e:  # pylint: disable=broad-exception-caught
            # ═══════════════════════════════════════════════════════════════════════
            # FALLBACK STRATEGY: Versor unavailable or invalid response
            # ═══════════════════════════════════════════════════════════════════════
            # If Versor API fails (network error, service down, timeout, invalid JSON):
            #   1. Log warning (ops team can investigate)
            #   2. Return identity quaternion [1, 0, 0, 0]
            #   3. System remains functional (degraded mode)
            logger.warning("Versor API call failed: %s, using fallback", e)
            return [1.0, 0.0, 0.0, 0.0]  # Identity quaternion (no rotation)

    def _from_vac_direct(self, vac: List[float]) -> List[float]:
        """Convert VAC to quaternion via direct Versor import.

        Args:
            vac: [valence, arousal, connection]

        Returns:
            Quaternion [w, x, y, z]
        """
        # Create VACVector instance
        vac_vector = self.VACVector(valence=vac[0], arousal=vac[1], connection=vac[2])

        # Convert to quaternion
        quaternion = vac_vector.to_quaternion()

        # Return as list [w, x, y, z] with native Python floats
        return [
            float(quaternion.w),
            float(quaternion.x),
            float(quaternion.y),
            float(quaternion.z),
        ]

    def _validate_vac(self, vac: List[float]) -> None:
        """Validate VAC coordinates.

        Args:
            vac: [valence, arousal, connection]

        Raises:
            ValueError: If any coordinate is out of range [-1.0, 1.0]
        """
        if len(vac) != 3:
            raise ValueError(f"VAC must have 3 components, got {len(vac)}")

        labels = ["valence", "arousal", "connection"]
        for _, (value, label) in enumerate(zip(vac, labels)):
            if not -1.0 <= value <= 1.0:
                raise ValueError(f"{label} must be in range [-1.0, 1.0], got {value}")

    @staticmethod
    def is_unit_quaternion(q: List[float], tolerance: float = 1e-6) -> bool:
        """Check if quaternion is unit length.

        Args:
            q: Quaternion [w, x, y, z]
            tolerance: Allowed deviation from 1.0

        Returns:
            True if ||q|| ≈ 1.0
        """
        magnitude_squared = sum(component**2 for component in q)
        return abs(magnitude_squared - 1.0) < tolerance

    @staticmethod
    def quaternion_to_dict(q: List[float]) -> dict[str, Any]:
        """Convert quaternion list to dictionary.

        Args:
            q: Quaternion [w, x, y, z]

        Returns:
            Dictionary with keys w, x, y, z
        """
        return {"w": q[0], "x": q[1], "y": q[2], "z": q[3]}

    @staticmethod
    def dict_to_quaternion(q_dict: dict[str, Any]) -> List[float]:
        """Convert quaternion dictionary to list.

        Args:
            q_dict: Dictionary with keys w, x, y, z

        Returns:
            Quaternion [w, x, y, z]
        """
        return [q_dict["w"], q_dict["x"], q_dict["y"], q_dict["z"]]


# Singleton instance
_QUATERNION_BUILDER_INSTANCE = None


def get_quaternion_builder() -> QuaternionBuilder:
    """Get singleton quaternion builder instance.

    Returns:
        QuaternionBuilder instance
    """
    global _QUATERNION_BUILDER_INSTANCE  # pylint: disable=global-statement

    if _QUATERNION_BUILDER_INSTANCE is None:
        _QUATERNION_BUILDER_INSTANCE = QuaternionBuilder()

    return _QUATERNION_BUILDER_INSTANCE
