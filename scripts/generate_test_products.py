"""
اسکریپت یک‌بار مصرف: تعدادی محصول ساختگی ولی واقعی‌به‌نظر می‌سازه
(اسم، برند، رنگ، سایز، قیمت منطقی) و برای هرکدوم یه عکس واقعی و مرتبط
از Pexels (قانونی و رایگان) می‌گیره و توی دیتابیس ثبت می‌کنه.

قبل از اجرا:
    1. یه کلید رایگان از https://www.pexels.com/api/ بگیرید
    2. توی فایل .env این خط رو اضافه کنید:
       PEXELS_API_KEY=کلید_شما

نحوه اجرا (از ریشه پروژه، با venv فعال):
    python scripts/generate_test_products.py
    python scripts/generate_test_products.py --count 40   (برای تعداد دلخواه)
"""

import os
import sys
import uuid
import json
import random
import argparse
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from app.database.session import SessionLocal
from app.models.product import Product
from app.models.product_image import ProductImage

UPLOAD_DIR = "static/uploads/products"
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")

# ---------------- داده‌های تولید محصول ----------------

CATEGORY_QUERY_MAP = {
    "هودی": "hoodie clothing",
    "کت": "denim jacket fashion",
    "تیشرت": "tshirt clothing",
    "شلوار": "pants trousers fashion",
    "سویشرت": "sweatshirt clothing",
    "کاپشن": "winter coat fashion",
    "پیراهن": "men shirt fashion",
    "ژاکت": "cardigan sweater",
    "لباس": "dress fashion",
}

BRANDS = ["Zara", "H&M", "Nike", "Adidas", "Mango", "Bershka", "Pull&Bear", "Reserved", "Levi's", "Uniqlo"]
COLORS = ["مشکی", "سفید", "آبی", "طوسی", "بژ", "قرمز", "سبز", "زرد", "صورتی", "قهوه‌ای"]
SIZES = ["S", "M", "L", "XL"]
GENDERS = ["مردانه", "زنانه"]
SEASONS = ["بهار", "تابستان", "پاییز", "زمستان"]
OCCASIONS = ["روزمره", "رسمی", "اسپرت", "مهمانی"]
MATERIALS = ["پنبه", "پلی‌استر", "جین", "کتان", "پشم"]

PRICE_RANGES = {
    "هودی": (600000, 1200000),
    "کت": (900000, 2000000),
    "تیشرت": (300000, 700000),
    "شلوار": (600000, 1300000),
    "سویشرت": (600000, 1100000),
    "کاپشن": (1500000, 3200000),
    "پیراهن": (500000, 900000),
    "ژاکت": (700000, 1400000),
    "لباس": (600000, 1800000),
}


def build_product_data():
    category = random.choice(list(CATEGORY_QUERY_MAP.keys()))
    brand = random.choice(BRANDS)
    color = random.choice(COLORS)
    size = random.choice(SIZES)
    gender = random.choice(GENDERS)
    season = random.choice(SEASONS)
    occasion = random.choice(OCCASIONS)
    material = random.choice(MATERIALS)
    low, high = PRICE_RANGES[category]
    price = random.randrange(low, high, 10000)

    name = f"{category} {color} {brand}"

    return {
        "name": name,
        "brand": brand,
        "category": category,
        "color": color,
        "size": size,
        "material": material,
        "gender": gender,
        "season": season,
        "occasion": occasion,
        "price": price,
        "stock": random.randint(5, 30),
        "is_active": True,
        "is_featured": random.random() < 0.2,
    }


# ---------------- گرفتن عکس از Pexels ----------------

_image_cache: dict[str, list[str]] = {}


def get_image_urls_for_category(category: str) -> list[str]:
    if category in _image_cache:
        return _image_cache[category]

    query = CATEGORY_QUERY_MAP.get(category, "clothing fashion")
    params = urllib.parse.urlencode({"query": query, "per_page": 15, "orientation": "square"})
    url = f"https://api.pexels.com/v1/search?{params}"
    req = urllib.request.Request(url, headers={"Authorization": PEXELS_API_KEY})

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())

    urls = [p["src"]["medium"] for p in data.get("photos", [])]
    _image_cache[category] = urls
    return urls


def download_image(url: str, dest_path: str):
    urllib.request.urlretrieve(url, dest_path)


# ---------------- اجرای اصلی ----------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=30, help="تعداد محصولاتی که ساخته بشه")
    args = parser.parse_args()

    if not PEXELS_API_KEY:
        print("❌ PEXELS_API_KEY توی .env تنظیم نشده. اول اونو اضافه کن.")
        return

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    db = SessionLocal()

    created = 0

    try:
        for _ in range(args.count):
            data = build_product_data()

            db_product = Product(
                name=data["name"],
                brand=data["brand"],
                category=data["category"],
                color=data["color"],
                size=data["size"],
                material=data["material"],
                gender=data["gender"],
                season=data["season"],
                occasion=data["occasion"],
                price=data["price"],
                stock=data["stock"],
                is_active=data["is_active"],
            )
            db.add(db_product)
            db.commit()
            db.refresh(db_product)

            try:
                candidates = get_image_urls_for_category(data["category"])
                if candidates:
                    image_url = random.choice(candidates)
                    filename = f"{uuid.uuid4()}.jpg"
                    dest_path = os.path.join(UPLOAD_DIR, filename)
                    download_image(image_url, dest_path)

                    image = ProductImage(
                        product_id=db_product.id,
                        image_url=f"/static/uploads/products/{filename}",
                        is_main=True,
                        sort_order=0,
                    )
                    db.add(image)
                    db.commit()
            except Exception as e:
                print(f"⚠️ محصول #{db_product.id} ساخته شد ولی عکس نگرفت: {e}")

            created += 1
            print(f"✅ [{created}/{args.count}] {data['name']} — {data['price']:,} تومان")

        print(f"\nتمام شد: {created} محصول جدید ساخته شد.")

    finally:
        db.close()


if __name__ == "__main__":
    main()