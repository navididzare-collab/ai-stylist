import base64
import hashlib
import hmac
import io
import os
import time
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from PIL import Image
import httpx
from openai import OpenAI, APIConnectionError, APITimeoutError

from app.api.deps import get_current_user_id
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.uploads import read_validated_image
from app.database.session import get_db
from app.repositories.product_repository import ProductRepository
from app.services.outfit_rules import build_layer_instruction, validate_outfit

router = APIRouter(prefix="/tryon", tags=["Try-On"])

repository = ProductRepository()

PRIVATE_UPLOAD_DIR = settings.TRYON_PRIVATE_DIR
BASE_URL = settings.BACKEND_BASE_URL

# حداکثر ابعاد و کیفیتی که عکس‌ها قبل از فرستادن به AI باهاش فشرده می‌شن.
# فشرده کردن عکس حجم انتقالی رو کم می‌کنه و از قطع شدن اتصال (به‌خصوص وقتی
# ترافیک از یه تونل/پروکسی کند رد می‌شه) جلوگیری می‌کنه.
MAX_IMAGE_DIMENSION = 1024
JPEG_QUALITY = 78

# اگه مدل توی همون فراخوانی اصلی (تولید عکس) تشخیص بده که عکس آپلودی اصلاً
# انسان نیست (بی‌ربط/خارج از کار ماست)، به‌جای ساختن عکس، باید متنی که دقیقاً
# با این رشته شروع می‌شه رو برگردونه تا کد بتونه این حالت رو تشخیص بده و پیام
# «خارج از حوزه‌ی کاری ماست» رو نشون بده.
NO_PERSON_MARKER = "ERROR_NOT_PERSON_DETECTED"

# اگه مدل تشخیص بده عکس واقعاً انسانه ولی به‌خاطر کیفیت/زاویه/کادربندی
# نمی‌شه روش لباس گذاشت، باید متنی که دقیقاً با این رشته شروع می‌شه رو
# برگردونه تا کد بتونه پیام «یه عکس بهتر بگیر» رو نشون بده (نه پیام
# «این خارج از کار ماست»).
BAD_QUALITY_MARKER = "ERROR_BAD_QUALITY_PERSON_DETECTED"

# اگه سیستم پشت فیلترشکن باشه (مثلاً v2rayN لوکال)، آدرس پروکسی رو از env
# می‌خونیم و به httpx می‌دیم. اگه این env ست نشده باشه (مثلاً روی سرور آنلاین
# که خودش دسترسی داره)، هیچ پروکسی‌ای اعمال نمی‌شه و مستقیم وصل می‌شه.
PROXY_URL = os.getenv("HTTP_PROXY_URL")

_http_client_kwargs = {"timeout": httpx.Timeout(180.0, connect=20.0)}
if PROXY_URL:
    _http_client_kwargs["proxy"] = PROXY_URL

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
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
                model=settings.TRYON_MODEL,
                modalities=["image", "text"],
                messages=[{"role": "user", "content": content}],
            )
        except (APIConnectionError, APITimeoutError) as e:
            last_error = e
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
    except Exception:
        # در صورت خطای غیرمنتظره، فایل اصلیِ قبلاً اعتبارسنجی‌شده استفاده می‌شود.
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
    garment_disk_path = Path(main_image.image_url.lstrip("/")).resolve()
    static_root = Path("static").resolve()
    if static_root not in garment_disk_path.parents:
        raise HTTPException(status_code=400, detail="مسیر عکس محصول معتبر نیست.")
    if not garment_disk_path.is_file():
        raise HTTPException(status_code=404, detail=f"فایل عکس محصول با id={product_id} پیدا نشد.")

    return image_file_to_data_url(str(garment_disk_path))


