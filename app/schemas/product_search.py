from pydantic import BaseModel


class ProductForAI(BaseModel):
    """
    نسخه سبک محصول، مخصوص فرستادن به n8n / AI Agent.
    فقط اطلاعاتی که برای معرفی محصول لازمه، نه همه فیلدهای دیتابیس.
    """
    id: int
    name: str
    brand: str
    category: str
    color: str
    size: str
    price: float
    gender: str
    season: str
    occasion: str
    image_url: str | None = None

    class Config:
        from_attributes = True