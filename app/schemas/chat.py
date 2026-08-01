from typing import Optional
from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str  # "user" یا "assistant"
    content: str


class ChatRequest(BaseModel):
    customer_id: int
    message: str
    # تاریخچه‌ی چند پیام قبلی مکالمه؛ برای اینکه AI به پیام‌های قبلی
    # (مثل «به‌جای اون شلوار یکی دیگه بگو») دسترسی داشته باشه.
    history: Optional[list[ChatHistoryItem]] = None


class ChatResponse(BaseModel):
    response: str