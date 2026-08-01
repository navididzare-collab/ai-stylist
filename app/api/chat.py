from fastapi import APIRouter

from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])

service = ChatService()


@router.post("/")
def chat(request: ChatRequest):
    history = (
        [item.dict() for item in request.history] if request.history else None
    )
    result = service.chat(request.message, history)

    return {
        "customer_id": request.customer_id,
        "message": result["message"],
        "products": result["products"],
        "is_outfit_set": result.get("is_outfit_set", False),
    }