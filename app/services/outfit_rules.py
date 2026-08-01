from dataclasses import dataclass


@dataclass(frozen=True)
class OutfitItem:
    id: int
    name: str
    category: str
    gender: str


def _norm(value: str | None) -> str:
    return (value or "").strip().lower().replace("‌", " ")


def classify_category(category: str, name: str = "") -> str:
    text = f"{_norm(category)} {_norm(name)}"
    if any(x in text for x in ("دامن", "شلوار", "شلوارک", "جین پایین", "لگ")):
        return "bottom"
    if any(x in text for x in ("پیراهن دکمه", "لباس دکمه", "شومیز", "اورشرت")):
        return "shirt_layer"
    if "پیراهن" in text and not any(x in text for x in ("پیراهن زنانه", "پیراهن مجلسی")):
        return "shirt_layer"
    if any(x in text for x in ("کت", "کاپشن", "ژاکت", "مانتو", "پالتو", "بارانی", "بلیزر")):
        return "outer"
    if any(x in text for x in ("تیشرت", "تی شرت", "تاپ", "بلوز", "پولوشرت", "زیرپوش", "هودی", "سویشرت")):
        return "inner_top"
    if any(x in text for x in ("پیراهن زنانه", "لباس مجلسی", "لباس زنانه", "سارافون", "سرهمی")):
        return "full_body"
    if any(x in text for x in ("کفش", "کتانی", "بوت", "صندل", "کیف", "کمربند", "کلاه")):
        return "accessory"
    return "other"


def _gender_group(gender: str, category: str, name: str) -> str:
    text = _norm(gender)
    cat = f"{_norm(category)} {_norm(name)}"
    # کت جین و لایه‌های واضحاً یونی‌سکس را محدود نکن.
    if "جین" in cat and any(x in cat for x in ("کت", "ژاکت", "کاپشن")):
        return "unisex"
    if any(x in text for x in ("زن", "خانم", "دختر")):
        return "female"
    if any(x in text for x in ("مرد", "آقا", "پسر")):
        return "male"
    return "unisex"


def validate_outfit(products: list) -> tuple[bool, str, list[str]]:
    if len(products) < 2:
        return False, "برای دیدن ست، حداقل دو محصول انتخاب کنید.", []
    if len(products) > 3:
        return False, "برای نتیجه طبیعی، حداکثر سه محصول قابل انتخاب است.", []

    items = [
        OutfitItem(p.id, p.name, p.category or "", p.gender or "")
        for p in products
    ]
    if len({item.id for item in items}) != len(items):
        return False, "یک محصول را نمی‌توان دوبار انتخاب کرد.", []

    slots = [classify_category(item.category, item.name) for item in items]
    if "accessory" in slots or "other" in slots:
        return False, "فعلاً فقط لباس‌های قابل پوشیدن روی بدن برای پرو مجازی پشتیبانی می‌شوند.", slots

    for slot in set(slots):
        if slots.count(slot) > 1:
            labels = {
                "bottom": "دو پایین‌تنه",
                "inner_top": "دو بالاتنه هم‌نوع",
                "shirt_layer": "دو لباس دکمه‌دار",
                "outer": "دو لایه رویی",
                "full_body": "دو لباس یک‌تکه",
            }
            return False, f"انتخاب {labels.get(slot, 'دو محصول هم‌نوع')} هم‌زمان طبیعی نیست.", slots

    if "full_body" in slots and any(s in slots for s in ("bottom", "inner_top", "shirt_layer")):
        return False, "لباس یک‌تکه را نمی‌توان هم‌زمان با شلوار، دامن یا بالاتنه جدا انتخاب کرد.", slots

    genders = {
        _gender_group(item.gender, item.category, item.name)
        for item in items
    } - {"unisex"}
    if len(genders) > 1:
        return False, "محصولات زنانه و مردانه اختصاصی را نمی‌توان در یک ست ترکیب کرد.", slots

    # سه لایه بالاتنه بدون پایین‌تنه معمولاً نتیجه شلوغ و غیرطبیعی می‌دهد.
    if len(items) == 3 and set(slots) == {"inner_top", "shirt_layer", "outer"}:
        return False, "سه لایه بالاتنه بدون پایین‌تنه نتیجه طبیعی نمی‌دهد؛ یکی از لایه‌ها را با شلوار یا دامن جایگزین کنید.", slots

    return True, "", slots


def build_layer_instruction(products: list, slots: list[str]) -> str:
    by_slot = {slot: product for product, slot in zip(products, slots)}
    instructions: list[str] = []
    if "inner_top" in by_slot:
        instructions.append(f'"{by_slot["inner_top"].name}" نزدیک بدن و به‌عنوان لایه زیرین پوشیده شود')
    if "shirt_layer" in by_slot:
        state = "روی لایه زیرین و با دکمه‌های باز" if "inner_top" in by_slot else "به‌شکل طبیعی و متناسب"
        instructions.append(f'"{by_slot["shirt_layer"].name}" {state} پوشیده شود')
    if "outer" in by_slot:
        instructions.append(f'"{by_slot["outer"].name}" به‌عنوان لایه رویی پوشیده شود')
    if "bottom" in by_slot:
        instructions.append(f'"{by_slot["bottom"].name}" به‌عنوان پایین‌تنه استفاده شود')
    if "full_body" in by_slot:
        instructions.append(f'"{by_slot["full_body"].name}" لباس اصلی یک‌تکه باشد')
    return "؛ ".join(instructions)
