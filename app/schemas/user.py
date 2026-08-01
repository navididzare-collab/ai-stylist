from datetime import datetime

from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2)
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    phone: str
    password: str


class UserPublic(BaseModel):
    id: int
    full_name: str
    phone: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserListItem(BaseModel):
    id: int
    full_name: str
    phone: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- جدید: مدل‌های ویرایش پروفایل ---

class UserUpdateName(BaseModel):
    full_name: str = Field(min_length=2)


class UserUpdatePassword(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)