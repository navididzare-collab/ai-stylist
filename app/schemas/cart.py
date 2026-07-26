from pydantic import BaseModel, Field


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartProductOut(BaseModel):
    id: int
    name: str
    price: float
    brand: str
    stock: int
    image_url: str | None = None


class CartItemResponse(BaseModel):
    id: int
    quantity: int
    product: CartProductOut

    class Config:
        from_attributes = True
