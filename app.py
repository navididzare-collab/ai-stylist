from app.main import app
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import uvicorn
import os

# به uvicorn میگه به هدر X-Forwarded-Proto که پراکسی پارس‌پک می‌فرسته اعتماد کنه
# تا بفهمه درخواست اصلی HTTPS بوده، نه HTTP
app = ProxyHeadersMiddleware(app, trusted_hosts="*")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)