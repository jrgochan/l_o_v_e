"""Shim for backward compatibility. Use app.api.sockets.router."""

# Also import manager for test patches if needed
from app.api.sockets.connection import ConnectionManager, manager
from app.api.sockets.handlers import (
    generate_insights,
    handle_deep_feeling_update,
    handle_multi_emotion_result,
    handle_single_emotion_result,
    handle_tone_update,
    handle_user_message,
    process_audio_message,
    process_text_message,
)
from app.api.sockets.router import chat_websocket, router

# Also import things used in type hints if tests import them?
# No, tests usually mocking type hints or importing from typing.

# Mocking the module structure for tests that patch 'app.api.routes.chat_websocket.something'
# If tests patch 'app.api.routes.chat_websocket.manager', it works if manager is imported here.

__all__ = [
    "router",
    "chat_websocket",
    "process_text_message",
    "process_audio_message",
    "handle_user_message",
    "handle_tone_update",
    "handle_deep_feeling_update",
    "handle_single_emotion_result",
    "handle_multi_emotion_result",
    "generate_insights",
    "generate_insights",
    "manager",
    "manager",
    "ConnectionManager",
    "AsyncSessionLocal",
]

from app.database import AsyncSessionLocal
