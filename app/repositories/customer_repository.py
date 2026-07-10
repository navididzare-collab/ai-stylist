from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerRepository:

    def create(self, db: Session, customer: CustomerCreate) -> Customer:
        db_customer = Customer(
            full_name=customer.full_name,
            gender=customer.gender,
            age=customer.age,
            height=customer.height,
            weight=customer.weight,
            body_type=customer.body_type,
            skin_color=customer.skin_color,
            hair_color=customer.hair_color,
            favorite_style=customer.favorite_style,
            favorite_brand=customer.favorite_brand,
            favorite_color=customer.favorite_color,
            disliked_color=customer.disliked_color,
            occasion=customer.occasion,
            season=customer.season,
            weather=customer.weather,
            budget=customer.budget,
            shirt_size=customer.shirt_size,
            pants_size=customer.pants_size,
            shoe_size=customer.shoe_size,
        )

        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)

        return db_customer

    def get_all(self, db: Session):
        return db.query(Customer).all()

    def get_by_id(self, db: Session, customer_id: int):
        return db.query(Customer).filter(Customer.id == customer_id).first()

    def update(self, db: Session, customer_id: int, customer: CustomerUpdate):
        db_customer = self.get_by_id(db, customer_id)

        if db_customer is None:
            return None

        db_customer.full_name = customer.full_name
        db_customer.gender = customer.gender
        db_customer.age = customer.age
        db_customer.height = customer.height
        db_customer.weight = customer.weight
        db_customer.body_type = customer.body_type
        db_customer.skin_color = customer.skin_color
        db_customer.hair_color = customer.hair_color
        db_customer.favorite_style = customer.favorite_style
        db_customer.favorite_brand = customer.favorite_brand
        db_customer.favorite_color = customer.favorite_color
        db_customer.disliked_color = customer.disliked_color
        db_customer.occasion = customer.occasion
        db_customer.season = customer.season
        db_customer.weather = customer.weather
        db_customer.budget = customer.budget
        db_customer.shirt_size = customer.shirt_size
        db_customer.pants_size = customer.pants_size
        db_customer.shoe_size = customer.shoe_size

        db.commit()
        db.refresh(db_customer)

        return db_customer

    def delete(self, db: Session, customer_id: int):
        db_customer = self.get_by_id(db, customer_id)

        if db_customer is None:
            return False

        db.delete(db_customer)
        db.commit()

        return True