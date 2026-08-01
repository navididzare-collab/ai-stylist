from typing import Literal

from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatHistoryItem] | None = Field(default=None, max_length=20)
    # فقط برای سازگاری با نسخه قدیمی فرانت؛ سرور به این مقدار اعتماد نمی‌کند.
    customer_id: int | None = None


class ChatResponse(BaseModel):
    response: str
