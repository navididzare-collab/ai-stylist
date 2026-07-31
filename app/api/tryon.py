import base64
import io
import os
import time
import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import httpx
from openai import OpenAI, APIConnectionError, APITimeoutError

from app.database.session import get_db
from app.repositories.product_repository import ProductRepository

router = APIRouter(prefix="/tryon", tags=["Try-On"])

repository = ProductRepository()

UPLOAD_DIR = "static/uploads/tryon"
BASE_URL = os.getenv("BACKEND_BASE_URL", "https://app-python-xvxv0.apps.frk1.abrhapaas.com")

# حداکثر ابعاد و کیفیتی که عکس‌ها قبل از فرستادن به AI باهاش فشرده می‌شن.
# فشرده کردن عکس حجم انتقالی رو کم می‌کنه و از قطع شدن اتصال (به‌خصوص وقتی
# ترافیک از یه تونل/پروکسی کند رد می‌شه) جلوگیری می‌کنه.
MAX_IMAGE_DIMENSION = 1024
JPEG_QUALITY = 78

# اگه مدل تشخیص بده عکس آپلودی انسان نیست، به‌جای ساختن عکس، باید متنی که
# دقیقاً با این رشته شروع می‌شه رو برگردونه تا کد بتونه این حالت رو تشخیص
# بده و پیام مناسب به کاربر نشون بده.
NO_PERSON_MARKER = "ERROR_NO_PERSON_DETECTED"

# اگه سیستم پشت فیلترشکن باشه (مثلاً v2rayN لوکال)، آدرس پروکسی رو از env
# می‌خونیم و به httpx می‌دیم. اگه این env ست نشده باشه (مثلاً روی سرور آنلاین
# که خودش دسترسی داره)، هیچ پروکسی‌ای اعمال نمی‌شه و مستقیم وصل می‌شه.
PROXY_URL = os.getenv("HTTP_PROXY_URL")

_http_client_kwargs = {"timeout": httpx.Timeout(180.0, connect=20.0)}
if PROXY_URL:
    _http_client_kwargs["proxy"] = PROXY_URL

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    http_client=httpx.Client(**_http_client_kwargs),
    timeout=180.0,
    max_retries=2,
)


def call_model_with_retries(content, attempts: int = 3, initial_delay: float = 3.0):
    """
    درخواست به مدل رو می‌فرسته و اگه به‌خاطر قطعی لحظه‌ای تونل/پروکسی با
    APIConnectionError یا APITimeoutError مواجه شد، با کمی مکث دوباره امتحان
    می‌کنه (تا سقف attempts بار) به‌جای اینکه بلافاصله خطا بده.
    """
    last_error = None
    delay = initial_delay

    for attempt in range(1, attempts + 1):
        try:
            return client.chat.completions.create(
                model="google/gemini-3-pro-image-preview",
                modalities=["image", "text"],
                messages=[{"role": "user", "content": content}],
            )
        except (APIConnectionError, APITimeoutError) as e:
            last_error = e
            print(f"=== TRYON RETRY {attempt}/{attempts} FAILED: {repr(e)} ===")
            if attempt < attempts:
                time.sleep(delay)
                delay *= 2

    raise last_error


def compress_image_bytes(content: bytes) -> bytes:
    """
    عکس رو کوچیک و فشرده می‌کنه (resize + تبدیل به JPEG با کیفیت متعادل)
    تا حجمی که باید از تونل/پروکسی رد بشه به حداقل برسه و سریع‌تر منتقل بشه.
    """
    try:
        image = Image.open(io.BytesIO(content))
        image = image.convert("RGB")

        width, height = image.size
        largest_side = max(width, height)
        if largest_side > MAX_IMAGE_DIMENSION:
            scale = MAX_IMAGE_DIMENSION / largest_side
            image = image.resize((int(width * scale), int(height * scale)))

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return buffer.getvalue()
    except Exception as e:
        # اگه به هر دلیلی فشرده‌سازی شکست خورد، عکس اصلی رو برگردون تا
        # لااقل کل درخواست fail نشه.
        print("=== IMAGE COMPRESSION FAILED, USING ORIGINAL ===", repr(e))
        return content


