"""API route handlers."""

from app.api.sockets.router import chat_websocket

from . import (
    admin,
    ai_settings,
    auth,
    bootstrap,
    collections,
    current,
    emotions,
    health,
    history,
    matrix,
    prompts,
    recommendations,
    state,
    transitions,
    users,
)

__all__ = [
    "admin",
    "ai_settings",
    "auth",
    "bootstrap",
    "chat_websocket",
    "collections",
    "current",
    "emotions",
    "health",
    "history",
    "matrix",
    "prompts",
    "recommendations",
    "state",
    "transitions",
    "users",
]
