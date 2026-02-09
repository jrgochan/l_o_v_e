from unittest.mock import MagicMock

import pytest

from app.models.prompt_template import PromptTemplate
from app.services.ai.renderer import PromptRenderer


@pytest.fixture
def renderer():
    return PromptRenderer()


def test_render_success(renderer):
    """Test successful rendering."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello {{ name }}!"
    template.input_variables = ["name"]
    template.function_name = "test_func"
    template.name = "test_tmpl"

    result = renderer.render(template, {"name": "World"})
    assert result == "Hello World!"


def test_render_missing_variable_in_context(renderer):
    """Test line 79: raises ValueError if variable missing in context."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello {{ name }}!"
    template.input_variables = ["name"]
    template.function_name = "test_func"
    template.name = "test_tmpl"

    with pytest.raises(ValueError, match="Missing required prompt variables: name"):
        renderer.render(template, {})


def test_render_template_syntax_error(renderer):
    """Test lines 48-50: handles TemplateSyntaxError."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello {{ name"  # Invalid syntax
    template.input_variables = []
    template.function_name = "test_func"
    template.name = "test_tmpl"

    # We expect ValueError raising from the catch block
    with pytest.raises(ValueError, match="Invalid template syntax"):
        renderer.render(template, {})


def test_render_general_exception(renderer):
    """Test lines 51-53: logs and re-raises generic exception."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello {{ name }}!"
    template.input_variables = ["name"]
    template.function_name = "test_func"
    template.name = "test_tmpl"

    # Mock env.from_string to raise generic exception
    renderer.env = MagicMock()
    renderer.env.from_string.side_effect = Exception("Generic Switch Error")

    with pytest.raises(Exception, match="Generic Switch Error"):
        renderer.render(template, {"name": "World"})


def test_validate_variables_undeclared(renderer):
    """Test line 62-68: finds undeclared variables in template string."""
    template = MagicMock(spec=PromptTemplate)
    # Variable 'age' is in template but not in expected_vars or context
    template.template_content = "Name: {{ name }}, Age: {{ age }}"
    template.input_variables = ["name"]
    template.function_name = "test_func"
    template.name = (
        None  # Force usage of template.source logic if applicable, though from_string is used
    )

    # Context has name but not age
    with pytest.raises(ValueError, match="Missing required prompt variables: age"):
        renderer.render(template, {"name": "John"})


def test_validate_variables_expected_vars_check(renderer):
    """Test line 73-76: checks against expected_vars explicitly."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello World"  # No vars in string
    template.input_variables = ["required_var"]  # But DB says this is required
    template.function_name = "test_func"
    template.name = "test_tmpl"

    with pytest.raises(ValueError, match="Missing required prompt variables: required_var"):
        renderer.render(template, {})


def test_render_no_expected_vars(renderer):
    """Test lines 69-74: skip expected_vars check if None."""
    template = MagicMock(spec=PromptTemplate)
    template.template_content = "Hello World"
    template.input_variables = None  # Force skipping the block
    template.function_name = "test_func"
    template.name = "test_tmpl"

    # Should succeed without error
    result = renderer.render(template, {})
    assert result == "Hello World"
