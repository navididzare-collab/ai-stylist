from fastapi import FastAPI
from app.api.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.favorites import router as favorites_router
from app.api.cart import router as cart_router
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

app = FastAPI(title="Jest Agent API")

# ساخت خودکار جدول‌های جدید (users, favorites, cart_items) موقع بالا اومدن سرور
from app.database.base import Base
from app.database.session import engine
from app.models.user import User
from app.models.favorite import Favorite
from app.models.cart_item import CartItem

Base.metadata.create_all(bind=engine)

# نمایش فایل‌های استاتیک (عکس محصولات)
app.mount("/static", StaticFiles(directory="static"), name="static")
# اجازه اتصال فرانت‌اند
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://app-nextjs-j3p55.apps.teh11.abrhapaas.com",
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
app.include_router(auth_router)
app.include_router(product_images_router)
app.include_router(favorites_router)
app.include_router(cart_router)
app.include_router(tryon_router)


@app.get("/")
def root():
    return {
        "message": "Jest Agent API is running."
    }


@app.get("/admin", response_class=HTMLResponse)
def admin_panel():
    with open("app/templates/admin.html", "r", encoding="utf-8") as f:
        return f.read()