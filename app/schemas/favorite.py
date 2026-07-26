from pydantic import BaseModel


class FavoriteCreate(BaseModel):
    product_id: int


class FavoriteProductOut(BaseModel):
    id: int
    name: str
    price: float
    brand: str
    image_url: str | None = None


class FavoriteResponse(BaseModel):
    id: int
    product: FavoriteProductOut

    class Config:
        from_attributes = True
