const API_URL = "http://127.0.0.1:8000/tryon/";
const OUTFIT_API_URL = "http://127.0.0.1:8000/tryon/outfit";

export async function tryOnProduct(productId: number, personImage: File): Promise<string> {
  const formData = new FormData();
  formData.append("product_id", String(productId));
  formData.append("person_image", personImage);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("خطا در ساخت تصویر");
  }

  const data = await response.json();
  return data.result_image_url as string;
}

// هر دو محصولِ ست‌شده (مثلاً بالاتنه + پایین‌تنه) رو هم‌زمان روی عکس کاربر
// پیاده می‌کنه، به‌جای اینکه دوبار جدا-جدا صداش کنیم.
export async function tryOnOutfit(
  productIds: number[],
  personImage: File
): Promise<string> {
  const formData = new FormData();
  productIds.forEach((id) => formData.append("product_ids", String(id)));
  formData.append("person_image", personImage);

  const response = await fetch(OUTFIT_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("خطا در ساخت تصویر");
  }

  const data = await response.json();
  return data.result_image_url as string;
}