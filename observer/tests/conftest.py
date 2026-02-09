"""Pytest configuration."""

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
