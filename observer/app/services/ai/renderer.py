"""Prompt Rendering Service.

Handles the rendering of AI prompts using Jinja2 templates.
"""

import logging
from typing import Any, Dict, List, Optional

from jinja2 import BaseLoader, Environment, TemplateSyntaxError, meta

from app.models.prompt_template import PromptTemplate

logger = logging.getLogger(__name__)


class PromptRenderer:
    """Renders prompt templates with provided context."""

    def __init__(self) -> None:
        """Initialize Jinja2 environment."""
        # Use BaseLoader since we load templates from DB strings, not files
        self.env = Environment(loader=BaseLoader(), autoescape=False)  # nosec B701

    def render(self, template: PromptTemplate, context: Dict[str, Any]) -> str:
        """Render a prompt template with the given context.

        Args:
            template: The PromptTemplate object containing the template string.
            context: Dictionary of variables to inject into the template.

        Returns:
            The rendered prompt string.

        Raises:
            ValueError: If required variables are missing.
            TemplateError: If rendering fails.
        """
        try:
            # Create Jinja2 template object from string
            jinja_template = self.env.from_string(template.template_content)

            # Validate input variables
            self._validate_variables(template.template_content, context, template.input_variables)

            # Render
            return jinja_template.render(**context)

        except TemplateSyntaxError as e:
            logger.error("Template syntax error in prompt %s: %s", template.function_name, e)
            raise ValueError(f"Invalid template syntax: {e}") from e
        except Exception as e:
            logger.error("Failed to render prompt %s: %s", template.function_name, e)
            raise

    def _validate_variables(
        self,
        template_content: str,
        context: Dict[str, Any],
        expected_vars: Optional[List[str]] = None,
    ) -> None:
        """Validate that all required variables are present in the context."""
        # Get undeclared variables from the template source
        ast = self.env.parse(template_content)
        undeclared = meta.find_undeclared_variables(ast)

        missing = [var for var in undeclared if var not in context]

        # Also check against the DB-stored expected variables if provided
        if expected_vars:
            missing.extend(
                [var for var in expected_vars if var not in context and var not in missing]
            )

        if missing:
            raise ValueError(f"Missing required prompt variables: {', '.join(missing)}")
