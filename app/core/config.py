import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # --- تنظیمات JWT ---
    # حتماً توی .env مقدار JWT_SECRET رو یک رشته‌ی طولانی و تصادفی بذار
    # مثلاً با: python -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "43200"))  # 30 روز

    def __init__(self):
        if not self.JWT_SECRET:
            raise RuntimeError(
                "متغیر محیطی JWT_SECRET تنظیم نشده! "
                "یک مقدار تصادفی و طولانی توی فایل .env بذار."
            )


settings = Settings()
