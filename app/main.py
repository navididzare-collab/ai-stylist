from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
load_dotenv()
from app.api.products import router as products_router
from app.api.customers import router as customers_router
from app.api.chat import router as chat_router
from app.api.recommendations import router as recommendations_router
from app.api.product_images import router as product_images_router
from app.api.product_search import router as product_search_router
from app.api.tryon import router as tryon_router
app = FastAPI(title="AI Stylist API")
# نمایش فایل‌های استاتیک (عکس محصولات)
app.mount("/static", StaticFiles(directory="static"), name="static")
# اجازه اتصال فرانت‌اند
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        ""https://app-nextjs-y6oow.apps.de1.abrhapaas.com",",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# نکته مهم: product_search_router باید قبل از products_router ثبت بشه،
# وگرنه FastAPI مسیر "search-for-ai" رو به‌جای route مخصوصش،
# با route عمومی‌تر "/products/{product_id}" مچ می‌کنه و خطا می‌ده.
app.include_router(product_search_router)
app.include_router(products_router)
app.include_router(customers_router)
app.include_router(chat_router)
app.include_router(recommendations_router)
app.include_router(product_images_router)
app.include_router(tryon_router)
@app.get("/")
def root():
    return {
        "message": "AI Stylist API is running."
    }
@app.get("/admin", response_class=HTMLResponse)
def admin_panel():
    with open("app/templates/admin.html", "r", encoding="utf-8") as f:
        return f.read()