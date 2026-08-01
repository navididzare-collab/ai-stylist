from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])

repository = ProductRepository()


@router.post("/")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
):
    db_product = repository.create(db, product)

    return {
        "id": db_product.id,
        "message": "محصول با موفقیت ثبت شد."
    }


@router.post("/bulk")
def create_products_bulk(
    products: list[ProductCreate],
    db: Session = Depends(get_db),
):
    """
    ثبت چند محصول به‌صورت یک‌جا.
    آرایه‌ای از محصولات (همون فرمت تک‌محصولی create_product) بفرست.
    """
    created_ids = []

    for product in products:
        db_product = repository.create(db, product)
        created_ids.append(db_product.id)

    return {
        "message": f"{len(created_ids)} محصول با موفقیت ثبت شد.",
        "ids": created_ids,
    }


@router.get("/", response_model=list[ProductResponse])
def get_products(
    category: str | None = None,
    occasion: str | None = None,
    db: Session = Depends(get_db),
):
    """
    لیست محصولات را برمی‌گرداند.
    اگه category یا occasion در query string ارسال بشه (مثلاً
    /products?category=تیشرت یا /products?occasion=اسپرت)،
    فقط محصولات همون دسته/مناسبت فیلتر می‌شن.
    """
    if category or occasion:
        return repository.filter_products(db, category=category, occasion=occasion)

    return repository.get_all(db)


@router.get("/search", response_model=list[ProductResponse])
def search_products(
    query: str,
    db: Session = Depends(get_db),
):
    return repository.search(db, query)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = repository.get_by_id(db, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد.")

    return product


@router.put("/{product_id}")
def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
):
    updated_product = repository.update(db, product_id, product)

    if updated_product is None:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد.")

    return {"message": "محصول با موفقیت ویرایش شد."}


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    deleted = repository.delete(db, product_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد.")

    return {"message": "محصول با موفقیت حذف شد."}