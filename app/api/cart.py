from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.images import get_main_image_url
from app.database.session import get_db
from app.repositories.cart_repository import CartRepository
from app.schemas.cart import CartItemCreate, CartItemResponse, CartItemUpdate

router = APIRouter(prefix="/cart", tags=["Cart"])
repository = CartRepository()


def _serialize(item):
    product = item.product
    return {
        "id": item.id,
        "quantity": item.quantity,
        "product": {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "brand": product.brand,
            "stock": product.stock,
            "image_url": get_main_image_url(product),
        },
    }


@router.get("/", response_model=list[CartItemResponse])
def get_cart(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    items = repository.get_all_for_user(db, current_user_id)
    return [_serialize(i) for i in items]


@router.post("/", response_model=CartItemResponse)
def add_to_cart(
    payload: CartItemCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    item = repository.add_or_increment(db, current_user_id, payload.product_id, payload.quantity)
    return _serialize(item)


@router.put("/{product_id}", response_model=CartItemResponse)
def update_cart_item(
    product_id: int,
    payload: CartItemUpdate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    item = repository.update_quantity(db, current_user_id, product_id, payload.quantity)
    if item is None:
        raise HTTPException(status_code=404, detail="آیتم توی سبد خرید پیدا نشد.")
    return _serialize(item)


@router.delete("/{product_id}")
def remove_from_cart(
    product_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    removed = repository.remove(db, current_user_id, product_id)
    if not removed:
        return {"message": "این محصول توی سبد خرید نبود."}
    return {"message": "از سبد خرید حذف شد."}


@router.delete("/")
def clear_cart(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repository.clear(db, current_user_id)
    return {"message": "سبد خرید خالی شد."}
