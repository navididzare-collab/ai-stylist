import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
        self.OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        self.CHAT_MODEL: str = os.getenv("CHAT_MODEL", "openai/gpt-4.1-mini")
        self.TRYON_MODEL: str = os.getenv("TRYON_MODEL", "google/gemini-2.5-flash-image")
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "")
        self.JWT_ALGORITHM: str = "HS256"
        self.JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
        self.ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "")
        self.BACKEND_BASE_URL: str = os.getenv(
            "BACKEND_BASE_URL", "http://localhost:8000"
        ).rstrip("/")
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ai_stylist.db")
        self.CORS_ORIGINS: list[str] = [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
            ).split(",")
            if origin.strip()
        ]
        self.MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
        self.TRYON_RESULT_TTL_SECONDS: int = int(os.getenv("TRYON_RESULT_TTL_SECONDS", "3600"))
        self.TRYON_PRIVATE_DIR: Path = Path(os.getenv("TRYON_PRIVATE_DIR", "private/tryon"))
        self.CHAT_RATE_LIMIT_PER_HOUR: int = int(os.getenv("CHAT_RATE_LIMIT_PER_HOUR", "60"))
        self.TRYON_RATE_LIMIT_PER_HOUR: int = int(os.getenv("TRYON_RATE_LIMIT_PER_HOUR", "12"))
        self.AUTH_RATE_LIMIT_PER_15_MINUTES: int = int(os.getenv("AUTH_RATE_LIMIT_PER_15_MINUTES", "12"))

        if not self.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY باید در محیط تنظیم شود.")
        if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
            raise RuntimeError(
                "JWT_SECRET باید در محیط تنظیم شود و حداقل ۳۲ کاراکتر داشته باشد."
            )
        if not self.ADMIN_API_KEY or len(self.ADMIN_API_KEY) < 24:
            raise RuntimeError(
                "ADMIN_API_KEY باید در محیط تنظیم شود و حداقل ۲۴ کاراکتر داشته باشد."
            )


settings = Settings()
