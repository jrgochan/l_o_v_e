"""Pytest configuration."""

import sys
from pathlib import Path

# Make shared infra modules (exceptions, security, etc.) importable in tests,
# matching the PYTHONPATH setup used in containers.
INFRA_LIB = str(Path(__file__).resolve().parents[2] / "infra" / "lib" / "python")
if INFRA_LIB not in sys.path:
    sys.path.insert(0, INFRA_LIB)

try:

    import nest_asyncio

    nest_asyncio.apply()
except ImportError:
    pass

pytest_plugins = [
    "tests.fixtures.db",
    "tests.fixtures.users",
    "tests.fixtures.emotions",
    "tests.fixtures.services",
]
