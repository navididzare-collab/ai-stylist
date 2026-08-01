import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    """هش نسخه‌دار PBKDF2-SHA256 با salt تصادفی."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """فرمت جدید را بررسی می‌کند و با فرمت قدیمی پروژه نیز سازگار است."""
    try:
        if stored_hash.startswith("pbkdf2_sha256$"):
            _, iterations_raw, salt_hex, hash_hex = stored_hash.split("$", 3)
            iterations = int(iterations_raw)
        else:
            salt_hex, hash_hex = stored_hash.split("$", 1)
            iterations = 100_000
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
    except (ValueError, TypeError):
        return False

    calculated = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(calculated, expected_hash)


def password_hash_needs_upgrade(stored_hash: str) -> bool:
    if not stored_hash.startswith("pbkdf2_sha256$"):
        return True
    try:
        return int(stored_hash.split("$", 3)[1]) < PBKDF2_ITERATIONS
    except (ValueError, IndexError):
        return True


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return int(payload["sub"])
