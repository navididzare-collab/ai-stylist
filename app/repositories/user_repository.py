from sqlalchemy.orm import Session

from app.core.security import hash_password, password_hash_needs_upgrade, verify_password
from app.models.user import User


class UserRepository:

    def get_by_phone(self, db: Session, phone: str) -> User | None:
        return db.query(User).filter(User.phone == phone).first()

    def get_by_id(self, db: Session, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id).first()

    def get_all(self, db: Session) -> list[User]:
        return db.query(User).order_by(User.created_at.desc()).all()

    def create(self, db: Session, full_name: str, phone: str, password: str) -> User:
        db_user = User(
            full_name=full_name,
            phone=phone,
            hashed_password=hash_password(password),
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def authenticate(self, db: Session, phone: str, password: str) -> User | None:
        user = self.get_by_phone(db, phone)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if password_hash_needs_upgrade(user.hashed_password):
            user.hashed_password = hash_password(password)
            db.commit()
            db.refresh(user)
        return user

    # --- جدید ---

    def update_name(self, db: Session, user_id: int, full_name: str) -> User:
        user = self.get_by_id(db, user_id)
        user.full_name = full_name
        db.commit()
        db.refresh(user)
        return user

    def update_password(self, db: Session, user_id: int, current_password: str, new_password: str) -> bool:
        user = self.get_by_id(db, user_id)
        if user is None:
            return False
        if not verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = hash_password(new_password)
        db.commit()
        return True