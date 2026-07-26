import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    رمز عبور رو با salt تصادفی و pbkdf2_hmac هش می‌کنه.
    خروجی به شکل "salt_hex$hash_hex" ذخیره می‌شه.
    """
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${pwd_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """
    رمز واردشده رو با هش ذخیره‌شده مقایسه می‌کنه.
    """
    try:
        salt_hex, hash_hex = stored_hash.split("$")
    except ValueError:
        return False

    salt = bytes.fromhex(salt_hex)
    expected_hash = bytes.fromhex(hash_hex)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)

    return hmac.compare_digest(pwd_hash, expected_hash)


# ---------------------------------------------------------------------------
# JWT: از این به بعد سرور به هیچ user_id ای که از کلاینت (URL/body) میاد
# اعتماد نمی‌کنه. شناسه‌ی کاربر همیشه از داخل توکنِ verify‌شده استخراج میشه.
# ---------------------------------------------------------------------------

def create_access_token(user_id: int) -> str:
    """یک JWT امضاشده برای کاربر می‌سازه که شناسه‌ی کاربر داخلش قرار داره."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """
    توکن رو verify می‌کنه و user_id رو برمی‌گردونه.
    اگه توکن نامعتبر یا منقضی باشه، jwt.PyJWTError پرتاب میشه.
    """
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return int(payload["sub"])
