"""Cryptographic utilities — AES-256-GCM encryption for credential storage.

Provides symmetric encryption for storing OAuth tokens, API keys, and
other secrets at rest in the database.  Uses the application ``SECRET_KEY``
combined with a per-record salt to derive a unique encryption key for
each credential.

Security notes:
    - AES-256-GCM provides authenticated encryption (confidentiality +
      integrity + authenticity).
    - A random 96-bit nonce is generated per encryption call and stored
      alongside the ciphertext.
    - Key derivation uses PBKDF2-HMAC-SHA256 with 480 000 iterations
      (OWASP 2024 recommendation).
    - The 16-byte GCM authentication tag is appended to the ciphertext.
"""

import base64
import json
import os
from typing import Any, Dict

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.settings import settings


def _derive_key(salt: bytes) -> bytes:
    """Derive a 256-bit AES key from SECRET_KEY + salt.

    Uses PBKDF2 with 480k iterations per OWASP 2024 guidance.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480_000,
    )
    return kdf.derive(settings.SECRET_KEY.encode("utf-8"))


def encrypt_dict(data: Dict[str, Any]) -> str:
    """Encrypt a dictionary to a base64 string.

    Returns a string in the format: ``base64(salt || nonce || ciphertext || tag)``

    Args:
        data: Dictionary to encrypt (must be JSON-serializable).

    Returns:
        Base64-encoded encrypted string.
    """
    plaintext = json.dumps(data).encode("utf-8")

    # Random 16-byte salt for key derivation
    salt = os.urandom(16)
    key = _derive_key(salt)

    # Random 96-bit nonce for AES-GCM
    nonce = os.urandom(12)

    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    # Pack: salt (16) + nonce (12) + ciphertext+tag
    packed = salt + nonce + ciphertext
    return base64.b64encode(packed).decode("ascii")


def decrypt_dict(encrypted: str) -> Dict[str, Any]:
    """Decrypt a base64 string back to a dictionary.

    Args:
        encrypted: Base64-encoded encrypted string from ``encrypt_dict``.

    Returns:
        Decrypted dictionary.

    Raises:
        ValueError: If decryption fails (wrong key, tampered data, etc.).
    """
    try:
        packed = base64.b64decode(encrypted)

        # Unpack: salt (16) + nonce (12) + ciphertext+tag
        salt = packed[:16]
        nonce = packed[16:28]
        ciphertext = packed[28:]

        key = _derive_key(salt)
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)

        return json.loads(plaintext.decode("utf-8"))
    except Exception as exc:
        raise ValueError("Failed to decrypt credential data") from exc
