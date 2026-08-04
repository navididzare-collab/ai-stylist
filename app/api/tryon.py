import base64
import io
import os
import threading
import time
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from PIL import Image
import httpx
from openai import OpenAI, APIConnectionError, APITimeoutError

from app.database.session import SessionLocal, get_db
from app.repositories.product_repository import ProductRepository

router = APIRouter(prefix="/tryon", tags=["Try-On"])

repository = ProductRepository()

UPLOAD_DIR = "static/uploads/tryon"
BASE_URL = os.getenv("BACKEND_BASE_URL", "https://app-python-xvxv0.apps.frk1.abrhapaas.com")

# ==========================================================================
# جاب‌های پس‌زمینه برای «/tryon/outfit»
# ==========================================================================
# چون اعمال ۲ یا ۳ لباس پشت‌سرهم می‌تونه چند دقیقه طول بکشه، و پلتفرم میزبانی
# یه سقف زمانی (تایم‌اوت گیت‌وی) برای هر درخواست HTTP داره که از اون طولانی‌تر
# باشه کانکشن رو قطع می‌کنه، دیگه منتظر نمی‌مونیم تا کل پردازش تموم بشه و
# جواب بدیم. به‌جاش:
#   ۱) درخواست اول («/tryon/outfit») فوری یه job_id برمی‌گردونه و پردازش رو
#      در پس‌زمینه شروع می‌کنه.
#   ۲) فرانت هر چند ثانیه یه‌بار وضعیت اون job رو از
#      «/tryon/outfit/status/{job_id}» می‌پرسه تا تموم بشه.
# این وضعیت‌ها فقط توی حافظه (RAM) نگه‌داری می‌شن؛ چون سرور با یک پروسه‌ی
# uvicorn اجرا می‌شه، این کار مشکلی نداره. اگه بعداً به چند worker/پروسه
# سوییچ کردید، این بخش باید به یه storage مشترک (مثل Redis) منتقل بشه.
_outfit_jobs: Dict[str, dict] = {}
_outfit_jobs_lock = threading.Lock()

# جاب‌های خیلی قدیمی (بیشتر از این مدت از اتمامشون گذشته) پاک می‌شن تا حافظه
# پر نشه.
_JOB_TTL_SECONDS = 30 * 60


def _set_job(job_id: str, **fields) -> None:
    with _outfit_jobs_lock:
        job = _outfit_jobs.get(job_id)
        if job is not None:
            job.update(fields)


def _append_job_log(job_id: str, message: str) -> None:
    with _outfit_jobs_lock:
        job = _outfit_jobs.get(job_id)
        if job is not None:
            job.setdefault("logs", []).append(message)


def _cleanup_old_jobs() -> None:
    now = time.time()
    with _outfit_jobs_lock:
        expired = [
            jid
            for jid, job in _outfit_jobs.items()
            if job.get("finished_at") and now - job["finished_at"] > _JOB_TTL_SECONDS
        ]
        for jid in expired:
            del _outfit_jobs[jid]

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
                model="google/gemini-2.5-flash-image",
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


def get_garment_info(db: Session, product_id: int) -> dict:
    """
    مثل get_garment_data_url ولی علاوه بر تصویر، اسم و دسته‌بندی محصول رو هم
    برمی‌گردونه تا بشه توی گزارش پیشرفت (log) پیام‌های خواناتری نشون داد
    (مثلاً «کاپشن Zara» به‌جای «لباس شماره ۲»).
    """
    product = repository.get_by_id(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"محصول با id={product_id} پیدا نشد.")

    if not product.images:
        raise HTTPException(status_code=400, detail=f"محصول با id={product_id} عکس ندارد.")

    main_image = next((img for img in product.images if img.is_main), product.images[0])
    garment_disk_path = main_image.image_url.lstrip("/")

    if not os.path.exists(garment_disk_path):
        raise HTTPException(status_code=404, detail=f"فایل عکس محصول با id={product_id} پیدا نشد.")

    return {
        "data_url": image_file_to_data_url(garment_disk_path),
        "name": product.name or "این لباس",
        "brand": product.brand or "",
    }


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
            model="google/gemini-2.5-flash-image",
            modalities=["text"],
            messages=[{"role": "user", "content": question}],
        )
    except Exception as e:
        print("=== PERSON CHECK EXCEPTION, FAILING OPEN ===", repr(e))
        # اگه خود این چک به هر دلیلی (مثلاً مشکل شبکه) شکست خورد، اجازه
        # می‌دیم فرآیند اصلی ادامه پیدا کنه به‌جای اینکه کاربر بی‌دلیل بلاک بشه.
        return PERSON_CHECK_OK

    answer = (completion.choices[0].message.content or "").strip().upper()
    print("=== PERSON CHECK ANSWER ===", answer)

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

