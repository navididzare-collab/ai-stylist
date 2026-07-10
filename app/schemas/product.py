from pydantic import BaseModel


class ProductImageResponse(BaseModel):
    id: int
    image_url: str
    is_main: bool
    sort_order: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    # اطلاعات اصلی
    name: str
    brand: str
    category: str

    # ویژگی‌های ظاهری
    color: str
    size: str
    material: str

    # مناسب برای
    gender: str
    season: str
    occasion: str

    # قیمت و موجودی
    price: float
    stock: int

    # وضعیت
    is_active: bool = True

    # فروش ویژه (نمایش در بخش تخفیف‌های ویژه)
    is_featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    images: list[ProductImageResponse] = []

    class Config:
        from_attributes = True