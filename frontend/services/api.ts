export const API_URL = "http://127.0.0.1:8000";

export async function getProducts(filters?: { category?: string; occasion?: string }) {
  const params = new URLSearchParams();

  if (filters?.category) params.set("category", filters.category);
  if (filters?.occasion) params.set("occasion", filters.occasion);

  const query = params.toString();
  const url = query ? `${API_URL}/products?${query}` : `${API_URL}/products`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("خطا در دریافت محصولات");
  }

  return response.json();
}

export async function getProduct(id: string | number) {
  const response = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("خطا در دریافت محصول");
  }

  return response.json();
}

export function getImageUrl(path?: string) {
  if (!path) return undefined;
  return `${API_URL}${path}`;
}