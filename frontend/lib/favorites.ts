"use client";

export type FavoriteProduct = {
  id: number;
  title: string;
  price: string;
  image?: string;
  brand?: string;
};

const STORAGE_KEY = "favorites";
const EVENT_NAME = "favoritesChanged";

function readFavorites(): FavoriteProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: FavoriteProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getFavorites(): FavoriteProduct[] {
  return readFavorites();
}

export function isFavorite(id: number): boolean {
  return readFavorites().some((p) => p.id === id);
}

export function toggleFavorite(product: FavoriteProduct) {
  const favorites = readFavorites();
  const exists = favorites.some((p) => p.id === product.id);
  const updated = exists
    ? favorites.filter((p) => p.id !== product.id)
    : [...favorites, product];
  writeFavorites(updated);
}

export function removeFavorite(id: number) {
  const updated = readFavorites().filter((p) => p.id !== id);
  writeFavorites(updated);
}

export function subscribeToFavoritesChanges(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}