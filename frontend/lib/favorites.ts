"use client";

import { getToken } from "@/lib/auth";
import { getImageUrl } from "@/services/api";

const API_BASE = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";
const EVENT_NAME = "favoritesChanged";

export type FavoriteProduct = {
  id: number;
  title: string;
  price: string;
  image?: string;
  brand?: string;
};

let cache: Set<number> = new Set();
let loadedForToken: string | null = null;
let loadingPromise: Promise<void> | null = null;

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function loadFavorites(): Promise<void> {
  const token = getToken();

  if (!token) {
    cache = new Set();
    loadedForToken = null;
    return Promise.resolve();
  }

  if (loadedForToken === token) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(`${API_BASE}/favorites/`, {
    headers: authHeaders(),
  })
    .then((res) => (res.ok ? res.json() : []))
    .then((data: { product: { id: number } }[]) => {
      cache = new Set(data.map((f) => f.product.id));
      loadedForToken = token;
      window.dispatchEvent(new Event(EVENT_NAME));
    })
    .catch(() => {})
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/** لیست کامل علاقه‌مندی‌ها رو از بک‌اند می‌خونه (برای صفحه پروفایل) */
export async function getFavorites(): Promise<FavoriteProduct[]> {
  const token = getToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE}/favorites/`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];

  const data: { product: { id: number; name: string; price: number; brand: string; image_url: string | null } }[] =
    await res.json();

  return data.map((f) => ({
    id: f.product.id,
    title: f.product.name,
    price: String(f.product.price),
    brand: f.product.brand,
    image: f.product.image_url ? getImageUrl(f.product.image_url) ?? undefined : undefined,
  }));
}

/** برای نمایش وضعیت قلب روی کارت محصول؛ قبلش باید loadFavorites/ensureFavoritesLoaded صدا زده شده باشه */
export function isFavorite(id: number): boolean {
  return cache.has(id);
}

/** کش رو گرم می‌کنه؛ روی ProductCard توی useEffect صدا بزنید */
export function ensureFavoritesLoaded() {
  return loadFavorites();
}

/**
 * تغییر وضعیت علاقه‌مندی. اگه کاربر لاگین نباشه، کاری نمی‌کنه و false برمی‌گردونه
 * (تا خود UI مودال ورود رو باز کنه).
 */
export async function toggleFavorite(product: FavoriteProduct): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  await loadFavorites();

  const isFav = cache.has(product.id);

  if (isFav) {
    await fetch(`${API_BASE}/favorites/${product.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    cache.delete(product.id);
  } else {
    await fetch(`${API_BASE}/favorites/`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id }),
    });
    cache.add(product.id);
  }

  window.dispatchEvent(new Event(EVENT_NAME));
  return true;
}

export function subscribeToFavoritesChanges(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}