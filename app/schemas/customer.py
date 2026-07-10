from pydantic import BaseModel


class CustomerBase(BaseModel):
    full_name: str
    gender: str
    age: int

    height: int
    weight: int

    body_type: str

    skin_color: str
    hair_color: str

    favorite_style: str
    favorite_brand: str

    favorite_color: str
    disliked_color: str

    occasion: str
    season: str
    weather: str

    budget: int

    shirt_size: str
    pants_size: str
    shoe_size: int


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int

    class Config:
        from_attributes = True