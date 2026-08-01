from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.chat import router as chat_router
from app.api.customers import router as customers_router
from app.api.favorites import router as favorites_router
from app.api.product_images import router as product_images_router
from app.api.product_search import router as product_search_router
from app.api.products import router as products_router
from app.api.recommendations import router as recommendations_router
from app.api.tryon import router as tryon_router
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine
from app.models.cart_item import CartItem
from app.models.favorite import Favorite
from app.models.user import User

app = FastAPI(title="Jest Agent API", docs_url="/docs", redoc_url=None)
Base.metadata.create_all(bind=engine)

Path("static").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)

# مسیرهای ثابت باید قبل از /products/{product_id} ثبت شوند.
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
    return {"message": "Jest Agent API is running."}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/admin", response_class=HTMLResponse)
def admin_panel():
    with open("app/templates/admin.html", "r", encoding="utf-8") as f:
        return f.read()
