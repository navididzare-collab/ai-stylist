from sqlalchemy.orm import Session, joinedload

from app.models.cart_item import CartItem
from app.models.product import Product


class CartRepository:

    def get_all_for_user(self, db: Session, user_id: int):
        return (
            db.query(CartItem)
            .options(joinedload(CartItem.product).joinedload(Product.images))
            .filter(CartItem.user_id == user_id)
            .all()
        )

    def add_or_increment(self, db: Session, user_id: int, product_id: int, quantity: int) -> CartItem:
        existing = (
            db.query(CartItem)
            .filter(CartItem.user_id == user_id, CartItem.product_id == product_id)
            .first()
        )

        if existing:
            existing.quantity += quantity
            db.commit()
            db.refresh(existing)
            return existing

        item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def update_quantity(self, db: Session, user_id: int, product_id: int, quantity: int):
        item = (
            db.query(CartItem)
            .filter(CartItem.user_id == user_id, CartItem.product_id == product_id)
            .first()
        )
        if item is None:
            return None

        item.quantity = quantity
        db.commit()
        db.refresh(item)
        return item

    def remove(self, db: Session, user_id: int, product_id: int) -> bool:
        item = (
            db.query(CartItem)
            .filter(CartItem.user_id == user_id, CartItem.product_id == product_id)
            .first()
        )
        if item is None:
            return False

        db.delete(item)
        db.commit()
        return True

    def clear(self, db: Session, user_id: int):
        db.query(CartItem).filter(CartItem.user_id == user_id).delete()
        db.commit()