# قانون جدا و صریح درباره‌ی آستین، چون مدل قبلاً چند بار به‌اشتباه آستین یک
# کت/ژاکت بلندآستین رو حذف می‌کرد و اون رو به یه جلیقه‌ی بدون‌آستین تبدیل
# می‌کرد (و به‌جاش آستین لباس زیرین رو به چشم می‌رسوند). این قانون رو
# مجزا و با تأکید زیاد نگه می‌داریم چون این خطا مستقیماً جزو "طول آستین" هست
# که در GARMENT_FIDELITY_RULE هم اشاره شده، ولی نیاز به تأکید مجزا داره.
SLEEVE_FIDELITY_RULE = (
    "SLEEVE ACCURACY — READ CAREFULLY: Look at the reference garment photo and determine "
    "exactly how much of the arm it covers: sleeveless/no sleeves, short sleeves, "
    "three-quarter sleeves, or long sleeves reaching the wrist. The garment you generate on "
    "the person MUST have the exact same sleeve length and coverage as the reference photo — "
    "if the reference garment has long sleeves, the output must show the person's arms fully "
    "covered by that SAME garment's fabric, in its own color/material, all the way from the "
    "shoulder to the wrist. Do NOT shorten, remove, or omit the sleeves of the new garment for "
    "any reason, and do NOT turn a garment that has sleeves in the reference photo into a "
    "sleeveless vest/gilet in the output. Do NOT let the sleeves of an inner layer (e.g. a "
    "shirt or sweater already on the person) substitute for or stand in as the new garment's "
    "own sleeves — if the new garment has sleeves, THIS garment's sleeves must be the ones "
    "visible on the arms, not the inner layer's sleeves peeking out. Only render the arms as "
    "bare or covered solely by an inner layer if the reference garment is itself genuinely "
    "sleeveless in the reference photo."
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
    background_tasks: BackgroundTasks,
    product_id: int = Form(...),
    person_image: UploadFile = File(...),
):
    """
    شروع پردازش پس‌زمینه‌ی «امتحان تک‌محصولی» — دقیقاً مثل «/tryon/outfit» ولی
    با فقط یک لباس. اینجا هم دیگه منتظر تموم‌شدن کل پردازش نمی‌مونیم (که
    می‌تونست چند ده ثانیه طول بکشه)، بلکه فوری یه job_id برمی‌گردونیم و فرانت
    با «GET /tryon/status/{job_id}» وضعیت و گزارش زنده‌ی پیشرفت رو پیگیری
    می‌کنه — همون تجربه‌ای که برای امتحانِ ست کامل هم وجود داره.
    """
    _cleanup_old_jobs()

    person_bytes = await person_image.read()
    person_data_url = upload_file_to_data_url(person_image, person_bytes)

    job_id = str(uuid.uuid4())
    with _outfit_jobs_lock:
        _outfit_jobs[job_id] = {
            "status": "pending",
            "step": 0,
            "total_steps": 1,
            "result_image_url": None,
            "error": None,
            "status_code": None,
            "finished_at": None,
            "logs": [],
        }

    background_tasks.add_task(
        _process_tryon_job, job_id, [product_id], person_data_url
    )

    return {"job_id": job_id}


