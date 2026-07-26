from sqlalchemy.orm import Session, joinedload

from app.models.favorite import Favorite
from app.models.product import Product


class FavoriteRepository:

    def get_all_for_user(self, db: Session, user_id: int):
        return (
            db.query(Favorite)
            .options(joinedload(Favorite.product).joinedload(Product.images))
            .filter(Favorite.user_id == user_id)
            .all()
        )

    def exists(self, db: Session, user_id: int, product_id: int) -> bool:
        return (
            db.query(Favorite)
            .filter(Favorite.user_id == user_id, Favorite.product_id == product_id)
            .first()
            is not None
        )

    def add(self, db: Session, user_id: int, product_id: int) -> Favorite:
        existing = (
            db.query(Favorite)
            .filter(Favorite.user_id == user_id, Favorite.product_id == product_id)
            .first()
        )
        if existing:
            return existing

        favorite = Favorite(user_id=user_id, product_id=product_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
        return favorite

    def remove(self, db: Session, user_id: int, product_id: int) -> bool:
        favorite = (
            db.query(Favorite)
            .filter(Favorite.user_id == user_id, Favorite.product_id == product_id)
            .first()
        )
        if favorite is None:
            return False

        db.delete(favorite)
        db.commit()
        return True