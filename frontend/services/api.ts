export const API_URL = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";

const isServer = typeof window === "undefined";

function buildInternalUrl(path: string) {
  if (isServer) {
    // روی سرور، آدرس نسبی معنی نداره، پس مستقیم به بک‌اند وصل می‌شیم
    return `${API_URL}${path}`;
  }
  // توی مرورگر، از مسیر داخلی (پروکسی) استفاده می‌کنیم
  return `/api${path}`;
}

export async function getProducts(filters?: { category?: string; occasion?: string }) {
  const params = new URLSearchParams();

  if (filters?.category) params.set("category", filters.category);
  if (filters?.occasion) params.set("occasion", filters.occasion);

  const query = params.toString();
  const url = query ? `${buildInternalUrl("/products")}?${query}` : buildInternalUrl("/products");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("خطا در دریافت محصولات");
  }

  return response.json();
}

export async function getProduct(id: string | number) {
  const url = buildInternalUrl(`/products/${id}`);
  const response = await fetch(url, { cache: "no-store" });

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