def compress_data_url(data_url: str) -> str:
    """
    یه data URL (خروجی مرحله‌ی قبلی مدل) رو می‌گیره، دیکود می‌کنه، فشرده‌ش می‌کنه
    (دقیقاً مثل عکس ورودی کاربر) و دوباره به data URL تبدیل می‌کنه. این کار باعث
    می‌شه هر مرحله از زنجیره‌ی چندلباسی همون‌قدر سبک و سریع باشه که تک‌لباسی هست.
    """
    if data_url.startswith("data:"):
        _, b64_data = data_url.split(",", 1)
    else:
        b64_data = data_url

    raw = base64.b64decode(b64_data)
    compressed = compress_image_bytes(raw)
    encoded = base64.b64encode(compressed).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def apply_single_garment(
    person_data_url: str, garment_data_url: str, step: int, total_steps: int
) -> str:
    """
    دقیقاً همون منطقی که توی اندپوینت تک‌محصولی (/tryon/) درست و پایدار کار
    می‌کنه رو اینجا هم به کار می‌بریم؛ چون تجربه نشون داده وقتی مدل فقط با
    «عکس فرد + یک لباس» طرفه، هویت فرد رو با وفاداری بالا حفظ می‌کنه. برای
    ست چندلباسی، به‌جای فرستادن همه‌ی مرجع‌های لباس در یک درخواست بزرگ (که
    باعث می‌شد مدل گاهی کل فرد رو با یه عکس جدید/ژنریک عوض کنه)، لباس‌ها رو
    یکی‌یکی و پشت‌سرهم روی خروجیِ مرحله‌ی قبل اعمال می‌کنیم.
    """
    step_context = (
        (
            f"This is step {step} of {total_steps} in building a complete outfit on this "
            "same person; some of their clothing may have already been changed in an "
            "earlier step. "
        )
        if total_steps > 1
        else ""
    )

    content = [
        {
            "type": "text",
            "text": (
                f"{PERSON_VALIDATION_RULE}\n\n"
                f"{step_context}"
                "You are doing a virtual clothing try-on. Look at the new garment in the "
                "second photo and determine which body region it naturally belongs to: "
                "upper body/top, lower body/bottom, or an outer layer worn over the torso "
                "(such as a jacket, coat, cardigan, overshirt, or blazer). Replace ONLY the "
                "garment(s) currently on the person in that specific body region with this "
                "new garment, so it fully takes its place there — no part of the previous "
                "garment in that same region should remain visible underneath or peeking "
                "out. Do NOT touch, remove, hide, or alter any clothing on other body "
                "regions that is unrelated to this specific new garment — for example, if "
                "this garment is a top, the person's existing pants/skirt and any outer "
                "layer must stay exactly as they currently are, and vice versa. If this new "
                "garment is an outer layer, it must be clearly visible over whatever is "
                "already on the torso, not merged with or replacing the inner layer. "
                "Fit the new garment naturally to the person's body shape and pose, as if "
                "they are actually wearing it. Do not blend, layer, or overlay the new "
                "garment on top of the old one in the same region — it must be a full "
                "replacement in that region only. Do not invent or add any extra clothing "
                "layer underneath the new garment — no black undershirt, black camisole, "
                "black leggings, black sleeves, or any other filler garment that is not "
                "part of the new garment itself. Fit and drape the new garment so that it "
                "naturally covers the relevant part of the person's body the way a real "
                "garment would when worn — even if the reference product photo shows it "
                "hanging open or loose, adapt it on the person so it closes over and "
                "covers appropriately, instead of leaving it open and exposing bare skin "
                "underneath.\n\n"
                "IDENTITY LOCK — READ CAREFULLY: The FIRST image is the one and only base "
                "photo you are editing. The SECOND image is only a reference for the "
                "garment's design (color, pattern, cut) — it may show a completely "
                "different person, a mannequin, or no person at all, and that person or "
                "mannequin must NEVER appear in your output. You must never copy, blend, "
                "substitute, or take inspiration from any face, body, pose, or background "
                "shown in the second image. Every pixel of your output outside the swapped "
                "garment's own boundary must come from the FIRST image only. Keep "
                "everything else about the photo exactly the same: the same face, facial "
                "expression, hairstyle, body shape, skin tone, pose, camera angle, framing, "
                "background, and lighting as the first photo. Do not beautify, retouch, "
                "reshape, or alter the person in any way. The only difference between the "
                "input and output photo should be the garment(s) specified above. Return a "
                "single photorealistic result.\n\n"
                f"{GARMENT_FIDELITY_RULE}\n\n"
                f"{SLEEVE_FIDELITY_RULE}\n\n"
                f"{STRICT_NO_EXTRA_CHANGES_RULE}"
            ),
        },
        {"type": "image_url", "image_url": {"url": person_data_url}},
        {"type": "image_url", "image_url": {"url": garment_data_url}},
    ]

    completion = call_model_with_retries(content)

    message = completion.choices[0].message
    images = getattr(message, "images", None)

    print(f"=== TRYON OUTFIT STEP {step}/{total_steps} RAW COMPLETION ===")
    print("finish_reason:", completion.choices[0].finish_reason)
    print("message.content:", message.content)
    print("message.images:", bool(images))
    print("=== END TRYON OUTFIT STEP RAW ===")

    check_no_person_response(message)

    if not images:
        raise HTTPException(
            status_code=502,
            detail=(
                f"هوش مصنوعی نتونست لباس شماره {step} از {total_steps} رو اعمال کنه. "
                f"دوباره امتحان کن. (دلیل مدل: {message.content or completion.choices[0].finish_reason})"
            ),
        )

    result_data_url = images[0]["image_url"]["url"]
    return compress_data_url(result_data_url)


