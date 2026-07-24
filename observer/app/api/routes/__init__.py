"""API route handlers."""

from app.api.sockets.router import chat_websocket

from . import (
    admin,
    ai_settings,
    auth,
    bootstrap,
    clinician,
    collections,
    consent,
    current,
    emotions,
    health,
    history,
    journal,
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
    "clinician",
    "consent",
    "bootstrap",
    "chat_websocket",
    "collections",
    "current",
    "emotions",
    "journal",
    "health",
    "history",
    "matrix",
    "prompts",
    "recommendations",
    "state",
    "transitions",
    "users",
]
