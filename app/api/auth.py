from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.security import create_access_token
from app.database.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserListItem,
    UserUpdateName,
    UserUpdatePassword,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

repository = UserRepository()


@router.get("/users", response_model=list[UserListItem])
def list_users(db: Session = Depends(get_db)):
    """لیست همه‌ی کاربران ثبت‌نام‌شده (برای پنل ادمین - تب مشتریان)"""
    return repository.get_all(db)


@router.post("/register", response_model=TokenResponse)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = repository.get_by_phone(db, payload.phone)
    if existing is not None:
        raise HTTPException(status_code=400, detail="این شماره موبایل قبلاً ثبت شده است.")

    user = repository.create(db, payload.full_name, payload.phone, payload.password)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = repository.authenticate(db, payload.phone, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="شماره موبایل یا رمز عبور اشتباه است.")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserListItem)
def get_me(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """اطلاعات کاربر لاگین‌شده - همیشه از روی توکن، نه از روی id ارسالی."""
    user = repository.get_by_id(db, current_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد.")
    return user


# --- جدید: ویرایش پروفایل ---

@router.put("/me/name", response_model=UserListItem)
def update_name(
    payload: UserUpdateName,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """تغییر نام کاربر لاگین‌شده"""
    return repository.update_name(db, current_user_id, payload.full_name)


@router.put("/me/password")
def update_password(
    payload: UserUpdatePassword,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """تغییر رمز عبور - نیاز به رمز فعلی"""
    success = repository.update_password(
        db, current_user_id, payload.current_password, payload.new_password
    )
    if not success:
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است.")
    return {"message": "رمز عبور با موفقیت تغییر کرد."}