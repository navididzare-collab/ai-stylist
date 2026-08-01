import os
from pathlib import Path
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.uploads import read_validated_image
from app.database.session import get_db
from app.models.product import Product
from app.models.product_image import ProductImage

router = APIRouter(prefix="/product-images", tags=["Product Images"])
UPLOAD_DIR = Path("static/uploads/products")


@router.post("/{product_id}")
async def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if len(files) > 8:
        raise HTTPException(status_code=400, detail="حداکثر ۸ تصویر در هر درخواست مجاز است.")
    if db.query(Product).filter(Product.id == product_id).first() is None:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved: list[ProductImage] = []

    for file in files:
        content = await read_validated_image(file)
        ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type or "image/jpeg"]
        filename = f"{uuid4()}.{ext}"
        path = UPLOAD_DIR / filename
        path.write_bytes(content)

        image = ProductImage(
            product_id=product_id,
            image_url=f"/static/uploads/products/{filename}",
            is_main=False,
        )
        db.add(image)
        saved.append(image)

    db.commit()
    return {"message": "ok", "images_count": len(saved)}


@router.get("/{product_id}")
def get_product_images(product_id: int, db: Session = Depends(get_db)):
    return db.query(ProductImage).filter(ProductImage.product_id == product_id).all()


@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="عکس پیدا نشد.")

    file_path = Path(image.image_url.lstrip("/"))
    try:
        file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="مسیر فایل نامعتبر است.")

    if file_path.is_file():
        file_path.unlink()
    db.delete(image)
    db.commit()
    return {"message": "عکس با موفقیت حذف شد."}
