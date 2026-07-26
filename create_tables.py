from app.database.base import Base
from app.database.session import engine
from app.models.user import User  # این import لازمه تا SQLAlchemy جدول رو بشناسه

Base.metadata.create_all(bind=engine)
print("جدول‌ها ساخته شدن.")