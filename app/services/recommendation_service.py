from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.product import Product


class RecommendationService:

    def recommend(self, db: Session, customer: Customer):
        products = (
            db.query(Product)
            .filter(
                Product.gender == customer.gender,
                Product.season == customer.season,
                Product.occasion == customer.occasion,
                Product.price <= customer.budget,
                Product.is_active == True,
                Product.stock > 0,
            )
            .all()
        )

        return sorted(
            products,
            key=lambda p: (
                p.color != customer.favorite_color,
                p.price,
            )
        )