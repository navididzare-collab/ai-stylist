from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.images import get_main_image_url
from app.database.session import get_db
from app.repositories.favorite_repository import FavoriteRepository
from app.schemas.favorite import FavoriteCreate, FavoriteResponse

router = APIRouter(prefix="/favorites", tags=["Favorites"])
repository = FavoriteRepository()


def _serialize(favorite):
    product = favorite.product
    return {
        "id": favorite.id,
        "product": {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "brand": product.brand,
            "image_url": get_main_image_url(product),
        },
    }


@router.get("/", response_model=list[FavoriteResponse])
def get_favorites(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    favorites = repository.get_all_for_user(db, current_user_id)
    return [_serialize(f) for f in favorites]


@router.post("/")
def add_favorite(
    payload: FavoriteCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repository.add(db, current_user_id, payload.product_id)
    return {"message": "به علاقه‌مندی‌ها اضافه شد."}


@router.delete("/{product_id}")
def remove_favorite(
    product_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    removed = repository.remove(db, current_user_id, product_id)
    if not removed:
        return {"message": "این محصول توی علاقه‌مندی‌ها نبود."}
    return {"message": "از علاقه‌مندی‌ها حذف شد."}