# پیام‌های «در حال انجام» و «انجام شد» برای هر مرحله. فرانت فقط آخرین پیام
# رو (به‌صورت یک خط متنِ در حال تغییر) نشون می‌ده، نه کل تاریخچه؛ پس اینجا
# دیگه از ایموجی/استیکر استفاده نمی‌کنیم و فقط خود متن ساده رو نگه می‌داریم.
STEP_START_TEMPLATES = [
    "در حال تحلیل بافت، رنگ و دوخت «{name}»...",
    "در حال تطبیق «{name}» با فرم بدن و نور تصویر شما...",
    "هوش مصنوعی داره «{name}» رو با دقت روی تصویرتون پیاده می‌کنه...",
]
STEP_DONE_TEMPLATES = [
    "«{name}» با موفقیت روی تصویر شما اعمال شد.",
    "«{name}» آماده‌ست — رفتیم سراغ مرحله‌ی بعد.",
]


def _process_tryon_job(
    job_id: str,
    unique_product_ids: List[int],
    person_data_url: str,
) -> None:
    """
    تابعی که در پس‌زمینه (بعد از این‌که جواب HTTP اولیه با job_id فرستاده شد)
    اجرا می‌شه. چون توی یک ترد جدا و بعد از پایان request اصلیه، نمی‌تونیم از
    db session خودِ request استفاده کنیم؛ پس یه session تازه می‌سازیم.

    این تابع هم برای امتحانِ تک‌محصولی (یک آیتم در unique_product_ids) و هم
    برای امتحانِ ست کامل (۲ یا ۳ آیتم) استفاده می‌شه — منطق هر دو یکیه، فقط
    تعداد مراحل فرق می‌کنه.
    """
    _append_job_log(job_id, "در حال بررسی عکس شما...")

    db = SessionLocal()
    try:
        garments = [
            get_garment_info(db, product_id)
            for product_id in unique_product_ids
        ]
    except HTTPException as e:
        _set_job(
            job_id,
            status="error",
            status_code=e.status_code,
            error=e.detail,
            finished_at=time.time(),
        )
        return
    except Exception as e:
        _set_job(
            job_id,
            status="error",
            status_code=502,
            error=f"خطا در خواندن اطلاعات محصولات: {e}",
            finished_at=time.time(),
        )
        return
    finally:
        db.close()

    try:
        ensure_person_image(person_data_url)
    except HTTPException as e:
        _set_job(
            job_id,
            status="error",
            status_code=e.status_code,
            error=e.detail,
            finished_at=time.time(),
        )
        return

    _append_job_log(job_id, "عکس شما تایید شد؛ شروع به کار می‌کنیم.")

    total_steps = len(garments)
    current_data_url = person_data_url

    _set_job(job_id, status="processing", step=0, total_steps=total_steps)

    for step, garment in enumerate(garments, start=1):
        display_name = garment["name"]
        if garment.get("brand"):
            display_name = f"{display_name} {garment['brand']}"

        start_msg = STEP_START_TEMPLATES[(step - 1) % len(STEP_START_TEMPLATES)].format(
            name=display_name
        )
        _set_job(job_id, step=step)
        _append_job_log(job_id, start_msg)

        try:
            current_data_url = apply_single_garment(
                current_data_url, garment["data_url"], step, total_steps
            )
        except HTTPException as e:
            _append_job_log(job_id, f"اعمال «{display_name}» ناموفق بود.")
            _set_job(
                job_id,
                status="error",
                status_code=e.status_code,
                error=e.detail,
                finished_at=time.time(),
            )
            return
        except Exception as e:
            print("=== TRYON OUTFIT JOB EXCEPTION ===")
            print(f"job {job_id} step {step}/{total_steps}:", repr(e))
            print("=== END EXCEPTION ===")
            _append_job_log(job_id, f"اعمال «{display_name}» ناموفق بود.")
            _set_job(
                job_id,
                status="error",
                status_code=502,
                error=f"خطا در تماس با سرویس تولید عکس (لباس {step} از {total_steps}): {e}",
                finished_at=time.time(),
            )
            return

        done_msg = STEP_DONE_TEMPLATES[(step - 1) % len(STEP_DONE_TEMPLATES)].format(
            name=display_name
        )
        _append_job_log(job_id, done_msg)

    final_msg = "عکس شما آماده‌ست!" if total_steps == 1 else "ست کامل شما آماده‌ست!"
    _append_job_log(job_id, final_msg)
    result_url = save_result_image(current_data_url)
    _set_job(
        job_id,
        status="done",
        result_image_url=result_url,
        finished_at=time.time(),
    )


