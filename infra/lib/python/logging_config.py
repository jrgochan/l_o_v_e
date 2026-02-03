import logging
import os
import sys
from typing import Any

import structlog
from asgi_correlation_id import correlation_id


def configure_logging(
    log_level: str = "INFO",
    json_format: bool = False,
) -> None:
    """
    Configure structured logging for the application.
    """

    # Shared processors for both JSON and Console
    processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    # Add request ID if available
    def add_correlation(logger, method_name, event_dict):
        request_id = correlation_id.get()
        if request_id:
            event_dict["request_id"] = request_id
        return event_dict

    processors.insert(0, add_correlation)

    # Renderer selection
    if json_format or os.getenv("LOG_FORMAT", "console") == "json":
        # Production mode: JSON
        processors.append(structlog.processors.JSONRenderer())
        formatter = structlog.stdlib.ProcessorFormatter(
            processor=structlog.processors.JSONRenderer(),
        )
    else:
        # Development mode: Human readable colors
        processors.append(structlog.dev.ConsoleRenderer())
        formatter = structlog.stdlib.ProcessorFormatter(
            processor=structlog.dev.ConsoleRenderer(),
        )

    # Configure Standard Library Logging to use structlog
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level.upper())

    # Silence uvicorn access logs (they are duplicate often if we middleware log)
    # or let them be but captured.
    # For now, we leave them but could configure them to use structlog too.

    # Configure structlog
    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