def image_file_to_data_url(path: str) -> str:
    with open(path, "rb") as f:
        content = f.read()
    compressed = compress_image_bytes(content)
    encoded = base64.b64encode(compressed).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def upload_file_to_data_url(file: UploadFile, content: bytes) -> str:
    compressed = compress_image_bytes(content)
    encoded = base64.b64encode(compressed).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def get_garment_data_url(db: Session, product_id: int) -> str:
    """محصول رو با id پیدا می‌کنه، عکس اصلیش رو می‌خونه و به data URL تبدیل می‌کنه."""
    product = repository.get_by_id(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"محصول با id={product_id} پیدا نشد.")

    if not product.images:
        raise HTTPException(status_code=400, detail=f"محصول با id={product_id} عکس ندارد.")

    main_image = next((img for img in product.images if img.is_main), product.images[0])
    garment_disk_path = main_image.image_url.lstrip("/")

    if not os.path.exists(garment_disk_path):
        raise HTTPException(status_code=404, detail=f"فایل عکس محصول با id={product_id} پیدا نشد.")

    return image_file_to_data_url(garment_disk_path)


def save_result_image(result_b64: str) -> str:
    if result_b64.startswith("data:"):
        header, b64_data = result_b64.split(",", 1)
    else:
        b64_data = result_b64

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    dest_path = os.path.join(UPLOAD_DIR, filename)

    with open(dest_path, "wb") as f:
        f.write(base64.b64decode(b64_data))

    return f"{BASE_URL}/static/uploads/tryon/{filename}"