@router.post("/outfit")
async def try_on_outfit(
    background_tasks: BackgroundTasks,
    product_ids: List[int] = Form(...),
    person_image: UploadFile = File(...),
):
    """
    شروع پردازش پس‌زمینه‌ی «امتحان ست» (۲ یا ۳ لباس روی عکس کاربر).

    این اندپوینت دیگه منتظر تموم‌شدن کل پردازش نمی‌مونه (که می‌تونست چند
    دقیقه طول بکشه و باعث بشه گیت‌وی/پروکسی پلتفرم میزبانی کانکشن رو وسط راه
    قطع کنه). به‌جاش فوری یه job_id برمی‌گردونه؛ فرانت باید با
    «GET /tryon/outfit/status/{job_id}» وضعیتش رو پیگیری (poll) کنه تا آماده
    بشه.

    هر لباس در یک مرحله‌ی جداگانه و پشت‌سرهم روی خروجی مرحله‌ی قبل اعمال
    می‌شه — دقیقاً همون روشی که توی اندپوینت تک‌محصولی («/tryon/») پایدار و
    درست کار می‌کنه.
    """
    _cleanup_old_jobs()

    # حذف شناسه‌های تکراری بدون تغییر ترتیب
    unique_product_ids = list(dict.fromkeys(product_ids))

    if len(unique_product_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="برای امتحان ست کامل باید حداقل دو محصول متفاوت ارسال شود.",
        )

    if len(unique_product_ids) > 3:
        raise HTTPException(
            status_code=400,
            detail="در هر بار پرو مجازی حداکثر سه محصول پشتیبانی می‌شود.",
        )

    # عکس کاربر رو همین‌جا (سریع) می‌خونیم، چون بعد از برگردوندن جواب دیگه
    # به UploadFile اصلی دسترسی نداریم.
    person_bytes = await person_image.read()
    person_data_url = upload_file_to_data_url(person_image, person_bytes)

    job_id = str(uuid.uuid4())
    with _outfit_jobs_lock:
        _outfit_jobs[job_id] = {
            "status": "pending",
            "step": 0,
            "total_steps": len(unique_product_ids),
            "result_image_url": None,
            "error": None,
            "status_code": None,
            "finished_at": None,
            "logs": [],
        }

    background_tasks.add_task(
        _process_tryon_job, job_id, unique_product_ids, person_data_url
    )

    return {"job_id": job_id}


def _get_job_status_response(job_id: str):
    with _outfit_jobs_lock:
        job = _outfit_jobs.get(job_id)
        # یه کپی از logs می‌گیریم تا بیرون از قفل هم امن باشه
        logs = list(job["logs"]) if job else []

    if job is None:
        raise HTTPException(status_code=404, detail="این job پیدا نشد یا منقضی شده.")

    if job["status"] == "error":
        raise HTTPException(
            status_code=job.get("status_code") or 502,
            detail=job.get("error") or "خطای نامشخص در پردازش.",
        )

    return {
        "status": job["status"],
        "step": job["step"],
        "total_steps": job["total_steps"],
        "result_image_url": job["result_image_url"],
        # فرانت فقط آخرین خط رو نشون می‌ده؛ کل لیست هم برای دیباگ برگردونده می‌شه.
        "logs": logs,
        "current_log": logs[-1] if logs else None,
    }


# اندپوینت وضعیتِ مشترک برای هر دو نوع job (تک‌محصولی و ست کامل) — چون هر دو
# با همون ساختار job داخل _outfit_jobs ذخیره می‌شن.
@router.get("/status/{job_id}")
def get_job_status(job_id: str):
    return _get_job_status_response(job_id)


# مسیر قدیمی هم برای سازگاری با فرانت‌های قدیمی‌تر نگه داشته می‌شه.
@router.get("/outfit/status/{job_id}")
def get_outfit_job_status(job_id: str):
    return _get_job_status_response(job_id)