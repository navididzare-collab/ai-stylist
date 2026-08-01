# AI Stylist Backend

بک‌اند FastAPI برای فروشگاه، دستیار استایل و پرو مجازی.

## راه‌اندازی

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

مقادیر `OPENAI_API_KEY`، `JWT_SECRET` و `ADMIN_API_KEY` را در `.env` تنظیم کنید. برای ساخت secret امن:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## نکات امنیتی

- فایل `.env`، دیتابیس SQLite، لاگ‌ها و خروجی‌های پرو مجازی در Git قرار نمی‌گیرند.
- مسیرهای مدیریت با هدر `X-Admin-Key` محافظت می‌شوند.
- چت، سبد، علاقه‌مندی و پرو مجازی فقط با JWT کاربر قابل استفاده‌اند.
- تصاویر نتیجه پرو مجازی خصوصی و دارای لینک امضاشده و تاریخ انقضا هستند.
- `CORS_ORIGINS` در production باید فقط شامل دامنه واقعی فرانت‌اند باشد.
- در اجرای چند worker، rate limiter درون‌حافظه‌ای را با Redis جایگزین کنید.

## مسیرهای مهم

- مستندات API: `/docs`
- سلامت سرویس: `/health`
- پنل مدیریت: `/admin`
