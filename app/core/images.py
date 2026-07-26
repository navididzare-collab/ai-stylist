def get_main_image_url(product) -> str | None:
    """
    از بین عکس‌های محصول، عکسی که is_main=True هست رو برمی‌گردونه؛
    اگه هیچ‌کدوم main نبودن، اولین عکس (بر اساس sort_order) رو برمی‌گردونه.
    """
    if not product.images:
        return None

    sorted_images = sorted(product.images, key=lambda img: (not img.is_main, img.sort_order))
    return sorted_images[0].image_url