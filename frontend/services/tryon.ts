const BASE_URL = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";
const API_URL = `${BASE_URL}/tryon/`;
const OUTFIT_API_URL = `${BASE_URL}/tryon/outfit`;

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    // پاسخ JSON نبود یا فرمتش فرق داشت؛ به پیام پیش‌فرض برمی‌گردیم
  }
  return "خطا در ساخت تصویر";
}

export async function tryOnProduct(productId: number, personImage: File): Promise<string> {
  const formData = new FormData();
  formData.append("product_id", String(productId));
  formData.append("person_image", personImage);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data = await response.json();
  return data.result_image_url as string;
}

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
    throw new Error(await extractErrorMessage(response));
  }

  const data = await response.json();
  return data.result_image_url as string;
}