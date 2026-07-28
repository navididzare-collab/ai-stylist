"use client";

export type AuthUser = {
  id: number;
  fullName: string;
  phone: string;
};

const STORAGE_KEY_USER = "auth_user";
const STORAGE_KEY_TOKEN = "auth_token";
const EVENT_NAME = "authChanged";

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setAuth(user: AuthUser, token: string) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function updateUserName(newName: string) {
  const user = getUser();
  if (!user) return;
  const updated = { ...user, fullName: newName };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}