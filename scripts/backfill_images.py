"""
اسکریپت: برای محصولاتی که عکس ندارن (مثلاً محصولاتی که با generate_test_products.py
ساخته شدن ولی به‌خاطر قطعی شبکه عکس نگرفتن)، دوباره از Pexels عکس می‌گیره.

از requests (به‌جای urllib) استفاده می‌کنه که پایدارتره، + retry و کمی مکث
بین درخواست‌ها تا قطعی‌های شبکه/آنتی‌ویروس کمتر پیش بیاد.

نحوه اجرا (از ریشه پروژه، با venv فعال):
    python scripts/backfill_images.py
"""

import os
import sys
import time
import uuid
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests

from app.database.session import SessionLocal
from app.models.product import Product
from app.models.product_image import ProductImage

UPLOAD_DIR = "static/uploads/products"

CATEGORY_QUERY_MAP = {
    "هودی": "hoodie",
    "کت": "denimjacket",
    "تیشرت": "tshirt",
    "شلوار": "pants",
    "سویشرت": "sweatshirt",
    "کاپشن": "coat",
    "پیراهن": "shirt",
    "ژاکت": "cardigan",
    "لباس": "dress",
}
DEFAULT_QUERY = "clothing"

COLOR_QUERY_MAP = {
    "مشکی": "black",
    "سفید": "white",
    "آبی": "blue",
    "طوسی": "gray",
    "بژ": "beige",
    "قرمز": "red",
    "سبز": "green",
    "زرد": "yellow",
    "صورتی": "pink",
    "قهوه‌ای": "brown",
    "روغنی": "olive",
}


def build_tags(category: str, color: str | None = None) -> str:
    base = CATEGORY_QUERY_MAP.get(category, DEFAULT_QUERY)
    color_en = COLOR_QUERY_MAP.get(color) if color else None
    return f"{base},{color_en}" if color_en else f"{base},fashion"


def download_image(session: requests.Session, tags: str, dest_path: str) -> bool:
    # سید تصادفی تا هر بار عکس متفاوتی بگیریم (وگرنه LoremFlickr ممکنه کش بده)
    seed = random.randint(1, 100000)
    url = f"https://loremflickr.com/600/600/{tags}?lock={seed}"

    for attempt in range(3):
        try:
            resp = session.get(url, timeout=15)
            resp.raise_for_status()
            with open(dest_path, "wb") as f:
                f.write(resp.content)
            return True
        except Exception as e:
            print(f"   تلاش {attempt + 1} برای '{tags}' شکست خورد: {e}")
            time.sleep(1.5)

    return False


def main():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    db = SessionLocal()
    session = requests.Session()

    try:
        products = db.query(Product).all()

        filled = 0
        skipped = 0
        failed = 0

        for product in products:
            has_image = (
                db.query(ProductImage)
                .filter(ProductImage.product_id == product.id)
                .first()
            )

            if has_image:
                skipped += 1
                continue

            tags = build_tags(product.category, product.color)
            filename = f"{uuid.uuid4()}.jpg"
            dest_path = os.path.join(UPLOAD_DIR, filename)

            success = download_image(session, tags, dest_path)
            if not success:
                print(f"❌ محصول #{product.id} ({product.name}) — دانلود عکس نهایتاً شکست خورد.")
                failed += 1
                continue

            image = ProductImage(
                product_id=product.id,
                image_url=f"/static/uploads/products/{filename}",
                is_main=True,
                sort_order=0,
            )
            db.add(image)
            db.commit()

            filled += 1
            print(f"✅ محصول #{product.id} ({product.name}) [{tags}] — عکس اضافه شد.")

            time.sleep(0.3)

        print(f"\nتمام شد: {filled} عکس گرفت، {skipped} از قبل داشت، {failed} شکست خورد.")

    finally:
        db.close()


if __name__ == "__main__":
    main()