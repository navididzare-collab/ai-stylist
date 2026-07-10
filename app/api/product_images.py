import os
from uuid import uuid4
from typing import List

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.product_image import ProductImage

router = APIRouter(prefix="/product-images", tags=["Product Images"])

UPLOAD_DIR = os.path.join("static", "uploads", "products")


@router.post("/{product_id}")
async def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if not os.path.isdir(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    saved = []

    for file in files:
        ext = file.filename.split(".")[-1]
        filename = f"{uuid4()}.{ext}"
        path = os.path.join(UPLOAD_DIR, filename)

        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)

        image = ProductImage(
            product_id=product_id,
            image_url=f"/static/uploads/products/{filename}",
            is_main=False,
        )

        db.add(image)
        saved.append(image)

    db.commit()

    return {
        "message": "ok",
        "images_count": len(saved)
    }


@router.get("/{product_id}")
def get_product_images(
    product_id: int,
    db: Session = Depends(get_db),
):
    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .all()
    )

    return images


@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
):
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()

    if image is None:
        raise HTTPException(status_code=404, detail="عکس پیدا نشد.")

    # حذف فایل واقعی از روی هارد (اگه وجود داشته باشه)
    file_path = image.image_url.lstrip("/")
    if os.path.isfile(file_path):
        os.remove(file_path)

    db.delete(image)
    db.commit()

    return {"message": "عکس با موفقیت حذف شد."}