def image_contains_person(person_data_url: str) -> bool:
    """
    قبل از رفتن سراغ کار اصلی (که گرون‌تره و ممکنه مدل به‌جای رد کردن یه
    آدم تخیلی بسازه)، با یه درخواست سبک و فقط-متنی از مدل می‌پرسیم آیا این
    عکس واقعاً یک عکس واقعی از یک انسانه یا نه. اینجا خود کد پایتون تصمیم
    نهایی رو می‌گیره، نه اینکه به فرمت پاسخ مدل توی کار اصلی (تولید عکس)
    اعتماد کنیم.
    """
    question = [
        {
            "type": "text",
            "text": (
                "Look at the attached image very carefully. Answer with ONLY a single "
                "word, nothing else: reply exactly 'YES' if this image is an actual "
                "photograph that clearly shows a real human being's body and/or face, "
                "physically present in the frame. Reply exactly 'NO' if it is anything "
                "else — including product photos, clothing laid out or on a mannequin, "
                "logos, icons, badges, circular/framed graphic designs, illustrations, "
                "3D renders, cartoons, objects, animals, landscapes, documents, "
                "screenshots, text, or blank/solid-color images. If you are not highly "
                "confident it is a genuine photo of a real human, reply 'NO'. Reply with "
                "just YES or NO, no punctuation, no explanation."
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
    ]

    try:
        completion = client.chat.completions.create(
            model="google/gemini-3-pro-image-preview",
            modalities=["text"],
            messages=[{"role": "user", "content": question}],
        )
    except Exception as e:
        print("=== PERSON CHECK EXCEPTION, FAILING OPEN ===", repr(e))
        # اگه خود این چک به هر دلیلی (مثلاً مشکل شبکه) شکست خورد، اجازه
        # می‌دیم فرآیند اصلی ادامه پیدا کنه به‌جای اینکه کاربر بی‌دلیل بلاک بشه.
        return True

    answer = (completion.choices[0].message.content or "").strip().upper()
    print("=== PERSON CHECK ANSWER ===", answer)
    return answer.startswith("YES")


def ensure_person_image(person_data_url: str) -> None:
    if not image_contains_person(person_data_url):
        raise HTTPException(
            status_code=400,
            detail="عکسی که آپلود کردید تصویر یک انسان نیست. لطفاً یک عکس تمام‌قد و واضح از خودتان آپلود کنید.",
        )


def check_no_person_response(message):
    """
    لایه‌ی دوم و پشتیبان: اگه مدل توی همون کار اصلی هم به‌جای عکس، پیام متنی
    حاوی نشانه‌ی NO_PERSON_MARKER برگردونده باشه، همون پیام واضح رو نشون بده.
    """
    text = (message.content or "")
    if NO_PERSON_MARKER in text:
        raise HTTPException(
            status_code=400,
            detail="عکسی که آپلود کردید تصویر یک انسان نیست. لطفاً یک عکس تمام‌قد و واضح از خودتان آپلود کنید.",
        )


# این خط به‌صورت مشترک به هر دو پرامپت (تک‌محصول و ست) اضافه می‌شه تا صریحاً
# و با قاطعیت تأکید کنه که مدل هیچ تغییر دیگه‌ای غیر از عوض کردن لباس نده.
STRICT_NO_EXTRA_CHANGES_RULE = (
    "STRICT RULE — READ CAREFULLY: The ONLY thing you are allowed to change in this "
    "image is the clothing item(s) being swapped. Do not change or regenerate anything "
    "else for any reason, even if it seems like it would improve the result. Do NOT "
    "change the person's face, facial features, expression, eyes, skin tone, skin "
    "texture, hair, hairstyle, body shape, body proportions, height, pose, hands, "
    "fingers, accessories (jewelry, glasses, watches, bags) they are already wearing "
    "but that are unrelated to the garment being swapped, shoes (unless the shoes are "
    "literally the garment being swapped), background, camera angle, framing, zoom "
    "level, image composition, lighting, shadows, color grading, or overall photo "
    "quality/resolution. Do not crop, zoom, re-frame, sharpen, upscale, or stylistically "
    "enhance the image. Do not add any new objects, text, watermarks, or effects. The "
    "output must look like the exact same original photograph with nothing altered "
    "except the specified garment(s). If you are unsure whether a change is necessary, "
    "do not make it."
)

# قانون مشترک بررسی وجود انسان توی عکس اول (عکس کاربر)، قبل از هر کار دیگه‌ای.
PERSON_VALIDATION_RULE = (
    "BEFORE doing anything else, carefully check the FIRST image (the person's photo). "
    "This first image MUST be an actual photograph that clearly shows a real human "
    "being's body and/or face, physically present in the frame. "
    "If the first image does NOT meet that bar — for example if it is a photo of a "
    "product, an object, packaging, a logo, an icon, a badge, a circular/framed graphic "
    "design, an animal, a landscape, a piece of paper, a document, plain text, a "
    "screenshot, a blank or solid-color image, a cartoon/illustration/3D render with no "
    "real photographed person in it, or literally ANY image that does not show an actual "
    "photographed human body — you MUST treat this as a validation failure. "
    "In this failure case, you are STRICTLY FORBIDDEN from generating, inventing, "
    "imagining, or drawing any person, body, or human figure to place the garment on. "
    "Do not create a substitute model, mannequin-like figure, or any new human "
    "whatsoever, even if it would make the output look complete. Do not attempt any "
    "clothing swap, edit, or image generation of any kind. "
    "Instead, your entire response must be ONLY plain text (absolutely no image output) "
    f"that starts exactly with: {NO_PERSON_MARKER}\n"
    "followed by a short one-sentence explanation of why the first image was rejected. "
    "Do not guess or assume a person is present if you are not highly confident the first "
    "image is a genuine photograph of a real human. When in doubt, reject — it is much "
    "better to incorrectly reject a valid photo than to invent a fake person. Only "
    "proceed with the clothing swap task below if you are highly confident the first "
    "image is an actual photograph containing a real human body."
)


@router.post("/")
async def try_on(
    product_id: int = Form(...),
    person_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    garment_data_url = get_garment_data_url(db, product_id)

    person_bytes = await person_image.read()
    person_data_url = upload_file_to_data_url(person_image, person_bytes)

    ensure_person_image(person_data_url)

    content = [
        {
            "type": "text",
            "text": (
                f"{PERSON_VALIDATION_RULE}\n\n"
                "You are doing a virtual clothing try-on. The person in the first photo is "
                "currently wearing a garment (e.g. top, jacket, or dress) that needs to be "
                "swapped out. Replace that current garment with the new garment shown in the "
                "second photo, so the new garment fully takes its place — no part of the "
                "original garment (collar, sleeve, hem, or any fabric) should remain visible "
                "underneath or peeking out. Fit the new garment naturally to the person's body "
                "shape and pose, as if they are actually wearing it. Do not blend, layer, or "
                "overlay the new garment on top of the old one — it must be a full replacement. "
                "Do not invent or add any extra clothing layer underneath the new garment — no "
                "black undershirt, black camisole, black leggings, black sleeves, or any other "
                "filler garment that is not part of the new garment itself. Fit and drape the new "
                "garment so that it naturally covers the person's torso and body the way a real "
                "garment would when worn — even if the reference product photo shows the garment "
                "hanging open or loose (for example an open jacket or coat with nothing "
                "underneath), adapt it on the person so it closes over and covers the front of "
                "their body, instead of leaving it open and exposing bare skin or the torso "
                "underneath. Do not add a separate undergarment to achieve this coverage — the "
                "garment itself should be the thing covering the body. "
                "Keep everything else about the photo exactly the same: the same face, facial "
                "expression, hairstyle, body shape, skin tone, pose, camera angle, framing, "
                "background, and lighting as the original photo. Do not beautify, retouch, "
                "reshape, or alter the person in any way. The only difference between the input "
                "and output photo should be the garment itself. Return a single photorealistic "
                "result.\n\n"
                f"{STRICT_NO_EXTRA_CHANGES_RULE}"
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
        {"type": "image_url", "image_url": {"url": garment_data_url}},
    ]

    try:
        completion = call_model_with_retries(content)
    except Exception as e:
        print("=== TRYON EXCEPTION ===")
        print(repr(e))
        print("=== END EXCEPTION ===")
        raise HTTPException(status_code=502, detail=f"خطا در تماس با سرویس تولید عکس: {e}")

    message = completion.choices[0].message
    images = getattr(message, "images", None)

    print("=== TRYON RAW COMPLETION ===")
    print("finish_reason:", completion.choices[0].finish_reason)
    print("message.content:", message.content)
    print("message.images:", images)
    print("=== END TRYON RAW ===")

    check_no_person_response(message)

    if not images:
        raise HTTPException(
            status_code=502,
            detail=f"هوش مصنوعی نتونست عکس بسازه. دوباره امتحان کن. (دلیل مدل: {message.content or completion.choices[0].finish_reason})",
        )

    result_b64 = images[0]["image_url"]["url"]
    return {"result_image_url": save_result_image(result_b64)}


@router.post("/outfit")
async def try_on_outfit(
    product_ids: List[int] = Form(...),
    person_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    مثل /tryon/ ولی به‌جای یک محصول، دقیقاً دو محصول (مثلاً یک بالاتنه + یک
    پایین‌تنه که با هم ست شدن) رو هم‌زمان روی همون یک عکس کاربر می‌پوشونه،
    نه اینکه دوبار جدا-جدا صداش کنیم.
    """
    if len(product_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="برای امتحان ست کامل باید دقیقاً دو محصول ارسال شود.",
        )

    # اگه بیشتر از دو تا اومد، فقط دو تای اول رو در نظر می‌گیریم
    product_ids = product_ids[:2]

    garment_data_urls = [get_garment_data_url(db, pid) for pid in product_ids]

    person_bytes = await person_image.read()
    person_data_url = upload_file_to_data_url(person_image, person_bytes)

    ensure_person_image(person_data_url)

    content = [
        {
            "type": "text",
            "text": (
                f"{PERSON_VALIDATION_RULE}\n\n"
                "Take the person in the first photo, who is currently wearing their own top and "
                "bottom. Replace their current outfit with BOTH new garments shown in the next "
                "two photos AT THE SAME TIME, as a single coordinated outfit — one garment worn "
                "as the top/outer layer and the other as the bottom (or however the two garments "
                "are naturally worn together). The new garments should fully take the place of "
                "the original outfit — no part of the original clothing (collar, sleeve, or hem) "
                "should remain visible underneath or peeking out. Fit both garments naturally to "
                "the person's body shape and pose, matching the lighting of the original photo. "
                "Do not blend, layer, or overlay the new garments on top of the old clothing — "
                "this must be a full replacement, not a cover-up. Do not invent or add any extra "
                "clothing layer underneath the new garments — no black undershirt, black "
                "camisole, black leggings, black sleeves, or any other filler garment that is not "
                "part of the two new garments themselves. Fit and drape each garment so it "
                "naturally covers the person's body the way it would when actually worn — even if "
                "a reference product photo shows a garment (such as a jacket or coat) hanging open "
                "or loose with nothing underneath, adapt it on the person so it closes over and "
                "covers the front of their body, instead of leaving it open and exposing bare skin "
                "or the torso underneath. Do not add a separate undergarment to achieve this "
                "coverage — the garments themselves should be what covers the body. Keep the "
                "person's face, facial expression, hairstyle, body shape, skin tone, pose, camera "
                "angle, framing, and background exactly as close to the original photo as "
                "possible. Do not beautify, retouch, reshape, or alter the person in any way. "
                "Return a single photorealistic result showing the person wearing both new "
                "garments together.\n\n"
                f"{STRICT_NO_EXTRA_CHANGES_RULE}"
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
    ]
    for url in garment_data_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})

    try:
        completion = call_model_with_retries(content)
    except Exception as e:
        print("=== TRYON OUTFIT EXCEPTION ===")
        print(repr(e))
        print("=== END EXCEPTION ===")
        raise HTTPException(status_code=502, detail=f"خطا در تماس با سرویس تولید عکس: {e}")

    message = completion.choices[0].message
    images = getattr(message, "images", None)

    print("=== TRYON OUTFIT RAW COMPLETION ===")
    print("finish_reason:", completion.choices[0].finish_reason)
    print("message.content:", message.content)
    print("message.images:", images)
    print("=== END TRYON OUTFIT RAW ===")

    check_no_person_response(message)

    if not images:
        raise HTTPException(
            status_code=502,
            detail=f"هوش مصنوعی نتونست عکس بسازه. دوباره امتحان کن. (دلیل مدل: {message.content or completion.choices[0].finish_reason})",
        )

    result_b64 = images[0]["image_url"]["url"]
    return {"result_image_url": save_result_image(result_b64)}