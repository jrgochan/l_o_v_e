"""Shim for backward compatibility. Use app.services.chat.ChatService."""

import logging

from app.services.chat import ChatService

logger = logging.getLogger(__name__)

__all__ = ["ChatService"]
