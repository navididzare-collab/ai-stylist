from app.database.base import Base
from app.database.session import engine

# مهم: مدل‌ها را import می‌کنیم تا SQLAlchemy آن‌ها را بشناسد
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.customer import Customer
from app.models.conversation import Conversation
from app.models.message import Message
Base.metadata.create_all(bind=engine)

print("Database created successfully ✅")