const API_URL = "http://127.0.0.1:8000/chat/";

interface BackendProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  color: string;
  size: string;
  image_url?: string;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface ChatResult {
  message: string;
  products?: {
    id: number;
    title: string;
    price: number;
    image_url?: string;
  }[];
  // وقتی بک‌اند تشخیص بده که محصولات برگردانده‌شده با هم یک ست/لوک کامل
  // را تشکیل می‌دهند (نه چند گزینه‌ی جدا از هم)، این فیلد true می‌شود.
  // این مقدار مستقیماً از data.is_outfit_set پر می‌شود و هیچ حدسی روی
  // آن (مثلاً بر اساس تعداد محصولات) در فرانت انجام نمی‌شود.
  isOutfitSet?: boolean;
}

export async function sendMessage(
  customerId: number,
  message: string,
  history?: ChatHistoryItem[]
): Promise<ChatResult> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: customerId,
      message,
      history: history ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error("خطا در ارتباط با سرور");
  }

  const data = await response.json();

  const products = (data.products ?? []).map((p: BackendProduct) => ({
    id: p.id,
    title: p.name,
    price: p.price,
    image_url: p.image_url,
  }));

  return {
    message: data.message ?? "متاسفانه جوابی دریافت نشد.",
    products,
    isOutfitSet: data.is_outfit_set === true,
  };
}