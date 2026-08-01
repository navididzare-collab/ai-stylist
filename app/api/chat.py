from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user_id, require_admin
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])
service = ChatService()


@router.post("/admin-test")
def admin_chat_test(
    request: ChatRequest,
    _: None = Depends(require_admin),
):
    rate_limiter.check("chat:admin-test", limit=20)
    history = [item.model_dump() for item in request.history] if request.history else None
    try:
        result = service.chat(request.message, history)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="سرویس دستیار استایل موقتاً پاسخ نمی‌دهد. دوباره تلاش کنید.",
        ) from exc
    return {
        "customer_id": None,
        "message": result["message"],
        "products": result["products"],
        "is_outfit_set": result.get("is_outfit_set", False),
    }


@router.post("/")
def chat(
    request: ChatRequest,
    current_user_id: int = Depends(get_current_user_id),
):
    rate_limiter.check(
        f"chat:{current_user_id}",
        limit=settings.CHAT_RATE_LIMIT_PER_HOUR,
    )
    history = [item.model_dump() for item in request.history] if request.history else None
    try:
        result = service.chat(request.message, history)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="سرویس دستیار استایل موقتاً پاسخ نمی‌دهد. دوباره تلاش کنید.",
        ) from exc

    return {
        "customer_id": current_user_id,
        "message": result["message"],
        "products": result["products"],
        "is_outfit_set": result.get("is_outfit_set", False),
    }
