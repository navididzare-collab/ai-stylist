from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.repositories.product_repository import ProductRepository
from app.schemas.product_search import ProductForAI

router = APIRouter(prefix="/products", tags=["Products"])

repository = ProductRepository()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/search-for-ai", response_model=list[ProductForAI])
def search_for_ai(
    query: str | None = None,
    category: str | None = None,
    color: str | None = None,
    gender: str | None = None,
    season: str | None = None,
    occasion: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 8,
    db: Session = Depends(get_db),
):
    """
    Endpoint مخصوص n8n. بر اساس فیلترهای اختیاری، محصولات مرتبط
    رو از دیتابیس برمی‌گردونه تا به AI Agent داده بشه.

    نمونه فراخوانی:
    GET /products/search-for-ai?category=کفش&gender=مردانه&max_price=2000000
    """
    products = repository.search_for_ai(
        db=db,
        query=query,
        category=category,
        color=color,
        gender=gender,
        season=season,
        occasion=occasion,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
    )

    result = []
    for p in products:
        main_image = None
        if p.images:
            main = next((img for img in p.images if img.is_main), p.images[0])
            main_image = main.image_url

        result.append(
            ProductForAI(
                id=p.id,
                name=p.name,
                brand=p.brand,
                category=p.category,
                color=p.color,
                size=p.size,
                price=p.price,
                gender=p.gender,
                season=p.season,
                occasion=p.occasion,
                image_url=main_image,
            )
        )

    return result