import pytest
from pydantic import ValidationError

from app.schemas.user import PasswordChange, UserCreate, UserUpdate, _validate_password_complexity


@pytest.mark.unit
class TestUserSchemas:
    """Test User Pydantic schemas and validators."""

    def test_password_complexity_validator(self):
        """Test the standalone password validator function."""
        # Success
        assert _validate_password_complexity("StrongP@ss1") == "StrongP@ss1"

        # Length check (<8)
        with pytest.raises(ValueError, match="at least 8 characters"):
            _validate_password_complexity("Short1!")

        # Uppercase check
        with pytest.raises(ValueError, match="at least one uppercase"):
            _validate_password_complexity("weakp@ss1")

        # Lowercase check
        with pytest.raises(ValueError, match="at least one lowercase"):
            _validate_password_complexity("WEAKP@SS1")

        # Digit check
        with pytest.raises(ValueError, match="at least one digit"):
            _validate_password_complexity("WeakP@ss")

        # Special char check
        with pytest.raises(ValueError, match="at least one special character"):
            _validate_password_complexity("WeakPass1")

    def test_user_create_valid(self):
        """Test valid UserCreate schema."""
        u = UserCreate(email="test@example.com", password="StrongP@ss1", full_name="Test")
        assert u.email == "test@example.com"
        assert u.password == "StrongP@ss1"

    def test_user_create_invalid_password(self):
        """Test UserCreate with invalid password."""
        with pytest.raises(ValidationError) as exc:
            UserCreate(email="test@example.com", password="weak")
        assert "at least 8 characters" in str(exc.value)

    def test_user_update_password(self):
        """Test UserUpdate password validation."""
        # Valid update
        u = UserUpdate(password="NewStrong1!")
        assert u.password == "NewStrong1!"

        # Invalid update
        with pytest.raises(ValidationError) as exc:
            UserUpdate(password="weak")
        assert "at least 8 characters" in str(exc.value)

        # Update without password (optional field logic - line 83)
        u_no_pass = UserUpdate(full_name="New Name")
        assert u_no_pass.password is None

        # Explicit None
        u_explicit_none = UserUpdate(password=None)
        assert u_explicit_none.password is None

    def test_password_change_valid(self):
        """Test PasswordChange schema."""
        pc = PasswordChange(current_password="old", new_password="NewStrong1!")
        assert pc.new_password == "NewStrong1!"

    def test_password_change_invalid(self):
        """Test PasswordChange with weak new password."""
        with pytest.raises(ValidationError) as exc:
            PasswordChange(current_password="old", new_password="weak")
        # Pydantic's min_length=8 hits first before the custom validator if length is short
        assert "String should have at least 8 characters" in str(
            exc.value
        ) or "at least 8 characters" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            PasswordChange(current_password="old", new_password="WeakPassword1")  # Missing special
        assert "at least one special character" in str(exc.value)
