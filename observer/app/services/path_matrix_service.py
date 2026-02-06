"""Shim for backward compatibility. Use app.services.matrix.PathMatrixService."""

from app.services.matrix import PathMatrixService

__all__ = ["PathMatrixService"]
