from sqlalchemy import String, Integer, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)

    # اطلاعات اصلی
    name: Mapped[str] = mapped_column(String(255))
    brand: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(100))

    # ویژگی‌های ظاهری
    color: Mapped[str] = mapped_column(String(50))
    size: Mapped[str] = mapped_column(String(20))
    material: Mapped[str] = mapped_column(String(100))

    # مناسب برای
    gender: Mapped[str] = mapped_column(String(20))
    season: Mapped[str] = mapped_column(String(50))
    occasion: Mapped[str] = mapped_column(String(100))

    # قیمت و موجودی
    price: Mapped[float] = mapped_column(Float)
    stock: Mapped[int] = mapped_column(Integer)

    # وضعیت محصول
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # فروش ویژه (نمایش در بخش تخفیف‌های ویژه)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    # تصاویر محصول
    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
    )