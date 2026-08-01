from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductRepository:

    def create(self, db: Session, product: ProductCreate) -> Product:
        db_product = Product(
            name=product.name,
            brand=product.brand,
            category=product.category,
            color=product.color,
            size=product.size,
            material=product.material,
            gender=product.gender,
            season=product.season,
            occasion=product.occasion,
            price=product.price,
            stock=product.stock,
            is_active=product.is_active,
            is_featured=product.is_featured,
        )

        db.add(db_product)
        db.commit()
        db.refresh(db_product)

        return db_product

    def get_all(self, db: Session):
        return db.query(Product).all()

    def get_by_id(self, db: Session, product_id: int):
        return db.query(Product).filter(Product.id == product_id).first()

    def update(self, db: Session, product_id: int, product: ProductUpdate):
        db_product = self.get_by_id(db, product_id)

        if db_product is None:
            return None

        db_product.name = product.name
        db_product.brand = product.brand
        db_product.category = product.category
        db_product.color = product.color
        db_product.size = product.size
        db_product.material = product.material
        db_product.gender = product.gender
        db_product.season = product.season
        db_product.occasion = product.occasion
        db_product.price = product.price
        db_product.stock = product.stock
        db_product.is_active = product.is_active
        db_product.is_featured = product.is_featured

        db.commit()
        db.refresh(db_product)

        return db_product

    def delete(self, db: Session, product_id: int):
        db_product = self.get_by_id(db, product_id)

        if db_product is None:
            return False

        db.delete(db_product)
        db.commit()

        return True

    def search(self, db: Session, query: str):
        return (
            db.query(Product)
            .filter(
                or_(
                    Product.name.ilike(f"%{query}%"),
                    Product.brand.ilike(f"%{query}%"),
                    Product.category.ilike(f"%{query}%"),
                    Product.color.ilike(f"%{query}%"),
                    Product.material.ilike(f"%{query}%"),
                    Product.occasion.ilike(f"%{query}%"),
                )
            )
            .all()
        )

    def filter_products(
        self,
        db: Session,
        category: str | None = None,
        occasion: str | None = None,
    ):
        """
        فیلتر ساده‌ی محصولات بر اساس دسته‌بندی و/یا مناسبت.
        برای استفاده در صفحه‌ی محصولات فرانت (کلیک روی دایره‌های دسته‌بندی).
        """
        q = db.query(Product).filter(Product.is_active == True)

        if category:
            q = q.filter(Product.category.ilike(f"%{category}%"))

        if occasion:
            q = q.filter(Product.occasion.ilike(f"%{occasion}%"))

        return q.all()

    def search_for_ai(
        self,
        db: Session,
        query: str | None = None,
        category: str | None = None,
        color: str | None = None,
        gender: str | None = None,
        season: str | None = None,
        occasion: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        limit: int = 8,
    ):
        """
        جستجوی محصولات بر اساس فیلترهای اختیاری.
        برای استفاده توسط n8n (قبل از فرستادن به AI Agent).
        فقط محصولات فعال و موجود رو برمی‌گردونه.
        """
        q = db.query(Product).filter(
            Product.is_active == True,
            Product.stock > 0,
        )

        if query:
            q = q.filter(
                or_(
                    Product.name.ilike(f"%{query}%"),
                    Product.brand.ilike(f"%{query}%"),
                    Product.category.ilike(f"%{query}%"),
                    Product.color.ilike(f"%{query}%"),
                    Product.material.ilike(f"%{query}%"),
                    Product.occasion.ilike(f"%{query}%"),
                )
            )

        if category:
            q = q.filter(Product.category.ilike(f"%{category}%"))

        if color:
            q = q.filter(Product.color.ilike(f"%{color}%"))

        if gender:
            q = q.filter(Product.gender.ilike(f"%{gender}%"))

        if season:
            q = q.filter(Product.season.ilike(f"%{season}%"))

        if occasion:
            q = q.filter(Product.occasion.ilike(f"%{occasion}%"))

        if min_price is not None:
            q = q.filter(Product.price >= min_price)

        if max_price is not None:
            q = q.filter(Product.price <= max_price)

        return q.limit(limit).all()