def _sign_result(filename: str, user_id: int, expires: int) -> str:
    payload = f"{filename}:{user_id}:{expires}".encode("utf-8")
    return hmac.new(
        settings.JWT_SECRET.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()


def _cleanup_expired_results() -> None:
    PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    cutoff = time.time() - max(settings.TRYON_RESULT_TTL_SECONDS * 2, 7200)
    for path in PRIVATE_UPLOAD_DIR.glob("*.png"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            pass


def save_result_image(result_b64: str, user_id: int) -> str:
    b64_data = result_b64.split(",", 1)[1] if result_b64.startswith("data:") else result_b64
    try:
        image_bytes = base64.b64decode(b64_data, validate=True)
        if len(image_bytes) > 20 * 1024 * 1024:
            raise ValueError("result too large")
        with Image.open(io.BytesIO(image_bytes)) as image:
            image.verify()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="تصویر تولیدشده معتبر نبود.") from exc

    _cleanup_expired_results()
    filename = f"{uuid.uuid4()}.png"
    dest_path = PRIVATE_UPLOAD_DIR / filename
    dest_path.write_bytes(image_bytes)

    expires = int(time.time()) + settings.TRYON_RESULT_TTL_SECONDS
    signature = _sign_result(filename, user_id, expires)
    return (
        f"{BASE_URL}/tryon/result/{filename}?uid={user_id}&expires={expires}"
        f"&signature={signature}"
    )


@router.get("/result/{filename}", include_in_schema=False)
def get_tryon_result(
    filename: str,
    uid: int = Query(...),
    expires: int = Query(...),
    signature: str = Query(...),
):
    if expires < int(time.time()):
        raise HTTPException(status_code=410, detail="لینک تصویر منقضی شده است.")
    if not hmac.compare_digest(signature, _sign_result(filename, uid, expires)):
        raise HTTPException(status_code=403, detail="لینک تصویر معتبر نیست.")
    if Path(filename).name != filename or not filename.endswith(".png"):
        raise HTTPException(status_code=400, detail="نام فایل نامعتبر است.")
    path = PRIVATE_UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="تصویر پیدا نشد.")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "private, max-age=300"})


# پیام‌های نهایی که کاربر در هر حالت می‌بینه. این‌ها هم توسط لایه‌ی اول
# (پیش‌بررسی) و هم توسط لایه‌ی دوم (بررسی پشتیبان توی خروجی کار اصلی)
# استفاده می‌شن تا در هر دو مسیر دقیقاً یک متن یکسان به کاربر نشون داده بشه.
MSG_NOT_PERSON = (
    "این تصویر خارج از حوزه‌ی کاری ما هست؛ ما فقط می‌تونیم لباس رو روی عکس "
    "یک فرد واقعی امتحان کنیم. لطفاً یک عکس واقعی از خودتان آپلود کنید."
)
MSG_BAD_QUALITY = (
    "عکس شما فرد رو نشون می‌ده ولی کیفیت، زاویه یا کادربندیش اجازه نمی‌ده "
    "لباس به‌درستی روش امتحان بشه. لطفاً یک عکس بهتر بگیرید: نور کافی، "
    "دوربین روبه‌رو، تمام‌قد یا حداقل از کمر به بالا، بدون کادر افتادن یا "
    "پوشیده‌شدن بخش اصلی بدن، و فقط یک نفر در کادر."
)


# نتیجه‌ی ممکن برای بررسی عکس کاربر: عکس قابل‌استفاده است، عکس انسانه ولی
# قابل‌استفاده نیست (باید عکس بهتر بگیره)، یا اصلاً عکس انسان نیست (خارج از
# حوزه‌ی کار ماست).
PERSON_CHECK_OK = "OK"
PERSON_CHECK_BAD_QUALITY = "BAD_QUALITY"
PERSON_CHECK_NOT_PERSON = "NOT_PERSON"


