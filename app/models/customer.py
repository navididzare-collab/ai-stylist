from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    full_name: Mapped[str] = mapped_column(String)
    gender: Mapped[str] = mapped_column(String)
    age: Mapped[int] = mapped_column(Integer)

    height: Mapped[int] = mapped_column(Integer)
    weight: Mapped[int] = mapped_column(Integer)

    body_type: Mapped[str] = mapped_column(String)

    skin_color: Mapped[str] = mapped_column(String)
    hair_color: Mapped[str] = mapped_column(String)

    favorite_style: Mapped[str] = mapped_column(String)
    favorite_brand: Mapped[str] = mapped_column(String)

    favorite_color: Mapped[str] = mapped_column(String)
    disliked_color: Mapped[str] = mapped_column(String)

    occasion: Mapped[str] = mapped_column(String)
    season: Mapped[str] = mapped_column(String)
    weather: Mapped[str] = mapped_column(String)

    budget: Mapped[int] = mapped_column(Integer)

    shirt_size: Mapped[str] = mapped_column(String)
    pants_size: Mapped[str] = mapped_column(String)
    shoe_size: Mapped[int] = mapped_column(Integer)