def classify_person_image(person_data_url: str) -> str:
    """
    قبل از رفتن سراغ کار اصلی (که گرون‌تره و ممکنه مدل به‌جای رد کردن یه
    آدم تخیلی بسازه)، با یه درخواست سبک و فقط-متنی از مدل می‌پرسیم عکس
    آپلودی دقیقاً توی کدوم یکی از سه حالت زیره. اینجا خود کد پایتون تصمیم
    نهایی رو می‌گیره، نه اینکه به فرمت پاسخ مدل توی کار اصلی (تولید عکس)
    اعتماد کنیم.

    این تفکیک سه‌حالته مهمه چون دو نوع رد شدن باید پیام کاملاً متفاوتی به
    کاربر بدن:
    - عکس اصلاً انسان نیست (محصول/لوگو/حیوان/کارتون و...) → باید بگیم این
      کار خارج از حوزه‌ی سرویس ماست.
    - عکس واقعاً انسانه ولی کیفیت/زاویه/کادربندیش اجازه‌ی پوشوندن لباس رو
      نمی‌ده (خیلی تار، خیلی دور، بخش اصلی بدن بیرون از کادره، چند نفر روی
      هم افتادن و...) → باید از کاربر بخوایم یه عکس بهتر بگیره، نه اینکه
      بگیم عکس انسان نیست.
    """
    question = [
        {
            "type": "text",
            "text": (
                "Look at the attached image very carefully and classify it into EXACTLY "
                "one of these three categories. Reply with ONLY one of the following "
                "exact words, nothing else — no punctuation, no explanation:\n\n"
                "OK — the image is an actual photograph that clearly and physically "
                "shows a real human being, with their torso/upper-body clothing area "
                "clearly visible, unobstructed, and large enough in the frame that a "
                "garment could realistically be placed on them. A normal front-facing or "
                "slightly angled full-body or half-body photo qualifies.\n\n"
                "BAD_QUALITY — the image DOES show a real human being physically present "
                "in the frame, but the photo is unusable for placing clothing on them, "
                "for reasons such as: too blurry, too dark, very low resolution; the "
                "person is extremely small/far away or heavily cropped so their torso is "
                "mostly out of frame; the main clothing area (torso) is entirely hidden "
                "behind an object, other people, or turned completely away from the "
                "camera; an extreme unusual angle (e.g. only a close-up of a foot, hand, "
                "or the back of the head) that leaves no usable clothing region; or "
                "several people overlapping so no single clear subject can be isolated.\n\n"
                "NOT_PERSON — the image does not show a real photographed human being at "
                "all. This includes product photos, clothing laid out flat or on a "
                "mannequin/hanger with nobody wearing it, logos, icons, badges, "
                "circular/framed graphic designs, illustrations, 3D renders, cartoons, "
                "drawings, objects, animals, landscapes, documents, screenshots, plain "
                "text, or blank/solid-color images.\n\n"
                "If you are unsure whether it's OK or BAD_QUALITY, prefer BAD_QUALITY. "
                "If you are unsure whether a real photographed human is present at all, "
                "prefer NOT_PERSON. Reply with just one word: OK, BAD_QUALITY, or "
                "NOT_PERSON."
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
    ]

    try:
        completion = client.chat.completions.create(
            model=settings.TRYON_MODEL,
            modalities=["text"],
            messages=[{"role": "user", "content": question}],
        )
    except Exception:
        # کار اصلی خودش یک لایه بررسی پشتیبان دارد؛ در خطای پیش‌بررسی ادامه می‌دهیم.
        return PERSON_CHECK_OK

    answer = (completion.choices[0].message.content or "").strip().upper()

    if "NOT_PERSON" in answer:
        return PERSON_CHECK_NOT_PERSON
    if "BAD_QUALITY" in answer:
        return PERSON_CHECK_BAD_QUALITY
    if "OK" in answer:
        return PERSON_CHECK_OK

    # اگه پاسخ مدل هیچ‌کدوم از سه کلیدواژه رو نداشت (فرمت غیرمنتظره)، برای
    # جلوگیری از بلاک بی‌دلیل کاربر، عبور می‌دیم.
    return PERSON_CHECK_OK


def ensure_person_image(person_data_url: str) -> None:
    result = classify_person_image(person_data_url)

    if result == PERSON_CHECK_NOT_PERSON:
        raise HTTPException(status_code=400, detail=MSG_NOT_PERSON)

    if result == PERSON_CHECK_BAD_QUALITY:
        raise HTTPException(status_code=400, detail=MSG_BAD_QUALITY)


def check_no_person_response(message):
    """
    لایه‌ی دوم و پشتیبان: اگه مدل توی همون کار اصلی هم به‌جای عکس، پیام متنی
    حاوی یکی از این دو نشانه برگردونده باشه، پیام مناسب همون حالت رو نشون
    بدیم (به‌جای یک پیام یکسان برای هر دو حالت).
    """
    text = (message.content or "")

    if BAD_QUALITY_MARKER in text:
        raise HTTPException(status_code=400, detail=MSG_BAD_QUALITY)

    if NO_PERSON_MARKER in text:
        raise HTTPException(status_code=400, detail=MSG_NOT_PERSON)


# این بخش به‌صورت مشترک به هر دو پرامپت اضافه می‌شه تا دقت مدل توی «خودِ
# لباس‌گذاری» (نه فقط عدم تغییر بقیه‌ی عکس) بیشتر بشه: رنگ، طرح، جنس و
# جزئیات دقیق لباس مرجع باید عیناً روی بدن فرد پیاده بشه.
GARMENT_FIDELITY_RULE = (
    "GARMENT ACCURACY — READ CAREFULLY: Reproduce the new garment on the person with the "
    "highest possible fidelity to the reference product photo. The exact color, shade, "
    "pattern, print, texture, fabric type, and material sheen of the reference garment "
    "must be preserved precisely — do not shift the color, simplify or invent a pattern, "
    "or substitute a different fabric look. Reproduce every visible design detail exactly "
    "as shown in the reference photo: sleeve length and cut, neckline/collar shape, "
    "buttons, zippers, pockets, stitching lines, logos, prints, embroidery, cuffs, hems, "
    "and closures. Do not simplify, omit, or approximate these details. "
    "Fit the garment with realistic, physically accurate draping: it must follow the "
    "person's actual body contours, pose, and posture — showing natural fabric folds, "
    "creases, and wrinkles consistent with how that specific fabric would fall under "
    "gravity given the person's stance, and consistent with the scene's existing "
    "lighting and shadow direction. The garment's proportions (length, width, fit "
    "tightness/looseness as shown in the reference photo) must scale correctly to this "
    "specific person's body size and shape — do not default to a generic fit that ignores "
    "their proportions. "
    "Blend only occurs at the garment's own edges (where it meets skin, hair, or other "
    "existing clothing) — this blending must look seamless and photorealistic, with no "
    "visible cutout edges, no color bleeding from the garment onto skin, and no leftover "
    "fragments of the original garment. Every other part of the image outside the "
    "garment's own boundary must remain pixel-for-pixel as close to the original as "
    "possible."
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
# این لایه‌ی دوم و پشتیبانه (لایه‌ی اول همون classify_person_image بالاست)،
# ولی همون تفکیک سه‌حالته رو اینجا هم رعایت می‌کنیم: عکس اصلاً انسان نیست در
# برابر عکس انسانه ولی کیفیتش برای پوشوندن لباس کافی نیست.
PERSON_VALIDATION_RULE = (
    "BEFORE doing anything else, carefully check the FIRST image (the person's photo). "
    "Classify it into one of three cases:\n\n"
    "CASE A (proceed normally): the first image is an actual photograph that clearly "
    "shows a real human being, with their torso/clothing area visible and large enough "
    "to place a garment on. Only in this case, continue with the clothing swap task "
    "below.\n\n"
    "CASE B (real person, but unusable photo): the first image DOES show a real "
    "photographed human being physically present, but the photo cannot be used to place "
    "clothing on them — e.g. it is too blurry/dark/low-resolution, the person is heavily "
    "cropped or too far away, their torso is entirely hidden or turned away from the "
    "camera, an extreme unusable angle/close-up, or multiple overlapping people with no "
    "single clear subject. In this case you are STRICTLY FORBIDDEN from generating, "
    "inventing, or altering anything — do not attempt any clothing swap, edit, or image "
    "generation of any kind. Your entire response must be ONLY plain text (absolutely no "
    f"image output) that starts exactly with: {BAD_QUALITY_MARKER}\n"
    "followed by a short one-sentence explanation of why the photo quality/framing is not "
    "usable.\n\n"
    "CASE C (not a person at all): the first image does not show a real photographed "
    "human being at all — for example it is a photo of a product, an object, packaging, "
    "a logo, an icon, a badge, a circular/framed graphic design, an animal, a landscape, "
    "a piece of paper, a document, plain text, a screenshot, a blank or solid-color "
    "image, or a cartoon/illustration/3D render with no real photographed person in it. "
    "In this case too you are STRICTLY FORBIDDEN from generating, inventing, imagining, "
    "or drawing any person, body, or human figure to place the garment on — do not "
    "create a substitute model, mannequin-like figure, or any new human whatsoever, even "
    "if it would make the output look complete. Your entire response must be ONLY plain "
    f"text (absolutely no image output) that starts exactly with: {NO_PERSON_MARKER}\n"
    "followed by a short one-sentence explanation of why the first image was rejected.\n\n"
    "Do not guess or assume CASE A if you are not highly confident. When in doubt between "
    "CASE A and CASE B, choose CASE B. When in doubt about whether a real human is present "
    "at all, choose CASE C. It is much better to incorrectly reject a valid photo than to "
    "invent a fake person or force a garment onto an unusable photo."
)


@router.post("/")
async def try_on(
    product_id: int = Form(...),
    person_image: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rate_limiter.check(
        f"tryon:{current_user_id}", limit=settings.TRYON_RATE_LIMIT_PER_HOUR
    )
    garment_data_url = get_garment_data_url(db, product_id)

    person_bytes = await read_validated_image(person_image)
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
                f"{GARMENT_FIDELITY_RULE}\n\n"
                f"{STRICT_NO_EXTRA_CHANGES_RULE}"
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
        {"type": "image_url", "image_url": {"url": garment_data_url}},
    ]

    try:
        completion = call_model_with_retries(content)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="سرویس تولید تصویر موقتاً در دسترس نیست.") from exc

    message = completion.choices[0].message
    images = getattr(message, "images", None)

    check_no_person_response(message)

    if not images:
        raise HTTPException(
            status_code=502,
            detail=f"هوش مصنوعی نتونست عکس بسازه. دوباره امتحان کن. (دلیل مدل: {message.content or completion.choices[0].finish_reason})",
        )

    result_b64 = images[0]["image_url"]["url"]
    return {"result_image_url": save_result_image(result_b64, current_user_id)}


@router.post("/outfit")
async def try_on_outfit(
    product_ids: List[int] = Form(...),
    person_image: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    مثل /tryon/ ولی به‌جای یک محصول، دقیقاً دو محصول (مثلاً یک بالاتنه + یک
    پایین‌تنه که با هم ست شدن) رو هم‌زمان روی همون یک عکس کاربر می‌پوشونه،
    نه اینکه دوبار جدا-جدا صداش کنیم.
    """
    rate_limiter.check(
        f"tryon:{current_user_id}", limit=settings.TRYON_RATE_LIMIT_PER_HOUR
    )
    products = [repository.get_by_id(db, pid) for pid in product_ids]
    if any(product is None for product in products):
        raise HTTPException(status_code=404, detail="یکی از محصولات انتخابی پیدا نشد.")

    valid, reason, slots = validate_outfit(products)
    if not valid:
        raise HTTPException(status_code=400, detail=reason)

    garment_data_urls = [get_garment_data_url(db, pid) for pid in product_ids]
    layer_instruction = build_layer_instruction(products, slots)

    person_bytes = await read_validated_image(person_image)
    person_data_url = upload_file_to_data_url(person_image, person_bytes)

    ensure_person_image(person_data_url)

    content = [
        {
            "type": "text",
            "text": (
                f"{PERSON_VALIDATION_RULE}\n\n"
                f"Take the person in the first photo and dress them with all {len(products)} "
                "selected garments shown in the following reference photos at the same time, as "
                "one realistic coordinated outfit. Follow this exact layering plan: "
                f"{layer_instruction}. When an inner top and a buttoned shirt are both selected, "
                "the inner top must be worn underneath and the buttoned shirt must be visibly open. "
                "The new garments should fully take the place of "
                "the original outfit — no part of the original clothing (collar, sleeve, or hem) "
                "should remain visible underneath or peeking out. Fit both garments naturally to "
                "the person's body shape and pose, matching the lighting of the original photo. "
                "Do not blend, layer, or overlay the new garments on top of the old clothing — "
                "this must be a full replacement, not a cover-up. Do not invent or add any extra "
                "clothing layer underneath the new garments — no black undershirt, black "
                "camisole, black leggings, black sleeves, or any other filler garment that is not "
                "part of the selected garments themselves. Fit and drape each garment so it "
                "naturally covers the person's body the way it would when actually worn — even if "
                "a reference product photo shows a garment (such as a jacket or coat) hanging open "
                "or loose with nothing underneath, adapt it on the person so it closes over and "
                "covers the front of their body, instead of leaving it open and exposing bare skin "
                "or the torso underneath. Do not add a separate undergarment to achieve this "
                "coverage — the garments themselves should be what covers the body. Keep the "
                "person's face, facial expression, hairstyle, body shape, skin tone, pose, camera "
                "angle, framing, and background exactly as close to the original photo as "
                "possible. Do not beautify, retouch, reshape, or alter the person in any way. "
                "Return a single photorealistic result showing the person wearing all selected "
                "garments together.\n\n"
                f"{GARMENT_FIDELITY_RULE}\n\n"
                f"{STRICT_NO_EXTRA_CHANGES_RULE}"
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
    ]
    for url in garment_data_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})

    try:
        completion = call_model_with_retries(content)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="سرویس تولید تصویر موقتاً در دسترس نیست.") from exc

    message = completion.choices[0].message
    images = getattr(message, "images", None)

    check_no_person_response(message)

    if not images:
        raise HTTPException(
            status_code=502,
            detail=f"هوش مصنوعی نتونست عکس بسازه. دوباره امتحان کن. (دلیل مدل: {message.content or completion.choices[0].finish_reason})",
        )

    result_b64 = images[0]["image_url"]["url"]
    return {"result_image_url": save_result_image(result_b64, current_user_id)}